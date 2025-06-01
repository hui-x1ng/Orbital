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
    return await db.getPetsByUser(username);
});

ipcMain.handle('update-pet-hunger', async (_, { petId, newHunger }) => {
    return await db.updateHunger(petId, newHunger);
});

ipcMain.handle('delete-pet', (event, petId) => {
    db.deletePet(petId);  
});

