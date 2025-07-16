let currentUser = null;
const electronAPI = window.electronAPI;

//login user to db
export async function login(username, password) {
    if (!username || !password) throw new Error("Username or password missing");

    if (password !== 'petlover') throw new Error("Incorrect password");

    await window.electronAPI.registerUser({ username, pw: password });
    currentUser = {
        username
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

export function getUser() {
    const raw = localStorage.getItem('user');
    console.log(raw ? JSON.parse(raw) : null);
    return raw ? JSON.parse(raw) : null;
}

export function clearUser() {
    localStorage.removeItem('user');
}

export async function getUserAchievements() {
    const username = getUser() ? getUser().username : null;
    const achievements = await electronAPI.getAchievementsByName(username);
    console.log(achievements);
    return achievements
}

export function grantAchievement(achievementId) {
  const username = getUser() ? getUser().username : null;
  if (!username) {
    console.warn('No logged-in user!');
    return;
  }
  electronAPI.grantAchievement(username, achievementId);
}


function showAchievementPopup(achievementId) {
    console.log(`Achievement unlocked: ${achievementId}`);
}

export function incrementStat(statKey, amount = 1) {
    const user = getUser();
    if (!user) return;
    user.stats[statKey] = (user.stats[statKey] || 0) + amount;
    saveUserState(user);
}
