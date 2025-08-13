import React, { createContext, useContext } from 'react';
import axios from 'axios';
 
const ApiContext = createContext();
 
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-production-domain.com'
  : 'http://localhost:8002';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
 
export const ApiProvider = ({ children }) => {
 
  const analyzeTranscript = async (transcript, meetingTitle = "Meeting Analysis", participants = []) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const response = await axios.post(`${API_BASE_URL}/api/analyze`, {
        transcript,
        meeting_title: meetingTitle,
        participants
      }, { headers });
     
      return response.data;
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      throw new Error(error.response?.data?.detail || 'Failed to analyze transcript');
    }
  };

  // Keep backward compatibility for the old AJAX endpoint
  const analyzeTranscriptAjax = async (transcript) => {
    try {
      const formData = new FormData();
      formData.append('transcript', transcript);
     
      const headers = {
        ...getAuthHeaders()
      };

      const response = await axios.post(`${API_BASE_URL}/analyze_ajax`, formData, { headers });
     
      return response.data;
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      throw new Error(error.response?.data?.error || 'Failed to analyze transcript');
    }
  };
 
  const sendEmail = async (emailData) => {
    try {
      const formData = new FormData();
      Object.keys(emailData).forEach(key => {
        formData.append(key, emailData[key]);
      });

      const headers = {
        ...getAuthHeaders()
      };
     
      const response = await axios.post(`${API_BASE_URL}/send_email`, formData, { headers });
     
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(error.response?.data?.error || 'Failed to send email');
    }
  };
 
  const getEmailStatus = async (trackingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/email_status/${trackingId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting email status:', error);
      throw new Error(error.response?.data?.error || 'Failed to get email status');
    }
  };
 
  const getEmailsAdmin = async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await axios.get(`${API_BASE_URL}/admin/api/emails?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error getting emails:', error);
      throw new Error(error.response?.data?.error || 'Failed to get emails');
    }
  };
 
  const getEmailDetails = async (trackingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/api/email/${trackingId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting email details:', error);
      throw new Error(error.response?.data?.error || 'Failed to get email details');
    }
  };
 
  const cleanupEmails = async (days) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/api/cleanup/${days}`);
      return response.data;
    } catch (error) {
      console.error('Error cleaning up emails:', error);
      throw new Error(error.response?.data?.error || 'Failed to cleanup emails');
    }
  };

  // User Management APIs
  const getAllUsers = async () => {
    try {
      const headers = { ...getAuthHeaders() };
      const response = await axios.get(`${API_BASE_URL}/api/admin/users`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error(error.response?.data?.detail || 'Failed to get users');
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      const headers = { 
        'Content-Type': 'application/json',
        ...getAuthHeaders() 
      };
      const response = await axios.put(`${API_BASE_URL}/api/admin/users/${userId}`, userData, { headers });
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const deleteUser = async (userId) => {
    try {
      const headers = { ...getAuthHeaders() };
      const response = await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  // Meeting Management APIs
  const getAllMeetings = async () => {
    try {
      const headers = { ...getAuthHeaders() };
      const response = await axios.get(`${API_BASE_URL}/api/admin/meetings`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting meetings:', error);
      throw new Error(error.response?.data?.detail || 'Failed to get meetings');
    }
  };

  const getMeetingDetails = async (meetingId) => {
    try {
      const headers = { ...getAuthHeaders() };
      const response = await axios.get(`${API_BASE_URL}/api/admin/meetings/${meetingId}`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting meeting details:', error);
      throw new Error(error.response?.data?.detail || 'Failed to get meeting details');
    }
  };

  const createMeeting = async (meetingData) => {
    try {
      const headers = { 
        'Content-Type': 'application/json',
        ...getAuthHeaders() 
      };
      const response = await axios.post(`${API_BASE_URL}/api/admin/meetings`, meetingData, { headers });
      return response.data;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw new Error(error.response?.data?.detail || 'Failed to create meeting');
    }
  };

  const updateMeeting = async (meetingId, meetingData) => {
    try {
      const headers = { 
        'Content-Type': 'application/json',
        ...getAuthHeaders() 
      };
      const response = await axios.put(`${API_BASE_URL}/api/admin/meetings/${meetingId}`, meetingData, { headers });
      return response.data;
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update meeting');
    }
  };

  const deleteMeeting = async (meetingId) => {
    try {
      const headers = { ...getAuthHeaders() };
      const response = await axios.delete(`${API_BASE_URL}/api/admin/meetings/${meetingId}`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw new Error(error.response?.data?.detail || 'Failed to delete meeting');
    }
  };

  const addMeetingParticipant = async (meetingId, participantData) => {
    try {
      const headers = { 
        'Content-Type': 'application/json',
        ...getAuthHeaders() 
      };
      const response = await axios.post(`${API_BASE_URL}/api/admin/meetings/${meetingId}/participants`, participantData, { headers });
      return response.data;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw new Error(error.response?.data?.detail || 'Failed to add participant');
    }
  };

  const removeMeetingParticipant = async (meetingId, userId) => {
    try {
      const headers = { ...getAuthHeaders() };
      const response = await axios.delete(`${API_BASE_URL}/api/admin/meetings/${meetingId}/participants/${userId}`, { headers });
      return response.data;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw new Error(error.response?.data?.detail || 'Failed to remove participant');
    }
  };
 
  const value = {
    analyzeTranscript,
    analyzeTranscriptAjax,
    sendEmail,
    getEmailStatus,
    getEmailsAdmin,
    getEmailDetails,
    cleanupEmails,
    // User Management
    getAllUsers,
    updateUser,
    deleteUser,
    // Meeting Management
    getAllMeetings,
    getMeetingDetails,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    addMeetingParticipant,
    removeMeetingParticipant,
    API_BASE_URL
  };
 
  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};
 
export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
 
export default ApiContext;
 
 