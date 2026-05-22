// ==============================================================
//  NAVIGATION & VIEW SYSTEM
// ==============================================================

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + viewId);
    if (target) target.classList.add('active');
    if (navLinks) navLinks.classList.remove('active');
    if (viewId === 'myapps') loadMyApps();
    if (viewId === 'admin') loadAdmin();
    if (viewId === 'blog') loadBlog();
    if (viewId === 'profile') loadProfile();
    if (viewId === 'home') loadClubs();
    window.scrollTo(0, 0);
}

function updateNav() {
    const isLoggedIn = !!currentUser;
    const isAdmin = currentUser?.role === 'admin';
    const isStudent = currentUser?.role === 'student';
    const loginLink = document.getElementById('nav-login');
    const logoutLink = document.getElementById('nav-logout');
    const profileLink = document.getElementById('nav-profile');
    const myappsLink = document.getElementById('nav-myapps');
    const adminLink = document.getElementById('nav-admin');
    if (loginLink) loginLink.classList.toggle('hidden', isLoggedIn);
    if (logoutLink) logoutLink.classList.toggle('hidden', !isLoggedIn);
    if (profileLink) profileLink.classList.toggle('hidden', !isLoggedIn);
    if (myappsLink) myappsLink.classList.toggle('hidden', !isStudent);
    if (adminLink) adminLink.classList.toggle('hidden', !isAdmin);
}

// ==============================================================
//  AUTH MODAL
// ==============================================================

function openAuthModal() { document.getElementById('authModal')?.classList.add('open'); }
function closeAuthModal() { document.getElementById('authModal')?.classList.remove('open'); }

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginTab && registerTab) {
        loginTab.classList.toggle('active', tab === 'login');
        registerTab.classList.toggle('active', tab === 'register');
    }
    if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
    if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
}

async function doLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPass')?.value;
    if (!email || !password) { toast('Please fill in all fields', 'error'); return; }
    try {
        const data = await http('POST', '/auth/login', { email, password });
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('uc_token', data.token);
        localStorage.setItem('uc_user', JSON.stringify(data.user));
        updateNav();
        closeAuthModal();
        toast('Welcome back, ' + data.user.name + '!', 'success');
        showView('home');
        loadClubs();
    } catch (e) { toast(e.message, 'error'); }
}

async function doRegister() {
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPass')?.value;
    if (!name || !email || !password) { toast('Please fill in all fields', 'error'); return; }
    if (!email.endsWith('@alatoo.edu.kg')) { toast('Only @alatoo.edu.kg emails are allowed', 'error'); return; }
    try {
        const data = await http('POST', '/auth/register', { name, email, password });
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('uc_token', data.token);
        localStorage.setItem('uc_user', JSON.stringify(data.user));
        updateNav();
        closeAuthModal();
        toast('Account created! Welcome, ' + data.user.name + '!', 'success');
        showView('home');
        loadClubs();
    } catch (e) { toast(e.message, 'error'); }
}

function doLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('uc_token');
    localStorage.removeItem('uc_user');
    updateNav();
    showView('home');
    loadClubs();
    toast('You have been logged out', 'info');
}

// ==============================================================
//  CLUBS & HOME
// ==============================================================

async function loadClubs() {
    try {
        clubsData = await http('GET', '/clubs');
        renderClubs(clubsData);
    } catch (e) {
        const grid = document.getElementById('clubGrid');
        if (grid) grid.innerHTML = '<div class="empty"><i class="fas fa-exclamation-circle"></i><p>Failed to load clubs</p></div>';
    }
}

function renderClubs(clubs) {
    const grid = document.getElementById('clubGrid');
    if (!grid) return;
    if (!clubs.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><i class="fas fa-box-open"></i><p>No clubs found</p></div>';
        return;
    }
    grid.innerHTML = clubs.map((c, idx) => {
        let imgStyle = '';

        return `<div class="club-card" onclick="openClub(${c.id})">
            <img class="club-image" src="${c.image_url || ''}" alt="${escapeHtml(c.name)}"
                 style="${imgStyle}"
                 onerror="this.src='';this.style.background='linear-gradient(135deg,#B22234,#C8A165)';this.style.height='240px'">
            <div class="club-content">
                <h3 class="club-title">${escapeHtml(c.name)}</h3>
                <p class="club-description">${escapeHtml(c.description || '')}</p>
            </div>
        </div>`;
    }).join('');
}

// Search
const searchBar = document.getElementById('searchBar');
if (searchBar) {
    searchBar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = clubsData.filter(c => c.name.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term));
        renderClubs(filtered);
    });
}

// ==============================================================
//  CLUB DETAIL & APPLY
// ==============================================================

async function openClub(clubId) {
    showView('club');
    const el = document.getElementById('clubDetail');
    if (!el) return;
    el.innerHTML = '<div class="spinner"></div>';
    try {
        const [club, anns] = await Promise.all([
            http('GET', '/clubs/' + clubId),
            http('GET', '/clubs/announcements/' + clubId),
        ]);
        const isStudent = currentUser?.role === 'student';

        // Добавляем Instagram блок
        const instaHtml = club.instagram_url ? `
            <div style="margin: 15px 0;">
                <a href="${club.instagram_url}" target="_blank" style="color: var(--primary-color); text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fab fa-instagram" style="font-size: 1.2rem;"></i> 
                    <span>${escapeHtml(club.instagram || 'Instagram')}</span>
                </a>
            </div>
        ` : '';

        const applyBtn = isStudent
            ? `<button class="btn btn-primary" onclick="openApplyModal(${club.id}, '${escapeHtml(club.name).replace(/'/g, "\\'")}')"><i class="fas fa-paper-plane"></i> Apply to Join</button>`
            : (!currentUser ? `<button class="btn btn-outline" onclick="openAuthModal()">Login to Apply</button>` : '');

        const annHtml = anns?.length ? anns.map(a => `<div class="ann-card"><h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.content)}</p><div class="ann-meta">${formatDate(a.created_at)}</div></div>`).join('') : '<p style="color:var(--muted)">No announcements yet.</p>';

        el.innerHTML = `
            <button class="back-btn" onclick="showView('home')"><i class="fas fa-arrow-left"></i> Back to Clubs</button>
            <div class="club-detail-hero"><img src="${club.image_url || ''}" alt="${escapeHtml(club.name)}" onerror="this.src='';this.parentElement.style.background='linear-gradient(135deg,#B22234,#C8A165)'"><div class="club-detail-hero-overlay"><div class="club-detail-hero-title">${escapeHtml(club.name)}</div></div></div>
            <p style="color:var(--muted);margin-bottom:1.5rem;line-height:1.7">${escapeHtml(club.description || '')}</p>
            ${instaHtml}
            ${applyBtn}
            <h3 style="margin-top:2rem"><i class="fas fa-bullhorn"></i> Announcements</h3>
            ${annHtml}`;
    } catch (e) {
        console.error(e);
        el.innerHTML = '<p style="color:#c0392b">Failed to load club details.</p>';
    }
}

function openApplyModal(clubId, clubName) {
    if (!currentUser) { openAuthModal(); return; }
    document.getElementById('applyClubId').value = clubId;
    document.getElementById('applyClubName').textContent = clubName;
    document.getElementById('applyFullName').value = currentUser.name;
    document.getElementById('applyModal').classList.add('open');
}
function closeApplyModal() { document.getElementById('applyModal').classList.remove('open'); }

async function submitApplication() {
    const clubId = parseInt(document.getElementById('applyClubId')?.value || '0');
    const answers = {
        fullName: document.getElementById('applyFullName')?.value.trim() || '',
        group: document.getElementById('applyGroup')?.value.trim() || '',
        phone: document.getElementById('applyPhone')?.value.trim() || '',
        why: document.getElementById('applyWhy')?.value.trim() || '',
        skills: document.getElementById('applySkills')?.value.trim() || '',
    };
    if (!answers.fullName || !answers.group || !answers.why) { toast('Please fill in all required fields', 'error'); return; }
    try {
        await http('POST', '/applications', { clubId, answers });
        toast('Application submitted successfully!', 'success');
        closeApplyModal();
    } catch (e) { toast(e.message, 'error'); }
}

// ==============================================================
//  MY APPLICATIONS
// ==============================================================

async function loadMyApps() {
    if (!currentUser) { showView('home'); openAuthModal(); return; }
    const el = document.getElementById('myAppsList');
    if (!el) return;
    el.innerHTML = '<div class="spinner"></div>';
    try {
        const apps = await http('GET', '/applications/my');
        if (!apps.length) { el.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>You haven\'t applied to any clubs yet.</p></div>'; return; }
        const statusLabel = { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected' };
        el.innerHTML = apps.map(a => `<div class="app-card"><img class="app-card-img" src="${a.club_image || ''}" alt="${escapeHtml(a.club_name)}" onerror="this.style.background='#B22234';this.src=''"><div class="app-card-info"><h4>${escapeHtml(a.club_name)}</h4><span>Applied on ${formatDate(a.created_at)}</span></div><span class="badge badge-${a.status}">${statusLabel[a.status] || a.status}</span></div>`).join('');
    } catch (e) { toast(e.message, 'error'); }
}

// ==============================================================
//  BLOG
// ==============================================================

let blogClubFilter = 'all';

async function loadBlog() {
    const el = document.getElementById('blogList');
    if (!el) return;
    el.innerHTML = '<div class="spinner"></div>';
    try {
        const anns = await http('GET', '/clubs/announcements/all');
        allAnnouncements = anns;
        const clubsInBlog = [...new Map(anns.map(a => [a.club_id, a])).values()];
        const filterBar = document.getElementById('blogFilter');
        if (filterBar) {
            filterBar.innerHTML = '<button class="filter-btn active" onclick="filterBlog(this, \'all\')">All Clubs</button>' +
                clubsInBlog.map(a => `<button class="filter-btn" onclick="filterBlog(this, '${a.club_id}')">${escapeHtml(a.club_name)}</button>`).join('');
        }
        renderBlog(anns);
    } catch (e) { el.innerHTML = '<p style="color:var(--muted)">Failed to load announcements.</p>'; }
}

function filterBlog(btn, clubId) {
    blogClubFilter = clubId;
    document.querySelectorAll('#blogFilter .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const filtered = clubId === 'all' ? allAnnouncements : allAnnouncements.filter(a => String(a.club_id) === String(clubId));
    renderBlog(filtered);
}

function renderBlog(anns) {
    const el = document.getElementById('blogList');
    if (!el) return;
    if (!anns.length) { el.innerHTML = '<div class="empty"><i class="fas fa-newspaper"></i><p>No announcements yet.</p></div>'; return; }
    el.innerHTML = anns.map(a => `<div class="ann-card"><div><span style="font-size:0.78rem;font-weight:600;color:var(--primary-color);text-transform:uppercase">${escapeHtml(a.club_name)}</span></div><h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.content)}</p><div class="ann-meta"><i class="fas fa-calendar-alt"></i> ${formatDate(a.created_at)}</div></div>`).join('');
}

// ==============================================================
//  ADMIN PANEL
// ==============================================================

function switchAdminTab(tab, btn) {
    document.getElementById('admin-tab-applications').style.display = tab === 'applications' ? 'block' : 'none';
    document.getElementById('admin-tab-announcements').style.display = tab === 'announcements' ? 'block' : 'none';
    document.querySelectorAll('#view-admin .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (tab === 'announcements') loadAdminAnns();
}

async function loadAdmin() {
    if (!currentUser || currentUser.role !== 'admin') { showView('home'); return; }
    const clubNameSpan = document.getElementById('adminClubName');
    if (clubNameSpan) clubNameSpan.textContent = '';
    try {
        const club = await http('GET', '/clubs/' + currentUser.clubId);
        if (clubNameSpan) clubNameSpan.textContent = club.name;
    } catch (e) {}
    loadAdminApps();
}

async function loadAdminApps() {
    const el = document.getElementById('adminAppsList');
    if (!el) return;
    el.innerHTML = '<div class="spinner"></div>';
    try {
        const apps = await http('GET', '/applications/club/' + currentUser.clubId);
        if (!apps.length) { el.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>No applications yet.</p></div>'; return; }
        el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Student</th><th>Group</th><th>Why Join</th><th>Skills</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
            apps.map(a => {
                const ans = a.answers || {};
                return `<tr><td><strong>${escapeHtml(a.student_name)}</strong><br><span style="color:var(--muted);font-size:0.78rem">${escapeHtml(a.student_email)}</span></td><td>${escapeHtml(ans.group || '—')}</td><td style="max-width:180px">${escapeHtml(ans.why || '—')}</td><td style="max-width:160px">${escapeHtml(ans.skills || '—')}</td><td style="white-space:nowrap">${formatDate(a.created_at)}</td><td><span class="badge badge-${a.status}">${a.status}</span></td><td style="white-space:nowrap">${a.status !== 'accepted' ? `<button class="btn btn-success btn-sm" onclick="setStatus(${a.id},'accepted')" style="margin-right:4px"><i class="fas fa-check"></i></button>` : ''}${a.status !== 'rejected' ? `<button class="btn btn-danger btn-sm" onclick="setStatus(${a.id},'rejected')"><i class="fas fa-times"></i></button>` : ''}</td></tr>`;
            }).join('') +
            '</tbody></table></div>';
    } catch (e) { toast(e.message, 'error'); }
}

async function setStatus(appId, status) {
    try {
        await http('PATCH', '/applications/' + appId + '/status', { status });
        toast('Status updated to ' + status, status === 'accepted' ? 'success' : 'info');
        loadAdminApps();
    } catch (e) { toast(e.message, 'error'); }
}

async function postAnnouncement() {
    const title = document.getElementById('annTitle')?.value.trim();
    const content = document.getElementById('annContent')?.value.trim();
    if (!title || !content) { toast('Please fill in both fields', 'error'); return; }
    try {
        await http('POST', '/clubs/announcements', { title, content });
        document.getElementById('annTitle').value = '';
        document.getElementById('annContent').value = '';
        toast('Announcement posted!', 'success');
        loadAdminAnns();
    } catch (e) { toast(e.message, 'error'); }
}

async function loadAdminAnns() {
    const el = document.getElementById('adminAnnList');
    if (!el) return;
    el.innerHTML = '<div class="spinner"></div>';
    try {
        const anns = await http('GET', '/clubs/announcements/' + currentUser.clubId);
        if (!anns.length) { el.innerHTML = '<p style="color:var(--muted)">No announcements yet.</p>'; return; }
        el.innerHTML = anns.map(a => `<div class="ann-card"><div class="ann-card-actions" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem"><div style="flex:1"><h4>${escapeHtml(a.title)}</h4><p>${escapeHtml(a.content)}</p><div class="ann-meta">${formatDate(a.created_at)}</div></div><button class="btn btn-danger btn-sm" onclick="deleteAnn(${a.id})"><i class="fas fa-trash"></i></button></div></div>`).join('');
    } catch (e) { toast(e.message, 'error'); }
}

async function deleteAnn(id) {
    try {
        await http('DELETE', '/clubs/announcements/' + id);
        toast('Announcement deleted', 'info');
        loadAdminAnns();
    } catch (e) { toast(e.message, 'error'); }
}

// ==============================================================
//  PROFILE
// ==============================================================

function loadProfile() {
    if (!currentUser) { showView('home'); openAuthModal(); return; }
    const u = currentUser;
    const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('profileContent').innerHTML = `
        <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:2rem;flex-wrap:wrap">
            <div class="profile-avatar">${escapeHtml(initials)}</div>
            <div><h3 style="font-size:1.4rem;margin-bottom:0.25rem">${escapeHtml(u.name)}</h3><span class="badge ${u.role === 'admin' ? 'badge-accepted' : 'badge-pending'}">${u.role}</span></div>
        </div>
        <div class="profile-info-row"><i class="fas fa-envelope"></i> ${escapeHtml(u.email)}</div>
        <div class="profile-info-row"><i class="fas fa-user-tag"></i> ${u.role === 'admin' ? 'Club Administrator' : 'Student'}</div>
        <hr style="margin:2rem 0;border-color:var(--card-border)">
        <h3 style="margin-bottom:1.25rem">Change Password</h3>
        <div class="form-group"><label>Current Password</label><input class="form-control" type="password" id="curPass" placeholder="••••••••"></div>
        <div class="form-group"><label>New Password</label><input class="form-control" type="password" id="newPass" placeholder="Min 6 characters"></div>
        <button class="btn btn-primary" onclick="changePassword()"><i class="fas fa-lock"></i> Update Password</button>`;
}

async function changePassword() {
    const curPass = document.getElementById('curPass')?.value;
    const newPass = document.getElementById('newPass')?.value;
    if (!curPass || !newPass) { toast('Fill in both fields', 'error'); return; }
    if (newPass.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    try {
        await http('PUT', '/auth/profile', { currentPassword: curPass, newPassword: newPass });
        toast('Password updated!', 'success');
        document.getElementById('curPass').value = '';
        document.getElementById('newPass').value = '';
    } catch (e) { toast(e.message, 'error'); }
}

// ==============================================================
//  INIT
// ==============================================================

// Close modals on overlay click
document.getElementById('authModal')?.addEventListener('click', function(e) { if (e.target === this) closeAuthModal(); });
document.getElementById('applyModal')?.addEventListener('click', function(e) { if (e.target === this) closeApplyModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAuthModal(); closeApplyModal(); } });

updateNav();
loadClubs();