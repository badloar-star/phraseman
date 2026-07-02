/* Квиз-воронка /start/: 7 вопросов → персональный план → пейвол (Stripe/PayPal).
   Всё состояние в памяти + ответы дублируются в sessionStorage (переживает reload).
   UTM первого касания хранится в localStorage и прикрепляется к заказу. */
(function () {
  'use strict';

  var cfg = function () { return window.KNOWLY_SITE || {}; };

  /* ───────── analytics ───────── */

  function track(type) {
    try {
      var endpoint = cfg().statsEndpoint;
      if (!endpoint) return;
      var body = JSON.stringify({ type: type, page: '/start/' });
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
      fetch(endpoint, { method: 'POST', body: body, keepalive: true }).catch(function () {});
    } catch (_) { /* не ломаем страницу */ }
  }

  function fbq() {
    if (window.fbq) window.fbq.apply(null, arguments);
  }

  function initMetaPixel() {
    var id = cfg().metaPixelId;
    if (!id || window.fbq) return;
    /* стандартный загрузчик Meta Pixel */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  /* ───────── UTM первого касания ───────── */

  function captureUtm() {
    try {
      var params = new URLSearchParams(location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'fbclid', 'ttclid'];
      var found = {};
      var has = false;
      keys.forEach(function (k) {
        var v = params.get(k);
        if (v) { found[k] = String(v).slice(0, 120); has = true; }
      });
      if (has && !localStorage.getItem('pm_utm')) {
        localStorage.setItem('pm_utm', JSON.stringify({ ts: Date.now(), params: found }));
      }
    } catch (_) { /* noop */ }
  }

  function readUtm() {
    try {
      var raw = localStorage.getItem('pm_utm');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  /* ───────── данные квиза ───────── */

  var QUIZ = [
    { id: 'intro', type: 'intro' },
    {
      id: 'goal', type: 'q', title: 'Зачем вам английский?', sub: 'От цели зависит, какие фразы пойдут в план.',
      options: [
        { v: 'travel', e: '✈️', t: 'Путешествия', d: 'аэропорт, отель, кафе, дорога' },
        { v: 'work', e: '💼', t: 'Работа и карьера', d: 'собеседования, переписка, звонки' },
        { v: 'move', e: '🏡', t: 'Переезд', d: 'жизнь и быт в другой стране' },
        { v: 'self', e: '🧠', t: 'Для себя', d: 'сериалы, соцсети, держать мозг в тонусе' },
      ],
    },
    {
      id: 'level', type: 'q', title: 'Что сейчас с вашим английским?', sub: 'Честно — план начнётся с правильного места.',
      options: [
        { v: 'zero', e: '🌱', t: 'Начинаю почти с нуля', d: 'помню отдельные слова' },
        { v: 'understand', e: '🙉', t: 'Понимаю, но не говорю', d: 'самый частый ответ' },
        { v: 'mistakes', e: '🗣️', t: 'Говорю, но с ошибками', d: 'не хватает уверенности' },
        { v: 'confident', e: '🚀', t: 'Уверенно, нужна практика', d: 'хочу не растерять' },
      ],
    },
    {
      id: 'pain', type: 'q', title: 'Что мешало раньше?', sub: 'План обойдёт именно эти грабли.',
      options: [
        { v: 'forget', e: '🫠', t: 'Учу — и забываю', d: 'слова не задерживаются' },
        { v: 'fear', e: '😰', t: 'Боюсь говорить', d: 'стыдно за ошибки и акцент' },
        { v: 'time', e: '⏰', t: 'Нет времени', d: 'работа, семья, всё как всегда' },
        { v: 'quit', e: '📉', t: 'Бросаю через неделю', d: 'мотивация испаряется' },
      ],
    },
    { id: 'proof', type: 'proof' },
    {
      id: 'time', type: 'q', title: 'Сколько минут в день реально есть?', sub: 'Лучше честные 15 минут, чем героический час по субботам.',
      options: [
        { v: '5', e: '☕', t: '5–10 минут', d: 'по дороге, в очереди' },
        { v: '15', e: '⚡', t: '15 минут', d: 'золотой стандарт' },
        { v: '30', e: '🔥', t: '30+ минут', d: 'настроен(а) серьёзно' },
      ],
    },
    {
      id: 'age', type: 'q', title: 'Сколько вам лет?', sub: 'Подстроим темп и примеры.',
      options: [
        { v: '18-24', e: '🎓', t: 'До 25' },
        { v: '25-34', e: '💫', t: '25–34' },
        { v: '35-44', e: '🌟', t: '35–44' },
        { v: '45+', e: '👑', t: '45+' },
      ],
    },
    {
      id: 'speak', type: 'q', title: 'Говорить вслух — страшно?', sub: 'Произношение тренируется прямо с телефоном: голос никуда не отправляется.',
      options: [
        { v: 'yes', e: '🙈', t: 'Да, очень', d: 'начнём наедине с телефоном' },
        { v: 'bit', e: '😅', t: 'Немного', d: 'разговоримся постепенно' },
        { v: 'no', e: '😎', t: 'Нет', d: 'сразу добавим дуэли' },
      ],
    },
    { id: 'build', type: 'build' },
    { id: 'result', type: 'result' },
    { id: 'paywall', type: 'paywall' },
  ];

  var GOAL_META = {
    travel: { name: 'Поездка', scen: 'аэропорту, отеле и кафе' },
    work: { name: 'Работа', scen: 'собеседовании, звонках и переписке' },
    move: { name: 'Переезд', scen: 'быту новой страны' },
    self: { name: 'Разговорный', scen: 'сериалах и живых разговорах' },
  };
  var LEVEL_META = {
    zero: 'с самых основ',
    understand: 'с разговорного минимума — понимать вы уже умеете',
    mistakes: 'с уверенной речи — чистим ошибки',
    confident: 'с продвинутых живых фраз',
  };

  /* ───────── состояние ───────── */

  function loadState() {
    try {
      var raw = sessionStorage.getItem('pm_quiz');
      if (raw) return JSON.parse(raw);
    } catch (_) { /* noop */ }
    return { step: 0, answers: {} };
  }

  var state = loadState();

  function saveState(next) {
    state = next;
    try { sessionStorage.setItem('pm_quiz', JSON.stringify(next)); } catch (_) { /* noop */ }
  }

  /* ───────── рендер ───────── */

  var root = null;

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function setProgress() {
    var fill = document.getElementById('quiz-progress-fill');
    if (!fill) return;
    var pct = Math.min(100, Math.round((state.step / (QUIZ.length - 1)) * 100));
    fill.style.width = pct + '%';
  }

  function go(stepIndex) {
    saveState({ step: stepIndex, answers: state.answers });
    render();
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (_) { window.scrollTo(0, 0); }
  }

  function answer(qid, value) {
    var answers = {};
    Object.keys(state.answers).forEach(function (k) { answers[k] = state.answers[k]; });
    answers[qid] = value;
    saveState({ step: state.step, answers: answers });
    go(state.step + 1);
  }

  function backButton() {
    if (state.step <= 0) return null;
    return h('button', { class: 'qback', type: 'button', onclick: function () { go(Math.max(0, state.step - 1)); } }, ['← Назад']);
  }

  function renderIntro() {
    return h('div', { class: 'qscreen' }, [
      h('p', { class: 'kicker' }, ['Бесплатный подбор · 2 минуты']),
      h('h1', {}, ['Соберём ваш план английского', h('span', { class: 'gold-accent' }, [' под вашу жизнь'])]),
      h('p', { class: 'sub' }, ['7 коротких вопросов — и вы получите план: с чего начать, сколько заниматься и какие фразы учить первыми.']),
      h('div', { class: 'qstats' }, [
        h('div', {}, [h('b', {}, ['10 000+']), h('span', {}, ['живых фраз'])]),
        h('div', {}, [h('b', {}, ['15 мин']), h('span', {}, ['в день'])]),
        h('div', {}, [h('b', {}, ['4.8★']), h('span', {}, ['в сторах'])]),
      ]),
      h('button', {
        class: 'btn-gold', type: 'button',
        onclick: function () { track('quiz_start'); fbq('track', 'ViewContent'); go(1); },
      }, ['Подобрать мой план →']),
      h('p', { class: 'qsecure' }, ['Без регистрации. Ответы нужны только для подбора плана.']),
    ]);
  }

  function renderQuestion(step) {
    var num = QUIZ.slice(0, state.step).filter(function (s) { return s.type === 'q'; }).length + 1;
    var total = QUIZ.filter(function (s) { return s.type === 'q'; }).length;
    return h('div', { class: 'qscreen' }, [
      h('p', { class: 'kicker' }, ['Вопрос ' + num + ' из ' + total]),
      h('h1', {}, [step.title]),
      h('p', { class: 'sub' }, [step.sub || '']),
      h('div', { class: 'qoptions' }, step.options.map(function (o) {
        return h('button', {
          class: 'qopt', type: 'button',
          onclick: function () { answer(step.id, o.v); },
        }, [
          h('span', { class: 'qemoji' }, [o.e]),
          h('span', {}, [o.t, o.d ? h('small', {}, [o.d]) : null]),
        ]);
      })),
      backButton(),
    ]);
  }

  function renderProof() {
    return h('div', { class: 'qscreen' }, [
      h('p', { class: 'kicker' }, ['Вы не одни']),
      h('h1', {}, ['«Понимаю, но не говорю» — ', h('span', { class: 'gold-accent' }, ['это лечится'])]),
      h('div', { class: 'qproof-card' }, [
        h('div', { class: 'qmark' }, ['“']),
        h('p', {}, ['Только это приложение вдохновляет, мотивирует и делает обучение интересным, по-настоящему наделяет способностью понимать и говорить правильно на современном английском языке!']),
        h('footer', {}, ['— отзыв в Google Play']),
      ]),
      h('button', { class: 'btn-gold', type: 'button', onclick: function () { go(state.step + 1); }, }, ['Продолжить →']),
      backButton(),
    ]);
  }

  var BUILD_LINES = [
    'Определяем стартовую точку…',
    'Подбираем фразы под вашу цель…',
    'Настраиваем темп под ваше время…',
    'Собираем план…',
  ];

  function renderBuild() {
    var lines = BUILD_LINES.map(function (txt) {
      return h('div', { class: 'qbuild-line' }, [h('span', { class: 'check' }, ['✓']), txt]);
    });
    var screen = h('div', { class: 'qscreen qbuild' }, [
      h('div', { class: 'qbuild-ring' }),
      h('h1', {}, ['Собираем ваш план…']),
      h('div', { class: 'qbuild-lines' }, lines),
    ]);
    lines.forEach(function (line, i) {
      setTimeout(function () { line.classList.add('done'); }, 600 + i * 650);
    });
    setTimeout(function () {
      if (state.step === QUIZ.findIndex(function (s) { return s.id === 'build'; })) {
        track('quiz_complete');
        fbq('track', 'CompleteRegistration');
        go(state.step + 1);
      }
    }, 600 + BUILD_LINES.length * 650 + 500);
    return screen;
  }

  function planSummaryRows() {
    var a = state.answers;
    var goal = GOAL_META[a.goal] || GOAL_META.self;
    var minutes = a.time === '5' ? '5–10' : a.time === '30' ? '30' : '15';
    return [
      { e: '🎯', b: 'План «' + goal.name + '»', s: 'фразы, которые нужны в ' + goal.scen },
      { e: '📍', b: 'Старт: ' + (LEVEL_META[a.level] || LEVEL_META.understand), s: '' },
      { e: '⏱️', b: minutes + ' минут в день', s: 'короткие уроки: фразы, произношение, карточки' },
      { e: '🎙️', b: a.speak === 'yes' ? 'Речь — наедине с телефоном' : 'Речь — с первого дня', s: 'произношение оценивается на устройстве, голос никуда не уходит' },
      { e: '🛡️', b: a.pain === 'quit' ? 'Серия и лиги против «брошу»' : 'Умные повторения против забывания', s: 'механики, ради которых возвращаются каждый день' },
    ];
  }

  function renderResult() {
    var rows = planSummaryRows().map(function (r) {
      return h('div', { class: 'qplan-row' }, [
        h('span', { class: 'qemoji' }, [r.e]),
        h('span', {}, [h('b', {}, [r.b]), r.s ? h('span', {}, [' — ' + r.s]) : null]),
      ]);
    });
    return h('div', { class: 'qscreen' }, [
      h('p', { class: 'kicker' }, ['Готово']),
      h('h1', {}, ['Ваш план ', h('span', { class: 'gold-accent' }, ['собран'])]),
      h('p', { class: 'sub' }, ['Вот что мы подобрали по вашим ответам:']),
      h('div', { class: 'qplan-card' }, [
        h('div', { class: 'qplan-tag' }, ['Персональный план']),
        h('h2', {}, ['Phraseman · ' + (GOAL_META[(state.answers.goal)] || GOAL_META.self).name]),
        h('div', { class: 'qplan-rows' }, rows),
      ]),
      h('button', {
        class: 'btn-gold', type: 'button',
        onclick: function () { go(state.step + 1); },
      }, ['Открыть доступ к плану →']),
      backButton(),
    ]);
  }

  /* ───────── пейвол ───────── */

  function prices() {
    var p = cfg().webPrices || {};
    return {
      monthly: p.monthly || { amount: 9.99, label: '$9.99' },
      yearly: p.yearly || { amount: 49.99, label: '$49.99', perMonth: '$4.17' },
      lifetime: p.lifetime || { amount: 99.99, label: '$99.99' },
    };
  }

  var paywallState = { plan: 'yearly', busy: false };

  function showError(msg) {
    var box = document.getElementById('qpay-error');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
  }

  function clearError() {
    var box = document.getElementById('qpay-error');
    if (box) box.classList.remove('show');
  }

  function selectedEmail() {
    var input = document.getElementById('qpay-email');
    var email = String((input && input.value) || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
    return email;
  }

  function checkoutPayload(provider) {
    var nick = document.getElementById('qpay-nick');
    return {
      provider: provider,
      plan: paywallState.plan,
      email: selectedEmail(),
      nickname: String((nick && nick.value) || '').trim().slice(0, 60),
      utm: readUtm(),
      answers: state.answers,
      page: location.pathname,
    };
  }

  function startCardCheckout() {
    if (paywallState.busy) return;
    clearError();
    var email = selectedEmail();
    if (!email) { showError('Укажите email — на него придёт чек и подтверждение активации.'); return; }
    var endpoint = cfg().checkoutEndpoint;
    if (!endpoint) { showError('Оплата картой пока подключается. Напишите нам через страницу поддержки — активируем вручную.'); return; }
    paywallState.busy = true;
    var btn = document.getElementById('qpay-card-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Открываем оплату…'; }
    track('checkout_click');
    fbq('track', 'InitiateCheckout');
    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(checkoutPayload('stripe')),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.url) { location.href = data.url; return; }
        throw new Error((data && data.error) || 'checkout_failed');
      })
      .catch(function () {
        paywallState.busy = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Оплатить картой'; }
        showError('Не получилось открыть оплату. Попробуйте ещё раз или напишите в поддержку.');
      });
  }

  function mountPaypal() {
    var clientId = cfg().paypalClientId;
    var container = document.getElementById('paypal-buttons');
    if (!clientId || !container) return;
    var endpointCreate = cfg().paypalCreateEndpoint;
    var endpointCapture = cfg().paypalCaptureEndpoint;
    if (!endpointCreate || !endpointCapture) return;

    function renderButtons() {
      if (!window.paypal || !window.paypal.Buttons) return;
      window.paypal.Buttons({
        style: { layout: 'horizontal', color: 'gold', shape: 'pill', label: 'paypal', height: 44, tagline: false },
        onClick: function (_data, actions) {
          clearError();
          if (!selectedEmail()) {
            showError('Укажите email — на него придёт подтверждение активации.');
            return actions.reject();
          }
          track('checkout_click');
          fbq('track', 'InitiateCheckout');
          return actions.resolve();
        },
        createOrder: function () {
          return fetch(endpointCreate, { method: 'POST', body: JSON.stringify(checkoutPayload('paypal')) })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data && data.ok && data.orderId) return data.orderId;
              throw new Error('paypal_create_failed');
            });
        },
        onApprove: function (data) {
          return fetch(endpointCapture, { method: 'POST', body: JSON.stringify({ orderId: data.orderID }) })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              if (res && res.ok) { location.href = '/start/thanks/?provider=paypal'; return; }
              throw new Error('paypal_capture_failed');
            });
        },
        onError: function () {
          showError('PayPal не ответил. Попробуйте карту или напишите в поддержку.');
        },
      }).render('#paypal-buttons');
    }

    if (window.paypal) { renderButtons(); return; }
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(clientId) + '&currency=USD&intent=capture&components=buttons';
    s.async = true;
    s.onload = renderButtons;
    document.head.appendChild(s);
  }

  function planOption(key, name, sub, priceLabel, priceSub, badge) {
    var opt = h('label', { class: 'qplan-opt' + (paywallState.plan === key ? ' selected' : '') }, [
      badge ? h('span', { class: 'qplan-badge' }, [badge]) : null,
      h('input', { type: 'radio', name: 'plan', value: key }),
      h('span', { class: 'qplan-name' }, [name, h('small', {}, [sub])]),
      h('span', { class: 'qplan-price' }, [h('b', {}, [priceLabel]), priceSub ? h('small', {}, [priceSub]) : null]),
    ]);
    opt.addEventListener('click', function () {
      paywallState.plan = key;
      document.querySelectorAll('.qplan-opt').forEach(function (el) { el.classList.remove('selected'); });
      opt.classList.add('selected');
    });
    return opt;
  }

  function renderPaywall() {
    var p = prices();
    setTimeout(function () {
      track('paywall_view');
      mountPaypal();
    }, 0);
    return h('div', { class: 'qscreen' }, [
      h('p', { class: 'kicker' }, ['Последний шаг']),
      h('h1', {}, ['Откройте свой план ', h('span', { class: 'gold-accent' }, ['целиком'])]),
      h('p', { class: 'sub' }, ['Premium открывает все планы и темы, снимает лимиты энергии и включает ИИ-диалоги с разбором ваших ошибок.']),
      h('div', { class: 'qplans' }, [
        planOption('monthly', 'Месяц', 'попробовать в своём темпе', p.monthly.label, 'в месяц', null),
        planOption('yearly', 'Год', 'самый популярный выбор', p.yearly.label, p.yearly.perMonth ? '≈ ' + p.yearly.perMonth + '/мес' : 'в год', 'Выгоднее 58%'),
        planOption('lifetime', 'Навсегда', 'один платёж — доступ навсегда', p.lifetime.label, 'один раз', null),
      ]),
      h('div', { class: 'qpay-fields' }, [
        h('div', { class: 'field' }, [
          h('label', { for: 'qpay-email' }, ['Email — для чека и активации']),
          h('input', { id: 'qpay-email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' }),
        ]),
        h('div', { class: 'field' }, [
          h('label', { for: 'qpay-nick' }, ['Ник в приложении (если уже установили — необязательно)']),
          h('input', { id: 'qpay-nick', type: 'text', placeholder: 'например, Maks_42' }),
        ]),
      ]),
      h('div', { class: 'qpay-buttons' }, [
        h('button', { class: 'btn-gold', type: 'button', id: 'qpay-card-btn', onclick: startCardCheckout }, ['Оплатить картой']),
        h('div', { id: 'paypal-buttons' }),
      ]),
      h('div', { class: 'qerr', id: 'qpay-error', role: 'alert' }),
      h('p', { class: 'qpay-alt' }, [
        'Карта российского банка? ',
        h('a', { href: '/russia/' }, ['Оплата через Telegram →']),
      ]),
      h('div', { class: 'qguarantee' }, [
        h('span', {}, ['🛡️']),
        h('span', {}, ['7 дней гарантии: не подойдёт — вернём деньги без вопросов. Просто напишите в поддержку.']),
      ]),
      h('p', { class: 'qsecure' }, ['Оплата проходит на защищённых страницах Stripe / PayPal. Мы не видим и не храним данные карты.']),
      h('div', { class: 'qfaq-mini' }, [
        h('details', {}, [h('summary', {}, ['Как активируется Premium?']), h('p', {}, ['После оплаты мы привязываем Premium к вашему аккаунту вручную — обычно в течение пары часов. Напишем на email, когда всё готово. Если приложения ещё нет — установите его, ссылки пришлём в письме.'])]),
        h('details', {}, [h('summary', {}, ['На каких устройствах работает?']), h('p', {}, ['На всех, где вы вошли в свой аккаунт Phraseman: iPhone, iPad и Android.'])]),
        h('details', {}, [h('summary', {}, ['Можно ли отменить?']), h('p', {}, ['Да. Месячный и годовой планы можно не продлевать, а в первые 7 дней вернём оплату полностью.'])]),
      ]),
      backButton(),
    ]);
  }

  function render() {
    if (!root) return;
    var step = QUIZ[Math.min(state.step, QUIZ.length - 1)];
    setProgress();
    root.innerHTML = '';
    var screen =
      step.type === 'intro' ? renderIntro()
        : step.type === 'q' ? renderQuestion(step)
          : step.type === 'proof' ? renderProof()
            : step.type === 'build' ? renderBuild()
              : step.type === 'result' ? renderResult()
                : renderPaywall();
    root.appendChild(screen);
  }

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('quiz-root');
    captureUtm();
    initMetaPixel();
    /* «строим план» не должен продолжаться после reload с середины */
    if (QUIZ[state.step] && QUIZ[state.step].id === 'build') {
      saveState({ step: state.step + 1, answers: state.answers });
    }
    render();
  });
})();
