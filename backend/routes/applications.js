const express = require('express');
const { db } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, (req, res) => {
    const { clubId, answers } = req.body;
    db.run('INSERT INTO applications (user_id, club_id, answers) VALUES (?,?,?)',
        [req.user.id, clubId, JSON.stringify(answers)],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
});

router.get('/my', authMiddleware, (req, res) => {
    db.all(`SELECT a.*, c.name as club_name FROM applications a 
          JOIN clubs c ON a.club_id = c.id WHERE a.user_id = ?`, [req.user.id], (err, apps) => {
        apps.forEach(a => a.answers = JSON.parse(a.answers));
        res.json(apps);
    });
});

router.get('/club/:clubId', authMiddleware, adminMiddleware, (req, res) => {
    db.all(`SELECT a.*, u.name as student_name, u.email as student_email 
          FROM applications a JOIN users u ON a.user_id = u.id 
          WHERE a.club_id = ?`, [req.params.clubId], (err, apps) => {
        apps.forEach(a => a.answers = JSON.parse(a.answers));
        res.json(apps);
    });
});

router.patch('/:id/status', authMiddleware, adminMiddleware, (req, res) => {
    const { status } = req.body;
    db.run('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Статус обновлён' });
});

module.exports = router;