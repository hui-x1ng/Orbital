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
<<<<<<< HEAD
    return await getPetByName(electronAPI, username, petName);
}

export function isDead() {
    return currentPet.is_dead;
=======
    return await loadPet(electronAPI, username);
}

export function isDead() {
    return !currentPet || currentPet.is_dead;
>>>>>>> feature/chat
}

export async function updateStats(electronAPI, newPet) {
    if (!newPet || !newPet.id) return;
<<<<<<< HEAD
    const updatedPet = await electronAPI.updatePetStats(newPet);
=======
    await electronAPI.updatePetStats(newPet);
>>>>>>> feature/chat
    currentPet = updatedPet;
}
