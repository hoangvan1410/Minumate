import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useApi } from '../contexts/ApiContext';
import './EmailGeneration.css';
 
const EmailGeneration = ({ results }) => {
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [currentEmail, setCurrentEmail] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    recipient_email: '',
    recipient_name: ''
  });
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { sendEmail } = useApi();
 
  if (!results || !results.success) {
    return null;
  }

  // For new API format, we don't have personalized emails yet
  // We could implement this feature later or use the old endpoint
  if (results.meeting_id !== undefined) {
    return (
      <Card className="main-card mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">
            <i className="fas fa-envelope me-2 text-primary"></i>
            Email Generation
          </h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            <i className="fas fa-info-circle me-2"></i>
            Email generation for the new meeting analysis format is coming soon. 
            The meeting has been saved with ID: {results.meeting_id}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Handle old format for backward compatibility
  if (!results.participants || !results.personalized_emails) {
    return null;
  }

  const { personalized_emails, participants } = results;

  const handleParticipantSelect = (name) => {
    setSelectedParticipant(name);
    const email = personalized_emails[name];
    const participant = participants.find(p => p.name === name);    if (email && participant) {
      setCurrentEmail(email);
      setEmailData({
        subject: email.subject,
        content: email.content,
        recipient_email: participant.email || `${participant.name.split(' ')[0].toLowerCase()}@company.com`,
        recipient_name: participant.name
      });
      setIsEditing(false);
    }
  };
 
  const handleEdit = () => {
    setIsEditing(true);
  };
 
  const handleSave = () => {
    setIsEditing(false);
    setCurrentEmail({
      ...currentEmail,
      subject: emailData.subject,
      content: emailData.content
    });
    toast.success('Email updated successfully');
  };
 
  const handleCancel = () => {
    setIsEditing(false);
    if (currentEmail) {
      setEmailData({
        ...emailData,
        subject: currentEmail.subject,
        content: currentEmail.content
      });
    }
  };
 
  const handleSendEmail = async () => {
    if (!emailData.recipient_email || !emailData.subject || !emailData.content) {
      toast.error('Please fill in all email fields');
      return;
    }
 
    setIsSending(true);
    try {
      const response = await sendEmail({
        recipient_email: emailData.recipient_email,
        recipient_name: emailData.recipient_name,
        email_subject: emailData.subject,
        email_content: emailData.content,
        tracking_enabled: trackingEnabled
      });
 
      if (response.success) {
        toast.success(response.message);
        toast.info(`Tracking ID: ${response.tracking_id}`, { autoClose: 10000 });
      } else {
        toast.error('Failed to send email');
      }
    } catch (error) {
      toast.error(`Error sending email: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };
 
  return (
    <Card className="main-card fade-in">
      <Card.Header className="bg-white py-3">
        <h5 className="mb-0">
          <i className="fas fa-envelope me-2 text-primary"></i>
          Personalized Email Generation
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4}>
            <h6>Select Participant:</h6>
            <div className="list-group">
              {participants.map((participant) => (
                <button
                  key={participant.name}
                  className={`list-group-item list-group-item-action ${selectedParticipant === participant.name ? 'active' : ''}`}
                  onClick={() => handleParticipantSelect(participant.name)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{participant.name}</strong>
                      <br />
                      <small>{participant.role}</small>
                    </div>
                    <Badge bg={
                      participant.email_preference === 'executive' ? 'primary' :
                      participant.email_preference === 'action' ? 'warning' :
                      'info'
                    }>
                      {participant.email_preference}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </Col>
 
          <Col md={8}>
            {currentEmail ? (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Email Preview</h6>
                  <div>
                    {!isEditing ? (
                      <Button variant="outline-primary" size="sm" onClick={handleEdit}>
                        <i className="fas fa-edit me-1"></i>
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button variant="success" size="sm" onClick={handleSave} className="me-2">
                          <i className="fas fa-save me-1"></i>
                          Save
                        </Button>
                        <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
                          <i className="fas fa-times me-1"></i>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
 
                <Form>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Recipient Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={emailData.recipient_name}
                          onChange={(e) => setEmailData({...emailData, recipient_name: e.target.value})}
                          disabled={!isEditing}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Recipient Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={emailData.recipient_email}
                          onChange={(e) => setEmailData({...emailData, recipient_email: e.target.value})}
                          disabled={!isEditing}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
 
                  <Form.Group className="mb-3">
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                      disabled={!isEditing}
                    />
                  </Form.Group>
 
                  <Form.Group className="mb-3">
                    <Form.Label>Email Content</Form.Label>
                    {isEditing ? (
                      <Form.Control
                        as="textarea"
                        rows={12}
                        value={emailData.content}
                        onChange={(e) => setEmailData({...emailData, content: e.target.value})}
                      />
                    ) : (
                      <div className="email-preview">
                        {emailData.content.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </Form.Group>
 
                  <div className="email-actions">
                    <Row className="align-items-center">
                      <Col md={6}>
                        <Form.Check
                          type="checkbox"
                          id="tracking-enabled"
                          label="Enable email tracking (open/click tracking)"
                          checked={trackingEnabled}
                          onChange={(e) => setTrackingEnabled(e.target.checked)}
                        />
                      </Col>
                      <Col md={6} className="text-end">
                        <Button
                          variant="success"
                          onClick={handleSendEmail}
                          disabled={isSending || isEditing}
                        >
                          {isSending ? (
                            <>
                              <span className="loading-spinner me-2"></span>
                              Sending...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane me-2"></i>
                              Send Email
                            </>
                          )}
                        </Button>
                      </Col>
                    </Row>
                  </div>
                </Form>
 
                {trackingEnabled && (
                  <Alert variant="info" className="mt-3 alert-custom">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>Email Tracking:</strong> This email will include tracking pixels
                    and links to monitor delivery and engagement. Tracking reliability varies
                    by email client (Gmail ~20-40%, Business emails ~60-80%).
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                <i className="fas fa-envelope-open fa-3x mb-3"></i>
                <p>Select a participant to view their personalized email</p>
              </div>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};
 
export default EmailGeneration;
 
 