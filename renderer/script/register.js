import * as userManager from '../../modules/userManager.js';

console.log('[register.js] Register script loaded');

const registerBtn = document.getElementById("registerBtn");
const errorMessage = document.getElementById("errorMessage");

function showError(message) {
    console.log('[register.js] Showing error:', message);
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

async function handleRegister(event) {
    console.log('[register.js] Register button clicked');
    event.preventDefault();
    hideError();
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!usernameInput || !passwordInput || !confirmPasswordInput) {
        showError('Registration form elements not found');
        return;
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    console.log('[register.js] Form values:', { 
        username: username.length, 
        password: password.length, 
        confirmPassword: confirmPassword.length 
    });

    if (!username || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }

    if (username.length < 3) {
        showError('Username must be at least 3 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    try {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';
        
        console.log('[register.js] Attempting to register user:', username);
        
        if (!window.electronAPI) {
            throw new Error('electronAPI not available');
        }
        
        console.log('[register.js] electronAPI methods available:', Object.keys(window.electronAPI));
        
        const response = await userManager.register(username, password);
        
        console.log('[register.js] Registration response:', response);
        
        if (response && response.success) {
            console.log('[register.js] Registration successful, redirecting to login...');
            
            const successMessage = document.createElement('div');
            successMessage.style.color = 'green';
            successMessage.style.fontSize = '14px';
            successMessage.style.margin = '10px 0';
            successMessage.textContent = 'Account created successfully! Redirecting to login...';
            
            if (errorMessage) {
                errorMessage.parentNode.insertBefore(successMessage, errorMessage);
            }
            
            setTimeout(() => {
                window.location.href = './login.html';
            }, 1500);
            
        } else {
            showError(response?.message || 'Registration failed. Please try again.');
        }
    } catch (err) {
        console.error('[register.js] Registration error:', err);
        
        if (err.message && err.message.includes('already exists')) {
            showError('Username already exists. Please choose a different username.');
        } else if (err.message && err.message.includes('electronAPI')) {
            showError('Application not ready. Please try again in a moment.');
        } else {
            showError('Registration failed. Please try again.');
        }
    } finally {
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[register.js] DOM loaded, binding events');
    
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
        console.log('[register.js] Register button event bound');
    } else {
        console.error('[register.js] Register button not found!');
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[register.js] Late DOM binding');
        if (registerBtn) {
            registerBtn.addEventListener('click', handleRegister);
        }
    });
} else {
    console.log('[register.js] Page already loaded, binding immediately');
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
    }
}

export { userManager };