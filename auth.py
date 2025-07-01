from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import User
from database import db_manager, get_db_session
import re
from functools import wraps

auth_bp = Blueprint('auth', __name__)

def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.auth'))
        return f(*args, **kwargs)
    return decorated_function

def is_valid_email(email):
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@auth_bp.route('/auth', methods=['GET'])
def auth():
    """Unified auth page with login and register."""
    return render_template('auth/auth.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('auth/login.html')
        
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        if not username or not password:
            error = 'Please fill in all fields.'
            return render_template('auth/login.html', error=error, username=username)
        
        # Get user from database
        db_session = get_db_session()
        try:
            user = db_session.query(User).filter(
                (User.username == username) | (User.email == username)
            ).first()
            
            if user and user.check_password(password) and user.is_active:
                session['user_id'] = user.id
                session['username'] = user.username
                return redirect(url_for('detector'))
            else:
                error = 'Invalid username/email or password.'
                return render_template('auth/login.html', error=error, username=username)
                
        except Exception as e:
            error = 'Login failed. Please try again.'
            return render_template('auth/login.html', error=error, username=username)
        finally:
            db_session.close()
    
    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('auth/register.html')
        
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        errors = []
        
        if not username or len(username) < 3:
            errors.append('Username must be at least 3 characters long.')
        
        if not email or not is_valid_email(email):
            errors.append('Please enter a valid email address.')
        
        if not password or len(password) < 6:
            errors.append('Password must be at least 6 characters long.')
        
        if password != confirm_password:
            errors.append('Passwords do not match.')
        
        if errors:
            return render_template('auth/register.html', errors=errors, 
                                 username=username, email=email)
        
        # Check if user already exists
        db_session = get_db_session()
        try:
            existing_user = db_session.query(User).filter(
                (User.username == username) | (User.email == email)
            ).first()
            
            if existing_user:
                if existing_user.username == username:
                    error = 'Username already exists.'
                else:
                    error = 'Email already registered.'
                return render_template('auth/register.html', error=error, 
                                     username=username, email=email)
            
            # Create new user
            new_user = User(username=username, email=email)
            new_user.set_password(password)
            
            db_session.add(new_user)
            db_session.commit()
            
            # Auto-login after registration
            session['user_id'] = new_user.id
            session['username'] = new_user.username
            
            return redirect(url_for('detector'))
            
        except Exception as e:
            db_session.rollback()
            error = 'Registration failed. Please try again.'
            return render_template('auth/register.html', error=error, 
                                 username=username, email=email)
        finally:
            db_session.close()
    
    return render_template('auth/register.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))
