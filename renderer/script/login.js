import * as userManager from '../../modules/userManager.js';

const loginBtn = document.getElementById("loginBtn");
const errorMessage = document.getElementById("errorMessage");

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

if (loginBtn) {
    loginBtn.addEventListener('click', async (event) => {
        event.preventDefault(); 
        hideError();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            
            const response = await userManager.login(username, password);
            if (response.success) {
                sessionStorage.setItem("username", response.username);
                window.location.href = '../index.html';
            } else {
                showError('Your login/password combination did not match. Please try again.');
            }
        } catch (err) {
            console.error(err);
        }
    });
}
