import * as userManager from '../../modules/userManager.js';
import * as petManager from '../../modules/petManager.js'

const electronAPI = window.electronAPI;

export async function renderPetGallery() {
    console.log('Renderering pet gallery');
    const currentUser = userManager.loadUser();
    const pets = await electronAPI.getPets(currentUser.username);
    // console.log(pets);
    const grid = document.getElementById('petsGrid');

    grid.innerHTML = '';

    pets.forEach(pet => {
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.onclick = () => openPetModal(pet.name);
        console.log(pet.name);

        card.innerHTML = `
            <img src="../assets/${pet.image || 'cat-default.gif'}" class="pet-image">
            <div class="pet-name">${pet.name}</div>
            <div class="pet-status ${pet.is_dead === 0 ? 'status-alive' : 'status-deceased'}">
                ${pet.is_dead === 0 ? 'Alive' : 'Dead'}
            </div>
            `;

        grid.appendChild(card);
    });
}

async function openPetModal(petName) {
    console.log('Opening modal for:', petName);
    
    let modal = document.getElementById('petModal');
    
    if (!modal) {
        console.error('Modal element not found! Available elements:', 
            Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        alert('Modal not found in DOM');
        return;
    }

    modal.classList.remove('hidden');
    const modalPetName = document.getElementById('modalPetName');
    const modalPetAge = document.getElementById('modalPetAge');
    const modalPetHP = document.getElementById('modalPetHP');
    const modalPetIntimacy = document.getElementById('modalPetIntimacy');
    const modalPetStatus = document.getElementById('modalPetStatus');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const currentUser = userManager.loadUser(); 
    const pet = await petManager.getPetByName(electronAPI, currentUser.username, petName);

    console.log(pet)

    if (!pet) {
        alert('Pet not found!');
        return;
    }

    modalPetName.textContent = pet.name;
    modalPetHP.textContent = `HP: ${pet.hp}`;
    modalPetIntimacy.textContent = `Intimacy: ${pet.intimacy}`;
    modalPetStatus.textContent = pet.is_dead ? 'Status: Dead' : 'Status: Alive';
    modalPetAge.textContent = `Age: ${pet.age}`;

    modal.classList.remove('hidden');
    modal.classList.add('show');

    closeModalBtn.onclick = () => {
        closeModal();
    };
}

function closeModal() {
    const modal = document.getElementById('petModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
}

export async function main() {
    await renderPetGallery();
}