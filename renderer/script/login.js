import * as userManager from '../../modules/userManager.js';

const loginBtn = document.getElementById("loginBtn");

//dummy login
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (username === '' || password === '') return;

        try {
            const user = await userManager.login(username, password);
            // localStorage.setItem('user', JSON.stringify(user));
            window.location.href = '../index.html';
        } catch (err) {
            console.error(err);
        }
    });
}
