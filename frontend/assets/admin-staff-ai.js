(function(){
  const service_BASE = window.APP_CONFIG?.service_BASE_URL || '/api';
  const role = document.body.dataset.dashboardRole === 'admin' ? 'admin' : 'staff';
  const token = localStorage.getItem(`spworldtech_${role}_token`);
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function post(path, payload){
    if (!token) throw new Error(`Please login to the ${role} dashboard first.`);
    const res = await fetch(`${service_BASE}${path}`, {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body:JSON.stringify(payload)});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.message || 'AI request failed');
    return data;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-admin-ai-form]').forEach(form=>form.addEventListener('submit', async e=>{
      e.preventDefault(); const fd=new FormData(form); const out=document.getElementById(form.dataset.output || 'adminAiOutput'); if(out) out.textContent='Generating draft...';
      try{ const path = role === 'admin' ? '/ai/admin-message' : '/ai/support'; const data=await post(path,{message:fd.get('message'), draftType:fd.get('draftType')||'support-reply', recipientType:fd.get('recipientType')||'support', context:`${role}-ai-assistant`}); if(out) out.textContent=data.answer || data.draft?.message || 'Draft generated.'; }
      catch(err){ if(out) out.textContent=err.message; }
    }));
  });
})();
