const express = require('express');
const router = express.Router();
const sqlite = require('../sqlite');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware.js')

//get all pets of a user
router.get('/', authMiddleware, (req, res) => {
    try {
        const pets = sqlite.getPetsByUser(req.user.username);
        res.json({
            pets,
            count: pets.length
        });
    } catch (err) {
        console.error('Error fetching pets:', err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
});

//get specific pet by id
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const petId = parseInt(req.params.id);
        const pet = sqlite.getPetById(petId);
        res.json({
            pet
        });
    } catch (err) {
        console.error('Error fetching pet:', err);
        res.status(500).json({ error: 'Failed to fetch pet' });
    }
});

// Create new pet
router.post('/', authMiddleware, (req, res) => {
    try {
        const { name } = req.body;

        // Validation
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: 'Pet name is required' });
        }

        if (name.length > 50) {
            return res.status(400).json({ message: 'Pet name must be 50 characters or less' });
        }

        const existingPet = sqlite.getPet(req.user.username, name.trim());
        if (existingPet) {
            return res.status(409).json({ message: 'You already have a pet with this name' });
        }

        const petId = sqlite.createPet(req.user.username, name.trim());
        const newPet = sqlite.getPetById(petId);

        //trigger achievement progress for first pet
        sqlite.incrementAchievementProgress(req.user.username, 'firstPet', 1);

        res.status(201).json({
            message: 'Pet created successfully',
            pet: newPet
        });
    } catch (err) {
        console.error('Error creating pet:', err);
        if (err.message.includes('already exists')) {
            res.status(409).json({ message: err.message });
        } else {
            res.status(500).json({ error: 'Failed to create pet' });
        }
    }
});

// Update pet stats
router.patch('/:id', authMiddleware, (req, res) => {
    try {
        const petId = parseInt(req.params.id);
        if (isNaN(petId)) {
            return res.status(400).json({ message: 'Invalid pet ID' });
        }

        const pet = sqlite.getPetById(petId);
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }

        // Check ownership
        if (pet.owner_id !== req.user.username) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { age, hp, intimacy } = req.body;
        const updates = {};

        // Validate and prepare updates
        if (age !== undefined) {
            if (typeof age !== 'number' || age < 0) {
                return res.status(400).json({ message: 'Age must be a non-negative number' });
            }
            updates.age = age;
        }

        if (hp !== undefined) {
            if (typeof hp !== 'number' || hp < 0 || hp > 100) {
                return res.status(400).json({ message: 'HP must be between 0 and 100' });
            }
            updates.hp = hp;
            
            if (hp === 0) {
                updates.is_dead = true;
            }
        }

        if (intimacy !== undefined) {
            if (typeof intimacy !== 'number' || intimacy < 0) {
                return res.status(400).json({ message: 'Intimacy must be a non-negative number' });
            }
            updates.intimacy = intimacy;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid updates provided' });
        }

        sqlite.updatePetStats(petId, updates);
        const updatedPet = sqlite.getPetById(petId);

        res.json({
            message: 'Pet updated successfully',
            pet: updatedPet
        });
    } catch (err) {
        console.error('Error updating pet:', err);
        res.status(500).json({ error: 'Failed to update pet' });
    }
});

router.post('/:id/kill', authMiddleware, (req, res) => {
    try {
        const petId = parseInt(req.params.id);
        if (isNaN(petId)) {
            return res.status(400).json({ message: 'Invalid pet ID' });
        }

        const pet = sqlite.getPetById(petId);
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }

        if (pet.owner_id !== req.user.username) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (pet.is_dead) {
            return res.status(400).json({ message: 'Pet is already dead' });
        }

        const result = sqlite.killPet(petId);
        if (result.changes > 0) {
            const updatedPet = sqlite.getPetById(petId);
            res.json({
                message: 'Pet has died',
                pet: updatedPet
            });
        } else {
            res.status(500).json({ message: 'Failed to kill pet' });
        }
    } catch (err) {
        console.error('Error killing pet:', err);
        res.status(500).json({ error: 'Failed to kill pet' });
    }
});

module.exports = router;