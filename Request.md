# Email Read Tracking Backend Service

A FastAPI-based backend service that tracks email read status by recording when recipients open emails through a tracking endpoint.

## Features

- 🎯 **Email Read Tracking**: 1x1 pixel tracking for email opens
- 👥 **User Management**: Create and manage users
- 📅 **Meeting Management**: Organize meetings with senders and recipients
- 📊 **Analytics**: Comprehensive read status analytics
- 🔄 **Status Management**: Track email lifecycle (CREATED → SENT → READ)
- 🚀 **Fast API**: High-performance async API with automatic documentation

## Quick Start

### Prerequisites

- Python 3.8+
- pip

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd workshop-2/backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python run.py
   ```

   Or using uvicorn directly:
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Access the API**:
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Database Schema

The service uses SQLite with four main tables:

- **meeting**: Store meeting information
- **user**: Store user details
- **sender**: Track who sent meeting emails
- **recipient**: Track email recipients and read status

## API Endpoints

### 🎯 Email Tracking
- `GET /track/email/{meetingId}/{userId}` - Track email read (returns 1x1 pixel)
- `GET /track/status/{meetingId}` - Get read status for meeting

### 👥 User Management
- `POST /users/` - Create user
- `GET /users/` - List users
- `GET /users/{userId}` - Get user
- `PUT /users/{userId}` - Update user
- `DELETE /users/{userId}` - Delete user

### 📅 Meeting Management
- `POST /meetings/` - Create meeting
- `GET /meetings/` - List meetings
- `GET /meetings/{meetingId}` - Get meeting
- `PUT /meetings/{meetingId}` - Update meeting
- `DELETE /meetings/{meetingId}` - Delete meeting

### 📨 Senders & Recipients
- `POST /senders/` - Add sender
- `POST /recipients/` - Add recipient
- `PUT /recipients/{meetingId}/{userId}` - Update recipient status
- `DELETE /senders/{meetingId}/{userId}` - Remove sender
- `DELETE /recipients/{meetingId}/{userId}` - Remove recipient

### 📊 Analytics
- `GET /analytics/meeting/{meetingId}` - Meeting analytics
- `GET /analytics/user/{userId}` - User analytics
- `GET /analytics/overview` - Overview statistics

## Usage Example

### 1. Create a User
```bash
curl -X POST "http://localhost:8000/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

### 2. Create a Meeting
```bash
curl -X POST "http://localhost:8000/meetings/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Standup",
    "contentLocation": "https://example.com/meeting-notes"
  }'
```

### 3. Add Recipient
```bash
curl -X POST "http://localhost:8000/recipients/" \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": 1,
    "userId": 1
  }'
```

### 4. Email Integration
Add this HTML to your email template:
```html
<img src="http://localhost:8000/track/email/1/1" width="1" height="1" style="display:none;" />
```

### 5. Check Analytics
```bash
curl "http://localhost:8000/analytics/meeting/1"
```

## Email Status Workflow

1. **EMAIL_CREATED**: Recipient added to meeting
2. **EMAIL_SENT**: Email sent to recipient (manual status update)
3. **EMAIL_READ**: Email opened by recipient (automatic via tracking)

## Testing

Run the test suite:
```bash
pytest tests/ -v
```

Run with coverage:
```bash
pytest tests/ --cov=app --cov-report=html
```

## Development

### Code Formatting
```bash
black .
isort .
```

### Type Checking
```bash
mypy app/
```

### Environment Variables

Create a `.env` file:
```env
DATABASE_URL=sqlite:///./database/email_tracking.db
SECRET_KEY=your-secret-key
DEBUG=True
CORS_ORIGINS=["http://localhost:3000"]
```

## Production Deployment

### Using Docker (Recommended)

1. **Create Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. **Build and run**:
```bash
docker build -t email-tracking-api .
docker run -p 8000:8000 email-tracking-api
```

### Using Gunicorn

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Security Considerations

- The tracking endpoint returns a 1x1 transparent pixel
- No-cache headers prevent image caching
- Input validation on all endpoints
- Rate limiting recommended for production
- HTTPS recommended for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.
