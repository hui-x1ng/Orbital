const { ipcMain } = require('electron');
const db = require('../backend/sqlite');
const aiService = require('./aiService');
const axios = require('axios');
const tokenStore = require('./tokenStore');

const api = axios.create({
    baseURL: 'http://localhost:3030/api',
    timeout: 5000,
});

ipcMain.handle('create-user', async (_, { username, password }) => {
    try {        
        const res = await api.post('/auth/register', {
            username: username,
            password: password
        });

        if (res.status === 201) {
            tokenStore.setToken(res.data.token);
            return { success: true };
        } else {
            return { success: false, message: res.data.message };
        }
    } catch (err) {
        const message = err.response?.data?.message || err.message || 'Request failed';
        return { success: false, message };
    }
});

ipcMain.handle('login', async (_, { username, password }) => {
    try {
        const res = await api.post('/auth/login', {
            username: username,
            password: password
        });

        if (res.status === 200 || res.status === 201) {
            tokenStore.setToken(res.data.token);
            tokenStore.setUsername(res.data.user.username);
            return { success: true, username: res.data.user.username };
        } else {
            return { success: false, message: res.data.message };
        }
    } catch (err) {
        const message = err.response?.data?.message || err.message || 'Login failed';
        return { success: false, message };
    }
});

ipcMain.handle('check-user-exists', async (event, username) => {
    try {
        return true;
    } catch (error) {
        console.error('IPC Handler - Failed to check user existence:', error);
        throw error;
    }
});

ipcMain.handle('get-user-by-username', async (event, username) => {
    try {
        const token = tokenStore.getToken();
        if (token) {
            return { username: tokenStore.getUsername() };
        }
        return null;
    } catch (error) {
        console.error('IPC Handler - Failed to get user:', error);
        throw error;
    }
});

ipcMain.handle('create-pet', async (event, { ownerId, name }) => {
    try {
        const response = await api.post(
            '/pets/',
            { name: name },
            {
                headers: {
                    Authorization: `Bearer ${tokenStore.getToken()}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 201) {
            console.log('Pet created:', response.data.pet);
            return { success: true, pet: response.data.pet };
        }
    } catch (err) {
        if (err.response) {
            console.error('Failed to create pet:', err.response.data.message || err.response.data.error);
            return { success: false, message: err.response.data.message || 'Failed to create pet' };
        } else {
            console.error('Error creating pet:', err.message);
            return { success: false, message: err.message };
        }
    }
});

ipcMain.handle('get-pets', async (_) => {
    const token = tokenStore.getToken();
    try {
        const res = await api.get('/pets/', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        return { success: true, pets: res.data.pets, count: res.data.count };
    } catch (err) {
        console.error('Failed to fetch pets:', err.message);
        return { success: false, message: err.response?.data?.error || err.message };
    }
});

ipcMain.handle('get-pet', async (_, petId) => {
    try {
        const token = tokenStore.getToken();
        
        const res = await api.get(`/pets/${petId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 200) {
            return { success: true, pet: res.data.pet};
        }
        return { success: false, message: 'Unexpected response status: ' + res.status };
    } catch (err) {
        return { 
            success: false, 
            message: err.response?.data?.message || err.message 
        };
    }
});

ipcMain.handle('update-pet-stats', async (_, { newPet }) => {
    try {
        const updates = {};
        if (newPet.age !== undefined) updates.age = newPet.age;
        if (newPet.hp !== undefined) updates.hp = newPet.hp;
        if (newPet.intimacy !== undefined) updates.intimacy = newPet.intimacy;

        const token = tokenStore.getToken();

        const res = await api.patch(`/pets/${newPet.id}`, updates, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 200) {
            return { success: true };
        }
        return { success: false, message: 'Unexpected response status: ' + res.status };
    } catch (err) {
        return { 
            success: false, 
            message: err.response?.data?.message || err.message 
        };
    }
});

ipcMain.handle('kill-pet', async (_, petId) => {
    try {
        const token = tokenStore.getToken();

        const res = await api.post(`/pets/${petId}/kill`, null, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 200) {
            return { success: true };
        } else {
            return { success: false, message: res.data.message || 'Unexpected error' };
        }
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || error.message
        };
    }
});

ipcMain.handle('chat-with-pet', async (_, message) => {
    try {
        const response = await aiService.chatWithAI(message);
        return response;
    } catch (error) {
        console.error('IPC Handler - Chat error:', error);
        throw error;
    }
});

ipcMain.handle('get-ai-settings', async () => {
    try {
        const settings = await aiService.getApiSettings();
        return settings;
    } catch (error) {
        console.error('IPC Handler - Failed to get AI settings:', error);
        throw error;
    }
});

ipcMain.handle('save-ai-settings', async (event, settings) => {
    try {
        const result = await aiService.saveSettings(settings);
        
        if (result && result.success === false) {
            console.error('IPC Handler - Save failed:', result.error);
            return { success: false, error: result.error };
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('IPC Handler - Failed to save AI settings:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-ai-settings', async (event, settings) => {
    try {
        const result = await aiService.saveSettings(settings);
        return result;
    } catch (error) {
        console.error('IPC Handler - Failed to update AI settings:', error);
        throw error;
    }
});

ipcMain.handle('reload-ai-settings', async () => {
    try {
        await aiService.reloadSettings();
        return { success: true };
    } catch (error) {
        console.error('IPC Handler - Failed to reload AI settings:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('test-ai-connection', async () => {
    try {
        const result = await aiService.testConnection();
        return result;
    } catch (error) {
        console.error('IPC Handler - Connection test failed:', error);
        return false;
    }
});

ipcMain.handle('test-ai-connection-detailed', async () => {
    try {
        const result = await aiService.testConnectionDetailed();
        return result;
    } catch (error) {
        console.error('IPC Handler - Detailed connection test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

ipcMain.handle('get-achievement-by-name', async () => {
    const token = tokenStore.getToken();

    try {
        const res = await api.get('/achievements/', {
            headers: { Authorization: `Bearer ${token}` }
        });

        return { success: true, achievements: res.data.achievements };
    } catch (err) {
        return {
            success: false,
            message: err.response?.data?.message || err.message
        };
    }
});

ipcMain.handle('grant-achievement', async (_, { achievement_id }) => {
    const token = tokenStore.getToken();

    try {
        const res = await api.post(
            `/achievements/${achievement_id}/grant`,
            null,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        return { success: true, data: res.data };
    } catch (err) {
        return {
            success: false,
            message: err.response?.data?.message || err.message
        };
    }
});

ipcMain.handle('insert-achievements', (_) => {
    db.insertAllAchievements();
});

ipcMain.handle('increment-achievement-progress', async (_, { achievement_id, amount = 1 }) => {
    const token = tokenStore.getToken();

    try {
        const res = await api.post(
            `/achievements/progress/${achievement_id}`,
            { amount },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        return { success: true, completed: res.data.completed };
    } catch (err) {
        return {
            success: false,
            message: err.response?.data?.message || err.message
        };
    }
});

ipcMain.handle('updateAiSettings', async (event, settings) => {
    return await aiService.saveSettings(settings);
});

ipcMain.handle('getSettings', async () => {
    return await aiService.getApiSettings();
});

console.log('IPC Handlers with merged authentication and AI support initialized successfully');