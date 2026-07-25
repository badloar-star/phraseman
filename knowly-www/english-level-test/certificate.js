/**
 * English Level Test — Certificate Generator v2
 * Multiple themes, animations, full-screen certificate page.
 */
(function (global) {
  'use strict';

  const CERT_WIDTH = 1100;
  const CERT_HEIGHT = 780;

  const THEMES = {
    gold: {
      name: 'Gold',
      bg: '#faf8f3',
      border: '#b8941d',
      border2: '#e8d5a3',
      title: '#1a1a1a',
      text: '#333333',
      accent: '#c9a96e',
      level: '#1a1a1a',
      ribbon: '#c9a96e',
    },
    dark: {
      name: 'Midnight',
      bg: '#0a0f1c',
      border: '#475569',
      border2: '#1e293b',
      title: '#ffffff',
      text: '#cbd5e1',
      accent: '#38bdf8',
      level: '#7dd3fc',
      ribbon: '#38bdf8',
    },
    emerald: {
      name: 'Emerald',
      bg: '#ecfdf5',
      border: '#16a34a',
      border2: '#bbf7d0',
      title: '#064e3b',
      text: '#065f46',
      accent: '#22c55e',
      level: '#064e3b',
      ribbon: '#22c55e',
    },
    rose: {
      name: 'Rose',
      bg: '#fff1f2',
      border: '#e11d48',
      border2: '#fecdd3',
      title: '#881337',
      text: '#9f1239',
      accent: '#f43f5e',
      level: '#881337',
      ribbon: '#f43f5e',
    },
    royal: {
      name: 'Royal',
      bg: '#1e1b4b',
      border: '#818cf8',
      border2: '#312e81',
      title: '#ffffff',
      text: '#c7d2fe',
      accent: '#818cf8',
      level: '#e0e7ff',
      ribbon: '#6366f1',
    },
  };

  // зачем: владелец потребовал выбор языка сертификата — либо ВСЁ на английском
  // (включая дату), либо ВСЁ на русском; раньше дата была ru-RU на англ. тексте.
  const LANGS = {
    en: {
      label: 'English',
      dateLocale: 'en-GB',
      title: 'Certificate of Completion',
      certifies: 'This certifies that',
      completed: 'completed the Phraseman English Level Check',
      received: 'and received an estimated CEFR level of',
      summary: (correct, answered) => `Preliminary text-based assessment · ${correct}/${answered} correct`,
      informal: 'This is an informal assessment. It is not an accredited language qualification.',
    },
    ru: {
      label: 'Русский',
      dateLocale: 'ru-RU',
      title: 'Сертификат',
      certifies: 'Настоящий сертификат выдан',
      completed: 'за прохождение проверки уровня английского Phraseman',
      received: 'с предварительной оценкой по шкале CEFR',
      summary: (correct, answered) => `Предварительная текстовая оценка · ${correct}/${answered} верно`,
      informal: 'Это неофициальная оценка, а не аккредитованная языковая квалификация.',
    },
  };

  let currentTheme = 'gold';
  let currentLang = 'en';

  function isAppleMobile() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9\u0400-\u04FF\-]/g, '_').slice(0, 40);
  }

  function buildSvg(data, themeKey, langKey) {
    const { name, result } = data;
    const t = THEMES[themeKey] || THEMES.gold;
    const L = LANGS[langKey] || LANGS.en;
    const dateStr = new Date().toLocaleDateString(L.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
    const cx = CERT_WIDTH / 2;

    return `<svg viewBox="0 0 ${CERT_WIDTH} ${CERT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${t.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${t.border2};stop-opacity:0.35" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgGrad)"/>
      <rect x="32" y="32" width="${CERT_WIDTH - 64}" height="${CERT_HEIGHT - 64}" fill="none" stroke="${t.border}" stroke-width="3" rx="10"/>
      <rect x="48" y="48" width="${CERT_WIDTH - 96}" height="${CERT_HEIGHT - 96}" fill="none" stroke="${t.border2}" stroke-width="1.5" rx="6"/>

      <rect x="${cx - 120}" y="58" width="240" height="5" fill="${t.ribbon}" rx="2.5"/>

      <text x="${cx}" y="155" text-anchor="middle" font-family="Georgia,serif" font-size="40" fill="${t.title}" font-weight="bold">${escapeXml(L.title)}</text>
      <text x="${cx}" y="210" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="${t.text}">${escapeXml(L.certifies)}</text>
      <text x="${cx}" y="295" text-anchor="middle" font-family="Georgia,serif" font-size="50" fill="${t.title}" font-weight="bold">${escapeXml(name)}</text>
      <line x1="300" y1="320" x2="${CERT_WIDTH - 300}" y2="320" stroke="${t.border}" stroke-width="2"/>
      <text x="${cx}" y="370" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="${t.text}">${escapeXml(L.completed)}</text>
      <text x="${cx}" y="410" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="${t.text}">${escapeXml(L.received)}</text>
      <text x="${cx}" y="500" text-anchor="middle" font-family="Georgia,serif" font-size="72" fill="${t.level}" font-weight="bold">${escapeXml(result.estimatedLevel)}</text>
      <text x="${cx}" y="550" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="${t.text}">${escapeXml(L.summary(result.correct, result.answered))}</text>

      <rect x="${cx - 120}" y="590" width="240" height="5" fill="${t.ribbon}" rx="2.5"/>

      <text x="${cx}" y="650" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="${t.text}" font-weight="600">${escapeXml(dateStr)}</text>
      <text x="${cx}" y="690" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${t.text}">
        ${escapeXml(L.informal)}
      </text>
      <text x="${cx}" y="715" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${t.text}">
        knowlyapps.com/english-level-test/
      </text>
    </svg>`;
  }

  function createConfetti(container) {
    const colors = ['#22c55e', '#38bdf8', '#f43f5e', '#fbbf24', '#a78bfa', '#34d399'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position: absolute;
        width: ${6 + Math.random() * 8}px;
        height: ${6 + Math.random() * 8}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        left: ${Math.random() * 100}%;
        top: -20px;
        opacity: 0;
        pointer-events: none;
        z-index: 1001;
      `;
      container.appendChild(el);
      const duration = 1500 + Math.random() * 2000;
      const delay = Math.random() * 800;
      el.animate([
        { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
        { transform: `translateY(${400 + Math.random() * 300}px) rotate(${360 + Math.random() * 720}deg)`, opacity: 0 }
      ], { duration, delay, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' });
    }
  }

  function renderCertificate(data) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previouslyFocused = document.activeElement;
    const container = document.createElement('div');
    container.className = 'elt-cert-modal';
    container.innerHTML = `
      <div class="elt-cert-backdrop"></div>
      <div class="elt-cert-container" role="dialog" aria-modal="true" aria-label="Сертификат результата">
        <button class="elt-cert-close" type="button" aria-label="Закрыть">&times;</button>

        <div class="elt-cert-langs" role="group" aria-label="Язык сертификата">
          ${Object.entries(LANGS).map(([key, lang]) => `
            <button class="elt-cert-lang-btn${key === currentLang ? ' active' : ''}" data-lang="${key}" type="button">${lang.label}</button>
          `).join('')}
        </div>

        <div class="elt-cert-themes">
          ${Object.entries(THEMES).map(([key, t]) => `
            <button class="elt-cert-theme-btn${key === currentTheme ? ' active' : ''}" data-theme="${key}" style="--theme-color:${t.ribbon}" title="${t.name}">
              <span class="elt-cert-theme-swatch" style="background:${t.ribbon}"></span>
              <span class="elt-cert-theme-name">${t.name}</span>
            </button>
          `).join('')}
        </div>

        <div class="elt-cert-wrap" id="certRenderArea">
          ${buildSvg(data, currentTheme, currentLang)}
        </div>

        ${data.cta ? `
        <div class="elt-cert-cta">
          <p class="elt-cert-cta-text">${escapeXml(data.cta.text)}</p>
          <button class="elt-btn elt-btn-primary elt-cert-cta-btn" id="certCtaBtn">${escapeXml(data.cta.label)}</button>
        </div>` : ''}

        <div class="elt-cert-actions">
          <button class="elt-btn elt-btn-primary" id="certDownloadPng">Скачать PNG</button>
          <button class="elt-btn elt-btn-secondary" id="certPrint">Печать / PDF</button>
          <button class="elt-btn elt-btn-ghost" id="certClose">Закрыть</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    let savePreviewUrl = null;
    let saveGeneration = 0;
    let saveInProgress = false;
    let closed = false;
    if (!reducedMotion) createConfetti(container);

    const closeButton = container.querySelector('.elt-cert-close');
    closeButton.focus();

    function handleModalKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = [...container.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleModalKeydown);

    function clearSavePreview() {
      saveGeneration++;
      container.querySelector('.elt-cert-save-link')?.remove();
      container.querySelector('.elt-cert-save-hint')?.remove();
      // PNG подменял SVG на месте — возвращаем SVG, чтобы повторное скачивание/печать работали.
      const svg = container.querySelector('#certRenderArea svg');
      if (svg) svg.style.display = '';
      if (savePreviewUrl) {
        URL.revokeObjectURL(savePreviewUrl);
        savePreviewUrl = null;
      }
    }

    function rebuildCertArea() {
      const area = container.querySelector('#certRenderArea');
      area.innerHTML = buildSvg(data, currentTheme, currentLang);
      if (!reducedMotion) {
        area.animate([
          { opacity: 0.5, transform: 'scale(0.98)' },
          { opacity: 1, transform: 'scale(1)' }
        ], { duration: 300, easing: 'ease-out' });
      }
    }

    const inner = container.querySelector('.elt-cert-container');
    if (reducedMotion) {
      inner.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, fill: 'forwards' });
    } else {
      inner.animate([
        { transform: 'perspective(1400px) rotateY(-24deg) scale(0.88)', opacity: 0 },
        { transform: 'perspective(1400px) rotateY(5deg) scale(1.01)', opacity: 1, offset: 0.72 },
        { transform: 'perspective(1400px) rotateY(0deg) scale(1)', opacity: 1 }
      ], { duration: 680, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
    }

    container.querySelectorAll('.elt-cert-theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.theme === currentTheme) return;
        clearSavePreview();
        currentTheme = btn.dataset.theme;
        container.querySelectorAll('.elt-cert-theme-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        rebuildCertArea();
      });
    });

    container.querySelectorAll('.elt-cert-lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.lang === currentLang) return;
        clearSavePreview();
        currentLang = btn.dataset.lang;
        container.querySelectorAll('.elt-cert-lang-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        rebuildCertArea();
      });
    });

    closeButton.addEventListener('click', close);
    container.querySelector('.elt-cert-backdrop').addEventListener('click', close);
    container.querySelector('#certClose').addEventListener('click', close);
    const downloadButton = container.querySelector('#certDownloadPng');
    downloadButton.addEventListener('click', async () => {
      if (saveInProgress || closed) return;
      clearSavePreview();
      const generation = saveGeneration;
      const themeKey = currentTheme;
      saveInProgress = true;
      downloadButton.disabled = true;
      downloadButton.setAttribute('aria-busy', 'true');
      try {
        savePreviewUrl = await downloadPng(
          data.name,
          data.result,
          container,
          themeKey,
          () => closed || generation !== saveGeneration,
        );
      } finally {
        saveInProgress = false;
        if (!closed) {
          downloadButton.disabled = false;
          downloadButton.removeAttribute('aria-busy');
        }
      }
    });
    // Печатаем свежесобранный SVG, а не innerHTML области: после iOS-сохранения
    // там лежит PNG-подмена с подсказкой, которые в печать попадать не должны.
    container.querySelector('#certPrint').addEventListener('click', () => printCert(buildSvg(data, currentTheme, currentLang)));

    const ctaBtn = container.querySelector('#certCtaBtn');
    if (data.cta && ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        if (typeof data.cta.onClick === 'function') data.cta.onClick();
        const win = window.open(data.cta.url, '_blank', 'noopener');
        if (!win) {
          window.location.href = data.cta.url;
        } else {
          close();
        }
      });
    }

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', handleModalKeydown);
      clearSavePreview();
      inner.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.92)', opacity: 0 }
      ], { duration: reducedMotion ? 60 : 250, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
        container.remove();
        if (previouslyFocused?.isConnected) previouslyFocused.focus();
        if (typeof data.onClose === 'function') data.onClose();
      };
    }
  }

  async function svgToPng(svgEl) {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    canvas.width = CERT_WIDTH * 2;
    canvas.height = CERT_HEIGHT * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CERT_WIDTH, CERT_HEIGHT);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      img.src = url;
    });
  }

  function showIosSavePreview(container, pngBlob, filename) {
    // зачем: владелец спросил «почему отдельно» — вторая копия сертификата ниже
    // сбивала с толку. Теперь PNG подменяет SVG НА МЕСТЕ: удерживать нужно ту же
    // картинку, которую пользователь уже видит, а подсказка появляется под ней.
    const objectUrl = URL.createObjectURL(pngBlob);
    const wrap = container.querySelector('#certRenderArea');
    const svg = wrap.querySelector('svg');
    if (svg) svg.style.display = 'none';
    const link = document.createElement('a');
    link.className = 'elt-cert-save-link';
    link.download = filename;
    link.href = objectUrl;
    const img = document.createElement('img');
    img.alt = 'Готовый сертификат — нажмите и удерживайте, чтобы сохранить';
    img.src = objectUrl;
    link.appendChild(img);
    wrap.appendChild(link);
    const hint = document.createElement('p');
    hint.className = 'elt-cert-save-hint';
    hint.textContent = 'Нажмите и удерживайте сертификат, затем «Сохранить в Фото»';
    wrap.appendChild(hint);
    hint.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return objectUrl;
  }

  async function downloadPng(name, result, container, themeKey, isCancelled) {
    const svgEl = container.querySelector('#certRenderArea svg');
    if (!svgEl) return null;
    try {
      const canvas = await svgToPng(svgEl);
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG generation returned an empty blob'));
        }, 'image/png');
      });
      if (isCancelled()) return null;
      const filename = `phraseman-english-level-${result.estimatedLevel}-${sanitizeFilename(name)}-${themeKey}.png`;
      if (isAppleMobile()) {
        return showIosSavePreview(container, pngBlob, filename);
      }

      const link = document.createElement('a');
      link.download = filename;
      link.href = URL.createObjectURL(pngBlob);
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      return null;
    } catch (e) {
      if (!isCancelled()) alert('Не удалось создать PNG. Попробуйте функцию печати.');
      return null;
    }
  }

  function printCert(svgMarkup) {
    if (!svgMarkup) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Сертификат</title>
          <style>
            @media print {
              body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .cert-box { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; }
            }
            body { font-family: Georgia, serif; background: #fff; }
            .cert-box { padding: 20px; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            ${svgMarkup}
          </div>
          <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  global.EnglishTestCertificate = {
    show: renderCertificate,
    themes: THEMES,
  };
})(typeof window !== 'undefined' ? window : globalThis);
