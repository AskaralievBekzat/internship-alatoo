const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize DB
initDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/applications', require('./routes/applications'));

// User profile shortcuts (redirect to auth routes)
app.get('/api/user/profile', (req, res) => {
    res.redirect('/api/auth/profile');
});
app.put('/api/user/profile', (req, res) => {
    res.redirect(307, '/api/auth/profile');
});

// SPA fallback — serve index.html for all non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log('');
    console.log('🎓 UniClub server running!');
    console.log(`🌐 Open: http://localhost:${PORT}`);
    console.log('');
    console.log('Admin accounts (password: admin123):');
    console.log('  admin.chess@alatoo.edu.kg');
    console.log('  admin.it@alatoo.edu.kg');
    console.log('  admin.photo@alatoo.edu.kg');
    console.log('');
    console.log('Students register with @alatoo.edu.kg email');
    console.log('');
});