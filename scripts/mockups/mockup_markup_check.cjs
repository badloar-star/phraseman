// зачем (координатор 14.10, после b52e69302): лишний </div> в подложке Главной вытолкнул «Повторить» из 32 вариантов —
// поймали только по кадрам эталонов. Валидатор запускается ПЕРЕД каждым коммитом образцов: ненулевой итог = не коммитим.
// Проверяет: 1) баланс парных тегов в статической разметке страницы (без <script>/<style>);
// 2) баланс в каждой подложке EMA.*Under / plusSheet; 3) баланс в телефоне каждого варианта (EM.phone(v.phone));
// 4) все зарегистрированные варианты есть в DOM; 5) у каждого [data-vid] кнопка «Повторить» внутри; 6) JS-ошибки страницы.
// usage (из корня репозитория, сервер образцов уже поднят):
//   python -m http.server 8765 --bind 127.0.0.1   (в docs/design/v2-app)
//   node scripts/mockups/mockup_markup_check.cjs [страница.html ...]      MOCKUP_URL — другой адрес сервера
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const DIR = path.join(__dirname, '..', '..', 'docs', 'design', 'v2-app') + path.sep;
const BASE = (process.env.MOCKUP_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['engagement-moments-v3-all.html', 'engagement-moments-v3-a.html', 'engagement-moments-v3-b.html', 'engagement-moments-v3-c.html', 'stories-avatar.html', 'streak-milestones.html', 'rings-flame-lab.html', 'account-progress-proposal.html', 'learning-v2-voice-limit.html'];
const TAGS = ['div', 'span', 'section', 'button', 'b', 'p', 'a', 'ol', 'ul', 'li', 'svg', 'g'];
const balance = (s) => { const out = {}; for (const t of TAGS) { const d = (s.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length - (s.match(new RegExp(`</${t}>`, 'g')) || []).length; if (d) out[t] = d; } return out; };
(async () => { const br = await chromium.launch(); let bad = 0;
  for (const f of PAGES) {
    if (!fs.existsSync(DIR + f)) { console.log(`[MARKUP-CHECK] ${f}: файла нет — пропуск`); continue; }
    const src = fs.readFileSync(DIR + f, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const stat = balance(src);
    const pg = await br.newPage({ viewport: { width: 1400, height: 1100 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
    // зачем (14.10): «load» ждёт все звуки/картинки и на занятом сервере образцов падал по таймауту 30 с — проверка вылетала, а коммит проходил.
    // Ждём DOM и готовый EM, две попытки; не загрузилась — это ОШИБКА проверки (не молчаливый пропуск).
    let loaded = false; for (let k = 0; k < 2 && !loaded; k++) { try { await pg.goto(BASE + f + '?v=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 }); await pg.waitForFunction(() => document.readyState !== 'loading' && (window.EM || !document.querySelector('script[src*="engagement-moments"]')), null, { timeout: 30000 }); loaded = true; } catch (e) { console.log(`[MARKUP-CHECK] ${f}: попытка ${k + 1} не загрузилась — ${e.message.split(String.fromCharCode(10))[0]}`); } }
    if (!loaded) { bad++; console.log(`[MARKUP-CHECK] ${f}: страница не загрузилась → ОШИБКА`); await pg.close(); continue; }
    await pg.waitForTimeout(1200);
    const r = await pg.evaluate((TAGS) => {
      const balance = (s) => { const out = {}; for (const t of TAGS) { const d = (s.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length - (s.match(new RegExp(`</${t}>`, 'g')) || []).length; if (d) out[t] = d; } return out; };
      const under = {}; if (window.EMA) for (const k of Object.keys(EMA).filter((k) => /Under$|^plusSheet$/.test(k))) { try { const b = balance(EMA[k]({})); if (Object.keys(b).length) under[k] = b; } catch (e) { under[k] = 'ERR ' + e.message.slice(0, 60); } }
      if (!window.EM) return { noEM: true, under };
      const reg = EM.MOMENTS.flatMap((m) => m.variants.map((v, j) => ({ vid: `${m.id}-${v.k || j}`, phone: v.phone })));
      const vars = {}; for (const x of reg) { try { const b = balance(EM.phone(x.phone || {})); if (Object.keys(b).length) vars[x.vid] = b; } catch (e) { vars[x.vid] = 'ERR ' + e.message.slice(0, 60); } }
      const dom = [...document.querySelectorAll('[data-vid]')].map((x) => x.dataset.vid);
      const noReplay = [...document.querySelectorAll('[data-vid]')].filter((x) => !x.querySelector('[data-replay]')).map((x) => x.dataset.vid);
      return { under, vars, total: reg.length, missing: reg.map((x) => x.vid).filter((v) => !dom.includes(v)), noReplay };
    }, TAGS);
    const n = Object.keys(stat).length + Object.keys(r.under || {}).length + Object.keys(r.vars || {}).length + (r.missing || []).length + (r.noReplay || []).length + errs.length;
    bad += n;
    console.log(`[MARKUP-CHECK] ${f}: вариантов ${r.total ?? '—'} · тегов вне баланса (страница) ${JSON.stringify(stat)} · подложки ${JSON.stringify(r.under)} · варианты ${JSON.stringify(r.vars || {})} · нет в DOM ${(r.missing || []).join(',') || 0} · без «Повторить» ${(r.noReplay || []).join(',') || 0} · JS ${errs.length}${errs[0] ? ' ' + errs[0] : ''} → ${n ? 'ОШИБОК ' + n : 'ок'}`);
    await pg.close(); }
  await br.close(); console.log(`[MARKUP-CHECK] ИТОГ: ${bad ? 'ОШИБОК ' + bad + ' — коммит образцов НЕ делать' : 'ошибок 0'}`); process.exit(bad ? 1 : 0);
})();
