const express = require('express');
const { db } = require('../database');

const router = express.Router();

router.get('/', (req, res) => {
    db.all('SELECT * FROM clubs', [], (err, clubs) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(clubs || []);
    });
});

router.get('/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM clubs WHERE id = ?', [id], (err, club) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!club) {
            res.status(404).json({ error: 'Клуб не найден' });
            return;
        }
        res.json(club);
    });
});

module.exports = router;