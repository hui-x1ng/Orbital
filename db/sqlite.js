const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ownerId TEXT,
    name TEXT,
    age INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    hunger INTEGER DEFAULT 0,
    FOREIGN KEY (ownerId) REFERENCES users(username)
  );
`);

function createUser(username, password) {
  const stmt = db.prepare('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)');
  stmt.run(username, password);
}

function createPet(owner, petName) {
    const stmt = db.prepare('INSERT INTO pets (ownerId, name, hp) VALUES (?, ?, ?)');
    return stmt.run(owner, petName, 100).lastInsertRowid;
}

function getPetsByUser(ownerId) {
    const stmt = db.prepare('SELECT * FROM pets WHERE ownerId = ?');
    return stmt.all(ownerId);
}
function updateHunger(petId, newHunger) {
    const stmt = db.prepare(`UPDATE pets SET hunger = ? WHERE id = ?`);
    stmt.run(newHunger, petId);
}

function deletePet(petId) {
    const stmt = db.prepare('DELETE FROM pets WHERE id = ?');
    stmt.run(petId);
}

module.exports = {
  createUser,
  createPet,
  getPetsByUser,
  updateHunger,
  deletePet,
};
