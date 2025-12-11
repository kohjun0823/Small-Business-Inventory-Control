// Initialize Supabase Client
// IMPORTANT: Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://wfujoffqfgxeuzpealuj.supabase.co'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdWpvZmZxZmd4ZXV6cGVhbHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY2OTYsImV4cCI6MjA4MDg2MjY5Nn0.rf0FIRxnBsBrUaHE4b965mRwpFhZrkAKSR3YiOpKHAw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global user data
let currentUser = null;

// Page Navigation Functions
function showSigninPage() {
    document.getElementById('signinPage').style.display = 'flex';
    document.getElementById('signupPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'none';
}

function showSignupPage() {
    document.getElementById('signinPage').style.display = 'none';
    document.getElementById('signupPage').style.display = 'flex';
    document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
    document.getElementById('signinPage').style.display = 'none';
    document.getElementById('signupPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'flex';
    showPage('profile');
}

// Dashboard Page Navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageName + 'Content').classList.add('active');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
}

// Message Display Functions
function showMessage(elementId, message, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Sign Up Form Handler
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const businessName = document.getElementById('businessName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    // Validation
    if (!fullName || !businessName || !email || !password || !confirmPassword) {
        showMessage('signupMessage', 'Please fill in all fields.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('signupMessage', 'Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('signupMessage', 'Password must be at least 6 characters long.', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    
    try {
        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    business_name: businessName
                }
            }
        });
        
        if (authError) throw authError;
        
        // Store additional user data in a custom table
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert([
                    {
                        user_id: authData.user.id,
                        full_name: fullName,
                        business_name: businessName,
                        email: email
                    }
                ]);
            
            // If table doesn't exist, continue anyway
        }
        
        showMessage('signupMessage', 'Account created successfully! Redirecting to sign in...', 'success');
        
        // Reset form
        document.getElementById('signupForm').reset();
        
        // Redirect to sign in page after 2 seconds
        setTimeout(() => {
            showSigninPage();
        }, 2000);
        
    } catch (error) {
        showMessage('signupMessage', error.message || 'An error occurred during sign up.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
    }
});

// Sign In Form Handler
document.getElementById('signinForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('signinEmail').value.trim();
    const password = document.getElementById('signinPassword').value.trim();
    
    // Validation
    if (!email || !password) {
        showMessage('signinMessage', 'Please fill in all fields.', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';
    
    try {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Get user profile data from custom table
        const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
        
        // Fallback to auth metadata if custom table doesn't exist
        const userData = profileData || data.user.user_metadata;
        
        currentUser = {
            id: data.user.id,
            fullName: profileData?.full_name || userData.full_name || 'User',
            businessName: profileData?.business_name || userData.business_name || 'My Business',
            email: data.user.email
        };
        
        showMessage('signinMessage', 'Login successful! Loading dashboard...', 'success');
        
        // Reset form
        document.getElementById('signinForm').reset();
        
        // Load dashboard after 1 second
        setTimeout(() => {
            loadDashboard(currentUser);
            showDashboard();
        }, 1000);
        
    } catch (error) {
        showMessage('signinMessage', error.message || 'Invalid email or password.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});

// Load Dashboard with User Data
function loadDashboard(userProfile) {
    const initials = userProfile.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    
    // Update sidebar
    document.getElementById('sidebarBusiness').textContent = userProfile.businessName;
    document.getElementById('sidebarName').textContent = userProfile.fullName;
    document.getElementById('sidebarAvatar').textContent = initials;
    
    // Update profile page
    document.getElementById('profileName').textContent = userProfile.fullName;
    document.getElementById('profileBusiness').textContent = userProfile.businessName;
    document.getElementById('profileAvatar').textContent = initials;
    
    // Update settings
    document.getElementById('settingName').textContent = userProfile.fullName;
    document.getElementById('settingEmail').textContent = userProfile.email;
    document.getElementById('settingBusiness').textContent = userProfile.businessName;
    
    // Update edit form
    document.getElementById('editFullName').value = userProfile.fullName;
    document.getElementById('editEmail').value = userProfile.email;
    document.getElementById('editBusinessName').value = userProfile.businessName;
}

// Navigation Between Pages in Dashboard
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const pageName = this.dataset.page;
        showPage(pageName);
    });
});

// Logout Button Handler
document.getElementById('logoutBtn').addEventListener('click', function() {
    openModal('logoutModal');
});

// Confirm Logout
document.getElementById('confirmLogout').addEventListener('click', async function() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        closeModal('logoutModal');
        showSigninPage();
    } catch (error) {
        alert('Error logging out: ' + error.message);
    }
});

// Cancel Logout
document.getElementById('cancelLogout').addEventListener('click', function() {
    closeModal('logoutModal');
});

// Navigation Between Sign In and Sign Up
document.getElementById('goToSignup').addEventListener('click', function(e) {
    e.preventDefault();
    showSignupPage();
});

document.getElementById('goToSignin').addEventListener('click', function(e) {
    e.preventDefault();
    showSigninPage();
});

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Edit Profile Button
document.getElementById('editProfileBtn').addEventListener('click', function() {
    openModal('editProfileModal');
});

// Notification Button
document.getElementById('notificationBtn').addEventListener('click', function() {
    openModal('notificationModal');
});

// Security Button
document.getElementById('securityBtn').addEventListener('click', function() {
    openModal('securityModal');
});

// Preferences Button
document.getElementById('preferencesBtn').addEventListener('click', function() {
    openModal('preferencesModal');
});

// Help Center Button
document.getElementById('helpCenterBtn').addEventListener('click', function() {
    openModal('helpCenterModal');
});

// Close Modal Buttons
document.querySelectorAll('.modal-close, .btn-secondary[data-modal]').forEach(btn => {
    btn.addEventListener('click', function() {
        const modalId = this.dataset.modal || this.getAttribute('data-modal');
        if (modalId) {
            closeModal(modalId);
        } else {
            // Close parent modal
            this.closest('.modal').classList.remove('show');
        }
    });
});

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });
});

// Edit Profile Form Handler
document.getElementById('editProfileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const businessName = document.getElementById('editBusinessName').value.trim();
    
    if (!fullName || !email || !businessName) {
        alert('Please fill in all fields.');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
        // Update user metadata
        const { error: metaError } = await supabase.auth.updateUser({
            data: {
                full_name: fullName,
                business_name: businessName
            }
        });
        
        if (metaError) throw metaError;
        
        // Update custom profile table
        const { error: profileError } = await supabase
            .from('user_profiles')
            .update({
                full_name: fullName,
                business_name: businessName,
                email: email
            })
            .eq('user_id', currentUser.id);
        
        // Update current user object
        currentUser.fullName = fullName;
        currentUser.businessName = businessName;
        currentUser.email = email;
        
        // Reload dashboard with new data
        loadDashboard(currentUser);
        
        closeModal('editProfileModal');
        alert('Profile updated successfully!');
        
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
});

// Security Form Handler
document.getElementById('securityForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert('Please fill in all password fields.');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        alert('New passwords do not match!');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        // Reset form
        document.getElementById('securityForm').reset();
        closeModal('securityModal');
        alert('Password updated successfully!');
        
    } catch (error) {
        alert('Error updating password: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
    }
});

// Check for existing session on page load
window.addEventListener('DOMContentLoaded', async function() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // User is already logged in
        try {
            // Get user profile data from custom table
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
            
            // Fallback to auth metadata if custom table doesn't exist
            const userData = profileData || session.user.user_metadata;
            
            currentUser = {
                id: session.user.id,
                fullName: profileData?.full_name || userData.full_name || 'User',
                businessName: profileData?.business_name || userData.business_name || 'My Business',
                email: session.user.email
            };
            
            loadDashboard(currentUser);
            showDashboard();
        } catch (error) {
            console.error('Error loading user data:', error);
            showSigninPage();
        }
    } else {
        showSigninPage();
    }
});