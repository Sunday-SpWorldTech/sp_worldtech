(function () {
    const TOKEN_KEY = 'spworldtech_user_token';
  const USER_KEY = 'spworldtech_user_profile';
  let pinToken = '';
  const qs = (s) => document.querySelector(s);
  function nextTarget() {
    const raw = new URLSearchParams(location.search).get('next');
    if (!raw) return './dashboard.html';
    if (/^https?:/i.test(raw)) return './dashboard.html';
    return raw;
  }
  function status(id, msg, error=false) { const el = qs(id); if (!el) return; el.textContent = msg; el.classList.toggle('error', error); }
  async function post(path, body) {
    const res = await window.spFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'SP WorldTech could not complete this request right now.');
    return data;
  }
  function save(payload) {
    localStorage.setItem(TOKEN_KEY, payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user || {}));
  }
  document.addEventListener('DOMContentLoaded', () => {
    qs('#userSignupForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget).entries());
      if (body.pin !== body.confirmPin) return status('#signupStatus', 'PIN confirmation does not match.', true);
      try {
        const data = await post('/auth/signup', body);
        save(data);
        status('#signupStatus', 'Signup successful. Opening dashboard...');
        setTimeout(() => { location.href = './dashboard.html'; }, 700);
      } catch (err) { status('#signupStatus', err.message, true); }
    });
    qs('#userLoginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget).entries());
      try {
        const data = await post('/auth/user-login', body);
        pinToken = data.pinToken;
        status('#loginStatus', data.message || 'Password verified. Enter PIN.');
        qs('#userLoginForm')?.classList.add('hidden');
        qs('#userPinForm')?.classList.remove('hidden');
      } catch (err) { status('#loginStatus', err.message, true); }
    });
    qs('#userPinForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget).entries());
      try {
        const data = await post('/auth/user-pin-verify', { pinToken, pin: body.pin });
        save(data);
        status('#pinStatus', 'Login successful. Opening dashboard...');
        setTimeout(() => { location.href = nextTarget(); }, 500);
      } catch (err) { status('#pinStatus', err.message, true); }
    });
    qs('#backToPasswordBtn')?.addEventListener('click', () => { pinToken=''; qs('#userPinForm')?.classList.add('hidden'); qs('#userLoginForm')?.classList.remove('hidden'); });
  });
})();
