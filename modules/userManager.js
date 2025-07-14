let currentUser = null;

//login user to db
export async function login(username, password) {
    if (!username || !password) throw new Error("Username or password missing");

    if (password !== 'petlover') throw new Error("Incorrect password");

    await window.electronAPI.registerUser({ username, pw: password });
    currentUser = {
        username,
        achievements: ['firstPet'],
        stats: {} // for achievement
    };
    saveUserState(currentUser);
    return currentUser;

}

export function logout() {
    currentUser = null;
}

//get user from localstorage
// export function getUser() {
//     return currentUser;
// }

export function isLoggedIn() {
    return !!currentUser;
}

//overwrite user data to local
export function saveUserState(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

export function loadUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

export function clearUser() {
    localStorage.removeItem('user');
}

export function getUserAchievements() {
    const user = loadUser();
    return user?.achievements || [];
}

export function grantAchievement(achievementId) {
    const user = getUser();
    if (!user || !achievementId) return;

    if (!user.achievements.includes(achievementId)) {
        user.achievements.push(achievementId);
        saveUser(user);
        showAchievementPopup(achievementId);
    }
}

function showAchievementPopup(achievementId) {
    console.log(`Achievement unlocked: ${achievementId}`);
}
