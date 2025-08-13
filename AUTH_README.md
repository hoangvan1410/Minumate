# Minumate - Meeting Transcript Analyzer with JWT Authentication

A comprehensive FastAPI-based application that analyzes meeting transcripts using AI and provides role-based access control with JWT authentication.

## Features

### 🔐 Authentication & Authorization
- **JWT-based Authentication**: Secure token-based authentication system
- **Role-based Access Control**: Admin and User roles with different permissions
- **User Registration**: New users can register with email validation
- **Secure Password Hashing**: Uses bcrypt for password security

### 👥 User Roles

#### Admin Users
- Can analyze meeting transcripts using OpenAI API
- Access to all current functionality (email tracking, admin dashboard)
- Can view all meetings and users
- Can manage system-wide settings

#### Regular Users  
- Can view meetings they participated in
- Can see tasks assigned to them
- Can update their task status (pending → in progress → completed)
- Personal dashboard with meeting and task overview

### 📊 Meeting & Task Management
- **Meeting Storage**: Analyzed meetings are saved to database
- **Participant Management**: Track who attended meetings
- **Task Extraction**: Automatically extract action items from meeting analysis
- **Task Assignment**: Assign tasks to specific users
- **Status Tracking**: Track task progress through different states

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- OpenAI API Key (for meeting analysis)
- SendGrid API Key (optional, for email features)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables** (create `.env` file):
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   SENDGRID_API_KEY=your_sendgrid_key_here
   JWT_SECRET_KEY=your_super_secret_jwt_key_here
   SENDER_EMAIL=noreply@yourdomain.com
   SENDER_NAME=Meeting Analyzer Bot
   ```

4. **Start the backend server**:
   ```bash
   python web_app.py
   ```

   The server will start on `http://localhost:8002`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

   The React app will start on `http://localhost:3000`

## Default Admin Account

When the system starts for the first time, a default admin account is created:

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin

**⚠️ Important**: Change the default admin password immediately after first login!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Admin Endpoints (Admin Only)
- `POST /api/analyze` - Analyze meeting transcript
- `GET /api/admin/users` - Get all users
- `GET /api/admin/meetings` - Get all meetings
- `POST /api/admin/meetings` - Create new meeting

### User Endpoints
- `GET /api/user/meetings` - Get user's meetings
- `GET /api/user/tasks` - Get user's tasks
- `PUT /api/user/tasks/{task_id}` - Update task status

## Database Schema

The application uses SQLite with the following main tables:

- **users**: User accounts and authentication
- **meetings**: Meeting records and analysis results
- **meeting_participants**: Links users to meetings
- **tasks**: Action items extracted from meetings
- **emails**: Email tracking (existing functionality)
- **email_events**: Email event tracking

## Frontend Structure

```
frontend/src/
├── components/
│   ├── AuthPage.js          # Login/Register form
│   ├── UserDashboard.js     # User personal dashboard
│   ├── Navbar.js           # Navigation with auth state
│   └── ...existing components
├── contexts/
│   ├── AuthContext.js       # Authentication state management
│   └── ApiContext.js        # API calls with auth headers
├── pages/
│   ├── Home.js             # Meeting analysis (Admin only)
│   └── Admin.js            # Admin dashboard (Admin only)
└── App.js                  # Protected routes and role-based access
```

## Usage Examples

### User Workflow
1. Register/Login to the system
2. View personal dashboard with assigned meetings and tasks
3. Update task status as work progresses
4. View meeting details they participated in

### Admin Workflow
1. Login with admin credentials
2. Analyze meeting transcripts using AI
3. System automatically extracts participants and action items
4. Tasks are created and can be assigned to users
5. Monitor system-wide activity through admin dashboard

## Security Features

- **JWT Tokens**: Short-lived access tokens (30 minutes)
- **Password Hashing**: Bcrypt with salt
- **Role-based Authorization**: Endpoint protection based on user roles
- **Protected Routes**: Frontend routes protected by authentication state
- **CORS Configuration**: Properly configured for development and production

## Development Notes

### Environment Variables
- `JWT_SECRET_KEY`: Used for signing JWT tokens (change in production!)
- `OPENAI_API_KEY`: Required for meeting transcript analysis
- `SENDGRID_API_KEY`: Optional, for email functionality

### Database Initialization
- Databases are automatically created on first run
- Default admin user is created if no users exist
- Database files: `email_tracking.db` (main database)

### Production Considerations
- Change default JWT secret key
- Use a production database (PostgreSQL recommended)
- Set up proper CORS origins
- Configure reverse proxy (nginx) for production deployment
- Set up SSL/TLS certificates

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all dependencies are installed
   ```bash
   pip install -r requirements.txt
   ```

2. **Database Errors**: Delete database files to reset:
   ```bash
   rm *.db
   ```

3. **Authentication Issues**: Check JWT secret key configuration

4. **OpenAI API Errors**: Verify API key and quota

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the existing code style
4. Test authentication flows thoroughly
5. Submit a pull request

## License

[Add your license information here]

---

## Changelog

### v2.0 - Authentication Update
- Added JWT-based authentication system
- Implemented role-based access control (Admin/User)
- Created user dashboard for task management
- Added meeting and task tracking
- Separated UI based on user roles
- Enhanced security with password hashing
- Protected all API endpoints with authentication
