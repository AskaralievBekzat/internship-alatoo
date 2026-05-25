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

// GET /api/clubs/announcements/:clubId
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

// GET /api/clubs/announcements/all — все объявления для блога
router.get('/announcements/all', (req, res) => {
    db.all(
        `SELECT a.*, c.name as club_name FROM announcements a
         JOIN clubs c ON a.club_id = c.id
         ORDER BY a.created_at DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// POST /api/clubs/announcements (admin only)
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

// DELETE /api/clubs/announcements/:id (admin only)
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

// POST /api/clubs/ai/recommend — AI рекомендации
router.post('/ai/recommend', authMiddleware, async (req, res) => {
    const { interests } = req.body;

    if (!interests) {
        return res.status(400).json({ error: 'Please provide your interests' });
    }

    const { db } = require('../database');
    db.all('SELECT id, name, description, image_url FROM clubs', [], async (err, clubs) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Fallback: первые 3 клуба, если AI не сработает
        const fallbackRecommendations = clubs.slice(0, 3).map(c => ({
            ...c,
            reason: 'Popular club'
        }));

        try {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ GROQ_API_KEY not set, using fallback');
                return res.json({ recommendations: fallbackRecommendations, fallback: true });
            }

            // Формируем промпт для AI
            const prompt = `Recommend 3 clubs from this list for someone interested in: ${interests}

Clubs:
${clubs.map(c => `- ${c.name}: ${c.description}`).join('\n')}

For each club, provide a short reason why it matches (20 words max).
Return ONLY JSON format: [{"id": 1, "reason": "..."}, {"id": 2, "reason": "..."}, {"id": 3, "reason": "..."}]`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'mixtral-8x7b-32768',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'API error');
            }

            const content = data.choices?.[0]?.message?.content || '';
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found');
            }

            const recommendationsData = JSON.parse(jsonMatch[0]);
            const recommendations = clubs.filter(c => recommendationsData.some(rec => rec.id === c.id))
                .map(c => ({
                    ...c,
                    reason: recommendationsData.find(rec => rec.id === c.id)?.reason || 'Great match'
                }));

            res.json({ recommendations });

        } catch (error) {
            console.error('AI Error:', error.message);
            res.json({ recommendations: fallbackRecommendations, fallback: true });
        }
    });
});

module.exports = router;