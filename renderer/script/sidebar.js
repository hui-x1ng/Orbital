const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebarContainer = document.getElementById('sidebarContainer');
const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('mainContainer');

export function setUpSidebar() {
    console.log('[sidebar.js] Setting up sidebar');
    if (mainContainer) mainContainer.classList.remove('hidden');
    if (toggleSidebarBtn) toggleSidebarBtn.classList.remove('hidden');
    if (sidebarContainer) sidebarContainer.classList.remove('hidden');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            const isActive = sidebarContainer && sidebarContainer.classList.contains('active');
            if (isActive) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    const sidebarButtons = document.querySelectorAll('#sidebar button[data-page]');
    sidebarButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const page = e.target.getAttribute('data-page');
            console.log('[sidebar.js] Navigating to page:', page);
            await loadPage(page);
            closeSidebar();
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebarContainer && sidebarContainer.classList.contains('active')) {
            closeSidebar();
        }
    });
    console.log('[sidebar.js] Sidebar setup complete');
}

function openSidebar() {
    if (sidebarContainer) sidebarContainer.classList.add('active');
    if (toggleSidebarBtn) toggleSidebarBtn.classList.add('moved');
    if (overlay) overlay.classList.add('active');
    if (mainContainer) mainContainer.classList.add('shifted');
}

function closeSidebar() {
    if (sidebarContainer) sidebarContainer.classList.remove('active');
    if (toggleSidebarBtn) toggleSidebarBtn.classList.remove('moved');
    if (overlay) overlay.classList.remove('active');
    if (mainContainer) mainContainer.classList.remove('shifted');
}

async function loadPage(page) {
    try {
        const mainContent = document.querySelector('#mainContainer') || mainContainer;
        if (!mainContent) {
            throw new Error('Main container not found');
        }
        mainContent.innerHTML = `
            <div style="text-align: center; color: white; padding: 50px;">
                <h3>Loading ${page}...</h3>
                <div style="margin-top: 20px;">⏳</div>
            </div>
        `;
        let response = await fetch(`pages/${page}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load ${page}.html (${response.status})`);
        }
        const html = await response.text();
        mainContent.innerHTML = html;
        try {
            console.log(`[sidebar.js] Loading script for ${page}`);
            const scriptModule = await import(`../script/${page}.js`);
            if (scriptModule.main) {
                await new Promise(requestAnimationFrame);
                await scriptModule.main();
                console.log(`[sidebar.js] ${page} script executed successfully`);
            } else {
                console.warn(`[sidebar.js] No main function found in ${page}.js`);
            }
        } catch (scriptError) {
            console.error(`[sidebar.js] Failed to load script for ${page}:`, scriptError);
            if (page === 'settings') {
                console.log('[sidebar.js] Attempting manual settings initialization');
                setTimeout(() => {
                    tryManualSettingsInit();
                }, 100);
            }
        }
    } catch (error) {
        console.error('[sidebar.js] Failed to load page:', error);
        const mainContent = document.querySelector('#mainContainer') || mainContainer;
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="color: white; text-align: center; padding: 50px;">
                    <h2>Failed to load ${page}</h2>
                    <p style="color: #ff6b6b;">Error: ${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #00bcd4; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
}

function tryManualSettingsInit() {
    const saveBtn = document.getElementById('saveBtn');
    const testApiBtn = document.getElementById('testApiBtn');
    const loadBtn = document.getElementById('loadSettingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (!saveBtn || !testApiBtn || !loadBtn || !logoutBtn) {
        console.log('[sidebar.js] Settings elements not ready, retrying...');
        setTimeout(() => tryManualSettingsInit(), 200);
        return;
    }
    console.log('[sidebar.js] Manual settings initialization');
    bindSettingsEvents();
}

function bindSettingsEvents() {
    const log = (message) => {
        const logEl = document.getElementById('log');
        if (logEl) {
            const timestamp = new Date().toLocaleTimeString();
            logEl.textContent += `[${timestamp}] ${message}\n`;
            logEl.scrollTop = logEl.scrollHeight;
        }
    };
    const showStatus = (message, type = 'info') => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status ${type}`;
            statusEl.style.display = 'block';
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    };
    const checkAPIStatus = () => {
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
    };
    const saveSettings = async () => {
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
    };
    const loadSettings = async () => {
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
    };
    const testConnection = async () => {
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
    };
    const logout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('user');
            sessionStorage.removeItem('username');
            window.location.href = './pages/login.html';
        }
    };
    const initializeVSCodeToggle = () => {
        const toggle = document.getElementById('vscode-listener');
        if (toggle && window.electronAPI && window.electronAPI.toggleServer) {
            toggle.addEventListener('change', (e) => {
                window.electronAPI.toggleServer(e.target.checked);
                log(`VSCode listener ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }
    };
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadSettingsBtn');
    const testBtn = document.getElementById('testConnectionBtn');
    const clearBtn = document.getElementById('clearLogBtn');
    const testApiBtn = document.getElementById('testApiBtn');
    const testBasicBtn = document.getElementById('testBasicCallBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    if (loadBtn) loadBtn.addEventListener('click', loadSettings);
    if (testBtn) testBtn.addEventListener('click', testConnection);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const logEl = document.getElementById('log');
            if (logEl) logEl.textContent = '';
        });
    }
    if (testApiBtn) {
        testApiBtn.addEventListener('click', () => {
            checkAPIStatus();
        });
    }
    if (testBasicBtn) {
        testBasicBtn.addEventListener('click', async () => {
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
        });
    }
    initializeVSCodeToggle();
    checkAPIStatus();
    setTimeout(() => loadSettings(), 100);
}