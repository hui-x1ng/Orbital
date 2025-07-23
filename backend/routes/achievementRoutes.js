const express = require('express');
const router = express.Router();
const sqlite = require('../sqlite.js');
const authMiddleware = require('../middleware.js');

//get all achievements of user
router.get('/', authMiddleware, (req, res) => {
    try {
        const achievements = sqlite.getAchievementsByName(req.user.username);
        res.json({
            achievements,
            count: achievements.length
        });
    } catch (err) {
        console.error('Error fetching achievements:', err);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Check if specific achievement is completed
router.get('/:achievementId/status', authMiddleware, (req, res) => {
    try {
        const { achievementId } = req.params;
        
        if (!achievementId || achievementId.trim().length === 0) {
            return res.status(400).json({ message: 'Achievement ID is required' });
        }

        const isCompleted = sqlite.checkAchievementCompletion(req.user.username, achievementId);
        
        if (isCompleted) {
            res.json({
                achievementId,
                completed: true
            });
        } else {
            res.json({
                achievementId,
                completed: false
            });
        }
    } catch (err) {
        console.error('Error checking achievement status:', err);
        res.status(500).json({ error: 'Failed to check achievement status' });
    }
});

//Increment achievement progress
router.post('/progress/:achievementId', authMiddleware, (req, res) => {
    try {
        const { achievementId } = req.params;
        const { amount = 1 } = req.body;

        if (!achievementId || achievementId.trim().length === 0) {
            return res.status(400).json({ message: 'Achievement ID is required' });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }

        const completed = sqlite.incrementAchievementProgress(req.user.username, achievementId, amount);
        
        if (completed) {
            res.json({
                message: 'Achievement completed!',
                achievementId,
                completed: true
            });
        } else {
            // Get current progress
            const progress = sqlite.getUserAchievementProgress(req.user.username);
            const currentProgress = progress.find(p => p.achievement_id === achievementId);
            
            res.json({
                message: 'Progress updated',
                achievementId,
                completed: false,
                progress: currentProgress || { current_progress: 0, target: 1 }
            });
        }
    } catch (err) {
        console.error('Error updating achievement progress:', err);
        if (err.message.includes('Row missing')) {
            res.status(404).json({ message: 'Achievement not found' });
        } else {
            res.status(500).json({ error: 'Failed to update achievement progress' });
        }
    }
});

//grant the achivement
router.post('/:achievementId/grant', authMiddleware, (req, res) => {
    try {
        const { achievementId } = req.params;
        
        if (!achievementId || achievementId.trim().length === 0) {
            return res.status(400).json({ message: 'Achievement ID is required' });
        }

        if (sqlite.checkAchievementCompletion(req.user.username, achievementId)) {
            return res.status(400).json({ message: 'Achievement already completed' });
        }

        const result = sqlite.grantAchievement(req.user.username, achievementId);
        
        res.json({
            message: 'Achievement granted successfully',
            achievementId,
            completed: true
        });
    } catch (err) {
        console.error('Error granting achievement:', err);
        res.status(500).json({ error: 'Failed to grant achievement' });
    }
});


module.exports = router;