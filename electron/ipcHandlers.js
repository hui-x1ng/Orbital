const { ipcMain } = require('electron');
const db = require('../db/sqlite');
const aiService = require('./aiService');

ipcMain.handle('check-user-exists', async (event, username) => {
    try {
        console.log('IPC Handler - Checking if user exists:', username);
        const exists = db.checkUserExists(username);
        console.log('IPC Handler - User exists result:', exists);
        return exists;
    } catch (error) {
        console.error('IPC Handler - Failed to check user existence:', error);
        throw error;
    }
});

ipcMain.handle('get-user-by-username', async (event, username) => {
    try {
        console.log('IPC Handler - Getting user by username:', username);
        const user = db.getUserByUsername(username);
        console.log('IPC Handler - User found:', !!user);
        return user;
    } catch (error) {
        console.error('IPC Handler - Failed to get user:', error);
        throw error;
    }
});

ipcMain.handle('create-user', async (event, { username, pw }) => {
    try {
        console.log('IPC Handler - Creating user:', username);
        const result = db.createUser(username, pw);
        console.log('IPC Handler - User created successfully');
        return { success: true, id: result };
    } catch (error) {
        console.error('IPC Handler - Failed to create user:', error);
        
        if (error.message.includes('UNIQUE constraint failed') || 
            error.message.includes('User already exists')) {
            throw new Error('Username already exists');
        }
        
        throw new Error('Failed to create user: ' + error.message);
    }
});

ipcMain.handle('create-pet', (event, { ownerId, name }) => {
    try {
        console.log('IPC Handler - Creating pet:', name, 'for user:', ownerId);
        const petId = db.createPet(ownerId, name);
        console.log('IPC Handler - Pet created with ID:', petId);
        return petId;
    } catch (error) {
        console.error('IPC Handler - Failed to create pet:', error);
        throw error;
    }
});

ipcMain.handle('get-pets', async (_, username) => {
    try {
        console.log('IPC Handler - Getting pets for user:', username);
        const pets = db.getPetsByUser(username);
        console.log('IPC Handler - Found', pets.length, 'pets');
        return pets;
    } catch (error) {
        console.error('IPC Handler - Failed to get pets:', error);
        throw error;
    }
});

ipcMain.handle('get-pet', async (_, { username, petName }) => {
    try {
        console.log('IPC Handler - Getting pet:', petName, 'for user:', username);
        const pet = db.getPet(username, petName);
        console.log('IPC Handler - Pet found:', !!pet);
        return pet;
    } catch (error) {
        console.error('IPC Handler - Failed to get pet:', error);
        throw error;
    }
});

ipcMain.handle('update-pet-stats', (_, {newPet}) => {
    try {
        console.log('IPC Handler - Updating pet stats for pet ID:', newPet.id);
        db.updatePetStats(newPet.id, {
            age: newPet.age,
            hp: newPet.hp,
            intimacy: newPet.intimacy
        });
        console.log('IPC Handler - Pet stats updated successfully');
        return { success: true };
    } catch (error) {
        console.error('IPC Handler - Failed to update pet stats:', error);
        throw error;
    }
});

ipcMain.handle('kill-pet', (_, petId) => {
    try {
        console.log('IPC Handler - Killing pet with ID:', petId);
        db.killPet(petId);
        console.log('IPC Handler - Pet killed successfully');
        return { success: true };
    } catch (error) {
        console.error('IPC Handler - Failed to kill pet:', error);
        throw error;
    }
});

ipcMain.handle('chat-with-pet', async (_, message) => {
    try {
        console.log('IPC Handler - Received chat message:', message);
        const response = await aiService.chatWithAI(message);
        console.log('IPC Handler - AI response:', response);
        return response;
    } catch (error) {
        console.error('IPC Handler - Chat error:', error);
        throw error;
    }
});

ipcMain.handle('get-ai-settings', async () => {
    try {
        console.log('IPC Handler - Getting AI settings');
        const settings = await aiService.getApiSettings();
        console.log('IPC Handler - Retrieved settings:', {
            ...settings,
            apiKey: settings.apiKey ? `***${settings.apiKey.slice(-4)}` : 'empty'
        });
        return settings;
    } catch (error) {
        console.error('IPC Handler - Failed to get AI settings:', error);
        throw error;
    }
});

ipcMain.handle('save-ai-settings', async (event, settings) => {
    try {
        console.log('IPC Handler - Saving AI settings:', {
            ...settings,
            apiKey: settings.apiKey ? `***${settings.apiKey.slice(-4)}` : 'empty'
        });
        
        const result = await aiService.saveSettings(settings);
        
        if (result && result.success === false) {
            console.error('IPC Handler - Save failed:', result.error);
            return { success: false, error: result.error };
        }
        
        console.log('IPC Handler - Settings saved successfully');
        return { success: true };
        
    } catch (error) {
        console.error('IPC Handler - Failed to save AI settings:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-ai-settings', async (event, settings) => {
    try {
        console.log('IPC Handler - Updating AI settings (alias):', {
            ...settings,
            apiKey: settings.apiKey ? `***${settings.apiKey.slice(-4)}` : 'empty'
        });
        
        const result = await aiService.saveSettings(settings);
        console.log('IPC Handler - Settings updated successfully');
        return result;
    } catch (error) {
        console.error('IPC Handler - Failed to update AI settings:', error);
        throw error;
    }
});

ipcMain.handle('reload-ai-settings', async () => {
    try {
        console.log('IPC Handler - Reloading AI settings');
        await aiService.reloadSettings();
        console.log('IPC Handler - AI settings reloaded successfully');
        return { success: true };
    } catch (error) {
        console.error('IPC Handler - Failed to reload AI settings:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('test-ai-connection', async () => {
    try {
        console.log('IPC Handler - Testing AI connection');
        const result = await aiService.testConnection();
        console.log('IPC Handler - Connection test result:', result);
        return result;
    } catch (error) {
        console.error('IPC Handler - Connection test failed:', error);
        return false;
    }
});

ipcMain.handle('test-ai-connection-detailed', async () => {
    try {
        console.log('IPC Handler - Testing AI connection (detailed)');
        const result = await aiService.testConnectionDetailed();
        console.log('IPC Handler - Detailed connection test result:', result);
        return result;
    } catch (error) {
        console.error('IPC Handler - Detailed connection test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('updateAiSettings', async (event, settings) => {
    console.log('IPC Handler - Legacy updateAiSettings called');
    return await aiService.saveSettings(settings);
});

ipcMain.handle('getSettings', async () => {
    console.log('IPC Handler - Legacy getSettings called');
    return await aiService.getApiSettings();
});

console.log('IPC Handlers with authentication support initialized successfully');