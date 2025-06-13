const loginBtn = document.getElementById('loginBtn');
const loginContainer = document.getElementById('loginContainer');
const mainContainer = document.getElementById('mainContainer');
const userDisplay = document.getElementById('userDisplay');

const petDisplay = document.getElementById('petDisplay');
const petName = document.getElementById('pet-name');
const petHp = document.getElementById('pet-hp');
const petIntimacy = document.getElementById('pet-intimacy');
const feedBtn = document.getElementById('feed-btn');
const petList = document.getElementById('petList');

let currentUser = '';
let currentPet = null;
let intInterval = null;

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
    } catch (err) {
        alert('Failed to generate pet: ' + err);
    }
});

document.getElementById('callPetBtn').addEventListener('click', async () => {
    try {
        await loadPet();
    } catch (err) {
        alert('Failed to call out pet: ' + err);
    }
})

document.getElementById('killPetBtn').addEventListener('click', () => {
    alert("Your pet died");
    killPet();
});

feedBtn.addEventListener('click', feedPet);

function killPet() {
    if (intInterval) {
        clearInterval(intInterval);
        intInterval = null;
    }
    if (currentPet) {
        alert(currentPet.id + "died.")
        window.electronAPI.closePetWindow();
        window.electronAPI.killPet(currentPet.id);
    }
    currentPet = null;
}

function isDead() {
    return !currentPet || currentPet.is_dead;
}

//gets first pet that is not dead from db
async function loadPet() {
    try {
        const pets = await window.electronAPI.getPets(currentUser);
        console.log(pets);
        currentPet = pets.find(pet => !pet.is_dead);
        console.log(currentPet);
        if (currentPet) {
            renderPetData();
            window.electronAPI.openPetWindow();
            startIntimacyLoop();
        }
    } catch (err) {
        console.error('Failed to load pet:', err);
    }
}

async function loadAllPets() {
    try {
        const pets = await window.electronAPI.getPets(currentUser);
        petList.innerHTML = '';
        pets.forEach(pet => {
            const petItem = document.createElement('div');
            petItem.classList.add('pet-item');
            petItem.innerHTML = `
                <strong>${pet.name}</strong><br>
                HP: ${pet.hp}<br>
                Hunger: ${pet.hunger}
            `;
            petItem.addEventListener('click', () => {
                currentPet = pet;
                renderPetData();
                window.electronAPI.openPetWindow();
            });
            petList.appendChild(petItem);
        });
    } catch (err) {
        console.error('Failed to load all pets:', err);
    }
}

function renderPetData() {
    if (!currentPet) return;
    petName.textContent = currentPet.name;
    petHp.textContent = `HP: ${currentPet.hp}`;
    petIntimacy.textContent = `Intimacy: ${currentPet.intimacy}`;
    petDisplay.classList.remove('hidden');
}

async function feedPet() {
    if (!currentPet) return;
    currentPet.intimacy = Math.min(100, currentPet.intimacy + 0.1);
    console.log(currentPet.intimacy);
    await window.electronAPI.updatePetIntimacy(currentPet.id, currentPet.intimacy);
    renderPetData();
}

function startIntimacyLoop() {
    if (intInterval) clearInterval(intInterval);

    intInterval = setInterval(async () => {
        if (!currentPet) return;
        console.log(currentPet);
        currentPet.intimacy = Math.min(100, currentPet.intimacy + 0.1);
        if (isDead()) {
            alert("Your pet died");
            killPet();
            clearInterval(intInterval);
            intInterval = null;
            return;
        }
        await window.electronAPI.updatePetIntimacy(currentPet.id, currentPet.intimacy);
        renderPetData();
    }, 60000);
}
