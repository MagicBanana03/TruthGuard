"""
Database migration script for TruthGuard
Handles schema changes without losing existing data
"""

import os
import sqlite3
import random
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError
from datetime import datetime

def get_db_path():
    """Get the path to the SQLite database file."""
    db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
    return os.path.join(db_dir, 'truthguard.db')

def backup_database():
    """Create a backup of the current database."""
    db_path = get_db_path()
    if not os.path.exists(db_path):
        print("No existing database found. Migration not needed.")
        return None
    
    backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"❌ Failed to backup database: {e}")
        raise

def check_column_exists(engine, table_name, column_name):
    """Check if a column exists in a table."""
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        return any(col['name'] == column_name for col in columns)
    except Exception as e:
        print(f"Error checking column existence: {e}")
        return False

def migrate_articles_table(engine):
    """Add user_id column to articles table if it doesn't exist."""
    print("🔄 Checking articles table migration...")
    
    # Check if user_id column already exists
    if check_column_exists(engine, 'articles', 'user_id'):
        print("✅ user_id column already exists in articles table")
        return True
    
    try:
        with engine.connect() as conn:
            # Add user_id column to articles table
            print("➕ Adding user_id column to articles table...")
            conn.execute(text("ALTER TABLE articles ADD COLUMN user_id INTEGER"))
            
            # Add foreign key constraint (SQLite doesn't support adding foreign keys to existing tables)
            # We'll handle this during table recreation if needed
            
            print("✅ user_id column added successfully")
            conn.commit()
            return True
            
    except OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✅ user_id column already exists")
            return True
        else:
            print(f"❌ Error adding user_id column: {e}")
            raise

def update_unique_constraint(engine):
    """Update the unique constraint to include user_id."""
    print("🔄 Updating unique constraints...")
    
    try:
        with engine.connect() as conn:
            # SQLite doesn't support modifying constraints directly
            # We need to recreate the table with the new constraint
            
            # Check if the table needs recreation
            inspector = inspect(engine)
            constraints = inspector.get_unique_constraints('articles')
            
            # Check if we already have the correct constraint
            for constraint in constraints:
                if set(constraint['column_names']) == {'title', 'content', 'user_id'}:
                    print("✅ Unique constraint already updated")
                    return True
            
            print("🔄 Recreating articles table with updated constraints...")
            
            # Create new table with correct schema
            conn.execute(text("""
                CREATE TABLE articles_new (
                    id INTEGER PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    link VARCHAR(2048),
                    content TEXT,
                    summary TEXT,
                    input_type VARCHAR(10) NOT NULL,
                    analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    factuality_score INTEGER,
                    factuality_level VARCHAR(50),
                    factuality_description TEXT,
                    user_id INTEGER,
                    UNIQUE(title, content, user_id),
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """))
            
            # Copy data from old table
            conn.execute(text("""
                INSERT INTO articles_new 
                SELECT id, title, link, content, summary, input_type, 
                       analysis_date, factuality_score, factuality_level, 
                       factuality_description, user_id
                FROM articles
            """))
            
            # Drop old table and rename new one
            conn.execute(text("DROP TABLE articles"))
            conn.execute(text("ALTER TABLE articles_new RENAME TO articles"))
            
            print("✅ Articles table recreated with updated constraints")
            conn.commit()
            return True
            
    except Exception as e:
        print(f"❌ Error updating constraints: {e}")
        raise

def migrate_feedback_table(engine):
    """Add user_id column to feedback table if it doesn't exist."""
    print("🔄 Checking feedback table migration...")
    
    if check_column_exists(engine, 'feedback', 'user_id'):
        print("✅ user_id column already exists in feedback table")
        return True
    
    try:
        with engine.connect() as conn:
            print("➕ Adding user_id column to feedback table...")
            conn.execute(text("ALTER TABLE feedback ADD COLUMN user_id INTEGER"))
            print("✅ user_id column added to feedback table")
            conn.commit()
            return True
            
    except OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("✅ user_id column already exists in feedback table")
            return True
        else:
            print(f"❌ Error adding user_id column to feedback: {e}")
            raise

def assign_articles_to_first_user(engine):
    """Assign existing articles to random users (1-5) if they don't have a user_id."""
    print("🔄 Checking for articles without user assignment...")
    
    try:
        with engine.connect() as conn:
            # Check if there are any articles without user_id
            result = conn.execute(text("SELECT COUNT(*) FROM articles WHERE user_id IS NULL"))
            unassigned_count = result.scalar()
            
            if unassigned_count == 0:
                print("✅ All articles already have user assignments")
                return True
            
            # Check what users exist
            result = conn.execute(text("SELECT id FROM users ORDER BY id"))
            existing_users = [row[0] for row in result.fetchall()]
            
            if not existing_users:
                print("⚠️  No users found. Creating default users for existing articles...")
                # Create 5 default users for migration purposes
                default_users = [
                    ('migration_user_1', 'user1@truthguard.local'),
                    ('migration_user_2', 'user2@truthguard.local'),
                    ('migration_user_3', 'user3@truthguard.local'),
                    ('migration_user_4', 'user4@truthguard.local'),
                    ('migration_user_5', 'user5@truthguard.local')
                ]
                
                for username, email in default_users:
                    conn.execute(text("""
                        INSERT INTO users (username, email, password_hash, created_at) 
                        VALUES (:username, :email, 'temp_hash', datetime('now'))
                    """), {"username": username, "email": email})
                
                # Get the newly created user IDs
                result = conn.execute(text("SELECT id FROM users ORDER BY id"))
                existing_users = [row[0] for row in result.fetchall()]
                print(f"✅ Created {len(existing_users)} default users")
            
            # Ensure we have user IDs 1-5 available
            target_user_ids = [1, 2, 3, 4, 5]
            available_users = [uid for uid in target_user_ids if uid in existing_users]
            
            if not available_users:
                # Use whatever users exist
                available_users = existing_users[:5]  # Use first 5 users
                print(f"⚠️  Using existing user IDs: {available_users}")
            else:
                print(f"✅ Found target user IDs: {available_users}")
            
            # Get all unassigned articles
            result = conn.execute(text("SELECT id FROM articles WHERE user_id IS NULL"))
            unassigned_articles = [row[0] for row in result.fetchall()]
            
            # Randomly assign articles to users
            assignments = {}
            for article_id in unassigned_articles:
                random_user_id = random.choice(available_users)
                if random_user_id not in assignments:
                    assignments[random_user_id] = []
                assignments[random_user_id].append(article_id)
            
            # Update articles with random user assignments
            total_assigned = 0
            for user_id, article_ids in assignments.items():
                # Convert article_ids to a format suitable for SQL IN clause
                ids_str = ','.join(map(str, article_ids))
                conn.execute(text(f"UPDATE articles SET user_id = :user_id WHERE id IN ({ids_str})"), 
                            {"user_id": user_id})
                total_assigned += len(article_ids)
                print(f"➕ Assigned {len(article_ids)} articles to user ID {user_id}")
            
            print(f"✅ Total {total_assigned} articles randomly assigned to {len(assignments)} users")
            print(f"📊 Distribution: {dict([(uid, len(aids)) for uid, aids in assignments.items()])}")
            conn.commit()
            return True
            
    except Exception as e:
        print(f"❌ Error assigning articles to users: {e}")
        raise

def verify_migration(engine):
    """Verify that the migration was successful."""
    print("🔍 Verifying migration...")
    
    try:
        with engine.connect() as conn:
            # Check articles table structure
            inspector = inspect(engine)
            articles_columns = [col['name'] for col in inspector.get_columns('articles')]
            
            if 'user_id' not in articles_columns:
                print("❌ user_id column missing from articles table")
                return False
            
            # Check that all articles have user_id
            result = conn.execute(text("SELECT COUNT(*) FROM articles WHERE user_id IS NULL"))
            unassigned = result.scalar()
            
            if unassigned > 0:
                print(f"⚠️  {unassigned} articles still without user assignment")
                return False
            
            # Check feedback table
            feedback_columns = [col['name'] for col in inspector.get_columns('feedback')]
            if 'user_id' not in feedback_columns:
                print("❌ user_id column missing from feedback table")
                return False
            
            print("✅ Migration verification successful")
            return True
            
    except Exception as e:
        print(f"❌ Migration verification failed: {e}")
        return False

def run_migration():
    """Run the complete migration process."""
    print("🚀 Starting TruthGuard database migration...")
    print("=" * 50)
    
    try:
        # Create backup
        backup_path = backup_database()
        
        # Connect to database
        db_path = get_db_path()
        db_uri = f'sqlite:///{db_path}'
        engine = create_engine(db_uri)
        
        print(f"📂 Connected to database: {db_path}")
        
        # Run migrations
        migrations = [
            ("Articles table migration", migrate_articles_table),
            ("Feedback table migration", migrate_feedback_table),
            ("Unique constraint update", update_unique_constraint),
            ("Article user assignment", assign_articles_to_first_user),
            ("Migration verification", verify_migration)
        ]
        
        for description, migration_func in migrations:
            print(f"\n{description}...")
            success = migration_func(engine)
            if not success:
                print(f"❌ {description} failed")
                return False
        
        print("\n" + "=" * 50)
        print("🎉 Migration completed successfully!")
        
        if backup_path:
            print(f"💾 Backup saved at: {backup_path}")
            print("   You can delete this backup once you've verified everything works correctly.")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nIf you encounter issues, you can:")
        print("1. Restore from backup if available")
        print("2. Check the error message above")
        print("3. Run the migration again after fixing issues")
        return False

if __name__ == "__main__":
    print("TruthGuard Database Migration Tool")
    print("=" * 40)
    
    response = input("Do you want to proceed with the migration? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        exit(0)
    
    success = run_migration()
    exit(0 if success else 1)
