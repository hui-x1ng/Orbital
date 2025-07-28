const WebSocket = require('ws');
const { app, BrowserWindow, ipcMain } = require('electron');
const tokenStore = require('./tokenStore');
const axios = require('axios');

const api = axios.create({
    baseURL: 'http://localhost:3030/api',
    timeout: 10000,
});

let server = null;
let petWindow = null;
let mainWindow = null;

let petCache = null;
let lastPetFetch = 0;
let isProcessing = false;
const CACHE_DURATION = 3000; 

function startServer(port = 8080, petWindowRef = null, mainWindowRef = null) {
  if (server) return;
  
  petWindow = petWindowRef;
  mainWindow = mainWindowRef;
  server = new WebSocket.Server({ port });
  console.log('[LSP Bridge] Server listening on port', port);

  server.on('connection', (ws) => {
    console.log('[LSP Bridge] Extension connected');
    ws.send(JSON.stringify({ type: 'welcome', message: 'Hello from Tamacodechi!' }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        const { type, data } = parsed;

        switch (type) {
          case 'debug_session_start':
            handleSessionStart(data);
            break;
          case 'debug_session_end':
            handleSessionEnd(data);
            break;
          case 'diagnostic_update':
            handleDiagnostic(data);
            break;
          case 'runtime_error':
            handleRuntimeError(data);
            break;
          default:
            console.log('[LSP Bridge] Unknown message type:', type);
            break;
        }
      } catch (err) {
        console.error('[LSP Bridge] Invalid JSON:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });
  });
}

function stopServer() {
  if (server) {
    console.log('[LSP Bridge] Shutting down...');
    server.close(() => {
      console.log('[LSP Bridge] Server closed');
    });
    server = null;
    petWindow = null;
    mainWindow = null;
    petCache = null;
    lastPetFetch = 0;
  }
}

async function getCachedPet() {
  const now = Date.now();
  
  if (petCache && (now - lastPetFetch) < CACHE_DURATION) {
    return petCache;
  }

  try {
    const token = tokenStore.getToken();
    if (!token) {
      console.warn('[Pet] No authentication token found');
      return null;
    }

    console.log('[Pet] Fetching pet data...');
    const res = await api.get('/pets/', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.data.pets || res.data.pets.length === 0) {
      console.warn('[Pet] No pets found in database');
      petCache = null;
      lastPetFetch = now;
      return null;
    }

    const currentPet = res.data.pets.find(pet => !pet.is_dead);
    if (!currentPet) {
      console.warn('[Pet] No living pet found - all pets are dead');
      petCache = null;
      lastPetFetch = now;
      return null;
    }

    console.log(`[Pet] Found living pet: ${currentPet.name} (ID: ${currentPet.id}, HP: ${currentPet.hp})`);
    petCache = currentPet;
    lastPetFetch = now;
    return currentPet;

  } catch (err) {
    console.error('[Pet] Error fetching pet data:', err.message);
    if (err.response) {
      console.error('[Pet] API Response:', err.response.status, err.response.data);
    }
    return null;
  }
}

async function updatePetSafely(petId, updates) {
  try {
    const token = tokenStore.getToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const validUpdates = {};
    if (typeof updates.hp === 'number' && updates.hp >= 0 && updates.hp <= 100) {
      validUpdates.hp = Math.round(updates.hp * 100) / 100;
    }
    if (typeof updates.age === 'number' && updates.age >= 0) {
      validUpdates.age = updates.age;
    }
    if (typeof updates.intimacy === 'number' && updates.intimacy >= 0) {
      validUpdates.intimacy = updates.intimacy;
    }

    if (Object.keys(validUpdates).length === 0) {
      console.warn('[Pet] No valid updates to apply');
      return false;
    }

    console.log(`[Pet] Updating pet ${petId} with:`, validUpdates);
    const res = await api.patch(`/pets/${petId}`, validUpdates, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 200) {
      console.log(`[Pet] Successfully updated pet ${petId}`);
      if (petCache && petCache.id === petId) {
        Object.assign(petCache, validUpdates);
      }
      return true;
    }

    console.warn(`[Pet] Unexpected response status: ${res.status}`);
    return false;
  } catch (err) {
    console.error('[Pet] Error updating pet:', err.message);
    if (err.response) {
      console.error('[Pet] Update API Response:', err.response.status, err.response.data);
    }
    return false;
  }
}

function handleSessionStart(data) {
  console.log('[Pet] Debug session started:', data.name);
}

function handleSessionEnd(data) {
  console.log('[Pet] Debug session ended.');
}

async function handleDiagnostic(data) {
  try {
    if (isProcessing) {
      console.log('[Pet] Already processing diagnostics, skipping...');
      return;
    }

    if (!data || !Array.isArray(data.diagnostics)) {
      console.warn('[Pet] Invalid diagnostic data:', data);
      return;
    }

    const diagnostics = data.diagnostics;
    if (diagnostics.length === 0) {
      console.log('[Pet] No diagnostics to process');
      return;
    }

    isProcessing = true;
    console.log(`[Pet] Processing ${diagnostics.length} diagnostics for ${data.fileName}...`);

    const currentPet = await getCachedPet();
    if (!currentPet) {
      console.warn('[Pet] ❌ No pet available for diagnostic processing');
      
      console.log('[Pet] 🔄 Attempting to create a new pet...');
      try {
        const token = tokenStore.getToken();
        const createRes = await api.post('/pets/', 
          { name: 'CodePet' }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (createRes.status === 201) {
          console.log('[Pet] ✅ New pet created successfully');
          petCache = createRes.data.pet;
          lastPetFetch = Date.now();
        }
      } catch (createErr) {
        console.error('[Pet] ❌ Failed to create new pet:', createErr.response?.data?.message || createErr.message);
        isProcessing = false;
        return;
      }
    }

    const pet = petCache || await getCachedPet();
    if (!pet) {
      console.error('[Pet] ❌ Still no pet available after creation attempt');
      isProcessing = false;
      return;
    }

    let hpLoss = 0;
    let animationType = 'annoyed';
    
    diagnostics.forEach(diag => {
      switch (diag.severity) {
        case 'error':
          hpLoss += 2.0;
          animationType = 'very_annoyed';
          break;
        case 'warning':
          hpLoss += 0.5;
          break;
        case 'information':
        case 'hint':
          hpLoss += 0.1;
          break;
        default:
          hpLoss += 0.5;
      }
    });

    hpLoss = Math.min(hpLoss, 15); 
    const newHp = Math.max(pet.hp - hpLoss, 0);

    console.log(`[Pet] 💔 ${pet.name} losing ${hpLoss} HP (${pet.hp} → ${newHp})`);

    const updateSuccess = await updatePetSafely(pet.id, { hp: newHp });
    
    if (updateSuccess) {
      console.log('[Pet] ✅ Pet HP updated successfully');
      
      if (petWindow && petWindow.webContents) {
        petWindow.webContents.send('pet-action', animationType);
        console.log(`[Pet] 🎭 Triggered ${animationType} animation`);
      }

      if (mainWindow && mainWindow.webContents) {
        const updatedPet = { ...pet, hp: newHp };
        mainWindow.webContents.send('pet-data', updatedPet);
      }

      const stats = {
        errors: diagnostics.filter(d => d.severity === 'error').length,
        warnings: diagnostics.filter(d => d.severity === 'warning').length,
        total: diagnostics.length,
        hpLoss: hpLoss,
        newHp: newHp
      };

      console.log(`[Pet] 📊 Diagnostic Summary for ${data.fileName || 'unknown file'}:`);
      console.log(`  - Errors: ${stats.errors}, Warnings: ${stats.warnings}, Total: ${stats.total}`);
      console.log(`  - HP Loss: ${stats.hpLoss}, New HP: ${stats.newHp}`);
      console.log(`  - Animation: ${animationType}`);

      const maxLogCount = 3;
      diagnostics.slice(0, maxLogCount).forEach((diag, index) => {
        console.log(`[Pet] ${index + 1}. ${diag.severity.toUpperCase()}: ${diag.message} at ${diag.line}:${diag.column}`);
      });
      
      if (diagnostics.length > maxLogCount) {
        console.log(`[Pet] ... and ${diagnostics.length - maxLogCount} more issues`);
      }

      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('diagnostic-stats', {
          fileName: data.fileName,
          filePath: data.filePath,
          stats,
          timestamp: Date.now()
        });
      }
    } else {
      console.error('[Pet] ❌ Failed to update pet HP');
    }

  } catch (err) {
    console.error('[Pet] Error handling diagnostics:', err.message);
  } finally {
    isProcessing = false;
  }
}

async function handleRuntimeError(data) {
  try {
    if (isProcessing) {
      console.log('[Pet] Already processing, skipping runtime error...');
      return;
    }

    isProcessing = true;

    const currentPet = await getCachedPet();
    if (!currentPet) {
      console.warn('[Pet] No pet available for runtime error processing');
      isProcessing = false;
      return;
    }

    const hpLoss = 5;
    const newHp = Math.max(currentPet.hp - hpLoss, 0);

    console.log(`[Pet] 💥 Runtime error! ${currentPet.name} losing ${hpLoss} HP`);

    const updateSuccess = await updatePetSafely(currentPet.id, { hp: newHp });
    
    if (updateSuccess) {
      try {
        const token = tokenStore.getToken();
        await api.post(
          `/achievements/progress/firstError`,
          { amount: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (achievementErr) {
        console.warn('[Pet] Failed to increment achievement:', achievementErr.message);
      }

      if (petWindow && petWindow.webContents) {
        petWindow.webContents.send('pet-action', 'very_annoyed');
      }

      console.log(`[Pet] Runtime Error: ${data.message} at line ${data.line}, column ${data.column}`);

      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('runtime-error-stats', {
          message: data.message,
          line: data.line,
          column: data.column,
          hpLoss: 5,
          newHp: newHp,
          timestamp: Date.now()
        });
      }
    }

  } catch (err) {
    console.error('[Pet] Error handling runtime error:', err.message);
  } finally {
    isProcessing = false;
  }
}

module.exports = { 
  startServer, 
  stopServer, 
  handleDiagnostic,
  handleRuntimeError
};