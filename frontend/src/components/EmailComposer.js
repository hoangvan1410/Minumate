import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Tab, Tabs } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useApi } from '../contexts/ApiContext';

const EmailComposer = () => {
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    recipient_name: '',
    email_subject: '',
    email_content: '',
    tracking_enabled: true
  });
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const { sendEmail } = useApi();

  useEffect(() => {
    loadUsers();
    loadMeetings();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/meetings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUserSelect = (e) => {
    const userId = e.target.value;
    const user = users.find(u => u.id === parseInt(userId));
    if (user) {
      setEmailData(prev => ({
        ...prev,
        recipient_email: user.email,
        recipient_name: user.full_name
      }));
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setIsSending(true);

    try {
      if (!emailData.recipient_email || !emailData.email_subject || !emailData.email_content) {
        toast.error('Please fill in all required fields');
        return;
      }

      const result = await sendEmail(emailData);
      
      if (result.success) {
        toast.success('Email sent successfully!');
        // Reset form
        setEmailData({
          recipient_email: '',
          recipient_name: '',
          email_subject: '',
          email_content: '',
          tracking_enabled: true
        });
      } else {
        toast.error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const generateMeetingFollowUpTemplate = () => {
    const template = `Subject: Meeting Follow-up

Dear [Recipient Name],

I hope this email finds you well. I wanted to follow up on our recent meeting and share the key outcomes and next steps.

Meeting Summary:
- [Brief summary of the meeting]

Key Decisions:
- [List key decisions made]

Action Items:
- [List action items with owners and due dates]

Next Steps:
- [List next steps]

Please let me know if you have any questions or need clarification on any of the points discussed.

Best regards,
[Your Name]`;

    setEmailData(prev => ({
      ...prev,
      email_subject: 'Meeting Follow-up',
      email_content: template
    }));
  };

  const generateTaskReminderTemplate = () => {
    const template = `Subject: Task Reminder

Dear [Recipient Name],

This is a friendly reminder about the task assigned to you during our recent meeting.

Task Details:
- Task: [Task description]
- Due Date: [Due date]
- Priority: [Priority level]

Please let me know if you need any assistance or have questions about this task.

Best regards,
[Your Name]`;

    setEmailData(prev => ({
      ...prev,
      email_subject: 'Task Reminder',
      email_content: template
    }));
  };

  return (
    <Card className="main-card">
      <Card.Header className="bg-white py-3">
        <h5 className="mb-0">
          <i className="fas fa-envelope me-2 text-primary"></i>
          Email Composer
        </h5>
      </Card.Header>
      <Card.Body>
        <Tabs defaultActiveKey="compose" className="mb-3">
          <Tab eventKey="compose" title="Compose Email">
            <Form onSubmit={handleSendEmail}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select User (Optional)</Form.Label>
                    <Form.Select onChange={handleUserSelect}>
                      <option value="">Select a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Recipient Email *</Form.Label>
                    <Form.Control
                      type="email"
                      name="recipient_email"
                      value={emailData.recipient_email}
                      onChange={handleInputChange}
                      required
                      placeholder="recipient@example.com"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Recipient Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="recipient_name"
                      value={emailData.recipient_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Recipient Name"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Subject *</Form.Label>
                    <Form.Control
                      type="text"
                      name="email_subject"
                      value={emailData.email_subject}
                      onChange={handleInputChange}
                      required
                      placeholder="Email subject"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Email Content *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  name="email_content"
                  value={emailData.email_content}
                  onChange={handleInputChange}
                  required
                  placeholder="Email content..."
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="tracking_enabled"
                  checked={emailData.tracking_enabled}
                  onChange={handleInputChange}
                  label="Enable email tracking (open tracking)"
                />
              </Form.Group>

              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSending}
                >
                  {isSending ? 'Sending...' : 'Send Email'}
                </Button>
                <Button
                  variant="outline-secondary"
                  type="button"
                  onClick={generateMeetingFollowUpTemplate}
                >
                  Meeting Follow-up Template
                </Button>
                <Button
                  variant="outline-secondary"
                  type="button"
                  onClick={generateTaskReminderTemplate}
                >
                  Task Reminder Template
                </Button>
              </div>
            </Form>
          </Tab>

          <Tab eventKey="templates" title="Email Templates">
            <Alert variant="info">
              <h6>Available Templates:</h6>
              <ul className="mb-0">
                <li><strong>Meeting Follow-up:</strong> Standard meeting summary and action items</li>
                <li><strong>Task Reminder:</strong> Reminder for specific tasks assigned to team members</li>
              </ul>
            </Alert>
            <p>Click the template buttons in the Compose tab to use these templates.</p>
          </Tab>
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default EmailComposer;
