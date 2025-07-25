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
        } else {
            showStatus('Test Method Not Found', 'error');
        }
    } catch (error) {
        showStatus('API Test Failed', 'error');
    }
}

async function testBasicCall() {
    if (!window.electronAPI || !window.electronAPI.getAiSettings) {
        showStatus('getAiSettings Unavailable', 'error');
        return;
    }

    try {
        await window.electronAPI.getAiSettings();
        showStatus('Basic Call Successful', 'success');
    } catch (error) {
        showStatus('Basic Call Failed', 'error');
    }
}

async function saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const apiKey = document.getElementById('apiKey');
    
    if (!apiKey) {
        showStatus('API Key input not found', 'error');
        return;
    }

    const apiKeyValue = apiKey.value.trim();

    if (!apiKeyValue) {
        showStatus('Please enter API Key', 'error');
        return;
    }

    if (!apiKeyValue.startsWith('sk-')) {
        showStatus('API Key should start with sk-', 'error');
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

        const settings = {
            apiKey: apiKeyValue,
            apiEndpoint: 'https://api.openai.com/v1/chat/completions',
            modelName: 'gpt-3.5-turbo',
            apiProvider: 'openai',
            timestamp: Date.now()
        };

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
        const result = await window.electronAPI.testAiConnectionDetailed();

        if (result && result.success) {
            showStatus(`Connection successful! Response: ${result.response}`, 'success');
        } else {
            showStatus('Connection failed: ' + (result.error || 'Unknown error'), 'error');
        }

    } catch (error) {
        showStatus('Connection Test Failed', 'error');
    }
}

async function loadSettings() {
    if (!window.electronAPI || !window.electronAPI.getAiSettings) {
        showStatus('Load Function Unavailable', 'error');
        return;
    }

    try {
        const settings = await window.electronAPI.getAiSettings();

        const apiKeyInput = document.getElementById('apiKey');
        if (settings && settings.apiKey && apiKeyInput) {
            apiKeyInput.value = settings.apiKey;
            showStatus('Settings loaded successfully', 'success');
        } else {
            showStatus('No saved settings', 'info');
        }

    } catch (error) {
        showStatus('Failed to load settings', 'error');
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
}

function initializeSettings() {
    bindEventListeners();
    checkAPIStatus();
    
    setTimeout(() => {
        loadSettings();
    }, 100);
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