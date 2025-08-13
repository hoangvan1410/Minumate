import React from 'react';
import { Navbar as BSNavbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
 
const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
 
  const handleLogout = () => {
    logout();
  };

  return (
    <BSNavbar expand="lg" className="navbar-custom" variant="dark">
      <Container>
        <BSNavbar.Brand as={Link} to="/">
          <i className="fas fa-brain me-2"></i>
          Minumate
        </BSNavbar.Brand>
       
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
       
        <BSNavbar.Collapse id="basic-navbar-nav">
          {isAuthenticated ? (
            <Nav className="ms-auto">
              <Nav.Link
                as={Link}
                to="/dashboard"
                active={location.pathname === '/dashboard'}
              >
                <i className="fas fa-home me-1"></i>
                Dashboard
              </Nav.Link>
              
              {user?.role === 'admin' && (
                <>
                  <Nav.Link
                    as={Link}
                    to="/"
                    active={location.pathname === '/'}
                  >
                    <i className="fas fa-microphone me-1"></i>
                    Analyze
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to="/admin"
                    active={location.pathname === '/admin'}
                  >
                    <i className="fas fa-chart-line me-1"></i>
                    Admin
                  </Nav.Link>
                </>
              )}
              
              <Nav.Item className="d-flex align-items-center me-3">
                <span className="text-light me-2">
                  Welcome, {user?.full_name}
                  <Badge bg={user?.role === 'admin' ? 'warning' : 'info'} className="ms-1">
                    {user?.role}
                  </Badge>
                </span>
              </Nav.Item>
              
              <Nav.Item>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Logout
                </Button>
              </Nav.Item>
            </Nav>
          ) : (
            <Nav className="ms-auto">
              <Nav.Item className="text-light">
                <small>Please login to access the application</small>
              </Nav.Item>
            </Nav>
          )}
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};
 
export default Navbar;
 
 