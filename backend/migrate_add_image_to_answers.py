"""
Migration script: Add image_path column to query_answers table.
Run this once to update the existing database schema.
"""
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'query_answers' AND column_name = 'image_path'
        """))
        
        if result.fetchone() is None:
            conn.execute(text("""
                ALTER TABLE query_answers ADD COLUMN image_path VARCHAR(500) DEFAULT NULL
            """))
            conn.commit()
            print("✅ Added 'image_path' column to 'query_answers' table.")
        else:
            print("ℹ️  Column 'image_path' already exists in 'query_answers'. Skipping.")

if __name__ == "__main__":
    migrate()
