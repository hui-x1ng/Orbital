const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const aiService = require('./aiService');
require('./ipcHandlers');
const tokenStore = require('./tokenStore');

let mainWindow, petWindow;
const { startServer, stopServer, handleDiagnostic } = require('./diagnosticServer');
const { startAPIServer } = require('../backend/server');

// 导入LSP管理器
const { LSPManager } = require('./src/lsp/LSPManager');
let lspManager = null;

function createWindow() {
    require('../backend/sqlite');
    console.log('Creating main window...');
    console.log('Preload path:', path.join(__dirname, 'preload.js'));
    mainWindow = new BrowserWindow({
        width: 600,
        height: 600,
        frame: true,
        transparent: false,
        backgroundColor: '#2e2c29',
        alwaysOnTop: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });
    if (!tokenStore.getToken()) {
        mainWindow.loadFile('./renderer/pages/login.html');
    } else {
        mainWindow.loadFile('./renderer/index.html');
    }
    mainWindow.webContents.once('dom-ready', () => {
        mainWindow.webContents.openDevTools();
    });
    mainWindow.webContents.once('dom-ready', () => {
        console.log('Main window DOM ready');
    });
    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error('Preload script error:', preloadPath, error);
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    console.log('Main window created successfully');
}

ipcMain.on('open-pet-window', () => {
    if (petWindow) {
        console.log('Pet window already exists, bringing to front');
        petWindow.focus();
        return;
    }
    petWindow = new BrowserWindow({
        width: 170,
        height: 180,
        x: 1100,
        y: 600,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        hasShadow: false,
        skipTaskbar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js'),
        }
    });
    petWindow.loadFile('renderer/pet/pet.html');
    if (process.env.NODE_ENV === 'development') {
        petWindow.webContents.openDevTools();
    }
    petWindow.on('closed', () => {
        petWindow = null;
        console.log('Pet window closed');
    });
    petWindow.webContents.executeJavaScript(`
        document.addEventListener('DOMContentLoaded', () => {
            const body = document.body;
            body.style.webkitAppRegion = 'no-drag';
        });
    `);
    console.log('Pet window created successfully');
});

ipcMain.on('close-pet-window', () => {
    if (petWindow) {
        petWindow.close();
        petWindow = null;
        console.log('Pet window closed via IPC');
    }
});

ipcMain.on('pet-action', (event, action) => {
    console.log('Pet action received:', action);
    if (petWindow && petWindow.webContents) {
        petWindow.webContents.send('perform-pet-action', action);
    } else {
        console.warn('Pet window not available for action:', action);
    }
});

ipcMain.handle('move-window', (event, deltaX, deltaY) => {
    if (petWindow) {
        const [currentX, currentY] = petWindow.getPosition();
        petWindow.setPosition(currentX + deltaX, currentY + deltaY);
    }
});

ipcMain.on('server-toggle', (event, isOn) => {
    if (isOn) {
        startServer(8080, petWindow, mainWindow);
        // 同时启动LSP监控
        startLSPMonitoring();
    } else {
        stopServer();
        // 停止LSP监控
        stopLSPMonitoring();
    }
});

// 修复：启动LSP监控函数
async function startLSPMonitoring() {
    if (lspManager) {
        console.log('[Main] LSP monitoring already started');
        return;
    }

    try {
        console.log('[Main] Starting LSP monitoring...');
        
        // 创建LSP管理器
        lspManager = new LSPManager();
        
        // 监听诊断事件 - 重要：这里要调用diagnosticServer的处理函数
        lspManager.on('diagnostics', async (diagnosticData) => {
            console.log('[Main] Received LSP diagnostics:', diagnosticData.fileName);
            
            // 发送诊断数据到主窗口（用于UI显示）
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('lsp-diagnostics', diagnosticData);
            }
            
            // 关键修复：调用diagnosticServer的handleDiagnostic函数来实际处理宠物HP扣除
            try {
                console.log('[Main] Processing diagnostics for pet HP...');
                await handleDiagnostic(diagnosticData);
            } catch (err) {
                console.error('[Main] Error processing diagnostics:', err.message);
            }
        });

        // 监听错误事件
        lspManager.on('error', (error) => {
            console.error('[Main] LSP Error:', error);
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('lsp-error', error.message);
            }
        });

        // 初始化LSP管理器
        await lspManager.initialize();
        
        console.log('[Main] LSP monitoring started successfully');
        
        // 通知渲染进程LSP状态
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('lsp-status', { enabled: true, connected: true });
        }
        
    } catch (error) {
        console.error('[Main] Failed to start LSP monitoring:', error);
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('lsp-status', { enabled: false, connected: false, error: error.message });
        }
    }
}

// 停止LSP监控函数
function stopLSPMonitoring() {
    if (lspManager) {
        console.log('[Main] Stopping LSP monitoring...');
        lspManager.shutdown();
        lspManager = null;
        
        // 通知渲染进程LSP状态
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('lsp-status', { enabled: false, connected: false });
        }
    }
}

// LSP相关的IPC处理器
ipcMain.handle('start-lsp-monitoring', async () => {
    try {
        await startLSPMonitoring();
        return { success: true, message: 'LSP监控已启动' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('stop-lsp-monitoring', () => {
    stopLSPMonitoring();
    return { success: true, message: 'LSP监控已停止' };
});

ipcMain.handle('get-lsp-status', () => {
    return {
        enabled: !!lspManager,
        connected: lspManager ? lspManager.isInitialized : false
    };
});

// 新增：手动扫描test目录的IPC处理器
ipcMain.handle('scan-test-directory', async () => {
    if (lspManager) {
        try {
            await lspManager.scanTestDirectory();
            return { success: true, message: 'Test directory scanned successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    return { success: false, message: 'LSP manager not initialized' };
});

// 新增：检查宠物状态的IPC处理器
ipcMain.handle('check-pet-status', async () => {
    try {
        const tokenStore = require('./tokenStore');
        const axios = require('axios');
        
        const api = axios.create({
            baseURL: 'http://localhost:3030/api',
            timeout: 5000,
        });
        
        const token = tokenStore.getToken();
        if (!token) {
            return { success: false, message: 'No authentication token' };
        }

        const res = await api.get('/pets/', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const pets = res.data.pets || [];
        const livingPets = pets.filter(pet => !pet.is_dead);
        
        return { 
            success: true, 
            totalPets: pets.length,
            livingPets: livingPets.length,
            pets: livingPets
        };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

// 新增：路径设置相关的IPC处理器
ipcMain.handle('get-path-settings', async () => {
    if (lspManager) {
        const status = lspManager.getStatus();
        return { 
            success: true, 
            watchPath: status.watchPath 
        };
    }
    return { success: false, message: 'LSP manager not initialized' };
});

ipcMain.handle('save-path-settings', async (_, settings) => {
    if (lspManager) {
        try {
            const result = await lspManager.updateWatchPath(settings.watchPath);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    return { success: false, message: 'LSP manager not initialized' };
});

ipcMain.handle('select-directory', async () => {
    const { dialog } = require('electron');
    
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: '选择要监控的代码文件夹',
            buttonLabel: '选择文件夹'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            return { success: true, path: result.filePaths[0] };
        }
        
        return { success: false, message: 'No directory selected' };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.handle('restart-lsp-monitoring', async () => {
    if (lspManager) {
        try {
            await lspManager.restart();
            return { success: true, message: 'LSP monitoring restarted' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    return { success: false, message: 'LSP manager not initialized' };
});

ipcMain.handle('scan-specific-path', async (_, targetPath) => {
    if (lspManager) {
        try {
            const result = await lspManager.scanSpecificPath(targetPath);
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    return { success: false, message: 'LSP manager not initialized' };
});

app.whenReady().then(async () => {
    console.log('App is ready, initializing...');
    startAPIServer();
    try {
        const initResult = await aiService.initialize();
        if (initResult) {
            console.log('AI service initialized successfully');
        } else {
            console.warn('AI service initialization failed, using defaults');
        }
    } catch (error) {
        console.error('Failed to initialize AI service:', error);
    }
    createWindow();
    console.log('Application initialization complete');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    console.log('Application is about to quit');
    stopServer();
    // 关闭LSP监控
    stopLSPMonitoring();
    if (petWindow) {
        petWindow.close();
        petWindow = null;
    }
    if (mainWindow) {
        mainWindow.close();
        mainWindow = null;
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Main process started successfully');