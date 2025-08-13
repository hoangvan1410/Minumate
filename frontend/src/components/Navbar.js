import React from 'react';
import { Navbar as BSNavbar, Nav, Container, Badge, NavDropdown } from 'react-bootstrap';
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
                className="nav-item-spacing"
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
                    className="nav-item-spacing"
                  >
                    <i className="fas fa-microphone me-1"></i>
                    Analyze
                  </Nav.Link>
                  <Nav.Link
                    as={Link}
                    to="/admin"
                    active={location.pathname === '/admin'}
                    className="nav-item-spacing"
                  >
                    <i className="fas fa-chart-line me-1"></i>
                    Admin
                  </Nav.Link>
                </>
              )}
              
              <NavDropdown
                title={
                  <span className="user-dropdown-title">
                    <i className="fas fa-user-circle me-2"></i>
                    {user?.full_name}
                    <Badge bg={user?.role === 'admin' ? 'warning' : 'info'} className="ms-2">
                      {user?.role}
                    </Badge>
                  </span>
                }
                id="user-dropdown"
                align="end"
                className="user-dropdown nav-item-spacing"
              >
                <NavDropdown.Item disabled className="user-info-item">
                  <div className="text-center">
                    <div className="user-avatar">
                      <i className="fas fa-user-circle fa-2x text-muted"></i>
                    </div>
                    <div className="mt-2">
                      <strong>{user?.full_name}</strong>
                      <br />
                      <small className="text-muted">{user?.email}</small>
                    </div>
                  </div>
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Link} to="/profile">
                  <i className="fas fa-user me-2"></i>
                  Profile
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/settings">
                  <i className="fas fa-cog me-2"></i>
                  Settings
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout} className="logout-item">
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
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
 
 