import { incrementStat, getUser, grantAchievement, saveUserState } from './userManager.js';

//tracks the stats and timers for achievements of each user, which is stored in local memory

export function onCodeError() {
    const user = getUser();
    if (!user) return;
    user.stats.typosMade += 1;
    user.stats.noErrorStartTime = null;
    saveUserState(user);
}

export function onCodeClean() {
    const user = getUser();
    if (!user || user.stats.noErrorStartTime) return;
    user.stats.noErrorStartTime = Date.now();
    saveUserState(user);
}


export function checkNoTypos10Minutes() {
    const user = getUser();
    if (!user || !user.stats.noErrorStartTime) return;

    const elapsedMs = Date.now() - user.stats.noErrorStartTime;
    const tenMinutesMs = 10 * 60 * 1000;

    if (elapsedMs >= tenMinutesMs) {
        grantAchievement('noTypos10Minutes');
        user.stats.noErrorStartTime = null;  // reset timer after achievement granted
        saveUserState(user);
    }
}

//firstPet
export function checkFirstPetAchievement() {
  const user = getUser();
  if (!user) return;

  if ((user.stats.petsCreated || 0) >= 1 && !user.achievements.includes('firstPet')) {
    grantAchievement('firstPet');
  }
}
