# Minumate Backend - FastAPI Server

This directory contains the backend server implementation for the Minumate meeting management platform.

## 🏗️ Architecture Overview

The backend is built with FastAPI and provides a comprehensive REST API for meeting analysis, user management, project organization, and email tracking.

## 📁 Directory Structure

```
backend/
├── web_app.py                    # Main FastAPI application server
├── meeting_analyzer.py           # AI-powered meeting analysis engine
├── auth.py                      # JWT authentication & user management
├── user_db.py                   # Database operations & models
├── models.py                    # Pydantic data models & validation
├── database.py                  # Email tracking database operations
├── requirements.txt             # Python dependencies
├── prompts/                     # AI prompts and templates
│   ├── __init__.py
│   ├── analysis_prompts.py      # Meeting analysis prompts
│   ├── email_prompts.py         # Email generation prompts
│   ├── system_prompts.py        # System-level prompts
│   └── utils.py                 # Prompt utilities
├── functions/                   # Utility functions
│   └── transcript_chunker.py    # Text processing utilities
└── static/                      # Static assets
```

## 🚀 Quick Start

### 1. Environment Setup
Create `.env` file with required configuration:
```bash
# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Email Configuration  
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDER_EMAIL=noreply@yourdomain.com
SENDER_NAME=Minumate Bot

# Security Configuration
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 2. Installation
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Database Initialization
```bash
# The database will be automatically initialized on first run
# SQLite databases will be created:
# - email_tracking.db (user data, meetings, projects, tasks)
# - tracking.db (legacy email tracking)
```

### 4. Run Development Server
```bash
# Start with auto-reload for development
uvicorn web_app:app --reload --port 8000

# Or run directly
python web_app.py
```

### 5. Access API Documentation
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## 🔧 Core Components

### FastAPI Application (`web_app.py`)
- **Main Application**: Central FastAPI app with all endpoints
- **CORS Configuration**: Cross-origin support for React frontend
- **Static File Serving**: Serves React build files in production
- **Error Handling**: Comprehensive exception handling
- **Security Middleware**: JWT authentication and authorization

### AI Analysis Engine (`meeting_analyzer.py`)
- **OpenAI Integration**: GPT-4 powered meeting analysis
- **Advanced Prompting**: Few-shot and chain-of-thought techniques
- **Structured Output**: JSON-formatted analysis results
- **Error Recovery**: Graceful handling of API failures
- **Temperature Control**: Balanced creativity and consistency

### Authentication System (`auth.py`)
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: Bcrypt with salt for security
- **Role-Based Access**: Admin, Manager, User permissions
- **Token Management**: Automatic expiration and refresh
- **Default Admin**: Auto-creates admin user on first run

### Database Operations (`user_db.py`)
- **SQLite Integration**: Lightweight, file-based database
- **User Management**: Registration, authentication, profiles
- **Meeting Management**: Storage and retrieval of meeting data
- **Project Management**: Project-meeting associations
- **Task Management**: Action item tracking and updates
- **Analytics Support**: Data aggregation for insights

### Email System (`database.py`)
- **SendGrid Integration**: Professional email delivery
- **Tracking Database**: Delivery and engagement analytics
- **Event Logging**: Opens, clicks, delivery confirmations
- **Template Management**: Customizable email templates
- **Batch Processing**: Efficient bulk email operations

### Data Models (`models.py`)
- **Pydantic Models**: Type-safe data validation
- **Request/Response Models**: API contract definitions
- **Database Schemas**: SQLite table structures
- **Validation Rules**: Input sanitization and checks
- **Serialization**: JSON encoding/decoding

## 🔐 API Endpoints

### Authentication & Users
```
POST   /api/auth/register        # User registration
POST   /api/auth/login           # User login
GET    /api/auth/me              # Get current user info
```

### Meeting Analysis
```
POST   /api/analyze              # Analyze meeting transcript
POST   /analyze_ajax             # Legacy AJAX endpoint
POST   /send_email               # Send generated emails
GET    /email_status/{id}        # Check email delivery status
```

### User Dashboard
```
GET    /api/user/meetings        # Get user's meetings
GET    /api/user/tasks           # Get user's tasks
PUT    /api/user/tasks/{id}      # Update task status
GET    /api/user/meetings/{id}   # Get detailed meeting info
```

### Admin Management
```
GET    /api/admin/users          # Manage all users
GET    /api/admin/meetings       # View all meetings
GET    /api/admin/meetings/{id}  # Get meeting details
PUT    /api/admin/meetings/{id}  # Update meeting info
DELETE /api/admin/meetings/{id}  # Delete meeting
```

### Project Management
```
GET    /api/admin/projects                           # Get all projects
POST   /api/admin/projects                           # Create project
GET    /api/admin/projects/{id}                      # Get project details
PUT    /api/admin/projects/{id}                      # Update project
DELETE /api/admin/projects/{id}                      # Delete project
POST   /api/admin/projects/{pid}/meetings/{mid}      # Link meeting to project
DELETE /api/admin/projects/{pid}/meetings/{mid}      # Unlink meeting
GET    /api/admin/projects/{id}/unlinked-meetings    # Get unlinked meetings
GET    /api/admin/meetings/{id}/projects             # Get meeting projects
```

### Email Analytics
```
GET    /admin/api/emails         # Email tracking dashboard
GET    /admin/api/email/{id}     # Detailed email info
DELETE /admin/api/cleanup/{days} # Cleanup old emails
GET    /track/open/{id}          # Email open tracking pixel
```

## 🗃️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'registered',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Meetings Table
```sql
CREATE TABLE meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    transcript TEXT,
    analysis_result TEXT,  -- JSON formatted analysis
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
);
```

### Projects Table
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL,
    assigned_to INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    status TEXT DEFAULT 'pending',
    intended_owner TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings (id),
    FOREIGN KEY (assigned_to) REFERENCES users (id)
);
```

## 🔧 Configuration

### Environment Variables
```bash
# Required Configuration
OPENAI_API_KEY=sk-...              # OpenAI API key
SENDGRID_API_KEY=SG...             # SendGrid API key
JWT_SECRET_KEY=your-secret-key      # JWT signing secret

# Optional Configuration
OPENAI_BASE_URL=https://api.openai.com/v1  # Custom API endpoint
SENDER_EMAIL=noreply@yourdomain.com         # Email sender address
SENDER_NAME=Minumate Bot                    # Email sender name
JWT_ALGORITHM=HS256                         # JWT algorithm
ACCESS_TOKEN_EXPIRE_MINUTES=30              # Token expiration
```

### AI Model Configuration
```python
# In meeting_analyzer.py
MODEL_CONFIG = {
    "model": "gpt-4o",           # Primary model
    "temperature": 0.3,          # Creativity vs consistency
    "max_tokens": 4000,          # Response length limit
    "timeout": 30,               # Request timeout
}
```

## 🧪 Testing

### Run Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

### Test Database
```bash
# Tests use separate test database
# Automatically created and cleaned up
export TEST_DATABASE_URL="sqlite:///test.db"
```

## 📊 Monitoring & Logging

### Application Logging
```python
import logging

# Configure logging level
logging.basicConfig(level=logging.INFO)

# Log locations
# - Console output during development
# - File logging in production
# - Error tracking with Sentry (optional)
```

### Performance Monitoring
- **Request Timing**: Built-in FastAPI metrics
- **Database Queries**: SQLite query performance
- **API Rate Limiting**: Request throttling
- **Memory Usage**: Application resource monitoring

### Health Checks
```bash
# Application health endpoint
GET /health

# Database connectivity check
GET /health/db

# External service checks
GET /health/openai
GET /health/sendgrid
```

## 🚀 Production Deployment

### Docker Deployment
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "web_app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Setup
```bash
# Production environment variables
export ENVIRONMENT=production
export LOG_LEVEL=INFO
export DATABASE_URL=postgresql://...  # For production PostgreSQL

# Security hardening
export SECURE_COOKIES=true
export HTTPS_ONLY=true
export ALLOWED_HOSTS=yourdomain.com
```

### Performance Optimization
- **Database Connection Pooling**: For PostgreSQL in production
- **Redis Caching**: Session and frequently accessed data
- **CDN Integration**: Static file delivery
- **Load Balancing**: Multiple server instances

## 🔒 Security Considerations

### Authentication Security
- JWT tokens with short expiration
- Secure password hashing with bcrypt
- Role-based access control
- CORS configuration for frontend

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Secure file upload handling

### API Security
- Rate limiting to prevent abuse
- Request size limits
- Authentication required for sensitive endpoints
- Comprehensive error handling without information leakage

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check database file permissions
ls -la *.db

# Reinitialize database
rm email_tracking.db
python web_app.py  # Will recreate on startup
```

**OpenAI API Errors**
```bash
# Verify API key
export OPENAI_API_KEY=your-key
python -c "import openai; print(openai.Model.list())"

# Check quota and billing
# Visit OpenAI dashboard
```

**SendGrid Email Issues**
```bash
# Test SendGrid configuration
python -c "
import sendgrid
sg = sendgrid.SendGridAPIClient(api_key='your-key')
print(sg.client.api_keys.get())
"
```

**Port Conflicts**
```bash
# Check what's using port 8000
netstat -tulpn | grep :8000

# Use different port
uvicorn web_app:app --port 8001
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python web_app.py

# FastAPI debug mode
uvicorn web_app:app --reload --log-level debug
```

## 📝 Development Guidelines

### Code Style
- Follow PEP 8 guidelines
- Use type hints for all functions
- Document all public methods
- Include docstrings for complex logic

### Database Operations
- Use parameterized queries
- Handle exceptions gracefully
- Close connections properly
- Use transactions for multi-step operations

### API Design
- RESTful endpoint design
- Consistent response formats
- Proper HTTP status codes
- Comprehensive error messages

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create virtual environment: `python -m venv venv`
3. Install dependencies: `pip install -r requirements.txt`
4. Create feature branch: `git checkout -b feature/new-feature`
5. Make changes and test
6. Submit pull request

### Code Review Process
- Ensure all tests pass
- Follow coding standards
- Update documentation
- Add tests for new features

---

**Backend Version**: 2.0.0  
**FastAPI Version**: 0.104+  
**Python Version**: 3.8+  
**Last Updated**: August 16, 2025
