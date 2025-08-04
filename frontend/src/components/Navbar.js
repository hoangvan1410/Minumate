import React from 'react';
import { Navbar as BSNavbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
 
const Navbar = () => {
  const location = useLocation();
 
  return (
    <BSNavbar expand="lg" className="navbar-custom" variant="dark">
      <Container>
        <BSNavbar.Brand as={Link} to="/">
          <i className="fas fa-brain me-2"></i>
          Meeting Analyzer
        </BSNavbar.Brand>
       
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
       
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link
              as={Link}
              to="/"
              active={location.pathname === '/'}
            >
              <i className="fas fa-home me-1"></i>
              Home
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/admin"
              active={location.pathname === '/admin'}
            >
              <i className="fas fa-chart-line me-1"></i>
              Admin
            </Nav.Link>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};
 
export default Navbar;
 
 