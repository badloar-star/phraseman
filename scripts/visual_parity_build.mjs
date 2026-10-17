#!/usr/bin/env node
/**
 * Строит/обновляет реестр визуального соответствия «приложение = макет» (docs/phraseman-2.0/registries/visual_parity.json).
 *
 * зачем (владелец 04.10, CLAUDE.md «ГЕЙТ: ПРИЛОЖЕНИЕ = МАКЕТ»): «все 758 экранов должны быть сверены с макетом в точности». По строке на каждую
 * строку STATE_CHECKLIST + экраны новых макетов (mistakes-v2, themes-gradient). Все строки стартуют pending: прежние ✅ ставились по коду
 * и не считаются. Статус match ставит ТОЛЬКО координатор после просмотра склейки (поле reviewed_by) — этот скрипт его не выставляет.
 *
 * Что берётся из макета: через playwright (сервер макетов http://127.0.0.1:8765) для каждого телефона .col — подпись, есть ли анимация
 * (keyframes или кнопка «повторить») с длительностями/кривыми, чтобы исполнитель сверял именно их. Соответствие «номер строки матрицы → телефон»
 * проверяется по подписи (mapping: label_match | label_mismatch | no_phone | no_page): номера матрицы и порядок телефонов в части страниц разошлись.
 *
 * Запуск: node scripts/visual_parity_build.mjs [--head]  (--head: брать матрицу из HEAD, а не из рабочего дерева)
 * Повторный запуск СОХРАНЯЕТ статусы, склейки, diffs и пометки ревью существующих строк; обновляет только описание макета/кода.
 * Логи: [PARITY-BUILD].
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[PARITY-BUILD]';
const SERVER = process.env.PARITY_MOCKUP_SERVER || 'http://127.0.0.1:8765';
const MATRIX = 'docs/phraseman-2.0/evidence/STATE_CHECKLIST_2026-09-30.md';
const REGISTRY = path.join(ROOT, 'docs/phraseman-2.0/registries/visual_parity.json');
const EXTRA_MOCKUPS = ['mistakes-panel', 'themes-gradient', 'cards-section', 'packs-simple']; // зачем: новые макеты 04.10; владелец одобрил cards-section (замена cards-v2) — старые строки cards-v2 уходят, новые стартуют pending без склеек
const SYMBOLS = ['✅', '🟠', '❌', '🏠', '➖'];

const useHead = process.argv.includes('--head');
// зачем (координатор 17.10): «сухой» прогон — посчитать потери строк и полей, ничего не записывая
const dryRun = process.argv.includes('--dry');

export function parseMatrix(text) {
  const rows = [];
  let section = '';
  for (const line of text.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      section = heading[1];
      continue;
    }
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    const symbol = SYMBOLS.find((s) => cells[4] && cells[4].startsWith(s));
    if (!symbol) continue;
    const rest = cells.slice(5).join(' | ');
    const files = [...new Set([...rest.matchAll(/`([^`*{}\s]+\.(?:tsx|ts|mjs|js))`/g)].map((m) => m[1]))].filter((f) => f.includes('/'));
    rows.push({ section, n: Number(cells[1]), screen: cells[2], state: cells[3], matrixStatus: symbol, files });
  }
  return rows;
}

const norm = (value) => String(value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function labelMapping(state, colLabel) {
  const a = new Set(norm(state).split(' ').filter((w) => w.length > 2));
  const b = new Set(norm(colLabel).split(' ').filter((w) => w.length > 2));
  if (a.size === 0 || b.size === 0) return 'label_mismatch';
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size) >= 0.5 ? 'label_match' : 'label_mismatch';
}

async function scanMockups(pages) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const result = {};
  for (const name of pages) {
    const response = await page.goto(`${SERVER}/${name}.html`, { waitUntil: 'load' }).catch((error) => {
      console.warn(`${LOG} page_unreachable name=${name} reason=${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    if (!response || response.status() !== 200) {
      result[name] = null;
      console.warn(`${LOG} no_page name=${name} status=${response ? response.status() : 'none'}`);
      continue;
    }
    await page.waitForTimeout(600);
    result[name] = await page.evaluate(() => [...document.querySelectorAll('.col')].map((col, index) => {
      const lbl = col.querySelector('.lbl');
      const label = (lbl?.childNodes[0]?.textContent || lbl?.textContent || '').trim().slice(0, 100);
      const animations = new Map();
      for (const el of col.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.animationName && cs.animationName !== 'none') {
          animations.set(cs.animationName, `${cs.animationDuration} ${cs.animationTimingFunction}${cs.animationIterationCount === 'infinite' ? ' infinite' : ''}`);
        }
      }
      const replay = !!col.querySelector('.replay, [data-replay], [onclick*="replay"]');
      return { n: index + 1, label, animations: [...animations.entries()].map(([k, v]) => `${k} ${v}`), replay };
    }));
    console.log(`${LOG} scanned ${name}: ${result[name].length} phones`);
  }
  await browser.close();
  return result;
}

const pad = (n) => String(n).padStart(3, '0');

export function buildRows(matrixRows, scan, existingRows) {
  const byId = new Map(existingRows.map((row) => [row.id, row]));
  const rows = [];
  const addRow = (fresh) => {
    const old = byId.get(fresh.id);
    // зачем (координатор 17.10): прежние поля строки идут ПЕРВЫМИ — release / emulator / triage / note / added_reason и любые
    // будущие ручные поля переживают пересборку; матрица обновляет только свои поля (описание, код, макет, анимации).
    // зачем (владелец 04.10): строка, переведённая на новый макет вручную (mockup_pinned), не возвращается к макету матрицы при пересборке
    rows.push({
      ...(old ?? {}),
      ...fresh,
      ...(old?.mockup_pinned ? { mockup: old.mockup, mockup_pinned: old.mockup_pinned } : {}),
      ...(old?.blocked_reason ? { blocked_reason: old.blocked_reason } : {}),
      evidence: old?.evidence ?? null,
      evidence_at: old?.evidence_at ?? null,
      evidence_sha256: old?.evidence_sha256 ?? null,
      // зачем (координатор 13.10): время съёмки голого кадра и его источник — явные поля строки, пересборка их не стирает
      shot_at: old?.shot_at ?? null,
      shot_at_source: old?.shot_at_source ?? null,
      anim_evidence: old?.anim_evidence ?? null,
      anim_evidence_at: old?.anim_evidence_at ?? null,
      anim_evidence_sha256: old?.anim_evidence_sha256 ?? null,
      diffs: old?.diffs ?? [],
      status: old?.status ?? (fresh.mockup.file ? 'pending' : 'no_mockup'),
      reviewed_by: old?.reviewed_by ?? null,
      reviewed_at: old?.reviewed_at ?? null,
      ...(old?.removed_reason ? { removed_reason: old.removed_reason } : {}),
      // зачем (координатор 05:50): доказательство «экрана нет в стор-сборке» ставит человек — без переноса пересборка
      // стёрла бы его у всех строк no_release_surface, и гейт уронил бы их как строки без доказательства.
      ...(old?.release_surface_proof ? { release_surface_proof: old.release_surface_proof } : {}),
    });
  };
  for (const row of matrixRows) {
    const page = row.section.replace(/\.html$/, '');
    const phones = scan[page];
    const phone = phones ? phones[row.n - 1] : undefined;
    const mapping = !phones ? 'no_page' : !phone ? 'no_phone' : labelMapping(row.state, phone.label);
    addRow({
      id: `${page}-${pad(row.n)}`,
      source: 'STATE_CHECKLIST',
      mockup: { file: phones ? `docs/design/v2-app/${page}.html` : null, phone: row.n, label: phone?.label ?? null, mapping },
      screen: row.screen,
      state: row.state,
      code: row.files,
      matrix_status: row.matrixStatus,
      has_animation: phone ? phone.animations.length > 0 || phone.replay : null,
      anim_notes: phone ? [...phone.animations, ...(phone.replay ? ['replay-control'] : [])] : [],
    });
  }
  for (const page of EXTRA_MOCKUPS) {
    for (const phone of scan[page] ?? []) {
      addRow({
        id: `${page}-${pad(phone.n)}`,
        source: 'MOCKUP_2026-10-04',
        mockup: { file: `docs/design/v2-app/${page}.html`, phone: phone.n, label: phone.label, mapping: 'by_construction' },
        screen: phone.label,
        state: phone.label,
        code: [],
        matrix_status: null,
        has_animation: phone.animations.length > 0 || phone.replay,
        anim_notes: [...phone.animations, ...(phone.replay ? ['replay-control'] : [])],
      });
    }
  }
  // зачем: 306 строк жили вне матрицы (аудиты 12.10, решения владельца, Моменты v3, голос…), полная пересборка их стирала.
  // Строка прежнего реестра без пары в матрице и EXTRA_MOCKUPS переносится как есть с пометкой origin: 'carried'.
  // Убрать строку из реестра теперь можно только явно: статусом removed_by_owner или удалением из реестра руками.
  const built = new Set(rows.map((row) => row.id));
  for (const old of existingRows) {
    if (built.has(old.id)) continue;
    rows.push({ ...old, origin: 'carried' });
    built.add(old.id);
  }
  return rows;
}

async function main() {
  const matrixText = useHead
    ? spawnSync('git', ['show', `HEAD:${MATRIX}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout
    : fs.readFileSync(path.join(ROOT, MATRIX), 'utf8');
  const matrixRows = parseMatrix(matrixText);
  console.log(`${LOG} matrix rows=${matrixRows.length} source=${useHead ? 'HEAD' : 'working tree'}`);
  const pageNames = [...new Set([...matrixRows.map((r) => r.section.replace(/\.html$/, '')), ...EXTRA_MOCKUPS])];
  const scan = await scanMockups(pageNames);
  const existing = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : { rows: [] };
  const rows = buildRows(matrixRows, scan, existing.rows);
  const ids = new Set(rows.map((row) => row.id));
  const dropped = existing.rows.filter((row) => !ids.has(row.id)).map((row) => row.id);
  if (dropped.length > 0) console.warn(`${LOG} rows_dropped_from_matrix count=${dropped.length} ids=${dropped.slice(0, 10).join(',')}`);
  const carried = rows.filter((row) => row.origin === 'carried').length;
  console.log(`${LOG} carried_outside_matrix count=${carried}`);
  const byIdNew = new Map(rows.map((row) => [row.id, row]));
  const lostFields = existing.rows.flatMap((row) => Object.keys(row).filter((key) => !(key in (byIdNew.get(row.id) ?? {}))).map((key) => `${row.id}.${key}`));
  console.log(`${LOG} loss_check rows_before=${existing.rows.length} rows_after=${rows.length} dropped=${dropped.length} lost_fields=${lostFields.length}${lostFields.length ? ` first=${lostFields.slice(0, 10).join(',')}` : ''}`);
  if (dryRun) {
    console.log(`${LOG} dry_run: реестр НЕ записан`);
    return;
  }
  const registry = {
    schemaVersion: 'visual-parity.v1',
    rule: 'CLAUDE.md «ГЕЙТ: ПРИЛОЖЕНИЕ = МАКЕТ»: релиз запрещён, пока каждая строка не match (склейка + ревью координатора, анимации записаны).',
    generatedAt: new Date().toISOString(),
    matrix: MATRIX,
    mockupServer: SERVER,
    statuses: ['pending', 'match', 'diff', 'no_mockup', 'removed_by_owner', 'blocked', 'no_release_surface'],
    rows,
  };
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
  const count = (predicate) => rows.filter(predicate).length;
  console.log(`${LOG} wrote registry rows=${rows.length} pending=${count((r) => r.status === 'pending')} match=${count((r) => r.status === 'match')} diff=${count((r) => r.status === 'diff')} no_mockup=${count((r) => r.status === 'no_mockup')} label_mismatch=${count((r) => r.mockup.mapping === 'label_mismatch')} no_phone=${count((r) => r.mockup.mapping === 'no_phone')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`${LOG} FAILED reason=${error instanceof Error ? error.stack : String(error)}`);
    process.exit(1);
  });
}
