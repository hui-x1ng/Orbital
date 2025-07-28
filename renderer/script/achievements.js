import * as userManager from '../../modules/userManager.js';

const electronAPI = window.electronAPI;

export async function renderAchievementsGallery() {
    console.log('[achievements.js] Rendering achievements gallery');
    
    try {
        const grid = document.getElementById('achievementsGrid');
        if (!grid) {
            console.error('[achievements.js] achievementsGrid element not found');
            return;
        }

        grid.innerHTML = '';

        let userAchievements = [];
        
        try {
            const result = await electronAPI.getAchievementsByName();
            if (result && result.success && Array.isArray(result.achievements)) {
                userAchievements = result.achievements;
            } else if (Array.isArray(result)) {
                userAchievements = result;
            } else {
                throw new Error('Invalid achievement data format');
            }
        } catch (err) {
            console.warn('[achievements.js] New API failed, trying fallback:', err);
            
            if (userManager.getUserAchievements) {
                userAchievements = await userManager.getUserAchievements();
            }
        }

        if (!userAchievements || userAchievements.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 40px;">
                    <h3>No achievements yet</h3>
                    <p>Start using the app to unlock achievements!</p>
                </div>
            `;
            return;
        }

        userAchievements.forEach(achievement => {
            const card = document.createElement('div');
            
            const isCompleted = achievement.achieved_at || achievement.completed || achievement.progress >= achievement.target;
            const isLocked = !achievement.unlocked && achievement.progress === 0;
            
            card.className = `achievement-card ${isCompleted ? 'completed' : isLocked ? 'locked' : ''}`;
            card.onclick = () => openAchievementModal(achievement);

            const progressPercentage = achievement.target > 0 
                ? Math.min(100, (achievement.progress / achievement.target) * 100)
                : (isCompleted ? 100 : 0);

            const iconText = achievement.icon || '🏆';
            
            card.innerHTML = `
                <div class="achievement-icon">${iconText}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
                ${achievement.target > 0 ? `
                    <div class="achievement-progress">
                        <div class="progress-bar" style="width: ${progressPercentage}%"></div>
                        <div class="progress-text">${achievement.progress}/${achievement.target}</div>
                    </div>
                ` : ''}
                ${isCompleted ? `<div class="achievement-status">✓ Completed</div>` : ''}
            `;

            grid.appendChild(card);
        });
        
        console.log(`[achievements.js] Rendered ${userAchievements.length} achievements`);
        
    } catch (error) {
        console.error('[achievements.js] Error rendering achievements gallery:', error);
        
        const grid = document.getElementById('achievementsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #ff6b6b; padding: 40px;">
                    <h3>Error loading achievements</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #00bcd4; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

function openAchievementModal(achievement) {
    console.log('[achievements.js] Opening modal for achievement:', achievement.name);
    
    const modal = document.getElementById('achievementModal');
    if (!modal) {
        console.error('[achievements.js] Modal element not found!');
        alert('Modal not found in DOM');
        return;
    }

    try {
        const modalIcon = document.getElementById('modalAchievementIcon');
        const modalName = document.getElementById('modalAchievementName');
        const modalDetails = document.getElementById('modalAchievementDetails');
        const modalDateTime = document.getElementById('modalAchievementDateTime');
        const modalProgress = document.getElementById('modalAchievementProgress');
        const closeModalBtn = document.getElementById('closeModalBtn');

        if (modalIcon) {
            const iconText = achievement.icon || '🏆';
            modalIcon.textContent = iconText;
        }
        
        if (modalName) {
            modalName.textContent = achievement.name;
        }
        
        if (modalDetails) {
            let details = achievement.description;
            if (achievement.reward) {
                details += `\n\nReward: ${achievement.reward}`;
            }
            modalDetails.textContent = details;
        }
        
        if (modalDateTime) {
            if (achievement.achieved_at) {
                modalDateTime.textContent = `Achieved on ${formatDateTime(achievement.achieved_at)}`;
            } else if (achievement.completed) {
                modalDateTime.textContent = 'Achievement completed!';
            } else {
                modalDateTime.textContent = 'Not yet achieved';
            }
        }
        
        if (modalProgress && achievement.target > 0) {
            const progressPercentage = Math.min(100, (achievement.progress / achievement.target) * 100);
            modalProgress.innerHTML = `
                <div class="achievement-progress">
                    <div class="progress-bar" style="width: ${progressPercentage}%"></div>
                    <div class="progress-text">${achievement.progress}/${achievement.target} (${Math.round(progressPercentage)}%)</div>
                </div>
            `;
        } else if (modalProgress) {
            modalProgress.innerHTML = '';
        }

        modal.classList.remove('hidden');

        if (closeModalBtn) {
            closeModalBtn.onclick = closeModal;
        }
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
    } catch (error) {
        console.error('[achievements.js] Error opening achievement modal:', error);
        alert('Error loading achievement details: ' + error.message);
    }
}

function formatDateTime(dateString) {
    try {
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
    } catch (error) {
        console.error('[achievements.js] Error formatting date:', error);
        return dateString;
    }
}

function closeModal() {
    const modal = document.getElementById('achievementModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshAchievementsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('[achievements.js] Refreshing achievements gallery');
            renderAchievementsGallery();
        });
    }
}

async function testGrantAchievement(achievementId) {
    try {
        if (electronAPI.grantAchievement) {
            const result = await electronAPI.grantAchievement('testuser', achievementId);
            console.log('[achievements.js] Grant achievement result:', result);
            await renderAchievementsGallery(); 
        }
    } catch (error) {
        console.error('[achievements.js] Error granting achievement:', error);
    }
}

export async function main() {
    console.log('[achievements.js] Initializing achievements page');
    setupRefreshButton();
    await renderAchievementsGallery();
}

export { 
    renderAchievementsGallery, 
    formatDateTime, 
    testGrantAchievement 
};