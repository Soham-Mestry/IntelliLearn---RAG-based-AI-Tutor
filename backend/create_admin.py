"""
Helper script to create admin user and initialize database.
Run this script once during initial setup.
"""
from database import init_db, SessionLocal
from models import User
from auth import hash_password
import uuid
import getpass


def create_admin():
    """Create an admin user with email and password input"""
    print("=" * 50)
    print("🎓 AI Tutor Platform - Admin Creation")
    print("=" * 50)
    
    # Initialize database
    print("\n📊 Initializing database tables...")
    init_db()
    
    # Get admin details
    print("\n👤 Create Admin Account")
    print("-" * 50)
    
    name = input("Admin Name: ").strip()
    while not name:
        print("❌ Name cannot be empty")
        name = input("Admin Name: ").strip()
    
    email = input("Admin Email: ").strip()
    while not email or "@" not in email:
        print("❌ Please enter a valid email")
        email = input("Admin Email: ").strip()
    
    password = getpass.getpass("Admin Password (min 6 chars): ")
    while len(password) < 6:
        print("❌ Password must be at least 6 characters")
        password = getpass.getpass("Admin Password (min 6 chars): ")
    
    confirm_password = getpass.getpass("Confirm Password: ")
    while password != confirm_password:
        print("❌ Passwords do not match")
        password = getpass.getpass("Admin Password (min 6 chars): ")
        confirm_password = getpass.getpass("Confirm Password: ")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"\n❌ Error: Email '{email}' is already registered")
            return
        
        # Create admin user
        admin = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="admin"
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("\n" + "=" * 50)
        print("✅ Admin account created successfully!")
        print("=" * 50)
        print(f"📧 Email: {email}")
        print(f"👤 Name: {name}")
        print(f"🔑 Role: admin")
        print(f"🆔 ID: {admin.id}")
        print("=" * 50)
        print("\n🚀 You can now start the server with:")
        print("   uvicorn main:app --reload")
        print("\n📚 Then visit: http://localhost:8000/docs")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n❌ Error creating admin: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
