const { ipcMain } = require('electron');
const db = require('../backend/sqlite');
const { chatWithAI } = require('./aiService');
const axios = require('axios');
const tokenStore = require('./tokenStore');

const api = axios.create({
    baseURL: 'http://localhost:3030/api',
    timeout: 5000,
});

//register
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
            tokenStore.getUsername(res.data.username)
            return { success: true, username: res.data.user.username };
        } else {
            return { success: false, message: res.data.message };
        }
    } catch (err) {
        const message = err.response?.data?.message || err.message || 'Login failed';
        return { success: false, message };
    }
});


//create new pet, returns true and pet data if success
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

//returns a list of pets and the number of pets of a user
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
        const token = tokenStore.getToken();  // get auth token
        
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

//takes in pet validateRenderables, returns true if success
ipcMain.handle('update-pet-stats', async (_, { newPet }) => {

  try {
    console.log("from ipcHandler" , newPet)
    const updates = {};
    if (newPet.age !== undefined) updates.age = newPet.age;
    if (newPet.hp !== undefined) updates.hp = newPet.hp;
    if (newPet.intimacy !== undefined) updates.intimacy = newPet.intimacy;

    const token = tokenStore.getToken();  // get auth token

    console.log(updates);
    
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


//returns true if kill sucessful
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
    return await chatWithAI(message);
});

//get all achivements of user given username
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


//grant a achivement to user
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
})

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
