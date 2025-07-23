const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

//import routes
const authRoutes = require('./routes/authRoutes.js');
const petRoutes = require('./routes/petRoutes.js');
const achievementRoutes = require('./routes/achievementRoutes.js');

const { SECRET_KEY } = require('./config');
const app = express();
const PORT = 3030;

//middleware
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token invalid' });
    }
}
app.locals.verifyToken = verifyToken;

app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/achievements', achievementRoutes);
let server = null;

function startAPIServer() {
    if (!server) {
        server = app.listen(PORT, () => {
            console.log(`Auth server running on http://localhost:${PORT}`);
        });
    }
}
app.get('/test', (req, res) => {
  res.json({ message: 'Hello from backend! Server is working.' });
});


function stopAPIServer() {
    if (server) {
        server.close(() => {
            console.log('Server stopped.');
        });
        server = null;
    }
}
module.exports = { app, startAPIServer, stopAPIServer };
