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

// POST /api/clubs/ai/recommend — AI подбор клуба по интересам (Groq)
router.post('/ai/recommend', authMiddleware, async (req, res) => {
    const { interests } = req.body;
    if (!interests) return res.status(400).json({ error: 'Interests required' });

    db.all('SELECT id, name, description FROM clubs', async (err, clubs) => {
        if (err) return res.status(500).json({ error: 'Server error' });

        const clubList = clubs.map(c =>
            `- ID: ${c.id}, Name: "${c.name}", Description: "${c.description}"`
        ).join('\n');

        const prompt = `You are a university club advisor. A student described their interests: "${interests}"

Here are the available clubs:
${clubList}

Based on the student's interests, recommend the TOP 3 most suitable clubs.
Respond ONLY with valid JSON in this exact format, no extra text:
[
  {"id": 1, "name": "Club Name", "reason": "Short reason why this club fits"},
  {"id": 2, "name": "Club Name", "reason": "Short reason why this club fits"},
  {"id": 3, "name": "Club Name", "reason": "Short reason why this club fits"}
]`;

        try {
            const GROQ_KEY = process.env.GROQ_API_KEY;
            if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set in .env' });

            const response = await fetch(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + GROQ_KEY
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 500
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error('Groq error:', data);
                return res.status(500).json({ error: data.error?.message || 'Groq API error' });
            }

            let text = data.choices?.[0]?.message?.content || '[]';
            text = text.replace(/```json|```/g, '').trim();

            const recommendations = JSON.parse(text);

            // Добавляем image_url к каждому результату
            const enriched = recommendations.map(rec => {
                const club = clubs.find(c => c.id === rec.id);
                return { ...rec, image_url: club?.image_url || '' };
            });

            res.json({ recommendations: enriched });

        } catch (e) {
            console.error('AI error:', e);
            res.status(500).json({ error: 'AI service error: ' + e.message });
        }
    });
});

module.exports = router;