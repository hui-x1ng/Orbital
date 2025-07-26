let currentPet;

//get first non dead pet
export async function loadPet(electronAPI) {
    try {
        const response = await electronAPI.getPets();
        if (response.success) {
            console.log(response.pets)
            const currentPet = response.pets.find(pet => !pet.is_dead)
            return currentPet
        }
        else {
            console.log("Cannot find any pets")
        }
    } catch (e) {
        console.log("Failed to load pet" + e);
    }
}

export async function getPetById(electronAPI, petId) {
    const response = await electronAPI.getPet(petId);
    return response.pet;
}

export async function loadAllPets(electronAPI) {
    const response = await electronAPI.getPets();
    if (response.success) {
        return response.pets;
    }
}

export async function createPet(electronAPI, username, petName) {
    const response = await electronAPI.generatePet(username, petName);
    if (response.success) {
        return response.pet;
    }
}

export function isDead() {
    return !currentPet || currentPet.is_dead;
}

export async function updateStats(electronAPI, newPet) {
    if (!newPet || !newPet.id) return;
    console.log("from petManager",newPet);
    const updatedPet = await electronAPI.updatePetStats(newPet);
    currentPet = updatedPet;
    return currentPet;
}

export async function killPet(electronAPI, petId) {
    try {
        const response = await electronAPI.killPet(petId);
        return response.success;
    } catch (e) {
        console.log( 'Kill insuccessful:' +e);
    }
} 