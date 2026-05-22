const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/clubs
router.get('/', (req, res) => {
    db.all('SELECT c.*, u.name as admin_name FROM clubs c LEFT JOIN users u ON c.admin_id = u.id', (err, clubs) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        res.json(clubs);
    });
});

// GET /api/clubs/:id
router.get('/:id', (req, res) => {
    db.get(
        'SELECT c.*, u.name as admin_name FROM clubs c LEFT JOIN users u ON c.admin_id = u.id WHERE c.id = ?',
        [req.params.id],
        (err, club) => {
            if (err) return res.status(500).json({ error: 'Server error' });
            if (!club) return res.status(404).json({ error: 'Club not found' });
            res.json(club);
        }
    );
});

// GET /api/announcements/:clubId
router.get('/announcements/:clubId', (req, res) => {
    db.all(
        'SELECT * FROM announcements WHERE club_id = ? ORDER BY created_at DESC',
        [req.params.clubId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Server error' });
            res.json(rows);
        }
    );
});

// GET /api/announcements/all — все объявления для блога
router.get('/announcements/all', (req, res) => {
    console.log('📢 Эндпоинт /announcements/all вызван');
    db.all(
        'SELECT * FROM announcements',
        [],
        (err, rows) => {
            if (err) {
                console.error('Ошибка:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`✅ Найдено ${rows.length} объявлений`);
            console.log('Данные:', rows);
            res.json(rows);
        }
    );
});
// POST /api/announcements (admin only)
router.post('/announcements', authMiddleware, adminMiddleware, (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    db.run(
        'INSERT INTO announcements (club_id, title, content) VALUES (?, ?, ?)',
        [req.user.clubId, title, content],
        function (err) {
            if (err) return res.status(500).json({ error: 'Server error' });
            res.status(201).json({ id: this.lastID, message: 'Announcement created' });
        }
    );
});

// DELETE /api/announcements/:id (admin only)
router.delete('/announcements/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.run(
        'DELETE FROM announcements WHERE id = ? AND club_id = ?',
        [req.params.id, req.user.clubId],
        function (err) {
            if (err) return res.status(500).json({ error: 'Server error' });
            if (this.changes === 0) return res.status(404).json({ error: 'Announcement not found' });
            res.json({ message: 'Deleted' });
        }
    );
});

module.exports = router;