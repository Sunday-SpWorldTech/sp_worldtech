(function(){
  const el = document.getElementById('homeCryptoPrices');
  if(!el || !window.APP_CONFIG) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = (amount, currency='NGN') => { try { return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(amount||0)); } catch(e){ return `${currency} ${Number(amount||0).toLocaleString()}`; } };
  fetch(`${window.APP_CONFIG.service_BASE_URL}/crypto/markets`).then(r=>r.json()).then(data=>{
    const preferred = ['BTC','ETH','USDT'];
    const markets = (data.markets || []).filter(m=>m.pair).sort((a,b)=>{
      const ai = preferred.findIndex(x=>String(a.pair).startsWith(x));
      const bi = preferred.findIndex(x=>String(b.pair).startsWith(x));
      return (ai<0?99:ai)-(bi<0?99:bi);
    }).slice(0,4);
    el.innerHTML = markets.length ? markets.map(m=>`<article class="home-crypto-card"><span>${esc(m.pair)}</span><strong>${m.ask?money(m.ask,m.quoteAsset||'NGN'):'Live price'}</strong><small>${data.configured?'Live market':'Crypto market setup in progress'}</small></article>`).join('') : '<div class="home-crypto-card"><span>No markets loaded</span><strong>Crypto market setup in progress</strong><small>Market connection is being prepared</small></div>';
  }).catch(()=>{ el.innerHTML='<div class="home-crypto-card"><span>Crypto prices unavailable</span><strong>Check platform</strong><small>Provider prices are shown only after connection</small></div>'; });
})();
