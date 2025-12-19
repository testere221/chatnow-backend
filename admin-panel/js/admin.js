// Admin Panel JavaScript
let authToken = localStorage.getItem('adminToken');
let currentPage = 1;
let currentSection = 'dashboard';

// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (authToken) {
        showAdminPanel();
        loadDashboard();
    } else {
        showLoginScreen();
    }
    
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);
        });
    });
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.data.token;
            localStorage.setItem('adminToken', authToken);
            showAdminPanel();
            loadDashboard();
        } else {
            alert('Giriş başarısız: ' + data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Giriş sırasında hata oluştu');
    }
}

// Show/Hide Functions
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('adminPanel').classList.add('d-none');
}

function showAdminPanel() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('adminPanel').classList.remove('d-none');
}

// Navigation
function switchSection(section) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('[id$="Section"]').forEach(sec => {
        sec.classList.add('d-none');
    });
    
    // Show selected section
    document.getElementById(`${section}Section`).classList.remove('d-none');
    
    currentSection = section;
    
    // Load section data
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'messages':
            loadMessages();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStats(data.data);
            createCharts(data.data);
        } else {
            console.error('Stats error:', data.message);
        }
    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

function updateStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
    document.getElementById('onlineUsers').textContent = stats.onlineUsers || 0;
    document.getElementById('totalMessages').textContent = stats.totalMessages || 0;
    document.getElementById('totalChats').textContent = stats.totalChats || 0;
}

function createCharts(stats) {
    // Gender Chart
    const genderCtx = document.getElementById('genderChart').getContext('2d');
    new Chart(genderCtx, {
        type: 'doughnut',
        data: {
            labels: stats.genderStats?.map(item => item._id === 'male' ? 'Erkek' : 'Kadın') || ['Erkek', 'Kadın'],
            datasets: [{
                data: stats.genderStats?.map(item => item.count) || [0, 0],
                backgroundColor: ['#667eea', '#f093fb']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Age Chart
    const ageCtx = document.getElementById('ageChart').getContext('2d');
    new Chart(ageCtx, {
        type: 'bar',
        data: {
            labels: stats.ageStats?.map(item => item._id) || ['18-25', '25-35', '35-45', '45-55', '55-65', '65+'],
            datasets: [{
                label: 'Kullanıcı Sayısı',
                data: stats.ageStats?.map(item => item.count) || [0, 0, 0, 0, 0, 0],
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Users
async function loadUsers(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/admin/users?page=${page}&limit=20`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUsers(data.data.users);
            currentPage = page;
        } else {
            console.error('Users error:', data.message);
        }
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user._id.substring(0, 8)}...</td>
            <td>${user.name} ${user.surname}</td>
            <td>${user.email}</td>
            <td>${user.age}</td>
            <td>
                <span class="badge ${user.gender === 'male' ? 'bg-primary' : 'bg-pink'}">
                    ${user.gender === 'male' ? 'Erkek' : 'Kadın'}
                </span>
            </td>
            <td>
                <span class="badge ${user.is_online ? 'bg-success' : 'bg-secondary'}">
                    ${user.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}
                </span>
            </td>
            <td>${user.diamonds}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewUser('${user._id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="editUser('${user._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Messages
async function loadMessages(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/admin/messages?page=${page}&limit=20`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayMessages(data.data.messages);
        } else {
            console.error('Messages error:', data.message);
        }
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function displayMessages(messages) {
    const tbody = document.getElementById('messagesTableBody');
    tbody.innerHTML = '';
    
    messages.forEach(message => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${message._id.substring(0, 8)}...</td>
            <td>${message.sender_id?.name || 'Bilinmeyen'}</td>
            <td>${message.receiver_id?.name || 'Bilinmeyen'}</td>
            <td>${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}</td>
            <td>${new Date(message.timestamp).toLocaleString('tr-TR')}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMessage('${message._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// User Actions
function viewUser(userId) {
    // Implement user view modal
    console.log('View user:', userId);
}

function editUser(userId) {
    // Implement user edit modal
    console.log('Edit user:', userId);
}

async function deleteUser(userId) {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Kullanıcı başarıyla silindi');
                loadUsers(currentPage);
            } else {
                alert('Hata: ' + data.message);
            }
        } catch (error) {
            console.error('Delete user error:', error);
            alert('Kullanıcı silinirken hata oluştu');
        }
    }
}

// Message Actions
async function deleteMessage(messageId) {
    if (confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
        try {
            const response = await fetch(`${API_BASE}/admin/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Mesaj başarıyla silindi');
                loadMessages(currentPage);
            } else {
                alert('Hata: ' + data.message);
            }
        } catch (error) {
            console.error('Delete message error:', error);
            alert('Mesaj silinirken hata oluştu');
        }
    }
}

// Search
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value;
    // Implement search functionality
    console.log('Search users:', searchTerm);
}

// Refresh
function refreshStats() {
    loadDashboard();
}

// Settings
function loadSettings() {
    console.log('Load settings');
}

// Logout
function logout() {
    localStorage.removeItem('adminToken');
    authToken = null;
    showLoginScreen();
}
