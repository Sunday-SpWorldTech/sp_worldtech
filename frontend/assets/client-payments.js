const service_BASE = window.APP_CONFIG?.service_BASE_URL || '';
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('clientPaymentPreviewForm');
  const status = document.getElementById('clientPaymentStatus');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.paymentType = String(data.paymentType || 'advance').toLowerCase().includes('full') ? 'full' : String(data.paymentType || 'advance').toLowerCase().includes('milestone') ? 'milestone' : 'advance';
    data.amount = Number(String(data.amount || '').replace(/[^0-9.]/g, '') || 0);
    data.currency = String(form.querySelector('[name=currency]')?.value || 'USD');
    try {
      const res = await fetch(`${service_BASE}/client-payments`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
      const text = await res.text();
      let payload = {};
      try { payload = text ? JSON.parse(text) : {}; } catch (_error) { throw new Error(`Platform returned non-JSON response: ${text.slice(0, 80) || res.statusText}`); }
      if (!res.ok) throw new Error(payload.message || 'Payment request failed');
      if (status) { status.textContent = payload.message; status.style.color = '#0f766e'; }
      form.reset();
    } catch (error) { if (status) { status.textContent = error.message; status.style.color = '#b91c1c'; } }
  });
});
