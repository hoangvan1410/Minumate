import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
 
const MeetingResults = ({ results }) => {
  if (!results || !results.success) {
    if (results && results.error) {
      return (
        <Card className="main-card mb-4">
          <Card.Body>
            <div className="alert alert-danger">
              <h5>Analysis Error</h5>
              <p>{results.error}</p>
            </div>
          </Card.Body>
        </Card>
      );
    }
    return null;
  }

  // Handle both old format (for backward compatibility) and new format
  const isNewFormat = results.meeting_id !== undefined;
  
  if (isNewFormat) {
    // New API format
    return (
      <div className="fade-in">
        {/* Meeting Information */}
        <Card className="main-card mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">
              <i className="fas fa-calendar-alt me-2 text-success"></i>
              Meeting Analysis Results
            </h5>
          </Card.Header>
          <Card.Body>
            <div className="alert alert-success">
              <i className="fas fa-check-circle me-2"></i>
              Meeting analyzed successfully! Meeting ID: {results.meeting_id}
            </div>
          </Card.Body>
        </Card>

        {/* Executive Summary */}
        {results.meeting_summary && results.meeting_summary.executive_summary && (
          <Card className="main-card mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-chart-line me-2 text-primary"></i>
                Executive Summary
              </h5>
            </Card.Header>
            <Card.Body>
              <p>{results.meeting_summary.executive_summary}</p>
            </Card.Body>
          </Card>
        )}

        {/* Key Decisions */}
        {results.meeting_summary && results.meeting_summary.key_decisions && results.meeting_summary.key_decisions.length > 0 && (
          <Card className="main-card mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-check-circle me-2 text-success"></i>
                Key Decisions
              </h5>
            </Card.Header>
            <Card.Body>
              <ul>
                {results.meeting_summary.key_decisions.map((decision, index) => (
                  <li key={index}>{decision}</li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        )}

        {/* Action Items */}
        {results.meeting_summary && results.meeting_summary.action_items && results.meeting_summary.action_items.length > 0 && (
          <Card className="main-card mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-tasks me-2 text-warning"></i>
                Action Items
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="row">
                {results.meeting_summary.action_items.map((item, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    <div className="border rounded p-3">
                      <h6>{item.task}</h6>
                      {item.owner && (
                        <p className="mb-1">
                          <strong>Owner:</strong> {item.owner}
                        </p>
                      )}
                      {item.due_date && (
                        <p className="mb-1">
                          <strong>Due:</strong> {item.due_date}
                        </p>
                      )}
                      {item.priority && (
                        <Badge
                          bg={
                            item.priority === 'Critical' ? 'danger' :
                            item.priority === 'High' ? 'warning' : 'info'
                          }
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Next Steps */}
        {results.meeting_summary && results.meeting_summary.next_steps && results.meeting_summary.next_steps.length > 0 && (
          <Card className="main-card mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-arrow-right me-2 text-info"></i>
                Next Steps
              </h5>
            </Card.Header>
            <Card.Body>
              <ul>
                {results.meeting_summary.next_steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        )}

        {/* Risks & Concerns */}
        {results.meeting_summary && results.meeting_summary.risks_concerns && results.meeting_summary.risks_concerns.length > 0 && (
          <Card className="main-card mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">
                <i className="fas fa-exclamation-triangle me-2 text-danger"></i>
                Risks & Concerns
              </h5>
            </Card.Header>
            <Card.Body>
              <ul>
                {results.meeting_summary.risks_concerns.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        )}
      </div>
    );
  }

  // Old format for backward compatibility
  const { meeting_data, meeting_summary, participants } = results;
 
  return (
    <div className="fade-in">
      {/* Meeting Information */}
      <Card className="main-card mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">
            <i className="fas fa-calendar-alt me-2 text-success"></i>
            Meeting Information
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p><strong>Title:</strong> {meeting_data.title}</p>
              <p><strong>Date:</strong> {meeting_data.date}</p>
            </Col>
            <Col md={6}>
              <p><strong>Duration:</strong> {meeting_data.duration}</p>
              <p><strong>Participants:</strong></p>
              <div>
                {participants?.map((participant, index) => (
                  <span key={index} className="participant-chip">
                    {participant.name} ({participant.role})
                  </span>
                ))}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
 
      {/* Executive Summary */}
      <Card className="main-card mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">
            <i className="fas fa-chart-line me-2 text-primary"></i>
            Executive Summary
          </h5>
        </Card.Header>
        <Card.Body>
          <p>{meeting_summary.executive_summary}</p>
        </Card.Body>
      </Card>
 
      {/* Key Decisions */}
      <Card className="main-card mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">
            <i className="fas fa-check-circle me-2 text-success"></i>
            Key Decisions
          </h5>
        </Card.Header>
        <Card.Body>
          <ul>
            {meeting_summary.key_decisions?.map((decision, index) => (
              <li key={index}>{decision}</li>
            ))}
          </ul>
        </Card.Body>
      </Card>
 
      {/* Action Items */}
      <Card className="main-card mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">
            <i className="fas fa-tasks me-2 text-warning"></i>
            Action Items
          </h5>
        </Card.Header>
        <Card.Body>
          <div className="row">
            {meeting_summary.action_items?.map((item, index) => (
              <div key={index} className="col-md-6 mb-3">
                <div className="border rounded p-3">
                  <h6>{item.task}</h6>
                  <p className="mb-1">
                    <strong>Owner:</strong> {item.owner}
                  </p>
                  <p className="mb-1">
                    <strong>Due:</strong> {item.due_date}
                  </p>
                  <Badge
                    bg={
                      item.priority === 'Critical' ? 'danger' :
                      item.priority === 'High' ? 'warning' : 'info'
                    }
                  >
                    {item.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
 
      {/* Next Steps */}
      <Card className="main-card mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">
            <i className="fas fa-arrow-right me-2 text-info"></i>
            Next Steps
          </h5>
        </Card.Header>
        <Card.Body>
          <ul>
            {meeting_summary.next_steps?.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </Card.Body>
      </Card>
 
      {/* Risks & Concerns */}
      {meeting_summary.risks_concerns?.length > 0 && (
        <Card className="main-card mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">
              <i className="fas fa-exclamation-triangle me-2 text-danger"></i>
              Risks & Concerns
            </h5>
          </Card.Header>
          <Card.Body>
            <ul>
              {meeting_summary.risks_concerns.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};
 
export default MeetingResults;
 
 