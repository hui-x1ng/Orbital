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
    if (!username || !password) {
        throw new Error("Username and password cannot be empty");
    }
    if (username.length < 3) {
        throw new Error("Username must be at least 3 characters");
    }
    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }
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
        return currentUser;
    } catch (error) {
        throw error;
    }
}

export async function login(username, password) {
    if (!username || !password) {
        throw new Error("Username and password cannot be empty");
    }
    try {
        const user = await window.electronAPI.getUserByUsername(username);
        if (!user) {
            throw new Error("User does not exist");
        }
        if (!verifyPassword(password, user.password)) {
            throw new Error("Incorrect password");
        }
        currentUser = { username };
        return currentUser;
    } catch (error) {
        throw error;
    }
}

export function logout() {
    currentUser = null;
    clearUser();
}

export function getUser() {
    return currentUser;
}

export function isLoggedIn() {
    return !!currentUser;
}

export function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

export function loadUser() {
    try {
        const raw = localStorage.getItem('user');
        const user = raw ? JSON.parse(raw) : null;
        if (user) {
            currentUser = user;
        }
        return user;
    } catch (error) {
        return null;
    }
}

export function clearUser() {
    localStorage.removeItem('user');
    currentUser = null;
}