const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  registerUser: (userData) => ipcRenderer.invoke('create-user', userData),
  generatePet: (username, petName) => ipcRenderer.invoke('create-pet', { ownerId: username, name: petName }),
  getPets: (username) => ipcRenderer.invoke('get-pets', username),
  updatePetStats: (newPet) => ipcRenderer.invoke('update-pet-stats', {newPet}),
  killPet: (petId) => ipcRenderer.invoke('kill-pet', petId),
  openPetWindow: () => ipcRenderer.send('open-pet-window'),
  closePetWindow: () => ipcRenderer.send('close-pet-window')
});
