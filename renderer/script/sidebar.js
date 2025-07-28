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
            const page = e.currentTarget.getAttribute('data-page');
            console.log('[sidebar.js] Navigating to page:', page);
            if (page) {
                await loadPage(page);
                closeSidebar();
            }
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
        
        // Special handling: restore home page content
        if (page === 'home') {
            await restoreHomePage();
            return;
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
        
        // Special handling for settings page
        if (page === 'settings') {
            console.log('[sidebar.js] Loading settings page with enhanced features');
            await loadSettingsPage();
        } else {
            // Try to load scripts for other pages
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

// Settings page handling
async function loadSettingsPage() {
    console.log('[sidebar.js] Initializing settings page with path monitoring');
    
    // Wait for DOM update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Bind path settings functionality
    bindPathSettings();
    
    // Bind original settings functionality
    bindSettingsEvents();
}

// Bind path settings functionality
function bindPathSettings() {
    console.log('[sidebar.js] Binding path settings');
    
    // Path related elements
    const watchPathInput = document.getElementById('watchPath');
    const browseButton = document.getElementById('browseButton');
    const savePathButton = document.getElementById('savePathSettings');
    const scanNowButton = document.getElementById('scanNowButton');
    const currentPathDisplay = document.getElementById('currentPath');
    
    if (browseButton && window.electronAPI && window.electronAPI.selectDirectory) {
        browseButton.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.selectDirectory();
                if (result && result.path && watchPathInput) {
                    watchPathInput.value = result.path;
                    showPathStatus('Selected path: ' + result.path, 'success');
                }
            } catch (error) {
                console.error('[sidebar.js] Error selecting directory:', error);
                showPathStatus('Failed to select folder', 'error');
            }
        });
    }
    
    if (savePathButton && window.electronAPI && window.electronAPI.savePathSettings) {
        savePathButton.addEventListener('click', async () => {
            const watchPath = watchPathInput?.value.trim();
            if (!watchPath) {
                showPathStatus('Please enter or select a path', 'error');
                return;
            }
            
            try {
                savePathButton.disabled = true;
                savePathButton.textContent = 'Saving...';
                
                const result = await window.electronAPI.savePathSettings({ watchPath });
                
                if (result.success) {
                    if (currentPathDisplay) {
                        currentPathDisplay.textContent = `Current monitoring path: ${watchPath}`;
                    }
                    showPathStatus('Path settings saved successfully!', 'success');
                    
                    // Restart LSP monitoring
                    if (window.electronAPI.restartLSPMonitoring) {
                        setTimeout(async () => {
                            try {
                                await window.electronAPI.restartLSPMonitoring();
                                showPathStatus('Code monitoring restarted', 'success');
                            } catch (error) {
                                showPathStatus('Failed to restart monitoring: ' + error.message, 'error');
                            }
                        }, 1000);
                    }
                } else {
                    showPathStatus(result.message || 'Save failed', 'error');
                }
            } catch (error) {
                console.error('[sidebar.js] Error saving path:', error);
                showPathStatus('Failed to save path settings', 'error');
            } finally {
                savePathButton.disabled = false;
                savePathButton.textContent = 'Save Path Settings';
            }
        });
    }
    
    if (scanNowButton && window.electronAPI && window.electronAPI.scanSpecificPath) {
        scanNowButton.addEventListener('click', async () => {
            const watchPath = watchPathInput?.value.trim();
            if (!watchPath) {
                showPathStatus('Please set monitoring path first', 'error');
                return;
            }
            
            try {
                scanNowButton.disabled = true;
                scanNowButton.textContent = 'Scanning...';
                
                const result = await window.electronAPI.scanSpecificPath(watchPath);
                
                if (result.success) {
                    showPathStatus(`Scan complete! Found ${result.filesCount || 0} files`, 'success');
                } else {
                    showPathStatus(result.message || 'Scan failed', 'error');
                }
            } catch (error) {
                console.error('[sidebar.js] Error scanning path:', error);
                showPathStatus('Scan failed', 'error');
            } finally {
                scanNowButton.disabled = false;
                scanNowButton.textContent = 'Scan Now';
            }
        });
    }
    
    // Load current path settings
    if (window.electronAPI && window.electronAPI.getPathSettings) {
        window.electronAPI.getPathSettings().then(result => {
            if (result.success && result.watchPath) {
                if (watchPathInput) watchPathInput.value = result.watchPath;
                if (currentPathDisplay) currentPathDisplay.textContent = `Current monitoring path: ${result.watchPath}`;
                showPathStatus('Path settings loaded', 'success');
            }
        }).catch(error => {
            console.error('[sidebar.js] Error loading path settings:', error);
        });
    }
}

// Show path status
function showPathStatus(message, type = 'info') {
    const statusEl = document.getElementById('pathStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.style.display = 'block';
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    } else {
        // If no dedicated path status element, use general status
        showStatus(message, type);
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

// Restore home page content instead of reloading the page
async function restoreHomePage() {
    const mainContent = document.querySelector('#mainContainer') || mainContainer;
    if (!mainContent) return;
    
    // Restore original home page HTML structure
    mainContent.innerHTML = `
        <h1>Hello <span id="userDisplay"></span></h1>
        <div class="welcome-section">
            <p>Welcome to tamaCodechi! Take care of your virtual coding companion.</p>
        </div>
        
        <div class="action-section">
            <button id="generatePetBtn" class="primary-button">Generate Your Pet</button>
            
            <div id="petNameContainer" class="hidden input-group">
                <input id="petNameInput" placeholder="Enter pet name" class="pet-name-input" />
                <div class="button-group">
                    <button id="confirmPetNameBtn" class="confirm-button">OK</button>
                    <button id="cancelPetNameBtn" class="cancel-button">Cancel</button>
                </div>
            </div>
            
            <button id="callPetBtn" class="secondary-button">Call Out Your Pet!</button>
        </div>
        
        <div id="errorMessage" class="error-message hidden"></div>
        
        <div id="petDisplay" class="hidden pet-info">
            <div class="pet-header">
                <h3 id="pet-name">Your Pet</h3>
            </div>
            
            <div class="pet-stats">
                <div class="stat-item">
                    <span class="stat-label">HP:</span>
                    <span id="pet-hp" class="stat-value">100</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Intimacy:</span>
                    <span id="pet-intimacy" class="stat-value">50</span>
                </div>
            </div>
            
            <div class="pet-interaction">
                <p class="interaction-hint">Try touching your pet</p>
                <div class="action-buttons">
                    <button id="feed-btn" class="action-button feed">Feed</button>
                    <button id="killPetBtn" class="action-button danger">Kill Pet</button>
                </div>
            </div>
        </div>
    `;
    
    // Wait for DOM update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Re-initialize home page functionality
    try {
        console.log('[sidebar.js] Re-initializing home page');
        
        // Clear previous module cache, force re-import
        const timestamp = Date.now();
        const homeModule = await import(`../script/home.js?t=${timestamp}`);
        
        if (homeModule.main) {
            await homeModule.main();
            console.log('[sidebar.js] Home page re-initialized successfully');
        } else {
            console.warn('[sidebar.js] No main function found in home.js');
        }
    } catch (error) {
        console.error('[sidebar.js] Failed to re-initialize home page:', error);
        
        // If module import fails, try to manually initialize basic functionality
        await initializeBasicHomeFunctionality();
    }
}

// Basic home functionality initialization (as fallback)
async function initializeBasicHomeFunctionality() {
    console.log('[sidebar.js] Initializing basic home functionality as fallback');
    
    // Set username
    const storedUsername = sessionStorage.getItem("username");
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay && storedUsername) {
        userDisplay.textContent = storedUsername;
    }
    
    // Basic error handling functions
    const showError = (message) => {
        const errorMessage = document.getElementById("errorMessage");
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        }
    };
    
    const hideError = () => {
        const errorMessage = document.getElementById("errorMessage");
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    };
    
    // Bind basic button events
    const generatePetBtn = document.getElementById('generatePetBtn');
    if (generatePetBtn) {
        generatePetBtn.addEventListener('click', () => {
            hideError();
            const petNameContainer = document.getElementById('petNameContainer');
            if (petNameContainer) {
                petNameContainer.classList.remove('hidden');
            }
        });
    }
    
    const cancelPetNameBtn = document.getElementById('cancelPetNameBtn');
    if (cancelPetNameBtn) {
        cancelPetNameBtn.addEventListener('click', () => {
            const petNameContainer = document.getElementById('petNameContainer');
            if (petNameContainer) {
                petNameContainer.classList.add('hidden');
            }
            hideError();
        });
    }
    
    const callPetBtn = document.getElementById('callPetBtn');
    if (callPetBtn) {
        callPetBtn.addEventListener('click', async () => {
            hideError();
            
            try {
                if (window.electronAPI && window.electronAPI.getPets) {
                    const result = await window.electronAPI.getPets();
                    if (result.success && result.pets && result.pets.length > 0) {
                        const livingPet = result.pets.find(pet => !pet.is_dead);
                        if (livingPet) {
                            // Display pet information
                            const petDisplay = document.getElementById('petDisplay');
                            const petName = document.getElementById('pet-name');
                            const petHp = document.getElementById('pet-hp');
                            const petIntimacy = document.getElementById('pet-intimacy');
                            
                            if (petDisplay) petDisplay.classList.remove('hidden');
                            if (petName) petName.textContent = livingPet.name;
                            if (petHp) petHp.textContent = livingPet.hp || 100;
                            if (petIntimacy) petIntimacy.textContent = livingPet.intimacy || 50;
                            
                            // Open pet window
                            if (window.electronAPI.openPetWindow) {
                                window.electronAPI.openPetWindow();
                            }
                        } else {
                            showError("You don't have a living pet yet! Create one first.");
                        }
                    } else {
                        showError("You don't have a pet yet! Create one first.");
                    }
                } else {
                    showError("Pet system not available.");
                }
            } catch (err) {
                console.error('[sidebar.js] Error calling pet:', err);
                showError("Failed to load your pet. Please try again.");
            }
        });
    }
}