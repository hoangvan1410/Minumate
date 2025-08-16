import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Nav } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'user'
  });
  const [localError, setLocalError] = useState('');
  
  const { login, register, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!isLogin) {
      // Registration validation
      if (formData.password !== formData.confirmPassword) {
        setLocalError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setLocalError('Password must be at least 6 characters long');
        return;
      }
    }

    const result = isLogin 
      ? await login(formData.username, formData.password)
      : await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role
        });

    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      role: 'user'
    });
    setLocalError('');
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card>
            <Card.Header className="text-center">
              <h3 className="mb-0">Minumate</h3>
              <small className="text-muted">Meeting Transcript Analyzer</small>
            </Card.Header>
            <Card.Body>
              <Nav variant="pills" className="justify-content-center mb-3">
                <Nav.Item>
                  <Nav.Link
                    active={isLogin}
                    onClick={() => setIsLogin(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    Login
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={!isLogin}
                    onClick={() => setIsLogin(false)}
                    style={{ cursor: 'pointer' }}
                  >
                    Register
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              {(error || localError) && (
                <Alert variant="danger">
                  {error || localError}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Enter username"
                  />
                </Form.Group>

                {!isLogin && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="Enter email"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                        placeholder="Enter full name"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Role</Form.Label>
                      <Form.Select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </Form.Select>
                    </Form.Group>
                  </>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter password"
                  />
                </Form.Group>

                {!isLogin && (
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm password"
                    />
                  </Form.Group>
                )}

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      {isLogin ? 'Logging in...' : 'Registering...'}
                    </>
                  ) : (
                    isLogin ? 'Login' : 'Register'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AuthPage;
