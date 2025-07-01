from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from models import Base
from datetime import datetime

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
