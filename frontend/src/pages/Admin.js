import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Modal, Alert, Tabs, Tab, InputGroup } from 'react-bootstrap';
import { useApi } from '../contexts/ApiContext';
import { toast } from 'react-toastify';
import moment from 'moment';
import EmailComposer from '../components/EmailComposer';

// Project Form Component
const ProjectForm = ({ project, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        end_date: project.end_date ? project.end_date.split('T')[0] : ''
      });
    }
  }, [project]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Project Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter project name"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter project description"
        />
      </Form.Group>
      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {project ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </Form>
  );
};
 
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

  // Project management states
  const [projects, setProjects] = useState([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFilters, setProjectFilters] = useState({
    search: '',
    status: ''
  });
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false);
  const [showLinkMeetingModal, setShowLinkMeetingModal] = useState(false);
  const [unlinkedMeetings, setUnlinkedMeetings] = useState([]);

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
    removeMeetingParticipant,
    // Project management functions
    getAllProjects,
    getProjectDetails,
    createProject,
    updateProject,
    deleteProject,
    linkMeetingToProject,
    unlinkMeetingFromProject,
    getUnlinkedMeetings
  } = useApi();
 
  useEffect(() => {
    loadEmails();
    loadUsers();
    loadMeetings();
    loadProjects();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadEmails();
      loadUsers();
      loadMeetings();
      loadProjects();
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

  const handleUnlinkMeetingFromProject = async (meetingId, projectId, meetingTitle, projectName) => {
    if (window.confirm(`Are you sure you want to unlink meeting "${meetingTitle}" from project "${projectName}"?`)) {
      try {
        await unlinkMeetingFromProject(projectId, meetingId);
        toast.success(`Meeting "${meetingTitle}" unlinked from project "${projectName}"`);
        loadMeetings(); // Refresh the meeting list
      } catch (error) {
        console.error('Error unlinking meeting from project:', error);
        toast.error('Failed to unlink meeting from project');
      }
    }
  };

  // Project Management Functions
  const loadProjects = async () => {
    try {
      setProjectLoading(true);
      const data = await getAllProjects();
      setProjects(data || []);  // Fixed: data is already the projects array
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setProjectLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !projectFilters.search || 
      project.name.toLowerCase().includes(projectFilters.search.toLowerCase()) ||
      project.description?.toLowerCase().includes(projectFilters.search.toLowerCase());
    
    const matchesStatus = !projectFilters.status || project.status === projectFilters.status;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = async (projectData) => {
    try {
      await createProject(projectData);
      toast.success('Project created successfully');
      loadProjects();
      setShowProjectModal(false);
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleUpdateProject = async (projectId, projectData) => {
    try {
      await updateProject(projectId, projectData);
      toast.success('Project updated successfully');
      loadProjects();
      setShowProjectModal(false);
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project? This will also remove all meeting links.')) {
      try {
        await deleteProject(projectId);
        toast.success('Project deleted successfully');
        loadProjects();
      } catch (error) {
        toast.error('Failed to delete project');
      }
    }
  };

  const handleViewProjectDetails = async (project) => {
    try {
      const data = await getProjectDetails(project.id);
      setSelectedProject(data.project);
      setShowProjectDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load project details');
    }
  };

  const handleShowLinkMeeting = async (project) => {
    try {
      const data = await getUnlinkedMeetings(project.id);
      setUnlinkedMeetings(data.meetings || []);
      setSelectedProject(project);
      setShowLinkMeetingModal(true);
    } catch (error) {
      toast.error('Failed to load unlinked meetings');
    }
  };

  const handleLinkMeeting = async (meetingId) => {
    try {
      await linkMeetingToProject(selectedProject.id, meetingId);
      toast.success('Meeting linked to project successfully');
      setShowLinkMeetingModal(false);
      if (showProjectDetailsModal) {
        handleViewProjectDetails(selectedProject);
      }
    } catch (error) {
      toast.error('Failed to link meeting to project');
    }
  };

  const handleUnlinkMeeting = async (meetingId) => {
    try {
      await unlinkMeetingFromProject(selectedProject.id, meetingId);
      toast.success('Meeting unlinked from project successfully');
      handleViewProjectDetails(selectedProject);
    } catch (error) {
      toast.error('Failed to unlink meeting from project');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'on_hold': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'secondary';
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
                        <option value="manager">Manager</option>
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
                        <th>Project</th>
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
                            {meeting.project_name ? (
                              <div className="d-flex align-items-center gap-2">
                                <Badge bg="success" className="me-1">
                                  <i className="fas fa-project-diagram me-1"></i>
                                  {meeting.project_name}
                                </Badge>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleUnlinkMeetingFromProject(meeting.id, meeting.project_id, meeting.title, meeting.project_name)}
                                  title={`Unlink from ${meeting.project_name}`}
                                  className="border-0"
                                >
                                  <i className="fas fa-unlink" style={{fontSize: '0.75rem'}}></i>
                                </Button>
                              </div>
                            ) : (
                              <Badge bg="secondary">
                                <i className="fas fa-minus me-1"></i>
                                No Project
                              </Badge>
                            )}
                          </td>
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

          <Tab eventKey="projects" title={<><i className="fas fa-project-diagram me-2"></i>Project Management</>}>
            <Row className="mb-4">
              <Col md={9}>
                <Row>
                  <Col md={6}>
                    <InputGroup className="mb-3">
                      <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Search projects..."
                        value={projectFilters.search}
                        onChange={(e) => setProjectFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </InputGroup>
                  </Col>
                  <Col md={6}>
                    <Form.Select
                      value={projectFilters.status}
                      onChange={(e) => setProjectFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </Col>
                </Row>
              </Col>
              <Col md={3} className="text-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedProject(null);
                    setShowProjectModal(true);
                  }}
                >
                  <i className="fas fa-plus me-2"></i>New Project
                </Button>
              </Col>
            </Row>

            {projectLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredProjects.length > 0 ? (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.name}</strong>
                      </td>
                      <td>{project.description || 'No description'}</td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(project.status)}>
                          {project.status}
                        </Badge>
                      </td>
                      <td>{project.creator_name || 'Unknown'}</td>
                      <td>{formatDate(project.created_at)}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewProjectDetails(project)}
                          >
                            <i className="fas fa-eye me-1"></i>
                            Details
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleShowLinkMeeting(project)}
                          >
                            <i className="fas fa-link me-1"></i>
                            Link Meeting
                          </Button>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            onClick={() => {
                              setSelectedProject(project);
                              setShowProjectModal(true);
                            }}
                          >
                            <i className="fas fa-edit me-1"></i>
                            Edit
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <i className="fas fa-trash me-1"></i>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Alert variant="info" className="text-center">
                <i className="fas fa-info-circle me-2"></i>
                No projects found. Try adjusting your filters.
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
                      <option value="manager">Manager</option>
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
                    <tr>
                      <td><strong>Project:</strong></td>
                      <td>
                        {selectedMeeting.project_name ? (
                          <Badge bg="success">
                            <i className="fas fa-project-diagram me-1"></i>
                            {selectedMeeting.project_name}
                          </Badge>
                        ) : (
                          <Badge bg="secondary">
                            <i className="fas fa-minus me-1"></i>
                            No Project Linked
                          </Badge>
                        )}
                      </td>
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

      {/* Project Modal */}
      <Modal show={showProjectModal} onHide={() => setShowProjectModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedProject ? 'Edit Project' : 'Create New Project'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProjectForm
            project={selectedProject}
            onSubmit={selectedProject ? 
              (data) => handleUpdateProject(selectedProject.id, data) : 
              handleCreateProject
            }
            onCancel={() => setShowProjectModal(false)}
          />
        </Modal.Body>
      </Modal>

      {/* Project Details Modal */}
      <Modal show={showProjectDetailsModal} onHide={() => setShowProjectDetailsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-project-diagram me-2"></i>
            Project Details: {selectedProject?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <Row>
              <Col md={6}>
                <Card className="mb-4">
                  <Card.Header>
                    <h6><i className="fas fa-info-circle me-2"></i>Project Information</h6>
                  </Card.Header>
                  <Card.Body>
                    <Table borderless>
                      <tbody>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{selectedProject.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Description:</strong></td>
                          <td>{selectedProject.description || 'No description'}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <Badge bg={getStatusBadgeVariant(selectedProject.status)}>
                              {selectedProject.status}
                            </Badge>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Created By:</strong></td>
                          <td>{selectedProject.creator_name || 'Unknown'}</td>
                        </tr>
                        <tr>
                          <td><strong>Created Date:</strong></td>
                          <td>{formatDate(selectedProject.created_at)}</td>
                        </tr>
                        <tr>
                          <td><strong>Start Date:</strong></td>
                          <td>{formatDate(selectedProject.start_date)}</td>
                        </tr>
                        <tr>
                          <td><strong>End Date:</strong></td>
                          <td>{formatDate(selectedProject.end_date)}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h6><i className="fas fa-calendar-alt me-2"></i>Linked Meetings</h6>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleShowLinkMeeting(selectedProject)}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Link Meeting
                    </Button>
                  </Card.Header>
                  <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {selectedProject.meetings && selectedProject.meetings.length > 0 ? (
                      selectedProject.meetings.map((meeting) => (
                        <Card key={meeting.id} className="mb-2" style={{ backgroundColor: '#f8f9fa' }}>
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1">{meeting.title}</h6>
                                <small className="text-muted">
                                  Created by: {meeting.creator_name} | 
                                  Date: {formatDate(meeting.created_at)} |
                                  Linked: {formatDate(meeting.linked_at)}
                                </small>
                                {meeting.description && (
                                  <p className="small text-muted mt-1 mb-0">{meeting.description}</p>
                                )}
                              </div>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleUnlinkMeeting(meeting.id)}
                              >
                                <i className="fas fa-unlink"></i>
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      ))
                    ) : (
                      <Alert variant="info" className="text-center">
                        <i className="fas fa-info-circle me-2"></i>
                        No meetings linked to this project yet.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProjectDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Link Meeting Modal */}
      <Modal show={showLinkMeetingModal} onHide={() => setShowLinkMeetingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-link me-2"></i>
            Link Meeting to Project: {selectedProject?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {unlinkedMeetings.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {unlinkedMeetings.map((meeting) => (
                <Card key={meeting.id} className="mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">{meeting.title}</h6>
                        <small className="text-muted">
                          Created by: {meeting.creator_name} | Date: {formatDate(meeting.created_at)}
                        </small>
                        {meeting.description && (
                          <p className="small text-muted mt-1 mb-0">{meeting.description}</p>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleLinkMeeting(meeting.id)}
                      >
                        <i className="fas fa-link me-1"></i>
                        Link
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          ) : (
            <Alert variant="info" className="text-center">
              <i className="fas fa-info-circle me-2"></i>
              All meetings are already linked to this project or no meetings available.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLinkMeetingModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default Admin;
 
 