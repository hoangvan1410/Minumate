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
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const { analyzeAndCreateTrelloCards } = useApi();
 
  const handleAnalyze = async (transcript, projectId = null) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setSyncEnabled(false);

    try {
      // Call the new API: analyze, save to DB, and create Trello tasks
      const data = await analyzeAndCreateTrelloCards(transcript);
      console.log('API Response:', data);

      if (data.success) {
        setResults(data);
        setSyncEnabled(true);
        toast.success('Meeting transcript analyzed and Trello sync successful!');
        setTimeout(() => {
          const resultsElement = document.getElementById('results-section');
          if (resultsElement) {
            resultsElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        console.error('API Error:', data.error);
        throw new Error(data.error || 'Failed to analyze transcript');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncTrello = async () => {
    if (!results || !results.meeting_data || !results.meeting_data.transcript) return;
    setSyncLoading(true);
    try {
      const data = await analyzeAndCreateTrelloCards(
        results.meeting_data.transcript,
        results.meeting_data.title || 'Meeting Analysis',
        []
      );
      if (data.success) {
        setResults(data);
        toast.success('Synced to Trello successfully!');
        setSyncEnabled(false);
      } else {
        throw new Error(data.error || 'Failed to sync to Trello');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
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
        <TranscriptInput
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          onSyncTrello={handleSyncTrello}
          syncLoading={syncLoading}
          syncEnabled={syncEnabled}
        />

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

