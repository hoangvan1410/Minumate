import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

const UserDashboard = () => {
  const { user } = useAuth();
  const { API_BASE_URL } = useApi();
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMeetingDetailsModal, setShowMeetingDetailsModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingMeetingDetails, setLoadingMeetingDetails] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Load user meetings
      const meetingsResponse = await fetch(`${API_BASE_URL}/api/user/meetings`, { headers });
      
      if (meetingsResponse.ok) {
        const meetingsData = await meetingsResponse.json();
        setMeetings(meetingsData.meetings);
      } else {
        console.error('📅 Failed to fetch meetings:', await meetingsResponse.text());
      }

      // Load user tasks
      const tasksResponse = await fetch(`${API_BASE_URL}/api/user/tasks`, { headers });
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
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
      const response = await fetch(`${API_BASE_URL}/api/user/tasks/${taskId}`, {
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

  const handleViewMeetingDetails = async (meeting) => {
    setLoadingMeetingDetails(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/user/meetings/${meeting.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const meetingDetails = await response.json();
        setSelectedMeeting(meetingDetails);
        setShowMeetingDetailsModal(true);
      } else {
        setError('Failed to load meeting details');
      }
    } catch (error) {
      console.error('Error loading meeting details:', error);
      setError('Failed to load meeting details');
    } finally {
      setLoadingMeetingDetails(false);
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
                      <th>Actions</th>
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
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewMeetingDetails(meeting)}
                            disabled={loadingMeetingDetails}
                          >
                            <i className="fas fa-eye me-1"></i>
                            View Details
                          </Button>
                        </td>
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

      {/* Meeting Details Modal */}
      <Modal show={showMeetingDetailsModal} onHide={() => setShowMeetingDetailsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-calendar-alt me-2"></i>
            Meeting Details: {selectedMeeting?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMeeting && (
            <>
              <Row>
              <Col md={12}>
                <Card className="mb-4">
                  <Card.Header>
                    <h6><i className="fas fa-info-circle me-2"></i>Meeting Information</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Table borderless>
                          <tbody>
                            <tr>
                              <td><strong>Title:</strong></td>
                              <td>{selectedMeeting.title}</td>
                            </tr>
                            <tr>
                              <td><strong>Description:</strong></td>
                              <td>{selectedMeeting.description || 'No description'}</td>
                            </tr>
                            <tr>
                              <td><strong>Your Role:</strong></td>
                              <td>
                                <Badge bg={selectedMeeting.user_role === 'organizer' ? 'primary' : 'secondary'}>
                                  {selectedMeeting.user_role}
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </Table>
                      </Col>
                      <Col md={6}>
                        <Table borderless>
                          <tbody>
                            <tr>
                              <td><strong>Created By:</strong></td>
                              <td>{selectedMeeting.creator}</td>
                            </tr>
                            <tr>
                              <td><strong>Created:</strong></td>
                              <td>{formatDate(selectedMeeting.created_at)}</td>
                            </tr>
                            <tr>
                              <td><strong>Total Tasks:</strong></td>
                              <td><Badge bg="warning">{selectedMeeting.tasks?.length || 0}</Badge></td>
                            </tr>
                          </tbody>
                        </Table>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {selectedMeeting.analysis && (
                  <Card className="mb-4">
                    <Card.Header>
                      <h6><i className="fas fa-chart-pie me-2"></i>Meeting Analysis</h6>
                    </Card.Header>
                    <Card.Body>
                      {selectedMeeting.analysis.executive_summary && (
                        <Row className="mb-4">
                          <Col md={12}>
                            <h6><i className="fas fa-file-alt me-2"></i>Executive Summary</h6>
                            <div className="bg-light p-3 rounded">
                              <p className="mb-0">{selectedMeeting.analysis.executive_summary}</p>
                            </div>
                          </Col>
                        </Row>
                      )}

                      <Row>
                        <Col md={6}>
                          <h6><i className="fas fa-tasks me-2"></i>Action Items</h6>
                          {selectedMeeting.analysis.action_items?.length > 0 ? (
                            <div className="list-group list-group-flush">
                              {selectedMeeting.analysis.action_items.map((item, index) => (
                                <div key={index} className="list-group-item border-0 px-0">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <strong>{item.task}</strong>
                                      {item.owner && (
                                        <small className="d-block text-muted">
                                          Assigned to: {item.owner}
                                        </small>
                                      )}
                                      {item.due_date && (
                                        <small className="d-block text-muted">
                                          Due: {formatDate(item.due_date)}
                                        </small>
                                      )}
                                    </div>
                                    <Badge bg={
                                      item.priority === 'high' ? 'danger' :
                                      item.priority === 'medium' ? 'warning' : 'secondary'
                                    }>
                                      {item.priority || 'Normal'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted">No action items identified</p>
                          )}
                        </Col>
                        
                        <Col md={6}>
                          <h6><i className="fas fa-lightbulb me-2"></i>Key Decisions</h6>
                          {selectedMeeting.analysis.key_decisions?.length > 0 ? (
                            <div className="list-group list-group-flush">
                              {selectedMeeting.analysis.key_decisions.map((decision, index) => (
                                <div key={index} className="list-group-item border-0 px-0">
                                  <i className="fas fa-circle text-success me-2" style={{fontSize: '0.5rem'}}></i>
                                  {decision}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted">No key decisions identified</p>
                          )}

                          {selectedMeeting.analysis.next_steps?.length > 0 && (
                            <>
                              <h6 className="mt-4"><i className="fas fa-arrow-right me-2"></i>Next Steps</h6>
                              <div className="list-group list-group-flush">
                                {selectedMeeting.analysis.next_steps.map((step, index) => (
                                  <div key={index} className="list-group-item border-0 px-0">
                                    <i className="fas fa-circle text-primary me-2" style={{fontSize: '0.5rem'}}></i>
                                    {step}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                )}

                {selectedMeeting.tasks?.length > 0 && (
                  <Card>
                    <Card.Header>
                      <h6><i className="fas fa-tasks me-2"></i>Your Tasks from this Meeting</h6>
                    </Card.Header>
                    <Card.Body>
                      <Table responsive hover>
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMeeting.tasks.map((task) => (
                            <tr key={task.id}>
                              <td>
                                <strong>{task.title}</strong>
                                {task.description && (
                                  <small className="d-block text-muted">{task.description}</small>
                                )}
                              </td>
                              <td>{formatDate(task.due_date)}</td>
                              <td>
                                <Badge bg={getStatusBadgeVariant(task.status)}>
                                  {task.status}
                                </Badge>
                              </td>
                              <td>
                                {task.status !== 'completed' && (
                                  <div className="btn-group btn-group-sm">
                                    {task.status === 'pending' && (
                                      <Button
                                        variant="warning"
                                        size="sm"
                                        onClick={() => {
                                          updateTaskStatus(task.id, 'in_progress');
                                          setShowMeetingDetailsModal(false);
                                        }}
                                      >
                                        Start
                                      </Button>
                                    )}
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => {
                                        updateTaskStatus(task.id, 'completed');
                                        setShowMeetingDetailsModal(false);
                                      }}
                                    >
                                      Complete
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
              </Col>
            </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMeetingDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UserDashboard;
