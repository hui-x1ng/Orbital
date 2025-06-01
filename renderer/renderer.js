const loginBtn = document.getElementById('loginBtn');
const loginContainer = document.getElementById('loginContainer');
const mainContainer = document.getElementById('mainContainer');
const userDisplay = document.getElementById('userDisplay');

const petDisplay = document.getElementById('petDisplay');
const petName = document.getElementById('pet-name');
const petHp = document.getElementById('pet-hp');
const petHunger = document.getElementById('pet-hunger');
const feedBtn = document.getElementById('feed-btn');

let currentUser = '';
let currentPet = null;
let hungerInterval = null;

loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (username === '' || password === '') {
        return;
    }

    if (password === 'petlover') {
        try {
            await window.electronAPI.registerUser({ username: username, pw: "petlover" });
            currentUser = username;
            userDisplay.textContent = username;
            loginContainer.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            // loadPet();
        } catch (err) {
            console.log(err);
        }
    }
});

document.getElementById('generatePetBtn').addEventListener('click', async () => {
    try {
        const petName = 'cat';
        await window.electronAPI.generatePet(currentUser, petName);
        await loadPet();
        startHungerLoop();
        window.electronAPI.openPetWindow();
    } catch (err) {
        alert('Failed to generate pet: ' + err);
    }
});

document.getElementById('killPetBtn').addEventListener('click', () => {
    alert("Your pet died");
    killPet();
});

feedBtn.addEventListener('click', feedPet);

function killPet() {
    if (hungerInterval) {
        clearInterval(hungerInterval);
        hungerInterval = null;
    }
    if (currentPet) {
        window.electronAPI.closePetWindow();
    }
    currentPet = null;
}

function isDead() {
    return !currentPet || currentPet.hunger >= 100 || currentPet.hp <= 0;
}

async function loadPet() {
    try {
        const pets = await window.electronAPI.getPets(currentUser);
        currentPet = pets.find(pet => pet.hp > 0 && pet.hunger < 100);
        renderPetData();
    } catch (err) {
        console.error('Failed to load pet:', err);
    }
}

function renderPetData() {
    if (!currentPet) return;
    petName.textContent = currentPet.name;
    petHp.textContent = `HP: ${currentPet.hp}`;
    petHunger.textContent = `Hunger: ${currentPet.hunger}`;
    petDisplay.classList.remove('hidden');
}

async function feedPet() {
    if (!currentPet) return;
    currentPet.hunger = Math.max(0, currentPet.hunger - 10);
    await window.electronAPI.updatePetHunger(currentPet.id, currentPet.hunger);
    renderPetData();
}

function startHungerLoop() {
    if (hungerInterval) clearInterval(hungerInterval);

    hungerInterval = setInterval(async () => {
        if (!currentPet) return;
        currentPet.hunger = Math.min(100, currentPet.hunger + 5);
        if (isDead()) {
            alert("Your pet died");
            killPet();
            clearInterval(hungerInterval);
            hungerInterval = null;
            return;
        }
        await window.electronAPI.updatePetHunger(currentPet.id, currentPet.hunger);
        renderPetData();
    }, 600);
}
