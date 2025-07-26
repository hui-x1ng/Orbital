import * as userManager from '../../modules/userManager.js';

const registerBtn = document.getElementById("registerBtn");
const errorMessage = document.getElementById("errorMessage");

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
        hideError();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        //validation
        if (username === '' || password === '' || confirmPassword === '') {
            showError('Please fill in all fields');
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
            const success = await userManager.register(username, password);
            if (success) {
                window.location.href = './login.html';
            } else {
                showError('Registration failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            showError('Registration failed. Please try again.');
        }
    });
}