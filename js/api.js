import config from './config.js';

// API Service Module
const API_BASE_URL = config.apiBaseUrl;

// Export API functions
export const api = {
  // Get all portfolios for a user
  async getPortfolios(user) {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/user/${user}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch portfolios: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Create a new portfolio
  async createPortfolio(portfolioData) {
    try {
      console.log('Sending portfolio data to:', `${API_BASE_URL}/portfolios`);
      console.log('Data:', JSON.stringify(portfolioData));
      
      const response = await fetch(`${API_BASE_URL}/portfolios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portfolioData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.msg || `Failed to create portfolio: ${response.status}`);
        } catch (e) {
          throw new Error(`Failed to create portfolio: ${response.status}`);
        }
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Update an existing portfolio
  async updatePortfolio(id, portfolioData) {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portfolioData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.msg || `Failed to update portfolio: ${response.status}`);
        } catch (e) {
          throw new Error(`Failed to update portfolio: ${response.status}`);
        }
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // Delete a portfolio
  async deletePortfolio(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete portfolio: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};