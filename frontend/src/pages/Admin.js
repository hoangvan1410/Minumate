import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Modal, Alert, Tabs, Tab, InputGroup } from 'react-bootstrap';
import { useApi } from '../contexts/ApiContext';
import { toast } from 'react-toastify';
import moment from 'moment';
import EmailComposer from '../components/EmailComposer';
 
const Admin = () => {
  // Email tracking states
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState({});
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailFilters, setEmailFilters] = useState({
    search: '',
    status: '',
    date: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // User management states
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFilters, setUserFilters] = useState({
    search: '',
    status: '',
    role: ''
  });

  // Meeting management states
  const [meetings, setMeetings] = useState([]);
  const [meetingLoading, setMeetingLoading] = useState(true);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingFilters, setMeetingFilters] = useState({
    search: '',
    creator: ''
  });
  const [showMeetingDetailsModal, setShowMeetingDetailsModal] = useState(false);

  const { 
    getEmailsAdmin, 
    getEmailDetails, 
    cleanupEmails,
    getAllUsers,
    updateUser,
    deleteUser,
    getAllMeetings,
    getMeetingDetails,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    addMeetingParticipant,
    removeMeetingParticipant
  } = useApi();
 
  useEffect(() => {
    loadEmails();
    loadUsers();
    loadMeetings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadEmails();
      loadUsers();
      loadMeetings();
    }, 30000);
    return () => clearInterval(interval);
  }, [emailFilters, currentPage]);

  // Email Management Functions
  const loadEmails = async () => {
    try {
      setEmailLoading(true);
      const data = await getEmailsAdmin({
        page: currentPage,
        ...emailFilters
      });
     
      setEmails(data.emails);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast.error('Failed to load emails');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailFilterChange = (key, value) => {
    setEmailFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleShowEmailDetails = async (trackingId) => {
    try {
      const emailDetails = await getEmailDetails(trackingId);
      setSelectedEmail(emailDetails);
      setShowEmailModal(true);
    } catch (error) {
      toast.error('Failed to load email details');
    }
  };

  const handleCleanup = async () => {
    if (window.confirm('Are you sure you want to delete emails older than 30 days?')) {
      try {
        const result = await cleanupEmails(30);
        toast.success(result.message);
        loadEmails();
      } catch (error) {
        toast.error('Failed to cleanup emails');
      }
    }
  };

  // User Management Functions
  const loadUsers = async () => {
    try {
      setUserLoading(true);
      const data = await getAllUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setUserLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !userFilters.search || 
      user.full_name.toLowerCase().includes(userFilters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(userFilters.search.toLowerCase()) ||
      user.username.toLowerCase().includes(userFilters.search.toLowerCase());
    
    const matchesStatus = !userFilters.status || user.status === userFilters.status;
    const matchesRole = !userFilters.role || user.role === userFilters.role;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      if (selectedUser.id) {
        await updateUser(selectedUser.id, {
          username: selectedUser.username,
          email: selectedUser.email,
          full_name: selectedUser.full_name,
          role: selectedUser.role,
          status: selectedUser.status,
          is_active: selectedUser.is_active
        });
        toast.success('User updated successfully');
      }
      setShowUserModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      toast.error('Failed to save user');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This will also delete all their meetings and tasks.`)) {
      try {
        await deleteUser(userId);
        toast.success('User deleted successfully');
        loadUsers();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  // Meeting Management Functions
  const loadMeetings = async () => {
    try {
      setMeetingLoading(true);
      const data = await getAllMeetings();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setMeetingLoading(false);
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !meetingFilters.search || 
      meeting.title.toLowerCase().includes(meetingFilters.search.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(meetingFilters.search.toLowerCase());
    
    const matchesCreator = !meetingFilters.creator || 
      meeting.creator_name?.toLowerCase().includes(meetingFilters.creator.toLowerCase());
    
    return matchesSearch && matchesCreator;
  });

  const handleShowMeetingDetails = async (meetingId) => {
    try {
      const data = await getMeetingDetails(meetingId);
      setSelectedMeeting(data.meeting);
      setShowMeetingDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load meeting details');
    }
  };

  const handleDeleteMeeting = async (meetingId, meetingTitle) => {
    if (window.confirm(`Are you sure you want to delete meeting "${meetingTitle}"? This will also delete all related tasks.`)) {
      try {
        await deleteMeeting(meetingId);
        toast.success('Meeting deleted successfully');
        loadMeetings();
      } catch (error) {
        toast.error('Failed to delete meeting');
      }
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card className="stat-card text-center">
      <Card.Body>
        <i className={`fas ${icon} stat-icon text-${color} mb-2`}></i>
        <h3 className="mb-1">{value}</h3>
        <p className="text-muted mb-0">{title}</p>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </Card.Body>
    </Card>
  );
 
  return (
    <Container className="mt-4">
      <Tabs defaultActiveKey="compose" className="mb-4">
          <Tab eventKey="compose" title={<><i className="fas fa-edit me-2"></i>Compose Email</>}>
            <EmailComposer />
          </Tab>

          <Tab eventKey="users" title={<><i className="fas fa-users me-2"></i>User Management</>}>
            {/* User Filters */}
            <Card className="main-card mb-4">
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Search Users</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search by name, email, or username..."
                        value={userFilters.search}
                        onChange={(e) => setUserFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={userFilters.status}
                        onChange={(e) => setUserFilters(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="">All Status</option>
                        <option value="registered">Registered</option>
                        <option value="created">Created</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Role</Form.Label>
                      <Form.Select
                        value={userFilters.role}
                        onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Button variant="outline-primary" onClick={loadUsers} disabled={userLoading}>
                      <i className="fas fa-sync-alt me-1"></i>
                      Refresh
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Users Table */}
            <Card className="admin-table">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">
                  <i className="fas fa-users me-2"></i>
                  Users ({filteredUsers.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                {userLoading ? (
                  <div className="text-center py-5">
                    <div className="loading-spinner mb-3"></div>
                    <p>Loading users...</p>
                  </div>
                ) : (
                  <Table hover responsive className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>User Info</th>
                        <th>Username</th>
                        <th>Status</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div>
                              <strong>{user.full_name}</strong>
                              <br />
                              <small className="text-muted">{user.email}</small>
                            </div>
                          </td>
                          <td>{user.username}</td>
                          <td>
                            <Badge bg={user.status === 'registered' ? 'success' : 'warning'}>
                              {user.status}
                            </Badge>
                            {!user.is_active && (
                              <Badge bg="danger" className="ms-1">Inactive</Badge>
                            )}
                          </td>
                          <td>
                            <Badge bg={user.role === 'admin' ? 'primary' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </td>
                          <td>
                            <small>{moment(user.created_at).format('MMM DD, YYYY')}</small>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEditUser(user)}
                            >
                              <i className="fas fa-edit me-1"></i>
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, user.full_name)}
                            >
                              <i className="fas fa-trash me-1"></i>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            {filteredUsers.length === 0 && !userLoading && (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No users found. Try adjusting your filters.
              </Alert>
            )}
          </Tab>

          <Tab eventKey="meetings" title={<><i className="fas fa-calendar-alt me-2"></i>Meeting Management</>}>
            {/* Meeting Filters */}
            <Card className="main-card mb-4">
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Search Meetings</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search by title or description..."
                        value={meetingFilters.search}
                        onChange={(e) => setMeetingFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Creator</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search by creator name..."
                        value={meetingFilters.creator}
                        onChange={(e) => setMeetingFilters(prev => ({ ...prev, creator: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Button variant="outline-primary" onClick={loadMeetings} disabled={meetingLoading}>
                      <i className="fas fa-sync-alt me-1"></i>
                      Refresh
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Meetings Table */}
            <Card className="admin-table">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">
                  <i className="fas fa-calendar-alt me-2"></i>
                  Meetings ({filteredMeetings.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                {meetingLoading ? (
                  <div className="text-center py-5">
                    <div className="loading-spinner mb-3"></div>
                    <p>Loading meetings...</p>
                  </div>
                ) : (
                  <Table hover responsive className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Meeting Info</th>
                        <th>Creator</th>
                        <th>Participants</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMeetings.map((meeting) => (
                        <tr key={meeting.id}>
                          <td>
                            <div>
                              <strong>{meeting.title}</strong>
                              <br />
                              {meeting.description && (
                                <small className="text-muted">
                                  {meeting.description.length > 100 
                                    ? meeting.description.substring(0, 100) + '...'
                                    : meeting.description
                                  }
                                </small>
                              )}
                            </div>
                          </td>
                          <td>{meeting.creator_name}</td>
                          <td>
                            <Badge bg="info">{meeting.participant_count} participants</Badge>
                          </td>
                          <td>
                            <small>{moment(meeting.created_at).format('MMM DD, YYYY')}</small>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleShowMeetingDetails(meeting.id)}
                            >
                              <i className="fas fa-eye me-1"></i>
                              Details
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
                            >
                              <i className="fas fa-trash me-1"></i>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            {filteredMeetings.length === 0 && !meetingLoading && (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No meetings found. Try adjusting your filters.
              </Alert>
            )}
          </Tab>
          
          <Tab eventKey="analytics" title={<><i className="fas fa-chart-line me-2"></i>Email Analytics</>}>
            {/* Statistics Cards */}
            <Row className="mb-4">
              <Col md={3}>
                <StatCard
                  title="Total Emails"
                  value={stats.total_emails || 0}
                  icon="fa-envelope"
                  color="primary"
                />
              </Col>
              <Col md={3}>
                <StatCard
                  title="Opened"
                  value={stats.opened_emails || 0}
                  icon="fa-envelope-open"
                  color="success"
                  subtitle={`${stats.open_rate?.toFixed(1) || 0}%`}
                />
              </Col>
              <Col md={3}>
                <StatCard
                  title="Clicked"
                  value={stats.clicked_emails || 0}
                  icon="fa-mouse-pointer"
                  color="warning"
                  subtitle={`${stats.click_rate?.toFixed(1) || 0}%`}
                />
              </Col>
              <Col md={3}>
                <StatCard
                  title="Last 24 Hours"
                  value={stats.recent_emails || 0}
                  icon="fa-clock"
                  color="info"
                />
              </Col>
            </Row>

            {/* Filters */}
            <Card className="main-card mb-4">
              <Card.Body>
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Search</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search by recipient email or name..."
                        value={emailFilters.search}
                        onChange={(e) => handleEmailFilterChange('search', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={emailFilters.status}
                        onChange={(e) => handleEmailFilterChange('status', e.target.value)}
                      >
                        <option value="">All Status</option>
                        <option value="opened">Opened</option>
                        <option value="sent">Sent Only</option>
                        <option value="clicked">Clicked</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Button variant="outline-primary" onClick={loadEmails} disabled={emailLoading}>
                      <i className="fas fa-sync-alt me-1"></i>
                      Refresh
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
 
            {/* Email Table */}
            <Card className="admin-table">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">
                  <i className="fas fa-list me-2"></i>
                  Email Tracking History
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                {emailLoading ? (
                  <div className="text-center py-5">
                    <div className="loading-spinner mb-3"></div>
                    <p>Loading emails...</p>
                  </div>
                ) : (
                  <Table hover responsive className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Recipient</th>
                        <th>Subject</th>
                        <th>Sent At</th>
                        <th>Status</th>
                        <th>Opens</th>
                        <th>Clicks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((email) => (
                        <tr key={email.tracking_id}>
                          <td>
                            <div>
                              <strong>{email.recipient_name}</strong>
                              <br />
                              <small className="text-muted">{email.recipient_email}</small>
                            </div>
                          </td>
                          <td>
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {email.subject}
                            </div>
                          </td>
                          <td>
                            <small>{moment(email.sent_at).format('MMM DD, HH:mm')}</small>
                          </td>
                          <td>
                            {email.opened ? (
                              <Badge bg="success" className="status-badge">
                                <i className="fas fa-envelope-open me-1"></i>
                                Opened
                              </Badge>
                            ) : (
                              <Badge bg="secondary" className="status-badge">
                                <i className="fas fa-envelope me-1"></i>
                                Sent
                              </Badge>
                            )}
                            {email.clicked && (
                              <Badge bg="primary" className="status-badge ms-1">
                                <i className="fas fa-mouse-pointer me-1"></i>
                                Clicked
                              </Badge>
                            )}
                          </td>
                          <td>
                            <Badge bg="success">{email.open_count || 0}</Badge>
                            {email.last_opened && (
                              <>
                                <br />
                                <small className="text-muted">
                                  {moment(email.last_opened).format('MMM DD, HH:mm')}
                                </small>
                              </>
                            )}
                          </td>
                          <td>
                            <Badge bg="warning">{email.click_count || 0}</Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleShowEmailDetails(email.tracking_id)}
                            >
                              <i className="fas fa-eye me-1"></i>
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
 
            {emails.length === 0 && !emailLoading && (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No emails found. Try adjusting your filters or send some emails first.
              </Alert>
            )}
          </Tab>
        </Tabs>

        {/* Floating Action Button */}
        <Button
          variant="primary"
          className="floating-action-btn"
          onClick={() => {
            loadEmails();
            loadUsers();
            loadMeetings();
          }}
          disabled={emailLoading || userLoading || meetingLoading}
          title="Refresh All Data"
        >
          <i className={`fas fa-sync-alt ${(emailLoading || userLoading || meetingLoading) ? 'fa-spin' : ''}`}></i>
        </Button>

      {/* User Edit Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-edit me-2"></i>
            Edit User
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedUser.full_name || ''}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedUser.username || ''}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={selectedUser.email || ''}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Role</Form.Label>
                    <Form.Select
                      value={selectedUser.role || 'user'}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={selectedUser.status || 'registered'}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="created">Created</option>
                      <option value="registered">Registered</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Active"
                      checked={selectedUser.is_active}
                      onChange={(e) => setSelectedUser(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveUser}>
            <i className="fas fa-save me-1"></i>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Meeting Details Modal */}
      <Modal show={showMeetingDetailsModal} onHide={() => setShowMeetingDetailsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-calendar-alt me-2"></i>
            Meeting Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMeeting && (
            <Row>
              <Col md={6}>
                <h6>Meeting Information</h6>
                <Table size="sm">
                  <tbody>
                    <tr>
                      <td><strong>Title:</strong></td>
                      <td>{selectedMeeting.title}</td>
                    </tr>
                    <tr>
                      <td><strong>Description:</strong></td>
                      <td>{selectedMeeting.description || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><strong>Creator:</strong></td>
                      <td>{selectedMeeting.creator_name}</td>
                    </tr>
                    <tr>
                      <td><strong>Created At:</strong></td>
                      <td>{moment(selectedMeeting.created_at).format('LLLL')}</td>
                    </tr>
                  </tbody>
                </Table>

                {selectedMeeting.transcript && (
                  <div className="mt-3">
                    <h6>Transcript Preview</h6>
                    <div 
                      className="bg-light p-3 rounded" 
                      style={{ maxHeight: '200px', overflowY: 'auto' }}
                    >
                      <small>
                        {selectedMeeting.transcript.length > 500 
                          ? selectedMeeting.transcript.substring(0, 500) + '...'
                          : selectedMeeting.transcript
                        }
                      </small>
                    </div>
                  </div>
                )}
              </Col>
              <Col md={6}>
                <h6>Participants ({selectedMeeting.participants?.length || 0})</h6>
                {selectedMeeting.participants && selectedMeeting.participants.length > 0 ? (
                  <Table size="sm" striped>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMeeting.participants.map((participant) => (
                        <tr key={participant.id}>
                          <td>{participant.full_name}</td>
                          <td><small>{participant.email}</small></td>
                          <td>
                            <Badge bg={participant.role === 'organizer' ? 'primary' : 'secondary'}>
                              {participant.role}
                            </Badge>
                          </td>
                          <td>
                            {participant.role !== 'organizer' && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Remove ${participant.full_name} from this meeting?`)) {
                                    removeMeetingParticipant(selectedMeeting.id, participant.id)
                                      .then(() => {
                                        toast.success('Participant removed');
                                        handleShowMeetingDetails(selectedMeeting.id);
                                      })
                                      .catch(() => toast.error('Failed to remove participant'));
                                  }
                                }}
                              >
                                <i className="fas fa-times"></i>
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info">
                    <i className="fas fa-info-circle me-2"></i>
                    No participants in this meeting.
                  </Alert>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMeetingDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Email Details Modal */}
      <Modal show={showEmailModal} onHide={() => setShowEmailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-envelope-open me-2"></i>
            Email Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEmail && (
            <Row>
              <Col md={6}>
                <h6>Email Information</h6>
                <Table size="sm">
                  <tbody>
                    <tr>
                      <td><strong>Tracking ID:</strong></td>
                      <td><code>{selectedEmail.tracking_id}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Recipient:</strong></td>
                      <td>
                        {selectedEmail.recipient_name}
                        <br />
                        <small>{selectedEmail.recipient_email}</small>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Subject:</strong></td>
                      <td>{selectedEmail.subject}</td>
                    </tr>
                    <tr>
                      <td><strong>Sent At:</strong></td>
                      <td>{moment(selectedEmail.sent_at).format('LLLL')}</td>
                    </tr>
                    <tr>
                      <td><strong>SendGrid ID:</strong></td>
                      <td><code>{selectedEmail.sendgrid_message_id || 'N/A'}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Tracking:</strong></td>
                      <td>{selectedEmail.tracking_enabled ? 'Enabled' : 'Disabled'}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <h6>Activity Timeline</h6>
                <div className="event-timeline">
                  {selectedEmail.events && selectedEmail.events.length > 0 ? (
                    selectedEmail.events.map((event, index) => (
                      <div key={index} className={`event-item event-${event.event_type}`}>
                        <div className="d-flex justify-content-between">
                          <strong>{event.event_type.toUpperCase()}</strong>
                          <small>{moment(event.timestamp).format('MMM DD, HH:mm:ss')}</small>
                        </div>
                        {event.ip_address && <small>IP: {event.ip_address}</small>}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No tracking events recorded</p>
                  )}
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Admin;
 
 