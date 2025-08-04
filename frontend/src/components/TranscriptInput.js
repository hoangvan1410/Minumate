import React, { useState } from 'react';
import { Card, Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import { toast } from 'react-toastify';
 
const TranscriptInput = ({ onAnalyze, isLoading }) => {
  const [transcript, setTranscript] = useState('');
  const [file, setFile] = useState(null);
 
  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/plain') {
        toast.error('Please select a .txt file');
        return;
      }
     
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
        toast.error('File size must be less than 5MB');
        return;
      }
 
      const reader = new FileReader();
      reader.onload = (e) => {
        setTranscript(e.target.result);
        setFile(selectedFile);
        toast.success(`File "${selectedFile.name}" loaded successfully`);
      };
      reader.readAsText(selectedFile);
    }
  };
 
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transcript.trim()) {
      toast.error('Please enter or upload a meeting transcript');
      return;
    }
    onAnalyze(transcript);
  };
 
  const loadSampleData = () => {
    const sampleTranscript = `Meeting: Q4 Planning Session
Date: August 2, 2025
Duration: 90 minutes
Participants: John Smith (PM), Sarah Johnson (Dev Lead), Mike Davis (Designer), Emily Brown (QA)
 
[Meeting begins]
 
John: Good morning everyone. Let's start our Q4 planning session. We have several critical projects to discuss.
 
Sarah: I've reviewed the technical requirements for the new user dashboard. We'll need about 6 weeks for full implementation, including backend API changes and frontend redesign.
 
Mike: From a design perspective, I've prepared mockups for the dashboard. The new interface should improve user engagement by at least 25% based on our UX research.
 
Emily: I want to flag that we'll need additional time for comprehensive testing, especially for the API integrations. I recommend we allocate 2 weeks for thorough QA testing.
 
John: That's a valid concern, Emily. Let's make sure we have proper testing coverage. Sarah, can you provide a detailed timeline breakdown?
 
Sarah: Absolutely. Week 1-2: Backend API development, Week 3-4: Frontend integration, Week 5: Initial testing and bug fixes, Week 6: Final polish and deployment preparation.
 
Mike: I'll need feedback on the designs by next Friday to stay on schedule. Also, we should discuss the mobile responsiveness requirements.
 
Emily: I'll create comprehensive test cases for each feature. We should also consider automated testing for the API endpoints.
 
John: Great. Let's also discuss the budget implications. This project will require additional cloud resources for the new features.
 
[Meeting continues with detailed technical discussions]
 
Action items:
- Sarah: Provide detailed technical specifications by August 9th
- Mike: Finalize designs and gather stakeholder feedback by August 9th  
- Emily: Create comprehensive test plan by August 12th
- John: Secure additional budget approval for cloud resources
 
Next meeting: August 16th to review progress and address any blockers.
 
[Meeting ends]`;
   
    setTranscript(sampleTranscript);
    setFile(null);
    toast.info('Sample meeting transcript loaded');
  };
 
  return (
    <Card className="main-card">
      <Card.Header className="bg-white py-3">
        <h5 className="mb-0">
          <i className="fas fa-microphone me-2 text-primary"></i>
          Meeting Transcript Input
        </h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <div className="mb-3">
            <FloatingLabel controlId="floatingTextarea" label="Meeting Transcript">
              <Form.Control
                as="textarea"
                placeholder="Paste your meeting transcript here..."
                style={{ height: '200px' }}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={isLoading}
              />
            </FloatingLabel>
          </div>
 
          <div className="mb-3">
            <Form.Label>
              <i className="fas fa-upload me-2"></i>
              Or upload a .txt file
            </Form.Label>
            <Form.Control
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            {file && (
              <Form.Text className="text-success">
                <i className="fas fa-check me-1"></i>
                File loaded: {file.name}
              </Form.Text>
            )}
          </div>
 
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading || !transcript.trim()}
              className="flex-grow-1"
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner me-2"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fas fa-search me-2"></i>
                  Analyze Meeting Transcript
                </>
              )}
            </Button>
           
            <Button
              variant="outline-primary"
              onClick={loadSampleData}
              disabled={isLoading}
            >
              <i className="fas fa-file-text me-2"></i>
              Load Sample
            </Button>
          </div>
        </Form>
 
        <Alert variant="info" className="mt-3 alert-custom">
          <i className="fas fa-info-circle me-2"></i>
          <strong>How it works:</strong> The AI will automatically extract meeting details,
          participant roles, and generate personalized emails for each attendee based on
          their responsibilities and involvement.
        </Alert>
      </Card.Body>
    </Card>
  );
};
 
export default TranscriptInput;
 
 