import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Modal, Alert, Tabs, Tab } from 'react-bootstrap';
import { useApi } from '../contexts/ApiContext';
import { toast } from 'react-toastify';
import moment from 'moment';
import EmailComposer from '../components/EmailComposer';
 
const Admin = () => {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { getEmailsAdmin, getEmailDetails, cleanupEmails } = useApi();
 
  useEffect(() => {
    loadEmails();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadEmails, 30000);
    return () => clearInterval(interval);
  }, [filters, currentPage]);
 
  const loadEmails = async () => {
    try {
      setLoading(true);
      const data = await getEmailsAdmin({
        page: currentPage,
        ...filters
      });
     
      setEmails(data.emails);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };
 
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };
 
  const handleShowDetails = async (trackingId) => {
    try {
      const emailDetails = await getEmailDetails(trackingId);
      setSelectedEmail(emailDetails);
      setShowModal(true);
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
    <div>
      {/* Header */}
      <div className="app-header">
        <Container>
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="mb-0">
                <i className="fas fa-cogs me-3"></i>
                Admin Dashboard
              </h1>
              <p className="mb-0 mt-2 opacity-75">
                Email management and analytics
              </p>
            </div>
            <div className="col-md-4 text-end">
              <Button variant="light" onClick={handleCleanup}>
                <i className="fas fa-trash me-2"></i>
                Clean Emails
              </Button>
            </div>
          </div>
        </Container>
      </div>
 
      <Container>
        <Tabs defaultActiveKey="compose" className="mb-4">
          <Tab eventKey="compose" title={<><i className="fas fa-edit me-2"></i>Compose Email</>}>
            <EmailComposer />
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
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="opened">Opened</option>
                    <option value="sent">Sent Only</option>
                    <option value="clicked">Clicked</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button variant="outline-primary" onClick={loadEmails} disabled={loading}>
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
            {loading ? (
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
                          onClick={() => handleShowDetails(email.tracking_id)}
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
 
        {emails.length === 0 && !loading && (
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
          onClick={loadEmails}
          disabled={loading}
          title="Refresh Data"
        >
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
        </Button>
      </Container>
 
      {/* Email Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
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
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Admin;
 
 