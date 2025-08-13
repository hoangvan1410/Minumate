import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Spinner, Container } from 'react-bootstrap';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Admin from './pages/Admin';
import AuthPage from './components/AuthPage';
import UserDashboard from './components/UserDashboard';
import { ApiProvider } from './contexts/ApiContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import 'react-toastify/dist/ReactToastify.css';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Helper function to get default route based on user role
const getDefaultRoute = (user) => {
  return user?.role === 'admin' ? '/' : '/dashboard';
};

// Main App Content
const AppContent = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/auth" 
          element={
            isAuthenticated ? <Navigate to={getDefaultRoute(user)} replace /> : <AuthPage />
          } 
        />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Admin Only Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute adminOnly={true}>
              <Home />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Redirect to appropriate page based on auth status */}
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? getDefaultRoute(user) : "/auth"} replace />
          }
        />
      </Routes>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ApiProvider>
        <Router>
          <AppContent />
        </Router>
      </ApiProvider>
    </AuthProvider>
  );
}

export default App;
 
 