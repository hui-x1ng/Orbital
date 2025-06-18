import * as behaviors from '../modules/petBehaviors.js';
import * as petManager from '../modules/petManager.js';
import * as ui from '../modules/uiRenderer.js';

const electronAPI = window.electronAPI;

let currentUser = '';
let currentPet = null;
let intInterval = null;

const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const sidebarContainer = document.getElementById("sidebarContainer");
const loginContainer = document.getElementById("loginContainer");
const app = document.getElementById("app");
const userDisplay = document.getElementById("userDisplay");
const overlay = document.getElementById("overlay");
const mainContainer = document.getElementById("mainContainer");

toggleSidebarBtn.addEventListener('click', () => {
    const isActive = sidebarContainer.classList.contains('active');
    
    if (isActive) {
        sidebarContainer.classList.remove('active');
        toggleSidebarBtn.classList.remove('moved');
        overlay.classList.remove('active');
        mainContainer.classList.remove('shifted');
    } else {
        sidebarContainer.classList.add('active');
        toggleSidebarBtn.classList.add('moved');
        overlay.classList.add('active');
        mainContainer.classList.add('shifted');
    }
});

//dummy login
document.getElementById("loginBtn").addEventListener('click', async () => {
    // alert("logged in");
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (username === '' || password === '') {
        return;
    }

    if (password === 'petlover') {
        try {
            await window.electronAPI.registerUser({ username: username, pw: "petlover" });
            currentUser = username;
            userDisplay.textContent = username;
            loginContainer.classList.add('hidden');
            document.getElementById("loginWrapper").classList.add('hidden');
            document.getElementById("mainContainer").classList.remove('hidden');
            // document.getElementById("app").classList.remove('hidden');
            toggleSidebarBtn.classList.remove('hidden');
            sidebarContainer.classList.remove('hidden');
            // app.classList.remove('centered-container');
            // loadPet();
        } catch (err) {
            console.log(err);
        }
    }
});

document.querySelectorAll('#sidebar button[data-page]').forEach(button => {
    button.addEventListener('click', async (e) => {
        const page = e.target.getAttribute('data-page');
        console.log(page);
        
        try {
            const mainContent = document.querySelector('#mainContainer .card-content') || mainContainer;
            let response;
            if (page === 'home') {
                response = await fetch(`./index.html`);
            } else {
                response = await fetch(`./pages/${page}.html`);
            }
            if (!response.ok) {
                throw new Error(`Failed to load ${page}.html`);
            }
            const html = await response.text();
            mainContent.innerHTML = html;
        } catch (error) {
            console.error('Failed to load page:', error);
        } finally {
            closeSidebar();
        }
    });
});

function closeSidebar() {
    sidebarContainer.classList.remove('active');
    toggleSidebarBtn.classList.remove('moved');
    overlay.classList.remove('active');
    mainContainer.classList.remove('shifted');
}

document.getElementById('generatePetBtn').addEventListener('click', () => {
    const input = document.getElementById('petNameInput');
    document.getElementById('petNameContainer').classList.remove('hidden');
    setTimeout(() => input.focus(), 50);
});

document.getElementById('confirmPetNameBtn').addEventListener('click', async () => {
    const name = document.getElementById('petNameInput').value.trim();
    if (!name) return alert('Please enter a name.');

    try {
        const pet = await petManager.createPet(electronAPI, currentUser, name);
        document.getElementById('petNameContainer').classList.add('hidden');
        ui.renderPet(pet);
        electronAPI.openPetWindow();
        startIntimacyLoop();
    } catch (err) {
        console.log(err);
        petNameInput.focus();
    }
});


document.getElementById('callPetBtn').addEventListener('click', async () => {
    const pet = await petManager.loadPet(electronAPI, currentUser);
    if (pet) {
        ui.renderPet(pet);
        electronAPI.openPetWindow();
        startIntimacyLoop();
    }
})

document.getElementById('killPetBtn').addEventListener('click', killPet);

document.getElementById('feed-btn').addEventListener('click', async () => {
    if (!petManager.currentPet) return;
    const updated = behaviors.feed(petManager.currentPet);
    await electronAPI.updatePetStats(updated);
    ui.renderPet(petManager.currentPet);
});


function killPet() {
    if (intInterval) clearInterval(intInterval);
    electronAPI.closePetWindow();
    electronAPI.killPet(petManager.currentPet.id);
    document.getElementById('petDisplay').classList.add('hidden');
    alert(petManager.currentPet.name + " died.");
}

function startIntimacyLoop() {
    if (intInterval) clearInterval(intInterval);

    intInterval = setInterval(async () => {
        if (petManager.isDead()) {
            killPet();
            return;
        }
        behaviors.tick(petManager.currentPet);
        await petManager.updateStats(electronAPI, petManager.currentPet);
        ui.renderPet(petManager.currentPet);
    }, 60000);
}
