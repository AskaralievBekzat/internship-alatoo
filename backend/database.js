const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'university.db'));

function initDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      club_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Clubs table
        db.run(`CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      admin_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Applications table
        db.run(`CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      club_id INTEGER NOT NULL,
      answers TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (club_id) REFERENCES clubs(id)
    )`);

        // Announcements table
        db.run(`CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs(id)
    )`);

        // Seed demo data
        seedData();
    });
}

function seedData() {
    db.get('SELECT COUNT(*) as count FROM clubs', (err, row) => {
        if (err || row.count > 0) return;

        console.log('🌱 Seeding demo data...');
        const hash = bcrypt.hashSync('admin123', 10);

        // Insert clubs
        const clubs = [
            {
                name: 'Dance Club',
                description: 'Клуб студентов "Dance" - это увлеченное сообщество студентов, занимающихся современными танцевальными направлениями, такими как hip-hop, contemporary, k-pop и другие. Мы проводим регулярные тренировки, участвуем в университетских мероприятиях и городских конкурсах.',
                image_url: 'images/IMG_6954.PNG',
            },
            {
                name: 'Financial Club',
                description: 'Мы стремимся развивать профессиональные навыки студентов, предоставляя возможность участвовать в семинарах, встречах с успешными брокерами и практических мероприятиях. Изучаем фондовые рынки, инвестиции и финансовое планирование.',
                image_url: 'images/IMG_6955.PNG',
            },
            {
                name: 'International Relations Club',
                description: 'Клуб объединяет студентов международных отношений, обеспечивающий платформу для обсуждения актуальных вопросов в области международной дипломатии и глобальной политики. Организуем модели ООН, дебаты и встречи с дипломатами.',
                image_url: 'images/IMG_6991.PNG',
            },
            {
                name: 'Music Club',
                description: 'Возможность талантливым музыкантам Ала-Тоо. Участники могут продолжать обучаться игре на инструментах, показать свои таланты на мероприятиях внутри и вне университета. Проводим концерты и jam-сессии.',
                image_url: 'images/IMG_6992.PNG',
            },
            {
                name: 'Book Club',
                description: 'Ala-Too Book Club – это сообщество для всех, кто увлечен чтением. Наша главная цель – создать пространство, где любители книг могут встречаться, обсуждать прочитанное и вдохновлять друг друга на новые литературные открытия.',
                image_url: 'images/book1.jpg',
            },
        ];

        const adminEmails = [
            'admin.chess@alatoo.edu.kg',
            'admin.it@alatoo.edu.kg',
            'admin.photo@alatoo.edu.kg',
        ];
        const adminNames = ['Chess Admin', 'IT Admin', 'Photo Admin'];

        // Insert clubs first, then create admins linked to first 3 clubs
        let clubIds = [];
        let inserted = 0;

        clubs.forEach((club, i) => {
            db.run(
                'INSERT INTO clubs (name, description, image_url) VALUES (?, ?, ?)',
                [club.name, club.description, club.image_url],
                function (err) {
                    if (err) return;
                    clubIds[i] = this.lastID;
                    inserted++;

                    // After all clubs are inserted
                    if (inserted === clubs.length) {
                        // Create 3 admin accounts linked to first 3 clubs
                        for (let j = 0; j < 3; j++) {
                            const cid = clubIds[j];
                            db.run(
                                'INSERT INTO users (email, password_hash, name, role, club_id) VALUES (?, ?, ?, ?, ?)',
                                [adminEmails[j], hash, adminNames[j], 'admin', cid],
                                function (err2) {
                                    if (err2) return;
                                    // Link admin to club
                                    db.run('UPDATE clubs SET admin_id = ? WHERE id = ?', [this.lastID, cid]);
                                }
                            );
                        }

                        // Demo announcements
                        const announcements = [
                            [clubIds[0], 'Welcome to Dance Club!', 'Our first meeting is this Friday at 5 PM in the sports hall. All styles welcome!'],
                            [clubIds[0], 'K-Pop Workshop', 'Special K-Pop dance workshop next Saturday. Register by Thursday!'],
                            [clubIds[1], 'Investment Seminar', 'Guest speaker from Halyk Bank joining us this Wednesday to discuss stock markets.'],
                            [clubIds[2], 'MUN Conference', 'Ala-Too MUN 2024 registration is now open. Deadline: November 30.'],
                            [clubIds[3], 'Open Mic Night', 'Monthly open mic night on the last Friday of the month. Sign up to perform!'],
                            [clubIds[4], 'November Reading', 'This month we\'re reading "The Kite Runner". Discussion on November 28.'],
                        ];
                        announcements.forEach(([cid, title, content]) => {
                            db.run('INSERT INTO announcements (club_id, title, content) VALUES (?, ?, ?)', [cid, title, content]);
                        });

                        console.log('✅ Demo data seeded!');
                        console.log('   Admins: admin.chess@alatoo.edu.kg / admin123');
                        console.log('           admin.it@alatoo.edu.kg / admin123');
                        console.log('           admin.photo@alatoo.edu.kg / admin123');
                    }
                }
            );
        });
    });
}

module.exports = { db, initDatabase };