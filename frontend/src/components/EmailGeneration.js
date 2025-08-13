import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useApi } from '../contexts/ApiContext';
import './EmailGeneration.css';
 
const EmailGeneration = ({ results }) => {
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState(new Set()); // For bulk sending
  const [currentEmail, setCurrentEmail] = useState(null);
  const [editedEmails, setEditedEmails] = useState({}); // Store edited email data persistently
  const [isEditing, setIsEditing] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    recipient_email: '',
    recipient_name: ''
  });
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const { sendEmail } = useApi();
 
  if (!results || !results.success) {
    return null;
  }

  // Check if we have personalized emails (works with both old and new format)
  if (!results.personalized_emails || !results.participants) {
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
            {results.meeting_id ? 
              `Email generation ready! Meeting saved with ID: ${results.meeting_id}` :
              'No email data available from the analysis.'
            }
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  const { personalized_emails, participants } = results;

  const handleParticipantSelect = (name) => {
    setSelectedParticipant(name);
    
    // Use edited email if available, otherwise use original
    const originalEmail = personalized_emails[name];
    const editedEmail = editedEmails[name];
    const email = editedEmail || originalEmail;
    
    const participant = participants.find(p => p.name === name);
    if (email && participant) {
      setCurrentEmail(email);
      setEmailData({
        subject: email.subject,
        content: email.content,
        recipient_email: editedEmail?.recipient_email || participant.email || `${participant.name.split(' ')[0].toLowerCase()}@company.com`,
        recipient_name: editedEmail?.recipient_name || participant.name
      });
      setIsEditing(false);
    }
  };

  const handleParticipantToggle = (name) => {
    const newSelected = new Set(selectedParticipants);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedParticipants(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.name)));
    }
  };
 
  const handleEdit = () => {
    setIsEditing(true);
  };
 
  const handleSave = () => {
    setIsEditing(false);
    
    // Create updated email object
    const updatedEmail = {
      ...currentEmail,
      subject: emailData.subject,
      content: emailData.content,
      recipient_email: emailData.recipient_email,
      recipient_name: emailData.recipient_name
    };
    
    // Save to edited emails state
    setEditedEmails(prev => ({
      ...prev,
      [selectedParticipant]: updatedEmail
    }));
    
    // Update current email
    setCurrentEmail(updatedEmail);
    
    toast.success('Email updated successfully');
  };
 
  const handleCancel = () => {
    setIsEditing(false);
    if (currentEmail) {
      setEmailData({
        subject: currentEmail.subject,
        content: currentEmail.content,
        recipient_email: currentEmail.recipient_email || emailData.recipient_email,
        recipient_name: currentEmail.recipient_name || emailData.recipient_name
      });
    }
  };

  const handleResetEmail = () => {
    if (selectedParticipant) {
      // Remove from edited emails to restore original
      const newEditedEmails = { ...editedEmails };
      delete newEditedEmails[selectedParticipant];
      setEditedEmails(newEditedEmails);
      
      // Reload the original email
      const originalEmail = personalized_emails[selectedParticipant];
      const participant = participants.find(p => p.name === selectedParticipant);
      
      if (originalEmail && participant) {
        setCurrentEmail(originalEmail);
        setEmailData({
          subject: originalEmail.subject,
          content: originalEmail.content,
          recipient_email: participant.email || `${participant.name.split(' ')[0].toLowerCase()}@company.com`,
          recipient_name: participant.name
        });
        toast.success('Email reset to original version');
      }
    }
  };
 
  const handleSendEmail = async () => {
    if (!emailData.recipient_email || !emailData.subject || !emailData.content) {
      toast.error('Please fill in all email fields');
      return;
    }
 
    setIsSending(true);
    try {
      // Prepare email data with meeting context
      const emailPayload = {
        recipient_email: emailData.recipient_email,
        recipient_name: emailData.recipient_name,
        email_subject: emailData.subject,
        email_content: emailData.content,
        tracking_enabled: trackingEnabled
      };

      // Add meeting ID if available
      if (results.meeting_id) {
        emailPayload.meeting_id = results.meeting_id;
      }

      // Find relevant tasks for this participant
      if (results.meeting_summary && results.meeting_summary.action_items) {
        const participantTasks = results.meeting_summary.action_items
          .filter(item => item.owner && item.owner.toLowerCase().includes(emailData.recipient_name.toLowerCase()))
          .map(item => item.task);
        
        if (participantTasks.length > 0) {
          // Note: We'll need to get actual task IDs from the backend
          // For now, we'll let the backend handle task assignment based on name matching
          emailPayload.participant_tasks = participantTasks.join(', ');
        }
      }

      const response = await sendEmail(emailPayload);
 
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

  const handleBulkSendEmails = async () => {
    if (selectedParticipants.size === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    setIsBulkSending(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Send emails to all selected participants
      for (const participantName of selectedParticipants) {
        try {
          // Use edited email if available, otherwise use original
          const originalEmail = personalized_emails[participantName];
          const editedEmail = editedEmails[participantName];
          const email = editedEmail || originalEmail;
          
          const participant = participants.find(p => p.name === participantName);
          
          if (!email || !participant) {
            console.error(`No email or participant data found for ${participantName}`);
            errorCount++;
            continue;
          }

          const emailPayload = {
            recipient_email: editedEmail?.recipient_email || participant.email || `${participant.name.split(' ')[0].toLowerCase()}@company.com`,
            recipient_name: editedEmail?.recipient_name || participant.name,
            email_subject: email.subject,
            email_content: email.content,
            tracking_enabled: trackingEnabled
          };

          // Add meeting ID if available
          if (results.meeting_id) {
            emailPayload.meeting_id = results.meeting_id;
          }

          // Find relevant tasks for this participant
          if (results.meeting_summary && results.meeting_summary.action_items) {
            const participantTasks = results.meeting_summary.action_items
              .filter(item => item.owner && item.owner.toLowerCase().includes(participant.name.toLowerCase()))
              .map(item => item.task);
            
            if (participantTasks.length > 0) {
              emailPayload.participant_tasks = participantTasks.join(', ');
            }
          }

          const response = await sendEmail(emailPayload);
          
          if (response.success) {
            successCount++;
            console.log(`Email sent successfully to ${participantName}`);
          } else {
            errorCount++;
            console.error(`Failed to send email to ${participantName}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error sending email to ${participantName}:`, error);
        }
      }

      // Show summary results
      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} email(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to send ${errorCount} email(s)`);
      }

      // Clear selections after bulk send
      setSelectedParticipants(new Set());

    } catch (error) {
      toast.error(`Bulk send failed: ${error.message}`);
    } finally {
      setIsBulkSending(false);
    }
  };
 
  return (
    <Card className="main-card fade-in">
      <Card.Header className="bg-white py-3">
        <Row className="align-items-center">
          <Col>
            <h5 className="mb-0">
              <i className="fas fa-envelope me-2 text-primary"></i>
              Personalized Email Generation
            </h5>
          </Col>
          <Col xs="auto">
            {selectedParticipants.size > 0 && (
              <Button
                variant="success"
                onClick={handleBulkSendEmails}
                disabled={isBulkSending || isEditing}
                size="sm"
              >
                {isBulkSending ? (
                  <>
                    <span className="loading-spinner me-2"></span>
                    Sending {selectedParticipants.size} emails...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    Send Selected ({selectedParticipants.size})
                  </>
                )}
              </Button>
            )}
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Select Participants:</h6>
              <div>
                <Form.Check
                  type="checkbox"
                  id="select-all"
                  label="Select All"
                  checked={selectedParticipants.size === participants.length && participants.length > 0}
                  onChange={handleSelectAll}
                  size="sm"
                />
              </div>
            </div>
            <div className="list-group participant-selection">
              {participants.map((participant) => (
                <div
                  key={participant.name}
                  className={`list-group-item ${selectedParticipant === participant.name ? 'active' : ''}`}
                >
                  <div className="d-flex align-items-center">
                    <Form.Check
                      type="checkbox"
                      id={`participant-${participant.name}`}
                      checked={selectedParticipants.has(participant.name)}
                      onChange={() => handleParticipantToggle(participant.name)}
                      className="me-3"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div 
                      className="flex-grow-1 cursor-pointer"
                      onClick={() => handleParticipantSelect(participant.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>
                            {participant.name}
                            {editedEmails[participant.name] && (
                              <i className="fas fa-edit ms-2 text-warning" title="Email has been edited"></i>
                            )}
                          </strong>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedParticipants.size > 0 && (
              <Alert variant="info" className="mt-3">
                <i className="fas fa-info-circle me-2"></i>
                <strong>{selectedParticipants.size}</strong> participant(s) selected for bulk sending
              </Alert>
            )}
          </Col>
 
          <Col md={8}>
            {currentEmail ? (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Email Preview</h6>
                  <div>
                    {!isEditing ? (
                      <>
                        <Button variant="outline-primary" size="sm" onClick={handleEdit} className="me-2">
                          <i className="fas fa-edit me-1"></i>
                          Edit
                        </Button>
                        {editedEmails[selectedParticipant] && (
                          <Button variant="outline-danger" size="sm" onClick={handleResetEmail}>
                            <i className="fas fa-undo me-1"></i>
                            Reset
                          </Button>
                        )}
                      </>
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
 
 