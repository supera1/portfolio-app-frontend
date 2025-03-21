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
      const response = await fetch(`${API_BASE_URL}/portfolios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portfolioData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
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

// Get portfolios from API
async function getPortfolios(user) {
    try {
      const portfolios = await api.getPortfolios(user);
      return portfolios;
    } catch (error) {
      console.error('Error getting portfolios:', error);
      return [];
    }
  }
  
  // Save portfolio (add or update)
  async function savePortfolio(e) {
    e.preventDefault();
    
    const owner = document.getElementById('portfolio-owner').value;
    const portfolioId = document.getElementById('edit-portfolio-id').value;
    const isEdit = portfolioId !== '';
    
    const portfolioData = {
      user: owner,
      name: document.getElementById('portfolio-name').value,
      capital: parseFloat(document.getElementById('portfolio-capital').value),
      monthlyInterest: [...monthlyInterestValues],
      description: document.getElementById('portfolio-description').value
    };
    
    let result;
    
    if (isEdit) {
      // Update existing portfolio
      result = await api.updatePortfolio(portfolioId, portfolioData);
    } else {
      // Add new portfolio
      result = await api.createPortfolio(portfolioData);
    }
    
    if (result) {
      // Update UI
      const portfolios = await getPortfolios(owner);
      renderPortfoliosList(owner, portfolios);
      calculateSummary();
      updateCharts();
      closeModal();
    }
  }
  
  // Delete portfolio
  async function deletePortfolio(user, portfolioId) {
    if (!confirm('Are you sure you want to delete this portfolio?')) return;
    
    const result = await api.deletePortfolio(portfolioId);
    
    if (result) {
      // Update UI
      const portfolios = await getPortfolios(user);
      renderPortfoliosList(user, portfolios);
      calculateSummary();
      updateCharts();
      
      // If in recapitulation page, update it
      if (document.getElementById('recapitulation').classList.contains('active')) {
        updateRecapitulationPage();
      }
    }
  }