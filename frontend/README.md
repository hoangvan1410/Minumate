# React Frontend Setup
 
This directory contains the React frontend for the Meeting Transcript Analyzer.
 
## Quick Start
 
### 1. Install Node.js
Download and install Node.js from [nodejs.org](https://nodejs.org/) (v16 or higher)
 
### 2. Install Dependencies
```bash
cd frontend
npm install
```
 
### 3. Start Development Server
```bash
npm start
```
 
This will start the React development server on `http://localhost:3000`
 
### 4. Build for Production
```bash
npm run build
```
 
This creates a `build` folder with optimized production files.
 
## Architecture
 
### Components
- **TranscriptInput**: File upload and transcript input form
- **MeetingResults**: Display meeting analysis results
- **EmailGeneration**: Email editing and sending interface
- **Navbar**: Navigation between Home and Admin pages
 
### Pages
- **Home**: Main transcript analysis interface
- **Admin**: Email tracking dashboard with statistics
 
### Context
- **ApiContext**: Centralized API calls and state management
 
## Features
 
### Modern React App
- React 18 with hooks
- React Router for navigation
- React Bootstrap for UI components
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
- FastAPI backend runs on port 8002
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
 
3. Access the full application at `http://localhost:8002`
 
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
   - Ensure FastAPI backend is running on port 8002
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
 