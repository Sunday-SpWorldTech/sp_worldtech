const AUTH_service_BASE = window.APP_CONFIG?.service_BASE_URL || '';
const AUTH_TOKEN_KEY = 'spworldtech_user_token';
const AUTH_USER_KEY = 'spworldtech_user_profile';

function authEl(id) { return document.getElementById(id); }
function openUserCalculator() { window.location.href = './login.html'; }
function openAuthModal() { openUserCalculator(); }
function closeAuthModal() { authEl('authOverlay')?.classList.add('hidden'); }

function goProtected(target = './dashboard.html#products-panel') {
  const hasToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (hasToken) window.location.href = target;
  else window.location.href = `./login.html?next=${encodeURIComponent(target)}`;
}

function installProtectedButtons() {
  document.querySelectorAll('[data-protected-target]').forEach(btn => {
    btn.addEventListener('click', () => goProtected(btn.getAttribute('data-protected-target') || './dashboard.html'));
  });
}

function installAiSupportWidget() {
  if (document.getElementById('spAiSupportWidget')) return;
  const widget = document.createElement('div');
  widget.id = 'spAiSupportWidget';
  widget.className = 'ai-support-widget';
  widget.innerHTML = `<button class="ai-support-toggle" type="button">💬 Support</button><div class="ai-support-panel hidden"><div class="ai-support-head"><strong>SP WorldTech AI Support</strong><button type="button" aria-label="Close support">×</button></div><div class="ai-support-body"><p>Hello, welcome to SP WorldTech. Tell us what you need: jobs, banking, cards, data, airtime, pricing, or client payment.</p><p class="small-muted">Live support continues from the user dashboard after secure login and PIN access.</p></div><div class="ai-support-actions"><button type="button" data-protected-target="./dashboard.html#support-panel">Open Dashboard Support</button><a href="./contact.html">Contact Team</a></div></div>`;
  document.body.appendChild(widget);
  const panel = widget.querySelector('.ai-support-panel');
  widget.querySelector('.ai-support-toggle').addEventListener('click', () => panel.classList.toggle('hidden'));
  widget.querySelector('.ai-support-head button').addEventListener('click', () => panel.classList.add('hidden'));
  installProtectedButtons();
}

document.addEventListener('DOMContentLoaded', () => {
  ['heroJoinBtn','jobsJoinBtn'].forEach(id => {
    authEl(id)?.addEventListener('click', (e) => { e.preventDefault?.(); window.location.href = './signup.html'; });
  });
  ['heroLoginBtn'].forEach(id => {
    authEl(id)?.addEventListener('click', (e) => { e.preventDefault?.(); window.location.href = './login.html'; });
  });
  authEl('closeAuthBtn')?.addEventListener('click', closeAuthModal);
  document.querySelectorAll('[data-auth-switch]').forEach(btn => btn.addEventListener('click', openUserCalculator));
  authEl('authOverlay')?.remove();
  installProtectedButtons();
  installAiSupportWidget();
});
