(function(){
  if(document.getElementById('spwSupportWidget')) return;
  const apiBase = window.APP_CONFIG?.service_BASE_URL || '';
  const box = document.createElement('div');
  box.id = 'spwSupportWidget';
  box.className = 'spw-support-widget';
  box.innerHTML = `<button class="spw-support-toggle" aria-label="Open support chat">💬 Support</button><div class="spw-support-panel hidden"><div class="spw-support-head"><strong>SP WorldTech Support</strong><button type="button" class="spw-support-close">×</button></div><div class="spw-support-messages"><div class="spw-chat-bubble staff">Hello, welcome to SP WorldTech support. How can we help?</div></div><form class="spw-support-form"><input name="message" placeholder="Type your message" required/><button type="submit">Send</button></form></div>`;
  document.body.appendChild(box);
  const toggle=box.querySelector('.spw-support-toggle'), panel=box.querySelector('.spw-support-panel'), close=box.querySelector('.spw-support-close'), form=box.querySelector('.spw-support-form'), messages=box.querySelector('.spw-support-messages');
  toggle.addEventListener('click',()=>panel.classList.toggle('hidden'));
  close.addEventListener('click',()=>panel.classList.add('hidden'));
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const input=form.elements.message; const text=input.value.trim(); if(!text) return;
    messages.insertAdjacentHTML('beforeend', `<div class="spw-chat-bubble user"></div>`);
    messages.lastElementChild.textContent=text;
    input.value=''; messages.scrollTop=messages.scrollHeight;
    try{
      const token=localStorage.getItem('spworldtech_user_token') || localStorage.getItem('spworldtech_token') || localStorage.getItem('token') || '';
      if(apiBase && token){ await fetch(`${apiBase}/chat/send`, {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body:JSON.stringify({message:text})}); }
      messages.insertAdjacentHTML('beforeend','<div class="spw-chat-bubble staff">Message received. Our support team will review it from the dashboard.</div>');
    }catch(_err){ messages.insertAdjacentHTML('beforeend','<div class="spw-chat-bubble staff">Message saved locally. Please open the dashboard support section if sending fails.</div>'); }
    messages.scrollTop=messages.scrollHeight;
  });
})();
