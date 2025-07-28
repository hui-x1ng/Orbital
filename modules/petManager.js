let currentPet = null;

// Enhanced pet data validation
function validatePetData(pet, context = 'unknown') {
    if (!pet) {
        console.error(`[petManager] Pet is null/undefined in ${context}`);
        return null;
    }
    
    // Check required fields
    if (!pet.name || typeof pet.name !== 'string') {
        console.error(`[petManager] Pet missing or invalid name in ${context}:`, pet);
        return null;
    }
    
    // Validate and normalize numeric fields
    const validated = {
        id: pet.id || null,
        name: pet.name.trim(),
        hp: Math.max(0, Math.min(100, parseFloat(pet.hp) || 100)),
        intimacy: Math.max(0, Math.min(100, parseFloat(pet.intimacy) || 50)),
        age: Math.max(0, parseFloat(pet.age) || 0),
        is_dead: pet.is_dead === 1 ? 1 : 0,
        created_at: pet.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    console.log(`[petManager] Pet validated in ${context}:`, {
        id: validated.id,
        name: validated.name,
        hp: validated.hp,
        intimacy: validated.intimacy,
        is_dead: validated.is_dead
    });
    
    return validated;
}

// Enhanced error handling wrapper
async function safeApiCall(apiFunction, context, ...args) {
    try {
        const result = await apiFunction(...args);
        return result;
    } catch (error) {
        console.error(`[petManager] API call failed in ${context}:`, error);
        
        if (error.message && error.message.includes('Token invalid')) {
            throw new Error('Authentication expired. Please log in again.');
        }
        
        if (error.message && error.message.includes('403')) {
            throw new Error('Access denied. Please check your permissions.');
        }
        
        throw error;
    }
}

export async function loadPet(electronAPI, username) {
    try {
        console.log('[petManager] Loading pet for user:', username);
        
        if (!electronAPI) {
            throw new Error('ElectronAPI not available');
        }
        
        // Try new API first
        try {
            const response = await safeApiCall(electronAPI.getPets, 'loadPet-newAPI');
            if (response && response.success && Array.isArray(response.pets)) {
                const livingPet = response.pets.find(pet => !pet.is_dead);
                if (livingPet) {
                    const validatedPet = validatePetData(livingPet, 'loadPet-newAPI');
                    if (validatedPet) {
                        currentPet = validatedPet;
                        console.log('[petManager] Pet loaded via new API:', validatedPet.name);
                        return validatedPet;
                    }
                }
            }
        } catch (newApiError) {
            console.warn('[petManager] New API failed, trying legacy API:', newApiError);
        }
        
        // Try legacy API with username
        if (username) {
            try {
                const pets = await safeApiCall(electronAPI.getPets, 'loadPet-legacyAPI', username);
                let petArray = [];
                
                if (Array.isArray(pets)) {
                    petArray = pets;
                } else if (pets && Array.isArray(pets.pets)) {
                    petArray = pets.pets;
                }
                
                const livingPet = petArray.find(pet => !pet.is_dead);
                if (livingPet) {
                    const validatedPet = validatePetData(livingPet, 'loadPet-legacyAPI');
                    if (validatedPet) {
                        currentPet = validatedPet;
                        console.log('[petManager] Pet loaded via legacy API:', validatedPet.name);
                        return validatedPet;
                    }
                }
            } catch (legacyError) {
                console.warn('[petManager] Legacy API also failed:', legacyError);
            }
        }
        
        console.log('[petManager] No living pets found');
        currentPet = null;
        return null;
        
    } catch (error) {
        console.error('[petManager] Failed to load pet:', error);
        currentPet = null;
        throw error;
    }
}

export async function getPetByName(electronAPI, username, petName) {
    try {
        console.log('[petManager] Getting pet by name:', petName);
        
        if (!electronAPI || !petName) {
            return null;
        }
        
        // Try new API first
        try {
            const response = await safeApiCall(electronAPI.getPets, 'getPetByName-newAPI');
            if (response && response.success && Array.isArray(response.pets)) {
                const pet = response.pets.find(p => p.name === petName);
                if (pet) {
                    const validatedPet = validatePetData(pet, 'getPetByName-newAPI');
                    return validatedPet;
                }
            }
        } catch (newApiError) {
            console.warn('[petManager] New API failed for getPetByName:', newApiError);
        }
        
        // Try legacy API
        if (username && electronAPI.getPet) {
            try {
                const pet = await safeApiCall(electronAPI.getPet, 'getPetByName-legacyAPI', username, petName);
                if (pet) {
                    const validatedPet = validatePetData(pet, 'getPetByName-legacyAPI');
                    return validatedPet;
                }
            } catch (legacyError) {
                console.warn('[petManager] Legacy API failed for getPetByName:', legacyError);
            }
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
        
        if (!electronAPI || !petId) {
            return { success: false, message: 'Invalid parameters' };
        }
        
        if (!electronAPI.getPet) {
            return { success: false, message: 'API not available' };
        }
        
        const response = await safeApiCall(electronAPI.getPet, 'getPetById', petId);
        
        if (response && response.success && response.pet) {
            const validatedPet = validatePetData(response.pet, 'getPetById');
            if (validatedPet) {
                return { success: true, pet: validatedPet };
            }
        } else if (response && response.pet) {
            const validatedPet = validatePetData(response.pet, 'getPetById');
            if (validatedPet) {
                return { success: true, pet: validatedPet };
            }
        } else if (response) {
            const validatedPet = validatePetData(response, 'getPetById');
            if (validatedPet) {
                return { success: true, pet: validatedPet };
            }
        }
        
        return { success: false, message: 'Pet not found or invalid' };
        
    } catch (error) {
        console.error('[petManager] Failed to get pet by ID:', error);
        return { success: false, message: error.message };
    }
}

export async function loadAllPets(electronAPI, username) {
    try {
        console.log('[petManager] Loading all pets');
        
        if (!electronAPI) {
            return { success: false, pets: [], message: 'API not available' };
        }
        
        // Try new API first
        try {
            const response = await safeApiCall(electronAPI.getPets, 'loadAllPets-newAPI');
            if (response && response.success && Array.isArray(response.pets)) {
                const validatedPets = response.pets
                    .map(pet => validatePetData(pet, 'loadAllPets-newAPI'))
                    .filter(pet => pet !== null);
                
                console.log(`[petManager] Loaded ${validatedPets.length} pets via new API`);
                return { success: true, pets: validatedPets };
            }
        } catch (newApiError) {
            console.warn('[petManager] New API failed for loadAllPets:', newApiError);
        }
        
        // Try legacy API
        if (username) {
            try {
                const pets = await safeApiCall(electronAPI.getPets, 'loadAllPets-legacyAPI', username);
                let petArray = [];
                
                if (Array.isArray(pets)) {
                    petArray = pets;
                } else if (pets && Array.isArray(pets.pets)) {
                    petArray = pets.pets;
                }
                
                const validatedPets = petArray
                    .map(pet => validatePetData(pet, 'loadAllPets-legacyAPI'))
                    .filter(pet => pet !== null);
                
                console.log(`[petManager] Loaded ${validatedPets.length} pets via legacy API`);
                return { success: true, pets: validatedPets };
                
            } catch (legacyError) {
                console.warn('[petManager] Legacy API failed for loadAllPets:', legacyError);
            }
        }
        
        console.log('[petManager] No pets found');
        return { success: true, pets: [] };
        
    } catch (error) {
        console.error('[petManager] Failed to load all pets:', error);
        return { success: false, pets: [], message: error.message };
    }
}

export async function createPet(electronAPI, username, petName) {
    try {
        console.log('[petManager] Creating pet:', petName, 'for user:', username);
        
        if (!electronAPI) {
            throw new Error('ElectronAPI not available');
        }
        
        if (!username || !petName) {
            throw new Error('Username and pet name are required');
        }
        
        const sanitizedName = petName.trim();
        if (sanitizedName.length === 0) {
            throw new Error('Pet name cannot be empty');
        }
        
        if (sanitizedName.length > 50) {
            throw new Error('Pet name too long (max 50 characters)');
        }
        
        // Try generatePet API
        if (electronAPI.generatePet) {
            try {
                const response = await safeApiCall(electronAPI.generatePet, 'createPet-generatePet', username, sanitizedName);
                
                if (response && response.success && response.pet) {
                    const validatedPet = validatePetData(response.pet, 'createPet-generatePet');
                    if (validatedPet) {
                        currentPet = validatedPet;
                        console.log('[petManager] Pet created successfully via generatePet API:', validatedPet.name);
                        return { success: true, pet: validatedPet };
                    }
                } else if (response && response.success) {
                    // Pet created but not returned, try to fetch it
                    const newPet = await getPetByName(electronAPI, username, sanitizedName);
                    if (newPet) {
                        currentPet = newPet;
                        return { success: true, pet: newPet };
                    }
                    return { success: true, message: 'Pet created successfully' };
                } else if (response) {
                    // Legacy response format
                    const newPet = await getPetByName(electronAPI, username, sanitizedName);
                    if (newPet) {
                        currentPet = newPet;
                        return { success: true, pet: newPet };
                    } else {
                        return { success: true, petId: response };
                    }
                }
            } catch (generateError) {
                console.warn('[petManager] generatePet API failed:', generateError);
            }
        }
        
        // Try createPet API as fallback
        if (electronAPI.createPet) {
            try {
                const response = await safeApiCall(electronAPI.createPet, 'createPet-createPet', username, sanitizedName);
                
                if (response && response.success && response.pet) {
                    const validatedPet = validatePetData(response.pet, 'createPet-createPet');
                    if (validatedPet) {
                        currentPet = validatedPet;
                        console.log('[petManager] Pet created successfully via createPet API:', validatedPet.name);
                        return { success: true, pet: validatedPet };
                    }
                } else if (response) {
                    const newPet = await getPetByName(electronAPI, username, sanitizedName);
                    if (newPet) {
                        currentPet = newPet;
                        return { success: true, pet: newPet };
                    }
                }
            } catch (createError) {
                console.warn('[petManager] createPet API failed:', createError);
            }
        }
        
        throw new Error('Failed to create pet - no working API available');
        
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
    const validatedPet = validatePetData(pet, 'setCurrentPet');
    if (validatedPet) {
        currentPet = validatedPet;
        console.log('[petManager] Current pet set to:', validatedPet.name);
    } else {
        console.warn('[petManager] Attempted to set invalid pet as current');
        currentPet = null;
    }
}

export async function updateStats(electronAPI, newPet) {
    try {
        console.log('[petManager] Updating pet stats for:', newPet?.name);
        
        if (!electronAPI) {
            throw new Error('ElectronAPI not available');
        }
        
        const validatedPet = validatePetData(newPet, 'updateStats');
        if (!validatedPet) {
            throw new Error('Invalid pet data for update');
        }
        
        if (!validatedPet.id) {
            console.warn('[petManager] Pet has no ID, cannot update via API');
            // Still update local state
            currentPet = validatedPet;
            return validatedPet;
        }
        
        // Try updatePetStats API
        if (electronAPI.updatePetStats) {
            try {
                const response = await safeApiCall(electronAPI.updatePetStats, 'updateStats-updatePetStats', validatedPet);
                
                if (response && response.success) {
                    currentPet = validatedPet;
                    console.log('[petManager] Pet stats updated successfully via updatePetStats');
                    return validatedPet;
                } else {
                    console.warn('[petManager] updatePetStats API response unclear, updating local state');
                    currentPet = validatedPet;
                    return validatedPet;
                }
            } catch (updateError) {
                console.warn('[petManager] updatePetStats API failed:', updateError);
            }
        }
        
        // Try updatePet API as fallback
        if (electronAPI.updatePet) {
            try {
                const updateData = {
                    hp: validatedPet.hp,
                    intimacy: validatedPet.intimacy,
                    age: validatedPet.age,
                    is_dead: validatedPet.is_dead
                };
                
                const response = await safeApiCall(electronAPI.updatePet, 'updateStats-updatePet', validatedPet.id, updateData);
                
                if (response && response.success) {
                    currentPet = validatedPet;
                    console.log('[petManager] Pet stats updated successfully via updatePet');
                    return validatedPet;
                }
            } catch (updateError) {
                console.warn('[petManager] updatePet API failed:', updateError);
            }
        }
        
        // If all API calls fail, still update local state
        console.warn('[petManager] API update failed, but updating local state');
        currentPet = validatedPet;
        return validatedPet;
        
    } catch (error) {
        console.error('[petManager] Failed to update pet stats:', error);
        
        // On error, still try to update local state if pet is valid
        const validatedPet = validatePetData(newPet, 'updateStats-error');
        if (validatedPet) {
            currentPet = validatedPet;
            return validatedPet;
        }
        
        throw error;
    }
}

export async function killPet(electronAPI, petId) {
    try {
        console.log('[petManager] Killing pet:', petId);
        
        if (!electronAPI || !electronAPI.killPet) {
            throw new Error('Kill pet API not available');
        }
        
        if (!petId) {
            throw new Error('Pet ID is required');
        }
        
        const response = await safeApiCall(electronAPI.killPet, 'killPet', petId);
        
        if (response && response.success) {
            if (currentPet && currentPet.id === petId) {
                currentPet = null;
            }
            console.log('[petManager] Pet killed successfully');
            return true;
        }
        
        // If response is unclear but no error thrown, assume success
        if (currentPet && currentPet.id === petId) {
            currentPet = null;
        }
        console.log('[petManager] Pet kill operation completed (unclear response)');
        return true;
        
    } catch (error) {
        console.error('[petManager] Failed to kill pet:', error);
        throw error;
    }
}

export async function savePet(electronAPI, pet) {
    try {
        console.log('[petManager] Saving pet:', pet?.name);
        
        const validatedPet = validatePetData(pet, 'savePet');
        if (!validatedPet) {
            throw new Error('Invalid pet data for save');
        }
        
        if (electronAPI && electronAPI.savePet) {
            try {
                const result = await safeApiCall(electronAPI.savePet, 'savePet-savePet', validatedPet);
                currentPet = validatedPet;
                console.log('[petManager] Pet saved successfully via savePet API');
                return result;
            } catch (saveError) {
                console.warn('[petManager] savePet API failed:', saveError);
            }
        }
        
        if (electronAPI && electronAPI.updatePetStats) {
            try {
                const result = await safeApiCall(electronAPI.updatePetStats, 'savePet-updatePetStats', validatedPet);
                currentPet = validatedPet;
                console.log('[petManager] Pet saved successfully via updatePetStats API');
                return result;
            } catch (updateError) {
                console.warn('[petManager] updatePetStats API failed:', updateError);
            }
        }
        
        // Fallback to local storage
        console.log('[petManager] No working API available, pet data saved in memory only');
        currentPet = validatedPet;
        return validatedPet;
        
    } catch (error) {
        console.error('[petManager] Failed to save pet:', error);
        throw error;
    }
}

export function isValidPetData(pet) {
    if (!pet) return false;
    
    const requiredFields = ['name'];
    const hasRequiredFields = requiredFields.every(field => 
        pet.hasOwnProperty(field) && pet[field] !== null && pet[field] !== undefined
    );
    
    if (!hasRequiredFields) {
        console.warn('[petManager] Pet missing required fields:', pet);
        return false;
    }
    
    // Check for reasonable values
    if (typeof pet.hp !== 'undefined' && (isNaN(pet.hp) || pet.hp < 0 || pet.hp > 100)) {
        console.warn('[petManager] Pet has invalid HP value:', pet.hp);
        return false;
    }
    
    if (typeof pet.intimacy !== 'undefined' && (isNaN(pet.intimacy) || pet.intimacy < 0 || pet.intimacy > 100)) {
        console.warn('[petManager] Pet has invalid intimacy value:', pet.intimacy);
        return false;
    }
    
    return true;
}

export function sanitizePetName(name) {
    if (!name || typeof name !== 'string') {
        console.warn('[petManager] Invalid pet name provided:', name);
        return '';
    }
    
    const sanitized = name.trim().slice(0, 50);
    
    // Remove any potentially problematic characters
    const cleaned = sanitized.replace(/[<>\"'&]/g, '');
    
    return cleaned;
}

export function getPetStatusText(pet) {
    const validatedPet = isValidPetData(pet) ? pet : null;
    
    if (!validatedPet) return 'Unknown';
    if (validatedPet.is_dead === 1) return 'Dead';
    if (validatedPet.hp <= 0) return 'Critical';
    if (validatedPet.hp <= 20) return 'Very Weak';
    if (validatedPet.hp <= 50) return 'Weak';
    if (validatedPet.hp <= 80) return 'Healthy';
    return 'Very Healthy';
}

// Additional utility functions
export function getPetMoodText(pet) {
    const validatedPet = isValidPetData(pet) ? pet : null;
    
    if (!validatedPet) return 'Unknown';
    if (validatedPet.is_dead === 1) return 'Dead';
    
    const hp = validatedPet.hp;
    const intimacy = validatedPet.intimacy;
    
    if (hp < 20 || intimacy < 20) return 'Miserable';
    if (hp < 40 || intimacy < 40) return 'Sad';
    if (hp > 80 && intimacy > 80) return 'Very Happy';
    if (hp > 60 && intimacy > 60) return 'Happy';
    return 'Okay';
}

export function isPetCritical(pet) {
    const validatedPet = isValidPetData(pet) ? pet : null;
    if (!validatedPet) return false;
    
    return validatedPet.hp <= 20 || validatedPet.intimacy <= 10;
}

export function getPetSummary(pet) {
    const validatedPet = isValidPetData(pet) ? pet : null;
    
    if (!validatedPet) {
        return {
            valid: false,
            message: 'Invalid pet data'
        };
    }
    
    return {
        valid: true,
        id: validatedPet.id,
        name: validatedPet.name,
        hp: validatedPet.hp,
        intimacy: validatedPet.intimacy,
        age: Math.floor(validatedPet.age || 0),
        status: getPetStatusText(validatedPet),
        mood: getPetMoodText(validatedPet),
        isCritical: isPetCritical(validatedPet),
        isDead: validatedPet.is_dead === 1
    };
}

// Clear current pet (useful for logout/reset)
export function clearCurrentPet() {
    console.log('[petManager] Clearing current pet');
    currentPet = null;
}

// Export the internal validation function for compatibility
export { validatePetData };