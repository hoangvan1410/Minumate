"""FastAPI web interface for meeting transcript analysis and email generation with JWT authentication."""

from fastapi import FastAPI, Request, Form, HTTPException, UploadFile, File, Depends, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import os
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
import json
import uuid
from datetime import datetime, timedelta
import sendgrid
from sendgrid.helpers.mail import Mail, TrackingSettings, ClickTracking, OpenTracking

# Load environment variables from .env file
load_dotenv()

from meeting_analyzer import MeetingTranscriptAnalyzer, MeetingData, EmailType
from database import EmailTrackingDB
from auth import (
    verify_password, get_password_hash, create_access_token, 
    get_current_user, get_admin_user, UserRole, create_default_admin_if_not_exists
)
from user_db import UserDB
from models import (
    UserRegister, UserLogin, Token, TranscriptAnalysis, 
    MeetingCreate, TaskUpdate, AnalysisResponse
)
import uvicorn
 
# Create FastAPI app
app = FastAPI(title="AI Meeting Transcript Analyzer", version="1.0.0")

# Add CORS middleware for React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for static files
Path("static").mkdir(exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount React build files (if they exist)
react_build_path = Path("frontend/build")
if react_build_path.exists():
    app.mount("/react", StaticFiles(directory="frontend/build/static"), name="react-static")

# Initialize databases
db = EmailTrackingDB()
user_db = UserDB()
print("✅ SQLite databases initialized successfully")

# Create default admin user if no users exist
create_default_admin_if_not_exists(user_db)

# Initialize the analyzer
# Try real API connection, show error if it fails
try:
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
   
    if not api_key:
        raise ValueError("OpenAI API key is required. Please set OPENAI_API_KEY in your environment variables or .env file.")
   
    analyzer = MeetingTranscriptAnalyzer(api_key, base_url)
    print("✅ OpenAI API connection established successfully")
   
except Exception as e:
    print(f"❌ Failed to initialize OpenAI API: {e}")
    # Store the error to show in the web interface
    API_ERROR = str(e)
    analyzer = None
else:
    API_ERROR = None
 
# Initialize SendGrid
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@yourdomain.com")
SENDER_NAME = os.getenv("SENDER_NAME", "Meeting Analyzer Bot")
 
if SENDGRID_API_KEY:
    sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
    print("✅ SendGrid API initialized successfully")
else:
    sg = None
    print("⚠️ SendGrid API key not found - email sending will be disabled")
 
# Initialize database for email tracking
print("✅ SQLite database initialized successfully")

# Store sent emails for tracking (keeping for backward compatibility)
sent_emails = {}

# Authentication endpoints
@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user."""
    
    # Check if email exists and handle different statuses
    existing_email = user_db.get_user_by_email_any_status(user_data.email)
    if existing_email:
        if existing_email['status'] == 'created':
            # User was created from email sending, now they can complete registration
            
            # Check if the desired username is already taken by a registered user
            existing_username = user_db.get_user_by_username_any_status(user_data.username)
            if existing_username and existing_username['id'] != existing_email['id']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken by another user"
                )
            
            # Update user from "created" to "registered" status
            hashed_password = get_password_hash(user_data.password)
            updated = user_db.update_user_status_to_registered(
                user_data.email, 
                hashed_password, 
                user_data.username,
                user_data.full_name
            )
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to complete registration"
                )
            user_id = existing_email['id']
        else:
            # User already fully registered
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered and activated"
            )
    else:
        # Check if username already exists for new user
        existing_user = user_db.get_user_by_username_any_status(user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create completely new user
        hashed_password = get_password_hash(user_data.password)
        user_dict = {
            "username": user_data.username,
            "email": user_data.email,
            "password": hashed_password,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "status": "registered",
            "is_active": True
        }
        
        user_id = user_db.create_user(user_dict)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
    
    # Create access token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user_data.username, "user_id": user_id, "role": user_data.role},
        expires_delta=access_token_expires
    )
    
    user_info = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_info
    }

@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """Authenticate user and return JWT token."""
    user = user_db.get_user_by_username_any_status(user_data.username)
    
    if not user:
        # Check if user exists with same email but different username
        user_by_email = user_db.get_user_by_email_any_status(user_data.username)  # In case they enter email as username
        if user_by_email and user_by_email["status"] == "created":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account exists but not activated. Please complete registration first.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is fully registered BEFORE verifying password
    if user["status"] != "registered":
        if user["status"] == "created":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not activated. Please complete registration first.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not fully activated. Please contact support.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Only verify password for registered users (who have valid password hashes)
    if not user["password_hash"] or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user["username"], "user_id": user["id"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    user_info = {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"]
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_info
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    user = user_db.get_user_by_username(current_user["username"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "is_active": user["is_active"]
    }
 
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Home page - serves React app or fallback message."""
    # Check if React build exists
    react_build_path = Path("frontend/build/index.html")
    if react_build_path.exists():
        # Serve React app
        with open(react_build_path, 'r', encoding='utf-8') as f:
            return HTMLResponse(content=f.read())
    else:
        # Return a simple message directing users to build React app
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Meeting Transcript Analyzer</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-5">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-body text-center">
                                <h1 class="card-title">AI Meeting Transcript Analyzer</h1>
                                <p class="card-text">React frontend not found. Please build the React app:</p>
                                <code>cd frontend && npm install && npm run build</code>
                                <p class="mt-3">Then restart the server.</p>
                                <p class="text-muted">API endpoints are available at /analyze_ajax</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """)
 
# Meeting analysis endpoints (Admin only)
@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_meeting_transcript(
    analysis_data: TranscriptAnalysis,
    current_user: dict = Depends(get_admin_user)
):
    """Analyze meeting transcript (Admin only) and save to database."""
    
    # Check if API is available
    if analyzer is None:
        raise HTTPException(
            status_code=503,
            detail=f"OpenAI API is not available: {API_ERROR}"
        )
    
    try:
        # Create meeting data object
        meeting_data = MeetingData(transcript=analysis_data.transcript)
        
        print("🔍 Processing transcript length:", len(analysis_data.transcript))
        
        # Analyze the meeting
        meeting_summary = analyzer.analyze_transcript(meeting_data)
        
        print("✅ Meeting analysis complete")
        
        # Create meeting in database
        meeting_record = {
            "title": analysis_data.meeting_title,
            "description": "Meeting analyzed by AI",
            "transcript": analysis_data.transcript,
            "analysis_result": json.dumps({
                "executive_summary": meeting_summary.executive_summary,
                "key_decisions": meeting_summary.key_decisions,
                "action_items": [
                    {
                        "task": item.task,
                        "owner": item.owner,
                        "due_date": item.due_date,
                        "priority": item.priority,
                        "status": item.status
                    } for item in meeting_summary.action_items
                ],
                "next_steps": meeting_summary.next_steps,
                "risks_concerns": meeting_summary.risks_concerns
            })
        }
        
        meeting_id = user_db.create_meeting(meeting_record, current_user["user_id"])
        
        if not meeting_id:
            raise HTTPException(
                status_code=500,
                detail="Failed to save meeting analysis"
            )
        
        # Add participants to meeting
        for participant_id in analysis_data.participants:
            user_db.add_meeting_participant(meeting_id, participant_id, "participant")
        
        # Create tasks from action items
        created_tasks = []
        for item in meeting_summary.action_items:
            # Try to find user by name (simplified matching)
            assigned_user = None
            if item.owner:
                users = user_db.get_all_users()
                for user in users:
                    if item.owner.lower() in user["full_name"].lower():
                        assigned_user = user["id"]
                        break
            
            task_data = {
                "meeting_id": meeting_id,
                "assigned_to": assigned_user,
                "title": item.task,
                "description": f"Priority: {item.priority}",
                "due_date": item.due_date,
                "status": "pending"
            }
            
            task_id = user_db.create_task(task_data)
            if task_id:
                created_tasks.append({
                    "id": task_id,
                    "title": item.task,
                    "assigned_to": assigned_user,
                    "due_date": item.due_date
                })
        
        return AnalysisResponse(
            success=True,
            meeting_id=meeting_id,
            summary=meeting_summary.executive_summary,
            key_points=meeting_summary.key_decisions,
            action_items=[
                {
                    "task": item.task,
                    "owner": item.owner,
                    "due_date": item.due_date,
                    "priority": item.priority,
                    "status": item.status
                } for item in meeting_summary.action_items
            ],
            next_steps=meeting_summary.next_steps
        )
        
    except Exception as e:
        print(f"Error analyzing transcript: {e}")
        return AnalysisResponse(
            success=False,
            error=f"Error processing transcript: {str(e)}"
        )

# Keep the old endpoint for backward compatibility (but require authentication)
@app.post("/analyze_ajax")
async def analyze_meeting_ajax(
    request: Request, 
    transcript: str = Form(...),
    current_user: dict = Depends(get_admin_user)
):
    """AJAX endpoint to analyze meeting transcript and return JSON results (Admin only)."""
   
    # Check if API is available
    if analyzer is None:
        return JSONResponse(
            status_code=503,
            content={"error": f"OpenAI API is not available: {API_ERROR}"}
        )
   
    try:
        # Create meeting data object with only transcript (metadata will be extracted)
        meeting_data = MeetingData(transcript=transcript)
        
        print("🔍 Processing transcript length:", len(transcript))
        
        # Analyze the meeting (this will auto-extract metadata)
        meeting_summary = analyzer.analyze_transcript(meeting_data)
        
        print("✅ Meeting analysis complete")
        print("👥 Extracted participants data:", getattr(meeting_data, 'participants_data', []))
        
        # Generate personalized emails for all participants
        personalized_emails = analyzer.generate_personalized_emails(meeting_summary, meeting_data)
        
        print("📧 Generated emails for participants:", list(personalized_emails.keys()))
        
        # Save meeting to database
        meeting_id = user_db.create_meeting({
            'title': meeting_data.title or 'Meeting Analysis',
            'description': f"Meeting from {meeting_data.date}",
            'transcript': transcript,
            'analysis_result': json.dumps({
                "executive_summary": meeting_summary.executive_summary,
                "key_decisions": meeting_summary.key_decisions,
                "action_items": [
                    {
                        "task": item.task,
                        "owner": item.owner,
                        "due_date": item.due_date,
                        "priority": item.priority,
                        "status": item.status
                    } for item in meeting_summary.action_items
                ],
                "next_steps": meeting_summary.next_steps,
                "risks_concerns": meeting_summary.risks_concerns
            })
        }, current_user["user_id"])
        
        # Create tasks from action items but DON'T assign to users yet
        # This will be done later when sending emails
        if meeting_id:
            for item in meeting_summary.action_items:
                task_id = user_db.create_task({
                    'meeting_id': meeting_id,
                    'assigned_to': None,  # No assignment during analysis
                    'title': item.task,
                    'description': f"Priority: {item.priority}, Owner: {item.owner or 'Unassigned'}",
                    'due_date': item.due_date,
                    'status': 'pending',
                    'intended_owner': item.owner  # Store intended owner for later assignment
                })
                print(f"📝 Created unassigned task {task_id}: '{item.task}' (intended for: {item.owner or 'Unassigned'})")
        
        # Prepare participant data for frontend (no user creation here)
        participants_data = getattr(meeting_data, 'participants_data', [])
        if not participants_data:
            print("⚠️ No participant data found - using meeting_data.participants")
            participants_data = [
                {"name": name, "role": "Participant", "email_preference": "team"}
                for name in (meeting_data.participants or [])
            ]
       
        # Return JSON response with meetingId
        return JSONResponse(content={
            "success": True,
            "meeting_id": meeting_id,  # Include meeting_id in response
            "meeting_data": {
                "title": meeting_data.title,
                "date": meeting_data.date,
                "duration": meeting_data.duration
            },
            "participants": participants_data,
            "meeting_summary": {
                "executive_summary": meeting_summary.executive_summary,
                "key_decisions": meeting_summary.key_decisions,
                "action_items": [
                    {
                        "task": item.task,
                        "owner": item.owner,
                        "due_date": item.due_date,
                        "priority": item.priority,
                        "status": item.status
                    } for item in meeting_summary.action_items
                ],
                "next_steps": meeting_summary.next_steps,
                "risks_concerns": meeting_summary.risks_concerns
            },
            "personalized_emails": personalized_emails
        })
       
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error processing transcript: {str(e)}"}
        )
 
@app.post("/send_email")
async def send_email(
    request: Request,
    recipient_email: str = Form(...),
    recipient_name: str = Form(...),
    email_subject: str = Form(...),
    email_content: str = Form(...),
    tracking_enabled: bool = Form(default=True),
    meeting_id: Optional[int] = Form(default=None),
    task_ids: Optional[str] = Form(default=None)  # Comma-separated task IDs
):
    """Send personalized email via SendGrid with tracking and link to tasks."""
   
    # Check if SendGrid is available
    if sg is None:
        return JSONResponse(
            status_code=503,
            content={"error": "SendGrid API is not configured. Please set SENDGRID_API_KEY in your environment variables."}
        )
   
    try:
        # Generate tracking ID
        tracking_id = str(uuid.uuid4())
       
        # Prepare email content with tracking if enabled
        final_content = email_content
        if tracking_enabled:
            # Add tracking pixel
            tracking_pixel = f'<img src="http://localhost:8000/track/open/{tracking_id}" width="1" height="1" style="display:none;" alt="">'
            final_content = email_content + tracking_pixel
       
        # Format email content with proper HTML
        # First, normalize all line endings and clean up the content
        formatted_content = final_content.replace('\r\n', '\n').replace('\r', '\n').strip()
        
        # Convert the content into clean paragraphs
        paragraphs = []
        current_paragraph = []
        
        for line in formatted_content.split('\n'):
            line = line.strip()
            if line:
                current_paragraph.append(line)
            elif current_paragraph:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
        
        if current_paragraph:
            paragraphs.append(' '.join(current_paragraph))
        
        # Format paragraphs with proper HTML
        formatted_sections = []
        for i, paragraph in enumerate(paragraphs):
            if i == 0 and paragraph.startswith('Subject:'):
                formatted_sections.append(f'<h2 style="margin: 0 0 1em 0; font-size: 1.2em;">{paragraph}</h2>')
            else:
                formatted_sections.append(f'<p style="margin: 0 0 1em 0;">{paragraph}</p>')
        
        # Join all sections and wrap in container div
        formatted_content = f'<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">{"\n".join(formatted_sections)}</div>'
        
        # Create email message
        message = Mail(
            from_email=(SENDER_EMAIL, SENDER_NAME),
            to_emails=recipient_email,
            subject=email_subject,
            html_content=formatted_content
        )
       
        # Configure tracking settings
        if tracking_enabled:
            message.tracking_settings = TrackingSettings()
            message.tracking_settings.click_tracking = ClickTracking(enable=True, enable_text=False)
            message.tracking_settings.open_tracking = OpenTracking(enable=True, substitution_tag=None)
       
        # Send email
        response = sg.send(message)
       
        # Store email tracking info in database
        email_data = {
            'tracking_id': tracking_id,
            'recipient_email': recipient_email,
            'recipient_name': recipient_name,
            'sender_email': SENDER_EMAIL,
            'sender_name': SENDER_NAME,
            'subject': email_subject,
            'content': final_content,
            'sent_at': datetime.now().isoformat(),
            'tracking_enabled': tracking_enabled,
            'sendgrid_message_id': response.headers.get('X-Message-Id', 'unknown'),
            'status': 'sent'
        }
       
        # Save to database
        db.save_email(email_data)
        
        # Create user with 'created' status if they don't exist
        user_id = user_db.create_user_from_email(recipient_email, recipient_name)
        print(f"� User created/found: {recipient_name} (ID: {user_id})")
        
        # Link user to meeting and tasks (simplified flow)
        if user_id and meeting_id:
            # Add user as participant to the meeting
            user_db.add_meeting_participant(meeting_id, user_id, 'participant')
            print(f"👥 Added user {user_id} as participant to meeting {meeting_id}")
            
            # Find and assign tasks intended for this user in this specific meeting
            unassigned_tasks = user_db.get_unassigned_tasks_by_intended_owner(meeting_id, recipient_name)
            
            # Also check for name variations (first name, last name) within the same meeting
            name_parts = recipient_name.lower().split()
            for name_part in name_parts:
                if len(name_part) > 2:  # Only check meaningful name parts
                    additional_tasks = user_db.get_unassigned_tasks_by_intended_owner(meeting_id, name_part)
                    # Add tasks that aren't already in the list
                    for task in additional_tasks:
                        if not any(t['id'] == task['id'] for t in unassigned_tasks):
                            unassigned_tasks.append(task)
            
            # Assign found tasks to the user
            for task in unassigned_tasks:
                user_db.assign_task_to_user(task['id'], user_id)
                print(f"📋 Assigned task '{task['title']}' (ID: {task['id']}) to {recipient_name} based on intended owner: {task['intended_owner']}")
            
            if unassigned_tasks:
                print(f"✅ Successfully assigned {len(unassigned_tasks)} tasks to {recipient_name}")
            else:
                print(f"ℹ️ No matching unassigned tasks found for {recipient_name} in meeting {meeting_id}")
        elif user_id:
            print(f"⚠️ No meeting_id provided. User {recipient_name} created but no tasks assigned.")
        
        # Store additional metadata for tracking
        email_data.update({
            'meeting_id': meeting_id,
            'task_ids': task_ids,
            'user_id': user_id
        })
       
        # Keep in memory for backward compatibility
        sent_emails[tracking_id] = {
            'recipient_email': recipient_email,
            'recipient_name': recipient_name,
            'subject': email_subject,
            'sent_at': datetime.now().isoformat(),
            'tracking_enabled': tracking_enabled,
            'sendgrid_message_id': response.headers.get('X-Message-Id', 'unknown'),
            'status': 'sent',
            'opened': False,
            'click_count': 0
        }
       
        return JSONResponse(content={
            "success": True,
            "message": f"Email sent successfully to {recipient_name} ({recipient_email})",
            "tracking_id": tracking_id,
            "sendgrid_status": response.status_code
        })
       
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to send email: {str(e)}"}
        )
 
@app.get("/track/open/{tracking_id}")
async def track_email_open(tracking_id: str, request: Request):
    """Track email opens via tracking pixel."""
    # Record open event in database
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
   
    db.record_event(
        tracking_id=tracking_id,
        event_type="open",
        ip_address=client_ip,
        user_agent=user_agent
    )
   
    # Keep backward compatibility
    if tracking_id in sent_emails:
        sent_emails[tracking_id]['opened'] = True
        sent_emails[tracking_id]['opened_at'] = datetime.now().isoformat()
   
    # Return 1x1 transparent pixel
    from fastapi.responses import Response
    pixel_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
    return Response(content=pixel_data, media_type="image/png")
 
@app.get("/email_status/{tracking_id}")
async def get_email_status(tracking_id: str):
    """Get email delivery and tracking status."""
    # Try to get from database first
    email_data = db.get_email_with_events(tracking_id)
    if email_data:
        return JSONResponse(content=email_data)
   
    # Fallback to in-memory storage
    if tracking_id in sent_emails:
        return JSONResponse(content=sent_emails[tracking_id])
    else:
        return JSONResponse(
            status_code=404,
            content={"error": "Tracking ID not found"}
        )
 
@app.post("/analyze", response_class=HTMLResponse)
async def analyze_meeting(
    request: Request,
    transcript: str = Form(...),
    email_type: str = Form(...),
    recipients: str = Form(...)
):
    """Analyze meeting transcript and generate email."""
   
    # Check if API is available
    if analyzer is None:
        raise HTTPException(
            status_code=503,
            detail=f"OpenAI API is not available: {API_ERROR}"
        )
   
    try:
        # Create meeting data object with only transcript (metadata will be extracted)
        meeting_data = MeetingData(transcript=transcript)
       
        # Analyze the meeting (this will auto-extract metadata)
        meeting_summary = analyzer.analyze_transcript(meeting_data)
       
        # Generate email based on selected type
        email_type_enum = EmailType(email_type)
        recipient_list = [r.strip() for r in recipients.split(",")]
        generated_email = analyzer.generate_stakeholder_email(
            meeting_summary, email_type_enum, recipient_list
        )
       
        # Return JSON results for API compatibility
        return JSONResponse(content={
            "success": True,
            "meeting_data": {
                "title": meeting_data.title,
                "date": meeting_data.date,
                "participants": meeting_data.participants,
                "duration": meeting_data.duration
            },
            "meeting_summary": {
                "executive_summary": meeting_summary.executive_summary,
                "key_decisions": meeting_summary.key_decisions,
                "action_items": meeting_summary.action_items,
                "next_steps": meeting_summary.next_steps,
                "risks_concerns": meeting_summary.risks_concerns
            },
            "generated_email": {
                "subject": generated_email.subject,
                "content": generated_email.content,
                "type": email_type,
                "recipients": recipient_list
            }
        })
       
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing transcript: {str(e)}")
 
# Admin Routes for Email Tracking (React handles the UI, these are API endpoints)
@app.get("/admin")
async def admin_redirect():
    """Redirect admin route to React app."""
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redirecting to Admin...</title>
        <meta http-equiv="refresh" content="0; url=/#/admin">
    </head>
    <body>
        <p>Redirecting to admin dashboard...</p>
        <p>If not redirected, <a href="/#/admin">click here</a></p>
    </body>
    </html>
    """)
 
@app.get("/admin/api/emails")
async def get_emails_api(
    page: int = 1,
    search: str = "",
    status: str = "",
    date: str = ""
):
    """API endpoint for getting emails with filters."""
    limit = 20
    offset = (page - 1) * limit
   
    # Get emails from database
    emails = db.get_all_emails(limit=limit, offset=offset)
   
    # Apply filters
    if search:
        emails = [e for e in emails if
                 search.lower() in e['recipient_email'].lower() or
                 search.lower() in e['recipient_name'].lower()]
   
    if status == "opened":
        emails = [e for e in emails if e['opened']]
    elif status == "sent":
        emails = [e for e in emails if not e['opened']]
    elif status == "clicked":
        emails = [e for e in emails if e['clicked']]
   
    # Date filtering can be added based on requirements
   
    stats = db.get_email_stats()
   
    return JSONResponse(content={
        "emails": emails,
        "stats": stats,
        "page": page,
        "total_pages": max(1, (len(emails) + limit - 1) // limit)
    })
 
@app.get("/admin/api/email/{tracking_id}")
async def get_email_details_api(tracking_id: str):
    """API endpoint for getting detailed email information."""
    email = db.get_email_with_events(tracking_id)
    if email:
        return JSONResponse(content=email)
    else:
        return JSONResponse(
            status_code=404,
            content={"error": "Email not found"}
        )
 
@app.delete("/admin/api/cleanup/{days}")
async def cleanup_old_emails(days: int):
    """API endpoint for cleaning up old emails."""
    if days < 7:  # Safety check
        return JSONResponse(
            status_code=400,
            content={"error": "Cannot delete emails newer than 7 days"}
        )
   
    deleted_count = db.delete_old_emails(days)
    return JSONResponse(content={
        "message": f"Deleted {deleted_count} emails older than {days} days"
    })

# User dashboard endpoints
@app.get("/api/user/meetings")
async def get_user_meetings(current_user: dict = Depends(get_current_user)):
    """Get meetings for the current user."""
    meetings = user_db.get_user_meetings(current_user["user_id"])
    return {"meetings": meetings}

@app.get("/api/user/tasks")
async def get_user_tasks(current_user: dict = Depends(get_current_user)):
    """Get tasks assigned to the current user with meeting information."""
    tasks = user_db.get_user_assigned_tasks(current_user["user_id"])
    return {"tasks": tasks}

@app.put("/api/user/tasks/{task_id}")
async def update_task_status(
    task_id: int,
    task_update: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update task status (only for assigned user)."""
    success = user_db.update_task_status(task_id, task_update.status, current_user["user_id"])
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Task not found or you don't have permission to update it"
        )
    return {"message": "Task status updated successfully"}

@app.get("/api/user/meetings/{meeting_id}")
async def get_user_meeting_details(
    meeting_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get meeting details for a user (only if they're a participant)."""
    # Check if user is a participant in this meeting
    user_meetings = user_db.get_user_meetings(current_user["user_id"])
    meeting_ids = [m["id"] for m in user_meetings]
    
    if meeting_id not in meeting_ids:
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this meeting"
        )
    
    # Get detailed meeting information
    meeting = user_db.get_meeting_by_id(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get user tasks for this meeting
    user_tasks = user_db.get_user_tasks(current_user["user_id"])
    meeting_tasks = [task for task in user_tasks if task.get("meeting_id") == meeting_id]
    
    # Add tasks to meeting data
    meeting["tasks"] = meeting_tasks
    
    # Add user role from the participants list
    user_participant = next((p for p in meeting['participants'] if p['id'] == current_user["user_id"]), None)
    if user_participant:
        meeting['user_role'] = user_participant['role']
    else:
        # If not found in participants, check if user is the creator
        if meeting.get('created_by') == current_user["user_id"]:
            meeting['user_role'] = 'organizer'
        else:
            meeting['user_role'] = 'participant'
    
    return meeting

# Admin endpoints
@app.get("/api/admin/users")
async def get_all_users(current_user: dict = Depends(get_admin_user)):
    """Get all users (Admin only)."""
    users = user_db.get_all_users()
    return {"users": users}

@app.get("/api/admin/meetings")
async def get_all_meetings(current_user: dict = Depends(get_admin_user)):
    """Get all meetings (Admin only)."""
    meetings = user_db.get_all_meetings()
    return {"meetings": meetings}

@app.get("/api/admin/meetings/{meeting_id}")
async def get_admin_meeting_details(meeting_id: int, current_user: dict = Depends(get_admin_user)):
    """Get meeting details with participants (Admin only)."""
    meeting = user_db.get_meeting_by_id(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"meeting": meeting}

@app.put("/api/admin/meetings/{meeting_id}")
async def update_meeting(
    meeting_id: int,
    meeting_data: dict,
    current_user: dict = Depends(get_admin_user)
):
    """Update meeting (Admin only)."""
    success = user_db.update_meeting(meeting_id, meeting_data)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found or update failed")
    return {"message": "Meeting updated successfully"}

@app.delete("/api/admin/meetings/{meeting_id}")
async def delete_meeting(meeting_id: int, current_user: dict = Depends(get_admin_user)):
    """Delete meeting (Admin only)."""
    success = user_db.delete_meeting(meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found or delete failed")
    return {"message": "Meeting deleted successfully"}

@app.put("/api/admin/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: dict,
    current_user: dict = Depends(get_admin_user)
):
    """Update user (Admin only)."""
    success = user_db.update_user(user_id, user_data)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or update failed")
    return {"message": "User updated successfully"}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_admin_user)):
    """Delete user (Admin only)."""
    success = user_db.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found or delete failed")
    return {"message": "User deleted successfully"}

@app.post("/api/admin/meetings/{meeting_id}/participants")
async def add_meeting_participant(
    meeting_id: int,
    participant_data: dict,
    current_user: dict = Depends(get_admin_user)
):
    """Add participant to meeting (Admin only)."""
    success = user_db.add_meeting_participant(
        meeting_id, 
        participant_data.get("user_id"), 
        participant_data.get("role", "participant")
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add participant")
    return {"message": "Participant added successfully"}

@app.delete("/api/admin/meetings/{meeting_id}/participants/{user_id}")
async def remove_meeting_participant(
    meeting_id: int,
    user_id: int,
    current_user: dict = Depends(get_admin_user)
):
    """Remove participant from meeting (Admin only)."""
    success = user_db.remove_meeting_participant(meeting_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Participant not found or remove failed")
    return {"message": "Participant removed successfully"}

@app.post("/api/admin/meetings")
async def create_meeting(
    meeting_data: MeetingCreate,
    current_user: dict = Depends(get_admin_user)
):
    """Create a new meeting (Admin only)."""
    meeting_record = {
        "title": meeting_data.title,
        "description": meeting_data.description,
        "transcript": meeting_data.transcript
    }
    
    meeting_id = user_db.create_meeting(meeting_record, current_user["user_id"])
    if not meeting_id:
        raise HTTPException(
            status_code=500,
            detail="Failed to create meeting"
        )
    
    # Add participants
    for participant_id in meeting_data.participants:
        user_db.add_meeting_participant(meeting_id, participant_id, "participant")
    
    return {"meeting_id": meeting_id, "message": "Meeting created successfully"}

# Project Management endpoints (Admin only)
@app.get("/api/admin/projects")
async def get_all_projects(current_user: dict = Depends(get_admin_user)):
    """Get all projects (Admin only)."""
    projects = user_db.get_all_projects()
    return {"projects": projects}

@app.post("/api/admin/projects")
async def create_project(
    project_data: dict,
    current_user: dict = Depends(get_admin_user)
):
    """Create a new project (Admin only)."""
    project_data["created_by"] = current_user["user_id"]
    project_id = user_db.create_project(project_data)
    if not project_id:
        raise HTTPException(
            status_code=500,
            detail="Failed to create project"
        )
    return {"project_id": project_id, "message": "Project created successfully"}

@app.get("/api/admin/projects/{project_id}")
async def get_project_details(
    project_id: int, 
    current_user: dict = Depends(get_admin_user)
):
    """Get project details with linked meetings (Admin only)."""
    project = user_db.get_project_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get linked meetings
    meetings = user_db.get_project_meetings(project_id)
    project["meetings"] = meetings
    
    return {"project": project}

@app.put("/api/admin/projects/{project_id}")
async def update_project(
    project_id: int,
    project_data: dict,
    current_user: dict = Depends(get_admin_user)
):
    """Update project (Admin only)."""
    success = user_db.update_project(project_id, project_data)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to update project"
        )
    return {"message": "Project updated successfully"}

@app.delete("/api/admin/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: dict = Depends(get_admin_user)
):
    """Delete project (Admin only)."""
    success = user_db.delete_project(project_id)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete project"
        )
    return {"message": "Project deleted successfully"}

@app.post("/api/admin/projects/{project_id}/meetings/{meeting_id}")
async def link_meeting_to_project(
    project_id: int,
    meeting_id: int,
    current_user: dict = Depends(get_admin_user)
):
    """Link a meeting to a project (Admin only)."""
    success = user_db.link_meeting_to_project(project_id, meeting_id)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to link meeting to project"
        )
    return {"message": "Meeting linked to project successfully"}

@app.delete("/api/admin/projects/{project_id}/meetings/{meeting_id}")
async def unlink_meeting_from_project(
    project_id: int,
    meeting_id: int,
    current_user: dict = Depends(get_admin_user)
):
    """Unlink a meeting from a project (Admin only)."""
    success = user_db.unlink_meeting_from_project(project_id, meeting_id)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to unlink meeting from project"
        )
    return {"message": "Meeting unlinked from project successfully"}

@app.get("/api/admin/projects/{project_id}/unlinked-meetings")
async def get_unlinked_meetings(
    project_id: int,
    current_user: dict = Depends(get_admin_user)
):
    """Get meetings not linked to this project (Admin only)."""
    meetings = user_db.get_unlinked_meetings(project_id)
    return {"meetings": meetings}

@app.get("/api/admin/meetings/{meeting_id}/projects")
async def get_meeting_projects(
    meeting_id: int,
    current_user: dict = Depends(get_admin_user)
):
    """Get projects linked to a meeting (Admin only)."""
    projects = user_db.get_meeting_projects(meeting_id)
    return {"projects": projects}
 
if __name__ == "__main__":    
    print("\n🚀 Starting Meeting Transcript Analyzer")
    if API_ERROR:
        print(f"⚠️  API Warning: {API_ERROR}")
        print("🌐 Server will start but analysis will be unavailable")
        print("🔧 Visit the web interface to see the error details")
    else:
        print("✅ OpenAI API ready")
   
    print("🌐 Open your browser to: http://localhost:8000")
    print("📝 Web interface loading...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
 
 