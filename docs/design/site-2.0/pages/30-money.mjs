// зачем: макет «денежных» страниц сайта в стиле PhraseMan 2.0 (вариант C «Живые темы»):
// /gift/, /premium/, /start/thanks/, /russia/ — со ВСЕМИ состояниями. Только редизайн: тексты взяты
// дословно из C:\Temp\claude\site_inventory.md (разделы 7, 8, 9, 21) и knowly-www, «вы» → «ты».
// Состояния: в каждой странице лежат пустые метки <i class="st-mark" data-state="…">; оболочка (_shell.mjs)
// прячет/показывает их, а скрипт страницы ловит смену метки и ставит data-pg на корень — один DOM на все
// состояния, поэтому живое взаимодействие (выбор плана, ввод имён) не теряется при переключении.
import { ic, ASSET } from '../_shell.mjs';

const { SITE } = ASSET;

// Общий крючок состояний (обычный JS, вставляется в скрипт каждой страницы).
const STATE_HOOK = `
function pmStateHook(tag, root, onState) {
  var marks = Array.prototype.slice.call(document.querySelectorAll('.st-mark[data-state]'));
  var last = null;
  function current() { for (var i = 0; i < marks.length; i++) if (!marks[i].hasAttribute('data-hidden')) return marks[i].dataset.state; return null; }
  function run() {
    var s = current();
    if (s === last) return;
    console.log('[' + tag + '] состояние:', last, '→', s);
    last = s; root.setAttribute('data-pg', s || '');
    try { onState(s); } catch (e) { console.error('[' + tag + '] ошибка в обработчике состояния', s, e); }
  }
  var mo = new MutationObserver(run);
  marks.forEach(function (m) { mo.observe(m, { attributes: true, attributeFilter: ['data-hidden'] }); });
  run();
  return function go(s) {
    if (!window.__pmShow) { console.warn('[' + tag + '] нет __pmShow — состояние не переключено:', s); return; }
    window.__pmShow(s);
    try { history.replaceState(null, '', location.pathname + location.search + '#' + s); } catch (e) { console.warn('[' + tag + '] якорь не записан:', e && e.message); }
  };
}
`;

const MARK_CSS = `.st-mark { display: none !important; }`;
const marks = (ids) => ids.map((id) => `<i class="st-mark" data-state="${id}"></i>`).join('');

/* ====================================================================== */
/* /gift/                                                                 */
/* ====================================================================== */
const GIFT_STATES = [
  ['loading', 'Загрузка цен'],
  ['form', 'Цены загружены'],
  ['filled', 'Имена введены'],
  ['email-err', 'Нет email'],
  ['busy', 'Открываем оплату'],
  ['pay-err', 'Ошибка карты'],
  ['paypal-err', 'Ошибка PayPal'],
];

const giftOpt = (plan, title, sub, badge = '') => `
      <button type="button" class="opt g-opt" data-plan="${plan}" role="radio" aria-checked="${plan === 'yearly'}" aria-pressed="${plan === 'yearly'}">
        <span class="radio" aria-hidden="true"></span>
        <span class="tx">${badge ? `<span class="badge acc g-best">${badge}</span>` : ''}<span class="tt">${title}</span><span class="st">${sub}</span></span>
        <span class="g-price" data-price="${plan}"><span class="skel" aria-hidden="true"></span><b></b></span>
      </button>`;

const giftBody = `
${marks(GIFT_STATES.map((s) => s[0]))}
<div class="gp" id="gp">
<section class="phead g-hero">
  <div class="g-art" aria-hidden="true"><img src="${SITE}/approved/voice-master.webp" alt="" decoding="async"></div>
  <div class="wrap g-hero-in">
    <div class="g-hero-copy">
      <span class="ov">Подарок, который останется с человеком</span>
      <h1>Подари близкому<span class="l2">новый мир.</span></h1>
      <p class="lead">Именной сертификат Phraseman.<br>Три варианта подарка. Каждый — со своим характером.</p>
    </div>
    <div class="g-hero-cert" aria-hidden="true"><img src="${SITE}/approved/certificates/gift-yearly.svg" alt="" loading="lazy"></div>
  </div>
</section>

<section class="g-config"><div class="wrap g-grid">
  <form class="glass form-card form g-form" id="giftForm" novalidate>
    <h2 class="g-h2">Выбери подарок</h2>
    <div class="choice" role="radiogroup" aria-label="Выбор подарка">
      ${giftOpt('monthly', 'Месяц Phraseman Plus', 'Все уроки и темы на 31 день')}
      ${giftOpt('yearly', 'Год Phraseman Plus', 'Все уроки и темы на 366 дней', 'Выгоднее всего')}
      ${giftOpt('lifetime', 'Phraseman Pro', 'Полный доступ навсегда, один платёж')}
    </div>
    <div class="row2">
      <label class="field"><span>Кому (имя на сертификате)</span><input class="input" id="giftTo" type="text" maxlength="60" placeholder="Например: Маша" autocomplete="off"></label>
      <label class="field"><span>От кого</span><input class="input" id="giftFrom" type="text" maxlength="60" placeholder="Например: Саша" autocomplete="off"></label>
    </div>
    <label class="field"><span>Твой email — на него придёт сертификат</span><input class="input" id="buyerEmail" type="email" required maxlength="200" placeholder="you@example.com" autocomplete="email" inputmode="email"></label>
    <p class="hint err g-err" id="payErr" role="alert"></p>
    <div class="g-pay">
      <button class="btn btn-primary" type="submit" id="cardBtn">${ic('card', 's18')}<span id="cardLbl">Оплатить картой</span></button>
      <div class="g-pp" id="paypalButtons" aria-label="Оплата через PayPal">
        <span class="skel g-pp-skel" aria-hidden="true"></span>
        <button type="button" class="btn btn-ghost g-pp-btn" id="ppBtn" aria-label="PayPal"><b>Pay</b><b class="pp2">Pal</b></button>
      </div>
    </div>
    <p class="g-terms">Разовый платёж, автопродления нет · Код действует 12 месяцев · 7 дней гарантии возврата.<br>Карта российского банка не проходит? <a href="contact.html">Напиши в поддержку</a> — оформим вручную.</p>
  </form>

  <div class="g-canvas">
    <aside class="g-cert" data-plan="yearly" id="giftCertificate" aria-label="Предпросмотр сертификата">
      <div class="c-in">
        <div class="c-head"><small>Подарочный сертификат</small><b>Phraseman</b></div>
        <div class="c-body">
          <div class="c-to" id="pvTo">Год Phraseman Plus</div>
          <div class="c-from" id="pvFrom"></div>
          <div class="c-plan" id="pvPlan" hidden>Год Phraseman Plus</div>
          <p class="c-catch" id="pvCatchphrase" aria-live="polite"></p>
        </div>
      </div>
    </aside>
  </div>
</div></section>

<section class="block g-how"><div class="wrap">
  <ol class="g-steps">
    <li class="glass"><span class="g-num">01</span><h3>Выбери срок</h3><p>Месяц — познакомиться. Год — войти в ритм. Pro — сохранить доступ навсегда.</p></li>
    <li class="glass"><span class="g-num">02</span><h3>Получи сертификат</h3><p>После оплаты письмо с кодом придёт на email, указанный при оформлении.</p></li>
    <li class="glass"><span class="g-num">03</span><h3>Подари возможности</h3><p>Получатель вводит код в приложении: Настройки → Промокоды. Банковская карта ему не нужна.</p></li>
  </ol>
</div></section>
</div>`;

const giftCss = `
${MARK_CSS}
.g-hero { position: relative; overflow: hidden; }
.g-art { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.g-art img { width: 100%; height: 100%; object-fit: cover; opacity: .32; -webkit-mask-image: linear-gradient(180deg, #000 30%, transparent 96%); mask-image: linear-gradient(180deg, #000 30%, transparent 96%); }
:root[data-mode="light"] .g-art img { opacity: .14; }
.g-hero-in { grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); align-items: center; }
.g-hero-copy { display: grid; gap: 22px; }
.g-hero-cert img { width: 100%; max-width: 460px; display: block; margin-inline: auto; transform: rotate(-3deg); filter: drop-shadow(0 30px 60px rgba(0,0,0,.4)); transition: transform 600ms var(--ease); }
.g-hero-cert:hover img { transform: rotate(0) translateY(-4px); }

.g-config { padding-block: clamp(8px, 2vw, 24px) clamp(48px, 7vw, 96px); }
.g-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: clamp(20px, 3vw, 40px); align-items: start; }
.g-h2 { font-size: clamp(26px, 3vw, 34px); letter-spacing: -.03em; line-height: 1.1; }
.g-opt { min-height: 76px; }
.g-opt .tt { line-height: 1.25; }
.g-best { height: 22px; font-size: 11px; margin-bottom: 6px; }
.g-price { flex: none; display: grid; justify-items: end; min-width: 72px; font-variant-numeric: tabular-nums; }
.g-price b { font-size: 18px; font-weight: 800; letter-spacing: -.02em; white-space: nowrap; }
.g-price .skel { width: 68px; height: 20px; display: none; }
.gp[data-pg="loading"] .g-price .skel { display: block; }
.gp[data-pg="loading"] .g-price b { display: none; }

.g-err:empty { display: none; }
.g-pay { display: grid; gap: 10px; }
.g-pay .btn { width: 100%; }
#cardBtn[aria-busy="true"] { pointer-events: none; filter: saturate(.7) brightness(.92); }
#cardBtn[aria-busy="true"] .i { display: none; }
#cardBtn .spinner { width: 18px; height: 18px; border-color: color-mix(in srgb, var(--cta-ink) 30%, transparent); border-top-color: var(--cta-ink); }
.g-pp { position: relative; min-height: 48px; display: grid; }
.g-pp-skel { display: none; height: 48px; border-radius: 999px; }
.gp[data-pg="loading"] .g-pp-skel { display: block; }
.gp[data-pg="loading"] .g-pp-btn { display: none; }
.g-pp-btn { min-height: 48px; font-size: 19px; font-style: italic; letter-spacing: -.02em; gap: 0; }
.g-pp-btn .pp2 { color: var(--fill); }
.g-pp-btn[aria-busy="true"] { pointer-events: none; opacity: .7; }
.g-terms { font-size: 13px; color: var(--muted); line-height: 1.55; }
.g-terms a { color: var(--fill); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }

/* сертификат: бумажная арт-подложка — фиксированный предмет, а не элемент темы,
   поэтому чернила на нём свои (как на настоящем сертификате), а не токены темы */
.g-canvas { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 150px); }
.g-cert { --ink: #1E2A4F; --ink2: #4A5574; --gold: #8C6A1E; container-type: inline-size; aspect-ratio: 1.5; border-radius: 22px; overflow: hidden;
  background: center / cover no-repeat var(--art); box-shadow: 0 30px 80px rgba(0,0,0,.42); transition: transform 500ms var(--ease); }
.g-cert[data-plan="monthly"] { --art: url("${SITE}/gift-certificates/gift-certificate-monthly.webp"); }
.g-cert[data-plan="yearly"] { --art: url("${SITE}/gift-certificates/gift-certificate-yearly.webp"); }
.g-cert[data-plan="lifetime"] { --art: url("${SITE}/gift-certificates/gift-certificate-lifetime.webp"); --ink: #FFF8E8; --ink2: #D8CCB0; --gold: #EAD394; }
.g-cert .c-in { height: 100%; padding: 9cqw 20cqw; display: grid; align-content: center; justify-items: center; text-align: center; gap: 3.2cqw; color: var(--ink); }
.g-cert .c-head { display: grid; gap: .6cqw; }
.g-cert .c-head small { font-size: max(9px, 2.1cqw); font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--gold); }
.g-cert .c-head b { font-size: 3cqw; font-weight: 800; letter-spacing: -.01em; }
.g-cert .c-body { display: grid; gap: 1.4cqw; justify-items: center; }
.g-cert .c-to { font-size: 5.6cqw; font-weight: 800; letter-spacing: -.03em; line-height: 1.05; overflow-wrap: anywhere; }
.g-cert .c-from { font-size: max(11px, 2.6cqw); color: var(--ink2); font-weight: 600; overflow-wrap: anywhere; }
.g-cert .c-from:empty { display: none; }
.g-cert .c-plan { font-size: max(10px, 2.4cqw); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--gold); }
.g-cert .c-catch { font-size: max(11px, 2.7cqw); line-height: 1.35; color: var(--ink2); font-style: italic; max-width: 46ch; transition: opacity 260ms var(--ease); }
.g-cert .c-catch.swap { opacity: 0; }

.g-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.g-steps li { padding: 26px; border-radius: 26px; display: grid; gap: 10px; align-content: start; }
.g-num { font-size: 13px; font-weight: 800; letter-spacing: .14em; color: var(--fill); font-variant-numeric: tabular-nums; }
.g-steps h3 { font-size: var(--t-h3); letter-spacing: -.02em; line-height: 1.2; }
.g-steps p { color: var(--sec); font-size: var(--t-s); }

@media (max-width: 980px) {
  .g-hero-in, .g-grid, .g-steps { grid-template-columns: minmax(0, 1fr); }
  .g-hero-cert { display: none; }
  .g-canvas { position: static; order: -1; }
}
@media (max-width: 540px) { .g-cert .c-in { padding: 7cqw 13cqw; gap: 2.4cqw; } }
`;

const giftJs = `
${STATE_HOOK}
(function () {
  var TAG = 'GIFT';
  var root = document.getElementById('gp');
  if (!root) { console.warn('[GIFT] нет корня страницы'); return; }
  // цены: фолбэк site-config (на живом сайте: кэш → сервер → фолбэк)
  var PRICES = { monthly: '€3.99', yearly: '€27.99', lifetime: '€99.99' };
  var NAMES = { monthly: 'Месяц Phraseman Plus', yearly: 'Год Phraseman Plus', lifetime: 'Phraseman Pro — навсегда' };
  // крылатые фразы дословно из assets/gift-certificate-phrases.js (на сайте по 50 на план)
  var PHRASES = {
    monthly: ['Английский на месяц. Побочный эффект: внезапное понимание мемов.', 'Тридцать один день, чтобы перестать кивать с умным видом.', 'Месяц английского — маленький подарок с большим акцентом.', 'Это не носки. Этот подарок реально пригодится.', 'Один месяц. Сотни фраз. Ноль скучных учебников.', 'Подарок, который не пылится. Он разговаривает.'],
    yearly: ['Целый год, чтобы английский стал твоей суперсилой.', 'Двенадцать месяцев. Одна миссия: говорить без паники.', 'Этот год будет говорить с тобой по-английски.', 'Год английского — подарок с очень длинным послевкусием.', 'Один подарок. Четыре сезона. Тысячи разговоров впереди.', 'Большой английский год объявляется открытым.'],
    lifetime: ['Английский навсегда. Легенды мелочами не размениваются.', 'Пожизненный доступ открыт. Эпоха «я не понимаю» окончена.', 'Это не подписка. Это языковое наследство.', 'Тебе подарили вечность. Начни с неправильных глаголов.', 'Пожизненный запас фраз активирован.', 'Доступ навсегда. Отступать теперь просто невежливо.']
  };
  var MSG = {
    email: 'Укажи email — на него придёт сертификат с кодом.',
    card: 'Оплата не открылась. Попробуй ещё раз или напиши в поддержку.',
    paypal: 'PayPal не ответил. Попробуй карту или напиши в поддержку.'
  };
  var form = document.getElementById('giftForm');
  var opts = Array.prototype.slice.call(root.querySelectorAll('.g-opt'));
  var cert = document.getElementById('giftCertificate');
  var to = document.getElementById('giftTo'), from = document.getElementById('giftFrom'), mail = document.getElementById('buyerEmail');
  var pvTo = document.getElementById('pvTo'), pvFrom = document.getElementById('pvFrom'), pvPlan = document.getElementById('pvPlan'), pvCatch = document.getElementById('pvCatchphrase');
  var err = document.getElementById('payErr'), cardBtn = document.getElementById('cardBtn'), cardLbl = document.getElementById('cardLbl'), ppBtn = document.getElementById('ppBtn');
  var plan = 'yearly', phraseIdx = -1, busy = false, flowTimer = null;

  function fillPrices() { root.querySelectorAll('[data-price]').forEach(function (el) { el.querySelector('b').textContent = PRICES[el.dataset.price] || ''; }); }
  function pickPhrase() {
    var list = PHRASES[plan] || [];
    if (!list.length) { console.warn('[GIFT] нет фраз для плана', plan); pvCatch.textContent = ''; return; }
    var i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === phraseIdx) i = (i + 1) % list.length;
    phraseIdx = i;
    pvCatch.classList.add('swap');
    setTimeout(function () { pvCatch.textContent = list[i]; pvCatch.classList.remove('swap'); }, 140);
  }
  function renderPreview() {
    var n = to.value.trim(), f = from.value.trim();
    pvTo.textContent = n ? 'Для: ' + n : NAMES[plan];
    pvPlan.textContent = NAMES[plan];
    pvPlan.hidden = !n;
    pvFrom.textContent = f ? 'от ' + f : '';
  }
  // выбор плана — мгновенно, без сети: подсветка, сертификат, новая фраза
  function setPlan(p, fromUser) {
    if (!NAMES[p]) { console.warn('[GIFT] неизвестный план', p); return; }
    var changed = p !== plan; plan = p;
    opts.forEach(function (o) { var on = o.dataset.plan === p; o.setAttribute('aria-pressed', String(on)); o.setAttribute('aria-checked', String(on)); });
    cert.dataset.plan = p;
    renderPreview();
    if (changed || !pvCatch.textContent) pickPhrase();
    if (fromUser) console.log('[GIFT] выбран план', p);
  }
  opts.forEach(function (o) { o.addEventListener('click', function () { setPlan(o.dataset.plan, true); }); });
  [to, from].forEach(function (inp) { inp.addEventListener('input', renderPreview); });
  mail.addEventListener('input', function () { if (mail.classList.contains('err')) { mail.classList.remove('err'); err.textContent = ''; } });

  function setErr(text) { err.textContent = text || ''; }
  function setBusy(on) {
    busy = on;
    cardBtn.setAttribute('aria-busy', String(on)); cardBtn.disabled = on;
    cardLbl.textContent = on ? 'Открываем оплату…' : 'Оплатить картой';
    var sp = cardBtn.querySelector('.spinner');
    if (on && !sp) { sp = document.createElement('span'); sp.className = 'spinner'; sp.setAttribute('aria-hidden', 'true'); cardBtn.insertBefore(sp, cardLbl); }
    if (!on && sp) sp.remove();
  }
  function emailOk() { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(mail.value.trim()); }

  var go = pmStateHook(TAG, root, function (s) {
    // зачем: таймер перехода к оплате живёт только в состоянии busy — уход в другое состояние его отменяет
    if (s !== 'busy') { clearTimeout(flowTimer); flowTimer = null; }
    if (s !== 'loading') fillPrices();
    root.querySelectorAll('[data-price]').forEach(function (el) { el.setAttribute('aria-busy', String(s === 'loading')); });
    mail.classList.remove('err'); setErr(''); setBusy(false); ppBtn.removeAttribute('aria-busy');
    if (s === 'filled' || s === 'busy' || s === 'pay-err' || s === 'paypal-err') {
      if (!to.value) to.value = 'Маша';
      if (!from.value) from.value = 'Саша';
    }
    if ((s === 'busy' || s === 'pay-err' || s === 'paypal-err') && !mail.value) mail.value = 'you@example.com';
    if (s === 'email-err') { mail.value = ''; mail.classList.add('err'); setErr(MSG.email); }
    if (s === 'busy') setBusy(true);
    if (s === 'pay-err') setErr(MSG.card);
    if (s === 'paypal-err') setErr(MSG.paypal);
    renderPreview();
  });

  // оплата картой: проверка email → занятая кнопка (защита от двойного клика) → переход на страницу «спасибо»
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) { console.log('[GIFT] повторный клик — игнор, оплата уже открывается'); return; }
    if (!emailOk()) { console.log('[GIFT] email не прошёл проверку:', JSON.stringify(mail.value)); mail.classList.add('err'); setErr(MSG.email); mail.focus(); return; }
    console.log('[GIFT] оплата картой: план', plan, 'кому', to.value.trim() || '(пусто)', 'от', from.value.trim() || '(пусто)');
    setBusy(true); // синхронно — второй клик до смены состояния уже упрётся в guard
    go('busy');
    flowTimer = setTimeout(function () { location.href = 'start-thanks.html?gift=1&plan=' + plan + '#waiting'; }, 1400);
  });
  ppBtn.addEventListener('click', function () {
    if (busy || ppBtn.getAttribute('aria-busy') === 'true') { console.log('[GIFT] PayPal: повторный клик — игнор'); return; }
    if (!emailOk()) { console.log('[GIFT] PayPal: email не прошёл проверку'); mail.classList.add('err'); setErr(MSG.email); mail.focus(); return; }
    console.log('[GIFT] PayPal: план', plan);
    ppBtn.setAttribute('aria-busy', 'true');
    setTimeout(function () { location.href = 'start-thanks.html?provider=paypal&gift=1&plan=' + plan + '#waiting'; }, 900);
  });

  setPlan('yearly', false);
  // имитация асинхронной подгрузки цен при первом открытии без якоря
  if (!location.hash && root.getAttribute('data-pg') === 'loading') setTimeout(function () { if (root.getAttribute('data-pg') === 'loading') go('form'); }, 1300);
})();
`;

/* ====================================================================== */
/* /premium/                                                              */
/* ====================================================================== */
const PREM_STATES = [['plans', 'Цены'], ['flow', 'Выбран тариф']];

const planCard = (plan, ov, h, price, sub, items, btn, hl = false) => `
    <article class="glass plan p-plan${hl ? ' hl' : ''}" data-plan="${plan}">
      <span class="ov">${ov}</span>
      <h2 class="p-h">${h}</h2>
      <div><div class="price" data-amount="${plan}">${price}</div><div class="p-sub">${sub}</div></div>
      <ul>${items.map((t) => `<li>${ic('check', 's18')}<span>${t}</span></li>`).join('')}</ul>
      <a class="btn btn-primary" href="#production-flow" data-open-plan="${plan}">${btn} ${ic('arrow', 's18 arr')}</a>
    </article>`;

const premiumBody = `
${marks(PREM_STATES.map((s) => s[0]))}
<div class="pp" id="pp">
<section class="phead center"><div class="wrap">
  <span class="ov">Phraseman Plus / Pro</span>
  <h1>Больше языка.<span class="l2">Больше возможностей.</span></h1>
  <p class="lead">Выбери формат доступа.<br>Актуальные цены сайта — в евро.</p>
</div></section>

<section class="p-pricing"><div class="wrap">
  <div class="plans">
    ${planCard('monthly', 'Начать', 'Месяц Plus', '€3,99', '31 день доступа', ['Все уроки и темы', 'Доступ на выбранный срок', 'Знакомство с полной практикой'], 'Выбрать Plus')}
    ${planCard('yearly', 'Войти в ритм', 'Год Plus', '€27,99', '366 дней доступа', ['Все уроки и темы', 'Доступ на выбранный срок', 'Около €2,33 в месяц'], 'Выбрать Plus', true)}
    ${planCard('lifetime', 'Доступ надолго', 'Pro навсегда', '€99,99', 'Полный доступ навсегда', ['Все уроки и темы', 'Постоянный доступ', 'Один платёж'], 'Выбрать Pro')}
  </div>
  <p class="p-note">Итоговая сумма и условия отображаются перед оплатой.</p>
</div></section>

<section class="block p-gift"><div class="wrap">
  <div class="glass p-gift-card">
    <span class="tile">${ic('gift', 's22')}</span>
    <div class="p-gift-tx"><h2 class="h2">А если это подарок?</h2><p>Добавь имя и выбери один из трёх сертификатов.</p></div>
    <a class="btn btn-primary" href="gift.html">Выбрать подарок ${ic('arrow', 's18 arr')}</a>
  </div>
</div></section>

<section id="production-flow" class="p-flow" aria-label="Оформление"><div class="wrap">
  <div class="glass p-flow-card">
    <div class="qtrk" id="quiz-progress-fill" style="--w:18%"><b></b></div>
    <div id="quiz-root" class="p-quiz" aria-live="polite" aria-busy="true">
      <span class="spinner" aria-hidden="true"></span>
      <span class="skel" style="height:34px;width:min(420px,80%)"></span>
      <span class="skel" style="height:16px;width:min(320px,64%)"></span>
      <div class="p-quiz-opts"><span class="skel"></span><span class="skel"></span><span class="skel"></span></div>
      <span class="skel" style="height:52px;width:min(260px,100%);border-radius:999px"></span>
    </div>
  </div>
</div></section>
</div>`;

const premiumCss = `
${MARK_CSS}
.p-pricing { padding-bottom: 8px; }
.p-h { font-size: 24px; letter-spacing: -.02em; line-height: 1.15; }
.p-plan .price { font-size: clamp(36px, 4vw, 44px); font-weight: 800; letter-spacing: -.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.p-sub { margin-top: 8px; font-size: 14px; color: var(--sec); font-weight: 600; }
.p-plan { transition: transform 300ms var(--ease), box-shadow 300ms var(--ease); }
.p-plan.sel { transform: translateY(-4px); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--fill) 80%, transparent), var(--shadow); }
.p-plan.sel .btn { pointer-events: none; }
.p-note { text-align: center; margin-top: 22px; font-size: 14px; color: var(--muted); }
.p-gift-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 24px; align-items: center; padding: clamp(24px, 4vw, 40px); border-radius: 30px; }
.p-gift-card .h2 { font-size: clamp(28px, 3.4vw, 40px); }
.p-gift-card p { color: var(--sec); font-size: var(--t-l); margin-top: 8px; }
.p-flow { display: none; padding-bottom: clamp(48px, 7vw, 96px); scroll-margin-top: 110px; }
.pp[data-pg="flow"] .p-flow { display: block; animation: stIn 420ms var(--ease); }
.p-flow-card { padding: clamp(22px, 4vw, 40px); border-radius: 30px; display: grid; gap: 28px; }
.p-quiz { display: grid; gap: 14px; justify-items: start; min-height: 320px; align-content: start; }
.p-quiz .spinner { margin-bottom: 6px; }
.p-quiz-opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: 100%; }
.p-quiz-opts .skel { height: 64px; border-radius: 18px; }
@media (max-width: 760px) {
  .p-gift-card { grid-template-columns: minmax(0, 1fr); justify-items: start; }
  .p-gift-card .btn { width: 100%; }
  .p-quiz-opts { grid-template-columns: minmax(0, 1fr); }
}
`;

const premiumJs = `
${STATE_HOOK}
(function () {
  var root = document.getElementById('pp');
  if (!root) { console.warn('[PREMIUM] нет корня страницы'); return; }
  var cards = Array.prototype.slice.call(root.querySelectorAll('.p-plan'));
  var chosen = null;
  function mark(p) {
    chosen = p;
    cards.forEach(function (c) { var on = c.dataset.plan === p; c.classList.toggle('sel', on); var b = c.querySelector('[data-open-plan]'); if (b) b.setAttribute('aria-pressed', String(on)); });
  }
  var go = pmStateHook('PREMIUM', root, function (s) {
    if (s === 'flow') { if (!chosen) mark('yearly'); }
    else mark(null);
  });
  // «Выбрать Plus/Pro»: карточка выделяется мгновенно, раскрывается блок оформления.
  // На живом сайте блок пуст: /assets/start.js отсутствует — здесь нейтральная загрузка без текста.
  root.querySelectorAll('[data-open-plan]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var p = b.dataset.openPlan;
      console.log('[PREMIUM] выбран тариф', p, '(было:', chosen, ')');
      mark(p);
      go('flow');
      requestAnimationFrame(function () { var f = document.getElementById('production-flow'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
  });
})();
`;

/* ====================================================================== */
/* /start/thanks/                                                         */
/* ====================================================================== */
const TH_STATES = [
  ['waiting', 'Ждём оплату'],
  ['code', 'Код'],
  ['code-phone', 'Код · телефон'],
  ['code-gift', 'Код · подарок'],
  ['copied', 'Скопировано'],
  ['manual', 'Вручную'],
];

const thanksBody = `
${marks(TH_STATES.map((s) => s[0]))}
<div class="tp" id="tp">
<section class="t-main"><div class="wrap t-wrap">

  <div class="glass state-card t-wait" aria-live="polite">
    <span class="spinner t-spin" aria-hidden="true"></span>
    <span class="ov">Секундочку</span>
    <h1 class="t-h1">Подтверждаем твою <span class="accent-t">оплату…</span></h1>
    <p>Обычно это занимает меньше минуты. Не закрывай страницу — сейчас здесь появится твой код активации. Оплата уже у нас, ничего не потеряется.</p>
  </div>

  <div class="t-code">
    <div class="glass state-card t-top">
      <img class="t-icon" src="${SITE}/phraseman-icon-128.png" alt="" width="72" height="72">
      <span class="ov">Оплата прошла 🎉</span>
      <h1 class="t-h1">Готово! Вот твой <span class="accent-t">код активации</span></h1>
      <p class="t-sub t-sub-own">Premium уже твой. Код одноразовый и личный — он также сохранён у нас, так что потерять его невозможно.</p>
      <p class="t-sub t-sub-gift">Это подарочный код: перешли его тому, кому даришь, — запиской или сообщением. Код также отправлен тебе на email и сохранён у нас, так что потерять его невозможно.</p>
      <div class="t-codebox"><code id="activation-code">PM-7Q4K-2XRD</code></div>
      <div class="t-acts">
        <a class="btn btn-primary t-deep" id="deeplink-btn" href="phraseman://promo_code_entry?code=PM-7Q4K-2XRD">${ic('out', 's18')}Активировать в приложении</a>
        <button type="button" class="btn btn-primary" id="copy-code-btn">${ic('copy', 's18')}<span id="copyLbl" aria-live="polite">Скопировать код</span></button>
      </div>
      <p class="hint t-hint" id="deeplink-hint">Кнопка сработает, если приложение уже установлено. Нет приложения — установи (кнопки ниже) и введи код.</p>
    </div>
    <ol class="howto t-steps">
      <li><div><b>Установи Phraseman (если ещё нет)</b><p>Кнопки ниже. Открой приложение и войди или создай аккаунт — это минута.</p></div></li>
      <li><div class="t-own"><b>Введи код в приложении</b><p>Открой Настройки → Промокоды, вставь код с этой страницы и нажми «Активировать».</p></div>
          <div class="t-gift"><b>Получатель вводит код</b><p>В приложении: Настройки → Промокоды — вставить код и нажать «Активировать».</p></div></li>
      <li><div><b>Premium включится мгновенно</b><p>Сразу после ввода кода — на всех устройствах, где ты вошёл в свой аккаунт. Твой план уже ждёт внутри.</p></div></li>
    </ol>
    <div class="glass t-tip"><span class="tile">${ic('star', 's18')}</span><p>Совет: сделай скриншот этого экрана. А если код всё же потеряется — <a href="contact.html">напиши в поддержку</a>, восстановим по email из оплаты.</p></div>
  </div>

  <div class="t-manual">
    <div class="glass state-card t-top">
      <img class="t-icon" src="${SITE}/phraseman-icon-128.png" alt="" width="72" height="72">
      <span class="ov">Оплата прошла 🎉</span>
      <h1 class="t-h1">Спасибо! Premium <span class="accent-t">уже в пути</span></h1>
      <p>Оплата получена и надёжно записана — волноваться не о чем. Код активации сейчас готовится; мы включим Premium вручную в течение пары часов и напишем на email, указанный при оплате.</p>
    </div>
    <ol class="howto t-steps">
      <li><div><b>Установи приложение</b><p>Кнопки ниже. Войди или создай аккаунт.</p></div></li>
      <li><div><b>Мы всё сделаем сами</b><p>Активируем Premium и напишем на email, когда всё готово — обычно в течение пары часов.</p></div></li>
      <li><div><b>Перезайди в приложение</b><p>Premium подхватится автоматически. Твой план уже будет ждать внутри.</p></div></li>
    </ol>
  </div>

  <div class="t-bottom">
    <div class="t-stores">
      <a class="btn btn-primary t-store" href="https://apps.apple.com/app/id6764800879" aria-label="Скачать Phraseman в App Store">${ic('apple', 's22')}<span><small>Загрузи в</small><b>App Store</b></span></a>
      <a class="btn btn-ghost t-store" href="https://play.google.com/store/apps/details?id=app.phraseman" aria-label="Скачать Phraseman в Google Play">${ic('play', 's22')}<span><small>Доступно в</small><b>Google Play</b></span></a>
    </div>
    <p class="t-help">Вопрос или что-то пошло не так? <a href="contact.html">Напиши в поддержку</a> — ответим быстро. В первые 7 дней вернём деньги без вопросов.</p>
  </div>
</div></section>
</div>`;

const thanksCss = `
${MARK_CSS}
.t-main { padding-block: clamp(32px, 6vw, 72px) clamp(56px, 8vw, 104px); }
.t-wrap { max-width: 760px; display: grid; gap: 16px; }
.t-h1 { font-size: clamp(30px, 4.4vw, 48px); letter-spacing: -.035em; line-height: 1.05; max-width: 18ch; }
.t-spin { width: 40px; height: 40px; border-width: 3px; }
.t-icon { width: 72px; height: 72px; border-radius: 20px; box-shadow: var(--shadow); }
.t-wait, .t-code, .t-manual { display: none; }
.tp[data-pg="waiting"] .t-wait { display: grid; }
.tp[data-pg="code"] .t-code, .tp[data-pg="code-phone"] .t-code, .tp[data-pg="code-gift"] .t-code, .tp[data-pg="copied"] .t-code { display: grid; gap: 16px; }
.tp[data-pg="manual"] .t-manual { display: grid; gap: 16px; }
.t-sub-gift, .t-gift { display: none; }
.tp[data-pg="code-gift"] .t-sub-gift, .tp[data-pg="code-gift"] .t-gift { display: block; }
.tp[data-pg="code-gift"] .t-sub-own, .tp[data-pg="code-gift"] .t-own { display: none; }
.t-codebox { width: 100%; max-width: 420px; padding: 20px 16px; border-radius: 20px; background: var(--control); }
.t-codebox code { font: 800 clamp(26px, 6vw, 36px)/1 ui-monospace, 'SF Mono', Menlo, Consolas, monospace; letter-spacing: .08em; color: var(--text); overflow-wrap: anywhere; user-select: all; }
.t-acts { display: grid; gap: 10px; width: 100%; max-width: 420px; }
.t-acts .btn { width: 100%; }
.t-deep, .t-hint { display: none; }
.tp[data-pg="code-phone"] .t-deep { display: inline-flex; }
.tp[data-pg="code-phone"] .t-hint { display: block; max-width: 40ch; }
.tp[data-pg="code-phone"] #copy-code-btn { background: var(--control); color: var(--text); box-shadow: none; }
#copy-code-btn[data-copied="true"] .i { display: none; }
.t-steps li > div { min-width: 0; }
.t-steps b { margin-top: 10px; }
.t-tip { display: flex; gap: 16px; align-items: center; padding: 18px 22px; border-radius: 22px; }
.t-tip p { color: var(--sec); font-size: 15px; }
.t-tip a, .t-help a { color: var(--fill); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.t-bottom { display: grid; gap: 16px; justify-items: center; text-align: center; margin-top: 24px; }
.t-stores { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.t-store { min-height: 56px; padding: 0 22px; text-align: left; }
.t-store small { display: block; font-size: 11px; font-weight: 600; opacity: .75; line-height: 1.1; }
.t-store b { display: block; font-size: 16px; line-height: 1.15; }
.t-help { color: var(--sec); font-size: 15px; max-width: 52ch; }
`;

const thanksJs = `
${STATE_HOOK}
(function () {
  var root = document.getElementById('tp');
  if (!root) { console.warn('[THANKS] нет корня страницы'); return; }
  var btn = document.getElementById('copy-code-btn'), lbl = document.getElementById('copyLbl');
  var resetT = null, waitT = null;
  function showCopied(on) {
    clearTimeout(resetT);
    btn.dataset.copied = String(on);
    lbl.textContent = on ? 'Скопировано ✓' : 'Скопировать код';
  }
  var go = pmStateHook('THANKS', root, function (s) {
    clearTimeout(waitT);
    showCopied(s === 'copied');
  });
  // копирование: подтверждение показываем сразу, буфер обмена догоняет; через 2 с — обратно
  btn.addEventListener('click', function () {
    var code = document.getElementById('activation-code').textContent.trim();
    showCopied(true);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { console.log('[THANKS] код скопирован'); }, function (e) { console.warn('[THANKS] буфер обмена отказал:', e && e.message); });
      else console.warn('[THANKS] нет navigator.clipboard — код выделяется вручную');
    } catch (e) { console.warn('[THANKS] копирование упало:', e && e.message); }
    resetT = setTimeout(function () { showCopied(false); }, 2000);
  });
  // пришли из оплаты на /gift/: «ждём» → код подарка (на сайте — опрос webOrderStatus)
  var q = new URLSearchParams(location.search);
  if (root.getAttribute('data-pg') === 'waiting' && (q.get('gift') === '1' || q.get('provider'))) {
    console.log('[THANKS] из потока оплаты:', q.toString());
    waitT = setTimeout(function () { go(q.get('gift') === '1' ? 'code-gift' : 'code'); }, 2600);
  }
})();
`;

/* ====================================================================== */
/* /russia/                                                               */
/* ====================================================================== */
const RU_STATES = [['closed', 'До инструкции'], ['open', 'Инструкция открыта']];

const faqItem = (q, a, open = false) => `
    <details${open ? ' open' : ''}><summary>${q}<span class="pm">${ic('plus', 's16')}</span></summary><p>${a}</p></details>`;

const russiaBody = `
${marks(RU_STATES.map((s) => s[0]))}
<div class="rp" id="rp">
<section class="phead r-hero"><div class="wrap r-split">
  <div class="r-copy">
    <span class="ov">Для пользователей из России</span>
    <h1>Твои занятия<span class="l2">могут продолжаться.</span></h1>
    <p class="lead">Если оплата через магазин недоступна, посмотри актуальные альтернативные способы на действующем сайте.</p>
    <div class="acts"><a class="btn btn-primary" href="#payment-instructions" id="openInstr" data-open-instructions>Перейти к инструкции ${ic('arrow', 's18 arr')}</a></div>
    <p class="r-note">Условия и доступные способы могут меняться. Проверь их перед оформлением.</p>
  </div>
  <div class="glass r-card">
    <h2>Всё по порядку.</h2>
    <ol class="r-ol">
      <li>Открой действующую инструкцию.</li>
      <li>Выбери доступный способ.</li>
      <li>Проверь предложение до оплаты.</li>
    </ol>
    <a class="more" href="contact.html" style="margin-top:0">Если нужна помощь — напиши ${ic('arrow', 's18')}</a>
  </div>
</div></section>

<div id="payment-instructions" class="r-instr">
<section class="block r-steps-sec"><div class="wrap r-narrow">
  <ol class="howto">
    <li><div><b>Открой бота</b><p>Найди <a href="https://t.me/PhrasemanPremiumBot" target="_blank" rel="noopener">@PhrasemanPremiumBot</a> в Telegram или нажми кнопку ниже.</p></div></li>
    <li><div><b>Выбери тариф</b><p>Бот покажет доступные варианты — месяц, год или навсегда. Цена в Telegram Stars, оплата одним нажатием.</p></div></li>
    <li><div><b>Получи код и включи Premium сам</b><p>Сразу после оплаты бот пришлёт личный код активации. Введи его в приложении: Настройки → Промокоды — Premium включится мгновенно, ждать ничего не нужно.</p></div></li>
  </ol>
  <div class="r-bot">
    <a class="btn btn-primary" href="https://t.me/PhrasemanPremiumBot" target="_blank" rel="noopener">${ic('telegram', 's18')}Открыть @PhrasemanPremiumBot</a>
    <p class="r-fine">Код активации приходит сразу после оплаты и сохраняется у нас — потерять его невозможно. Если что-то пошло не так, Premium включим вручную.</p>
    <p class="r-help">Нужна помощь? <a href="contact.html">Напиши в поддержку</a> — ответим быстро.</p>
  </div>
</div></section>

<section class="block r-faq-sec"><div class="wrap r-narrow">
  <h2 class="h2">Частые вопросы</h2>
  <div class="glass faq">
    ${faqItem('Что такое Telegram Stars?', 'Telegram Stars — встроенная валюта Telegram для покупок в ботах и мини-приложениях. Покупаются через Telegram прямо с карты, включая карты российских банков. Звёзды не нужно хранить — они списываются мгновенно при оплате.', true)}
    ${faqItem('Как быстро откроется Premium после оплаты?', 'Мгновенно: сразу после оплаты бот присылает код активации. Введи его в приложении (Настройки → Промокоды) — Premium включится в ту же секунду. Подписка потом продлевается автоматически, код вводится один раз.')}
    ${faqItem('На каком аккаунте активируется Premium?', 'На том, в котором ты введёшь код — ошибиться невозможно. Работает на всех устройствах, где ты вошёл в этот аккаунт.')}
    ${faqItem('Можно ли вернуть деньги?', 'Да. Напиши в <a href="contact.html">поддержку</a> в течение 7 дней после покупки — разберёмся.')}
    ${faqItem('Работает ли Premium, купленный через бота, на iOS и Android?', 'Да. Premium привязан к аккаунту, а не к магазину — работает на всех устройствах, где ты вошёл в Phraseman.')}
  </div>
</div></section>
</div>
</div>`;

const russiaCss = `
${MARK_CSS}
.r-split { grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); align-items: center; gap: clamp(28px, 5vw, 72px); }
.r-copy { display: grid; gap: 22px; justify-items: start; }
.r-note { font-size: 14px; color: var(--muted); max-width: 44ch; }
.r-card { padding: clamp(24px, 3.4vw, 36px); border-radius: 28px; display: grid; gap: 20px; }
.r-card h2 { font-size: clamp(26px, 3vw, 34px); letter-spacing: -.03em; line-height: 1.1; }
.r-ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; counter-reset: r; }
.r-ol li { display: flex; gap: 14px; align-items: center; font-weight: 600; }
.r-ol li::before { counter-increment: r; content: counter(r); width: 34px; height: 34px; border-radius: 11px; background: var(--tile); display: grid; place-items: center; font-weight: 800; font-size: 15px; flex: none; }
.r-instr { display: none; scroll-margin-top: 100px; }
.rp[data-pg="open"] .r-instr { display: block; animation: stIn 420ms var(--ease); }
.r-narrow { max-width: 820px; }
.r-steps-sec { padding-bottom: 0; }
.howto a, .r-help a, .faq a { color: var(--fill); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.r-bot { margin-top: 24px; display: grid; gap: 14px; justify-items: start; }
.r-fine { font-size: 14px; color: var(--muted); max-width: 60ch; }
.r-help { color: var(--sec); font-size: 15px; }
.r-faq-sec .faq { margin-top: 28px; }
.faq summary { min-width: 0; }
@media (max-width: 980px) { .r-split { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 540px) { .r-bot .btn { width: 100%; white-space: normal; text-align: center; } }
`;

const russiaJs = `
${STATE_HOOK}
(function () {
  var root = document.getElementById('rp');
  if (!root) { console.warn('[RUSSIA] нет корня страницы'); return; }
  var go = pmStateHook('RUSSIA', root, function () {});
  var btn = document.getElementById('openInstr');
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    console.log('[RUSSIA] открыть инструкцию, было состояние', root.getAttribute('data-pg'));
    go('open');
    requestAnimationFrame(function () { var t = document.getElementById('payment-instructions'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  });
})();
`;

export default [
  { file: 'gift.html', title: 'Подари новый мир', group: 'Покупка', path: '/gift/', body: giftBody, css: giftCss, js: giftJs, states: GIFT_STATES },
  { file: 'premium.html', title: 'Plus и Pro', group: 'Покупка', path: '/premium/', body: premiumBody, css: premiumCss, js: premiumJs, states: PREM_STATES },
  { file: 'start-thanks.html', title: 'Твой следующий шаг', group: 'Покупка', path: '/start/thanks/', body: thanksBody, css: thanksCss, js: thanksJs, states: TH_STATES },
  { file: 'russia.html', title: 'Если магазин недоступен', group: 'Покупка', path: '/russia/', body: russiaBody, css: russiaCss, js: russiaJs, states: RU_STATES },
];
