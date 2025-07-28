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
        console.error('[home.js] Error:', message);
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    // Enhanced pet validation function
    function validatePet(pet) {
        if (!pet) {
            console.warn('[home.js] Pet is null/undefined');
            return null;
        }
        
        if (!pet.id) {
            console.warn('[home.js] Pet missing ID');
            return null;
        }
        
        if (pet.is_dead === 1) {
            console.warn('[home.js] Pet is dead');
            return null;
        }
        
        // Ensure numeric values are valid
        const validatedPet = {
            ...pet,
            hp: Math.max(0, Math.min(100, parseInt(pet.hp) || 0)),
            intimacy: Math.max(0, Math.min(100, parseInt(pet.intimacy) || 50)),
            age: parseInt(pet.age) || 0
        };
        
        console.log('[home.js] Pet validated:', validatedPet);
        return validatedPet;
    }

    // Enhanced pet loading with error handling
    async function loadCurrentPet(username) {
        try {
            console.log('[home.js] Loading pet for user:', username);
            const loadedPet = await petManager.loadPet(electronAPI, username);
            
            if (!loadedPet) {
                console.log('[home.js] No pet found for user');
                return null;
            }
            
            const validPet = validatePet(loadedPet);
            if (!validPet) {
                console.log('[home.js] Pet validation failed');
                uiManager.hidePet();
                return null;
            }
            
            console.log('[home.js] Pet loaded successfully:', validPet.name);
            return validPet;
        } catch (error) {
            console.error('[home.js] Failed to load pet:', error);
            showError('Failed to load pet: ' + error.message);
            return null;
        }
    }

    // Enhanced pet refresh function
    async function refreshPetState() {
        try {
            if (!user || !user.username) {
                console.warn('[home.js] No user available for pet refresh');
                currentPet = null;
                uiManager.hidePet();
                return;
            }
            
            const refreshedPet = await loadCurrentPet(user.username);
            if (refreshedPet) {
                currentPet = refreshedPet;
                uiManager.renderPet(currentPet);
            } else {
                currentPet = null;
                uiManager.hidePet();
                showError("No living pet found. Please create a new one.");
            }
        } catch (error) {
            console.error('[home.js] Failed to refresh pet state:', error);
            currentPet = null;
            uiManager.hidePet();
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

    // Try to load existing pet on startup
    currentPet = await loadCurrentPet(user.username);
    if (currentPet) {
        uiManager.renderPet(currentPet);
        startIntimacyLoop();
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
                    currentPet = validatePet(petResult.pet);
                } else if (petResult && !petResult.success) {
                    throw new Error(petResult.message || 'Failed to create pet');
                } else {
                    currentPet = validatePet(petResult);
                }
                
                if (!currentPet) {
                    throw new Error('Pet creation returned invalid data');
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
                currentPet = null;
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
            
            // Always refresh pet state when calling pet
            await refreshPetState();
            
            if (currentPet && validatePet(currentPet)) {
                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.signalPetAnimation) {
                        window.electronAPI.signalPetAnimation('appear');
                    }
                }, 300);
                uiManager.renderPet(currentPet);
                startIntimacyLoop();
            } else {
                showError("You don't have a living pet! Create one first.");
                console.log('[home.js] No valid pet found for user');
            }
        });
    }

    const feedBtn = document.getElementById('feed-btn');
    if (feedBtn) {
        feedBtn.addEventListener('click', async () => {
            console.log('[home.js] Feed button clicked');
            
            // CRITICAL: Validate pet before feeding
            if (!currentPet) {
                console.warn('[home.js] No currentPet available');
                showError('No pet to feed. Please create or call your pet first.');
                await refreshPetState(); // Try to refresh
                return;
            }
            
            const validPet = validatePet(currentPet);
            if (!validPet) {
                console.warn('[home.js] Current pet failed validation');
                showError('Your pet is not available for feeding. Please check pet status.');
                await refreshPetState();
                return;
            }
            
            try {
                console.log('[home.js] Feeding pet:', validPet.name, 'HP:', validPet.hp);
                
                const updated = behaviors.feed(validPet);
                const validatedUpdate = validatePet(updated);
                
                if (!validatedUpdate) {
                    throw new Error('Pet update resulted in invalid data');
                }
                
                await petManager.updateStats(electronAPI, validatedUpdate);
                
                if (window.electronAPI && window.electronAPI.signalPetAnimation) {
                    window.electronAPI.signalPetAnimation('feed');
                }
                
                currentPet = validatedUpdate;
                uiManager.renderPet(currentPet);
                hideError();
                
                console.log('[home.js] Pet fed successfully. New HP:', currentPet.hp);
            } catch (err) {
                console.error('[home.js] Failed to feed pet:', err);
                showError('Failed to feed pet: ' + err.message);
                await refreshPetState(); // Refresh on error
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
            
            const validPet = validatePet(currentPet);
            if (!validPet) {
                showError('Pet is not available for removal');
                return;
            }
            
            if (!confirm(`Are you sure you want to kill ${validPet.name}? This action cannot be undone.`)) {
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
                
                await electronAPI.killPet(validPet.id);
                currentPet = null;
                uiManager.hidePet();
                showError("Your pet has passed away...");
            } catch (err) {
                console.error('[home.js] Failed to kill pet:', err);
                showError('Failed to remove pet: ' + err.message);
            }
        });
    }

    // Enhanced chat event handler
    window.addEventListener('pet-chat', async (e) => {
        try {
            console.log('[home.js] Pet chat event received');
            
            // Refresh pet state before chat interaction
            const pet = await loadCurrentPet(user.username);
            if (pet) {
                const updated = behaviors.chat(pet);
                const validatedUpdate = validatePet(updated);
                
                if (validatedUpdate) {
                    await petManager.updateStats(electronAPI, validatedUpdate);
                    currentPet = validatedUpdate;
                    uiManager.renderPet(currentPet);
                }
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
            if (!currentPet) {
                console.warn('[home.js] No pet in intimacy loop, clearing interval');
                clearInterval(intInterval);
                intInterval = null;
                return;
            }
            
            const validPet = validatePet(currentPet);
            if (!validPet || validPet.is_dead === 1) {
                console.warn('[home.js] Pet invalid or dead, clearing interval');
                clearInterval(intInterval);
                intInterval = null;
                currentPet = null;
                uiManager.hidePet();
                return;
            }
            
            try {
                const updated = behaviors.tick(validPet);
                const validatedUpdate = validatePet(updated);
                
                if (validatedUpdate) {
                    await petManager.updateStats(electronAPI, validatedUpdate);
                    currentPet = validatedUpdate;
                    uiManager.renderPet(currentPet);
                } else {
                    console.warn('[home.js] Tick update failed validation');
                }
            } catch (err) {
                console.error('[home.js] Error in intimacy loop:', err);
                // Don't clear interval on temporary errors, but refresh pet state
                await refreshPetState();
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