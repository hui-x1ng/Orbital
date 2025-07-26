let currentUser = null;

//returns success or not and the username if success
export async function login(username, password) {
    const electronAPI = window.electronAPI;
    const response = await electronAPI.loginUser({ username, password });
    // saveUserState(currentUser);
    return response;

}

export async function register(username, password) {
    const electronAPI = window.electronAPI;
    const response = await electronAPI.registerUser({ username, password });
    console.log(response);
    return response.success;
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
    const electronAPI = window.electronAPI;
    const achievements = await electronAPI.getAchievementsByName();
    console.log(achievements.achievements);
    return achievements.achievements
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
  
  alert(`Achievement unlocked: ${achievementId}`);
  }

export async function incrementAchievementProgress(achievement_id) {
    const electronAPI = window.electronAPI;
    console.log('pet number should be incremented')
    const amount = 1;
    const response = await electronAPI.incrementAchievementProgress(achievement_id, amount);
    if (response.completed) {
        showAchievementPopup(achievement_id);
    }
}