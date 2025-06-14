export function renderPet(pet) {
    document.getElementById('petDisplay').classList.remove('hidden');
    document.getElementById('pet-name').textContent = pet.name;
    document.getElementById('pet-hp').textContent = `HP: ${pet.hp}`;
    document.getElementById('pet-intimacy').textContent = `Intimacy: ${pet.intimacy}`;
}

// export function renderPetList(pets, onClickCallback) {
//     const petList = document.getElementById('petList');
//     petList.innerHTML = '';
//     pets.forEach(pet => {
//         const div = document.createElement('div');
//         div.className = 'pet-item';
//         div.innerHTML = `
//             <strong>${pet.name}</strong><br>
//             HP: ${pet.hp}<br>
//             Hunger: ${pet.hunger}
//         `;
//         div.addEventListener('click', () => onClickCallback(pet));
//         petList.appendChild(div);
//     });
// }
