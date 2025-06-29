const { ipcMain } = require('electron');
const db = require('../db/sqlite');
const { chatWithAI } = require('./aiService');

ipcMain.handle('create-user', (event, { username, pw }) => {
    db.createUser(username, pw);
});

ipcMain.handle('create-pet', (event, { ownerId, name }) => {
    const petId = db.createPet(ownerId, name);
});

ipcMain.handle('get-pets', async (_, username) => {
    return db.getPetsByUser(username);
    return db.getPetsByUser(username);
});

ipcMain.handle('get-pet', async (_, { username, petName }) => {
    return db.getPet(username, petName);
});

ipcMain.handle('update-pet-stats', (_, {newPet}) => {
    return db.updatePetStats(newPet.id, {
        age: newPet.age,
        hp: newPet.hp,
        intimacy: newPet.intimacy
    });
});

ipcMain.handle('get-pet', async (_, { username, petName }) => {
    return db.getPet(username, petName);
});

ipcMain.handle('update-pet-stats', (_, {newPet}) => {
    return db.updatePetStats(newPet.id, {
        age: newPet.age,
        hp: newPet.hp,
        intimacy: newPet.intimacy
    });
});

ipcMain.handle('kill-pet', (_, petId) => {
    db.killPet(petId);  
});

ipcMain.handle('chat-with-pet', async (_, message) => {
    return await chatWithAI(message);
});