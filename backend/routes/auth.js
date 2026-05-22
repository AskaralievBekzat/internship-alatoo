const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password and name are required' });
    }

    // Enforce @alatoo.edu.kg domain
    if (!email.endsWith('@alatoo.edu.kg')) {
        return res.status(400).json({ error: 'Only @alatoo.edu.kg email addresses are allowed' });
    }

    // Prevent registering with admin email pattern
    if (email.startsWith('admin.')) {
        return res.status(400).json({ error: 'Admin accounts cannot be self-registered' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = bcrypt.hashSync(password, 10);

    db.run(
        'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
        [email.toLowerCase(), hash, name, 'student'],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Email already registered' });
                }
                return res.status(500).json({ error: 'Server error' });
            }

            const token = jwt.sign(
                { id: this.lastID, email, name, role: 'student', clubId: null },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(201).json({
                token,
                user: { id: this.lastID, email, name, role: 'student', clubId: null },
            });
        }
    );
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], (err, user) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role, clubId: user.club_id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role, clubId: user.club_id },
        });
    });
});

// GET /api/user/profile
router.get('/profile', authMiddleware, (req, res) => {
    db.get('SELECT id, email, name, role, club_id FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });
});

// PUT /api/user/profile (change password)
router.put('/profile', authMiddleware, (req, res) => {
    const { currentPassword, newPassword, name } = req.body;

    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });

        // If changing password
        if (currentPassword && newPassword) {
            if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters' });
            }
            const newHash = bcrypt.hashSync(newPassword, 10);
            const newName = name || user.name;
            db.run('UPDATE users SET password_hash = ?, name = ? WHERE id = ?', [newHash, newName, user.id], (e) => {
                if (e) return res.status(500).json({ error: 'Server error' });
                res.json({ message: 'Profile updated successfully' });
            });
        } else if (name) {
            db.run('UPDATE users SET name = ? WHERE id = ?', [name, user.id], (e) => {
                if (e) return res.status(500).json({ error: 'Server error' });
                res.json({ message: 'Name updated successfully' });
            });
        } else {
            res.status(400).json({ error: 'No changes provided' });
        }
    });
});

module.exports = router;