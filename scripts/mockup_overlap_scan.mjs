#!/usr/bin/env node
/**
 * Сканер наложений в макетах: находит телефоны, где один текст/значок лежит поверх другого (владелец 04.10: «такого нигде не должно быть»).
 *
 * зачем: пример — «Ничего не найдено» в cards-v2: блок .empty (position:absolute; top:50%) считался от короткого .in (у него will-change:transform
 * делает его опорным блоком), поэтому крупный заголовок и кнопка налезали на поиск и фильтры. Глазами 800+ телефонов не пересмотреть — это делает скрипт.
 *
 * Что считается наложением: пересечение рамок двух «листьев» (элемент с собственным текстом или значок), которые не вложены друг в друга:
 * площадь пересечения > 40 px² и > 25 % меньшей рамки. Намеренные слои исключены: шторки/подложки, тосты, окна, закреплённый низ (.bot),
 * статус-бар (.sb), полоска «домой» (.hi), метки внутри кнопок и каретка ввода.
 *
 * Запуск: node scripts/mockup_overlap_scan.mjs [страница ...] [--json] (по умолчанию все страницы docs/design/v2-app/*.html, кроме служебных)
 * Нужен сервер макетов http://127.0.0.1:8765. Код выхода 1, если найдены наложения. Логи: [OVERLAP-SCAN].
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/design/v2-app');
const SERVER = process.env.PARITY_MOCKUP_SERVER || 'http://127.0.0.1:8765';
const LOG = '[OVERLAP-SCAN]';
const SKIP_PAGES = new Set(['index', 'etalon', 'nul']);

export const SCAN_SOURCE = `(() => {
  const IGNORE = '.sheet, .dim, .toast, .modal, .bot, .sb, .hi, .caret, .mk, [data-sheet], [data-dim], .plus10, .fab, .lbl, .face.back';
  const visible = (el, r) => r.width >= 2 && r.height >= 2 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0';
  const out = [];
  document.querySelectorAll('.col').forEach((col, index) => {
    const ph = col.querySelector('.ph');
    if (!ph) return;
    const box = ph.getBoundingClientRect();
    const leaves = [];
    for (const el of ph.querySelectorAll('.scr *')) {
      if (el.closest(IGNORE)) continue;
      // зачем: грани переворачиваемых карточек (backface-visibility:hidden) лежат друг на друге по построению — их не сканируем (известное слепое пятно)
      let flipped = false;
      for (let a = el; a && a !== ph; a = a.parentElement) { if (getComputedStyle(a).backfaceVisibility === 'hidden') { flipped = true; break; } }
      if (flipped) continue;
      // зачем: обрезанный многоточием текст (line-clamp) считаем по видимой части — скрытые строки не наложение
      if (getComputedStyle(el).webkitLineClamp && getComputedStyle(el).webkitLineClamp !== 'none') continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      const isIcon = el.tagName.toLowerCase() === 'svg' && el.classList.contains('i');
      if (!own && !isIcon) continue;
      let r = el.getBoundingClientRect();
      if (!visible(el, r)) continue;
      // зачем: у блочного элемента рамка тянется на всю ширину, а видимый текст короче — для текста берём рамку самих строк (Range), иначе ложные срабатывания
      if (own) {
        // только собственные текстовые узлы (потомки-значки в рамку текста не входят)
        const rects = [];
        for (const node of el.childNodes) {
          if (node.nodeType !== 3 || !node.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          rects.push(...[...range.getClientRects()].filter((q) => q.width > 1 && q.height > 1));
        }
        if (rects.length) {
          const left = Math.min(...rects.map((q) => q.left)); const top = Math.min(...rects.map((q) => q.top));
          const right = Math.max(...rects.map((q) => q.right)); const bottom = Math.max(...rects.map((q) => q.bottom));
          r = { left, top, right, bottom, width: right - left, height: bottom - top };
        }
      }
      // за пределами экрана телефона (прокрутка) не считаем
      if (r.bottom < box.top || r.top > box.bottom || r.right < box.left || r.left > box.right) continue;
      leaves.push({ el, r, text: own ? el.textContent.trim().slice(0, 40) : '(значок)' });
    }
    const hits = [];
    for (let i = 0; i < leaves.length; i += 1) {
      for (let j = i + 1; j < leaves.length; j += 1) {
        const a = leaves[i]; const b = leaves[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w <= 0 || h <= 0) continue;
        const area = w * h; const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
        if (area > 40 && area / small > 0.25) hits.push({ a: a.text, b: b.text, area: Math.round(area) });
      }
    }
    if (hits.length) out.push({ phone: index + 1, label: (col.querySelector('.lbl')?.childNodes[0]?.textContent || '').trim().slice(0, 70), hits: hits.slice(0, 6), total: hits.length });
  });
  return out;
})()`;

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const pages = args.length ? args : fs.readdirSync(DIR).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')).filter((n) => !SKIP_PAGES.has(n));
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const report = {};
  for (const name of pages) {
    const response = await page.goto(`${SERVER}/${name}.html`, { waitUntil: 'load' }).catch(() => null);
    if (!response || response.status() !== 200) { console.warn(`${LOG} no_page ${name}`); continue; }
    await page.waitForTimeout(500);
    report[name] = await page.evaluate(SCAN_SOURCE);
    const phones = await page.locator('.col').count();
    console.log(`${LOG} ${name}: телефонов=${phones} с наложением=${report[name].length}`);
  }
  await browser.close();
  const bad = Object.entries(report).flatMap(([name, list]) => list.map((item) => ({ page: name, ...item })));
  if (process.argv.includes('--json')) console.log(JSON.stringify(bad, null, 2));
  else for (const item of bad) console.log(`${LOG}   ${item.page} #${item.phone} «${item.label}» (${item.total}): ${item.hits.map((h) => `${h.a} × ${h.b}`).slice(0, 3).join(' | ')}`);
  console.log(`${LOG} итого телефонов с наложением: ${bad.length}`);
  process.exitCode = bad.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(`${LOG} FAILED ${e instanceof Error ? e.stack : e}`); process.exit(1); });
