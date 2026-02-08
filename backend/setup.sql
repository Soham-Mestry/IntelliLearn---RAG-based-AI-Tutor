-- AI Tutor Platform Database Setup
-- Run these commands on your PostgreSQL (Neon) database

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions are installed
SELECT * FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');

-- Tables will be created automatically by SQLAlchemy when you run:
-- python create_admin.py
-- or when the FastAPI app starts

-- Optional: Create an index on embeddings for faster similarity search
-- Run this AFTER your first note upload to improve query performance
-- CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
