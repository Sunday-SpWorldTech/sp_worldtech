(function () {
  const service_BASE = window.APP_CONFIG?.service_BASE_URL || '/api';
  const token = localStorage.getItem('spworldtech_user_token');
  function esc(v='') { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function aiRequest(path, payload, needsAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (needsAuth && !token) throw new Error('Please login before using this AI assistant.');
    const res = await fetch(`${service_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'AI request failed');
    return data;
  }
  function mount(el) {
    const context = el.dataset.aiContext || 'website-knowledge';
    const title = el.dataset.aiTitle || 'Ask SP WorldTech AI';
    const endpoint = el.dataset.aiEndpoint || (context.includes('support') || context.includes('banking') || context.includes('luno') || context.includes('crypto') ? '/ai/support' : '/ai/chat');
    const auth = endpoint !== '/ai/chat';
    el.innerHTML = `<div class="sp-ai-card"><div class="sp-ai-head"><div><strong>${esc(title)}</strong><p>Powered through SP WorldTech platform and SP WorldTech AI services.</p></div><span>AI</span></div><div class="sp-ai-messages" aria-live="polite"><div class="sp-ai-bubble bot">Hello, I can explain SP WorldTech services and help route sensitive issues to support.</div></div><form class="sp-ai-form"><textarea name="message" placeholder="Ask a question..." required></textarea><button type="submit">Ask AI</button></form></div>`;
    const box = el.querySelector('.sp-ai-messages');
    el.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = new FormData(e.target).get('message');
      box.insertAdjacentHTML('beforeend', `<div class="sp-ai-bubble user">${esc(message)}</div><div class="sp-ai-bubble bot loading">Thinking...</div>`);
      e.target.reset();
      try {
        const data = await aiRequest(endpoint, { message, context, category: context }, auth);
        const loading = box.querySelector('.loading');
        if (loading) loading.remove();
        box.insertAdjacentHTML('beforeend', `<div class="sp-ai-bubble bot">${esc(data.answer || data.content || 'No answer returned.')} ${data.escalated ? '<br><strong>Support ticket created/escalated for review.</strong>' : ''}</div>`);
      } catch (error) {
        const loading = box.querySelector('.loading');
        if (loading) loading.remove();
        box.insertAdjacentHTML('beforeend', `<div class="sp-ai-bubble bot error">${esc(error.message)}</div>`);
      }
      box.scrollTop = box.scrollHeight;
    });
  }
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-sp-ai-widget]').forEach(mount));
})();
