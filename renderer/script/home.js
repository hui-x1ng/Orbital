import * as userManager from '../../modules/userManager.js';
import * as uiManager from '../../modules/uiRenderer.js';
import * as petManager from '../../modules/petManager.js';
import * as behaviors from '../../modules/petBehaviors.js';

export async function main() {
    console.log('[home.js] Initializing home page');

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

    hideError();

    let intInterval = null;
    const electronAPI = window.electronAPI;
    let currentPet = null;
    
    let user = null;
    
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
        user = { username: storedUsername };
    } else {
        const loadedUser = userManager.loadUser();
        if (loadedUser) {
            user = loadedUser;
        }
    }

    if (!user || !user.username) {
        console.log('[home.js] No user found, redirecting to login');
        window.location.href = './pages/login.html';
        return;
    }

    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = user.username;
        console.log('[home.js] Username set to:', user.username);
    } else {
        console.error('[home.js] userDisplay element not found');
    }

    const generatePetBtn = document.getElementById('generatePetBtn');
    if (generatePetBtn) {
        generatePetBtn.addEventListener('click', () => {
            hideError();
            uiManager.showPetNameInput();
        });
    }

    const confirmPetNameBtn = document.getElementById('confirmPetNameBtn');
    if (confirmPetNameBtn) {
        confirmPetNameBtn.addEventListener('click', async () => {
            const petNameInput = document.getElementById('petNameInput');
            if (!petNameInput) return;
            
            const petName = petNameInput.value.trim();
            if (!petName) {
                showError('Please enter a pet name');
                return;
            }
            
            console.log('[home.js] Creating pet:', petName);
            try {
                const petResult = await petManager.createPet(electronAPI, user.username, petName);
                
                if (petResult && petResult.success && petResult.pet) {
                    currentPet = petResult.pet;
                } else if (petResult && !petResult.success) {
                    throw new Error(petResult.message || 'Failed to create pet');
                } else {
                    currentPet = petResult;
                }
                
                if (window.electronAPI && window.electronAPI.signalPetAnimation) {
                    window.electronAPI.signalPetAnimation('appear');
                }
                
                uiManager.hidePetNameInput();
                uiManager.renderPet(currentPet);
                startIntimacyLoop();
                
                if (userManager.incrementAchievementProgress) {
                    userManager.incrementAchievementProgress('firstPet');
                }
                
                hideError();
            } catch(err) {
                console.error('[home.js] Pet creation failed:', err);
                showError('Failed to create pet: ' + err.message);
            }
        });
    }

    const cancelPetNameBtn = document.getElementById('cancelPetNameBtn');
    if (cancelPetNameBtn) {
        cancelPetNameBtn.addEventListener('click', () => {
            uiManager.hidePetNameInput();
            hideError();
        });
    }

    const callPetBtn = document.getElementById('callPetBtn');
    if (callPetBtn) {
        callPetBtn.addEventListener('click', async () => {
            hideError();
            
            if (currentPet) {
                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.signalPetAnimation) {
                        window.electronAPI.signalPetAnimation('appear');
                    }
                }, 300);
                uiManager.renderPet(currentPet);
                startIntimacyLoop();
            } else {
                try {
                    const loadedPet = await petManager.loadPet(electronAPI, user.username);
                    
                    if (loadedPet) {
                        currentPet = loadedPet;
                        setTimeout(() => {
                            if (window.electronAPI && window.electronAPI.signalPetAnimation) {
                                window.electronAPI.signalPetAnimation('appear');
                            }
                        }, 300);
                        uiManager.renderPet(currentPet);
                        startIntimacyLoop();
                    } else {
                        showError("You don't have a pet yet! Create one first.");
                        console.log('[home.js] No pet found for user');
                    }
                } catch (err) {
                    console.error('[home.js] Failed to call pet:', err);
                    showError("Failed to load your pet. Please try again.");
                }
            }
        });
    }

    const feedBtn = document.getElementById('feed-btn');
    if (feedBtn) {
        feedBtn.addEventListener('click', async () => {
            if (!currentPet) {
                showError('No pet to feed');
                return;
            }
            
            try {
                const updated = behaviors.feed(currentPet);
                await petManager.updateStats(electronAPI, updated);
                
                if (window.electronAPI && window.electronAPI.signalPetAnimation) {
                    window.electronAPI.signalPetAnimation('feed');
                }
                
                currentPet = updated;
                uiManager.renderPet(currentPet);
                hideError();
            } catch (err) {
                console.error('[home.js] Failed to feed pet:', err);
                showError('Failed to feed pet');
            }
        });
    }

    const killPetBtn = document.getElementById('killPetBtn');
    if (killPetBtn) {
        killPetBtn.addEventListener('click', async () => {
            if (!currentPet) {
                showError('No pet to remove');
                return;
            }
            
            if (!confirm('Are you sure you want to kill your pet? This action cannot be undone.')) {
                return;
            }
            
            try {
                if (intInterval) {
                    clearInterval(intInterval);
                    intInterval = null;
                }
                
                if (electronAPI.closePetWindow) {
                    electronAPI.closePetWindow();
                }
                
                await electronAPI.killPet(currentPet.id);
                currentPet = null;
                uiManager.hidePet();
                showError("Your pet has passed away...");
            } catch (err) {
                console.error('[home.js] Failed to kill pet:', err);
                showError('Failed to remove pet');
            }
        });
    }

    window.addEventListener('pet-chat', async (e) => {
        try {
            const pet = await petManager.loadPet(electronAPI, user.username);
            if (pet) {
                const updated = behaviors.chat(pet);
                await petManager.updateStats(electronAPI, updated);
                currentPet = updated;
                uiManager.renderPet(currentPet);
            }
        } catch (err) {
            console.error('[home.js] Error handling pet chat:', err);
        }
    });
    
    function startIntimacyLoop() {
        if (intInterval) {
            clearInterval(intInterval);
        }
    
        intInterval = setInterval(async () => {
            if (!currentPet || currentPet.is_dead === 1) {
                return;
            }
            
            try {
                const updated = behaviors.tick(currentPet);
                await petManager.updateStats(electronAPI, updated);
                currentPet = updated;
                uiManager.renderPet(currentPet);
            } catch (err) {
                console.error('[home.js] Error in intimacy loop:', err);
            }
        }, 60000);
    }

    console.log('[home.js] Home page initialization complete');
}

window.addEventListener('beforeunload', () => {
    if (userManager.clearUser) {
        userManager.clearUser();
    }
});

export { userManager, uiManager, petManager, behaviors };