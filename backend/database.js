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

        // Clubs table with instagram columns
        db.run(`CREATE TABLE IF NOT EXISTS clubs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            instagram TEXT,
            instagram_url TEXT,
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

        // Clubs data
        const clubs = [
            {
                name: 'Ala-Too Dance',
                description: 'Клуб народных танцев — это пространство, где студенты изучают традиционные танцы, развивают сценические навыки и знакомятся с культурным наследием разных народов.',
                instagram: '@alatoo.dance',
                instagram_url: 'https://www.instagram.com/alatoo.dance/',
                image_url: '/uploads/dance.jpg',
            },
            {
                name: 'FinClub',
                description: 'Финансовый клуб — это студенческое объединение, которое организует интеллектуальные и образовательные мероприятия в сфере финансов и экономики. Проводим игры "Брейн Ринг", "Брейн Олимп", семинары и встречи с представителями компаний.',
                instagram: '@fin_club_alatoo',
                instagram_url: 'https://www.instagram.com/fin_club_alatoo/',
                image_url: '/uploads/finclub.jpg',
            },
            {
                name: 'IR Club',
                description: 'IR Club (International relations club) - студенческий клуб отделения международных отношений, обеспечивающий платформу для дополнительного развития в области международной дипломатии и глобальной политики.',
                instagram: '@irclub.aiu',
                instagram_url: 'https://www.instagram.com/irclub.aiu/',
                image_url: '/uploads/irclub.jpg',
            },
            {
                name: 'Music Club',
                description: 'Music club - комьюнити талантливых музыкантов МУА. Участники имеют возможность обучиться игре на инструментах, показать свои таланты на мероприятиях. Объединяем любителей музыки всех уровней и направлений.',
                instagram: '@musicclub_alatoo',
                instagram_url: 'https://www.instagram.com/musicclub_alatoo/',
                image_url: '/uploads/musicclub.jpg',
            },
            {
                name: 'Book Club',
                description: 'BOOK CLUB - сообщество для всех, кто увлечен чтением. Создаём пространство, где любители книг встречаются, обсуждают прочитанное и вдохновляют друг друга. Популяризируем культуру чтения среди студентов.',
                instagram: '@alatoo.library',
                instagram_url: 'https://www.instagram.com/alatoo.library/',
                image_url: '/uploads/bookclub.jpg',
            },
        ];

        // Admins data
        const admins = [
            { email: 'admin.dance@alatoo.edu.kg', password: 'admin123', name: 'Азема Токтосунова', club: 'Ala-Too Dance', desc: 'Клуб народных танцев' },
            { email: 'admin.fin@alatoo.edu.kg', password: 'admin123', name: 'Cолтонбекова Сайкал', club: 'FinClub', desc: 'Финансовый клуб' },
            { email: 'admin.ir@alatoo.edu.kg', password: 'admin123', name: 'Сайкал Сакмаматова', club: 'IR Club', desc: 'Клуб международных отношений' },
            { email: 'admin.music@alatoo.edu.kg', password: 'admin123', name: 'Айгерим Бекибаева', club: 'Music Club', desc: 'Музыкальный клуб' },
            { email: 'admin.book@alatoo.edu.kg', password: 'admin123', name: 'Айжамал Шаршенбекова', club: 'Book Club', desc: 'Книжный клуб' },
        ];

        let clubIds = [];
        let inserted = 0;

        // Insert clubs
        clubs.forEach((club, i) => {
            db.run(
                `INSERT INTO clubs (name, description, image_url, instagram, instagram_url) 
                 VALUES (?, ?, ?, ?, ?)`,
                [club.name, club.description, club.image_url, club.instagram, club.instagram_url],
                function (err) {
                    if (err) {
                        console.error('Error inserting club:', err.message);
                        return;
                    }
                    clubIds[i] = this.lastID;
                    inserted++;

                    // After all clubs are inserted
                    if (inserted === clubs.length) {
                        // Create admin accounts for all clubs
                        admins.forEach((admin, idx) => {
                            const cid = clubIds[idx];
                            if (!cid) {
                                console.error(`Club ID not found for ${admin.email}`);
                                return;
                            }
                            const adminHash = bcrypt.hashSync(admin.password, 10);
                            db.run(
                                'INSERT INTO users (email, password_hash, name, role, club_id) VALUES (?, ?, ?, ?, ?)',
                                [admin.email, adminHash, admin.name, 'admin', cid],
                                function (err2) {
                                    if (err2) {
                                        console.error('Error inserting admin:', err2.message);
                                        return;
                                    }
                                    // Link admin to club
                                    db.run('UPDATE clubs SET admin_id = ? WHERE id = ?', [this.lastID, cid]);
                                }
                            );
                        });

                        // No default announcements — admins will add them later
                        console.log('✅ Demo data seeded!');
                        console.log('   Clubs: Ala-Too Dance, FinClub, IR Club, Music Club, Book Club');
                        console.log('   Admins (password: admin123):');
                        admins.forEach(a => console.log(`     ${a.email}`));
                        console.log('');
                        console.log('   Students can register with @alatoo.edu.kg email');
                    }
                }
            );
        });
    });
}

module.exports = { db, initDatabase };