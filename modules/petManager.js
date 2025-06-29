let currentPet;

export async function loadPet(electronAPI, username) {
    if (!currentPet) {
        const pets = await electronAPI.getPets(username);
        currentPet = pets.find(pet => !pet.is_dead);
    }
    // console.log(currentPet);
    return currentPet;
}

export async function getPetByName(electronAPI, username, petName) {
    const pet = await electronAPI.getPet(username, petName);
    // console.log(pet);
    return pet;
}

export async function loadAllPets(electronAPI, username) {
    return await electronAPI.getPets(username);
}

export async function createPet(electronAPI, username, petName) {
    await electronAPI.generatePet(username, petName);
    return await loadPet(electronAPI, username);
}

export function isDead() {
    return !currentPet || currentPet.is_dead;
}

export async function updateStats(electronAPI, newPet) {
    if (!newPet || !newPet.id) return;
    const updatedPet = await electronAPI.updatePetStats(newPet);
    currentPet = updatedPet;
}
