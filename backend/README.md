# Meeting Analyzer Backend

This directory contains the backend server implementation for the Meeting Analyzer application.

## Structure

- `web_app.py` - FastAPI web application
- `meeting_analyzer.py` - Core meeting analysis functionality
- `database.py` - Database operations for email tracking
- `prompts/` - AI prompts and templates
- `static/` - Static files for web interface
- `requirements.txt` - Python dependencies

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables (copy `.env.example` to `.env` and fill in values)

4. Run the server:
```bash
uvicorn web_app:app --reload
```

The server will be available at http://localhost:8000
