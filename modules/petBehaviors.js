function clampValue(value, min = 0, max = 100) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
        console.warn('[petBehaviors] Invalid numeric value:', value, 'defaulting to', min);
        return min;
    }
    return Math.max(min, Math.min(max, numValue));
}

function validatePet(pet, operation = 'unknown') {
    if (!pet) {
        console.error(`[petBehaviors] Pet is null/undefined during ${operation}`);
        return null;
    }
    
    if (!pet.name) {
        console.error(`[petBehaviors] Pet missing name during ${operation}:`, pet);
        return null;
    }
    
    if (pet.is_dead === 1) {
        console.warn(`[petBehaviors] Attempted ${operation} on dead pet:`, pet.name);
        return null;
    }
    
    // Ensure all required numeric properties exist and are valid
    const validated = {
        ...pet,
        hp: clampValue(pet.hp, 0, 100),
        intimacy: clampValue(pet.intimacy, 0, 100),
        age: Math.max(0, parseFloat(pet.age) || 0),
        is_dead: pet.is_dead || 0
    };
    
    return validated;
}

function updatePetSafely(pet, updates) {
    const validPet = validatePet(pet, 'update');
    if (!validPet) {
        console.error('[petBehaviors] Cannot update invalid pet');
        throw new Error('Invalid pet data - cannot perform update');
    }
    
    const updatedPet = { ...validPet };
    
    if (updates.hp !== undefined) {
        updatedPet.hp = clampValue(updates.hp, 0, 100);
    }
    
    if (updates.intimacy !== undefined) {
        updatedPet.intimacy = clampValue(updates.intimacy, 0, 100);
    }
    
    if (updates.age !== undefined) {
        updatedPet.age = Math.max(0, parseFloat(updates.age) || updatedPet.age);
    }
    
    // Check if pet should die from low HP
    if (updatedPet.hp <= 0) {
        console.warn(`[petBehaviors] Pet ${validPet.name} has died from low HP`);
        updatedPet.is_dead = 1;
    }
    
    console.log(`[petBehaviors] Pet ${validPet.name} updated:`, {
        hp: `${validPet.hp} → ${updatedPet.hp}`,
        intimacy: `${validPet.intimacy} → ${updatedPet.intimacy}`,
        age: validPet.age !== updatedPet.age ? `${validPet.age} → ${updatedPet.age}` : updatedPet.age
    });
    
    return updatedPet;
}

export function feed(pet) {
    console.log('[petBehaviors] Feeding pet:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot feed: No pet provided');
    }
    
    const validPet = validatePet(pet, 'feed');
    if (!validPet) {
        throw new Error('Cannot feed: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp + 5,
        intimacy: validPet.intimacy + 2
    });
}

export function haveFun(pet) {
    console.log('[petBehaviors] Having fun with pet:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot have fun: No pet provided');
    }
    
    const validPet = validatePet(pet, 'haveFun');
    if (!validPet) {
        throw new Error('Cannot have fun: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp - 1,
        intimacy: validPet.intimacy + 3
    });
}

export function tick(pet) {
    if (!pet) {
        console.warn('[petBehaviors] Tick called with no pet');
        return null;
    }
    
    const validPet = validatePet(pet, 'tick');
    if (!validPet) {
        console.warn('[petBehaviors] Cannot tick invalid pet');
        return null;
    }
    
    console.log('[petBehaviors] Time tick for pet:', validPet.name);
    
    let hpChange = -0.5;
    let intimacyChange = -0.2;
    
    // Adjust changes based on current state
    if (validPet.hp < 20) {
        intimacyChange = -0.5; // Pet gets sadder when sick
    }
    
    if (validPet.intimacy > 80) {
        hpChange = -0.3; // Happy pets lose health slower
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp + hpChange,
        intimacy: validPet.intimacy + intimacyChange,
        age: validPet.age + 0.01 // Age increases slowly
    });
}

export function beingTouched(pet) {
    console.log('[petBehaviors] Pet being touched:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot touch: No pet provided');
    }
    
    const validPet = validatePet(pet, 'beingTouched');
    if (!validPet) {
        throw new Error('Cannot touch: Pet is invalid or dead');
    }
    
    const intimacyLevel = validPet.intimacy;
    
    if (intimacyLevel < 30) {
        return beingTouchedLI(validPet);
    } else if (intimacyLevel < 70) {
        return updatePetSafely(validPet, {
            intimacy: validPet.intimacy + 1
        });
    } else {
        return updatePetSafely(validPet, {
            hp: validPet.hp + 0.5,
            intimacy: validPet.intimacy + 2
        });
    }
}

export function beingTouchedLI(pet) {
    console.log('[petBehaviors] Pet touched with low intimacy:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot touch: No pet provided');
    }
    
    const validPet = validatePet(pet, 'beingTouchedLI');
    if (!validPet) {
        throw new Error('Cannot touch: Pet is invalid or dead');
    }
    
    // Trigger annoyed animation
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('annoyed');
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp - 1,
        intimacy: validPet.intimacy - 0.5
    });
}

export function sleep(pet) {
    console.log('[petBehaviors] Pet sleeping:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot sleep: No pet provided');
    }
    
    const validPet = validatePet(pet, 'sleep');
    if (!validPet) {
        throw new Error('Cannot sleep: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp + 10,
        intimacy: validPet.intimacy + 1
    });
}

export function rest(pet) {
    console.log('[petBehaviors] Pet resting:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot rest: No pet provided');
    }
    
    const validPet = validatePet(pet, 'rest');
    if (!validPet) {
        throw new Error('Cannot rest: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp + 3,
        intimacy: validPet.intimacy + 0.5
    });
}

export function getBored(pet) {
    console.log('[petBehaviors] Pet getting bored:', pet?.name);
    
    if (!pet) {
        return null;
    }
    
    const validPet = validatePet(pet, 'getBored');
    if (!validPet) {
        return null;
    }
    
    return updatePetSafely(validPet, {
        intimacy: validPet.intimacy - 1
    });
}

export function getAnnoyed(pet) {
    console.log('[petBehaviors] Pet getting annoyed:', pet?.name);
    
    if (!pet) {
        return null;
    }
    
    const validPet = validatePet(pet, 'getAnnoyed');
    if (!validPet) {
        return null;
    }
    
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('annoyed');
    }
    
    return updatePetSafely(validPet, {
        intimacy: validPet.intimacy - 3
    });
}

export function getAngry(pet) {
    console.log('[petBehaviors] Pet getting angry:', pet?.name);
    
    if (!pet) {
        return null;
    }
    
    const validPet = validatePet(pet, 'getAngry');
    if (!validPet) {
        return null;
    }
    
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('angry');
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp - 2,
        intimacy: validPet.intimacy - 8
    });
}

export function chat(pet) {
    console.log('[petBehaviors] Chatting with pet:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot chat: No pet provided');
    }
    
    const validPet = validatePet(pet, 'chat');
    if (!validPet) {
        throw new Error('Cannot chat: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        intimacy: validPet.intimacy + 4,
        hp: validPet.hp + 0.5
    });
}

export function compliment(pet) {
    console.log('[petBehaviors] Complimenting pet:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot compliment: No pet provided');
    }
    
    const validPet = validatePet(pet, 'compliment');
    if (!validPet) {
        throw new Error('Cannot compliment: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        intimacy: validPet.intimacy + 5,
        hp: validPet.hp + 1
    });
}

export function scold(pet) {
    console.log('[petBehaviors] Scolding pet:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot scold: No pet provided');
    }
    
    const validPet = validatePet(pet, 'scold');
    if (!validPet) {
        throw new Error('Cannot scold: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        intimacy: validPet.intimacy - 5,
        hp: validPet.hp - 1
    });
}

export function celebrate(pet) {
    console.log('[petBehaviors] Pet celebrating:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot celebrate: No pet provided');
    }
    
    const validPet = validatePet(pet, 'celebrate');
    if (!validPet) {
        throw new Error('Cannot celebrate: Pet is invalid or dead');
    }
    
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('celebrate');
    }
    
    return updatePetSafely(validPet, {
        intimacy: validPet.intimacy + 6,
        hp: validPet.hp + 2
    });
}

export function exercise(pet) {
    console.log('[petBehaviors] Pet exercising:', pet?.name);
    
    if (!pet) {
        throw new Error('Cannot exercise: No pet provided');
    }
    
    const validPet = validatePet(pet, 'exercise');
    if (!validPet) {
        throw new Error('Cannot exercise: Pet is invalid or dead');
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp + 3,
        intimacy: validPet.intimacy + 1
    });
}

export function neglect(pet) {
    console.log('[petBehaviors] Pet being neglected:', pet?.name);
    
    if (!pet) {
        return null;
    }
    
    const validPet = validatePet(pet, 'neglect');
    if (!validPet) {
        return null;
    }
    
    return updatePetSafely(validPet, {
        hp: validPet.hp - 3,
        intimacy: validPet.intimacy - 5
    });
}

// Utility functions
export function isHealthy(pet) {
    const validPet = validatePet(pet, 'isHealthy');
    return validPet && validPet.hp > 70;
}

export function isHappy(pet) {
    const validPet = validatePet(pet, 'isHappy');
    return validPet && validPet.intimacy > 70;
}

export function isCritical(pet) {
    const validPet = validatePet(pet, 'isCritical');
    return validPet && (validPet.hp < 20 || validPet.intimacy < 10);
}

export function needsAttention(pet) {
    const validPet = validatePet(pet, 'needsAttention');
    return validPet && (validPet.hp < 50 || validPet.intimacy < 40);
}

export function getStatus(pet) {
    const validPet = validatePet(pet, 'getStatus');
    if (!validPet) return 'unknown';
    
    if (validPet.is_dead) return 'dead';
    if (isCritical(validPet)) return 'critical';
    if (needsAttention(validPet)) return 'needs_attention';
    if (isHealthy(validPet) && isHappy(validPet)) return 'excellent';
    if (isHealthy(validPet) || isHappy(validPet)) return 'good';
    return 'okay';
}

export function randomEvent(pet) {
    const validPet = validatePet(pet, 'randomEvent');
    if (!validPet) return pet;
    
    const events = [
        { 
            name: 'found_treat', 
            probability: 0.1, 
            effect: () => updatePetSafely(validPet, { 
                hp: validPet.hp + 5, 
                intimacy: validPet.intimacy + 2 
            }) 
        },
        { 
            name: 'had_nightmare', 
            probability: 0.05, 
            effect: () => updatePetSafely(validPet, { 
                hp: validPet.hp - 2, 
                intimacy: validPet.intimacy - 1 
            }) 
        },
        { 
            name: 'made_friend', 
            probability: 0.08, 
            effect: () => updatePetSafely(validPet, { 
                intimacy: validPet.intimacy + 8 
            }) 
        },
        { 
            name: 'got_sick', 
            probability: 0.03, 
            effect: () => updatePetSafely(validPet, { 
                hp: validPet.hp - 8 
            }) 
        },
        { 
            name: 'learned_trick', 
            probability: 0.06, 
            effect: () => updatePetSafely(validPet, { 
                intimacy: validPet.intimacy + 5 
            }) 
        }
    ];
    
    for (const event of events) {
        if (Math.random() < event.probability) {
            console.log(`[petBehaviors] Random event triggered: ${event.name}`);
            return event.effect();
        }
    }
    
    return validPet; 
}

export function applyMultipleActions(pet, actions) {
    let currentPet = validatePet(pet, 'applyMultipleActions');
    if (!currentPet || !Array.isArray(actions)) return pet;
    
    for (const action of actions) {
        if (typeof action === 'function') {
            try {
                currentPet = action(currentPet);
                if (!currentPet) break; // Stop if pet becomes invalid
            } catch (error) {
                console.error('[petBehaviors] Action failed:', error);
                break; // Stop processing on error
            }
        }
    }
    
    return currentPet;
}

// Export validation function for external use
export { validatePet };