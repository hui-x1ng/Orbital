const { contextBridge, ipcRenderer } = require('electron');
console.log('[preload] loaded in', window.location.href);

contextBridge.exposeInMainWorld('electronAPI', {
  moveWindow: (deltaX, deltaY) => ipcRenderer.invoke('move-window', deltaX, deltaY),
  toggleDialog: (show) => ipcRenderer.invoke('toggle-dialog', show),
  registerUser: (userData) => ipcRenderer.invoke('create-user', userData),
  generatePet: (username, petName) => ipcRenderer.invoke('create-pet', { ownerId: username, name: petName }),
  getPets: (username) => ipcRenderer.invoke('get-pets', username),
  getPet: (username, petName) => ipcRenderer.invoke('get-pet', {username: username, petName: petName}),
  updatePetStats: (newPet) => ipcRenderer.invoke('update-pet-stats', {newPet}),
  killPet: (petId) => ipcRenderer.invoke('kill-pet', petId),
  openPetWindow: () => ipcRenderer.send('open-pet-window'),
  closePetWindow: () => ipcRenderer.send('close-pet-window'),
  signalPetAnimation: (action) => ipcRenderer.send('pet-action', action),
  onPetAction: (callback) => ipcRenderer.on('perform-pet-action', (_event, action) => {
    callback(action);
  }),
  chatWithPet: (message) => ipcRenderer.invoke('chat-with-pet', message),
  getAchievementsByName: (username) => ipcRenderer.invoke('get-achievement-by-name', username),
  grantAchievement: (username, achievement_id) => ipcRenderer.send('grant-achievement', {username, achievement_id}),
  incrementAchievementProgress: (username, achievement_id) => ipcRenderer.invoke('increment-achievement-progress', {username, achievement_id}),
  toggleServer: (isOn) => ipcRenderer.send('server-toggle', isOn)
});