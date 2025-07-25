const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebarContainer = document.getElementById('sidebarContainer');
const overlay = document.getElementById('overlay');
const mainContainer = document.getElementById('mainContainer');

export function setUpSidebar() {
    mainContainer.classList.remove('hidden');
    toggleSidebarBtn.classList.remove('hidden');
    sidebarContainer.classList.remove('hidden');

    toggleSidebarBtn.addEventListener('click', () => {
        const isActive = sidebarContainer.classList.contains('active');
        
        if (isActive) {
            sidebarContainer.classList.remove('active');
            toggleSidebarBtn.classList.remove('moved');
            overlay.classList.remove('active');
            mainContainer.classList.remove('shifted');
        } else {
            sidebarContainer.classList.add('active');
            toggleSidebarBtn.classList.add('moved');
            overlay.classList.add('active');
            mainContainer.classList.add('shifted');
        }
    });

    document.querySelectorAll('#sidebar button[data-page]').forEach(button => {
        button.addEventListener('click', async (e) => {
            const page = e.target.getAttribute('data-page');
            
            try {
                const mainContent = document.querySelector('#mainContainer') || mainContainer;
                let response = await fetch(`pages/${page}.html`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${page}.html`);
                }
                const html = await response.text();
                mainContent.innerHTML = html;
                
                try {
                    const scriptModule = await import(`../script/${page}.js`);
                    if (scriptModule.main) {
                        await new Promise(requestAnimationFrame);
                        await scriptModule.main();
                    }
                } catch (scriptError) {
                    if (page === 'settings') {
                        setTimeout(() => {
                            tryManualSettingsInit();
                        }, 100);
                    }
                }

            } catch (error) {
                console.error('Failed to load page:', error);
                mainContent.innerHTML = `<div style="color: white; text-align: center; padding: 50px;">
                    <h2>Failed to load ${page}</h2>
                    <p>Error: ${error.message}</p>
                </div>`;
            } finally {
                closeSidebar();
            }
        });
    });
} 

function closeSidebar() {
    sidebarContainer.classList.remove('active');
    toggleSidebarBtn.classList.remove('moved');
    overlay.classList.remove('active');
    mainContainer.classList.remove('shifted');
}

function tryManualSettingsInit() {
    const saveBtn = document.getElementById('saveBtn');
    const testApiBtn = document.getElementById('testApiBtn');
    const loadBtn = document.getElementById('loadSettingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!saveBtn || !testApiBtn || !loadBtn || !logoutBtn) {
        setTimeout(() => tryManualSettingsInit(), 200);
        return;
    }
    
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
            window.location.href = './pages/login.html';
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

    checkAPIStatus();
    setTimeout(() => loadSettings(), 100);
}