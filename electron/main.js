const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('./ipcHandlers');

let mainWindow, petWindow;
const { startServer, stopServer } = require('./diagnosticServer');
const { startAPIServer } = require('../backend/server');
let diagnosticsBridgeEnabled = false;

function createWindow() {
    require('../backend/sqlite');
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
    // mainWindow.loadFile('renderer/pet/pet.html');
    mainWindow.webContents.openDevTools();
}

let dragData = null;
let lastMoveTime = 0;
const DRAG_THROTTLE = 8;

ipcMain.on('open-pet-window', () => {
    if (petWindow) return;
  
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
    // petWindow.webContents.openDevTools();
  
    //handle close window
    petWindow.on('closed', () => {
      petWindow = null;
    });

    //enable window dragging
    petWindow.webContents.executeJavaScript(`
      document.addEventListener('DOMContentLoaded', () => {
        const body = document.body;
        body.style.webkitAppRegion = 'no-drag'; // Disable default dragging
      });
    `);
  });
  
  ipcMain.handle('move-window', (event, deltaX, deltaY) => {
    if (petWindow) {
      const [currentX, currentY] = petWindow.getPosition();
      petWindow.setPosition(currentX + deltaX, currentY + deltaY);
    }
  });


  ipcMain.on('close-pet-window', () => {
    if (petWindow) {
      petWindow.close();
      petWindow = null;
    }
  });

  ipcMain.on('pet-action', (event, action) => {
    // console.log(action)
    if (petWindow && petWindow.webContents) {
      petWindow.webContents.send('perform-pet-action', action);
    }
});

app.whenReady().then(() => {
  startAPIServer();
  createWindow();
});