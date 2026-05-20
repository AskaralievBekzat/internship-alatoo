const jwt = require('jsonwebtoken');
const SECRET_KEY = 'uniclub_secret_2024';

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch {
        res.status(401).json({ error: 'Неверный токен' });
    }
}

function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для админов' });
    next();
}

module.exports = { authMiddleware, adminMiddleware, SECRET_KEY };