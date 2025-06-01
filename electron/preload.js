const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  registerUser: (userData) => ipcRenderer.invoke('create-user', userData),
  generatePet: (username, petName) => ipcRenderer.invoke('create-pet', { ownerId: username, name: petName }),
  getPets: (username) => ipcRenderer.invoke('get-pets', username),
  updatePetHunger: (petId, newHunger) => ipcRenderer.invoke('update-pet-hunger', { petId, newHunger }),
  openPetWindow: () => ipcRenderer.send('open-pet-window'),
  closePetWindow: () => ipcRenderer.send('close-pet-window')
});
