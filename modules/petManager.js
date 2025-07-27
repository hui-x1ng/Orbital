let currentPet = null;

export async function loadPet(electronAPI, username) {
    try {
        console.log('[petManager] Loading pet for user:', username);
        try {
            const response = await electronAPI.getPets();
            if (response && response.success && Array.isArray(response.pets)) {
                currentPet = response.pets.find(pet => !pet.is_dead);
                console.log('[petManager] Pet loaded via new API:', currentPet?.name);
                return currentPet;
            }
        } catch (newApiError) {
            console.warn('[petManager] New API failed, trying legacy API:', newApiError);
        }
        if (username) {
            try {
                const pets = await electronAPI.getPets(username);
                if (Array.isArray(pets)) {
                    currentPet = pets.find(pet => !pet.is_dead);
                } else if (pets && Array.isArray(pets.pets)) {
                    currentPet = pets.pets.find(pet => !pet.is_dead);
                }
                console.log('[petManager] Pet loaded via legacy API:', currentPet?.name);
                return currentPet;
            } catch (legacyError) {
                console.warn('[petManager] Legacy API also failed:', legacyError);
            }
        }
        console.log('[petManager] No pets found or all pets are dead');
        return null;
    } catch (error) {
        console.error('[petManager] Failed to load pet:', error);
        return null;
    }
}

export async function getPetByName(electronAPI, username, petName) {
    try {
        console.log('[petManager] Getting pet by name:', petName);
        try {
            const response = await electronAPI.getPets();
            if (response && response.success && Array.isArray(response.pets)) {
                const pet = response.pets.find(p => p.name === petName);
                return pet;
            }
        } catch (newApiError) {
            console.warn('[petManager] New API failed for getPetByName:', newApiError);
        }
        if (username) {
            const pet = await electronAPI.getPet(username, petName);
            return pet;
        }
        return null;
    } catch (error) {
        console.error('[petManager] Failed to get pet by name:', error);
        return null;
    }
}

export async function getPetById(electronAPI, petId) {
    try {
        console.log('[petManager] Getting pet by ID:', petId);
        const response = await electronAPI.getPet(petId);
        if (response && response.success && response.pet) {
            return response;
        } else if (response && response.pet) {
            return { success: true, pet: response.pet };
        } else if (response) {
            return { success: true, pet: response };
        }
        return { success: false, message: 'Pet not found' };
    } catch (error) {
        console.error('[petManager] Failed to get pet by ID:', error);
        return { success: false, message: error.message };
    }
}

export async function loadAllPets(electronAPI, username) {
    try {
        console.log('[petManager] Loading all pets');
        try {
            const response = await electronAPI.getPets();
            if (response && response.success && Array.isArray(response.pets)) {
                console.log(`[petManager] Loaded ${response.pets.length} pets via new API`);
                return response;
            }
        } catch (newApiError) {
            console.warn('[petManager] New API failed for loadAllPets:', newApiError);
        }
        if (username) {
            const pets = await electronAPI.getPets(username);
            if (Array.isArray(pets)) {
                console.log(`[petManager] Loaded ${pets.length} pets via legacy API`);
                return pets;
            } else if (pets && Array.isArray(pets.pets)) {
                console.log(`[petManager] Loaded ${pets.pets.length} pets via legacy API (object format)`);
                return pets.pets;
            }
        }
        console.log('[petManager] No pets found');
        return [];
    } catch (error) {
        console.error('[petManager] Failed to load all pets:', error);
        return [];
    }
}

export async function createPet(electronAPI, username, petName) {
    try {
        console.log('[petManager] Creating pet:', petName, 'for user:', username);
        if (!petName || petName.trim() === '') {
            throw new Error('Pet name cannot be empty');
        }
        const response = await electronAPI.generatePet(username, petName);
        if (response && response.success && response.pet) {
            currentPet = response.pet;
            console.log('[petManager] Pet created successfully via new API:', currentPet.name);
            return response;
        } else if (response && response.success) {
            try {
                const newPet = await getPetByName(electronAPI, username, petName);
                if (newPet) {
                    currentPet = newPet;
                    return { success: true, pet: newPet };
                }
            } catch (getError) {
                console.warn('[petManager] Failed to get newly created pet:', getError);
            }
            return { success: true, message: 'Pet created successfully' };
        } else if (response) {
            try {
                const newPet = await getPetByName(electronAPI, username, petName);
                if (newPet) {
                    currentPet = newPet;
                    return { success: true, pet: newPet };
                } else {
                    return { success: true, petId: response };
                }
            } catch (error) {
                console.warn('[petManager] Created pet but failed to retrieve:', error);
                return { success: true, petId: response };
            }
        }
        throw new Error('Failed to create pet - invalid response');
    } catch (error) {
        console.error('[petManager] Failed to create pet:', error);
        return { 
            success: false, 
            message: error.message || 'Failed to create pet'
        };
    }
}

export function isDead() {
    return !currentPet || currentPet.is_dead === 1;
}

export function getCurrentPet() {
    return currentPet;
}

export function setCurrentPet(pet) {
    currentPet = pet;
}

export async function updateStats(electronAPI, newPet) {
    try {
        if (!newPet || !newPet.id) {
            console.warn('[petManager] Invalid pet data for update');
            return currentPet;
        }
        console.log('[petManager] Updating pet stats:', newPet.id);
        const response = await electronAPI.updatePetStats(newPet);
        if (response && response.success) {
            currentPet = newPet;
            console.log('[petManager] Pet stats updated successfully');
            return currentPet;
        } else {
            currentPet = newPet;
            console.warn('[petManager] API update may have failed, but updating local state');
            return currentPet;
        }
    } catch (error) {
        console.error('[petManager] Failed to update pet stats:', error);
        currentPet = newPet;
        return currentPet;
    }
}

export async function killPet(electronAPI, petId) {
    try {
        console.log('[petManager] Killing pet:', petId);
        const response = await electronAPI.killPet(petId);
        if (response && response.success) {
            if (currentPet && currentPet.id === petId) {
                currentPet = null;
            }
            console.log('[petManager] Pet killed successfully');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[petManager] Failed to kill pet:', error);
        return false;
    }
}

export async function savePet(electronAPI, pet) {
    try {
        if (electronAPI && electronAPI.savePet) {
            const result = await electronAPI.savePet(pet);
            currentPet = pet;
            return result;
        } else if (electronAPI && electronAPI.updatePetStats) {
            const result = await electronAPI.updatePetStats(pet);
            currentPet = pet;
            return result;
        } else {
            console.log('[petManager] No electronAPI available, pet data saved in memory:', pet);
            currentPet = pet;
            return pet;
        }
    } catch (error) {
        console.error('[petManager] Failed to save pet:', error);
        throw error;
    }
}

export function validatePetData(pet) {
    if (!pet) return false;
    const requiredFields = ['id', 'name'];
    return requiredFields.every(field => pet.hasOwnProperty(field));
}

export function sanitizePetName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().slice(0, 50);
}

export function getPetStatusText(pet) {
    if (!pet) return 'Unknown';
    if (pet.is_dead === 1) return 'Dead';
    if (pet.hp <= 0) return 'Critical';
    if (pet.hp <= 20) return 'Very Weak';
    if (pet.hp <= 50) return 'Weak';
    if (pet.hp <= 80) return 'Healthy';
    return 'Very Healthy';
}
