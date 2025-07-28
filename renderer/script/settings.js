async function main() {
    return initializeSettings();
}

async function initializeSettings() {
    console.log('Settings page loaded');
    
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveBtn');
    const loadButton = document.getElementById('loadSettingsBtn');
    const testButton = document.getElementById('testConnectionBtn');
    const statusDiv = document.getElementById('status');

    const watchPathInput = document.getElementById('watchPath');
    const browseButton = document.getElementById('browseButton');
    const savePathButton = document.getElementById('savePathSettings');
    const scanNowButton = document.getElementById('scanNowButton');
    const pathStatusDiv = document.getElementById('pathStatus');
    const currentPathDisplay = document.getElementById('currentPath');
    const monitorToggle = document.getElementById('vscode-listener');

    // Pet personality elements
    const savePetSettingsBtn = document.getElementById('savePetSettingsBtn');
    const loadPetSettingsBtn = document.getElementById('loadPetSettingsBtn');
    const petStatusDiv = document.getElementById('petStatus');
    const personalityOptions = document.querySelectorAll('.personality-option');

    await loadSettings();
    await loadPathSettings();
    await loadPetSettings();

    // AI Settings event listeners
    if (saveButton) saveButton.addEventListener('click', saveAISettings);
    if (loadButton) loadButton.addEventListener('click', loadSettings);
    if (testButton) testButton.addEventListener('click', testConnection);
    
    // Path Settings event listeners
    if (browseButton) browseButton.addEventListener('click', browseFolderPath);
    if (savePathButton) savePathButton.addEventListener('click', savePathSettings);
    if (scanNowButton) scanNowButton.addEventListener('click', scanCurrentPath);
    if (monitorToggle) monitorToggle.addEventListener('change', toggleMonitoring);

    // Pet Settings event listeners
    if (savePetSettingsBtn) savePetSettingsBtn.addEventListener('click', savePetSettings);
    if (loadPetSettingsBtn) loadPetSettingsBtn.addEventListener('click', loadPetSettings);
    
    // Personality selection
    personalityOptions.forEach(option => {
        option.addEventListener('click', () => {
            personalityOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    async function loadSettings() {
        try {
            const settings = await window.electronAPI.getAiSettings();
            if (settings && apiKeyInput) {
                apiKeyInput.value = settings.apiKey || '';
            }
        } catch (error) {
            console.error('Failed to load AI settings:', error);
            showStatus('Failed to load AI settings', 'error');
        }
    }

    async function loadPathSettings() {
        try {
            const pathSettings = await window.electronAPI.getPathSettings();
            if (pathSettings && pathSettings.watchPath) {
                if (watchPathInput) watchPathInput.value = pathSettings.watchPath;
                if (currentPathDisplay) currentPathDisplay.textContent = `Current monitoring path: ${pathSettings.watchPath}`;
                showPathStatus('Path settings loaded successfully', 'success');
            } else {
                if (currentPathDisplay) currentPathDisplay.textContent = 'Current monitoring path: Not set';
                showPathStatus('Please set a code path to monitor', 'info');
            }
        } catch (error) {
            console.error('Failed to load path settings:', error);
            showPathStatus('Failed to load path settings', 'error');
        }
    }

    async function loadPetSettings() {
        try {
            const petSettings = await window.electronAPI.getPetSettings();
            if (petSettings && petSettings.personality) {
                const selectedOption = document.querySelector(`[data-personality="${petSettings.personality}"]`);
                if (selectedOption) {
                    personalityOptions.forEach(opt => opt.classList.remove('selected'));
                    selectedOption.classList.add('selected');
                }
                showPetStatus('Pet settings loaded successfully', 'success');
            } else {
                showPetStatus('No pet personality set. Please select one.', 'info');
            }
        } catch (error) {
            console.error('Failed to load pet settings:', error);
            showPetStatus('Failed to load pet settings', 'error');
        }
    }

    async function saveAISettings() {
        if (!apiKeyInput) return;
        
        const settings = {
            apiKey: apiKeyInput.value.trim(),
            apiEndpoint: 'https://api.openai.com/v1/chat/completions',
            modelName: 'gpt-3.5-turbo',
            apiProvider: 'openai'
        };

        if (!settings.apiKey) {
            showStatus('API Key is required', 'error');
            return;
        }

        if (!settings.apiKey.startsWith('sk-')) {
            showStatus('API Key should start with "sk-"', 'error');
            return;
        }

        try {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            
            const result = await window.electronAPI.saveAiSettings(settings);
            
            if (result.success !== false) {
                showStatus('AI settings saved successfully!', 'success');
            } else {
                showStatus(result.error || 'Failed to save AI settings', 'error');
            }
        } catch (error) {
            console.error('Save AI settings error:', error);
            showStatus('Failed to save AI settings', 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save AI Settings';
        }
    }

    async function savePetSettings() {
        const selectedOption = document.querySelector('.personality-option.selected');
        
        if (!selectedOption) {
            showPetStatus('Please select a personality type', 'error');
            return;
        }

        const personality = selectedOption.getAttribute('data-personality');
        
        try {
            savePetSettingsBtn.disabled = true;
            savePetSettingsBtn.textContent = 'Saving...';
            
            const result = await window.electronAPI.savePetSettings({ personality });
            
            if (result.success !== false) {
                showPetStatus('Pet personality saved successfully!', 'success');
            } else {
                showPetStatus(result.error || 'Failed to save pet settings', 'error');
            }
        } catch (error) {
            console.error('Save pet settings error:', error);
            showPetStatus('Failed to save pet settings', 'error');
        } finally {
            savePetSettingsBtn.disabled = false;
            savePetSettingsBtn.textContent = 'Save Pet Settings';
        }
    }

    async function browseFolderPath() {
        try {
            const result = await window.electronAPI.selectDirectory();
            if (result && result.path && watchPathInput) {
                watchPathInput.value = result.path;
                showPathStatus(`Selected path: ${result.path}`, 'success');
            }
        } catch (error) {
            console.error('Failed to browse folder:', error);
            showPathStatus('Failed to select folder', 'error');
        }
    }

    async function savePathSettings() {
        if (!watchPathInput) return;
        
        const watchPath = watchPathInput.value.trim();
        
        if (!watchPath) {
            showPathStatus('Please enter or select a path', 'error');
            return;
        }

        try {
            savePathButton.disabled = true;
            savePathButton.textContent = 'Saving...';
            
            const result = await window.electronAPI.savePathSettings({ watchPath });
            
            if (result.success) {
                if (currentPathDisplay) currentPathDisplay.textContent = `Current monitoring path: ${watchPath}`;
                showPathStatus('Path settings saved successfully! Monitoring will restart to apply new path', 'success');
                
                setTimeout(async () => {
                    try {
                        await window.electronAPI.restartLSPMonitoring();
                        showPathStatus('Monitoring restarted successfully', 'success');
                    } catch (error) {
                        showPathStatus('Failed to restart monitoring: ' + error.message, 'error');
                    }
                }, 1000);
            } else {
                showPathStatus(result.message || 'Failed to save path settings', 'error');
            }
        } catch (error) {
            console.error('Save path error:', error);
            showPathStatus('Failed to save path settings', 'error');
        } finally {
            savePathButton.disabled = false;
            savePathButton.textContent = 'Save Path Settings';
        }
    }

    async function scanCurrentPath() {
        if (!watchPathInput) return;
        
        const watchPath = watchPathInput.value.trim();
        
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
            console.error('Scan error:', error);
            showPathStatus('Scan failed', 'error');
        } finally {
            scanNowButton.disabled = false;
            scanNowButton.textContent = 'Scan Now';
        }
    }

    async function testConnection() {
        try {
            testButton.disabled = true;
            testButton.textContent = 'Testing...';
            showStatus('Testing connection...', 'info');
            
            const result = await window.electronAPI.testAiConnectionDetailed();
            
            if (result.success) {
                showStatus('Connection test successful!', 'success');
            } else {
                showStatus(`Connection failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Test error:', error);
            showStatus('Connection test failed', 'error');
        } finally {
            testButton.disabled = false;
            testButton.textContent = 'Test Connection';
        }
    }

    function toggleMonitoring(e) {
        if (window.electronAPI && window.electronAPI.toggleServer) {
            window.electronAPI.toggleServer(e.target.checked);
            console.log(`Code monitoring ${e.target.checked ? 'enabled' : 'disabled'}`);
            showPathStatus(`Code monitoring ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        }
    }

    function showStatus(message, type) {
        if (!statusDiv) return;
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    function showPathStatus(message, type) {
        if (!pathStatusDiv) return;
        pathStatusDiv.textContent = message;
        pathStatusDiv.className = `status ${type}`;
        pathStatusDiv.style.display = 'block';
        
        setTimeout(() => {
            pathStatusDiv.style.display = 'none';
        }, 5000);
    }

    function showPetStatus(message, type) {
        if (!petStatusDiv) return;
        petStatusDiv.textContent = message;
        petStatusDiv.className = `status ${type}`;
        petStatusDiv.style.display = 'block';
        
        setTimeout(() => {
            petStatusDiv.style.display = 'none';
        }, 5000);
    }

    // Listen for LSP status updates
    if (window.electronAPI.onLSPStatus) {
        window.electronAPI.onLSPStatus((status) => {
            if (status.enabled && status.connected) {
                showPathStatus('Code monitoring service started', 'success');
            } else if (status.error) {
                showPathStatus(`Code monitoring error: ${status.error}`, 'error');
            }
        });
    }

    // Listen for diagnostic statistics
    if (window.electronAPI.onDiagnosticStats) {
        window.electronAPI.onDiagnosticStats((stats) => {
            showPathStatus(
                `Issues found: ${stats.stats.errors} errors, ${stats.stats.warnings} warnings in ${stats.fileName}`, 
                stats.stats.errors > 0 ? 'error' : 'warning'
            );
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeSettings);

if (typeof window !== 'undefined') {
    window.settingsMain = main;
}