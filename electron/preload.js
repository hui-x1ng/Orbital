const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] ========== PRELOAD SCRIPT STARTING ==========');
console.log('[PRELOAD] Preload script is running');
console.log('[PRELOAD] contextBridge available:', !!contextBridge);
console.log('[PRELOAD] ipcRenderer available:', !!ipcRenderer);

try {
    console.log('[PRELOAD] About to expose electronAPI...');
    
    const electronAPI = {
        test: () => {
            console.log('[PRELOAD] Test method called successfully!');
            return 'electronAPI is working!';
        },
        registerUser: (userData) => {
            console.log('[PRELOAD] registerUser called');
            return ipcRenderer.invoke('create-user', userData);
        },
        loginUser: (userData) => {
            console.log('[PRELOAD] loginUser called');
            return ipcRenderer.invoke('login', userData);
        },
        checkUserExists: (username) => {
            console.log('[PRELOAD] checkUserExists called for:', username);
            return ipcRenderer.invoke('check-user-exists', username);
        },
        getUserByUsername: (username) => {
            console.log('[PRELOAD] getUserByUsername called for:', username);
            return ipcRenderer.invoke('get-user-by-username', username);
        },
        generatePet: (username, petName) => {
            console.log('[PRELOAD] generatePet called');
            return ipcRenderer.invoke('create-pet', { ownerId: username, name: petName });
        },
        getPets: (username) => {
            console.log('[PRELOAD] getPets called');
            return ipcRenderer.invoke('get-pets');
        },
        getPet: (petId) => {
            console.log('[PRELOAD] getPet called');
            return ipcRenderer.invoke('get-pet', petId);
        },
        updatePetStats: (newPet) => {
            console.log('[PRELOAD] updatePetStats called');
            return ipcRenderer.invoke('update-pet-stats', {newPet});
        },
        killPet: (petId) => {
            console.log('[PRELOAD] killPet called');
            return ipcRenderer.invoke('kill-pet', petId);
        },
        openPetWindow: () => {
            console.log('[PRELOAD] openPetWindow called');
            return ipcRenderer.send('open-pet-window');
        },
        closePetWindow: () => {
            console.log('[PRELOAD] closePetWindow called');
            return ipcRenderer.send('close-pet-window');
        },
        signalPetAnimation: (action) => {
            console.log('[PRELOAD] signalPetAnimation called with:', action);
            return ipcRenderer.send('pet-action', action);
        },
        onPetAction: (callback) => {
            console.log('[PRELOAD] onPetAction called');
            return ipcRenderer.on('perform-pet-action', (_event, action) => {
                callback(action);
            });
        },
        moveWindow: (deltaX, deltaY) => {
            console.log('[PRELOAD] moveWindow called');
            return ipcRenderer.invoke('move-window', deltaX, deltaY);
        },
        toggleDialog: (show) => {
            console.log('[PRELOAD] toggleDialog called');
            return ipcRenderer.invoke('toggle-dialog', show);
        },
        chatWithPet: (message) => {
            console.log('[PRELOAD] chatWithPet called with:', message);
            return ipcRenderer.invoke('chat-with-pet', message);
        },
        saveAiSettings: (settings) => {
            console.log('[PRELOAD] saveAiSettings called with:', {
                ...settings,
                apiKey: settings.apiKey ? `***${settings.apiKey.slice(-4)}` : 'empty'
            });
            return ipcRenderer.invoke('save-ai-settings', settings);
        },
        getAiSettings: () => {
            console.log('[PRELOAD] getAiSettings called');
            return ipcRenderer.invoke('get-ai-settings');
        },
        updateAiSettings: (settings) => {
            console.log('[PRELOAD] updateAiSettings called with:', {
                ...settings,
                apiKey: settings.apiKey ? `***${settings.apiKey.slice(-4)}` : 'empty'
            });
            return ipcRenderer.invoke('update-ai-settings', settings);
        },
        testAiConnection: () => {
            console.log('[PRELOAD] testAiConnection called');
            return ipcRenderer.invoke('test-ai-connection');
        },
        testAiConnectionDetailed: () => {
            console.log('[PRELOAD] testAiConnectionDetailed called');
            return ipcRenderer.invoke('test-ai-connection-detailed');
        },
        reloadAiSettings: () => {
            console.log('[PRELOAD] reloadAiSettings called');
            return ipcRenderer.invoke('reload-ai-settings');
        },
        getAchievementsByName: (username) => {
            console.log('[PRELOAD] getAchievementsByName called');
            return ipcRenderer.invoke('get-achievement-by-name', username);
        },
        grantAchievement: (username, achievement_id) => {
            console.log('[PRELOAD] grantAchievement called');
            return ipcRenderer.send('grant-achievement', {username, achievement_id});
        },
        incrementAchievementProgress: (username, achievement_id) => {
            console.log('[PRELOAD] incrementAchievementProgress called');
            return ipcRenderer.invoke('increment-achievement-progress', {username, achievement_id});
        },
        toggleServer: (isOn) => {
            console.log('[PRELOAD] toggleServer called');
            return ipcRenderer.send('server-toggle', isOn);
        },
        onPetData: (callback) => {
            console.log('[PRELOAD] onPetData called');
            return ipcRenderer.on('pet-data', (event, pet) => callback(pet));
        },

        // LSP相关功能
        startLSPMonitoring: () => {
            console.log('[PRELOAD] startLSPMonitoring called');
            return ipcRenderer.invoke('start-lsp-monitoring');
        },
        stopLSPMonitoring: () => {
            console.log('[PRELOAD] stopLSPMonitoring called');
            return ipcRenderer.invoke('stop-lsp-monitoring');
        },
        getLSPStatus: () => {
            console.log('[PRELOAD] getLSPStatus called');
            return ipcRenderer.invoke('get-lsp-status');
        },
        onLSPStatus: (callback) => {
            console.log('[PRELOAD] onLSPStatus called');
            return ipcRenderer.on('lsp-status', (event, status) => callback(status));
        },
        onLSPDiagnostics: (callback) => {
            console.log('[PRELOAD] onLSPDiagnostics called');
            return ipcRenderer.on('lsp-diagnostics', (event, data) => callback(data));
        },
        onLSPError: (callback) => {
            console.log('[PRELOAD] onLSPError called');
            return ipcRenderer.on('lsp-error', (event, error) => callback(error));
        },
        onDiagnosticStats: (callback) => {
            console.log('[PRELOAD] onDiagnosticStats called');
            return ipcRenderer.on('diagnostic-stats', (event, stats) => callback(stats));
        },
        onRuntimeErrorStats: (callback) => {
            console.log('[PRELOAD] onRuntimeErrorStats called');
            return ipcRenderer.on('runtime-error-stats', (event, stats) => callback(stats));
        },

        // 新增：路径设置相关功能
        getPathSettings: () => {
            console.log('[PRELOAD] getPathSettings called');
            return ipcRenderer.invoke('get-path-settings');
        },
        savePathSettings: (settings) => {
            console.log('[PRELOAD] savePathSettings called with:', settings);
            return ipcRenderer.invoke('save-path-settings', settings);
        },
        selectDirectory: () => {
            console.log('[PRELOAD] selectDirectory called');
            return ipcRenderer.invoke('select-directory');
        },
        restartLSPMonitoring: () => {
            console.log('[PRELOAD] restartLSPMonitoring called');
            return ipcRenderer.invoke('restart-lsp-monitoring');
        },
        scanSpecificPath: (path) => {
            console.log('[PRELOAD] scanSpecificPath called with:', path);
            return ipcRenderer.invoke('scan-specific-path', path);
        },
        checkPetStatus: () => {
            console.log('[PRELOAD] checkPetStatus called');
            return ipcRenderer.invoke('check-pet-status');
        },

        // 移除事件监听器的功能
        removeListener: (eventName, callback) => {
            console.log('[PRELOAD] removeListener called for:', eventName);
            return ipcRenderer.removeListener(eventName, callback);
        },
        removeAllListeners: (eventName) => {
            console.log('[PRELOAD] removeAllListeners called for:', eventName);
            return ipcRenderer.removeAllListeners(eventName);
        }
    };
    
    console.log('[PRELOAD] electronAPI object created with', Object.keys(electronAPI).length, 'methods');
    console.log('[PRELOAD] Methods:', Object.keys(electronAPI).join(', '));
    
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    
    console.log('[PRELOAD] ✅ electronAPI exposed successfully!');
    
} catch (error) {
    console.error('[PRELOAD] ❌ CRITICAL ERROR exposing electronAPI:', error);
    console.error('[PRELOAD] Error message:', error.message);
    console.error('[PRELOAD] Error stack:', error.stack);
    
    try {
        contextBridge.exposeInMainWorld('electronAPI', {
            error: 'Failed to load full API: ' + error.message,
            test: () => 'Basic fallback API working'
        });
        console.log('[PRELOAD] Basic fallback API exposed');
    } catch (fallbackError) {
        console.error('[PRELOAD] Even fallback API failed:', fallbackError);
    }
}

setTimeout(() => {
    console.log('[PRELOAD] Delayed check - Script execution completed');
}, 100);

console.log('[PRELOAD] ========== PRELOAD SCRIPT COMPLETED ==========');