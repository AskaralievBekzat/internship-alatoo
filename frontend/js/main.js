async function showHome() {
    document.getElementById('homeView').style.display = 'grid';
    document.getElementById('detailView').style.display = 'none';
    document.getElementById('appsView').style.display = 'none';
    document.getElementById('adminView').style.display = 'none';
    await loadClubs();
}

async function loadClubs() {
    try {
        const clubs = await api('GET', '/api/clubs');
        const container = document.getElementById('homeView');
        if (!clubs.length) {
            container.innerHTML = '<p>Клубов пока нет</p>';
            return;
        }
        container.innerHTML = clubs.map(club => `
            <div class="club-card" onclick="showClub(${club.id})">
                <img src="${club.image_url || '/images/placeholder.jpg'}" class="club-image" onerror="this.src='/images/placeholder.jpg'">
                <div class="club-content">
                    <h3 class="club-title">${club.name}</h3>
                    <p class="club-description">${club.description || ''}</p>
                </div>
            </div>
        `).join('');

        const searchInput = document.getElementById('searchInput');
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.club-card').forEach(card => {
                const title = card.querySelector('.club-title').innerText.toLowerCase();
                const desc = card.querySelector('.club-description').innerText.toLowerCase();
                card.style.display = (title.includes(term) || desc.includes(term)) ? 'block' : 'none';
            });
        };
    } catch (e) { showToast(e.message, true); }
}

async function showClub(id) {
    try {
        const club = await api('GET', `/api/clubs/${id}`);
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('detailView').style.display = 'block';
        document.getElementById('detailView').innerHTML = `
            <button class="back-btn" onclick="showHome()">← Назад</button>
            <h2>${club.name}</h2>
            <img src="${club.image_url || '/images/placeholder.jpg'}" style="width:100%; border-radius:10px; margin:15px 0;">
            <p>${club.description || ''}</p>
            ${currentUser?.role === 'student' ? `
                <h3>Подать заявку</h3>
                <textarea id="whyAnswer" rows="3" placeholder="Почему хотите вступить?"></textarea>
                <textarea id="skillsAnswer" rows="3" placeholder="Ваши навыки"></textarea>
                <button class="submit-btn" onclick="submitApplication(${club.id})">Отправить</button>
            ` : ''}
        `;
    } catch (e) { showToast(e.message, true); }
}

async function submitApplication(clubId) {
    const why = document.getElementById('whyAnswer')?.value;
    const skills = document.getElementById('skillsAnswer')?.value;
    if (!why || !skills) return showToast('Заполните все поля', true);
    try {
        await api('POST', '/api/applications', { clubId, answers: { why, skills } });
        showToast('Заявка отправлена');
        showHome();
    } catch (e) { showToast(e.message, true); }
}

async function showMyApps() {
    try {
        const apps = await api('GET', '/api/applications/my');
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('appsView').style.display = 'block';
        if (!apps.length) {
            document.getElementById('appsView').innerHTML = '<button class="back-btn" onclick="showHome()">← Назад</button><p>Заявок нет</p>';
            return;
        }
        const statusText = { pending: 'На рассмотрении', accepted: 'Принята', rejected: 'Отклонена' };
        document.getElementById('appsView').innerHTML = `
            <button class="back-btn" onclick="showHome()">← Назад</button>
            <h2>Мои заявки</h2>
            ${apps.map(a => `<div class="application-item"><strong>${a.club_name}</strong> — <span class="status-${a.status}">${statusText[a.status]}</span><br><small>${new Date(a.created_at).toLocaleDateString()}</small></div>`).join('')}
        `;
    } catch (e) { showToast(e.message, true); }
}

async function showAdminPanel() {
    if (!currentUser?.clubId) return showToast('Клуб не привязан', true);
    try {
        const apps = await api('GET', `/api/applications/club/${currentUser.clubId}`);
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('adminView').style.display = 'block';
        if (!apps.length) {
            document.getElementById('adminView').innerHTML = '<button class="back-btn" onclick="showHome()">← Назад</button><p>Заявок нет</p>';
            return;
        }
        const statusText = { pending: 'На рассмотрении', accepted: 'Принята', rejected: 'Отклонена' };
        document.getElementById('adminView').innerHTML = `
            <button class="back-btn" onclick="showHome()">← Назад</button>
            <h2>Заявки в ваш клуб</h2>
            ${apps.map(a => `
                <div class="application-item">
                    <strong>${a.student_name}</strong> (${a.student_email})<br>
                    <strong>Почему:</strong> ${a.answers?.why || '-'}<br>
                    <strong>Навыки:</strong> ${a.answers?.skills || '-'}<br>
                    <span class="status-${a.status}">${statusText[a.status]}</span><br>
                    ${a.status === 'pending' ? `
                        <button onclick="updateStatus(${a.id}, 'accepted')">✅ Принять</button>
                        <button onclick="updateStatus(${a.id}, 'rejected')">❌ Отклонить</button>
                    ` : ''}
                </div>
            `).join('')}
        `;
    } catch (e) { showToast(e.message, true); }
}

async function updateStatus(id, status) {
    try {
        await api('PATCH', `/api/applications/${id}/status`, { status });
        showToast('Статус обновлён');
        showAdminPanel();
    } catch (e) { showToast(e.message, true); }
}