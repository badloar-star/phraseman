/* Демо произношения на главной (#try): фраза → микрофон → оценка по совпадению
   слов. Работает через SpeechRecognition браузера (Chrome/Edge/Safari новые);
   если API нет — секция остаётся скрытой, страница ничем не отличается.
   Это витрина механики, не движок приложения: в приложении распознавание
   работает на устройстве (дисклеймер прямо в секции). */
(function () {
  'use strict';

  var section = document.getElementById('try');
  if (!section) return;

  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;

  /* Микрофон бывает недоступен (нет устройства/страница без HTTPS) — не показываем демо. */
  if (!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')) return;

  var TARGET = 'Could I get a coffee, please?';

  function track(type) {
    try {
      var cfg = window.KNOWLY_SITE || {};
      if (!cfg.statsEndpoint) return;
      var body = JSON.stringify({ type: type, page: '/' });
      if (navigator.sendBeacon && navigator.sendBeacon(cfg.statsEndpoint, body)) return;
      fetch(cfg.statsEndpoint, { method: 'POST', body: body, keepalive: true }).catch(function () {});
    } catch (_) { /* noop */ }
  }

  function words(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z' ]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function scoreAgainstTarget(heard) {
    var target = words(TARGET);
    var got = words(heard);
    if (target.length === 0) return 0;
    var used = {};
    var matched = 0;
    target.forEach(function (w) {
      for (var i = 0; i < got.length; i += 1) {
        if (!used[i] && got[i] === w) {
          used[i] = true;
          matched += 1;
          return;
        }
      }
    });
    return matched / target.length;
  }

  var mic = document.getElementById('demo-mic');
  var status = document.getElementById('demo-status');
  var cta = document.getElementById('demo-cta');
  if (!mic || !status || !cta) return;

  var busy = false;

  function setStatus(text, tone) {
    status.textContent = text;
    status.className = 'demo-status' + (tone ? ' demo-status-' + tone : '');
  }

  function finish(verdict, tone) {
    busy = false;
    mic.disabled = false;
    mic.textContent = '🎙️ Сказать ещё раз';
    setStatus(verdict, tone);
    cta.hidden = false;
  }

  mic.addEventListener('click', function () {
    if (busy) return;
    busy = true;
    mic.disabled = true;
    mic.textContent = 'Слушаем…';
    setStatus('Скажите фразу целиком — не спешите.', null);
    track('demo_start');

    var rec;
    try {
      rec = new Recognition();
    } catch (_) {
      finish('Не получилось включить микрофон в этом браузере. В приложении всё работает — попробуйте там.', 'warn');
      return;
    }
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    var done = false;

    rec.onresult = function (event) {
      done = true;
      var best = 0;
      try {
        var alternatives = event.results[0];
        for (var i = 0; i < alternatives.length; i += 1) {
          best = Math.max(best, scoreAgainstTarget(alternatives[i].transcript));
        }
      } catch (_) { /* noop */ }
      if (best >= 0.8) {
        track('demo_success');
        finish('Отлично! Вас поняли с первого раза — а говорили, что «понимаю, но не говорю». 🎉', 'good');
      } else if (best >= 0.5) {
        track('demo_partial');
        finish('Почти! Большую часть фразы вы сказали чисто. Пара повторов — и будет идеально.', 'good');
      } else {
        finish('Не расслышали. Попробуйте ближе к микрофону и чуть медленнее — это нормально с первого раза.', 'warn');
      }
    };

    rec.onerror = function (event) {
      if (done) return;
      done = true;
      var code = event && event.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        finish('Браузер не дал доступ к микрофону. Разрешите доступ — или просто попробуйте в приложении.', 'warn');
      } else if (code === 'no-speech') {
        finish('Тишина в эфире 🙂 Нажмите ещё раз и скажите фразу вслух.', 'warn');
      } else {
        finish('Распознавание не ответило. Такое бывает — в приложении механика работает надёжнее.', 'warn');
      }
    };

    rec.onend = function () {
      if (!done) {
        done = true;
        finish('Тишина в эфире 🙂 Нажмите ещё раз и скажите фразу вслух.', 'warn');
      }
    };

    try {
      rec.start();
    } catch (_) {
      finish('Не получилось включить микрофон. Попробуйте ещё раз или сразу в приложении.', 'warn');
    }
  });

  section.hidden = false;
})();
