import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Tabs, Tab, Spinner } from 'react-bootstrap';
import { useApi } from '../contexts/ApiContext';
import { toast } from 'react-toastify';
import moment from 'moment';

const Manager = () => {
  const { getManagerProjects, getManagerMeetings, getManagerProjectMeetings } = useApi();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMeetings, setProjectMeetings] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsResponse, meetingsResponse] = await Promise.all([
        getManagerProjects(),
        getManagerMeetings()
      ]);
      
      setProjects(projectsResponse.projects || []);
      setMeetings(meetingsResponse.meetings || []);
    } catch (error) {
      console.error('Error loading manager data:', error);
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectMeetings = async (projectId) => {
    try {
      const response = await getManagerProjectMeetings(projectId);
      setProjectMeetings(response.meetings || []);
    } catch (error) {
      console.error('Error loading project meetings:', error);
      toast.error('Failed to load project meetings: ' + error.message);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    loadProjectMeetings(project.id);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'active': 'success',
      'completed': 'primary',
      'on_hold': 'warning',
      'cancelled': 'danger'
    };
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <div className="mt-2">Loading your projects and meetings...</div>
      </Container>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', paddingTop: '2rem', paddingBottom: '2rem' }}>
      <Container style={{ maxWidth: '1400px' }}>
        <Row>
          <Col>
            <div className="d-flex justify-content-between align-items-center mb-5">
              <div>
                <h2 className="mb-2" style={{ fontWeight: '600', color: '#2c3e50' }}>
                  <i className="fas fa-project-diagram me-3 text-primary"></i>
                  Manager Dashboard
                </h2>
                <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
                  Manage your projects and track meeting progress
                </p>
              </div>
              <div className="d-flex gap-3">
                <Badge bg="success" className="px-3 py-2" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                  <i className="fas fa-folder me-2"></i>
                  {projects.length} Projects
                </Badge>
                <Badge bg="info" className="px-3 py-2" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                  <i className="fas fa-calendar-alt me-2"></i>
                  {meetings.length} Meetings
                </Badge>
              </div>
            </div>

            <Tabs 
              activeKey={activeTab} 
              onSelect={(k) => setActiveTab(k)} 
              className="mb-4"
              style={{ borderBottom: '2px solid #e9ecef' }}
            >
              <Tab eventKey="overview" title={
                <span style={{ fontSize: '1.05rem', padding: '0.5rem 1rem' }}>
                  <i className="fas fa-chart-line me-2"></i>Overview
                </span>
              }>
                <Row className="g-4" style={{ marginTop: '1rem' }}>
                  <Col lg={6}>
                    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '12px' }}>
                      <Card.Header className="bg-white border-0 py-4" style={{ borderRadius: '12px 12px 0 0' }}>
                        <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                          <i className="fas fa-project-diagram me-3 text-primary"></i>
                          My Projects
                        </h5>
                      </Card.Header>
                      <Card.Body className="p-4">
                        {projects.length === 0 ? (
                          <Alert variant="info" className="border-0 mb-0" style={{ backgroundColor: '#e8f4fd' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            You don't have any projects yet.
                          </Alert>
                        ) : (
                          <Table responsive hover className="mb-0">
                            <thead style={{ backgroundColor: '#f8f9fa' }}>
                              <tr>
                                <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Project Name</th>
                                <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Status</th>
                                <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Created</th>
                                <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projects.map(project => (
                                <tr key={project.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                  <td style={{ padding: '1rem', border: 'none' }}>
                                    <strong style={{ color: '#2c3e50' }}>{project.name}</strong>
                                    {project.description && (
                                      <div className="text-muted small mt-1">{project.description}</div>
                                    )}
                                  </td>
                                  <td style={{ padding: '1rem', border: 'none' }}>{getStatusBadge(project.status)}</td>
                                  <td style={{ padding: '1rem', border: 'none' }}>{moment(project.created_at).format('MMM DD, YYYY')}</td>
                                  <td style={{ padding: '1rem', border: 'none' }}>
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      onClick={() => handleProjectSelect(project)}
                                      style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}
                                    >
                                      <i className="fas fa-eye me-1"></i>
                                      View
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

                  <Col lg={6}>
                    <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '12px' }}>
                      <Card.Header className="bg-white border-0 py-4" style={{ borderRadius: '12px 12px 0 0' }}>
                        <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                          <i className="fas fa-calendar-alt me-3 text-primary"></i>
                          Recent Meetings
                        </h5>
                      </Card.Header>
                      <Card.Body className="p-4">
                        {meetings.length === 0 ? (
                          <Alert variant="info" className="border-0 mb-0" style={{ backgroundColor: '#e8f4fd' }}>
                            <i className="fas fa-info-circle me-2"></i>
                            You haven't created any meetings yet.
                          </Alert>
                        ) : (
                          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {meetings.slice(0, 5).map(meeting => (
                              <Card 
                                key={meeting.id} 
                                className="mb-3 border-0 shadow-sm" 
                                style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                              >
                                <Card.Body className="p-3">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <h6 className="mb-1" style={{ color: '#2c3e50', fontWeight: '600' }}>
                                        {meeting.title}
                                      </h6>
                                      <small className="text-muted">
                                        {moment(meeting.created_at).format('MMM DD, YYYY HH:mm')}
                                      </small>
                                      {meeting.project_name && (
                                        <div className="mt-2">
                                          <Badge bg="secondary" style={{ borderRadius: '6px' }}>
                                            📋 {meeting.project_name}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            ))}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="projects" title={
                <span style={{ fontSize: '1.05rem', padding: '0.5rem 1rem' }}>
                  <i className="fas fa-folder me-2"></i>Projects
                </span>
              }>
                <Row className="g-4" style={{ marginTop: '1rem' }}>
                  <Col lg={4}>
                    <Card className="shadow-sm border-0" style={{ borderRadius: '12px' }}>
                      <Card.Header className="bg-white border-0 py-4" style={{ borderRadius: '12px 12px 0 0' }}>
                        <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                          Select a Project
                        </h5>
                      </Card.Header>
                      <Card.Body className="p-4">
                        {projects.length === 0 ? (
                          <Alert variant="info" className="border-0">No projects available</Alert>
                        ) : (
                          <div className="list-group" style={{ borderRadius: '8px' }}>
                            {projects.map(project => (
                              <button
                                key={project.id}
                                className={`list-group-item list-group-item-action border-0 mb-2 ${
                                  selectedProject?.id === project.id ? 'active' : ''
                                }`}
                                onClick={() => handleProjectSelect(project)}
                                style={{ 
                                  borderRadius: '8px',
                                  padding: '1rem',
                                  backgroundColor: selectedProject?.id === project.id ? '#007bff' : '#f8f9fa'
                                }}
                              >
                                <div className="d-flex w-100 justify-content-between">
                                  <h6 className="mb-1" style={{ fontWeight: '600' }}>{project.name}</h6>
                                  {getStatusBadge(project.status)}
                                </div>
                                {project.description && (
                                  <p className="mb-1 small">{project.description}</p>
                                )}
                                <small>Created: {moment(project.created_at).format('MMM DD, YYYY')}</small>
                              </button>
                            ))}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col lg={8}>
                    {selectedProject ? (
                      <Card className="shadow-sm border-0" style={{ borderRadius: '12px' }}>
                        <Card.Header className="bg-white border-0 py-4" style={{ borderRadius: '12px 12px 0 0' }}>
                          <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                            <i className="fas fa-project-diagram me-3 text-primary"></i>
                            {selectedProject.name}
                          </h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                          <Row className="mb-4">
                            <Col sm={3}><strong>Status:</strong></Col>
                            <Col sm={9}>{getStatusBadge(selectedProject.status)}</Col>
                          </Row>
                          {selectedProject.description && (
                            <Row className="mb-4">
                              <Col sm={3}><strong>Description:</strong></Col>
                              <Col sm={9}>{selectedProject.description}</Col>
                            </Row>
                          )}
                          <Row className="mb-4">
                            <Col sm={3}><strong>Created:</strong></Col>
                            <Col sm={9}>{moment(selectedProject.created_at).format('MMMM DD, YYYY HH:mm')}</Col>
                          </Row>

                          <h6 className="mt-4 mb-3" style={{ fontWeight: '600', color: '#2c3e50' }}>
                            <i className="fas fa-calendar-alt me-2"></i>
                            Project Meetings ({projectMeetings.length})
                          </h6>
                          
                          {projectMeetings.length === 0 ? (
                            <Alert variant="info" className="border-0" style={{ backgroundColor: '#e8f4fd' }}>
                              <i className="fas fa-info-circle me-2"></i>
                              No meetings linked to this project yet.
                            </Alert>
                          ) : (
                            <Table responsive hover className="mb-0">
                              <thead style={{ backgroundColor: '#f8f9fa' }}>
                                <tr>
                                  <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Meeting Title</th>
                                  <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Created</th>
                                  <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Created By</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectMeetings.map(meeting => (
                                  <tr key={meeting.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                    <td style={{ padding: '1rem', border: 'none' }}>
                                      <strong style={{ color: '#2c3e50' }}>{meeting.title}</strong>
                                      {meeting.description && (
                                        <div className="text-muted small mt-1">{meeting.description}</div>
                                      )}
                                    </td>
                                    <td style={{ padding: '1rem', border: 'none' }}>
                                      {moment(meeting.created_at).format('MMM DD, YYYY HH:mm')}
                                    </td>
                                    <td style={{ padding: '1rem', border: 'none' }}>{meeting.creator_name}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          )}
                        </Card.Body>
                      </Card>
                    ) : (
                      <Card className="shadow-sm border-0" style={{ borderRadius: '12px' }}>
                        <Card.Body className="text-center text-muted p-5">
                          <i className="fas fa-hand-pointer fa-3x mb-3 text-primary"></i>
                          <h5 style={{ color: '#2c3e50', fontWeight: '600' }}>Select a project to view details</h5>
                          <p>Choose a project from the list to see its meetings and details.</p>
                        </Card.Body>
                      </Card>
                    )}
                  </Col>
                </Row>
              </Tab>

              <Tab eventKey="meetings" title={
                <span style={{ fontSize: '1.05rem', padding: '0.5rem 1rem' }}>
                  <i className="fas fa-calendar-alt me-2"></i>Meetings
                </span>
              }>
                <div style={{ marginTop: '1rem' }}>
                  <Card className="shadow-sm border-0" style={{ borderRadius: '12px' }}>
                    <Card.Header className="bg-white border-0 py-4" style={{ borderRadius: '12px 12px 0 0' }}>
                      <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                        <i className="fas fa-calendar-alt me-3 text-primary"></i>
                        All My Meetings
                      </h5>
                    </Card.Header>
                    <Card.Body className="p-4">
                      {meetings.length === 0 ? (
                        <Alert variant="info" className="border-0 mb-0" style={{ backgroundColor: '#e8f4fd' }}>
                          <i className="fas fa-info-circle me-2"></i>
                          You haven't created any meetings yet.
                        </Alert>
                      ) : (
                        <Table responsive hover className="mb-0">
                          <thead style={{ backgroundColor: '#f8f9fa' }}>
                            <tr>
                              <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Meeting Title</th>
                              <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Project</th>
                              <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Created</th>
                              <th style={{ border: 'none', padding: '1rem', fontWeight: '600' }}>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {meetings.map(meeting => (
                              <tr key={meeting.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                                <td style={{ padding: '1rem', border: 'none' }}>
                                  <strong style={{ color: '#2c3e50' }}>{meeting.title}</strong>
                                </td>
                                <td style={{ padding: '1rem', border: 'none' }}>
                                  {meeting.project_name ? (
                                    <Badge bg="secondary" style={{ borderRadius: '6px' }}>
                                      📋 {meeting.project_name}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted">No project</span>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', border: 'none' }}>
                                  {moment(meeting.created_at).format('MMM DD, YYYY HH:mm')}
                                </td>
                                <td style={{ padding: '1rem', border: 'none' }}>
                                  {meeting.description ? (
                                    <span className="text-muted">{meeting.description}</span>
                                  ) : (
                                    <span className="text-muted">No description</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </Card.Body>
                  </Card>
                </div>
              </Tab>
            </Tabs>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Manager;
