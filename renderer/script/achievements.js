import * as userManager from '../../modules/userManager.js';
import { ALL_ACHIEVEMENTS } from '../../achievements/achievements.js';

function renderAchievementsGallery() {
    console.log('Rendering achievements gallery');
    const grid = document.getElementById('achievementsGrid');
    
    grid.innerHTML = '';

    const userAchievements = userManager.getUserAchievements();

    userAchievements.forEach(achievementId => {
    const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return; // skip unknown

    const card = document.createElement('div');
    card.className = 'achievement-card';
    card.onclick = () => openAchievementModal(achievement.id);

    card.innerHTML = `
      <div class="achievement-icon">${achievement.icon || '🏆'}</div>
      <div class="achievement-name">${achievement.title}</div>
      <div class="achievement-description">${achievement.description}</div>
    `;

    grid.appendChild(card);
  });
}


function openAchievementModal(achievementId) {
    console.log('Opening modal for achievement:', achievementId);
    
    const modal = document.getElementById('achievementModal');
    
    if (!modal) {
        console.error('Modal element not found!');
        alert('Modal not found in DOM');
        return;
    }

    const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
    
    if (!achievement) {
        alert('Achievement not found!');
        return;
    }

    document.getElementById('modalAchievementIcon').textContent = achievement.icon;
    document.getElementById('modalAchievementName').textContent = achievement.name;
    document.getElementById('modalAchievementDetails').textContent = achievement.details;
    document.getElementById('modalAchievementDateTime').textContent = 
        `Achieved on ${formatDateTime(achievement.dateAchieved)}`;

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