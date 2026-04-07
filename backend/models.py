"""
SQLAlchemy database models for AI Tutor Platform.
All tables with proper relationships and constraints.
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, CheckConstraint, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from database import Base
import uuid
from datetime import datetime


class User(Base):
    """User model for both students and admins"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'student' or 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    qna_logs = relationship("QnALog", back_populates="user", cascade="all, delete-orphan")
    
    # Constraint to ensure role is either 'student' or 'admin'
    __table_args__ = (
        CheckConstraint("role IN ('student', 'admin')", name="check_user_role"),
    )


class Subject(Base):
    """Subject model with semester constraint"""
    __tablename__ = "subjects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    semester = Column(Integer, nullable=False)
    
    # Relationship
    notes = relationship("Note", back_populates="subject", cascade="all, delete-orphan")
    qna_logs = relationship("QnALog", back_populates="subject")
    
    # Constraint to ensure semester is between 1 and 8
    __table_args__ = (
        CheckConstraint("semester >= 1 AND semester <= 8", name="check_semester_range"),
    )


class Note(Base):
    """Note model for uploaded documents"""
    __tablename__ = "notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    subject = relationship("Subject", back_populates="notes")
    embeddings = relationship("Embedding", back_populates="note", cascade="all, delete-orphan")


class Embedding(Base):
    """Embedding model for vector storage"""
    __tablename__ = "embeddings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    text_chunk = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=False)  # 384 dimensions for all-MiniLM-L6-v2
    
    # Relationship
    note = relationship("Note", back_populates="embeddings")


class QnALog(Base):
    """Question and Answer log model"""
    __tablename__ = "qna_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="qna_logs")
    subject = relationship("Subject", back_populates="qna_logs")


class StudentQuery(Base):
    """Model for queries asked by students"""
    __tablename__ = "student_queries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    image_path = Column(String(500), nullable=True)  # Optional image
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="student_queries")
    answers = relationship("QueryAnswer", back_populates="query", cascade="all, delete-orphan", order_by="QueryAnswer.created_at.asc()")


class QueryAnswer(Base):
    """Model for answers to student queries"""
    __tablename__ = "query_answers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), ForeignKey("student_queries.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answer_text = Column(Text, nullable=False)
    image_path = Column(String(500), nullable=True)  # Optional image attachment
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    query = relationship("StudentQuery", back_populates="answers")
    user = relationship("User", backref="query_answers")


class Report(Base):
    """Model for reports on queries or answers"""
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content_type = Column(String(20), nullable=False)  # 'query' or 'answer'
    content_id = Column(UUID(as_uuid=True), nullable=False)  # ID of the reported query or answer
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # 'pending', 'reviewed', 'dismissed'
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    reporter = relationship("User", backref="reports")
    
    __table_args__ = (
        CheckConstraint("content_type IN ('query', 'answer')", name="check_report_content_type"),
        CheckConstraint("status IN ('pending', 'reviewed', 'dismissed')", name="check_report_status"),
    )
