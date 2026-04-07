"""
Migration script to create the reports table.
Run this once to add the reports table to the database.
"""
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if table already exists
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reports')"
        ))
        exists = result.scalar()
        
        if exists:
            print("Table 'reports' already exists. Skipping migration.")
            return
        
        conn.execute(text("""
            CREATE TABLE reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content_type VARCHAR(20) NOT NULL,
                content_id UUID NOT NULL,
                reason TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP,
                CONSTRAINT check_report_content_type CHECK (content_type IN ('query', 'answer')),
                CONSTRAINT check_report_status CHECK (status IN ('pending', 'reviewed', 'dismissed'))
            );
        """))
        conn.commit()
        print("✅ Created 'reports' table successfully!")

if __name__ == "__main__":
    migrate()
