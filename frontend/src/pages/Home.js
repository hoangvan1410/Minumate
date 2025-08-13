import React, { useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import TranscriptInput from '../components/TranscriptInput';
import MeetingResults from '../components/MeetingResults';
import EmailGeneration from '../components/EmailGeneration';
import { useApi } from '../contexts/ApiContext';
import { toast } from 'react-toastify';
 
const Home = () => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { analyzeTranscriptAjax } = useApi();
 
  const handleAnalyze = async (transcript) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      // Use the AJAX endpoint that returns participants and personalized emails
      const data = await analyzeTranscriptAjax(transcript);
      
      console.log('API Response:', data); // Debug log
     
      if (data.success) {
        setResults(data);
        toast.success('Meeting transcript analyzed successfully!');
       
        // Scroll to results
        setTimeout(() => {
          const resultsElement = document.getElementById('results-section');
          if (resultsElement) {
            resultsElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        throw new Error(data.error || 'Failed to analyze transcript');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };  return (
    <div>
      <Container className="mt-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" className="alert-custom" dismissible onClose={() => setError(null)}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Error:</strong> {error}
          </Alert>
        )}
 
        {/* Transcript Input */}
        <TranscriptInput onAnalyze={handleAnalyze} isLoading={isLoading} />
 
        {/* Results Section */}
        {results && (
          <div id="results-section">
            <MeetingResults results={results} />
            <EmailGeneration results={results} />
          </div>
        )}
 
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-5">
            <div className="loading-spinner mb-3" style={{ width: '3rem', height: '3rem' }}></div>
            <h5>Analyzing transcript...</h5>
          </div>
        )}
 
        {!results && !isLoading && (
          <div className="card main-card">
            <div className="card-body text-center py-5">
              <i className="fas fa-lightbulb fa-3x text-primary mb-3"></i>
              <h4>How It Works</h4>
              <div className="row mt-4">
                <div className="col-md-4">
                  <i className="fas fa-upload fa-2x text-success mb-3"></i>
                  <h6>1. Upload or Paste</h6>
                  <p className="text-muted">
                    Add your meeting transcript
                  </p>
                </div>
                <div className="col-md-4">
                  <i className="fas fa-brain fa-2x text-warning mb-3"></i>
                  <h6>2. AI Analysis</h6>
                  <p className="text-muted">
                    Advanced AI extracts key decisions, action items, and participant roles
                  </p>
                </div>
                <div className="col-md-4">
                  <i className="fas fa-envelope fa-2x text-info mb-3"></i>
                  <h6>3. Generate Emails</h6>
                  <p className="text-muted">
                    Personalized emails are created for each participant based on their role
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};
 
export default Home;
 
 