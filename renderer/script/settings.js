const electronAPI = window.electronAPI;

const toggle = document.getElementById('vscode-listener');
toggle.addEventListener('change', (e) => {
    electronAPI.toggleServer(e.target.checked);
    console.log('changed');
});