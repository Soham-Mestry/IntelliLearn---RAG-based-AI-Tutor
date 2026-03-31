"""
Migration script: Add subject_id column to qna_logs table.
Run this once to update the existing database schema.
"""
from database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'qna_logs' AND column_name = 'subject_id'
        """))
        
        if result.fetchone():
            print("✅ Column 'subject_id' already exists in 'qna_logs'. No changes needed.")
            return
        
        # Add the subject_id column
        conn.execute(text("""
            ALTER TABLE qna_logs
            ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL
        """))
        conn.commit()
        print("✅ Migration complete: Added 'subject_id' column to 'qna_logs' table.")

if __name__ == "__main__":
    run_migration()
