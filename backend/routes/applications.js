const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// POST /api/applications — submit application (student)
router.post('/', authMiddleware, (req, res) => {
    const { clubId, answers } = req.body;
    if (!clubId || !answers) return res.status(400).json({ error: 'clubId and answers required' });

    // Check duplicate
    db.get(
        'SELECT id FROM applications WHERE user_id = ? AND club_id = ?',
        [req.user.id, clubId],
        (err, existing) => {
            if (existing) return res.status(400).json({ error: 'You already applied to this club' });

            db.run(
                'INSERT INTO applications (user_id, club_id, answers, status) VALUES (?, ?, ?, ?)',
                [req.user.id, clubId, JSON.stringify(answers), 'pending'],
                function (err) {
                    if (err) return res.status(500).json({ error: 'Server error' });
                    res.status(201).json({ id: this.lastID, message: 'Application submitted successfully!' });
                }
            );
        }
    );
});

// GET /api/applications/my — student's own applications
router.get('/my', authMiddleware, (req, res) => {
    db.all(
        `SELECT a.*, c.name as club_name, c.image_url as club_image
     FROM applications a
     JOIN clubs c ON a.club_id = c.id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC`,
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Server error' });
            rows.forEach(r => { try { r.answers = JSON.parse(r.answers); } catch (e) {} });
            res.json(rows);
        }
    );
});

// GET /api/applications/club/:clubId — admin sees applications for their club
router.get('/club/:clubId', authMiddleware, adminMiddleware, (req, res) => {
    // Admin can only see their own club
    if (parseInt(req.params.clubId) !== req.user.clubId) {
        return res.status(403).json({ error: 'You can only view applications for your own club' });
    }

    db.all(
        `SELECT a.*, u.name as student_name, u.email as student_email
     FROM applications a
     JOIN users u ON a.user_id = u.id
     WHERE a.club_id = ?
     ORDER BY a.created_at DESC`,
        [req.params.clubId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Server error' });
            rows.forEach(r => { try { r.answers = JSON.parse(r.answers); } catch (e) {} });
            res.json(rows);
        }
    );
});

// PATCH /api/applications/:id/status — admin accepts/rejects
router.patch('/:id/status', authMiddleware, adminMiddleware, (req, res) => {
    const { status } = req.body;
    if (!['accepted', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.run(
        'UPDATE applications SET status = ? WHERE id = ? AND club_id = ?',
        [status, req.params.id, req.user.clubId],
        function (err) {
            if (err) return res.status(500).json({ error: 'Server error' });
            if (this.changes === 0) return res.status(404).json({ error: 'Application not found' });
            res.json({ message: 'Status updated' });
        }
    );
});

module.exports = router;