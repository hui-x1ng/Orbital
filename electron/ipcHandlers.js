const { ipcMain } = require('electron');
const db = require('../db/sqlite');

ipcMain.handle('create-user', (event, { username, pw }) => {
    db.createUser(username, pw);
});

ipcMain.handle('create-pet', (event, { ownerId, name }) => {
    const petId = db.createPet(ownerId, name);
    // return petId;
});

ipcMain.handle('get-pets', async (_, username) => {
    return db.getPetsByUser(username);
});

ipcMain.handle('update-pet-hp', async (_, { petId, newHp }) => {
    return db.updateHp(petId, newHp);
});

ipcMain.handle('update-pet-intimacy', async (_, { petId, newInt }) => {
    return db.updateIntimacy(petId, newInt);
});

ipcMain.handle('kill-pet', (_, petId) => {
    db.killPet(petId);  
});

