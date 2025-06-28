export function feed(pet) {
    pet.intimacy = Math.min(pet.intimacy + 0.1, 100);
    return pet;
}

export function haveFun(pet) {
    pet.hp = Math.max(pet.hp - 0.01, 0);
    pet.intimacy = Math.min(pet.intimacy + 0.1, 100);
    return pet;
}

// for general passage of time
export function tick(pet) {
    pet.intimacy = Math.max(pet.intimacy + 0.005, 0);
    return pet;
}

export function sleep(pet) {
    pet.hp = Math.min(pet.hp + 0.5, 100);
    return pet;
}

export function getBored(pet) {
    pet.intimacy = Math.max(pet.intimacy - 0.05, 0);
}

export function getAnnoyed(pet) {
    pet.intimacy = Math.max(pet.intimacy - 1, 0);
}

export function getAngry(pet) {
    pet.intimacy = Math.max(pet.intimacy - 5, 0);
}

// New function for chatting with the pet
export function chat(pet) {
    pet.intimacy = Math.min(pet.intimacy + 0.3, 100);
    return pet;
}