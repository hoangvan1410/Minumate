import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Tabs, Tab, Alert } from 'react-bootstrap';
import { useApi } from '../contexts/ApiContext';
import { toast } from 'react-toastify';
import moment from 'moment';

const Manager = () => {
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectMeetings, setProjectMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');

  const { getManagerProjects, getManagerMeetings, getManagerProjectDetails, getManagerProjectMeetings } = useApi();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProjects(),
        loadMeetings()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await getManagerProjects();
      setProjects(response.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadMeetings = async () => {
    try {
      const response = await getManagerMeetings();
      setMeetings(response.meetings || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    }
  };

  const handleProjectClick = async (project) => {
    try {
      setSelectedProject(project);
      const response = await getManagerProjectMeetings(project.id);
      setProjectMeetings(response.meetings || []);
    } catch (error) {
      console.error('Error loading project meetings:', error);
      toast.error('Failed to load project meetings');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'active': 'success',
      'completed': 'primary',
      'on_hold': 'warning',
      'cancelled': 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <h2 className="mb-4">Manager Dashboard</h2>
          
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-3"
          >
            <Tab eventKey="projects" title={`My Projects (${projects.length})`}>
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">My Projects</h5>
                  </div>
                  
                  {projects.length === 0 ? (
                    <Alert variant="info">
                      You haven't created any projects yet.
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((project) => (
                            <tr key={project.id}>
                              <td>{project.id}</td>
                              <td>{project.name}</td>
                              <td>{project.description || 'No description'}</td>
                              <td>{getStatusBadge(project.status)}</td>
                              <td>{moment(project.created_at).format('MMM DD, YYYY')}</td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleProjectClick(project)}
                                >
                                  View Meetings
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="meetings" title={`My Meetings (${meetings.length})`}>
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">My Meetings</h5>
                  </div>
                  
                  {meetings.length === 0 ? (
                    <Alert variant="info">
                      You haven't created any meetings yet.
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Project</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meetings.map((meeting) => (
                            <tr key={meeting.id}>
                              <td>{meeting.id}</td>
                              <td>{meeting.title}</td>
                              <td>
                                {meeting.project_name ? (
                                  <Badge bg="info">{meeting.project_name}</Badge>
                                ) : (
                                  <Badge bg="secondary">No Project</Badge>
                                )}
                              </td>
                              <td>{moment(meeting.created_at).format('MMM DD, YYYY HH:mm')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>

          {/* Project Meetings Modal/Section */}
          {selectedProject && (
            <Card className="mt-4">
              <Card.Header>
                <h5 className="mb-0">
                  Meetings for Project: {selectedProject.name}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="float-end"
                    onClick={() => setSelectedProject(null)}
                  >
                    Close
                  </Button>
                </h5>
              </Card.Header>
              <Card.Body>
                {projectMeetings.length === 0 ? (
                  <Alert variant="info">
                    No meetings are linked to this project yet.
                  </Alert>
                ) : (
                  <div className="table-responsive">
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Description</th>
                          <th>Created</th>
                          <th>Linked At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectMeetings.map((meeting) => (
                          <tr key={meeting.id}>
                            <td>{meeting.id}</td>
                            <td>{meeting.title}</td>
                            <td>{meeting.description}</td>
                            <td>{moment(meeting.created_at).format('MMM DD, YYYY HH:mm')}</td>
                            <td>{moment(meeting.linked_at).format('MMM DD, YYYY HH:mm')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Manager;
