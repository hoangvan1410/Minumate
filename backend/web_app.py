"""FastAPI web interface for meeting transcript analysis and email generation."""

from fastapi import FastAPI, Request, Form, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
import json
import uuid
from datetime import datetime
import sendgrid
from sendgrid.helpers.mail import Mail, TrackingSettings, ClickTracking, OpenTracking
 
# Load environment variables from .env file
load_dotenv()
 
from meeting_analyzer import MeetingTranscriptAnalyzer, MeetingData, EmailType
from database import EmailTrackingDB
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
db = EmailTrackingDB()
print("✅ SQLite database initialized successfully")
 
# Store sent emails for tracking (keeping for backward compatibility)
sent_emails = {}
 
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
 
@app.post("/analyze_ajax")
async def analyze_meeting_ajax(request: Request, transcript: str = Form(...)):
    """AJAX endpoint to analyze meeting transcript and return JSON results."""
   
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
        
        # Prepare participant data for frontend
        participants_data = getattr(meeting_data, 'participants_data', [])
        if not participants_data:
            print("⚠️ No participant data found - using meeting_data.participants")
            participants_data = [
                {"name": name, "role": "Participant", "email_preference": "team"}
                for name in (meeting_data.participants or [])
            ]
       
        # Return JSON response
        return JSONResponse(content={
            "success": True,
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
    tracking_enabled: bool = Form(default=True)
):
    """Send personalized email via SendGrid with tracking."""
   
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
            tracking_pixel = f'<img src="http://localhost:8002/track/open/{tracking_id}" width="1" height="1" style="display:none;" alt="">'
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
 
if __name__ == "__main__":    
    print("\n🚀 Starting Meeting Transcript Analyzer")
    if API_ERROR:
        print(f"⚠️  API Warning: {API_ERROR}")
        print("🌐 Server will start but analysis will be unavailable")
        print("🔧 Visit the web interface to see the error details")
    else:
        print("✅ OpenAI API ready")
   
    print("🌐 Open your browser to: http://localhost:8002")
    print("📝 Web interface loading...")
    uvicorn.run(app, host="0.0.0.0", port=8002)
 
 