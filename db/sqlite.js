const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { app } = require('electron');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'data.db');

const bundledDbPath = path.join(__dirname, '..', 'data.db');

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
`);

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

// function updateHp(petId, newHp) {
//   const stmt = db.prepare(`UPDATE pets SET hp = ? WHERE id = ?`);
//   stmt.run(newHp, petId);
// }

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

function killPet(petId) {
  const stmt = db.prepare('UPDATE pets SET is_dead = true WHERE id = ? AND is_dead = false');
  stmt.run(petId);
}

module.exports = {
  createUser,
  createPet,
  getPetsByUser,
  updatePetStats,
  killPet,
};
