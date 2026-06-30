const service_BASE = window.APP_CONFIG.service_BASE_URL;
function getToken(){return localStorage.getItem('spworldtech_user_token') || localStorage.getItem('spworldtech_token') || localStorage.getItem('token') || '';}
function esc(v=''){return String(v).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
async function postProduct(payload){
  const token = getToken();
  if(!token) { location.href = './login.html?next=' + encodeURIComponent(location.pathname.split('/').pop()); return; }
  const res = await fetch(`${service_BASE}/wallet/product-request`, {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body:JSON.stringify(payload)});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message || 'Product request failed');
  return data;
}
function setupProductForm(){
  const form = document.getElementById('productApplyForm'); if(!form) return;
  form.addEventListener('submit', async (event)=>{
    event.preventDefault();
    const status = document.getElementById('productApplyStatus');
    status.textContent = 'Submitting secure platform request...';
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    try{
      const data = await postProduct(payload);
      status.textContent = data.message || 'Request submitted. Check your dashboard for status.';
    }catch(err){ status.textContent = err.message; }
  });
}
document.addEventListener('DOMContentLoaded', setupProductForm);
