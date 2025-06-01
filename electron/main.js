const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('./ipcHandlers');

let mainWindow, petWindow;

function createWindow() {
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
    mainWindow.webContents.openDevTools();
}

ipcMain.on('open-pet-window', () => {
    if (petWindow) return;
  
    petWindow = new BrowserWindow({
      width: 400,
      height: 400,
      x: 1100,
      y: 600,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'electron', 'preload.js'),
      }
    });
  
    petWindow.loadFile('renderer/pet.html');
    // petWindow.webContents.openDevTools();
  
    petWindow.on('closed', () => {
      petWindow = null;
    });
  });
  
  ipcMain.on('close-pet-window', () => {
    if (petWindow) {
      petWindow.close();
      petWindow = null;
    }
  });
app.whenReady().then(createWindow);