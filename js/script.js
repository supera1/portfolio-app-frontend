// Import API service (assuming the file is in the same directory)
import { api } from './api.js';

// DOM Elements
const calculateBtn = document.getElementById('calculate-btn');
const navLinks = document.querySelectorAll('nav ul li a');
const pages = document.querySelectorAll('.page');
const recapUserSelect = document.getElementById('recap-user');
const recapPeriodSelect = document.getElementById('recap-period');
const addAldoPortfolioBtn = document.getElementById('add-aldo-portfolio');
const addUchiePortfolioBtn = document.getElementById('add-uchie-portfolio');
const portfolioModal = document.getElementById('portfolio-modal');
const portfolioForm = document.getElementById('portfolio-form');
const closeModalBtns = document.querySelectorAll('.close-modal');
const interestMonthSelect = document.getElementById('interest-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const interestSummary = document.getElementById('interest-summary');
const portfolioInterestInput = document.getElementById('portfolio-interest');

// Chart instances
let portfolioLineChart = null;
let interestLineChart = null;
let portfolioBarChart = null;
let interestBarChart = null;
let totalPortfolioBarChart = null;
let totalInterestBarChart = null;

// Global data
const users = ['aldo', 'uchie'];
let activePortfolioId = null;

// Month names for display
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Current interest month being edited
let currentInterestMonth = 0;
// Temporary storage for monthly interest values during editing
let monthlyInterestValues = Array(12).fill(0);

// Cache of loaded portfolios (to avoid too many API calls)
const portfolioCache = {
    aldo: [],
    uchie: []
};

// Initialize the application
async function init() {
    // Add event listeners
    addAldoPortfolioBtn.addEventListener('click', () => openAddPortfolioModal('aldo'));
    addUchiePortfolioBtn.addEventListener('click', () => openAddPortfolioModal('uchie'));
    
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === portfolioModal) {
            closeModal();
        }
    });
    
    portfolioForm.addEventListener('submit', savePortfolio);
    
    // Interest month navigation
    interestMonthSelect.addEventListener('change', function() {
        currentInterestMonth = parseInt(this.value);
        updateMonthlyInterestUI();
    });
    
    prevMonthBtn.addEventListener('click', () => {
        currentInterestMonth = (currentInterestMonth - 1 + 12) % 12;
        interestMonthSelect.value = currentInterestMonth;
        updateMonthlyInterestUI();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentInterestMonth = (currentInterestMonth + 1) % 12;
        interestMonthSelect.value = currentInterestMonth;
        updateMonthlyInterestUI();
    });
    
    portfolioInterestInput.addEventListener('change', function() {
        const value = parseFloat(this.value) || 0;
        monthlyInterestValues[currentInterestMonth] = value;
        updateInterestSummary();
    });
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Toggle active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Toggle active page
            const pageId = link.getAttribute('data-page');
            pages.forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');
            
            // If navigating to recapitulation page, update it
            if (pageId === 'recapitulation') {
                updateRecapitulationPage();
            }
        });
    });
    
    recapUserSelect.addEventListener('change', updateRecapitulationPage);
    recapPeriodSelect.addEventListener('change', updateProjectionTable);
    
    // Load data from API
    try {
        await loadPortfolios();
        
        // Calculate summary and update charts
        await calculateSummary();
        updateCharts();
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Failed to load portfolio data. Please check your connection and refresh the page.');
    }
}

// Format currency (IDR)
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Load portfolios from API
async function loadPortfolios() {
    for (const user of users) {
        try {
            const portfolios = await api.getPortfolios(user);
            portfolioCache[user] = portfolios; // Update cache
            renderPortfoliosList(user, portfolios);
        } catch (error) {
            console.error(`Error loading portfolios for ${user}:`, error);
            renderPortfoliosList(user, []); // Show empty list on error
        }
    }
}

// Get portfolios (from cache or API)
async function getPortfolios(user) {
    // If we need fresh data or cache is empty
    try {
        const portfolios = await api.getPortfolios(user);
        portfolioCache[user] = portfolios; // Update cache
        return portfolios;
    } catch (error) {
        console.error(`Error fetching portfolios for ${user}:`, error);
        return portfolioCache[user] || []; // Use cache as fallback
    }
}

// Calculate total monthly interest (sum of all months)
function calculateTotalInterest(monthlyInterest) {
    if (!Array.isArray(monthlyInterest)) {
        return monthlyInterest * 12 || 0; // For backwards compatibility
    }
    return monthlyInterest.reduce((acc, val) => acc + val, 0);
}

// Update monthly interest UI
function updateMonthlyInterestUI() {
    interestMonthSelect.value = currentInterestMonth;
    portfolioInterestInput.value = monthlyInterestValues[currentInterestMonth];
    updateInterestSummary();
}

// Update interest summary display
function updateInterestSummary() {
    interestSummary.innerHTML = '';
    
    monthlyInterestValues.forEach((value, index) => {
        const monthItem = document.createElement('div');
        monthItem.className = 'interest-month-item';
        if (index === currentInterestMonth) {
            monthItem.classList.add('active');
        }
        
        monthItem.innerHTML = `
            <span>${MONTH_NAMES[index]}</span>
            <span>${formatCurrency(value)}</span>
        `;
        
        interestSummary.appendChild(monthItem);
    });
}

// Render portfolios list
function renderPortfoliosList(user, portfolios) {
    const listElement = document.getElementById(`${user}-portfolios-list`);
    listElement.innerHTML = '';
    
    if (portfolios.length === 0) {
        listElement.innerHTML = `<div class="empty-message">No portfolios added yet</div>`;
        return;
    }
    
    portfolios.forEach(portfolio => {
        const totalInterest = calculateTotalInterest(portfolio.monthlyInterest);
        
        const portfolioCard = document.createElement('div');
        portfolioCard.className = 'portfolio-card';
        portfolioCard.innerHTML = `
            <h4>${portfolio.name}</h4>
            <p>Capital: <span class="value">${formatCurrency(portfolio.capital)}</span></p>
            <p>Total Interest: <span class="value">${formatCurrency(totalInterest)}</span></p>
            ${portfolio.description ? `<p class="description">${portfolio.description}</p>` : ''}
            <div class="portfolio-actions">
                <button class="btn-icon edit" data-id="${portfolio._id}"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" data-id="${portfolio._id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        listElement.appendChild(portfolioCard);
        
        // Add event listeners to buttons
        const editBtn = portfolioCard.querySelector('.edit');
        const deleteBtn = portfolioCard.querySelector('.delete');
        
        editBtn.addEventListener('click', () => openEditPortfolioModal(user, portfolio._id));
        deleteBtn.addEventListener('click', () => deletePortfolio(user, portfolio._id));
    });
}

// Open modal to add new portfolio
function openAddPortfolioModal(user) {
    document.getElementById('modal-title').textContent = `Add New Portfolio for ${user.charAt(0).toUpperCase() + user.slice(1)}`;
    document.getElementById('portfolio-owner').value = user;
    document.getElementById('edit-portfolio-id').value = '';
    document.getElementById('portfolio-form').reset();
    
    // Initialize monthly interest values
    currentInterestMonth = 0;
    monthlyInterestValues = Array(12).fill(0);
    updateMonthlyInterestUI();
    
    portfolioModal.style.display = 'block';
}

// Open modal to edit portfolio
async function openEditPortfolioModal(user, portfolioId) {
    const portfolios = await getPortfolios(user);
    const portfolio = portfolios.find(p => p._id === portfolioId);
    
    if (!portfolio) return;
    
    document.getElementById('modal-title').textContent = `Edit Portfolio for ${user.charAt(0).toUpperCase() + user.slice(1)}`;
    document.getElementById('portfolio-owner').value = user;
    document.getElementById('edit-portfolio-id').value = portfolioId;
    document.getElementById('portfolio-name').value = portfolio.name;
    document.getElementById('portfolio-capital').value = portfolio.capital;
    document.getElementById('portfolio-description').value = portfolio.description || '';
    
    // Load monthly interest values
    currentInterestMonth = 0;
    if (Array.isArray(portfolio.monthlyInterest)) {
        monthlyInterestValues = [...portfolio.monthlyInterest];
    } else {
        // For backward compatibility with older data format
        monthlyInterestValues = Array(12).fill(portfolio.interest || 0);
    }
    
    updateMonthlyInterestUI();
    portfolioModal.style.display = 'block';
}

// Close modal
function closeModal() {
    portfolioModal.style.display = 'none';
}

// Save portfolio (add or update)
async function savePortfolio(e) {
    e.preventDefault();
    
    const owner = document.getElementById('portfolio-owner').value;
    const portfolioId = document.getElementById('edit-portfolio-id').value;
    const isEdit = portfolioId !== '';
    
    // Validate required fields
    const name = document.getElementById('portfolio-name').value;
    const capital = parseFloat(document.getElementById('portfolio-capital').value);
    
    if (!name || isNaN(capital)) {
        alert('Please fill in all required fields correctly');
        return;
    }
    
    // Prepare the data with proper structure
    const portfolioData = {
        user: owner,
        name: name,
        capital: capital,
        monthlyInterest: [...monthlyInterestValues],
        description: document.getElementById('portfolio-description').value
    };
    
    // Log what we're sending to help debug
    console.log('Sending portfolio data:', portfolioData);
    
    try {
        let result;
        
        if (isEdit) {
            // Update existing portfolio
            result = await api.updatePortfolio(portfolioId, portfolioData);
        } else {
            // Add new portfolio
            result = await api.createPortfolio(portfolioData);
        }
        
        console.log('Portfolio saved successfully:', result);
        
        // Update UI
        const portfolios = await getPortfolios(owner);
        renderPortfoliosList(owner, portfolios);
        calculateSummary();
        updateCharts();
        closeModal();
        
    } catch (error) {
        console.error('Error saving portfolio:', error);
        alert('Failed to save portfolio. Please try again. Error: ' + error.message);
    }
}

// Calculate summary for dashboard
async function calculateSummary() {
    let totalPortfolio = 0;
    let totalInterest = 0;
    let aldoPortfolio = 0;
    let aldoInterest = 0;
    let uchiePortfolio = 0;
    let uchieInterest = 0;
    
    // Calculate Aldo's totals
    const aldoPortfolios = await getPortfolios('aldo');
    aldoPortfolios.forEach(portfolio => {
        aldoPortfolio += portfolio.capital;
        
        // Handle both the new format (array) and old format (single value)
        if (Array.isArray(portfolio.monthlyInterest)) {
            aldoInterest += portfolio.monthlyInterest.reduce((acc, val) => acc + val, 0);
        } else {
            aldoInterest += (portfolio.interest || 0) * 12; // Multiply by 12 for yearly total
        }
    });
    
    // Calculate Uchie's totals
    const uchiePortfolios = await getPortfolios('uchie');
    uchiePortfolios.forEach(portfolio => {
        uchiePortfolio += portfolio.capital;
        
        // Handle both the new format (array) and old format (single value)
        if (Array.isArray(portfolio.monthlyInterest)) {
            uchieInterest += portfolio.monthlyInterest.reduce((acc, val) => acc + val, 0);
        } else {
            uchieInterest += (portfolio.interest || 0) * 12; // Multiply by 12 for yearly total
        }
    });
    
    // Calculate combined totals
    totalPortfolio = aldoPortfolio + uchiePortfolio;
    totalInterest = aldoInterest + uchieInterest;
    
    // Update UI
    document.getElementById('total-portfolio').textContent = formatCurrency(totalPortfolio);
    document.getElementById('total-interest').textContent = formatCurrency(totalInterest);
    document.getElementById('aldo-portfolio').textContent = formatCurrency(aldoPortfolio);
    document.getElementById('aldo-interest-display').textContent = formatCurrency(aldoInterest);
    document.getElementById('uchie-portfolio').textContent = formatCurrency(uchiePortfolio);
    document.getElementById('uchie-interest-display').textContent = formatCurrency(uchieInterest);
}

// Get the interest rate for a specific month
function getMonthlyInterest(portfolio, monthIndex) {
    if (Array.isArray(portfolio.monthlyInterest)) {
        // New format: use the month's interest based on the month of the year
        return portfolio.monthlyInterest[monthIndex % 12];
    } else {
        // Old format: use the single interest value
        return portfolio.interest || 0;
    }
}

// Generate projection data for a given number of months
function generateProjectionData(portfolios, months = 60) {
    const monthlyData = [];
    
    for (let i = 0; i <= months; i++) {
        let monthPortfolio = 0;
        let monthInterest = 0;
        
        portfolios.forEach(portfolio => {
            monthPortfolio += portfolio.capital;
            
            // Calculate accumulated interest based on varying monthly rates
            let accumulatedInterest = 0;
            for (let m = 0; m < i; m++) {
                accumulatedInterest += getMonthlyInterest(portfolio, m);
            }
            
            monthInterest += accumulatedInterest;
        });
        
        const totalValue = monthPortfolio + monthInterest;
        
        monthlyData.push({
            month: i,
            portfolio: monthPortfolio,
            interest: monthInterest,
            total: totalValue
        });
    }
    
    return monthlyData;
}

// Update all charts
function updateCharts() {
    // Destroy existing charts to prevent memory leaks
    if (totalPortfolioBarChart) totalPortfolioBarChart.destroy();
    if (totalInterestBarChart) totalInterestBarChart.destroy();
    
    // Create both charts
    updateTotalPortfolioBarChart();
    updateTotalInterestBarChart();
}

// Get common chart configuration settings
function getCommonChartConfig() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    font: {
                        size: 11
                    }
                }
            },
            title: {
                display: true,
                font: {
                    size: 16,
                    weight: 'bold'
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: 10
                    }
                }
            }
        }
    };
}

// Update total portfolio bar chart
function updateTotalPortfolioBarChart() {
    const ctx = document.getElementById('total-portfolio-chart').getContext('2d');
    
    // Get portfolios from cache
    const aldoPortfolios = portfolioCache.aldo || [];
    const uchiePortfolios = portfolioCache.uchie || [];
    
    // Calculate total portfolio values
    const aldoTotal = aldoPortfolios.reduce((sum, portfolio) => sum + portfolio.capital, 0);
    const uchieTotal = uchiePortfolios.reduce((sum, portfolio) => sum + portfolio.capital, 0);
    
    console.log("Portfolio values for chart:", { aldoTotal, uchieTotal });
    
    // Determine max scale for portfolio values
    const maxPortfolio = Math.max(aldoTotal, uchieTotal, 1000000);
    
    // Create chart with appropriate scale for portfolio values
    totalPortfolioBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Aldo', 'Uchie'],
            datasets: [
                {
                    label: "Portfolio Value",
                    data: [aldoTotal, uchieTotal],
                    backgroundColor: [
                        'rgba(100, 210, 255, 0.7)',
                        'rgba(162, 89, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgba(100, 210, 255, 1)',
                        'rgba(162, 89, 255, 1)'
                    ],
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    // Force a specific maximum scale for portfolio values
                    max: maxPortfolio * 1.2,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Update total interest bar chart
function updateTotalInterestBarChart() {
    const ctx = document.getElementById('total-interest-chart').getContext('2d');
    
    // Get portfolios from cache
    const aldoPortfolios = portfolioCache.aldo || [];
    const uchiePortfolios = portfolioCache.uchie || [];
    
    // Calculate total interest values
    let aldoInterest = 0;
    let uchieInterest = 0;
    
    aldoPortfolios.forEach(portfolio => {
        if (Array.isArray(portfolio.monthlyInterest)) {
            aldoInterest += portfolio.monthlyInterest.reduce((sum, val) => sum + val, 0);
        } else {
            aldoInterest += (portfolio.interest || 0) * 12; // Legacy support
        }
    });
    
    uchiePortfolios.forEach(portfolio => {
        if (Array.isArray(portfolio.monthlyInterest)) {
            uchieInterest += portfolio.monthlyInterest.reduce((sum, val) => sum + val, 0);
        } else {
            uchieInterest += (portfolio.interest || 0) * 12; // Legacy support
        }
    });
    
    console.log("Interest values for chart:", { aldoInterest, uchieInterest });
    
    // Determine max scale for interest values (use a minimum value to avoid empty chart)
    const maxInterest = Math.max(aldoInterest, uchieInterest, 100000);
    
    // Create chart with separate scale for interest values
    totalInterestBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Aldo', 'Uchie'],
            datasets: [
                {
                    label: "Annual Interest",
                    data: [aldoInterest, uchieInterest],
                    backgroundColor: [
                        'rgba(255, 107, 139, 0.7)',
                        'rgba(255, 193, 7, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 107, 139, 1)',
                        'rgba(255, 193, 7, 1)'
                    ],
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    // Force a specific maximum scale for interest values
                    max: maxInterest * 1.2,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Update recapitulation page
async function updateRecapitulationPage() {
    const selectedUser = recapUserSelect.value;
    const portfolios = await getPortfolios(selectedUser);
    
    // Render portfolios list in recapitulation page
    renderRecapPortfoliosList(selectedUser, portfolios);
    
    // Clear portfolio details if no portfolio is selected
    if (!activePortfolioId) {
        document.getElementById('portfolio-details').innerHTML = `
            <div class="no-portfolio-selected">
                <p>Select a portfolio to view details</p>
            </div>
        `;
    }
    
    // Update projection table
    updateProjectionTable();
}

// Render portfolios list in recapitulation page
function renderRecapPortfoliosList(user, portfolios) {
    const listElement = document.getElementById('recap-portfolios-list');
    listElement.innerHTML = '';
    
    if (portfolios.length === 0) {
        listElement.innerHTML = `<div class="empty-message">No portfolios added yet</div>`;
        return;
    }
    
    portfolios.forEach(portfolio => {
        const portfolioCard = document.createElement('div');
        portfolioCard.className = 'recap-portfolio-card';
        if (portfolio._id === activePortfolioId) {
            portfolioCard.classList.add('active');
        }
        
        // Calculate total interest
        const totalInterest = calculateTotalInterest(portfolio.monthlyInterest);
        
        portfolioCard.innerHTML = `
            <h4>${portfolio.name}</h4>
            <p>Capital: <span class="value">${formatCurrency(portfolio.capital)}</span></p>
            <p>Total Interest: <span class="value">${formatCurrency(totalInterest)}</span></p>
            ${portfolio.description ? `<p class="description">${portfolio.description}</p>` : ''}
        `;
        
        listElement.appendChild(portfolioCard);
        
        // Add event listener
        portfolioCard.addEventListener('click', () => {
            document.querySelectorAll('.recap-portfolio-card').forEach(card => {
                card.classList.remove('active');
            });
            portfolioCard.classList.add('active');
            activePortfolioId = portfolio._id;
            showPortfolioDetails(user, portfolio._id);
        });
    });
}

// Show portfolio details
async function showPortfolioDetails(user, portfolioId) {
    const portfolios = await getPortfolios(user);
    const portfolio = portfolios.find(p => p._id === portfolioId);
    
    if (!portfolio) return;
    
    const detailsElement = document.getElementById('portfolio-details');
    
    // Calculate projection for this portfolio
    const projectionData = generateProjectionData([portfolio], 60);
    
    // Calculate total interest after 1 year, 3 years, and 5 years
    const oneYearInterest = projectionData[12].interest;
    const threeYearInterest = projectionData[36].interest;
    const fiveYearInterest = projectionData[60].interest;
    
    // Create monthly interest table
    let monthlyInterestHtml = '<div class="monthly-interest-table"><h5>Monthly Interest Rates</h5><div class="interest-grid">';
    
    // Get monthly interest values
    const monthlyRates = Array.isArray(portfolio.monthlyInterest) 
        ? portfolio.monthlyInterest 
        : Array(12).fill(portfolio.interest || 0);
    
    // Add month headers and values
    MONTH_NAMES.forEach((month, index) => {
        monthlyInterestHtml += `
            <div class="month-name">${month}</div>
            <div class="month-value">${formatCurrency(monthlyRates[index])}</div>
        `;
    });
    
    monthlyInterestHtml += '</div></div>';
    
    // Calculate total monthly interest
    const totalMonthlyInterest = calculateTotalInterest(monthlyRates);
    
    detailsElement.innerHTML = `
        <div class="portfolio-detail-header">
            <h4 class="portfolio-detail-title">${portfolio.name}</h4>
            <div>
                <button class="btn-small edit-portfolio" data-id="${portfolio._id}">Edit</button>
            </div>
        </div>
        
        <div class="portfolio-detail-info">
            <p><span class="label">Capital:</span> <span class="value">${formatCurrency(portfolio.capital)}</span></p>
            <p><span class="label">Total Interest:</span> <span class="value">${formatCurrency(totalMonthlyInterest)}</span></p>
            <p><span class="label">Total Interest (1 Year):</span> <span class="value">${formatCurrency(oneYearInterest)}</span></p>
            <p><span class="label">Total Interest (3 Years):</span> <span class="value">${formatCurrency(threeYearInterest)}</span></p>
            <p><span class="label">Total Interest (5 Years):</span> <span class="value">${formatCurrency(fiveYearInterest)}</span></p>
        </div>
        
        ${monthlyInterestHtml}
        
        ${portfolio.description ? `
        <div class="portfolio-description">
            <h5>Description</h5>
            <p>${portfolio.description}</p>
        </div>
        ` : ''}
    `;
    
    // Add event listener to edit button
    const editBtn = detailsElement.querySelector('.edit-portfolio');
    editBtn.addEventListener('click', () => openEditPortfolioModal(user, portfolio._id));
    
    // Update projection table
    updateProjectionTable(portfolio);
}

// Update projection table
function updateProjectionTable(specificPortfolio = null) {
    const selectedUser = recapUserSelect.value;
    const selectedPeriod = recapPeriodSelect.value;
    const tableBody = document.querySelector('#recap-table tbody');
    
    tableBody.innerHTML = '';
    
    // Determine which portfolio(s) to use for projection
    let portfoliosToProject = [];
    
    if (specificPortfolio) {
        // Use specific portfolio if provided
        portfoliosToProject = [specificPortfolio];
    } else if (activePortfolioId) {
        // Use active portfolio if available
        const activePortfolio = portfolioCache[selectedUser].find(p => p._id === activePortfolioId);
        if (activePortfolio) {
            portfoliosToProject = [activePortfolio];
        }
    } else {
        // Use all portfolios for user
        portfoliosToProject = portfolioCache[selectedUser] || [];
    }
    
    if (portfoliosToProject.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No portfolio data available</td></tr>';
        return;
    }
    
    // Generate projection data
    const projectionData = generateProjectionData(portfoliosToProject);
    
    if (selectedPeriod === 'monthly') {
        // Monthly view (show every 3 months to avoid too many rows)
        for (let i = 0; i <= 60; i += 3) {
            const data = projectionData[i];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Month ${data.month}</td>
                <td>${formatCurrency(data.portfolio)}</td>
                <td>${formatCurrency(data.interest)}</td>
                <td>${formatCurrency(data.total)}</td>
            `;
            
            tableBody.appendChild(row);
        }
    } else {
        // Yearly view
        for (let i = 0; i <= 5; i++) {
            const monthIndex = i * 12;
            const data = projectionData[monthIndex];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Year ${i}</td>
                <td>${formatCurrency(data.portfolio)}</td>
                <td>${formatCurrency(data.interest)}</td>
                <td>${formatCurrency(data.total)}</td>
            `;
            
            tableBody.appendChild(row);
        }
    }
}

// Delete portfolio
async function deletePortfolio(user, portfolioId) {
    if (!confirm('Are you sure you want to delete this portfolio?')) return;
    
    try {
        await api.deletePortfolio(portfolioId);
        
        // Update UI
        const portfolios = await getPortfolios(user);
        renderPortfoliosList(user, portfolios);
        calculateSummary();
        updateCharts();
        
        // If in recapitulation page, update it
        if (document.getElementById('recapitulation').classList.contains('active')) {
            updateRecapitulationPage();
        }
    } catch (error) {
        console.error('Error deleting portfolio:', error);
        alert('Failed to delete portfolio. Please try again. Error: ' + error.message);
    }
}

// Initialize the application when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => console.error('Error initializing app:', err));
});