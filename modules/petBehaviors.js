function clampValue(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}

function updatePetSafely(pet, updates) {
    if (!pet) {
        console.warn('[petBehaviors] Invalid pet object provided');
        return null;
    }
    
    const updatedPet = { ...pet };
    
    if (updates.hp !== undefined) {
        updatedPet.hp = clampValue(updates.hp, 0, 100);
    }
    
    if (updates.intimacy !== undefined) {
        updatedPet.intimacy = clampValue(updates.intimacy, 0, 100);
    }
    
    if (updates.age !== undefined) {
        updatedPet.age = Math.max(0, updates.age);
    }
    
    console.log(`[petBehaviors] Pet ${pet.name} updated:`, {
        hp: `${pet.hp} → ${updatedPet.hp}`,
        intimacy: `${pet.intimacy} → ${updatedPet.intimacy}`,
        age: pet.age !== updatedPet.age ? `${pet.age} → ${updatedPet.age}` : updatedPet.age
    });
    
    return updatedPet;
}

export function feed(pet) {
    console.log('[petBehaviors] Feeding pet:', pet?.name);
    
    return updatePetSafely(pet, {
        hp: pet.hp + 5,
        intimacy: pet.intimacy + 2
    });
}

export function haveFun(pet) {
    console.log('[petBehaviors] Having fun with pet:', pet?.name);
    
    return updatePetSafely(pet, {
        hp: pet.hp - 1,
        intimacy: pet.intimacy + 3
    });
}

export function tick(pet) {
    if (!pet) return null;
    
    console.log('[petBehaviors] Time tick for pet:', pet.name);
    
    let hpChange = -0.5;
    let intimacyChange = -0.2;
    
    if (pet.hp < 20) {
        intimacyChange = -0.5;
    }
    
    if (pet.intimacy > 80) {
        hpChange = -0.3;
    }
    
    return updatePetSafely(pet, {
        hp: pet.hp + hpChange,
        intimacy: pet.intimacy + intimacyChange,
        age: pet.age + 0.01
    });
}

export function beingTouched(pet) {
    console.log('[petBehaviors] Pet being touched:', pet?.name);
    
    const intimacyLevel = pet.intimacy;
    
    if (intimacyLevel < 30) {
        return beingTouchedLI(pet);
    } else if (intimacyLevel < 70) {
        return updatePetSafely(pet, {
            intimacy: pet.intimacy + 1
        });
    } else {
        return updatePetSafely(pet, {
            hp: pet.hp + 0.5,
            intimacy: pet.intimacy + 2
        });
    }
}

export function beingTouchedLI(pet) {
    console.log('[petBehaviors] Pet touched with low intimacy:', pet?.name);
    
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('annoyed');
    }
    
    return updatePetSafely(pet, {
        hp: pet.hp - 1,
        intimacy: pet.intimacy - 0.5
    });
}

export function sleep(pet) {
    console.log('[petBehaviors] Pet sleeping:', pet?.name);
    
    return updatePetSafely(pet, {
        hp: pet.hp + 10,
        intimacy: pet.intimacy + 1
    });
}

export function rest(pet) {
    console.log('[petBehaviors] Pet resting:', pet?.name);
    
    return updatePetSafely(pet, {
        hp: pet.hp + 3,
        intimacy: pet.intimacy + 0.5
    });
}

export function getBored(pet) {
    console.log('[petBehaviors] Pet getting bored:', pet?.name);
    
    return updatePetSafely(pet, {
        intimacy: pet.intimacy - 1
    });
}

export function getAnnoyed(pet) {
    console.log('[petBehaviors] Pet getting annoyed:', pet?.name);
    
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('annoyed');
    }
    
    return updatePetSafely(pet, {
        intimacy: pet.intimacy - 3
    });
}

export function getAngry(pet) {
    console.log('[petBehaviors] Pet getting angry:', pet?.name);
    
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('angry');
    }
    
    return updatePetSafely(pet, {
        hp: pet.hp - 2,
        intimacy: pet.intimacy - 8
    });
}

export function chat(pet) {
    console.log('[petBehaviors] Chatting with pet:', pet?.name);
    
    return updatePetSafely(pet, {
        intimacy: pet.intimacy + 4,
        hp: pet.hp + 0.5
    });
}

export function compliment(pet) {
    console.log('[petBehaviors] Complimenting pet:', pet?.name);
    
    return updatePetSafely(pet, {
        intimacy: pet.intimacy + 5,
        hp: pet.hp + 1
    });
}

export function scold(pet) {
    console.log('[petBehaviors] Scolding pet:', pet?.name);
    
    return updatePetSafely(pet, {
        intimacy: pet.intimacy - 5,
        hp: pet.hp - 1
    });
}

export function celebrate(pet) {
    console.log('[petBehaviors] Pet celebrating:', pet?.name);
    
    if (typeof window !== 'undefined' && window.electronAPI?.signalPetAnimation) {
        window.electronAPI.signalPetAnimation('celebrate');
    }
    
    return updatePetSafely(pet, {
        intimacy: pet.intimacy + 6,
        hp: pet.hp + 2
    });
}

export function exercise(pet) {
    console.log('[petBehaviors] Pet exercising:', pet?.name);
    
    return updatePetSafely(pet, {
        hp: pet.hp + 3,
        intimacy: pet.intimacy + 1
    });
}

export function neglect(pet) {
    console.log('[petBehaviors] Pet being neglected:', pet?.name);
    
    return updatePetSafely(pet, {
        hp: pet.hp - 3,
        intimacy: pet.intimacy - 5
    });
}

export function isHealthy(pet) {
    return pet && pet.hp > 70;
}

export function isHappy(pet) {
    return pet && pet.intimacy > 70;
}

export function isCritical(pet) {
    return pet && (pet.hp < 20 || pet.intimacy < 10);
}

export function needsAttention(pet) {
    return pet && (pet.hp < 50 || pet.intimacy < 40);
}

export function getStatus(pet) {
    if (!pet) return 'unknown';
    
    if (pet.is_dead) return 'dead';
    if (isCritical(pet)) return 'critical';
    if (needsAttention(pet)) return 'needs_attention';
    if (isHealthy(pet) && isHappy(pet)) return 'excellent';
    if (isHealthy(pet) || isHappy(pet)) return 'good';
    return 'okay';
}

export function randomEvent(pet) {
    if (!pet) return pet;
    
    const events = [
        { name: 'found_treat', probability: 0.1, effect: () => updatePetSafely(pet, { hp: pet.hp + 5, intimacy: pet.intimacy + 2 }) },
        { name: 'had_nightmare', probability: 0.05, effect: () => updatePetSafely(pet, { hp: pet.hp - 2, intimacy: pet.intimacy - 1 }) },
        { name: 'made_friend', probability: 0.08, effect: () => updatePetSafely(pet, { intimacy: pet.intimacy + 8 }) },
        { name: 'got_sick', probability: 0.03, effect: () => updatePetSafely(pet, { hp: pet.hp - 8 }) },
        { name: 'learned_trick', probability: 0.06, effect: () => updatePetSafely(pet, { intimacy: pet.intimacy + 5 }) }
    ];
    
    for (const event of events) {
        if (Math.random() < event.probability) {
            console.log(`[petBehaviors] Random event triggered: ${event.name}`);
            return event.effect();
        }
    }
    
    return pet; 
}

export function applyMultipleActions(pet, actions) {
    if (!pet || !Array.isArray(actions)) return pet;
    
    let currentPet = pet;
    
    for (const action of actions) {
        if (typeof action === 'function') {
            currentPet = action(currentPet);
        }
    }
    
    return currentPet;
}