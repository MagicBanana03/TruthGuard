import sqlite3
from datetime import datetime

def clean_database():
    # Connect to the database
    print("Connecting to database...")
    try:
        conn = sqlite3.connect('instance/truthguard.db')
        cursor = conn.cursor()
        
        # First, check the schema of the articles table
        print("\nChecking articles table schema...")
        cursor.execute("PRAGMA table_info(articles)")
        columns = cursor.fetchall()
        for col in columns:
            print(f"Column: {col[1]}, Type: {col[2]}")
        
        # Get all articles with their factuality values
        print("\nChecking all articles...")
        cursor.execute("""
            SELECT id, factuality_score, factuality_level 
            FROM articles 
            ORDER BY id ASC
        """)
        articles = cursor.fetchall()
        print(f"\nFound {len(articles)} articles in total")
        
        # Print problematic articles
        print("\nArticles with problematic values:")
        for article in articles:
            id, score, level = article
            if score is None or str(score).lower() == 'undefined':
                print(f"Article {id}: factuality_score is {score}")
            if level is None or str(level).lower() == 'undefined':
                print(f"Article {id}: factuality_level is {level}")
        
        # Update problematic records
        print("\nUpdating problematic records...")
        
        # First update factuality_score
        cursor.execute("""
            UPDATE articles 
            SET factuality_score = 0 
            WHERE factuality_score IS NULL 
            OR factuality_score = 'undefined'
        """)
        score_updated = cursor.rowcount
        print(f"\nUpdated {score_updated} records with undefined factuality_score")
        
        # Then update factuality_level
        cursor.execute("""
            UPDATE articles 
            SET factuality_level = 'Unknown' 
            WHERE factuality_level IS NULL 
            OR factuality_level = 'undefined'
        """)
        level_updated = cursor.rowcount
        print(f"Updated {level_updated} records with undefined factuality_level")
        
        # Verify the updates
        print("\nVerifying updates...")
        cursor.execute("""
            SELECT COUNT(*) 
            FROM articles 
            WHERE factuality_score IS NULL 
            OR factuality_score = 'undefined' 
            OR factuality_level IS NULL 
            OR factuality_level = 'undefined'
        """)
        remaining_problems = cursor.fetchone()[0]
        print(f"Remaining problematic records: {remaining_problems}")
        
        # Commit the changes
        conn.commit()
        print("\nCleanup completed successfully!")
        
    except Exception as e:
        print(f"Error cleaning database: {e}")
        if 'conn' in locals():
            conn.rollback()
    
    finally:
        if 'conn' in locals():
            conn.close()
            print("\nDatabase connection closed.")

if __name__ == "__main__":
    clean_database()
