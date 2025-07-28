let currentUser = null;

function hashPassword(password) {
    let hash = 0;
    const salt = 'tamacodchi_salt_2024';
    const combined = password + salt;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function verifyPassword(plainPassword, hashedPassword) {
    return hashPassword(plainPassword) === hashedPassword;
}

export async function register(username, password) {
    try {
        console.log('[userManager] Registering user:', username);
        
        if (!username || !password) {
            throw new Error("Username and password cannot be empty");
        }
        if (username.length < 3) {
            throw new Error("Username must be at least 3 characters");
        }
        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }
        
        if (window.electronAPI?.registerUser) {
            try {
                const response = await window.electronAPI.registerUser({ username, password });
                
                if (response && response.success) {
                    console.log('[userManager] Registration successful via new API');
                    currentUser = { username };
                    return response;
                } else {
                    throw new Error(response?.message || 'Registration failed');
                }
            } catch (newApiError) {
                console.warn('[userManager] New API registration failed:', newApiError);
                
                if (newApiError.message?.includes('already exists')) {
                    throw newApiError;
                }
            }
        }
        
        if (window.electronAPI?.checkUserExists) {
            try {
                const existingUser = await window.electronAPI.checkUserExists(username);
                if (existingUser) {
                    throw new Error("Username already exists");
                }
                
                const hashedPassword = hashPassword(password);
                const result = await window.electronAPI.registerUser({ 
                    username, 
                    pw: hashedPassword 
                });
                
                currentUser = { username };
                console.log('[userManager] Registration successful via legacy API');
                return { success: true, username };
                
            } catch (legacyError) {
                console.error('[userManager] Legacy API registration failed:', legacyError);
                throw legacyError;
            }
        }
        
        throw new Error('No registration API available');
        
    } catch (error) {
        console.error('[userManager] Registration error:', error);
        throw error;
    }
}

export async function login(username, password) {
    try {
        console.log('[userManager] Logging in user:', username);
        
        if (!username || !password) {
            throw new Error("Username and password cannot be empty");
        }
        
        if (window.electronAPI?.loginUser) {
            try {
                const response = await window.electronAPI.loginUser({ username, password });
                
                if (response && response.success) {
                    currentUser = { username: response.username || username };
                    console.log('[userManager] Login successful via new API');
                    return response;
                } else {
                    throw new Error(response?.message || 'Login failed');
                }
            } catch (newApiError) {
                console.warn('[userManager] New API login failed:', newApiError);
                
                if (newApiError.message?.includes('password') || newApiError.message?.includes('user')) {
                    throw newApiError;
                }
            }
        }
        
        if (window.electronAPI?.getUserByUsername) {
            try {
                const user = await window.electronAPI.getUserByUsername(username);
                if (!user) {
                    throw new Error("User does not exist");
                }
                
                if (!verifyPassword(password, user.password)) {
                    throw new Error("Incorrect password");
                }
                
                currentUser = { username };
                console.log('[userManager] Login successful via legacy API');
                return { success: true, username };
                
            } catch (legacyError) {
                console.error('[userManager] Legacy API login failed:', legacyError);
                throw legacyError;
            }
        }
        
        throw new Error('No login API available');
        
    } catch (error) {
        console.error('[userManager] Login error:', error);
        throw error;
    }
}

export function logout() {
    console.log('[userManager] Logging out user');
    currentUser = null;
    clearUser();
}

export function getUser() {
    if (currentUser) {
        return currentUser;
    }
    
    try {
        const raw = localStorage.getItem('user');
        const user = raw ? JSON.parse(raw) : null;
        if (user) {
            currentUser = user;
            return user;
        }
    } catch (error) {
        console.warn('[userManager] Failed to load user from localStorage:', error);
    }
    
    try {
        const username = sessionStorage.getItem('username');
        if (username) {
            currentUser = { username };
            return currentUser;
        }
    } catch (error) {
        console.warn('[userManager] Failed to load user from sessionStorage:', error);
    }
    
    return null;
}

export function isLoggedIn() {
    return !!getUser();
}

export function saveUser(user) {
    try {
        localStorage.setItem('user', JSON.stringify(user));
        currentUser = user;
        console.log('[userManager] User saved to localStorage');
    } catch (error) {
        console.warn('[userManager] Failed to save user to localStorage:', error);
    }
}

export function loadUser() {
    return getUser();
}

export function clearUser() {
    try {
        localStorage.removeItem('user');
        sessionStorage.removeItem('username');
        currentUser = null;
        console.log('[userManager] User data cleared');
    } catch (error) {
        console.warn('[userManager] Failed to clear user data:', error);
    }
}

export function saveUserState(user) {
    saveUser(user);
}

export async function getUserAchievements() {
    try {
        console.log('[userManager] Getting user achievements');
        
        if (!window.electronAPI?.getAchievementsByName) {
            console.warn('[userManager] Achievement API not available');
            return [];
        }
        
        const response = await window.electronAPI.getAchievementsByName();
        
        if (response && response.success && Array.isArray(response.achievements)) {
            console.log(`[userManager] Retrieved ${response.achievements.length} achievements`);
            return response.achievements;
        } else if (Array.isArray(response)) {
            console.log(`[userManager] Retrieved ${response.length} achievements (legacy format)`);
            return response;
        } else if (response?.achievements) {
            console.log(`[userManager] Retrieved achievements (object format)`);
            return response.achievements;
        }
        
        console.log('[userManager] No achievements found');
        return [];
        
    } catch (error) {
        console.error('[userManager] Failed to get achievements:', error);
        return [];
    }
}

export async function grantAchievement(achievementId) {
    try {
        const user = getUser();
        const username = user ? user.username : null;
        
        if (!username) {
            console.warn('[userManager] No logged-in user for achievement grant');
            return false;
        }
        
        console.log('[userManager] Granting achievement:', achievementId, 'to user:', username);
        
        if (window.electronAPI?.grantAchievement) {
            try {
                const result = await window.electronAPI.grantAchievement(username, achievementId);
                if (result && result.success) {
                    showAchievementPopup(achievementId);
                    return true;
                }
            } catch (error) {
                console.error('[userManager] Failed to grant achievement:', error);
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('[userManager] Error in grantAchievement:', error);
        return false;
    }
}

export async function incrementAchievementProgress(achievement_id, amount = 1) {
    try {
        const user = getUser();
        if (!user) {
            console.warn('[userManager] No logged-in user for achievement progress');
            return false;
        }
        
        console.log('[userManager] Incrementing achievement progress:', achievement_id, 'by', amount);
        
        if (window.electronAPI?.incrementAchievementProgress) {
            const response = await window.electronAPI.incrementAchievementProgress(achievement_id, amount);
            
            if (response && response.completed) {
                showAchievementPopup(achievement_id);
                return true;
            }
            
            return response && response.success;
        }
        
        return false;
        
    } catch (error) {
        console.error('[userManager] Failed to increment achievement progress:', error);
        return false;
    }
}

function showAchievementPopup(achievementId) {
    console.log(`[userManager] Achievement unlocked: ${achievementId}`);
    
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Achievement Unlocked!', {
            body: `You've unlocked: ${achievementId}`,
            icon: '🏆'
        });
    } else {
        alert(`🏆 Achievement unlocked: ${achievementId}`);
    }
    
    window.dispatchEvent(new CustomEvent('achievement-unlocked', {
        detail: { achievementId }
    }));
}

export function incrementStat(statName, amount = 1) {
    try {
        const user = getUser();
        if (!user) return false;
        
        if (!user.stats) {
            user.stats = {};
        }
        
        user.stats[statName] = (user.stats[statName] || 0) + amount;
        saveUserState(user);
        
        console.log(`[userManager] Incremented ${statName} by ${amount}`);
        return true;
        
    } catch (error) {
        console.error('[userManager] Failed to increment stat:', error);
        return false;
    }
}

export function getStat(statName) {
    try {
        const user = getUser();
        if (!user || !user.stats) return 0;
        return user.stats[statName] || 0;
    } catch (error) {
        console.error('[userManager] Failed to get stat:', error);
        return 0;
    }
}

export function resetStats() {
    try {
        const user = getUser();
        if (!user) return false;
        
        user.stats = {};
        saveUserState(user);
        console.log('[userManager] User stats reset');
        return true;
        
    } catch (error) {
        console.error('[userManager] Failed to reset stats:', error);
        return false;
    }
}

export function validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username.length < 3 || username.length > 20) return false;
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;
    return true;
}

export function validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 6) return false;
    return true;
}

export function getUserDisplayName(user) {
    if (!user) return 'Guest';
    return user.displayName || user.username || 'User';
}

export function getUserRole(user) {
    if (!user) return 'guest';
    return user.role || 'user';
}

export {
    hashPassword,
    verifyPassword,
    showAchievementPopup
};