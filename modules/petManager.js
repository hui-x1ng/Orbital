export let currentPet = null;

export async function loadPet(electronAPI, username) {
    const pets = await electronAPI.getPets(username);
    currentPet = pets.find(pet => !pet.is_dead);
    return currentPet;
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
    if (!pet || !pet.id) return;
    await electronAPI.updatePetStats(newPet);
}
