# Minumate Frontend - React Application

This directory contains the React frontend for the Minumate meeting management platform, providing a modern, responsive web interface for AI-powered meeting analysis and management.

## 🎨 Interface Overview

The frontend provides a comprehensive user experience with role-based interfaces, real-time updates, and intuitive navigation.

## 📁 Directory Structure

```
frontend/
├── package.json                 # Dependencies and build scripts
├── public/                      # Static assets
│   ├── index.html              # Main HTML template
│   └── manifest.json           # PWA manifest
└── src/
    ├── App.js                   # Main application router
    ├── index.js                 # React entry point
    ├── index.css                # Global styles
    ├── components/              # Reusable UI components
    │   ├── AuthPage.js          # Login/register interface
    │   ├── EmailComposer.js     # Email creation and editing
    │   ├── EmailGeneration.js   # Email generation interface
    │   ├── MeetingResults.js    # Meeting analysis display
    │   ├── Navbar.js            # Navigation component
    │   ├── TranscriptInput.js   # Meeting input interface
    │   ├── UserDashboard.js     # Personal dashboard
    │   └── UserDashboard.css    # Dashboard-specific styles
    ├── pages/                   # Main application pages
    │   ├── Admin.js             # Admin management portal
    │   └── Home.js              # Main analysis interface
    └── contexts/                # React context providers
        ├── ApiContext.js        # API calls and state management
        └── AuthContext.js       # Authentication state management
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+** with npm
- **Backend server** running on port 8000

### 1. Installation
```bash
cd frontend
npm install
```

### 2. Environment Configuration
The frontend automatically connects to:
- **Development**: http://localhost:8000 (backend)
- **Production**: Your deployed backend URL

### 3. Development Server
```bash
npm start
```
Opens http://localhost:3000 with hot-reload enabled

### 4. Production Build
```bash
npm run build
```
Creates optimized build in `build/` directory

## 🎯 Key Features

### 🔐 Authentication System
- **Login/Register Interface**: Secure user authentication
- **Role-Based Navigation**: Different interfaces for users and admins
- **Session Management**: Automatic token refresh and logout
- **Protected Routes**: Route guards based on authentication status

### 📊 User Dashboard
- **Meeting Overview**: Personal meeting history and participation
- **Task Management**: Interactive task status updates
- **Meeting Details Modal**: Comprehensive meeting analysis viewer
- **Real-Time Updates**: Live data synchronization
- **Analytics Widgets**: Personal productivity metrics

### 🏢 Admin Portal
- **User Management**: Complete user lifecycle management
- **Meeting Management**: System-wide meeting oversight
- **Project Management**: Project-meeting organization system
- **Email Analytics**: Comprehensive email tracking dashboard
- **System Statistics**: Real-time metrics and performance data

### 📧 Email System
- **Email Generation**: AI-powered stakeholder communications
- **Content Editing**: Rich text editor for email customization
- **Template Selection**: Multiple email types for different audiences
- **Delivery Tracking**: Real-time send status and analytics
- **Recipient Management**: Smart recipient suggestions

### 📈 Analytics Interface
- **Interactive Charts**: Chart.js powered visualizations
- **Real-Time Metrics**: Live data updates
- **Export Functionality**: Download reports and data
- **Filter Controls**: Advanced filtering and search
- **Responsive Design**: Mobile-optimized charts

## 🧩 Component Architecture

### Core Components

**AuthPage.js**
- User authentication interface
- Login and registration forms
- Password validation
- Error handling and feedback

**UserDashboard.js**
- Personal meeting and task overview
- Interactive task status updates
- Meeting details modal with comprehensive analysis
- Real-time data synchronization

**Admin.js**
- Complete admin management interface
- Tabbed navigation for different admin functions
- User management with CRUD operations
- Meeting management and analytics
- Project management system
- Email tracking dashboard

**EmailComposer.js**
- Rich text email editing interface
- Template selection and customization
- Recipient management
- Send functionality with tracking options

**MeetingResults.js**
- Meeting analysis display component
- Structured presentation of AI insights
- Action items and decision tracking
- Export and sharing functionality

**TranscriptInput.js**
- Meeting transcript input interface
- File upload and text paste support
- Real-time validation
- Sample data loading

**Navbar.js**
- Responsive navigation component
- Role-based menu items
- User profile dropdown
- Mobile-friendly design

### Context Providers

**AuthContext.js**
```javascript
// Provides authentication state management
const { user, login, logout, isAuthenticated } = useAuth();
```

**ApiContext.js**
```javascript
// Centralized API call management
const { 
  analyzeTranscript, 
  sendEmail, 
  getAllUsers,
  getAllProjects 
} = useApi();
```

## 🎨 Design System

### UI Framework
- **React Bootstrap 5**: Responsive component library
- **Font Awesome**: Icon system
- **Custom CSS**: Additional styling and animations
- **Responsive Design**: Mobile-first approach

### Color Scheme
```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --info-color: #17a2b8;
}
```

### Typography
- **Primary Font**: System font stack for performance
- **Headings**: Consistent hierarchy and spacing
- **Body Text**: Optimal readability and contrast
- **Code Blocks**: Monospace font for technical content

### Layout Principles
- **Grid System**: Bootstrap's 12-column grid
- **Spacing**: Consistent margin and padding scale
- **Breakpoints**: Mobile-first responsive design
- **Accessibility**: WCAG 2.1 compliance

## 📱 Responsive Design

### Breakpoint Strategy
```css
/* Extra small devices (phones) */
@media (max-width: 575.98px) { ... }

/* Small devices (landscape phones) */
@media (min-width: 576px) and (max-width: 767.98px) { ... }

/* Medium devices (tablets) */
@media (min-width: 768px) and (max-width: 991.98px) { ... }

/* Large devices (desktops) */
@media (min-width: 992px) and (max-width: 1199.98px) { ... }

/* Extra large devices (large desktops) */
@media (min-width: 1200px) { ... }
```

### Mobile Optimizations
- **Touch-Friendly Interfaces**: Larger tap targets
- **Optimized Navigation**: Collapsible mobile menu
- **Performance**: Lazy loading and code splitting
- **Offline Support**: Service worker implementation (future)

## 🔧 State Management

### React Hooks Usage
```javascript
// Component state management
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Effect hooks for side effects
useEffect(() => {
  loadData();
}, [dependencies]);

// Custom hooks for reusable logic
const useDebounce = (value, delay) => { ... };
```

### Context Patterns
```javascript
// Global state management
const AppProvider = ({ children }) => {
  const [globalState, setGlobalState] = useState(initialState);
  
  return (
    <AppContext.Provider value={{ globalState, setGlobalState }}>
      {children}
    </AppContext.Provider>
  );
};
```

## 🔄 API Integration

### HTTP Client Configuration
```javascript
// Axios instance with interceptors
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.yourdomain.com' 
    : 'http://localhost:8000',
  timeout: 30000,
});

// Request interceptor for authentication
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Error Handling
```javascript
// Global error handling
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Redirect to login
    logout();
  } else if (error.response?.status >= 500) {
    // Show server error message
    toast.error('Server error. Please try again.');
  } else {
    // Show specific error message
    toast.error(error.response?.data?.detail || 'An error occurred');
  }
};
```

## 📊 Performance Optimization

### Code Splitting
```javascript
// Lazy loading for route components
const AdminPage = lazy(() => import('./pages/Admin'));
const HomePage = lazy(() => import('./pages/Home'));

// Suspense wrapper for loading states
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/" element={<HomePage />} />
  </Routes>
</Suspense>
```

### Bundle Optimization
```json
// Package.json build optimizations
{
  "scripts": {
    "build": "react-scripts build",
    "analyze": "npm run build && npx bundle-analyzer build/static/js/*.js"
  }
}
```

### Performance Monitoring
- **React DevTools**: Component profiling
- **Lighthouse**: Performance auditing
- **Bundle Analyzer**: Size optimization
- **Core Web Vitals**: User experience metrics

## 🧪 Testing Strategy

### Testing Setup
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Generate coverage report
npm test -- --coverage
```

### Test Examples
```javascript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import UserDashboard from './UserDashboard';

test('renders user dashboard with meetings', () => {
  render(<UserDashboard />);
  expect(screen.getByText('My Meetings')).toBeInTheDocument();
});

// API integration testing
test('loads user meetings on mount', async () => {
  const mockMeetings = [{ id: 1, title: 'Test Meeting' }];
  jest.spyOn(api, 'getUserMeetings').mockResolvedValue(mockMeetings);
  
  render(<UserDashboard />);
  await waitFor(() => {
    expect(screen.getByText('Test Meeting')).toBeInTheDocument();
  });
});
```

## 🚀 Build & Deployment

### Development Workflow
```bash
# Start development server
npm start

# Run tests in watch mode
npm test

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Production Build
```bash
# Create optimized build
npm run build

# Serve build locally for testing
npm install -g serve
serve -s build -l 3000
```

### Deployment Options

**Static Hosting (Recommended)**
```bash
# Deploy to Netlify
npm run build
# Upload build/ directory to Netlify

# Deploy to Vercel
npm install -g vercel
vercel --prod
```

**Docker Deployment**
```dockerfile
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 Configuration

### Environment Variables
```javascript
// Environment configuration
const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  VERSION: process.env.REACT_APP_VERSION || '2.0.0',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
};
```

### Build Configuration
```json
// package.json configuration
{
  "homepage": ".",
  "proxy": "http://localhost:8000",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**CORS Errors in Development**
```javascript
// Ensure backend CORS is configured
// web_app.py should include:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear React build cache
rm -rf build/
npm run build
```

**Performance Issues**
```javascript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Implement virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';
```

### Debug Tools
- **React Developer Tools**: Component inspection
- **Redux DevTools**: State management debugging
- **Network Tab**: API call monitoring
- **Console Logging**: Runtime debugging

## 📚 Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.8.0",
  "react-bootstrap": "^2.7.0",
  "bootstrap": "^5.2.0",
  "axios": "^1.3.0",
  "chart.js": "^4.2.0",
  "react-chartjs-2": "^5.2.0",
  "moment": "^2.29.0",
  "react-toastify": "^9.1.0"
}
```

### Development Dependencies
```json
{
  "@testing-library/react": "^13.4.0",
  "@testing-library/jest-dom": "^5.16.0",
  "eslint": "^8.36.0",
  "prettier": "^2.8.0",
  "husky": "^8.0.0",
  "lint-staged": "^13.1.0"
}
```

## 🔮 Future Enhancements

### Planned Features
- **Progressive Web App (PWA)**: Offline support and app-like experience
- **Real-Time Updates**: WebSocket integration for live data
- **Advanced Analytics**: More detailed charts and insights
- **Dark Mode**: Theme switching capability
- **Multi-Language**: Internationalization support
- **Voice Input**: Speech-to-text for meeting transcripts
- **Mobile App**: React Native companion app

### Performance Improvements
- **Code Splitting**: More granular chunk optimization
- **Caching Strategy**: Improved data caching
- **Image Optimization**: WebP format and lazy loading
- **Service Workers**: Background data synchronization

## 🤝 Contributing

### Development Guidelines
- Follow React best practices and hooks patterns
- Use TypeScript for new components (migration in progress)
- Write tests for new features
- Follow ESLint and Prettier configurations
- Update documentation for new features

### Component Creation Template
```javascript
import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import './ComponentName.css';

const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  const handleAction = () => {
    // Event handler
  };

  return (
    <Container>
      <Row>
        <Col>
          {/* Component JSX */}
        </Col>
      </Row>
    </Container>
  );
};

export default ComponentName;
```

---

**Frontend Version**: 2.0.0  
**React Version**: 18.2+  
**Node.js Version**: 16+  
**Last Updated**: August 16, 2025

For detailed API integration examples and advanced usage, see the main project README.
- Axios for API calls
- Toast notifications
- Chart.js for analytics
- Moment.js for date formatting
 
### API Integration
- Full integration with FastAPI backend
- Real-time email tracking
- File upload support
- Error handling and loading states
 
### Responsive Design
- Mobile-first approach
- Bootstrap 5 styling
- Custom CSS animations
- Font Awesome icons
 
## Development vs Production
 
### Development Mode
- React dev server runs on port 3000
- FastAPI backend runs on port 8000
- CORS enabled for cross-origin requests
- Hot reloading for instant updates
 
### Production Mode
- React app builds to static files
- FastAPI serves React build at root path
- Single server deployment
- Optimized bundle sizes
 
## Deployment
 
1. Build the React app:
```bash
cd frontend
npm run build
```
 
2. The FastAPI server will automatically serve the React app if build files exist
 
3. Access the full application at `http://localhost:8000`
 
## Available Scripts
 
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (irreversible)
 
## Browser Support
 
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
 
## Troubleshooting
 
### Common Issues
 
1. **Port 3000 already in use**
   - Kill the process or use a different port
   - `npx kill-port 3000`
 
2. **API calls failing**
   - Ensure FastAPI backend is running on port 8000
   - Check CORS configuration
 
3. **Build files not served**
   - Ensure `npm run build` completed successfully
   - Check that `frontend/build` directory exists
 
4. **Styling issues**
   - Clear browser cache
   - Check Bootstrap CSS is loading
 
### Performance Tips
 
1. Use React.memo for expensive components
2. Implement virtual scrolling for large lists
3. Lazy load images and components
4. Optimize bundle size with code splitting
 
## Future Enhancements
 
- Real-time WebSocket updates
- Progressive Web App (PWA) support
- Offline functionality
- Advanced charting and analytics
- Multi-language support
- Dark mode theme
 
Node.js — Run JavaScript Everywhere
Node.js® is a free, open-source, cross-platform JavaScript runtime environment that lets developers create servers, web apps, command line tools and scripts.
 