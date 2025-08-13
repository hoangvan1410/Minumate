import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Loading user data with token:', token?.substring(0, 20) + '...');
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Load user meetings
      console.log('📅 Fetching user meetings...');
      const meetingsResponse = await fetch('http://localhost:8002/api/user/meetings', { headers });
      console.log('📅 Meetings response status:', meetingsResponse.status);
      
      if (meetingsResponse.ok) {
        const meetingsData = await meetingsResponse.json();
        console.log('📅 Meetings data:', meetingsData);
        setMeetings(meetingsData.meetings);
      } else {
        console.error('📅 Failed to fetch meetings:', await meetingsResponse.text());
      }

      // Load user tasks
      console.log('📋 Fetching user tasks...');
      const tasksResponse = await fetch('http://localhost:8002/api/user/tasks', { headers });
      console.log('📋 Tasks response status:', tasksResponse.status);
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        console.log('📋 Tasks data:', tasksData);
        setTasks(tasksData.tasks);
      } else {
        console.error('📋 Failed to fetch tasks:', await tasksResponse.text());
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8002/api/user/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Reload tasks to reflect the change
        loadUserData();
      } else {
        setError('Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task status');
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h2>Welcome, {user?.full_name}</h2>
          <p className="text-muted">Your personal dashboard</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">My Meetings</h5>
            </Card.Header>
            <Card.Body>
              {meetings.length === 0 ? (
                <p className="text-muted">No meetings found.</p>
              ) : (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Role</th>
                      <th>Created By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((meeting) => (
                      <tr key={meeting.id}>
                        <td>{meeting.title}</td>
                        <td>
                          <Badge bg={meeting.user_role === 'organizer' ? 'primary' : 'secondary'}>
                            {meeting.user_role}
                          </Badge>
                        </td>
                        <td>{meeting.creator}</td>
                        <td>{formatDate(meeting.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">My Tasks</h5>
            </Card.Header>
            <Card.Body>
              {tasks.length === 0 ? (
                <p className="text-muted">No tasks assigned.</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <Card key={task.id} className="mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                      <Card.Body className="p-3">
                        <h6 className="mb-2">{task.title}</h6>
                        <p className="text-muted small mb-2">{task.description}</p>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <small className="text-muted">
                            Due: {task.due_date ? formatDate(task.due_date) : 'No due date'}
                          </small>
                          <Badge bg={getStatusBadgeVariant(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                        <small className="text-muted d-block mb-2">
                          <i className="fas fa-calendar-alt me-1"></i>
                          Meeting: {task.meeting_title}
                        </small>
                        {task.meeting_date && (
                          <small className="text-muted d-block mb-2">
                            <i className="fas fa-clock me-1"></i>
                            Meeting Date: {formatDate(task.meeting_date)}
                          </small>
                        )}
                        
                        {task.status !== 'completed' && (
                          <div className="btn-group btn-group-sm w-100">
                            {task.status === 'pending' && (
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                              >
                                Start
                              </Button>
                            )}
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => updateTaskStatus(task.id, 'completed')}
                            >
                              Complete
                            </Button>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UserDashboard;
