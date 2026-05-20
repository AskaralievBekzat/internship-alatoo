const express = require('express');
const cors = require('cors');
const path = require('path');
const { initAdmins } = require('./database');

const authRoutes = require('./routes/auth');
//const clubRoutes = require('./routes/clubs');
//const applicationRoutes = require('./routes/applications');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Раздаём uploads (если есть)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Раздаём фронтенд из папки на уровень выше
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

app.use('/api/auth', authRoutes);
//app.use('/api/clubs', clubRoutes);
//app.use('/api/applications', applicationRoutes);

// Инициализация админов после запуска сервера
setTimeout(() => {
    initAdmins();
}, 1000);

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log('Админ: admin.chess@alatoo.edu.kg / admin123');
});