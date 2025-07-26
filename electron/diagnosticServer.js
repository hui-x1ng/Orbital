const WebSocket = require('ws');
const { app, BrowserWindow, ipcMain } = require('electron');
const tokenStore = require('./tokenStore');
const axios = require('axios');

const api = axios.create({
    baseURL: 'http://localhost:3030/api',
    timeout: 5000,
});

let server = null;
let petWindow = null; // Store reference to petWindow
let mainWindow = null; // Store reference to mainWindow

function startServer(port = 8080, petWindowRef = null, mainWindowRef = null) {
  if (server) return;
  
  petWindow = petWindowRef; // Store the reference
  mainWindow = mainWindowRef; // Store the main window reference
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
    petWindow = null; // Clear reference
    mainWindow = null; // Clear main window reference
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
    if (!data || !Array.isArray(data.diagnostics)) {
      console.warn('handleDiagnostic called with invalid data:', data);
      return;
    }

    const diagnostics = data.diagnostics;

    // Get pets using IPC handler logic
    const token = tokenStore.getToken();
    try {
      const res = await api.get('/pets/', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.data.pets) {
        console.warn('No pets found');
        return;
      }

      const currentPet = res.data.pets.find(pet => !pet.is_dead);
      if (!currentPet) {
        console.warn('No living pet found');
        return;
      }

      // Calculate new HP (reduce by 0.5 for each diagnostic)
      const newHp = Math.max(currentPet.hp - (diagnostics.length * 0.5), 0);

      // Update pet stats
      const updates = { hp: newHp };
      await api.patch(`/pets/${currentPet.id}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Signal pet animation
      if (petWindow && petWindow.webContents) {
        petWindow.webContents.send('pet-action', 'annoyed');
      }

      // Send updated pet data to main window
      if (mainWindow && mainWindow.webContents) {
        const updatedPet = { ...currentPet, hp: newHp };
        mainWindow.webContents.send('pet-data', updatedPet);
      }

      // Notify main window to refresh pet data
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('pet-data');
      }

      // Log diagnostics
      diagnostics.forEach((diag) => {
        console.log(`[Pet] Diagnostic: ${diag.message} (Severity: ${diag.severity})`);
      });

    } catch (err) {
      console.error('Error in handleDiagnostic:', err);
    }

  } catch (err) {
    console.error('Error handling diagnostics:', err);
  }
}

async function handleRuntimeError(data) {
  try {
    // Get pets using IPC handler logic
    const token = tokenStore.getToken();
    try {
      const res = await api.get('/pets/', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.data.pets) {
        console.warn('No pets found');
        return;
      }

      const currentPet = res.data.pets.find(pet => !pet.is_dead);
      if (!currentPet) {
        console.warn('No living pet found');
        return;
      }

      // Calculate new HP (reduce by 5 for runtime error)
      const newHp = Math.max(currentPet.hp - 5, 0);

      // Update pet stats
      const updates = { hp: newHp };
      await api.patch(`/pets/${currentPet.id}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Increment achievement progress
      try {
        await api.post(
          `/achievements/progress/firstError`,
          { amount: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (achievementErr) {
        console.warn('Failed to increment achievement:', achievementErr.message);
      }

      // Signal pet animation
      if (petWindow && petWindow.webContents) {
        petWindow.webContents.send('pet-action', 'annoyed');
      }

      console.log(`[Pet] Runtime Error: ${data.message} at line ${data.line}, column ${data.column}`);

    } catch (err) {
      console.error('Error in handleRuntimeError:', err);
    }

  } catch (err) {
    console.error('Error handling runtime error:', err);
  }
}



module.exports = { startServer, stopServer };