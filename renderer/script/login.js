import * as userManager from '../../modules/userManager.js';

console.log('[login.js] Login script loaded');

const loginBtn = document.getElementById("loginBtn");
const errorMessage = document.getElementById("errorMessage");

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

function hideError() {
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

export async function initializeLogin() {
    console.log('[login.js] Initializing login functionality');
    const existingUser = userManager.loadUser();
    if (existingUser) {
        console.log('[login.js] User already logged in, redirecting...');
        window.location.href = '../index.html';
        return;
    }
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
}

async function handleLogin(event) {
    event.preventDefault(); 
    hideError();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (!usernameInput || !passwordInput) {
        showError('Login form elements not found');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        const response = await userManager.login(username, password);
        
        if (response && response.success) {
            sessionStorage.setItem("username", response.username);
            if (userManager.saveUser) {
                userManager.saveUser({ username: response.username });
            }
            console.log('[login.js] Login successful, redirecting...');
            window.location.href = '../index.html';
        } else {
            showError(response?.message || 'Your login/password combination did not match. Please try again.');
        }
    } catch (err) {
        console.error('[login.js] Login error:', err);
        showError('Login failed. Please try again.');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLogin);
} else {
    initializeLogin();
}

if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
}

export { userManager };