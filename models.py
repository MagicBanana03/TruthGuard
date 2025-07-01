from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Enum, ForeignKey, func, Boolean, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os
from werkzeug.security import generate_password_hash, check_password_hash

# Create base class for declarative models
Base = declarative_base()

class Article(Base):
    """Model for storing article information and fact-checking results."""
    __tablename__ = 'articles'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    link = Column(String(2048))
    content = Column(Text)
    summary = Column(Text)
    input_type = Column(Enum('link', 'snippet', name='input_type_enum'), nullable=False)
    analysis_date = Column(DateTime, default=datetime.utcnow)
    factuality_score = Column(Integer)
    factuality_level = Column(String(50))
    factuality_description = Column(Text)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Associate articles with users
    
    # Add unique constraint to prevent duplicate articles per user
    __table_args__ = (
        UniqueConstraint('title', 'content', 'user_id', name='uq_article_title_content_user'),
    )
    
    # Relationship with Breakdowns
    breakdowns = relationship("Breakdown", back_populates="article")
    
    # Relationship with User
    user = relationship("User", back_populates="articles")
    
    def __repr__(self):
        return f"<Article(title='{self.title}', factuality_score={self.factuality_score}, user_id={self.user_id})>"


class Breakdown(Base):
    """Model for storing detailed breakdowns of article fact-checks."""
    __tablename__ = 'breakdowns'
    
    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey('articles.id'), nullable=False)
    number = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    
    # Relationship with Article
    article = relationship("Article", back_populates="breakdowns")
    
    def __repr__(self):
        return f"<Breakdown(article_id={self.article_id}, number={self.number})>"


class Feedback(Base):
    """Model for storing user feedback."""
    __tablename__ = 'feedback'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=True)
    comments = Column(Text, nullable=False)
    rating = Column(Integer, nullable=False)
    submission_date = Column(DateTime, server_default=func.current_timestamp())
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, rating={self.rating}, date={self.submission_date})>"


class User(Base):
    """Model for storing user information for authentication."""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationship with Articles
    articles = relationship("Article", back_populates="user")
    
    def set_password(self, password):
        """Hash and set the password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash."""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class GameLevel(Base):
    """Model for storing game levels and challenges."""
    __tablename__ = 'game_levels'
    
    id = Column(Integer, primary_key=True)
    level_number = Column(Integer, nullable=False, unique=True)
    title = Column(String(255), nullable=False)
    headline = Column(Text, nullable=False)
    article_snippet = Column(Text)
    is_fake = Column(Boolean, nullable=False)
    difficulty = Column(String(20), default='easy')  # easy, medium, hard
    time_limit = Column(Integer, default=300)  # seconds
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # JSON fields for evidence data
    facebook_posts = Column(JSON)  # List of fabricated social media posts
    news_articles = Column(JSON)  # List of real/fake articles with metadata
    expert_opinions = Column(JSON)  # List of expert statements
    
    # Relationships
    user_progress = relationship("UserGameProgress", back_populates="level")
    
    def __repr__(self):
        return f"<GameLevel(level={self.level_number}, title='{self.title}')>"

class UserGameProgress(Base):
    """Model for tracking user game progress."""
    __tablename__ = 'user_game_progress'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    level_id = Column(Integer, ForeignKey('game_levels.id'), nullable=False)
    completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    time_taken = Column(Integer)  # seconds
    attempts = Column(Integer, default=0)
    last_attempt = Column(DateTime, default=datetime.utcnow)
    user_answer = Column(Boolean)  # True for real, False for fake
    evidence_gathered = Column(JSON)  # Track which evidence user viewed
    
    # Relationships
    level = relationship("GameLevel", back_populates="user_progress")
    
    def __repr__(self):
        return f"<UserGameProgress(user_id={self.user_id}, level_id={self.level_id})>"

class GameSession(Base):
    """Model for tracking active game sessions."""
    __tablename__ = 'game_sessions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    level_id = Column(Integer, ForeignKey('game_levels.id'), nullable=False)
    session_data = Column(JSON)  # Store session state
    start_time = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<GameSession(user_id={self.user_id}, level_id={self.level_id})>"


# Database connection and session creation
def init_db(db_path='sqlite:///truthguard.db'):
    """Initialize the database and create tables."""
    engine = create_engine(db_path)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


if __name__ == "__main__":
    # Example usage
    session = init_db()
    print("Database and tables created successfully.")
