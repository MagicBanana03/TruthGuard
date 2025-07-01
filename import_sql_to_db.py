import re
import sqlite3
from pathlib import Path
from datetime import datetime

# Paths
SQL_FILE = Path(__file__).parent / 'truthguard (2).sql'
DB_PATH = Path(__file__).parent / 'instance' / 'truthguard.db'

def parse_sql_inserts(sql_content):
    """Parse INSERT statements from SQL dump."""
    # Find all INSERT statements for the articles table with proper regex
    insert_pattern = re.compile(
        r'INSERT\s+INTO\s+`?articles`?\s*\(([^)]+)\)\s*VALUES\s*(.*?);',
        re.IGNORECASE | re.MULTILINE | re.DOTALL
    )
    
    # Find all matches
    matches = insert_pattern.findall(sql_content)
    
    articles = []
    for cols, values_section in matches:
        # Clean and split column names
        columns = [col.strip('`"[] ') for col in cols.split(',')]
        
        # Parse individual value rows - handle multiple rows in one INSERT
        # Remove outer parentheses and split by ),( pattern
        values_section = values_section.strip()
        
        # Split into individual rows
        if values_section.startswith('(') and values_section.endswith(')'):
            values_section = values_section[1:-1]  # Remove outer parentheses
        
        # Split by ),( to get individual rows
        rows = re.split(r'\s*\),\s*\(', values_section)
        
        for row in rows:
            row = row.strip('()')
            
            # Parse values from the row
            values_list = []
            in_quotes = False
            current = ""
            i = 0
            while i < len(row):
                char = row[i]
                if char == "'" and (i == 0 or row[i-1] != '\\'):
                    in_quotes = not in_quotes
                    current += char
                elif char == "," and not in_quotes:
                    values_list.append(current.strip())
                    current = ""
                else:
                    current += char
                i += 1
            if current:
                values_list.append(current.strip())
            
            # Skip if we don't have enough values
            if len(values_list) != len(columns):
                print(f"Warning: Column count mismatch. Expected {len(columns)}, got {len(values_list)}")
                continue
            
            # Create article dict with default values for required fields
            article = {
                'title': '',
                'input_type': 'link',  # Default value
                'analysis_date': datetime.utcnow()
            }
            
            for col, val in zip(columns, values_list):
                # Clean up the value
                if val.upper() == 'NULL':
                    val = None
                elif val.startswith("'") and val.endswith("'"):
                    val = val[1:-1].replace("''", "'").replace('\\"', '"')
                
                # Convert to proper types
                if col == 'id':
                    try:
                        val = int(val) if val is not None else None
                    except (ValueError, TypeError):
                        print(f"Warning: Invalid ID value: {val}")
                        continue  # Skip this row if ID is invalid
                elif col == 'factuality_score':
                    try:
                        val = int(val) if val is not None else None
                    except (ValueError, TypeError):
                        val = None
                elif col == 'analysis_date':
                    try:
                        if val and val != 'NULL':
                            val = datetime.strptime(val, '%Y-%m-%d %H:%M:%S')
                        else:
                            val = datetime.utcnow()
                    except (ValueError, TypeError):
                        val = datetime.utcnow()
                elif col == 'input_type':
                    val = str(val).lower() if val else 'link'
                    if val not in ('link', 'snippet'):
                        val = 'link'  # Default to 'link' if invalid
                
                article[col] = val
            
            # Skip if required fields are missing
            if not article.get('title') or not article.get('input_type'):
                print(f"Warning: Skipping article with missing required fields: {article}")
                continue
                
            articles.append(article)
    
    return articles

def import_to_sqlite(articles):
    """Import articles into SQLite database."""
    # Ensure the instance directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Create articles table if it doesn't exist with proper constraints
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            link TEXT,
            content TEXT,
            summary TEXT,
            input_type TEXT NOT NULL CHECK(input_type IN ('link', 'snippet')),
            analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            factuality_score INTEGER,
            factuality_level TEXT,
            factuality_description TEXT
        )''')
        
        # Create users table for authentication
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )''')
        
        # Create feedback table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255),
            comments TEXT NOT NULL,
            rating INTEGER NOT NULL,
            submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Create breakdowns table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS breakdowns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            number INTEGER NOT NULL,
            explanation TEXT NOT NULL,
            FOREIGN KEY (article_id) REFERENCES articles (id)
        )''')
        
        # Create game tables
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level_number INTEGER UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            headline TEXT NOT NULL,
            article_snippet TEXT,
            is_fake BOOLEAN NOT NULL,
            difficulty VARCHAR(20) DEFAULT 'easy',
            time_limit INTEGER DEFAULT 300,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            facebook_posts TEXT,  -- JSON stored as TEXT
            news_articles TEXT,   -- JSON stored as TEXT
            expert_opinions TEXT  -- JSON stored as TEXT
        )''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_game_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            level_id INTEGER NOT NULL,
            completed BOOLEAN DEFAULT 0,
            score INTEGER DEFAULT 0,
            time_taken INTEGER,
            attempts INTEGER DEFAULT 0,
            last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_answer BOOLEAN,
            evidence_gathered TEXT,  -- JSON stored as TEXT
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (level_id) REFERENCES game_levels (id)
        )''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            level_id INTEGER NOT NULL,
            session_data TEXT,  -- JSON stored as TEXT
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (level_id) REFERENCES game_levels (id)
        )''')
        
        # Enable foreign key constraints
        cursor.execute('PRAGMA foreign_keys = ON;')
        
        # Insert articles
        success_count = 0
        for article in articles:
            try:
                # Ensure required fields are present
                if 'id' not in article or not article['id']:
                    print("Warning: Article missing ID, skipping...")
                    continue
                    
                # Set default values for required fields if missing
                article.setdefault('title', 'Untitled')
                article.setdefault('input_type', 'link')
                
                # Skip if article with this ID already exists
                cursor.execute('SELECT id FROM articles WHERE id = ?', (article['id'],))
                if cursor.fetchone() is not None:
                    print(f"Article with ID {article['id']} already exists, skipping...")
                    continue
                
                # Ensure input_type is valid
                input_type = str(article.get('input_type', 'link')).lower()
                if input_type not in ('link', 'snippet'):
                    input_type = 'link'
                article['input_type'] = input_type
                
                # Prepare values for insertion
                columns = ', '.join(article.keys())
                placeholders = ', '.join(['?'] * len(article))
                values = list(article.values())
                
                # Insert the article
                cursor.execute(
                    f'INSERT INTO articles ({columns}) VALUES ({placeholders})',
                    values
                )
                success_count += 1
                print(f"Inserted article {article['id']}: {article['title'][:50]}...")
                
            except sqlite3.IntegrityError as e:
                print(f"Error inserting article {article.get('id', 'unknown')}: {e}")
                conn.rollback()
            except Exception as e:
                print(f"Unexpected error with article {article.get('id', 'unknown')}: {e}")
                conn.rollback()
        
        conn.commit()
        print(f"\nSuccessfully imported {success_count} out of {len(articles)} articles into the database.")
        print("Created users, feedback, breakdowns, and game tables.")
        if success_count < len(articles):
            print(f"Skipped {len(articles) - success_count} articles due to errors.")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

def main():
    print("Starting SQL to SQLite import...")
    print(f"Source SQL file: {SQL_FILE}")
    print(f"Target SQLite DB: {DB_PATH}")
    
    try:
        # Read the SQL file
        with open(SQL_FILE, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Parse the SQL content
        print("\nParsing SQL file...")
        articles = parse_sql_inserts(sql_content)
        print(f"Found {len(articles)} articles to import.")
        
        # Import to SQLite
        print("\nImporting to SQLite database...")
        import_to_sqlite(articles)
        
    except FileNotFoundError:
        print(f"Error: SQL file not found at {SQL_FILE}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
