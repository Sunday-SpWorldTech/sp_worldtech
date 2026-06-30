(function(){
  const service_BASE = window.APP_CONFIG.service_BASE_URL;
  const token = localStorage.getItem('spworldtech_user_token') || localStorage.getItem('spworldtech_token') || localStorage.getItem('token') || '';
  let markets = [];
  const $ = id => document.getElementById(id);
  const money = (amount, currency='NGN') => new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(amount||0));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  async function api(path, options={}){
    const headers = {'Content-Type':'application/json', ...(options.headers||{})};
    if(token) headers.Authorization = `Bearer ${token}`;
    const res = await window.spFetch(path, {...options, headers});
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch(e) { throw new Error('SP WorldTech service is preparing a secure response. Please try again shortly.'); }
    if(!res.ok) throw new Error(data.message || 'SP WorldTech could not complete this request right now.');
    return data;
  }
  function setStatus(id, msg, err=false){ const el=$(id); if(el){ el.textContent=msg; el.style.color=err?'#b91c1c':'#047857'; } }
  function showTab(tab){
    document.querySelectorAll('.crypto-tab').forEach(el=>el.classList.add('hidden'));
    $(`crypto-${tab}`)?.classList.remove('hidden');
    document.querySelectorAll('[data-crypto-tab]').forEach(a=>a.classList.toggle('active', a.dataset.cryptoTab===tab));
    history.replaceState(null,'',`#${tab}`);
  }
  function fillPairs(){
    const opts = markets.map(m=>`<option value="${esc(m.pair)}">${esc(m.pair)} ${m.ask?`— Ask ${m.ask}`:''}</option>`).join('');
    ['buyPair','sellPair'].forEach(id=>{ const el=$(id); if(el) el.innerHTML = opts || '<option value="">No crypto markets loaded</option>'; });
  }
  function renderPrices(){
    const top = markets.filter(m=>m.pair).slice(0,6);
    $('topCryptoPrices').innerHTML = top.length ? top.map(m=>`<article class="crypto-price-card"><span>${esc(m.pair)}</span><strong>${m.ask?money(m.ask,m.quoteAsset||'NGN'):'--'}</strong><small>Bid: ${m.bid||'--'} • 24h Vol: ${m.rolling24HourVolume||'--'}</small></article>`).join('') : '<div class="crypto-empty">Crypto markets are being prepared. Please refresh after deployment or try again shortly.</div>';
    $('cryptoUpdatedAt').textContent = new Date().toLocaleString();
    $('analysisMarkets').textContent = markets.length;
    const bids = markets.filter(m=>Number(m.bid)>0).sort((a,b)=>Number(b.bid)-Number(a.bid));
    const asks = markets.filter(m=>Number(m.ask)>0).sort((a,b)=>Number(a.ask)-Number(b.ask));
    $('analysisBestBid').textContent = bids[0] ? `${bids[0].pair} ${bids[0].bid}` : '--';
    $('analysisBestAsk').textContent = asks[0] ? `${asks[0].pair} ${asks[0].ask}` : '--';
  }
  function renderMarkets(filter=''){
    const list = markets.filter(m => !filter || String(m.pair).toLowerCase().includes(filter.toLowerCase()));
    $('cryptoMarketsTable').innerHTML = `<table class="crypto-table"><thead><tr><th>Pair</th><th>Base</th><th>Quote</th><th>Bid</th><th>Ask</th><th>Last Trade</th></tr></thead><tbody>${list.map(m=>`<tr><td>${esc(m.pair)}</td><td>${esc(m.baseAsset||'')}</td><td>${esc(m.quoteAsset||'')}</td><td>${m.bid||'--'}</td><td>${m.ask||'--'}</td><td>${m.lastTrade||'--'}</td></tr>`).join('') || '<tr><td colspan="6">No matching markets.</td></tr>'}</tbody></table>`;
  }
  async function loadMarkets(){
    const status = $('cryptoStatus');
    try{
      status.textContent = 'Loading SP WorldTech crypto markets...';
      const data = await api('/crypto/markets');
      markets = data.markets || [];
      status.textContent = data.configured ? 'SP WorldTech crypto market prices are loaded securely.' : (data.message || 'Crypto market service is being prepared for live trading.');
      status.classList.toggle('crypto-alert-warning', !data.configured);
      fillPairs(); renderPrices(); renderMarkets($('marketSearch')?.value || '');
    }catch(e){ status.textContent = 'SP WorldTech crypto market service is not available in this preview. It will load automatically after backend deployment and setup.'; status.classList.add('crypto-alert-warning'); }
  }
  async function loadTransactions(){
    try{
      if(!token) throw new Error('Please login to view your crypto transactions.');
      const data = await api('/crypto/transactions');
      const tx = data.transactions || [];
      $('cryptoTransactionsTable').innerHTML = `<table class="crypto-table"><thead><tr><th>Date</th><th>Type</th><th>Pair/Asset</th><th>Amount</th><th>Fee</th><th>Status</th><th>Reference</th></tr></thead><tbody>${tx.map(t=>`<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td>${esc(t.type)}</td><td>${esc(t.pair||t.asset||'')}</td><td>${t.amount||0}</td><td>${t.fee||0}</td><td>${esc(t.status)}</td><td>${esc(t.reference||'')}</td></tr>`).join('') || '<tr><td colspan="7">No transactions found.</td></tr>'}</tbody></table>`;
    }catch(e){ $('cryptoTransactionsTable').innerHTML = `<div class="crypto-empty error">${esc(e.message)}</div>`; }
  }
  async function submitBuy(e){
    e.preventDefault();
    try{
      if(!token) throw new Error('Please login before buying crypto.');
      const fd = new FormData(e.target); const payload = Object.fromEntries(fd.entries());
      const quote = await api('/crypto/calculate',{method:'POST', body:JSON.stringify({pair:payload.pair, amount:payload.amount})});
      $('quoteMarketPrice').textContent = money(quote.lunoMarketPrice, quote.currency || 'NGN');
      $('quoteServiceFee').textContent = money(quote.serviceFee, quote.currency || 'NGN');
      $('quoteTotal').textContent = money(quote.totalUserPays, quote.currency || 'NGN');
      $('quoteCryptoAmount').textContent = Number(quote.estimatedCryptoAmount||0).toFixed(8);
      const order = await api('/crypto/buy',{method:'POST', body:JSON.stringify({pair:payload.pair, amount:payload.amount, kyc:{phone:payload.phone}})});
      setStatus('buyCryptoStatus','Secure checkout created. Opening payment page...');
      if(order.payment?.authorization_url) window.location.href = order.payment.authorization_url;
    }catch(err){ setStatus('buyCryptoStatus',err.message,true); }
  }
  async function submitSell(e){ e.preventDefault(); try{ if(!token) throw new Error('Please login before continuing.'); const fd=new FormData(e.target); const payload=Object.fromEntries(fd.entries()); await api('/crypto/sell',{method:'POST',body:JSON.stringify({pair:payload.pair,cryptoAmount:payload.cryptoAmount,receivingAccount:{bankName:payload.bankName,accountNumber:payload.accountNumber}})}); setStatus('sellCryptoStatus','Sell request submitted for SP WorldTech review and processing.'); }catch(err){ setStatus('sellCryptoStatus',err.message,true); } }
  async function submitDeposit(e){ e.preventDefault(); try{ if(!token) throw new Error('Please login before continuing.'); const payload=Object.fromEntries(new FormData(e.target).entries()); const data=await api('/crypto/deposit/initiate',{method:'POST',body:JSON.stringify(payload)}); setStatus('depositCryptoStatus','Secure deposit initialized. Opening payment page...'); if(data.payment?.authorization_url) window.location.href=data.payment.authorization_url; }catch(err){ setStatus('depositCryptoStatus',err.message,true); } }
  async function submitWithdraw(e){ e.preventDefault(); try{ if(!token) throw new Error('Please login before continuing.'); const payload=Object.fromEntries(new FormData(e.target).entries()); await api('/crypto/withdraw',{method:'POST',body:JSON.stringify(payload)}); setStatus('withdrawCryptoStatus','Withdrawal submitted for admin approval.'); e.target.reset(); }catch(err){ setStatus('withdrawCryptoStatus',err.message,true); } }
  async function verifyReferenceFromUrl(){ const ref = new URLSearchParams(location.search).get('reference'); if(!ref || !token) return; try{ const data=await api('/crypto/deposit/verify',{method:'POST',body:JSON.stringify({reference:ref})}); $('cryptoStatus').textContent = data.message || 'Payment verification completed.'; }catch(e){ $('cryptoStatus').textContent = e.message; $('cryptoStatus').classList.add('crypto-alert-warning'); } }
  document.querySelectorAll('[data-crypto-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault(); showTab(a.dataset.cryptoTab);}));
  document.querySelectorAll('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.openTab)));
  $('refreshCryptoBtn')?.addEventListener('click',loadMarkets);
  $('marketSearch')?.addEventListener('input',e=>renderMarkets(e.target.value));
  $('buyCryptoForm')?.addEventListener('submit',submitBuy);
  $('sellCryptoForm')?.addEventListener('submit',submitSell);
  $('cryptoDepositForm')?.addEventListener('submit',submitDeposit);
  $('withdrawCryptoForm')?.addEventListener('submit',submitWithdraw);
  $('loadCryptoTransactions')?.addEventListener('click',loadTransactions);
  showTab((location.hash||'#dashboard').replace('#',''));
  loadMarkets(); verifyReferenceFromUrl();
})();
