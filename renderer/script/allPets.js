import * as userManager from '../../modules/userManager.js';
import * as petManager from '../../modules/petManager.js';

const electronAPI = window.electronAPI;

export async function renderPetGallery() {
    console.log('[allPets.js] Rendering pet gallery');
    
    try {
        let pets = [];
        let petsResult = null;
        
        try {
            petsResult = await petManager.loadAllPets(electronAPI);
            if (petsResult && petsResult.success && Array.isArray(petsResult.pets)) {
                pets = petsResult.pets;
            } else if (Array.isArray(petsResult)) {
                pets = petsResult;
            }
        } catch (err) {
            console.warn('[allPets.js] New API failed, trying fallback:', err);
            
            const currentUser = userManager.loadUser();
            if (currentUser && currentUser.username) {
                const fallbackResult = await electronAPI.getPets(currentUser.username);
                if (Array.isArray(fallbackResult)) {
                    pets = fallbackResult;
                } else if (fallbackResult && Array.isArray(fallbackResult.pets)) {
                    pets = fallbackResult.pets;
                }
            }
        }
        
        const grid = document.getElementById('petsGrid');
        if (!grid) {
            console.error('[allPets.js] petsGrid element not found');
            return;
        }

        grid.innerHTML = '';

        if (!pets || pets.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 40px;">
                    <h3>No pets found</h3>
                    <p>Create your first pet to see it here!</p>
                </div>
            `;
            return;
        }

        pets.forEach(pet => {
            const card = document.createElement('div');
            card.className = `pet-card ${pet.is_dead === 0 ? 'alive' : 'dead'}`;
            card.onclick = () => openPetModal(pet.id || pet.name);

            const hpPercentage = Math.max(0, Math.min(100, (pet.hp / 100) * 100));
            const intimacyPercentage = Math.max(0, Math.min(100, (pet.intimacy / 100) * 100));
            
            let hpClass = '';
            if (hpPercentage <= 20) hpClass = 'critical';
            else if (hpPercentage <= 50) hpClass = 'low';

            const avatarEmoji = pet.is_dead === 0 ? '🐱' : '💀';
            
            card.innerHTML = `
                <div class="pet-avatar">${avatarEmoji}</div>
                <div class="pet-name">${pet.name}</div>
                <div class="pet-stats">
                    <p>HP: ${pet.hp}/100</p>
                    <div class="hp-bar">
                        <div class="hp-fill ${hpClass}" style="width: ${hpPercentage}%"></div>
                    </div>
                    <p>Intimacy: ${pet.intimacy}/100</p>
                    <div class="intimacy-bar">
                        <div class="intimacy-fill" style="width: ${intimacyPercentage}%"></div>
                    </div>
                    <p>Age: ${pet.age} days</p>
                </div>
                <div class="pet-status ${pet.is_dead === 0 ? 'alive' : 'dead'}">
                    ${pet.is_dead === 0 ? 'Alive' : 'Dead'}
                </div>
            `;

            grid.appendChild(card);
        });
        
        console.log(`[allPets.js] Rendered ${pets.length} pets`);
    } catch (error) {
        console.error('[allPets.js] Error rendering pet gallery:', error);
        
        const grid = document.getElementById('petsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #ff6b6b; padding: 40px;">
                    <h3>Error loading pets</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #00bcd4; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

async function openPetModal(petIdentifier) {
    console.log('[allPets.js] Opening modal for:', petIdentifier);
    
    const modal = document.getElementById('petModal');
    if (!modal) {
        console.error('[allPets.js] Modal element not found! Available elements:', 
            Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        alert('Modal not found in DOM');
        return;
    }

    try {
        let pet = null;
        
        if (typeof petIdentifier === 'number' || !isNaN(petIdentifier)) {
            try {
                const result = await petManager.getPetById(electronAPI, petIdentifier);
                if (result && result.success && result.pet) {
                    pet = result.pet;
                } else if (result && !result.success) {
                    throw new Error(result.message || 'Pet not found');
                } else {
                    pet = result;
                }
            } catch (err) {
                console.warn('[allPets.js] getPetById failed:', err);
            }
        }
        
        if (!pet) {
            try {
                const currentUser = userManager.loadUser();
                if (currentUser && currentUser.username) {
                    pet = await petManager.getPetByName(electronAPI, currentUser.username, petIdentifier);
                }
            } catch (err) {
                console.warn('[allPets.js] getPetByName failed:', err);
            }
        }

        if (!pet) {
            alert('Pet not found!');
            return;
        }

        const modalPetAvatar = document.getElementById('modalPetAvatar');
        const modalPetName = document.getElementById('modalPetName');
        const modalPetAge = document.getElementById('modalPetAge');
        const modalPetHP = document.getElementById('modalPetHP');
        const modalPetIntimacy = document.getElementById('modalPetIntimacy');
        const modalPetStatus = document.getElementById('modalPetStatus');
        const modalPetCreated = document.getElementById('modalPetCreated');
        const modalPetActions = document.getElementById('modalPetActions');
        const closeModalBtn = document.getElementById('closeModalBtn');

        if (modalPetAvatar) {
            const avatarEmoji = pet.is_dead === 0 ? '🐱' : '💀';
            modalPetAvatar.textContent = avatarEmoji;
        }
        
        if (modalPetName) {
            modalPetName.textContent = `Name: ${pet.name}`;
        }
        
        if (modalPetHP) {
            modalPetHP.textContent = `HP: ${pet.hp}/100`;
        }
        
        if (modalPetIntimacy) {
            modalPetIntimacy.textContent = `Intimacy: ${pet.intimacy}/100`;
        }
        
        if (modalPetStatus) {
            modalPetStatus.textContent = `Status: ${pet.is_dead === 0 ? 'Alive' : 'Dead'}`;
        }
        
        if (modalPetAge) {
            modalPetAge.textContent = `Age: ${pet.age} days`;
        }
        
        if (modalPetCreated && pet.created_at) {
            const createdDate = new Date(pet.created_at);
            modalPetCreated.textContent = `Created: ${createdDate.toLocaleDateString()}`;
        }

        if (modalPetActions) {
            modalPetActions.innerHTML = '';
            
            if (pet.is_dead === 0) {
                const feedBtn = document.createElement('button');
                feedBtn.textContent = 'Feed';
                feedBtn.onclick = () => feedPet(pet);
                modalPetActions.appendChild(feedBtn);
                
                const chatBtn = document.createElement('button');
                chatBtn.textContent = 'Chat';
                chatBtn.onclick = () => chatWithPet(pet);
                modalPetActions.appendChild(chatBtn);
                
                const killBtn = document.createElement('button');
                killBtn.textContent = 'Kill';
                killBtn.className = 'danger';
                killBtn.onclick = () => killPet(pet);
                modalPetActions.appendChild(killBtn);
            }
        }

        modal.classList.remove('hidden');

        if (closeModalBtn) {
            closeModalBtn.onclick = closeModal;
        }
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
    } catch (error) {
        console.error('[allPets.js] Error opening pet modal:', error);
        alert('Error loading pet details: ' + error.message);
    }
}

async function feedPet(pet) {
    try {
        console.log('[allPets.js] Feeding pet:', pet.name);
        closeModal();
        await renderPetGallery();
    } catch (error) {
        console.error('[allPets.js] Error feeding pet:', error);
        alert('Failed to feed pet');
    }
}

async function chatWithPet(pet) {
    try {
        console.log('[allPets.js] Starting chat with pet:', pet.name);
        closeModal();
    } catch (error) {
        console.error('[allPets.js] Error starting chat:', error);
        alert('Failed to start chat');
    }
}

async function killPet(pet) {
    if (!confirm(`Are you sure you want to kill ${pet.name}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        await electronAPI.killPet(pet.id);
        console.log('[allPets.js] Pet killed:', pet.name);
        closeModal();
        await renderPetGallery();
    } catch (error) {
        console.error('[allPets.js] Error killing pet:', error);
        alert('Failed to kill pet');
    }
}

function closeModal() {
    const modal = document.getElementById('petModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshPetsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('[allPets.js] Refreshing pet gallery');
            renderPetGallery();
        });
    }
}

export async function main() {
    console.log('[allPets.js] Initializing all pets page');
    setupRefreshButton();
    await renderPetGallery();
}