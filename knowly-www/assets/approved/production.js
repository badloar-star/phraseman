(() => {
 'use strict';
 const reveal=id=>{const el=document.getElementById(id);if(!el)return;el.hidden=false;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});};
 const preferences=document.getElementById('site-preferences'),languageLink=document.getElementById('site-language');
 languageLink?.addEventListener('click',e=>{e.preventDefault();preferences.hidden=!preferences.hidden;languageLink.setAttribute('aria-expanded',String(!preferences.hidden));});
 preferences?.querySelectorAll('[data-lang-btn]').forEach(b=>b.addEventListener('click',()=>{preferences.hidden=true;languageLink.setAttribute('aria-expanded','false');}));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&preferences&&!preferences.hidden){preferences.hidden=true;languageLink.setAttribute('aria-expanded','false');languageLink.focus();}});
 document.querySelectorAll('.footer [data-cookie-settings]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.KnowlyCookieSettings?.();}));
 document.querySelector('[data-open-contact]')?.addEventListener('click',()=>reveal('contact-form'));
 document.querySelector('[data-open-instructions]')?.addEventListener('click',()=>reveal('payment-instructions'));
 document.querySelectorAll('[data-open-plan]').forEach(a=>a.addEventListener('click',()=>{reveal('production-flow');document.querySelector(`#quiz-root input[name="plan"][value="${a.dataset.openPlan}"]`)?.click();}));
 if(document.querySelector('#production-flow'))document.addEventListener('click',e=>{if(!e.target.closest('[data-goal]'))return;e.preventDefault();e.stopImmediatePropagation();reveal('production-flow');},true);
 if(document.body.hasAttribute('data-production-test')){
  document.getElementById('assessment-start')?.addEventListener('click',()=>{
   const language=document.getElementById('assessment-language').value;
   window.PhrasemanEnglishTest?.ensureLandingMounted?.();
   const languageButton=document.querySelector(`#app [data-test-language="${language}"]`);
   if(!languageButton){document.getElementById('assessment-error').textContent='Тест загружается. Попробуйте ещё раз через секунду.';return;}
   languageButton.click();
   const consent=document.querySelector('#app #consentCheckbox');
   consent.checked=document.getElementById('assessment-consent').checked;
   consent.dispatchEvent(new Event('change',{bubbles:true}));
   document.getElementById('assessment-root').parentElement.hidden=true;
   document.querySelector('#app #startBtn').click();
   document.getElementById('production-test').hidden=false;
   document.getElementById('production-test').scrollIntoView({block:'start'});
  });
 }
 // Prices on the visible cards use the same public response as the real checkout.
 if(document.querySelector('.edition-pricing')){
  const cfg=window.KNOWLY_SITE||{};
  if(cfg.pricesEndpoint)fetch(cfg.pricesEndpoint).then(r=>{if(!r.ok)throw Error('prices');return r.json();}).then(data=>{
   if(!data.ok||!data.priceCents)return;
   for(const plan of ['monthly','yearly','lifetime']){const cents=data.priceCents[plan];const el=document.querySelector(`.price-card.${plan} .price-amount`);if(el&&Number.isFinite(cents))el.textContent=new Intl.NumberFormat(document.documentElement.lang||'ru',{style:'currency',currency:data.currency||'EUR'}).format(cents/100);}
  }).catch(()=>{});
 }
})();
