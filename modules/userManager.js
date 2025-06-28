let currentUser = null;

export async function login(username, password) {
    if (!username || !password) throw new Error("Username or password missing");

    if (password !== 'petlover') throw new Error("Incorrect password");

    await window.electronAPI.registerUser({ username, pw: password });
    currentUser = { username };
    return currentUser;
}

export function logout() {
    currentUser = null;
}

//get user from localstorage
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
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

export function clearUser() {
    localStorage.removeItem('user');
}

