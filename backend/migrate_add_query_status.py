"""
Migration: Add 'status' column to student_queries table.
Values: 'open' (default) or 'closed'.
Run once, then safe to re-run (checks if column exists first).
"""
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'student_queries' AND column_name = 'status'
        """))
        if result.fetchone():
            print("Column 'status' already exists on student_queries. Skipping.")
            return

        # Add the column with a default
        conn.execute(text("""
            ALTER TABLE student_queries
            ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'open'
        """))

        # Add check constraint
        conn.execute(text("""
            ALTER TABLE student_queries
            ADD CONSTRAINT check_query_status CHECK (status IN ('open', 'closed'))
        """))

        conn.commit()
        print("Migration complete: 'status' column added to student_queries.")

if __name__ == "__main__":
    migrate()
