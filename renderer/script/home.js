import * as userManager from '../../modules/userManager.js';
import * as uiManager from '../../modules/uiRenderer.js';
import * as petManager from '../../modules/petManager.js';
import * as behaviors from '../../modules/petBehaviors.js';

export async function main() {

    const errorMessage = document.getElementById("errorMessage");

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    hideError();

    let intInterval = null;
    const electronAPI = window.electronAPI;
    let currentPet = null;
    const user = {username: 'a'};
    user.username = sessionStorage.getItem("username");
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
            currentPet = await petManager.createPet(electronAPI, user.username, petName);
            window.electronAPI.signalPetAnimation('appear');
            uiManager.hidePetNameInput();
            uiManager.renderPet(currentPet);
            startIntimacyLoop();
            userManager.incrementAchievementProgress('firstPet')
        } catch(err) {
            console.error('pet failed to generate: ' + err);
        }
    });

    document.getElementById('cancelPetNameBtn').addEventListener('click', () => {
        uiManager.hidePetNameInput();
    });

    document.getElementById('callPetBtn').addEventListener('click', async () => {
        if (currentPet) {
            setTimeout(() => {
                window.electronAPI.signalPetAnimation('appear');
                }, 300);
            uiManager.renderPet(pet);
            startIntimacyLoop();
        } else {
            try {
                if (!user) {
                    console.error('No user logged in.');
                    return;
                }
                const loadedPet = await petManager.loadPet(electronAPI);
                if (loadedPet) {
                    currentPet = loadedPet;
                    setTimeout(() => {
                        window.electronAPI.signalPetAnimation('appear');
                        }, 300);
                    uiManager.renderPet(currentPet);
                    startIntimacyLoop();
                } else {
                    showError("You don't have a pet yet!")
                    console.error("You don't have a pet yet!");
                }
            } catch (err) {
                console.error("Failed to call pet: " + err);
            }
    }
});

    document.getElementById('feed-btn').addEventListener('click', async () => {
        try{
            const updated = behaviors.feed(currentPet);
            await petManager.updateStats(electronAPI, updated);
            window.electronAPI.signalPetAnimation('feed');
            uiManager.renderPet(await currentPet);
        } catch (err) {
            console.error('failed to feed pet: ' +err);
        }

    });

    document.getElementById('killPetBtn').addEventListener('click', async () => {
        if (intInterval) clearInterval(intInterval);
        electronAPI.closePetWindow();
        electronAPI.killPet(currentPet.id);
        currentPet = null;
        uiManager.hidePet();
        showError("You just killed your pet...")
    });

    // Listen for AI chat events to update intimacy
    window.addEventListener('pet-chat', async (e) => {
        const pet = await petManager.loadPet();
        if (pet) {
            const updated = behaviors.chat(pet);
            await electronAPI.updatePetStats(updated);
            uiManager.renderPet(await petManager.loadPet());
        }
    });
    
    function startIntimacyLoop() {
        if (intInterval) clearInterval(intInterval);
    
        intInterval = setInterval(async () => {
            if (currentPet.is_dead == 1) {
                return;
            }
            const updated = behaviors.tick(currentPet);
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
