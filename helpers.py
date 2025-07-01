"""Helper functions and routes for the TruthGuard application."""

import google.generativeai as genai
from newspaper import Article
from flask import Blueprint, request, jsonify, current_app
from urllib.parse import urlparse
from datetime import datetime
from sqlalchemy import or_

from database import get_db_session
from models import Article as ArticleModel, Breakdown as BreakdownModel

helpers_bp = Blueprint('helpers_bp', __name__)

def is_political_article(text):
    """
    Returns True if the text is about Philippine political news, False otherwise.
    """
    try:
        prompt = (
            "Analyze the following text and determine if it is about current political news in the Philippines. "
            "Respond with 'Yes' if it is Philippine political news, or 'No' otherwise.\n\n"
            f"Text:\n{text}\n\nIs this about Philippine political news?"
        )
        model = genai.GenerativeModel("gemini-2.0-flash")
        reply = model.generate_content(prompt).text.strip().lower()
        if 'yes' in reply:
            return True
        if 'no' in reply:
            return False
        return False
    except Exception as e:
        print(f"Error in is_political_article: {e}")
        return False

def is_content_safe(text):
    """
    Returns True if the text is safe (no explicit/harmful content), False otherwise.
    """
    try:
        prompt = (
            "Analyze the following text for explicit or harmful content. "
            "Respond with 'Safe' if appropriate, or 'Unsafe' if it contains disallowed content.\n\n"
            f"Text:\n{text}\n\nIs this content safe?"
        )
        model = genai.GenerativeModel("gemini-2.0-flash")
        reply = model.generate_content(prompt).text.strip().lower()
        if 'safe' in reply:
            return True
        if 'unsafe' in reply:
            return False
        return False
    except Exception as e:
        print(f"Error in is_content_safe: {e}")
        return False

def generate_article_title(content, input_type, url=None):
    """
    Generates a title automatically, either by scraping the URL or via the Gemini API.
    """
    try:
        if input_type == 'link' and url:
            art = Article(url)
            art.download()
            art.parse()
            if art.title:
                return art.title.strip()

        prompt = (
            "Please provide a single concise and descriptive title for the following article content. "
            "Respond with only the title, no additional text or formatting:\n\n"
            f"{content}\n\nTitle:"
        )
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt).text.strip()
        
        # Extract only the first line or the first sentence to ensure single title
        title = response.split('\n')[0].strip()
        # Remove any quotation marks or extra formatting
        title = title.strip('"').strip("'").strip()
        
        return title
    except Exception as e:
        print(f"Error in generate_article_title: {e}")
        return 'No Title'

def get_existing_article(db_manager, title, content, source_url=None):
    """Check if an article already exists for the current user."""
    try:
        from flask import session
        user_id = session.get('user_id')
        
        if not user_id:
            return None
        
        # Check for user-specific duplicates
        session_db = get_db_session()
        
        # Create base query for current user
        query = session_db.query(ArticleModel).filter(ArticleModel.user_id == user_id)
        
        # Check by URL first if provided
        if source_url:
            existing = query.filter(ArticleModel.link == source_url).first()
            if existing:
                result = {
                    'id': existing.id,
                    'title': existing.title,
                    'analysis_date': existing.analysis_date
                }
                session_db.close()
                return result
        
        # Check by title and content similarity (for user's articles only)
        existing = query.filter(
            ArticleModel.title == title,
            ArticleModel.content == content
        ).first()
        
        if existing:
            result = {
                'id': existing.id,
                'title': existing.title,
                'analysis_date': existing.analysis_date
            }
            session_db.close()
            return result
        
        session_db.close()
        return None
        
    except Exception as e:
        print(f"Error checking for existing article: {e}")
        return None

def calculate_similarity(str1, str2):
    """Calculate simple similarity between two strings."""
    if not str1 or not str2:
        return 0.0
    
    # Simple word-based similarity
    words1 = set(str1.split())
    words2 = set(str2.split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union) if union else 0.0

# Remove the conflicting get_articles endpoint - it's now in app.py