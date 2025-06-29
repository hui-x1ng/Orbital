import * as userManager from '../../modules/userManager.js';
import * as uiManager from '../../modules/uiRenderer.js';
import * as petManager from '../../modules/petManager.js';
import * as behaviors from '../../modules/petBehaviors.js';

export async function main() {


    let intInterval = null;
    const electronAPI = window.electronAPI;
    const user = userManager.loadUser();
    const currentPet = null;
    if (!user) {
        window.location.href = './pages/login.html';
        return;
    }

    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = user.username;
        console.log('Username set to:', user.username);
    } else {
        console.error('userDisplay element not found');
    }

    document.getElementById('generatePetBtn').addEventListener('click', () => {
        uiManager.showPetNameInput();
    });

    document.getElementById('confirmPetNameBtn').addEventListener('click', async () => {
        const petName = document.getElementById('petNameInput').value.trim();
        console.log(petName);
        try {
            await petManager.createPet(electronAPI, user.username, petName);
            window.electronAPI.signalPetAnimation('appear');
            uiManager.hidePetNameInput();
            uiManager.renderPet(petManager.loadPet(electronAPI, user.username));
            startIntimacyLoop();
        } catch(err) {
            console.error('pet failed to generate: ' + err);
        }
    });

    document.getElementById('cancelPetNameBtn').addEventListener('click', () => {
        uiManager.hidePetNameInput();
    });

    document.getElementById('callPetBtn').addEventListener('click', async () => {
        const pet = await petManager.loadPet(electronAPI, user.username);
        if (pet) {
            setTimeout(() => {
                window.electronAPI.signalPetAnimation('appear');
                }, 300);
            uiManager.renderPet(pet);
            startIntimacyLoop();
        } else {
            console.error("You don't have a pet yet!");
        }
    });

    document.getElementById('feed-btn').addEventListener('click', async () => {
        const pet = await petManager.loadPet(electronAPI, user.username);
        if (!pet) return;
        const updated = behaviors.feed(pet);
        // console.log(updated);
        await electronAPI.updatePetStats(updated);
        window.electronAPI.signalPetAnimation('feed');
        uiManager.renderPet(await petManager.loadPet(electronAPI, user.username));
    });

    document.getElementById('killPetBtn').addEventListener('click', async () => {
        if (intInterval) clearInterval(intInterval);
        const pet = await petManager.loadPet(electronAPI, user.username);
        electronAPI.closePetWindow();
        electronAPI.killPet(pet.id);
        uiManager.hidePet();
        // console.log(pet.name + " died.");
    });
    
    function startIntimacyLoop() {
        if (intInterval) clearInterval(intInterval);
    
        intInterval = setInterval(async () => {
            if (petManager.isDead()) {
                return;
            }
            const pet = await petManager.loadPet(electronAPI, user.username);
            const updated = behaviors.tick(pet);
            await petManager.updateStats(electronAPI, updated);
            uiManager.renderPet(updated);
        }, 60000);
    }
};

window.addEventListener('beforeunload', () => {
  userManager.clearUser();
});

// document.addEventListener('DOMContentLoaded', () => {
//     main();
// });
