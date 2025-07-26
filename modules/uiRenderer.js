electronAPI.onPetData((pet) => {
  renderPet(pet);
});

export function renderPet(pet) {

    document.getElementById('petDisplay').classList.remove('hidden');
    document.getElementById('pet-name').textContent = pet.name;
    document.getElementById('pet-hp').textContent = `HP: ${pet.hp}`;
    document.getElementById('pet-intimacy').textContent = `Intimacy: ${pet.intimacy}`;
    electronAPI.openPetWindow();
}

export function hidePet() {
    document.getElementById('petDisplay').classList.add('hidden');
}

export function showPetNameInput() {
    document.getElementById('petNameContainer').classList.remove('hidden');
    setTimeout(() => {
        const input = document.getElementById('petNameInput');
        input.focus();
        input.click();
    }, 100);
}

export function hidePetNameInput() {
    document.getElementById('petNameContainer').classList.add('hidden');
}

