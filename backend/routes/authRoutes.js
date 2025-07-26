const express = require('express');
const sqlite = require('../sqlite');
const { SECRET_KEY } = require('../config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const route = express.Router();
const cors = require('cors');
const bodyParser = require('body-parser');
const authMiddleware = require('../middleware.js');

route.use(cors());
route.use(bodyParser.json());

//test
route.get('/test', (req, res) => {
  res.json({ message: 'Hello from backend! Server is working.' });
});


route.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        //validation
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        if (username.length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters long' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        if (sqlite.userExists(username)) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = sqlite.register(username, hashedPassword);

        if (result.changes > 0) {
            const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '7d' });
            
            res.status(201).json({ 
                message: 'User registered successfully',
                token,
                user: { username }
            });
        } else {
            res.status(500).json({ message: 'Failed to create user' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

route.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        //validation
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const hashedPasswordInDb = sqlite.getUserPassword(username); // should return stored hash
        if (!hashedPasswordInDb) {
            return res.status(401).json({ message: 'User not found' });
        }

        //verify the 2 passwords
        const isMatch = await bcrypt.compare(password, hashedPasswordInDb);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '7d' });
        
        res.json({ 
            message: 'Login successful',
            token,
            user: { username }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//no use yet
route.post('/refresh', authMiddleware, (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const newToken = jwt.sign({ username: decoded.username }, SECRET_KEY, { expiresIn: '7d' });
        
        res.json({ 
            token: newToken,
            user: { username: decoded.username }
        });
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});

module.exports = route;
