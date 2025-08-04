import React, { createContext, useContext } from 'react';
import axios from 'axios';
 
const ApiContext = createContext();
 
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-production-domain.com'
  : 'http://localhost:8002';
 
export const ApiProvider = ({ children }) => {
 
  const analyzeTranscript = async (transcript) => {
    try {
      const formData = new FormData();
      formData.append('transcript', transcript);
     
      const response = await axios.post(`${API_BASE_URL}/analyze_ajax`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
     
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
     
      const response = await axios.post(`${API_BASE_URL}/send_email`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
     
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
 
  const value = {
    analyzeTranscript,
    sendEmail,
    getEmailStatus,
    getEmailsAdmin,
    getEmailDetails,
    cleanupEmails,
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
 
 