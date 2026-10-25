// зачем (координатор 25.10, «разблокировать Сверку»): в реестре R1 заведены 16 строк «Сцены» — Главная home-scene-001…011 и
// «Сегодня» today-scene-001…005. Робот parity_batch_shoot снимает только строки DEV_LINKS_R1.md, остальные пропускает с причиной
// «нет_в_DEV_LINKS_R1». Сторож держит связь «строка реестра → ссылка»:
// - строка есть и уникальна;
// - ссылка ведёт на dev-вход нужной сцены с состоянием, которое знает функция выбора;
// - номер телефона эталона совпадает с реестром;
// - Plus — только у home-scene-011.
// DEV_LINKS_R1.md с 13.10 правится руками; перезапуск отставшего генератора сотрёт раздел — сторож это поймает.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const doc = read('docs/phraseman-2.0/DEV_LINKS_R1.md');
const registry = JSON.parse(read('docs/phraseman-2.0/registries/visual_parity.json'));
const regRows = Array.isArray(registry) ? registry : (registry.rows || registry.items || registry.screens || Object.values(registry).find(Array.isArray));

/** Список состояний из исходника (без загрузки TS): `export const NAME = [ 'a', 'b' ] as const`. */
function literalList(rel, name) {
  const m = read(rel).match(new RegExp(`export const ${name}[^=]*=\\s*\\[([^\\]]+)\\]`));
  assert.ok(m, `${name} не найден в ${rel}`);
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}
const HOME_STATES = literalList('components/home/v2/scene/home_scene_state.ts', 'HOME_SCENE_STATES');
const TODAY_STATES = literalList('components/home/v2/today_scene/today_scene_preview_fixtures.ts', 'TODAY_SCENE_PREVIEW_STATES');

const docRows = new Map(
  doc.split(/\r?\n/)
    .filter((line) => /^\| (home|today)-scene-\d{3} \|/.test(line))
    .map((line) => { const cells = line.split('|'); return [cells[1].trim(), cells]; }),
);

/** Параметры маршрута из next= (внутри next «&» закодировано как %26). */
function nextQuery(link) {
  const m = link.match(/&next=(\/[a-z_]+)\?([^`\s]+)/);
  if (!m) return null;
  const params = Object.fromEntries(decodeURIComponent(m[2]).split('&').map((pair) => pair.split('=')));
  return { route: m[1], params };
}

const wanted = regRows.filter((r) => /^(home|today)-scene-\d{3}$/.test(r.id ?? ''));

test('в реестре 16 строк «Сцены» (11 Главная + 5 «Сегодня»)', () => {
  assert.equal(wanted.filter((r) => r.id.startsWith('home-')).length, 11);
  assert.equal(wanted.filter((r) => r.id.startsWith('today-')).length, 5);
});

test('у каждой строки реестра — уникальная ссылка на свой dev-вход, состояние из функции, телефон как в реестре', () => {
  const problems = [];
  for (const r of wanted) {
    const cells = docRows.get(r.id);
    if (!cells) { problems.push(`${r.id}: нет в DEV_LINKS_R1`); continue; }
    if (cells.length !== 10) problems.push(`${r.id}: колонок ${cells.length - 2}, ждали 8`);
    if (cells[7].trim() !== 'да') problems.push(`${r.id}: не «уникальна: да» — робот её не возьмёт`);
    const link = (cells[3].match(/`([^`]+)`/) ?? [])[1] ?? '';
    if (!link.startsWith('phraseman://dev_state?onboarding=done&intros=seen')) problems.push(`${r.id}: ссылка не через dev_state (у робота нет маркера готовности)`);
    const q = nextQuery(link);
    const home = r.id.startsWith('home-');
    const route = home ? '/dev_home_scene_preview' : '/dev_today_scene_preview';
    const states = home ? HOME_STATES : TODAY_STATES;
    if (!q || q.route !== route) { problems.push(`${r.id}: next не на ${route}`); continue; }
    if (!states.includes(q.params.state)) problems.push(`${r.id}: состояние «${q.params.state}» не из ${states.join('|')}`);
    const shouldPlus = r.id === 'home-scene-011';
    if ((q.params.plus === '1') !== shouldPlus) problems.push(`${r.id}: plus=${q.params.plus ?? 'нет'}, ждали ${shouldPlus ? '1' : 'нет'}`);
    const phone = Number((cells[8].match(/#(\d+)/) ?? [])[1]);
    if (phone !== Number(r.mockup?.phone)) problems.push(`${r.id}: телефон эталона ${phone}, в реестре ${r.mockup?.phone}`);
  }
  assert.deepEqual(problems, []);
});

test('телефоны эталона идут в порядке состояний функции выбора (порядок героев в home-scene-states.html = HOME_SCENE_STATES)', () => {
  const order = wanted.filter((r) => r.id.startsWith('home-') && r.id !== 'home-scene-011')
    .sort((a, b) => a.mockup.phone - b.mockup.phone)
    .map((r) => nextQuery((docRows.get(r.id)[3].match(/`([^`]+)`/) ?? [])[1] ?? '')?.params.state);
  assert.deepEqual(order, HOME_STATES);
  const todayOrder = wanted.filter((r) => r.id.startsWith('today-'))
    .sort((a, b) => a.mockup.phone - b.mockup.phone)
    .map((r) => nextQuery((docRows.get(r.id)[3].match(/`([^`]+)`/) ?? [])[1] ?? '')?.params.state);
  assert.deepEqual(todayOrder, TODAY_STATES);
});

// зачем (координатор 25.10): 6 героев, которых тестовый аккаунт честно не даёт, — вторые строки на БОЕВОЙ Главной (homefacts)
test('у 6 героев есть вторая строка «боевая Главная»: homefacts=<герой>, next на вкладку Главной, телефон как у основной строки', () => {
  const LIVE = { '003': 'streak_risk', '004': 'day_done', '007': 'exam_ready', '008': 'streak_lost', '009': 'welcome_back', '010': 'all_done' };
  const liveRows = doc.split(/\r?\n/).filter((line) => /^\| home-scene-live-\d{3} \|/.test(line));
  assert.equal(liveRows.length, Object.keys(LIVE).length);
  const problems = [];
  for (const [n, state] of Object.entries(LIVE)) {
    const line = liveRows.find((l) => l.startsWith(`| home-scene-live-${n} |`));
    if (!line) { problems.push(`home-scene-live-${n}: нет`); continue; }
    const cells = line.split('|');
    if (cells.length !== 10) problems.push(`home-scene-live-${n}: колонок ${cells.length - 2}`);
    if (cells[7].trim() !== 'да') problems.push(`home-scene-live-${n}: не «уникальна: да»`);
    const link = (cells[3].match(/`([^`]+)`/) ?? [])[1] ?? '';
    if (!link.startsWith('phraseman://dev_state?onboarding=done&intros=seen')) problems.push(`home-scene-live-${n}: не через dev_state`);
    if (!link.includes(`&homefacts=${state}&`)) problems.push(`home-scene-live-${n}: нет homefacts=${state}`);
    if (!link.endsWith('&next=/(tabs)/home')) problems.push(`home-scene-live-${n}: next не на боевую Главную`);
    if (!HOME_STATES.includes(state)) problems.push(`home-scene-live-${n}: «${state}» не из функции выбора`);
    const main = regRows.find((r) => r.id === `home-scene-${n}`);
    if (Number((cells[8].match(/#(\d+)/) ?? [])[1]) !== Number(main?.mockup?.phone)) problems.push(`home-scene-live-${n}: телефон не как у home-scene-${n}`);
  }
  assert.deepEqual(problems, []);
  assert.match(read('app/dev_state_fixtures.ts'), /request\.homefacts = pick\('homefacts', \[\.\.\.DEV_HOME_SCENE_FACT_STATES, 'off'\] as const\);/);
});

test('оба dev-входа закрыты в стор-сборке', () => {
  for (const rel of ['app/dev_home_scene_preview.tsx', 'app/dev_today_scene_preview.tsx']) {
    assert.match(read(rel), /if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect/, rel);
  }
});
