// Enhanced UI rendering with proper validation and error handling

function validatePetForUI(pet, context = 'unknown') {
    if (!pet) {
        console.warn(`[uiRenderer] No pet provided for ${context}`);
        return null;
    }
    
    if (!pet.name) {
        console.error(`[uiRenderer] Pet missing name in ${context}:`, pet);
        return null;
    }
    
    // Ensure numeric values are valid
    const validated = {
        ...pet,
        hp: Math.max(0, Math.min(100, parseFloat(pet.hp) || 0)),
        intimacy: Math.max(0, Math.min(100, parseFloat(pet.intimacy) || 50)),
        age: Math.max(0, parseFloat(pet.age) || 0),
        is_dead: pet.is_dead === 1 ? 1 : 0
    };
    
    return validated;
}

function safeElementOperation(elementId, operation, fallback = null) {
    try {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`[uiRenderer] Element not found: ${elementId}`);
            return fallback;
        }
        return operation(element);
    } catch (error) {
        console.error(`[uiRenderer] Error operating on element ${elementId}:`, error);
        return fallback;
    }
}

// Set up pet data listener if electronAPI is available
if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onPetData) {
    try {
        window.electronAPI.onPetData((pet) => {
            console.log('[uiRenderer] Received pet data from electronAPI');
            renderPet(pet);
        });
    } catch (error) {
        console.warn('[uiRenderer] Failed to set up pet data listener:', error);
    }
}

export function renderPet(pet) {
    console.log('[uiRenderer] Rendering pet:', pet?.name);
    
    const validatedPet = validatePetForUI(pet, 'renderPet');
    if (!validatedPet) {
        console.error('[uiRenderer] Cannot render invalid pet data');
        hidePet();
        return false;
    }
    
    try {
        // Show pet display container
        const success = safeElementOperation('petDisplay', (element) => {
            element.classList.remove('hidden');
            return true;
        }, false);
        
        if (!success) {
            console.error('[uiRenderer] Failed to show pet display container');
            return false;
        }
        
        // Update pet name
        safeElementOperation('pet-name', (element) => {
            element.textContent = validatedPet.name;
        });
        
        // Update HP with validation
        safeElementOperation('pet-hp', (element) => {
            if (isNaN(validatedPet.hp)) {
                element.textContent = 'HP: Unknown';
                console.warn('[uiRenderer] Pet HP is not a number:', validatedPet.hp);
            } else {
                element.textContent = `HP: ${Math.round(validatedPet.hp)}`;
            }
        });
        
        // Update intimacy with validation
        safeElementOperation('pet-intimacy', (element) => {
            if (isNaN(validatedPet.intimacy)) {
                element.textContent = 'Intimacy: Unknown';
                console.warn('[uiRenderer] Pet intimacy is not a number:', validatedPet.intimacy);
            } else {
                element.textContent = `Intimacy: ${Math.round(validatedPet.intimacy)}`;
            }
        });
        
        // Update age if element exists
        safeElementOperation('pet-age', (element) => {
            const ageInDays = Math.floor(validatedPet.age || 0);
            element.textContent = `Age: ${ageInDays} days`;
        });
        
        // Update status indicator if element exists
        safeElementOperation('pet-status', (element) => {
            let statusText = 'Alive';
            let statusClass = 'status-alive';
            
            if (validatedPet.is_dead === 1) {
                statusText = 'Dead';
                statusClass = 'status-dead';
            } else if (validatedPet.hp <= 20) {
                statusText = 'Critical';
                statusClass = 'status-critical';
            } else if (validatedPet.hp <= 50) {
                statusText = 'Weak';
                statusClass = 'status-weak';
            }
            
            element.textContent = statusText;
            element.className = `pet-status ${statusClass}`;
        });
        
        // Add visual indicators for pet condition
        updatePetVisualState(validatedPet);
        
        // Open pet window if electronAPI is available
        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.openPetWindow) {
            try {
                window.electronAPI.openPetWindow();
                console.log('[uiRenderer] Pet window opened');
            } catch (error) {
                console.warn('[uiRenderer] Failed to open pet window:', error);
            }
        }
        
        console.log('[uiRenderer] Pet rendered successfully:', validatedPet.name);
        return true;
        
    } catch (error) {
        console.error('[uiRenderer] Error rendering pet:', error);
        hidePet();
        return false;
    }
}

function updatePetVisualState(pet) {
    const petDisplay = document.getElementById('petDisplay');
    if (!petDisplay) return;
    
    // Remove existing state classes
    petDisplay.classList.remove('pet-critical', 'pet-weak', 'pet-sad', 'pet-dead');
    
    // Add appropriate state class based on pet condition
    if (pet.is_dead === 1) {
        petDisplay.classList.add('pet-dead');
    } else if (pet.hp <= 20 || pet.intimacy <= 20) {
        petDisplay.classList.add('pet-critical');
    } else if (pet.hp <= 50 || pet.intimacy <= 40) {
        petDisplay.classList.add('pet-weak');
    } else if (pet.intimacy <= 60) {
        petDisplay.classList.add('pet-sad');
    }
}

export function hidePet() {
    console.log('[uiRenderer] Hiding pet display');
    
    const success = safeElementOperation('petDisplay', (element) => {
        element.classList.add('hidden');
        return true;
    }, false);
    
    if (!success) {
        console.warn('[uiRenderer] Failed to hide pet display');
    }
    
    // Close pet window if electronAPI is available
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.closePetWindow) {
        try {
            window.electronAPI.closePetWindow();
            console.log('[uiRenderer] Pet window closed');
        } catch (error) {
            console.warn('[uiRenderer] Failed to close pet window:', error);
        }
    }
}

export function showPetNameInput() {
    console.log('[uiRenderer] Showing pet name input');
    
    const success = safeElementOperation('petNameContainer', (element) => {
        element.classList.remove('hidden');
        return true;
    }, false);
    
    if (success) {
        // Focus on input field after a short delay
        setTimeout(() => {
            safeElementOperation('petNameInput', (input) => {
                input.focus();
                input.select(); // Select any existing text
                return true;
            });
        }, 100);
    } else {
        console.error('[uiRenderer] Failed to show pet name input');
    }
}

export function hidePetNameInput() {
    console.log('[uiRenderer] Hiding pet name input');
    
    const success = safeElementOperation('petNameContainer', (element) => {
        element.classList.add('hidden');
        return true;
    }, false);
    
    if (success) {
        // Clear input field
        safeElementOperation('petNameInput', (input) => {
            input.value = '';
            input.blur();
            return true;
        });
    } else {
        console.warn('[uiRenderer] Failed to hide pet name input');
    }
}

// Show error message in UI
export function showError(message, elementId = 'errorMessage') {
    console.log('[uiRenderer] Showing error:', message);
    
    safeElementOperation(elementId, (element) => {
        element.textContent = message;
        element.classList.remove('hidden');
        element.style.display = 'block';
    });
    
    // Auto-hide error after 10 seconds
    setTimeout(() => {
        hideError(elementId);
    }, 10000);
}

// Hide error message
export function hideError(elementId = 'errorMessage') {
    safeElementOperation(elementId, (element) => {
        element.classList.add('hidden');
        element.style.display = 'none';
        element.textContent = '';
    });
}

// Show success message
export function showSuccess(message, elementId = 'successMessage') {
    console.log('[uiRenderer] Showing success:', message);
    
    safeElementOperation(elementId, (element) => {
        element.textContent = message;
        element.classList.remove('hidden');
        element.style.display = 'block';
    });
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
        safeElementOperation(elementId, (element) => {
            element.classList.add('hidden');
            element.style.display = 'none';
            element.textContent = '';
        });
    }, 5000);
}

// Update loading state
export function setLoadingState(isLoading, elementId = null, originalText = null) {
    if (!elementId) return;
    
    safeElementOperation(elementId, (element) => {
        if (isLoading) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.textContent = 'Loading...';
        } else {
            element.disabled = false;
            element.textContent = element.dataset.originalText || originalText || 'Submit';
            delete element.dataset.originalText;
        }
    });
}

// Render pet stats as progress bars
export function renderPetStats(pet, containerId = 'petStats') {
    const validatedPet = validatePetForUI(pet, 'renderPetStats');
    if (!validatedPet) return;
    
    safeElementOperation(containerId, (container) => {
        const hpPercent = Math.round(validatedPet.hp);
        const intimacyPercent = Math.round(validatedPet.intimacy);
        
        container.innerHTML = `
            <div class="stat-group">
                <div class="stat-label">Health: ${hpPercent}%</div>
                <div class="stat-bar">
                    <div class="stat-fill hp-fill" style="width: ${hpPercent}%"></div>
                </div>
            </div>
            <div class="stat-group">
                <div class="stat-label">Intimacy: ${intimacyPercent}%</div>
                <div class="stat-bar">
                    <div class="stat-fill intimacy-fill" style="width: ${intimacyPercent}%"></div>
                </div>
            </div>
            <div class="stat-group">
                <div class="stat-label">Age: ${Math.floor(validatedPet.age || 0)} days</div>
            </div>
        `;
    });
}

// Animate pet stats change
export function animateStatChange(statName, oldValue, newValue, elementId) {
    const change = newValue - oldValue;
    if (Math.abs(change) < 0.1) return; // Don't animate tiny changes
    
    safeElementOperation(elementId, (element) => {
        const changeIndicator = document.createElement('span');
        changeIndicator.className = `stat-change ${change > 0 ? 'positive' : 'negative'}`;
        changeIndicator.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
        
        element.appendChild(changeIndicator);
        
        // Remove indicator after animation
        setTimeout(() => {
            if (changeIndicator.parentNode) {
                changeIndicator.parentNode.removeChild(changeIndicator);
            }
        }, 2000);
    });
}

// Create notification for important pet events
export function showPetNotification(title, message, type = 'info') {
    console.log(`[uiRenderer] Pet notification [${type}]: ${title} - ${message}`);
    
    // Try browser notification first
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: message,
                icon: type === 'critical' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'
            });
            return;
        } catch (error) {
            console.warn('[uiRenderer] Browser notification failed:', error);
        }
    }
    
    // Fallback to custom notification
    const notification = document.createElement('div');
    notification.className = `pet-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds or on close button click
    const remove = () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    };
    
    notification.querySelector('.notification-close').addEventListener('click', remove);
    setTimeout(remove, 5000);
}

// Request notification permission
export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('[uiRenderer] Notification permission:', permission);
        });
    }
}

// Initialize UI renderer
export function initializeRenderer() {
    console.log('[uiRenderer] Initializing UI renderer');
    
    // Request notification permission
    requestNotificationPermission();
    
    // Set up global error handler for UI operations
    window.addEventListener('error', (event) => {
        console.error('[uiRenderer] Global error:', event.error);
        showError('An unexpected error occurred. Please refresh the page.');
    });
    
    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[uiRenderer] Unhandled promise rejection:', event.reason);
        showError('An unexpected error occurred. Please try again.');
    });
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRenderer);
} else if (typeof window !== 'undefined') {
    initializeRenderer();
}
