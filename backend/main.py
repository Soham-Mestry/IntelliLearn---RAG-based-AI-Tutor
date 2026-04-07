"""
FastAPI application for AI Tutor Platform.
All routes for authentication, student features, and admin features.
"""
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
import os
import shutil
import uuid

# Local imports
from database import get_db, init_db
from models import User, Subject, Note, QnALog, StudentQuery, QueryAnswer, Report
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    return response

# Create uploads directory if not exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


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
    subject_id: Optional[str] = None
    
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


class QueryAnswerResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    answer_text: str
    image_path: Optional[str] = None
    created_at: str
    
    class Config:
        from_attributes = True

class StudentQueryResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    title: str
    description: str
    image_path: Optional[str] = None
    status: str = "open"
    created_at: str
    answer_count: int = 0
    
    class Config:
        from_attributes = True

class StudentQueryDetailResponse(StudentQueryResponse):
    answers: List[QueryAnswerResponse] = []


class ReportResponse(BaseModel):
    id: str
    reporter_id: str
    reporter_name: str
    content_type: str
    content_id: str
    reason: str
    status: str
    created_at: str
    resolved_at: Optional[str] = None
    # Enriched content preview
    content_title: Optional[str] = None
    content_text: Optional[str] = None
    content_author: Optional[str] = None
    
    class Config:
        from_attributes = True





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
    # Get answer from RAG pipeline (scoped to subject if provided)
    result = ask_question(question_data.question, db, subject_id=question_data.subject_id)
    
    # Save to QnA log
    qna_log = QnALog(
        id=uuid.uuid4(),
        user_id=current_user.id,
        subject_id=question_data.subject_id,
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
    subject_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's question history.
    Optionally filtered by subject_id.
    Returns most recent questions first.
    """
    query = db.query(QnALog).filter(QnALog.user_id == current_user.id)
    
    if subject_id:
        query = query.filter(QnALog.subject_id == subject_id)
    
    history = query.order_by(QnALog.created_at.desc()).all()
    
    return [
        {
            "id": str(log.id),
            "question": log.question,
            "answer": log.answer,
            "created_at": log.created_at.isoformat()
        }
        for log in history
    ]


@app.post("/student/queries", response_model=StudentQueryResponse, status_code=status.HTTP_201_CREATED)
async def create_query(
    title: str = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new query with an optional image upload.
    """
    if not title.strip() or not description.strip():
        raise HTTPException(status_code=400, detail="Title and description are required")
        
    image_path = None
    if image and image.filename:
        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_extension = os.path.splitext(image.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image type not supported. Allowed: {', '.join(allowed_extensions)}"
            )
            
        unique_filename = f"query_{uuid.uuid4()}{file_extension}"
        image_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        try:
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving image: {str(e)}"
            )
            
    new_query = StudentQuery(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=title,
        description=description,
        image_path=image_path
    )
    db.add(new_query)
    db.commit()
    db.refresh(new_query)
    
    return {
        "id": str(new_query.id),
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "title": new_query.title,
        "description": new_query.description,
        "image_path": new_query.image_path,
        "status": new_query.status,
        "created_at": new_query.created_at.isoformat(),
        "answer_count": 0
    }

@app.get("/student/queries", response_model=List[StudentQueryResponse])
def get_queries(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all student queries. Optional status_filter: 'open' or 'closed'."""
    from sqlalchemy.orm import joinedload
    query = db.query(StudentQuery).options(joinedload(StudentQuery.user), joinedload(StudentQuery.answers))
    
    if status_filter and status_filter in ('open', 'closed'):
        query = query.filter(StudentQuery.status == status_filter)
    
    queries = query.order_by(StudentQuery.created_at.desc()).all()
    
    return [
        {
            "id": str(q.id),
            "user_id": str(q.user_id),
            "user_name": q.user.name,
            "title": q.title,
            "description": q.description,
            "image_path": q.image_path,
            "status": q.status,
            "created_at": q.created_at.isoformat(),
            "answer_count": len(q.answers)
        }
        for q in queries
    ]

@app.get("/student/queries/{query_id}", response_model=StudentQueryDetailResponse)
def get_query_details(
    query_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detail of a query with its answers"""
    from sqlalchemy.orm import joinedload
    q = db.query(StudentQuery).filter(StudentQuery.id == query_id).options(joinedload(StudentQuery.user), joinedload(StudentQuery.answers)).first()
    
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
        
    return {
        "id": str(q.id),
        "user_id": str(q.user_id),
        "user_name": q.user.name,
        "title": q.title,
        "description": q.description,
        "image_path": q.image_path,
        "status": q.status,
        "created_at": q.created_at.isoformat(),
        "answer_count": len(q.answers),
        "answers": [
            {
                "id": str(a.id),
                "user_id": str(a.user_id),
                "user_name": a.user.name,
                "answer_text": a.answer_text,
                "image_path": a.image_path,
                "created_at": a.created_at.isoformat()
            }
            for a in q.answers
        ]
    }

@app.post("/student/queries/{query_id}/answers", response_model=QueryAnswerResponse, status_code=status.HTTP_201_CREATED)
async def post_query_answer(
    query_id: str,
    answer_text: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Post an answer to a query with optional image attachment. Blocked if query is closed."""
    if not answer_text.strip():
        raise HTTPException(status_code=400, detail="Answer text cannot be empty")
    
    query = db.query(StudentQuery).filter(StudentQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if query.status == "closed":
        raise HTTPException(status_code=403, detail="This query is closed. No new answers can be posted.")
    
    image_path = None
    if image and image.filename:
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_extension = os.path.splitext(image.filename)[1].lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image type not supported. Allowed: {', '.join(allowed_extensions)}"
            )
        unique_filename = f"answer_{uuid.uuid4()}{file_extension}"
        image_path = os.path.join(UPLOAD_DIR, unique_filename)
        try:
            with open(image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving image: {str(e)}"
            )
    
    new_answer = QueryAnswer(
        id=uuid.uuid4(),
        query_id=query.id,
        user_id=current_user.id,
        answer_text=answer_text,
        image_path=image_path
    )
    db.add(new_answer)
    db.commit()
    db.refresh(new_answer)
    
    return {
        "id": str(new_answer.id),
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "answer_text": new_answer.answer_text,
        "image_path": new_answer.image_path,
        "created_at": new_answer.created_at.isoformat()
    }


@app.delete("/student/queries/{query_id}", status_code=status.HTTP_200_OK)
def delete_query(
    query_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a query and all its answers. Only the query owner can delete."""
    query = db.query(StudentQuery).filter(StudentQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if str(query.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only delete your own queries")
    
    # Delete associated image files (query image + answer images)
    if query.image_path and os.path.exists(query.image_path):
        try:
            os.remove(query.image_path)
        except Exception:
            pass
    
    for answer in query.answers:
        if answer.image_path and os.path.exists(answer.image_path):
            try:
                os.remove(answer.image_path)
            except Exception:
                pass
    
    # Delete query (answers cascade-deleted via relationship)
    db.delete(query)
    db.commit()
    
    return {"message": "Query deleted successfully", "query_id": query_id}


@app.delete("/student/queries/{query_id}/answers/{answer_id}", status_code=status.HTTP_200_OK)
def delete_answer(
    query_id: str,
    answer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an answer. Only the answer author can delete."""
    answer = db.query(QueryAnswer).filter(
        QueryAnswer.id == answer_id,
        QueryAnswer.query_id == query_id
    ).first()
    
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    if str(answer.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only delete your own answers")
    
    # Delete associated image file
    if answer.image_path and os.path.exists(answer.image_path):
        try:
            os.remove(answer.image_path)
        except Exception:
            pass
    
    db.delete(answer)
    db.commit()
    
    return {"message": "Answer deleted successfully", "answer_id": answer_id}


@app.patch("/student/queries/{query_id}/status", status_code=status.HTTP_200_OK)
def toggle_query_status(
    query_id: str,
    new_status: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle a query's status between 'open' and 'closed'.
    Only the query owner can change the status.
    """
    if new_status not in ('open', 'closed'):
        raise HTTPException(status_code=400, detail="Status must be 'open' or 'closed'")
    
    query = db.query(StudentQuery).filter(StudentQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if str(query.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the query creator can change the status")
    
    query.status = new_status
    db.commit()
    
    return {"message": f"Query status updated to {new_status}", "query_id": query_id, "status": new_status}


# ============= Report Routes (Student) =============

@app.post("/student/reports", status_code=status.HTTP_201_CREATED)
def create_report(
    content_type: str = Form(...),
    content_id: str = Form(...),
    reason: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Report a query or answer.
    content_type must be 'query' or 'answer'.
    """
    if content_type not in ('query', 'answer'):
        raise HTTPException(status_code=400, detail="content_type must be 'query' or 'answer'")
    
    if not reason.strip():
        raise HTTPException(status_code=400, detail="Report reason cannot be empty")
    
    # Verify the content exists
    if content_type == 'query':
        item = db.query(StudentQuery).filter(StudentQuery.id == content_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Query not found")
    else:
        item = db.query(QueryAnswer).filter(QueryAnswer.id == content_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Answer not found")
    
    # Check if user already reported this content
    existing = db.query(Report).filter(
        Report.reporter_id == current_user.id,
        Report.content_type == content_type,
        Report.content_id == content_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reported this content")
    
    new_report = Report(
        id=uuid.uuid4(),
        reporter_id=current_user.id,
        content_type=content_type,
        content_id=content_id,
        reason=reason.strip(),
        status="pending"
    )
    db.add(new_report)
    db.commit()
    
    return {"message": "Report submitted successfully"}



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


@app.get("/admin/notes", response_model=List[NoteResponse])
def get_all_notes(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all uploaded notes with subject information.
    Admin only.
    """
    notes = db.query(Note).join(Subject).order_by(Note.uploaded_at.desc()).all()
    
    return [
        {
            "id": str(note.id),
            "filename": note.filename,
            "subject_name": note.subject.name,
            "uploaded_at": note.uploaded_at.isoformat()
        }
        for note in notes
    ]


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


@app.delete("/admin/subject/{subject_id}", status_code=status.HTTP_200_OK)
def delete_subject(
    subject_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a subject and all associated data (notes, embeddings, files, QnA logs).
    Admin only. Cascades through all related records.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )

    # Delete physical files for all notes under this subject
    for note in subject.notes:
        if os.path.exists(note.filepath):
            try:
                os.remove(note.filepath)
            except Exception as e:
                print(f"Warning: Could not delete file {note.filepath}: {str(e)}")

    # Delete the subject (notes & embeddings cascade-deleted via ORM relationships,
    # QnA logs have ondelete="SET NULL" so they keep the log but lose the subject reference)
    db.delete(subject)
    db.commit()

    return {
        "message": "Subject and all associated data deleted successfully",
        "subject_id": subject_id
    }


# ============= Admin Query Management Routes =============

@app.get("/admin/queries", response_model=List[StudentQueryDetailResponse])
def admin_get_all_queries(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all student queries with their answers.
    Admin only. Optional status_filter: 'open' or 'closed'.
    Returns queries sorted newest first.
    """
    from sqlalchemy.orm import joinedload
    query = db.query(StudentQuery).options(
        joinedload(StudentQuery.user),
        joinedload(StudentQuery.answers).joinedload(QueryAnswer.user)
    )
    
    if status_filter and status_filter in ('open', 'closed'):
        query = query.filter(StudentQuery.status == status_filter)
    
    queries = query.order_by(StudentQuery.created_at.desc()).all()

    return [
        {
            "id": str(q.id),
            "user_id": str(q.user_id),
            "user_name": q.user.name,
            "title": q.title,
            "description": q.description,
            "image_path": q.image_path,
            "status": q.status,
            "created_at": q.created_at.isoformat(),
            "answer_count": len(q.answers),
            "answers": [
                {
                    "id": str(a.id),
                    "user_id": str(a.user_id),
                    "user_name": a.user.name,
                    "answer_text": a.answer_text,
                    "image_path": a.image_path,
                    "created_at": a.created_at.isoformat()
                }
                for a in q.answers
            ]
        }
        for q in queries
    ]


@app.delete("/admin/queries/{query_id}", status_code=status.HTTP_200_OK)
def admin_delete_query(
    query_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete any student query and all its answers.
    Admin only — no ownership check.
    """
    query = db.query(StudentQuery).filter(StudentQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found")

    # Clean up image files
    if query.image_path and os.path.exists(query.image_path):
        try:
            os.remove(query.image_path)
        except Exception:
            pass

    for answer in query.answers:
        if answer.image_path and os.path.exists(answer.image_path):
            try:
                os.remove(answer.image_path)
            except Exception:
                pass

    db.delete(query)
    db.commit()

    return {"message": "Query deleted successfully by admin", "query_id": query_id}


@app.delete("/admin/queries/{query_id}/answers/{answer_id}", status_code=status.HTTP_200_OK)
def admin_delete_answer(
    query_id: str,
    answer_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete any answer from a query.
    Admin only — no ownership check.
    """
    answer = db.query(QueryAnswer).filter(
        QueryAnswer.id == answer_id,
        QueryAnswer.query_id == query_id
    ).first()

    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    if answer.image_path and os.path.exists(answer.image_path):
        try:
            os.remove(answer.image_path)
        except Exception:
            pass

    db.delete(answer)
    db.commit()

    return {"message": "Answer deleted successfully by admin", "answer_id": answer_id}


# ============= Admin Report Management Routes =============

@app.get("/admin/reports", response_model=List[ReportResponse])
def admin_get_reports(
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all reports. Optionally filter by status ('pending', 'reviewed', 'dismissed').
    Admin only.
    """
    from sqlalchemy.orm import joinedload
    query = db.query(Report).options(joinedload(Report.reporter))
    
    if status_filter and status_filter in ('pending', 'reviewed', 'dismissed'):
        query = query.filter(Report.status == status_filter)
    
    reports = query.order_by(Report.created_at.desc()).all()
    
    result = []
    for r in reports:
        # Enrich with content info
        content_title = None
        content_text = None
        content_author = None
        
        if r.content_type == 'query':
            q = db.query(StudentQuery).options(joinedload(StudentQuery.user)).filter(StudentQuery.id == r.content_id).first()
            if q:
                content_title = q.title
                content_text = q.description[:200] if q.description else None
                content_author = q.user.name
        else:
            a = db.query(QueryAnswer).options(joinedload(QueryAnswer.user)).filter(QueryAnswer.id == r.content_id).first()
            if a:
                content_text = a.answer_text[:200] if a.answer_text else None
                content_author = a.user.name
        
        result.append({
            "id": str(r.id),
            "reporter_id": str(r.reporter_id),
            "reporter_name": r.reporter.name,
            "content_type": r.content_type,
            "content_id": str(r.content_id),
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
            "content_title": content_title,
            "content_text": content_text,
            "content_author": content_author,
        })
    
    return result


@app.put("/admin/reports/{report_id}")
def admin_update_report_status(
    report_id: str,
    new_status: str = Form(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update report status (reviewed/dismissed).
    Admin only.
    """
    if new_status not in ('reviewed', 'dismissed'):
        raise HTTPException(status_code=400, detail="Status must be 'reviewed' or 'dismissed'")
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    from datetime import datetime
    report.status = new_status
    report.resolved_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Report marked as {new_status}", "report_id": report_id}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
