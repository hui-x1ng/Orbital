import * as userManager from '../../modules/userManager.js';
import { ALL_ACHIEVEMENTS } from '../../achievements/achievements.js';

async function renderAchievementsGallery() {
    console.log('Rendering achievements gallery');
    const grid = document.getElementById('achievementsGrid');
    
    grid.innerHTML = '';

    const userAchievements = await userManager.getUserAchievements();
    
    userAchievements.forEach(achievement => {
    // const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
    // if (!achievement) return; // skip unknown

    const card = document.createElement('div');
    card.className = 'achievement-card';
    card.onclick = () => openAchievementModal(achievement.name, achievement.description, achievement.achieved_at);

    card.innerHTML = `
      <div class="achievement-icon">${achievement.icon || '🏆'}</div>
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-description">${achievement.description}</div>
    `;

    grid.appendChild(card);
  });
}


function openAchievementModal(name, description, achieved_at) {
    console.log('Opening modal for achievement:', name);
    
    const modal = document.getElementById('achievementModal');
    
    if (!modal) {
        console.error('Modal element not found!');
        alert('Modal not found in DOM');
        return;
    }

    document.getElementById('modalAchievementIcon').textContent = '🏆';
    document.getElementById('modalAchievementName').textContent = name;
    document.getElementById('modalAchievementDetails').textContent = description;
    document.getElementById('modalAchievementDateTime').textContent = 
        `Achieved on ${formatDateTime(achieved_at)}`;

    modal.classList.remove('hidden');
    modal.classList.add('show');

    document.getElementById('closeModalBtn').onclick = closeModal;
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleDateString('en-US', options);
}

function closeModal() {
    const modal = document.getElementById('achievementModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
}

// document.addEventListener('DOMContentLoaded', function() {
//     renderAchievementsGallery();
// });
export async function main() {
    await renderAchievementsGallery();
}