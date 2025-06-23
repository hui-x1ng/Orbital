import * as userManager from '../../modules/userManager.js';
import * as uiManager from '../../modules/uiRenderer.js';
import * as petManager from '../../modules/petManager.js';
import * as behaviors from '../../modules/petBehaviors.js';

export async function main() {


    let intInterval = null;
    const electronAPI = window.electronAPI;
    const user = userManager.loadUser();
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
        // console.log(pet);
        if (pet) {
            uiManager.renderPet(pet);
            startIntimacyLoop();
        } else {
            console.error("You don't have a pet yet!");
        }
    });

    document.getElementById('feed-btn').addEventListener('click', async () => {
        const pet = await petManager.loadPet();
        if (!pet) return;
        const updated = behaviors.feed(pet);
        console.log(updated);
        await electronAPI.updatePetStats(updated);
        uiManager.renderPet(await petManager.loadPet());
    });

    document.getElementById('killPetBtn').addEventListener('click', async () => {
        if (intInterval) clearInterval(intInterval);
        const pet = await petManager.loadPet();
        electronAPI.closePetWindow();
        electronAPI.killPet(pet.id);
        uiManager.hidePet();
        alert(pet.name + " died.");
    });
    
    function startIntimacyLoop() {
        if (intInterval) clearInterval(intInterval);
    
        intInterval = setInterval(async () => {
            if (petManager.isDead()) {
                killPet();
                return;
            }
            behaviors.tick(petManager.loadPet());
            await petManager.updateStats(electronAPI, petManager.loadPet());
            uiManager.renderPet(petManager.loadPet());
        }, 60000);
    }
};

window.addEventListener('beforeunload', () => {
  userManager.clearUser();
});

document.addEventListener('DOMContentLoaded', () => {

    main();
});
