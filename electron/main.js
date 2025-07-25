const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const aiService = require('./aiService');
require('./ipcHandlers');

let mainWindow, petWindow;

function createWindow() {
    require('../db/sqlite');
    
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
    
    mainWindow.loadFile('./renderer/index.html');
    
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
        transparent: false,
        alwaysOnTop: true,
        hasShadow: false,
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

app.whenReady().then(async () => {
    console.log('App is ready, initializing...');
    
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