"""
FastAPI application for AI Tutor Platform.
All routes for authentication, student features, and admin features.
"""
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
import os
import shutil
import uuid

# Local imports
from database import get_db, init_db
from models import User, Subject, Note, QnALog
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin
)
from rag import process_and_embed_document, ask_question


# Initialize FastAPI app
app = FastAPI(
    title="AI Tutor Platform API",
    description="Backend for AI-powered tutoring platform",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if not exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============= Pydantic Models for Request/Response =============

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    
    @validator('name')
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v
    
    @validator('password')
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class SubjectCreate(BaseModel):
    name: str
    semester: int
    
    @validator('semester')
    def semester_range(cls, v):
        if v < 1 or v > 8:
            raise ValueError('Semester must be between 1 and 8')
        return v


class SubjectResponse(BaseModel):
    id: str
    name: str
    semester: int
    
    class Config:
        from_attributes = True


class QuestionRequest(BaseModel):
    question: str
    
    @validator('question')
    def question_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Question cannot be empty')
        return v


class AnswerResponse(BaseModel):
    answer: str
    sources: List[str]


class QnAHistoryResponse(BaseModel):
    id: str
    question: str
    answer: str
    created_at: str
    
    class Config:
        from_attributes = True


class NoteResponse(BaseModel):
    id: str
    filename: str
    subject_name: str
    uploaded_at: str


# ============= Startup Event =============

@app.on_event("startup")
def startup_event():
    """Initialize database tables on startup"""
    init_db()


# ============= Public Routes =============

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "AI Tutor Platform API",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new student account.
    Email must be unique.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        id=uuid.uuid4(),
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role="student"  # Default role is student
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate JWT token
    access_token = create_access_token(
        data={"user_id": str(new_user.id), "role": new_user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }


@app.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login for both students and admins.
    Returns JWT token on success.
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Generate JWT token
    access_token = create_access_token(
        data={"user_id": str(user.id), "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }


# ============= Student Routes (Protected) =============

@app.get("/subjects/{semester}", response_model=List[SubjectResponse])
def get_subjects_by_semester(
    semester: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all subjects for a specific semester (1-8).
    Requires authentication.
    """
    if semester < 1 or semester > 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Semester must be between 1 and 8"
        )
    
    subjects = db.query(Subject).filter(Subject.semester == semester).all()
    
    return [
        {
            "id": str(subject.id),
            "name": subject.name,
            "semester": subject.semester
        }
        for subject in subjects
    ]


@app.post("/ask", response_model=AnswerResponse)
def ask_ai_question(
    question_data: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask a question to the AI tutor using RAG.
    Saves question and answer to history.
    """
    # Get answer from RAG pipeline
    result = ask_question(question_data.question, db)
    
    # Save to QnA log
    qna_log = QnALog(
        id=uuid.uuid4(),
        user_id=current_user.id,
        question=question_data.question,
        answer=result["answer"]
    )
    db.add(qna_log)
    db.commit()
    
    return {
        "answer": result["answer"],
        "sources": result["sources"]
    }


@app.get("/history", response_model=List[QnAHistoryResponse])
def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's question history.
    Returns most recent questions first.
    """
    history = db.query(QnALog)\
        .filter(QnALog.user_id == current_user.id)\
        .order_by(QnALog.created_at.desc())\
        .all()
    
    return [
        {
            "id": str(log.id),
            "question": log.question,
            "answer": log.answer,
            "created_at": log.created_at.isoformat()
        }
        for log in history
    ]


# ============= Admin Routes (Protected) =============

@app.post("/admin/subject", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_data: SubjectCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new subject.
    Admin only. Semester must be 1-8.
    """
    # Create new subject
    new_subject = Subject(
        id=uuid.uuid4(),
        name=subject_data.name,
        semester=subject_data.semester
    )
    
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    
    return {
        "id": str(new_subject.id),
        "name": new_subject.name,
        "semester": new_subject.semester
    }


@app.post("/admin/upload", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_note(
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Upload a note (PDF/DOCX/PPT) for a subject.
    Admin only. Processes file and generates embeddings.
    """
    # Validate subject exists
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    
    # Validate file type
    allowed_extensions = ['.pdf', '.docx', '.doc', '.ppt', '.pptx']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    filepath = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    
    # Create note record
    note_id = uuid.uuid4()
    new_note = Note(
        id=note_id,
        subject_id=subject.id,
        filename=file.filename,
        filepath=filepath
    )
    
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    # Process document and generate embeddings
    try:
        chunk_count = process_and_embed_document(filepath, note_id, db)
    except Exception as e:
        # If processing fails, delete the note and file
        db.delete(new_note)
        db.commit()
        os.remove(filepath)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )
    
    return {
        "message": "Note uploaded and processed successfully",
        "note_id": str(new_note.id),
        "filename": file.filename,
        "subject": subject.name,
        "chunks_created": chunk_count
    }


@app.delete("/admin/note/{note_id}", status_code=status.HTTP_200_OK)
def delete_note(
    note_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a note and all its embeddings.
    Admin only. Also deletes the physical file.
    """
    # Find note
    note = db.query(Note).filter(Note.id == note_id).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Delete physical file
    if os.path.exists(note.filepath):
        try:
            os.remove(note.filepath)
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Warning: Could not delete file {note.filepath}: {str(e)}")
    
    # Delete note (embeddings will be deleted automatically due to cascade)
    db.delete(note)
    db.commit()
    
    return {
        "message": "Note deleted successfully",
        "note_id": note_id
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
