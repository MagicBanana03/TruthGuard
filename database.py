import os
from sqlalchemy import create_engine, or_
from sqlalchemy.orm import declarative_base, scoped_session
from sqlalchemy.orm.session import sessionmaker
from dotenv import load_dotenv
from models import Article, Breakdown, Feedback, User
from datetime import datetime

load_dotenv()

# Create a configured "Session" class
Base = declarative_base()

class DatabaseManager:
    def __init__(self, db_uri=None):
        """Initialize database connection using SQLAlchemy."""
        if db_uri is None:
            # Default to SQLite if no URI provided
            db_path = os.path.join(os.path.dirname(__file__), 'instance', 'truthguard.db')
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            db_uri = f'sqlite:///{db_path}'
        
        self.engine = create_engine(db_uri)
        self.Session = scoped_session(sessionmaker(bind=self.engine))
        
        # Import all models to ensure they're registered
        from models import Article, Breakdown, Feedback, User, GameLevel, UserGameProgress, GameSession
        
        # Create tables if they don't exist
        Base.metadata.create_all(self.engine)
        
        # Check if migration is needed
        self._check_and_migrate()

    def _check_and_migrate(self):
        """Check if database migration is needed and suggest running it."""
        try:
            from sqlalchemy import inspect
            inspector = inspect(self.engine)
            
            # Check if articles table has user_id column
            if 'articles' in inspector.get_table_names():
                articles_columns = [col['name'] for col in inspector.get_columns('articles')]
                if 'user_id' not in articles_columns:
                    print("\n⚠️  WARNING: Database migration needed!")
                    print("Your database schema is outdated and needs to be migrated.")
                    print("Please run: python migrate_database.py")
                    print("This will add user association to articles without losing data.\n")
                    
        except Exception as e:
            # If we can't check, just continue - the app will work with the current schema
            pass

    def get_session(self):
        """Get a new database session."""
        return self.Session()

    def close(self):
        """Close the database connection."""
        self.Session.remove()

    def insert_article(self, article_data):
        """Insert a new article and its breakdowns into the database with user association."""
        from sqlalchemy.exc import IntegrityError
        session = self.get_session()
        try:
            # Get user_id from Flask session if not provided
            user_id = article_data.get('user_id')
            if not user_id:
                from flask import session as flask_session
                user_id = flask_session.get('user_id')
            
            if not user_id:
                print("Error: No user_id available for article insertion")
                return None

            # Check if article already exists for this user to avoid duplicate key error
            existing = session.query(Article).filter(
                Article.title == article_data.get('title'),
                Article.content == article_data.get('content'),
                Article.user_id == user_id
            ).first()
            
            if existing:
                print(f"Article already exists with ID: {existing.id}")
                return existing.id
            
            # Create new article with user association
            article = Article(
                title=article_data.get('title'),
                link=article_data.get('link'),
                content=article_data.get('content'),
                summary=article_data.get('summary'),
                input_type=article_data.get('input_type'),
                factuality_score=article_data.get('factuality_score'),
                factuality_level=article_data.get('factuality_level'),
                factuality_description=article_data.get('factuality_description'),
                user_id=user_id  # Associate with current user
            )
            session.add(article)
            session.flush()  # To get the article ID

            # Add breakdowns if any
            if 'factuality_breakdown' in article_data and article_data['factuality_breakdown']:
                for i, breakdown_item in enumerate(article_data['factuality_breakdown'], 1):
                    # Handle both dict and string formats for backward compatibility
                    if isinstance(breakdown_item, dict):
                        explanation = breakdown_item.get('explanation', str(breakdown_item))
                    else:
                        explanation = str(breakdown_item)
                    
                    breakdown = Breakdown(
                        article_id=article.id,
                        number=i,
                        explanation=explanation
                    )
                    session.add(breakdown)
            
            session.commit()
            return article.id
        except IntegrityError as e:
            session.rollback()
            # If we get an integrity error (unique constraint violation), 
            # try to find and return the existing article for this user
            try:
                existing = session.query(Article).filter(
                    Article.title == article_data.get('title'),
                    Article.content == article_data.get('content'),
                    Article.user_id == user_id
                ).first()
                if existing:
                    print(f"Duplicate detected, returning existing article ID: {existing.id}")
                    return existing.id
            except Exception as find_error:
                print(f"Error finding existing article: {find_error}")
            print(f"Integrity error inserting article: {e}")
            raise
        except Exception as e:
            session.rollback()
            print(f"Error inserting article: {e}")
            raise
        finally:
            session.close()

    def get_article(self, article_id):
        """Get an article by ID."""
        session = self.get_session()
        try:
            return session.query(Article).filter_by(id=article_id).first()
        finally:
            session.close()

    def get_full_article_data(self, article_id):
        """Get article data including breakdowns."""
        session = self.get_session()
        try:
            article = session.query(Article).filter_by(id=article_id).first()
            if not article:
                return None
                
            # Convert to dict for compatibility
            article_dict = {
                'id': article.id,
                'title': article.title,
                'link': article.link,
                'content': article.content,
                'summary': article.summary,
                'input_type': article.input_type,
                'analysis_date': article.analysis_date,
                'factuality_score': article.factuality_score,
                'factuality_level': article.factuality_level,
                'factuality_description': article.factuality_description,
                'factuality_breakdown': []
            }
            
            # Get breakdowns if any
            breakdowns = (session.query(Breakdown)
                         .filter_by(article_id=article.id)
                         .order_by(Breakdown.number)
                         .all())
            article_dict['factuality_breakdown'] = [b.explanation for b in breakdowns]
            
            return article_dict
        finally:
            session.close()

    def get_articles(self, page=1, per_page=10):
        """Get paginated list of articles."""
        session = self.get_session()
        try:
            query = session.query(Article).order_by(Article.analysis_date.desc())
            articles = query.offset((page - 1) * per_page).limit(per_page).all()
            
            # Convert to list of dicts for compatibility
            result = []
            for article in articles:
                result.append({
                    'id': article.id,
                    'title': article.title,
                    'link': article.link,
                    'summary': article.summary,
                    'input_type': article.input_type,
                    'analysis_date': article.analysis_date,
                    'factuality_score': article.factuality_score,
                    'factuality_level': article.factuality_level
                })
            
            return result, query.count()
        finally:
            session.close()

    def get_user_articles(self, user_id, page=1, items_per_page=50, include_breakdowns=False):
        """Get articles for a specific user with pagination."""
        session = self.get_session()
        try:
            # Calculate offset
            offset = (page - 1) * items_per_page
            
            # Base query for user's articles
            base_query = session.query(Article).filter(Article.user_id == user_id)
            
            # Get total count
            total = base_query.count()
            
            if total == 0:
                return {
                    'articles': [],
                    'total': 0,
                    'total_pages': 0
                }
            
            # Get paginated articles ordered by most recent first
            articles_query = base_query.order_by(Article.analysis_date.desc())
            articles = articles_query.offset(offset).limit(items_per_page).all()
            
            # Format articles
            formatted_articles = []
            for article in articles:
                article_data = {
                    'id': article.id,
                    'title': article.title,
                    'summary': article.summary,
                    'factuality_score': article.factuality_score,
                    'factuality_level': article.factuality_level,
                    'analysis_date': article.analysis_date,
                    'input_type': article.input_type,
                    'link': article.link
                }
                
                # Include breakdown if requested
                if include_breakdowns:
                    # Get breakdown data
                    breakdown_query = session.query(Breakdown).filter(
                        Breakdown.article_id == article.id
                    ).order_by(Breakdown.number).all()
                    
                    article_data['factuality_breakdown'] = [
                        breakdown.explanation for breakdown in breakdown_query
                    ]
                
                formatted_articles.append(article_data)
            
            # Calculate total pages
            total_pages = (total + items_per_page - 1) // items_per_page
            
            return {
                'articles': formatted_articles,
                'total': total,
                'total_pages': total_pages
            }
            
        except Exception as e:
            print(f"Error getting user articles: {e}")
            return None
        finally:
            session.close()

    def get_user_article_by_id(self, user_id, article_id):
        """Get a specific article by ID, ensuring it belongs to the user."""
        session = self.get_session()
        try:
            # Query for article with user verification
            article = session.query(Article).filter(
                Article.id == article_id,
                Article.user_id == user_id
            ).first()
            
            if not article:
                return None
            
            # Get breakdown data
            breakdown_query = session.query(Breakdown).filter(
                Breakdown.article_id == article.id
            ).order_by(Breakdown.number).all()
            
            # Format article data
            article_data = {
                'id': article.id,
                'title': article.title,
                'summary': article.summary,
                'content': article.content,
                'factuality_score': article.factuality_score,
                'factuality_level': article.factuality_level,
                'factuality_description': article.factuality_description,
                'factuality_breakdown': [breakdown.explanation for breakdown in breakdown_query],
                'analysis_date': article.analysis_date,
                'input_type': article.input_type,
                'link': article.link,
                'user_id': article.user_id
            }
            
            return article_data
            
        except Exception as e:
            print(f"Error getting user article by ID: {e}")
            return None
        finally:
            session.close()

    def insert_feedback(self, feedback_data):
        """Insert user feedback into the database."""
        session = self.get_session()
        try:
            feedback = Feedback(
                name=feedback_data.get('name'),
                comments=feedback_data['comments'],
                rating=feedback_data['rating'],
                submission_date=datetime.utcnow(),
                user_id=feedback_data.get('user_id')  # Associate with user if provided
            )
            session.add(feedback)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"Error inserting feedback: {e}")
            return False
        finally:
            session.close()
            
    def get_all_feedback(self):
        """Retrieve all feedback entries from the database."""
        session = self.get_session()
        try:
            return session.query(Feedback).order_by(Feedback.submission_date.desc()).all()
        except Exception as e:
            print(f"Error retrieving feedback: {e}")
            return []
        finally:
            session.close()

# User management functions
def create_user(username, email, password_hash):
    """Create a new user."""
    session = db_manager.get_session()
    try:
        user = User(
            username=username,
            email=email,
            password_hash=password_hash
        )
        session.add(user)
        session.commit()
        return user.id
    except Exception as e:
        session.rollback()
        return None
    finally:
        session.close()

def get_user_by_username_or_email(identifier):
    """Get user by username or email."""
    session = db_manager.get_session()
    try:
        user = session.query(User).filter(
            (User.username == identifier) | (User.email == identifier)
        ).first()
        return user
    finally:
        session.close()

# Database management functions
def init_db():
    """Initialize the database and create tables."""
    # The DatabaseManager already handles table creation in its __init__
    return db_manager

def get_db_session():
    """Get a new database session."""
    return db_manager.get_session()

def close_db(e=None):
    """Close the database connection."""
    db_manager.close()

# Create a default instance
db_manager = DatabaseManager()