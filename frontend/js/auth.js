function openAuthModal() {
    document.getElementById('authModal').style.display = 'block';
}
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function showAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const btns = document.querySelectorAll('.tab-btn');
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        btns[1].classList.add('active');
        btns[0].classList.remove('active');
    }
}

async function login() {
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const data = await api('POST', '/api/auth/login', { email, password });
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        closeAuthModal();
        showToast('Добро пожаловать, ' + currentUser.name);
        updateUIForUser();
        showHome();
    } catch (e) { showToast(e.message, true); }
}

async function register() {
    try {
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        if (!email.endsWith('@alatoo.edu.kg')) throw new Error('Только @alatoo.edu.kg');
        const data = await api('POST', '/api/auth/register', { name, email, password });
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        closeAuthModal();
        showToast('Регистрация успешна');
        updateUIForUser();
        showHome();
    } catch (e) { showToast(e.message, true); }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUIForUser();
    showHome();
}

function updateUIForUser() {
    const myAppsLink = document.getElementById('myAppsLink');
    const adminLink = document.getElementById('adminLink');
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');

    if (currentUser) {
        loginLink.style.display = 'none';
        logoutLink.style.display = 'inline-block';
        if (currentUser.role === 'admin') {
            myAppsLink.style.display = 'none';
            adminLink.style.display = 'inline-block';
        } else {
            myAppsLink.style.display = 'inline-block';
            adminLink.style.display = 'none';
        }
    } else {
        loginLink.style.display = 'inline-block';
        logoutLink.style.display = 'none';
        myAppsLink.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

if (currentUser) updateUIForUser();