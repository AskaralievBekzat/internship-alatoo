const express = require('express');
const router = express.Router();

// Временно без базы данных
router.get('/', (req, res) => {
    res.json([
        { id: 1, name: 'Шахматный клуб', description: 'Тестовый клуб', image_url: '' },
        { id: 2, name: 'IT-клуб', description: 'Тестовый клуб', image_url: '' }
    ]);
});

router.get('/:id', (req, res) => {
    res.json({ id: req.params.id, name: 'Тестовый клуб', description: 'Тест' });
});

module.exports = router;