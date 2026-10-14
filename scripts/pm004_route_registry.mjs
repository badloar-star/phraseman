// PM-004 «Построить полный реестр экранов и маршрутов».
// зачем: PM-004-A1 — для КАЖДОГО маршрута: владелец (feature owner), входы, deep links,
// статус keep/redesign/remove/archive и SHA проверки. Реестр 24.09
// (registries/screen_inventory.json) устарел: 37 unknown, мёртвые записи, нет новых экранов
// 2.0. Скрипт пересобирает его из ФАКТИЧЕСКОГО дерева app/ на текущем HEAD; статус берётся
// из старого реестра, а где там unknown/устарело — из таблицы OVERRIDES с номером решения.
// Неясное не выдумывается: статус `needs-owner-decision` + вопрос.
//   node scripts/pm004_route_registry.mjs   → docs/phraseman-2.0/evidence/PM-004_route_registry.md
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const OUT = 'docs/phraseman-2.0/evidence/PM-004_route_registry.md';
const INVENTORY = 'docs/phraseman-2.0/registries/screen_inventory.json';
const SCAN = ['app', 'components', 'hooks', 'modules'];
const SKIP_DIRS = new Set(['node_modules', '__tests__', '__mocks__', 'graphify-out']);
// зачем: тот же критерий «экран, а не компонент», что в реестре 24.09 (поле method):
// компоненты, колокейтед в app/, технически видны Expo Router, но экранами не являются.
const COMPONENT_DIRS = ['app/flashcards/', 'app/community_packs/', 'app/feedback/'];

// Статусы: keep — остаётся как есть; redesign — остаётся в новом виде 2.0 (D24/D97);
// remove — удалить (файл ещё есть = кандидат на удаление); archive — в релизе нет
// пользовательского экрана: legacy-якорь URL, редирект или dev-витрина.
const OVERRIDES = {
  '/(tabs)/home': ['redesign', 'Главная', 'D42/D50/D97: Главная из блоков референса'],
  '/(tabs)/lessons': ['redesign', 'Обучение', 'D39/D97: вкладка «Обучение»'],
  '/(tabs)/settings': ['redesign', 'Настройки', 'D39/D97: вкладка «Настройки»'],
  '/(tabs)/friends': ['redesign', 'Сообщество/друзья', 'D39: друзья внутри «Сообщества»'],
  '/(tabs)/community': ['redesign', 'Сообщество', 'D39: новая вкладка «Сообщество»'],
  '/(tabs)/video': ['redesign', 'Видео', 'D39/D50: вкладка «Видео»'],
  '/(tabs)/journal': ['archive', 'навигация', 'legacy-якорь URL /journal (файл = пустая заглушка, не рендерится)'],
  '/(tabs)/arena': ['archive', 'навигация', 'D83: legacy-якорь URL /arena, рендерит null'],
  '/achievements_screen': ['keep', 'достижения', 'PM-054 done: достижения удалённых механик сняты, экран остаётся'],
  '/ai_dialog_home': ['keep', 'Диалоги', 'D05/D111: Диалоги остаются (лимит Free 30 ответов/мес)'],
  '/ai_dialog_session': ['keep', 'Диалоги', 'D05/D111'],
  '/ai_dialog_briefing': ['keep', 'Диалоги', 'D05/D111'],
  '/ai_dialog_consent_gate': ['keep', 'Диалоги', 'D05/D111 + согласие на ИИ (политика)'],
  '/ai_companion_session': ['keep', 'Диалоги', 'D05/D111'],
  '/dialogue_v2_session': ['keep', 'Диалоги V2', 'D112'],
  '/dialogue_v2_briefing': ['keep', 'Диалоги V2', 'D112'],
  '/dialogue_v2_freeform': ['keep', 'Диалоги V2', 'D81: свободный разговор остаётся'],
  '/dialogue_v2_memory': ['keep', 'Диалоги V2', 'D112'],
  '/dialogue_v2_completion': ['keep', 'Диалоги V2', 'D112'],
  '/dialogue_v2_visual_fixture': ['archive', 'Диалоги V2', 'dev-фикстура (__DEV__), без входа'],
  '/dev_spire_preview': ['archive', 'Шпиль', 'dev-превью на моках (ENABLE_DEV_TOOLS, не стор-релиз), без входа и сети'],
  '/dev_moments_preview': ['archive', 'Шпиль', 'dev-превью моментов вовлечения на моках (ENABLE_DEV_TOOLS, не стор-релиз), без входа и сети'],
  '/dev_state': ['archive', 'Робот-съёмка', 'dev-фикстуры состояний для Maestro (__DEV__, не стор-релиз); в Firestore не пишет'],
  '/collectibles_screen': ['remove', 'коллекция фраз', 'D140 (владелец 2026-10-01): коллекции удалены целиком'],
  '/community_pack_create': ['keep', 'наборы сообщества', 'D35/D85'],
  '/level_exam': ['keep', 'Learning V1', 'D72/D121: экзамены'],
  '/lingman_videos': ['keep', 'видео', 'D50/D132: лента видео'],
  '/lingman_playlist': ['keep', 'видео', 'D50/D132'],
  '/lingman_video_watch': ['keep', 'видео', 'video-011: экран ролика (плеер, набор, фразы)'],
  '/motion_showcase': ['archive', 'dev-инструменты', 'production-safe gate, dev-витрина'],
  '/pos_analytics_audit': ['archive', 'dev-инструменты', 'production-safe gate, dev-аудит'],
  '/v2_kit_preview': ['archive', 'dev-инструменты', 'витрина только для разработки'],
  '/premium_modal': ['keep', 'монетизация', 'один пейвол Plus за диспетчером (владелец 2026-09-30)'],
  '/premium_modal_v2': ['archive', 'монетизация', 'редирект на /premium_modal'],
  '/promo_code_entry': ['keep', 'монетизация', 'PM-221-A2: покупки/промокоды — защищённый домен'],
  '/shards_shop': ['archive', 'монетизация', 'PM-057/PM-060: редирект старых ссылок магазина жемчуга'],
  '/shop': ['remove', 'монетизация', 'D09/D70/D102: dev-магазин спинов/косметики за жемчуг, входа из приложения нет — кандидат на удаление'],
  '/settings_themes': ['redesign', 'темы', 'D38: темы остаются (удаляются только ассеты), темы 2.0'],
  '/coin_rank': ['keep', 'ранг монеты', 'D34/D93'],
  '/flashcards_truefalse_session': ['keep', 'карточки', 'режим тренировки карточек'],
  '/flashcards_audio': ['archive', 'карточки', 'редирект на /flashcards (старые ссылки)'],
  '/learning_v2_modes_showcase': ['archive', 'dev-инструменты', 'production-safe gate витрины 7 режимов V2'],
  '/learning_v2_modes_showcase_run/[family]': ['archive', 'dev-инструменты', 'запуск режима из dev-витрины'],
  '/learning-v2/intro-reader-fixture': ['archive', 'dev-инструменты', 'dev-фикстура интро-ридера'],
  '/dev-emulator-login': ['archive', 'dev-инструменты', 'вход тестовым аккаунтом Auth-эмулятора; работает только при __DEV__ + EXPO_PUBLIC_FIREBASE_EMULATOR_HOST (Account V2, 2065c99bc)'],
};
const STATUS_FROM_OLD = { keep: 'keep', redesign: 'redesign', remove: 'remove', conserve: 'archive' };

function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name).split(sep).join('/');
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function isScreen(file) {
  if (!file.endsWith('.tsx')) return false;
  const base = file.split('/').at(-1).replace(/\.tsx$/, '');
  if (base.startsWith('_') && base !== '_layout') return false;
  if (/^[A-Z]/.test(base)) return false;
  if (COMPONENT_DIRS.some((d) => file.startsWith(d))) return false;
  const src = readFileSync(file, 'utf8');
  if (!/export\s+default|export\s*\{\s*default/.test(src)) return false;
  if (/export default function __\w*RouteShim|export default \{\}|__RouteShim\(\)/.test(src)) return false;
  // зачем: колокейтед-компоненты без маршрута: импортируются как <X/>, push/Stack.Screen нет.
  return !['app/direct_paywall_route.tsx', 'app/lesson_runtime_access_boundary.tsx', 'app/product_analytics_runtime_observer.tsx',
    'app/referral_access_ended_modal.tsx', 'app/voice_equalizer.tsx'].includes(file);
}

function routeOf(file) {
  let r = '/' + file.replace(/^app\//, '').replace(/\.tsx$/, '');
  if (r.endsWith('/index') && r !== '/index' && r !== '/(tabs)/index') r = r.slice(0, -'/index'.length);
  return r;
}

const deepLinkOf = (route) => `phraseman://${route.replace(/\/\([^)]+\)/g, '').replace(/^\//, '')}`;

function main() {
  const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const all = walk('app', []);
  const screens = all.filter(isScreen).sort();
  const sources = SCAN.flatMap((d) => walk(d, [])).map((f) => [f, readFileSync(f, 'utf8').split('\n')]);
  const old = new Map(JSON.parse(readFileSync(INVENTORY, 'utf8')).entries.map((e) => [e.route, e]));
  const notif = readFileSync('app/notification_tap_handler.ts', 'utf8');
  const intent = readFileSync('app/+native-intent.tsx', 'utf8');

  const rows = screens.map((file) => {
    const route = routeOf(file);
    const bare = route.replace(/\/\([^)]+\)/g, '') || '/';
    const slugs = [...new Set([route, bare])].filter((s) => s !== '/');
    const refs = [];
    for (const [f, lines] of sources) {
      if (f === file) continue;
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line)) return;
        // зачем: вход = строка маршрута в кавычках (push/replace/Link/реестры навигации);
        // регистрация <Stack.Screen name> входом не считается.
        if (slugs.some((s) => new RegExp(`['"\`]${s.replace(/[[\]()]/g, '\\$&')}(?:['"\`?/#]|\\$\\{)`).test(line))) refs.push(`${f}:${i + 1}`);
      });
    }
    const prev = old.get(route);
    const ov = OVERRIDES[route];
    let status; let owner; let basis;
    if (ov) [status, owner, basis] = ov;
    else if (prev && STATUS_FROM_OLD[prev.decision]) {
      status = STATUS_FROM_OLD[prev.decision];
      owner = prev.exclusive_to_feature ?? 'приложение (общая инфраструктура)';
      basis = `реестр 24.09 (${prev.decision})`;
    } else {
      status = 'needs-owner-decision';
      owner = prev?.exclusive_to_feature ?? 'unknown';
      basis = 'нет в реестре 24.09 и нет правила — добавить в OVERRIDES';
      console.log(`[PM-004] unresolved route ${route} (${file})`);
    }
    const links = [deepLinkOf(route)];
    if (slugs.some((s) => notif.includes(`'${s}'`))) links.push('push-уведомление');
    return { route, file, owner, status, basis, refs, links };
  });

  const gone = [...old.values()].filter((e) => !existsSync(e.evidence.split(':')[0])).map((e) => ({
    route: e.route,
    handled: /arena/.test(e.route) ? '+native-intent → /home (D83)'
      : /^\/paywall_[a-g]$/.test(e.route) ? '+native-intent → /premium_modal'
        : intent.includes(e.route.slice(1)) ? '+native-intent' : '+not-found',
  }));

  const counts = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
  const out = [];
  out.push('# PM-004 — реестр экранов и маршрутов', '');
  out.push(`Сгенерировано \`node scripts/pm004_route_registry.mjs\`. **SHA проверки: \`${sha}\`** (общий для всех строк — дерево app/ прочитано на этом коммите).`, '');
  out.push('Экран = `.tsx` в `app/` с `export default`-компонентом, без `_`-префикса (кроме `_layout`), не PascalCase-компонент и не колокейтед-компонент в `app/flashcards/`, `app/community_packs/`, `app/feedback/` (тот же критерий, что в `registries/screen_inventory.json`, 24.09).', '');
  out.push('Входы — строки маршрута в кавычках в `app/ components/ hooks/ modules/` (push/replace/Link/реестры навигации), регистрация `<Stack.Screen>` не считается. Deep link — любой маршрут открывается схемой `phraseman://` (Expo Router, `app/+native-intent.tsx` пропускает путь как есть, кроме перечисленных ниже редиректов); `push-уведомление` — маршрут встречается в `app/notification_tap_handler.ts`. Универсальная ссылка `https://knowlyapps.com/phraseman/invite` → `/home` (app.json intentFilters + +native-intent).', '');
  out.push(`Статусы: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}; всего **${rows.length}**.`, '');
  out.push('| Маршрут | Файл | Владелец | Статус | Основание | Входов | Примеры входов | Deep link |', '|---|---|---|---|---|---:|---|---|');
  for (const r of rows) {
    out.push(`| \`${r.route}\` | ${r.file} | ${r.owner} | **${r.status}** | ${r.basis} | ${r.refs.length} | ${r.refs.slice(0, 2).join('<br>') || 'нет (корень/табы/динамический путь)'} | ${r.links.join('<br>')} |`);
  }
  out.push('', `## Маршруты из реестра 24.09, файлов которых больше нет (${gone.length})`, '');
  out.push('| Маршрут | Что получает старая ссылка |', '|---|---|');
  for (const g of gone) out.push(`| \`${g.route}\` | ${g.handled} |`);
  const open = rows.filter((r) => r.status === 'needs-owner-decision');
  out.push('', `## Открытые вопросы владельцу (${open.length})`, '');
  for (const r of open) out.push(`- \`${r.route}\`: ${r.basis}`);
  const removeExisting = rows.filter((r) => r.status === 'remove');
  out.push('', `## Статус remove, файл ещё в дереве (${removeExisting.length}) — кандидаты на удаление`, '');
  for (const r of removeExisting) out.push(`- \`${r.route}\` (${r.file}): ${r.basis}`);
  writeFileSync(OUT, out.join('\n') + '\n');
  console.log(`[PM-004] routes=${rows.length} ${JSON.stringify(counts)} gone=${gone.length} sha=${sha} → ${OUT}`);
}

main();
