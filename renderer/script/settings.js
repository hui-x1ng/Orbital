const electronAPI = window.electronAPI;

function initializeVSCodeListener() {
    const toggle = document.getElementById('vscode-listener');
    if (toggle) {
        toggle.addEventListener('change', (e) => {
            if (electronAPI && electronAPI.toggleServer) {
                electronAPI.toggleServer(e.target.checked);
                console.log('[settings.js] VSCode listener toggled:', e.target.checked);
                log(`VSCode listener ${e.target.checked ? 'enabled' : 'disabled'}`);
            }
        });
    }
}

function log(message) {
    const logEl = document.getElementById('log');
    if (logEl) {
        const timestamp = new Date().toLocaleTimeString();
        logEl.textContent += `[${timestamp}] ${message}\n`;
        logEl.scrollTop = logEl.scrollHeight;
    }
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.style.display = 'block';

        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

function checkAPIStatus() {
    if (typeof window.electronAPI === 'undefined') {
        const apiStatus = document.getElementById('apiStatus');
        const methodCount = document.getElementById('methodCount');
        if (apiStatus) apiStatus.textContent = '❌ Unavailable';
        if (methodCount) methodCount.textContent = '0';
        return false;
    }

    const methods = Object.keys(window.electronAPI);
    const apiStatus = document.getElementById('apiStatus');
    const methodCount = document.getElementById('methodCount');
    if (apiStatus) apiStatus.textContent = '✅ Available';
    if (methodCount) methodCount.textContent = methods.length;

    return true;
}

function testAPI() {
    if (!checkAPIStatus()) {
        showStatus('API Unavailable', 'error');
        return;
    }

    try {
        if (typeof window.electronAPI.test === 'function') {
            const result = window.electronAPI.test();
            showStatus('API Test Successful', 'success');
            log('API test completed successfully');
        } else {
            showStatus('Test Method Not Found', 'error');
            log('Test method not found in electronAPI');
        }
    } catch (error) {
        showStatus('API Test Failed', 'error');
        log('API test failed: ' + error.message);
    }
}

async function testBasicCall() {
    if (!window.electronAPI || !window.electronAPI.getAiSettings) {
        showStatus('getAiSettings Unavailable', 'error');
        log('getAiSettings method not available');
        return;
    }

    try {
        await window.electronAPI.getAiSettings();
        showStatus('Basic Call Successful', 'success');
        log('Basic API call successful');
    } catch (error) {
        showStatus('Basic Call Failed', 'error');
        log('Basic API call failed: ' + error.message);
    }
}

async function saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const apiProviderInput = document.getElementById('apiProvider');
    const apiEndpointInput = document.getElementById('apiEndpoint');
    const modelNameInput = document.getElementById('modelName');
    const apiKeyInput = document.getElementById('apiKey');
    const personalityInput = document.getElementById('personality');
    const customPersonalityInput = document.getElementById('customPersonality');
    
    if (!apiKeyInput) {
        showStatus('API Key input not found', 'error');
        return;
    }

    const settings = {
        apiProvider: apiProviderInput ? apiProviderInput.value : 'openai',
        apiEndpoint: apiEndpointInput ? apiEndpointInput.value.trim() : 'https://api.openai.com/v1/chat/completions',
        modelName: modelNameInput ? modelNameInput.value.trim() : 'gpt-3.5-turbo',
        apiKey: apiKeyInput.value.trim(),
        personality: personalityInput ? personalityInput.value : 'friendly',
        customPersonality: customPersonalityInput ? customPersonalityInput.value.trim() : '',
        timestamp: Date.now()
    };

    if (!settings.apiKey) {
        showStatus('Please enter API Key', 'error');
        return;
    }

    if (!settings.apiKey.startsWith('sk-') && !settings.apiKey.startsWith('anthropic-')) {
        showStatus('API Key should start with sk- (OpenAI) or anthropic- (Anthropic)', 'error');
        return;
    }

    if (!settings.apiEndpoint) {
        showStatus('Please enter API Endpoint', 'error');
        return;
    }

    if (!settings.modelName) {
        showStatus('Please enter Model Name', 'error');
        return;
    }

    if (!window.electronAPI || !window.electronAPI.saveAiSettings) {
        showStatus('Save Function Unavailable', 'error');
        return;
    }

    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }
        showStatus('Saving settings...', 'info');

        const result = await window.electronAPI.saveAiSettings(settings);

        if (result && result.success === false) {
            throw new Error(result.error || 'Save failed');
        }

        log('Settings saved successfully');
        showStatus('Settings saved successfully!', 'success');

        if (window.electronAPI.reloadAiSettings) {
            await window.electronAPI.reloadAiSettings();
        }

    } catch (error) {
        showStatus('Save failed: ' + error.message, 'error');
        log('Save failed: ' + error.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Settings';
        }
    }
}

async function testConnection() {
    if (!window.electronAPI || !window.electronAPI.testAiConnectionDetailed) {
        showStatus('Connection Test Function Unavailable', 'error');
        return;
    }

    try {
        showStatus('Testing connection...', 'info');
        log('Starting connection test...');
        
        const result = await window.electronAPI.testAiConnectionDetailed();

        if (result && result.success) {
            showStatus(`Connection successful! Response: ${result.response}`, 'success');
            log(`Connection test successful. Response: ${result.response}`);
        } else {
            showStatus('Connection failed: ' + (result.error || 'Unknown error'), 'error');
            log('Connection test failed: ' + (result.error || 'Unknown error'));
        }

    } catch (error) {
        showStatus('Connection Test Failed', 'error');
        log('Connection test error: ' + error.message);
    }
}

async function loadSettings() {
    if (!window.electronAPI || !window.electronAPI.getAiSettings) {
        showStatus('Load Function Unavailable', 'error');
        return;
    }

    try {
        const settings = await window.electronAPI.getAiSettings();

        const apiProviderInput = document.getElementById('apiProvider');
        const apiEndpointInput = document.getElementById('apiEndpoint');
        const modelNameInput = document.getElementById('modelName');
        const apiKeyInput = document.getElementById('apiKey');
        const personalityInput = document.getElementById('personality');
        const customPersonalityInput = document.getElementById('customPersonality');
        const customPersonalityGroup = document.getElementById('customPersonalityGroup');

        if (settings) {
            if (apiProviderInput && settings.apiProvider) {
                apiProviderInput.value = settings.apiProvider;
            }
            
            if (apiEndpointInput && settings.apiEndpoint) {
                apiEndpointInput.value = settings.apiEndpoint;
            }
            
            if (modelNameInput && settings.modelName) {
                modelNameInput.value = settings.modelName;
            }
            
            if (apiKeyInput && settings.apiKey) {
                apiKeyInput.value = settings.apiKey;
            }
            
            if (personalityInput && settings.personality) {
                personalityInput.value = settings.personality;
                toggleCustomPersonality(settings.personality === 'custom');
            }
            
            if (customPersonalityInput && settings.customPersonality) {
                customPersonalityInput.value = settings.customPersonality;
            }
            
            showStatus('Settings loaded successfully', 'success');
            log('Settings loaded from storage');
        } else {
            showStatus('No saved settings found', 'info');
            log('No saved settings found');
        }

    } catch (error) {
        showStatus('Failed to load settings', 'error');
        log('Failed to load settings: ' + error.message);
    }
}

function toggleCustomPersonality(show) {
    const customPersonalityGroup = document.getElementById('customPersonalityGroup');
    if (customPersonalityGroup) {
        customPersonalityGroup.style.display = show ? 'block' : 'none';
    }
}

function clearLog() {
    const logEl = document.getElementById('log');
    if (logEl) {
        logEl.textContent = '';
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        sessionStorage.removeItem('username');
        
        log('User logged out');
        
        window.location.href = './pages/login.html';
    }
}

function bindEventListeners() {
    const testApiBtn = document.getElementById('testApiBtn');
    const testBasicCallBtn = document.getElementById('testBasicCallBtn');
    const saveBtn = document.getElementById('saveBtn');
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    const loadSettingsBtn = document.getElementById('loadSettingsBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (testApiBtn) testApiBtn.addEventListener('click', testAPI);
    if (testBasicCallBtn) testBasicCallBtn.addEventListener('click', testBasicCall);
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    if (testConnectionBtn) testConnectionBtn.addEventListener('click', testConnection);
    if (loadSettingsBtn) loadSettingsBtn.addEventListener('click', loadSettings);
    if (clearLogBtn) clearLogBtn.addEventListener('click', clearLog);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const personalityInput = document.getElementById('personality');
    if (personalityInput) {
        personalityInput.addEventListener('change', (e) => {
            toggleCustomPersonality(e.target.value === 'custom');
        });
    }

    const apiProviderInput = document.getElementById('apiProvider');
    if (apiProviderInput) {
        apiProviderInput.addEventListener('change', (e) => {
            const apiEndpointInput = document.getElementById('apiEndpoint');
            const modelNameInput = document.getElementById('modelName');
            
            switch (e.target.value) {
                case 'openai':
                    if (apiEndpointInput) apiEndpointInput.value = 'https://api.openai.com/v1/chat/completions';
                    if (modelNameInput) modelNameInput.value = 'gpt-3.5-turbo';
                    break;
                case 'anthropic':
                    if (apiEndpointInput) apiEndpointInput.value = 'https://api.anthropic.com/v1/messages';
                    if (modelNameInput) modelNameInput.value = 'claude-3-sonnet-20240229';
                    break;
                case 'custom':
                    break;
            }
        });
    }
}

function initializeSettings() {
    console.log('[settings.js] Initializing settings page');
    
    initializeVSCodeListener();
    
    bindEventListeners();
    
    checkAPIStatus();
    
    setTimeout(() => {
        loadSettings();
    }, 100);
    
    log('Settings page initialized');
}

export function main() {
    initializeSettings();
}

window.settingsFunctions = {
    saveSettings,
    testConnection,
    loadSettings,
    testAPI,
    testBasicCall,
    clearLog,
    logout,
    main: initializeSettings
};