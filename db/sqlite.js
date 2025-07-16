const achievements = require('../achievements/achievements.js');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { app } = require('electron');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'data.db');

const bundledDbPath = path.join(__dirname, '..', 'data.db');
const ALL_ACHIEVEMENTS = achievements.ALL_ACHIEVEMENTS;
const db = new Database(dbPath);
console.log("Using DB at:", dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT,
    name TEXT,
    age INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    intimacy REAL NOT NULL DEFAULT 0.0,
    is_dead BOOLEAN DEFAULT false,
    FOREIGN KEY (owner_id) REFERENCES users(username)
    UNIQUE(owner_id, name)
  );

  CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY UNIQUE,
      name TEXT,
      description TEXT,
      target INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT,
    achievement_id TEXT,
    achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
  );

CREATE TABLE IF NOT EXISTS user_achievement_progress (
    user_id INT,
    achievement_id INT,
    current_progress INT DEFAULT 0,
    target INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id)
  );
`);

//users and pets

function createUser(username, password) {
  const stmt = db.prepare('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)');
  stmt.run(username, password);
}

function createPet(owner, petName) {
  const stmt = db.prepare('INSERT INTO pets (owner_id, name) VALUES (?, ?)');
  return stmt.run(owner, petName).lastInsertRowid;
}

function getPetsByUser(ownerId) {
  const stmt = db.prepare('SELECT * FROM pets WHERE owner_id = ?');
  return stmt.all(ownerId);
}

function updatePetStats(petId, updates) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    fields.push(`${key} = ?`);
    values.push(updates[key]);
  }

  const stmt = db.prepare(`
    UPDATE pets
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values, petId);
}

function deletePet(petId) {
  const stmt = db.prepare('DELETE FROM pets WHERE id = ?');
  stmt.run(petId);
}

function getPet(username, petName) {
  const stmt = db.prepare('SELECT * FROM pets WHERE owner_id = ? AND name = ?');
  return stmt.get(username, petName);
}

function killPet(petId) {
  const stmt = db.prepare('UPDATE pets SET is_dead = true WHERE id = ? AND is_dead = false');
  stmt.run(petId);
}

//achievements

function getAchievementsByName(username) {
  const stmt = db.prepare(`
SELECT achievements.name, achievements.description, user_achievements.achieved_at
    FROM user_achievements
    JOIN achievements ON user_achievements.achievement_id = achievements.id
    WHERE user_achievements.user_id = ?
    `);
  return stmt.all(username);
}

function grantAchievement(username, achievement_id) {
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) 
      VALUES (?, ?)
    `);
    stmt.run(username, achievement_id);
  } catch (err) {
    console.error(err);
  }
}

function insertAllAchievements() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO achievements (id, name, description, target)
    VALUES (?, ?, ?, ?)
  `);
  const insertMany = db.transaction(() => {
    for (const achievement of ALL_ACHIEVEMENTS) {
      insert.run(achievement.id, achievement.title, achievement.description, achievement.target);
    }
  });
  insertMany();
}

function initializeAchievementProgress(userId, achievementId) {
  console.log(userId);
  console.log(achievementId);
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO user_achievement_progress (user_id, achievement_id, current_progress, target)
    SELECT ?, ?, 0, achievements.target 
    FROM achievements 
    WHERE id = ?
  `);
  stmt.run(userId, achievementId, achievementId);
}

//returns whether youve completeed the achivement or not
function incrementAchievementProgress(userId, achievementId, amount = 1) {
  if (checkAchievementCompletion(userId, achievementId)) {
    return true;
  }
  //ensures record for this achivement exists
  initializeAchievementProgress(userId, achievementId);

  const debugRow = db.prepare(`
    SELECT * FROM user_achievement_progress 
    WHERE user_id = ? AND achievement_id = ?
  `).get(userId, achievementId);

  if (!debugRow) {
    throw new Error('Row missing after initializeAchievementProgress.');
  }
  
  const stmt = db.prepare(`
    UPDATE user_achievement_progress 
    SET current_progress = current_progress + ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND achievement_id = ?
  `);
  stmt.run(amount, userId, achievementId);
  
  return checkAchievementCompletion(userId, achievementId);
}

function checkAchievementCompletion(userId, achievementId) {
  const progress = db.prepare(`
    SELECT current_progress, target
    FROM user_achievement_progress 
    WHERE user_id = ? AND achievement_id = ?
  `).get(userId, achievementId);
  
  if (progress && progress.current_progress >= progress.target) {
    grantAchievement(userId, achievementId);
    db.prepare(`
      DELETE FROM user_achievement_progress 
      WHERE user_id = ? AND achievement_id = ?
    `).run(userId, achievementId);
    return true;
  }
  return false;
}



insertAllAchievements();

module.exports = {
  createUser,
  createPet,
  getPetsByUser,
  updatePetStats,
  killPet,
  getPet,
  getAchievementsByName,
  grantAchievement,
  incrementAchievementProgress,
};
