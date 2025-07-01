# app.py

from flask import Flask, render_template, request, jsonify, session, url_for, g, current_app
import google.generativeai as genai
from newspaper import Article
import nltk
import re
import os
from dotenv import load_dotenv
import warnings
from urllib.parse import urlparse
from datetime import datetime
from pathlib import Path
from models import Base, init_db
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from helpers import (
    is_political_article,
    is_content_safe,
    generate_article_title,
    get_existing_article,
    helpers_bp
)
from auth import auth_bp, login_required
from game_routes import game_bp
from database import db_manager, get_db_session, close_db

# Load environment
load_dotenv()
warnings.filterwarnings("ignore")

# NLTK
nltk.download('punkt', quiet=True)

# Gemini API
API_KEY = os.getenv('API_KEY')
if not API_KEY:
    raise ValueError("Gemini API key not found in .env")
genai.configure(api_key=API_KEY)

# Flask setup
app = Flask(__name__)
app.secret_key = os.urandom(24)
if not app.secret_key:
    raise ValueError("SECRET_KEY not set in .env")

# Database setup
def get_db_path():
    """Get the path to the SQLite database file."""
    db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
    os.makedirs(db_dir, exist_ok=True)
    return os.path.join(db_dir, 'truthguard.db')

def init_database():
    """Initialize the database if it doesn't exist."""
    db_path = get_db_path()
    db_uri = f'sqlite:///{db_path}'
    
    # Only create tables if they don't exist
    if not os.path.exists(db_path):
        engine = create_engine(db_uri)
        Base.metadata.create_all(engine)
        print(f"Database created at {db_path}")
    
    # Configure SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database when the app starts
with app.app_context():
    init_database()

# Register blueprints
app.register_blueprint(helpers_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(game_bp)

# Database teardown
@app.teardown_appcontext
def teardown_db(exception):
    """Close the database at the end of the request."""
    close_db()

@app.template_filter('format_score')
def format_score(value):
    try:
        return f"{float(value):.1f}"
    except:
        return "0.0"

@app.route('/')
def home():
    return render_template('home.html', active_page='home')

@app.route('/detector', methods=['GET','POST'])
@login_required
def detector():
    active_page = 'detector'
    if request.method == 'POST':
        try:
            input_type       = request.form.get('input-type')
            title_method     = request.form.get('title-input-method')
            manual_title     = request.form.get('article-title')
            content, source_url = '', None
            title = 'No Title'

            # Title handling
            if title_method == 'manual':
                if not manual_title:
                    return jsonify({'error':'Please enter the article title.'})
                title = manual_title.strip()
            elif title_method != 'automatic':
                return jsonify({'error':'Please select a title input method.'})

            # Content extraction
            if input_type == 'link':
                url = request.form.get('article-link')
                if not url:
                    return jsonify({'error':'Please enter a valid URL.'})
                try:
                    art = Article(url)
                    art.download(); art.parse()
                    content = art.text
                    source_url = url
                    if not content:
                        raise ValueError("No content extracted from URL")
                    if title_method == 'automatic':
                        title = generate_article_title(content, input_type, url)
                except Exception as e:
                    current_app.logger.error(f"URL extraction error: {e}")
                    return jsonify({'error':'Failed to extract content from the URL. Please check if the URL is accessible.'})
            elif input_type == 'snippet':
                snippet = request.form.get('article-snippet')
                if not snippet:
                    return jsonify({'error':'Please enter an article snippet.'})
                content = snippet.strip()
                if title_method == 'automatic':
                    title = generate_article_title(content, input_type)
            else:
                return jsonify({'error':'Please select an input method (Link or Snippet).'})

            # Validate content length
            if len(content.strip()) < 50:
                return jsonify({'error':'Please provide more content for analysis (minimum 50 characters).'})

            # Political check
            try:
                if not is_political_article(content):
                    return jsonify({'error':'non_political'})
            except Exception as e:
                current_app.logger.error(f"Political check error: {e}")
                return jsonify({'error':'Error checking article content. Please try again.'})
            
            # Safety check
            try:
                if not is_content_safe(content):
                    return jsonify({'error':'explicit_content'})
            except Exception as e:
                current_app.logger.error(f"Safety check error: {e}")
                return jsonify({'error':'Error checking content safety. Please try again.'})

            # Duplicate check - be more thorough
            try:
                existing = get_existing_article(db_manager, title, content, source_url)
                if existing:
                    dt = existing['analysis_date'].strftime('%Y-%m-%d %H:%M:%S')
                    link = url_for('history') + f"#article-{existing['id']}"
                    session['message'] = (
                        f'This article was scanned on '
                        f'<a href="{link}" class="date-link" target="_blank">{dt}</a>'
                    )
                    article_id = existing['id']
                else:
                    session.pop('message', None)
                    
                    # Generate summary
                    try:
                        summary = generate_summary(content)
                        if summary is None:
                            return jsonify({'error':'explicit_content'})
                    except Exception as e:
                        current_app.logger.error(f"Summary generation error: {e}")
                        return jsonify({'error':'Error generating summary. Please try again.'})

                    # Factuality analysis
                    try:
                        f_score, f_level, f_desc, f_breakdown = analyze_factuality(content)
                    except Exception as e:
                        current_app.logger.error(f"Factuality analysis error: {e}")
                        return jsonify({'error':'Error analyzing content. Please try again.'})
                    
                    # Double-check for duplicates before inserting (race condition protection)
                    existing_check = get_existing_article(db_manager, title, content, source_url)
                    if existing_check:
                        article_id = existing_check['id']
                    else:
                        data = {
                            'title': title,
                            'link': source_url,
                            'content': content,
                            'summary': summary,
                            'input_type': input_type,
                            'factuality_score': f_score,
                            'factuality_level': f_level,
                            'factuality_description': f_desc,
                            'factuality_breakdown': f_breakdown
                        }
                        try:
                            article_id = db_manager.insert_article(data)
                            if not article_id:
                                raise ValueError("Failed to insert article")
                        except Exception as e:
                            current_app.logger.error(f"Database insertion error: {e}")
                            return jsonify({'error':'Error saving article. Please try again.'})

                return jsonify({'redirect_url': url_for('results', article_id=article_id)})
                
            except Exception as e:
                current_app.logger.error(f"General processing error: {e}")
                return jsonify({'error':'Error processing your request. Please try again.'})

        except Exception as e:
            current_app.logger.error(f"Unexpected error in detector route: {e}")
            return jsonify({'error':'An unexpected error occurred. Please try again.'})

    return render_template('detector.html', active_page=active_page)

@app.route('/results/<int:article_id>')
@login_required
def results(article_id):
    active_page = 'detector'
    art = db_manager.get_full_article_data(article_id)
    if not art:
        return "Article not found", 404

    message = session.pop('message', None)

    if art['input_type']=='link' and art['link']:
        p = urlparse(art['link'])
        source_display = f"{p.scheme}://{p.netloc}/"
        source_url = art['link']
    else:
        source_display = 'User Provided Snippet'
        source_url = None

    return render_template(
        'results.html',
        title=art['title'],
        source_display=source_display,
        source_url=source_url,
        summary=art['summary'],
        factuality_percentage=art['factuality_score'],
        factuality_level=art['factuality_level'],
        factuality_description=art['factuality_description'],
        factuality_breakdown=art['factuality_breakdown'],
        input_type=art['input_type'],
        message=message,
        active_page=active_page
    )

@app.route('/history')
@login_required
def history():
    return render_template('history.html', active_page='history')

# Add new endpoint for user-specific articles
@app.route('/get_articles')
@login_required
def get_articles():
    """Get articles for the current logged-in user with pagination and filtering."""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        items_per_page = request.args.get('items_per_page', 50, type=int)
        include_breakdowns = request.args.get('include_breakdowns', 'false').lower() == 'true'
        
        # Limit items per page to prevent abuse
        items_per_page = min(items_per_page, 1000)
        
        # Get current user ID from session
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'User not authenticated'}), 401
        
        # Get user-specific articles from database
        try:
            articles_data = db_manager.get_user_articles(
                user_id=user_id,
                page=page,
                items_per_page=items_per_page,
                include_breakdowns=include_breakdowns
            )
            
            if not articles_data:
                return jsonify({
                    'articles': [],
                    'total': 0,
                    'page': page,
                    'items_per_page': items_per_page,
                    'total_pages': 0
                })
            
            # Format articles for frontend
            formatted_articles = []
            for article in articles_data['articles']:
                formatted_article = {
                    'id': article['id'],
                    'title': article['title'],
                    'summary': article['summary'],
                    'factuality_score': article['factuality_score'],
                    'factuality_level': article['factuality_level'],
                    'analysis_date': article['analysis_date'].isoformat() if article['analysis_date'] else None,
                    'input_type': article['input_type'],
                    'link': article['link']
                }
                
                # Include breakdown if requested and available
                if include_breakdowns and article.get('factuality_breakdown'):
                    formatted_article['factuality_breakdown'] = article['factuality_breakdown']
                
                formatted_articles.append(formatted_article)
            
            response_data = {
                'articles': formatted_articles,
                'total': articles_data['total'],
                'page': page,
                'items_per_page': items_per_page,
                'total_pages': articles_data['total_pages']
            }
            
            return jsonify(response_data)
            
        except Exception as e:
            current_app.logger.error(f"Database error in get_articles: {e}")
            return jsonify({'error': 'Database error occurred'}), 500
            
    except Exception as e:
        current_app.logger.error(f"Error in get_articles endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/get_article_details/<int:article_id>')
@login_required
def get_article_details(article_id):
    """Get detailed information for a specific article, ensuring user ownership."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'User not authenticated'}), 401
        
        # Get article with user verification
        article = db_manager.get_user_article_by_id(user_id, article_id)
        
        if not article:
            return jsonify({'error': 'Article not found or access denied'}), 404
        
        # Format article data
        article_data = {
            'id': article['id'],
            'title': article['title'],
            'summary': article['summary'],
            'content': article.get('content', ''),
            'factuality_score': article['factuality_score'],
            'factuality_level': article['factuality_level'],
            'factuality_description': article.get('factuality_description', ''),
            'factuality_breakdown': article.get('factuality_breakdown', []),
            'analysis_date': article['analysis_date'].isoformat() if article['analysis_date'] else None,
            'input_type': article['input_type'],
            'link': article['link']
        }
        
        return jsonify(article_data)
        
    except Exception as e:
        current_app.logger.error(f"Error in get_article_details: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/about')
def about():
    return render_template('about.html', active_page='about')

@app.route('/feedback', methods=['GET', 'POST'])
@login_required
def feedback():
    active_page = 'feedback'
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        comments = request.form.get('comments', '').strip()
        rating = request.form.get('rating')
        
        # Validate input
        if not comments:
            err = 'Please provide your comments.'
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'error': err}), 400
            return render_template('feedback.html', error=err, active_page=active_page, 
                                 name=name, comments=comments, rating=rating)
        
        if not rating or not rating.isdigit() or int(rating) < 1 or int(rating) > 5:
            err = 'Please provide a valid rating between 1 and 5.'
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'error': err}), 400
            return render_template('feedback.html', error=err, active_page=active_page,
                                 name=name, comments=comments, rating=rating)

        # Prepare feedback data
        fb = {
            'name': name if name else 'Anonymous',
            'comments': comments,
            'rating': int(rating),
            'user_id': session.get('user_id')  # Associate with current user
        }
        
        # Save to database
        success = db_manager.insert_feedback(fb)
        
        if success:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': True, 'message': 'Thank you for your feedback!'})
            return render_template('feedback.html', success='Thank you for your feedback!', 
                                 active_page=active_page)
        else:
            err = 'Failed to submit feedback. Please try again later.'
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'error': err}), 500
            return render_template('feedback.html', error=err, active_page=active_page,
                                 name=name, comments=comments, rating=rating)

    # GET request - show feedback form
    return render_template('feedback.html', active_page=active_page)

@app.route('/admin/feedback')
@login_required
def view_feedback():
    """Admin view to see all feedback entries."""
    # In a real app, you'd want to add authentication here
    feedback_entries = db_manager.get_all_feedback()
    return render_template('admin/feedback_list.html', 
                         feedback_entries=feedback_entries,
                         active_page='admin')

# === Analysis Helpers ===
def generate_summary(text):
    try:
        prompt = (
            "Please provide a concise summary (max 4 sentences) of the following text:\n\n" + text
        )
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp  = model.generate_content(prompt)
        return resp.text.strip()
    except:
        return None

def analyze_factuality(text):
    try:
        prompt = (
            "Analyze the factual accuracy of the following Philippine political news text and assign a score from 0-100%.\n\n"
            "Please provide your analysis in this exact format:\n"
            "Factuality Level: [Level] ([Score]%)\n\n"
            "Breakdown:\n"
            "1. [Specific reason explaining why this score was given - mention specific claims, sources, or lack thereof]\n"
            "2. [Another specific factor that contributed to this score - cite verifiable facts or misinformation]\n"
            "3. [Additional evidence or red flags that influenced the scoring]\n"
            "4. [Source credibility assessment if applicable]\n"
            "5. [Overall conclusion explaining the final score]\n\n"
            "Make each breakdown point specific to WHY this particular score was assigned. "
            "Reference actual claims in the text and explain whether they are verifiable, misleading, or false.\n\n"
            f"Text to analyze:\n{text}"
        )
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp  = model.generate_content(prompt).text.replace('*','').strip()

        m = re.search(r'Factuality Level:\s*(.+?)\s*\((\d{1,3})%\)', resp)
        if m:
            level, score = m.group(1).strip(), int(m.group(2))
        else:
            level, score = 'Unknown', 50

        score = max(0, min(score, 100))
        level = classify_factuality(score)
        desc  = get_factuality_description(score)

        breakdown = []
        b_match = re.search(r'Breakdown:\s*(.*)', resp, re.DOTALL)
        if b_match:
            text_b = b_match.group(1).strip()
            items = re.findall(r'^\d+\.\s*(.+?)(?=\n\d+\.|$)', text_b, re.MULTILINE|re.DOTALL)
            for i, item in enumerate(items[:5], start=1):
                # Clean up and ensure the explanation is detailed
                explanation = item.strip()
                if explanation and len(explanation) > 10:  # Only include substantial explanations
                    breakdown.append(explanation)
        
        # If no good breakdown was extracted, create score-specific explanations
        if not breakdown:
            breakdown = generate_score_specific_breakdown(score, text[:200])

        return score, level, desc, breakdown

    except Exception as e:
        print(f"Error in analyze_factuality: {e}")
        d = get_factuality_description(50)
        breakdown = [
            "Unable to perform detailed analysis due to technical error",
            "Default scoring applied based on general content assessment",
            "Manual review recommended for accurate fact-checking"
        ]
        return 50, 'Unknown', d, breakdown

def generate_score_specific_breakdown(score, text_preview):
    """Generate score-specific breakdown explanations when AI doesn't provide detailed analysis."""
    if score >= 80:
        return [
            f"High factuality score ({score}%) indicates well-sourced and verifiable claims",
            "Content appears to cite credible sources and established facts",
            "Claims made are consistent with verified information",
            "Language used is factual and objective rather than sensationalized",
            "Overall assessment suggests reliable and trustworthy content"
        ]
    elif score >= 60:
        return [
            f"Moderate factuality score ({score}%) suggests mixed reliability",
            "Some claims may be accurate while others require verification",
            "Content may lack sufficient sourcing for all statements made",
            "Potential for selective reporting or incomplete information",
            "Readers should cross-reference with additional reliable sources"
        ]
    elif score >= 40:
        return [
            f"Low factuality score ({score}%) indicates significant concerns",
            "Multiple claims appear to lack proper verification or sourcing",
            "Content may contain misleading or exaggerated statements",
            "Sources cited may be unreliable or biased",
            "High likelihood of misinformation or propaganda elements"
        ]
    else:
        return [
            f"Very low factuality score ({score}%) suggests mostly false content",
            "Majority of claims appear to be unverified or demonstrably false",
            "Content likely contains deliberate misinformation",
            "Sources are either absent, unreliable, or fabricated",
            "This content should be considered highly unreliable and potentially harmful"
        ]

def classify_factuality(score):
    if score <= 20: return 'Very Low'
    if score <= 40: return 'Low'
    if score <= 60: return 'Mixed'
    if score <= 80: return 'High'
    return 'Very High'

def get_factuality_description(score):
    if score <= 20:
        return 'Numerous inaccuracies or unverified claims with little credible sourcing.'
    if score <= 40:
        return 'Contains factual errors or misleading information with questionable sources.'
    if score <= 60:
        return 'Mix of accurate and inaccurate info; some claims may be exaggerated.'
    if score <= 80:
        return 'Mostly accurate with minor errors; generally relies on credible sources.'
    return 'Consistently accurate, thoroughly fact-checked, and supported by reliable sources.'

@app.context_processor
def inject_user():
    """Make user info available in all templates."""
    return dict(
        current_user_id=session.get('user_id'),
        current_username=session.get('username')
    )

if __name__ == '__main__':
    try:
        app.run(debug=True)
    finally:
        db_manager.close()
