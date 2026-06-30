(function () {
  const service_BASE = window.APP_CONFIG?.service_BASE_URL || '';
  const pageRole = document.body.dataset.operationsRole || 'staff';
  const fixedRole = ['user', 'admin', 'staff'].includes(pageRole) ? pageRole : 'staff';
  const tokenKey = `spworldtech_${fixedRole}_token`;
  const profileKey = `spworldtech_${fixedRole}_profile`;
  const savedTokenIdKey = `spworldtech_${fixedRole}_token_id`;
  const nextTarget = new URLSearchParams(window.location.search).get('next');
  const safeNextTarget = nextTarget && nextTarget.startsWith('./') ? nextTarget : null;
  const dashboardTarget = fixedRole === 'user' ? (safeNextTarget || './dashboard.html') : (fixedRole === 'admin' ? './admin.html' : './staff.html');
  let calculatorValue = '0';
  let gateMode = 'create';
  const $ = (id) => document.getElementById(id);

  function setStatus(message, isError = false) {
    const el = $('calcStatus');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', Boolean(isError));
  }
  function updateScreen() { const screen = $('calculatorScreen'); if (screen) screen.textContent = calculatorValue; }
  function appendValue(value) { if (calculatorValue === 'Error') calculatorValue = '0'; if (calculatorValue === '0' && /\d/.test(value)) calculatorValue = value; else calculatorValue += value; updateScreen(); }
  function clearCalculator() { calculatorValue = '0'; updateScreen(); }
  function backspace() { calculatorValue = calculatorValue.length > 1 ? calculatorValue.slice(0, -1) : '0'; updateScreen(); }
  function calculate() { try { const expression = calculatorValue.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'); if (!/^[0-9+\-*/().\s]+$/.test(expression)) throw new Error('Invalid expression'); const result = Function(`'use strict'; return (${expression})`)(); calculatorValue = Number.isFinite(result) ? String(Number(result.toFixed(8))) : '0'; } catch (_error) { calculatorValue = 'Error'; setTimeout(clearCalculator, 900); } updateScreen(); }

  async function api(path, body) {
    if (!service_BASE) throw new Error('Platform service URL is not configured.');
    const res = await fetch(`${service_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_error) { throw new Error(`Platform returned non-JSON response: ${text.slice(0, 80) || res.statusText}`); }
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }
  function saveSession(payload) { if (payload?.token) localStorage.setItem(tokenKey, payload.token); if (payload?.user) localStorage.setItem(profileKey, JSON.stringify(payload.user)); }
  function renderTokenId(tokenId) { const box = $('tokenResultBox'); const text = $('createdTokenId'); if (!box || !text) return; if (tokenId) { box.classList.add('has-token'); text.textContent = tokenId; } else { box.classList.remove('has-token'); text.textContent = 'Generated after first PIN setup'; } }
  function showTokenId(tokenId) { if (!tokenId) return; localStorage.setItem(savedTokenIdKey, tokenId); renderTokenId(tokenId); const modalToken = $('modalCreatedTokenId'); if (modalToken) modalToken.textContent = tokenId; const successBox = $('pinSuccessBox'); if (successBox) successBox.classList.remove('hidden'); }
  function clearLocalPinAccess() { localStorage.removeItem(tokenKey); localStorage.removeItem(profileKey); localStorage.removeItem(savedTokenIdKey); renderTokenId(''); setStatus('Local PIN access cleared on this browser.'); }
  function selectedRole() { return fixedRole; }
  function openGate(mode) { gateMode = mode || gateMode || 'create'; const overlay = $('pinGateOverlay'); if (overlay) overlay.classList.remove('hidden'); switchGateTab(gateMode); }
  function closeGate() { const overlay = $('pinGateOverlay'); if (overlay) overlay.classList.add('hidden'); }
  function switchGateTab(mode) { gateMode = mode; document.querySelectorAll('[data-gate-tab]').forEach((button) => button.classList.toggle('active', button.dataset.gateTab === mode)); document.querySelectorAll('[data-gate-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.gatePanel !== mode)); const successBox = $('pinSuccessBox'); if (successBox) successBox.classList.add('hidden'); }

  async function createPin() {
    const fullName = String($('fullNameInput')?.value || '').trim();
    const pin = String($('createPinInput')?.value || '').trim();
    const confirmPin = String($('confirmPinInput')?.value || '').trim();
    const setupCode = String($('setupCodeInput')?.value || '').trim();
    if (!fullName) return setStatus('Enter your full name.', true);
    if (!/^\d{4,8}$/.test(pin)) return setStatus('PIN must be 4 to 8 digits.', true);
    if (pin !== confirmPin) return setStatus('PIN confirmation does not match.', true);
    try { const payload = await api('/auth/operations-pin/create', { role: selectedRole(), fullName, pin, setupCode }); saveSession(payload); showTokenId(payload.tokenId); setStatus('PIN created successfully. Your Token ID is now displayed clearly below.'); }
    catch (error) { setStatus(error.message, true); }
  }
  async function loginPin() {
    const tokenId = String($('tokenIdInput')?.value || '').trim();
    const pin = String($('loginPinInput')?.value || '').trim();
    if (!tokenId || !/^\d{4,8}$/.test(pin)) return setStatus('Enter Token ID and 4 to 8 digit PIN.', true);
    try { const payload = await api('/auth/operations-pin/login', { role: selectedRole(), tokenId, pin }); saveSession(payload); setStatus('Access granted. Opening dashboard...'); window.location.href = dashboardTarget; }
    catch (error) { setStatus(error.message, true); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const logoutMessage = sessionStorage.getItem('spworldtech_logout_message');
    if (logoutMessage) { setStatus(logoutMessage); sessionStorage.removeItem('spworldtech_logout_message'); }
    renderTokenId(localStorage.getItem(savedTokenIdKey) || '');
    document.querySelectorAll('[data-calc]').forEach((btn) => btn.addEventListener('click', () => { const value = btn.dataset.calc; if (value === 'clear') return clearCalculator(); if (value === 'back') return backspace(); if (value === '=') return calculate(); if (value === 'pin') return openGate(localStorage.getItem(savedTokenIdKey) ? 'login' : 'create'); appendValue(value); }));
    $('pinActionBtn')?.addEventListener('click', () => openGate(localStorage.getItem(savedTokenIdKey) ? 'login' : 'create'));
    $('openPinGate')?.addEventListener('click', () => openGate(localStorage.getItem(savedTokenIdKey) ? 'login' : 'create'));
    $('closePinGate')?.addEventListener('click', closeGate); $('closeSuccessBtn')?.addEventListener('click', closeGate); $('removeLocalPinBtn')?.addEventListener('click', clearLocalPinAccess);
    $('pinGateOverlay')?.addEventListener('click', (event) => { if (event.target.id === 'pinGateOverlay') closeGate(); });
    document.querySelectorAll('[data-gate-tab]').forEach((button) => button.addEventListener('click', () => switchGateTab(button.dataset.gateTab)));
    $('createPinSubmit')?.addEventListener('click', createPin); $('pinLoginSubmit')?.addEventListener('click', loginPin);
    $('openDashboardBtn')?.addEventListener('click', () => { window.location.href = dashboardTarget; });
    updateScreen();
  });
})();
