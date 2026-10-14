#!/usr/bin/env node
/**
 * Ищет русские строки-литералы в UI-компонентах, которые НЕ обёрнуты в переводчик.
 *
 * зачем (владелец 2026-08-15): один и тот же баг «экран показывал русский текст
 * на любом языке» чинился 14 раз подряд — главный экран плана, мастер настройки,
 * завершение задачи, теория дня, карточка плана, лобби турнира, сезон, билеты…
 * Каждый раз это была отдельная сессия «нашёл случайно → починил один экран».
 * Существующие 90 тестов локалей проверяют конкретные места, но не запрещают
 * класс ошибки целиком.
 *
 * зачем храповик, а не «почини всё сразу»: в проекте уже сотни таких мест,
 * и часть из них легальна (данные уроков, отладочные строки). Требовать
 * разовой зачистки — значит гарантировать, что сторож отключат. Храповик
 * фиксирует текущее число и не даёт ему расти: новый экран обязан быть
 * переведён с рождения, старые чинятся по мере того, как их всё равно трогают.
 *
 * Использование:
 *   node scripts/scan_untranslated_ui.mjs            # проверить против базы
 *   node scripts/scan_untranslated_ui.mjs --report   # показать, где именно
 *   node scripts/scan_untranslated_ui.mjs --update   # зафиксировать новую базу (только вниз)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { localLogHelperCall, maskMultilineLogCalls, maskPositionalTranslatorCalls, maskToastEntriesWithEnglishInSameObject } from './untranslated_ui_positional.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'config', 'untranslated-ui-baseline.json');

/** Где живут экраны. Копии дерева и временные папки не считаются. */
const SCAN_DIRS = ['app', 'components'];
const SKIP_DIR = /^(node_modules|__tests__|\.git|\.claude|\.codex-tmp|\.worktrees|tmp)$/;

/**
 * Файлы, где русский текст — это КОНТЕНТ, а не интерфейс.
 *
 * зачем: данные уроков и словари по определению содержат русский — они и есть
 * материал для изучения. Считать их нарушением значит утопить сигнал в шуме.
 */
const CONTENT_FILES = [
  /lesson_help_theory_data\.tsx$/,
  /_data\.tsx$/,
  /_content\.tsx$/,
  // зачем эти четыре: русский в них — учебный материал (слова урока, подсказки
  // по грамматике, банки вопросов экзамена), а не подписи интерфейса.
  // Проверено чтением: это `topic`/`q`/`opts` внутри массивов заданий.
  /app\/lesson_words\.tsx$/,
  /app\/hint\.tsx$/,
  /app\/exam\.tsx$/,
  /app\/level_exam\.tsx$/,
  // зачем 2026-08-24: DEV-центр — инструмент владельца, а не экран игрока.
  // Его подписи («DEV-выдача снята», «Вернуться в Dev Hub») физически не
  // попадают к пользователям: кнопка входа живёт только в отладочной сборке.
  // Переводить их на восемь языков незачем, а как долг они мешали: любая
  // правка файла упиралась в сторожа из-за 29 унаследованных строк.
  // Реестр инструментов (devToolRegistry.ts) сторож и так не проверял —
  // это выравнивает правило для обоих файлов DEV-центра.
  /components\/dev\/DevHubSheet\.tsx$/,
  // зачем 2026-08-24: витрина сценариев отписки — то же основание, что у
  // DevHubSheet. Маршрут лежит в DEV_UTILITY_ROUTE_NAMES, то есть регистрируется
  // только при ENABLE_DEV_TOOLS и в релизную сборку не попадает. Служебные
  // подписи («Обычный», «Рекордный», «Сквозной прогон») адресованы владельцу.
  // ВАЖНО: тексты САМОГО шага удержания в этом файле переведены через LP() на
  // все 8 языков — они обязаны совпадать с боевым manage_subscription.tsx.
  /app\/_dev_cancel_flow_preview\.tsx$/,
  // зачем 2026-09-24: витрина набора стиля 2.0 — служебный экран владельца
  // (редирект на Главную при !__DEV__), подписи-образцы игроку не показываются.
  /app\/v2_kit_preview\.tsx$/,
  // зачем (координатор 12.10): витрина-фикстура Диалогов v2 (dev-экран для съёмок и контрактов), подписи-образцы игроку не показываются.
  /app\/dialogue_v2_visual_fixture\.tsx$/,
  // зачем (координатор 12.10): модалка покупки набора написана блоками `if (lang === 'uk') return {…}` по языкам (все 8 + en) —
  // сканер видит русский и украинский блоки как «забытые» строки, хотя перевод на месте.
  /app\/flashcards\/CardPackShardPaywallModal\.tsx$/,
  // зачем (12.10, английский в R1): проба хранилища Account V2 на iPhone — без EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1 файл физически исключён
  // из бандла Metro, внутри второй замок; подписи фаз адресованы владельцу на тестовом iPhone, игрок экран не видит.
  /app\/dev-account-v2-ios-proof\.tsx$/,
  // зачем (координатор 13.10, база 91 → 0, владелец «перевести всё»): dev-экраны для съёмок Сверки — маршрут уводит на Главную в стор-сборке
  // (ENABLE_DEV_TOOLS / IS_STORE_RELEASE, router.ctx вырезает dev_state), подписи адресованы владельцу и роботу, игрок их не видит.
  /app\/dev_state\.tsx$/,
  /app\/dev_cards_result_preview\.tsx$/,
  /app\/dev_spire_preview\.tsx$/,
  /app\/dev_moments_preview\.tsx$/,
  /app\/_learning_v2_authoring_preview\.tsx$/,
  /components\/friends_together\/DevBotsSheet\.tsx$/,
  // зачем (13.10): не подключены ни к одному экрану (grep по app/ и components/ — только сам файл): лаборатория режимов V2 и админ-превью
  // итога экзамена. Переводить мёртвый код незачем; при подключении — убрать отсюда и перевести.
  /components\/learning-v2-lab\/ModeDemoPlayer\.tsx$/,
  /components\/ExamResultPreviewAdminModal\.tsx$/,
];

/**
 * Строка уже переведена соседним полем — не нарушение этого сторожа.
 *
 * зачем: банки заданий переводят через парные поля (`topic` + `topicUK`),
 * а не через triLang. Это отдельная проблема — перевод только на два языка
 * вместо восьми, — но другого класса, и мешать её с «забыл обернуть вовсе»
 * значит утопить сигнал: сторож станет шуметь там, где перевод есть.
 */
const PAIRED_TRANSLATION = /\b\w+(UK|Uk|_uk|EN|En|_en|ES|Es|_es)\s*:/;

/**
 * Строка сама по себе — словарь локалей: { ru: 'Форест', uk: 'Форест', es: 'Bosque', ... }.
 *
 * зачем (2026-08-23): isTranslationDictionary требует `ru: {` — то есть
 * ВЛОЖЕННЫЙ объект на локаль. Но названия языков и тем записаны плоско
 * (ru: 'Русский', uk: 'Українська', …), и сторож считал их забытым текстом:
 * 4 ложных срабатывания в settings.tsx на 'Русский', 'Українська', 'Форест'.
 * Всплывали они только в однострочной записи объекта — при разбивке по строкам
 * прятались, из-за чего база молча зависела от форматирования файла, и откат
 * чужого переформатирования выглядел как «стало больше непереведённых».
 * Признак перевода: рядом с ru: в той же строке стоит ключ другой локали.
 */
// зачем (координатор 12.10): `^\s*` вместо `^` — однострочная карта `ru: '…', uk: '…', en: …` с отступом (так записаны подписи вкладок в app/(tabs)/_layout.tsx) не считалась переведённой.
const INLINE_LOCALE_MAP = /(^\s*|[{,]\s*)['"]?ru['"]?\s*:\s*['"][^'"]*['"]\s*,\s*['"]?(uk|en|es|pl|tr|vi|id|pt-BR)['"]?\s*:/;

/**
 * Строка — диагностический ЛОГ, а не текст интерфейса.
 *
 * зачем (2026-09-03): правило владельца «сперва логи, потом починка» требует
 * подробной русской трассировки на каждом ветвлении и в каждом catch. Такие
 * сообщения читает разработчик в metro-console, пользователь их не видит
 * НИКОГДА — переводить их незачем, а сторож считал их забытым UI-текстом и
 * отказывал в коммите за выполнение другого обязательного правила.
 *
 * Ловится именно вызов логгера в этой же строке, а не слово в тексте: обычная
 * UI-строка рядом с DebugLogger в одной строке не встречается.
 */
// зачем (координатор 12.10): помощники логов проекта, которые сами зовут console и ничего не показывают на экране —
// причина в их вызове такой же лог (traceThumbMissing, app/thumb_trace.ts → console.warn, возвращает null). Имена явные,
// не маской: иначе UI-строка в похожей функции просочилась бы мимо сторожа. Новый помощник логов — дописать в альтернативу.
// зачем (координатор 12.10, после ужесточения fe1bc0d65): logSpireLayout/logSpireDock (components/spire/spire_layout_log.ts —
// только console.log в dev) и bootMark (app/_layout.tsx — только console.warn трассировки старта) — журналы, не экран.
// зачем (12.10, английский в R1): traceNick (components/account/NicknameEditModal.tsx — только console.log под __DEV__) — журнал шторки имени.
const DIAGNOSTIC_LOG_CALL = /\b(DebugLogger|console)\s*\.\s*(log|info|warn|error|debug)\s*\(|\b(traceThumbMissing|logSpireLayout|logSpireDock|bootMark|traceNick)\s*\(/;

/**
 * Файл — сам словарь переводов: русский в нём и есть перевод.
 *
 * зачем распознавать по содержимому, а не списком имён: словари появляются
 * и переезжают, а захардкоженный список устареет молча. Признак — объявление
 * словаря языка (`const RU = {`, `ru: {`) рядом с таким же для другого языка.
 */
function isTranslationDictionary(source) {
  // зачем `[^=\n]*` перед `=`: словари объявляются и с типом
  // (`const UK: typeof RU = {`), не только голым присваиванием.
  // зачем (координатор 12.10): словарь бывает и массивом строк на язык (`ru: [ … ]`, как реплики демо-чата), не только вложенным объектом.
  const hasRu = /\b(const\s+RU\b[^=\n]*=|['"]?ru['"]?\s*:\s*[{[])/.test(source);
  const hasOther = /\b(const\s+(UK|EN|ES|PL|TR|VI|ID|PT_BR)\b[^=\n]*=|['"]?(uk|en|es|pl|tr|vi|id)['"]?\s*:\s*[{[])/.test(source);
  return hasRu && hasOther;
}

/**
 * Переводчики проекта: строки внутри их вызова легальны по определению.
 *
 * зачем 'L(' (2026-08-23): экраны заводят локальный алиас
 * `const L = (copy) => triLang(lang, copy)`, чтобы не таскать lang в каждый
 * вызов — так сделано минимум в settings_notifications, account_details,
 * manage_subscription, ideas_submit, community_pack_create. Сторож их не знал
 * и считал ВСЕ строки этих экранов непереведёнными: 45 ложных срабатываний в
 * одном settings_notifications. Сторож, который шумит на корректном коде,
 * заставляет двигать базу вверх — то есть ровно то, против чего он написан.
 *
 * зачем 'LP(' (2026-08-24): тот же класс ложного срабатывания, что и с 'L(',
 * только для ПОЗИЦИОННОГО хелпера `LP(ru, uk, es, ptBR, vi, id, tr, pl)` —
 * он объявлен в manage_subscription.tsx и оборачивает triLang. Строки внутри
 * него переведены на все 8 языков, но сторож видел первый аргумент как голый
 * русский текст: 74 ложных срабатывания на одном экране, и любая честная
 * правка с переводами выглядела регрессией базы.
 *
 * зачем 'T(' (2026-08-27): тот же класс, что и 'LP(' — components/SeasonGiftModal.tsx
 * объявляет свой позиционный хелпер `T(ru, uk, en, es, ptBR, vi, id, tr, pl)`,
 * возвращающий Record<Lang,string> (все 9 языков). Диф, который добавлял
 * недостающий en в ~60 существующих вызовов T(), задевал КАЖДУЮ такую строку
 * (позиция аргумента сдвинулась), и построчный addedUntranslatedLines() читал
 * это как 60 новых непереведённых строк — хотя русский текст там не новый,
 * а добавленный en как раз и есть перевод. 'T(' — токен только в этом файле
 * (проверено git grep по всем .tsx), коллизий с другими хелперами нет.
 */
// зачем 'actionToastTri(' (координатор 12.10): тост на 9 языков с объектом { ru, uk, en, … } — тот же класс ложного срабатывания, что и у triLang.
const TRANSLATORS = ['triLang', 'pickLang', 'localized', 't(', 'L(', 'LP(', 'T(', 'actionToastTri('];

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(entry.name)) walk(full, out);
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Убирает комментарии и всё, что лежит внутри вызова переводчика.
 *
 * зачем по балансу скобок, а не регуляркой: вызовы переводчика содержат
 * вложенные шаблонные строки и объекты — регулярка на них ломается и даёт
 * ложные срабатывания, из-за которых сторожу перестают верить.
 */
function stripLegal(source) {
  const mask = (value) => value.replace(/[^\r\n]/g, ' ');
  let src = source
    .replace(/\/\*[\s\S]*?\*\//g, mask)
    .replace(/^[ \t]*\/\/.*$/gm, mask);

  // зачем (координатор 12.10, подготовка к английскому интерфейсу): пул фраз ОДНОГО языка — массив `const GREETINGS_RU = [ … ]` / `_UK`, который
  // подключён в карту языков тем же файлом (`ru: GREETINGS_RU`, `uk: GREETINGS_UK`) — это и есть перевод (отдельный пул на каждый язык), а не забытая
  // строка. Сторож считал 140 приветствий Главной (70 ru + 70 uk) непереведёнными, хотя пулы есть на всех 9 языках. Условие «имя массива
  // упомянуто как значение ru:/uk:» не даёт спрятать одинокий массив с русским текстом без карты языков.
  for (const match of [...src.matchAll(/^[ \t]*(?:export\s+)?const\s+([A-Z0-9_]+_(?:RU|UK))\b[^=\n]*=\s*\[/gm)]) {
    const name = match[1];
    const lang = name.endsWith('_RU') ? 'ru' : 'uk';
    if (!new RegExp(`['"]?${lang}['"]?\\s*:\\s*${name}\\b`).test(src)) continue;
    const end = src.indexOf('\n];', match.index);
    if (end < 0) continue;
    src = src.slice(0, match.index) + mask(src.slice(match.index, end + 3)) + src.slice(end + 3);
  }

  // зачем (координатор 12.10, EN_READINESS): tl(ru, uk, en, es) и showToast(type, ru[, uk], en) — перевод, только если en —
  // непустой английский литерал (scripts/untranslated_ui_positional.mjs). Пустой/нестроковый en остаётся находкой.
  src = maskPositionalTranslatorCalls(src);

  for (const name of TRANSLATORS) {
    let result = '';
    let cursor = 0;
    for (;;) {
      const found = src.indexOf(name, cursor);
      if (found < 0) {
        result += src.slice(cursor);
        break;
      }
      // зачем (координатор 12.10): имя ищется подстрокой, и 't(' находилось ВНУТРИ любого имени на «t» — showToast(, alert(,
      // Alert.alert( … — такие вызовы молча считались переводом. Переводчик — только целое имя (до него не буква/цифра/_/$).
      if (/^[A-Za-z_$]/.test(name) && found > 0 && /[A-Za-z0-9_$]/.test(src[found - 1])) {
        result += src.slice(cursor, found + name.length);
        cursor = found + name.length;
        continue;
      }
      result += src.slice(cursor, found);
      const open = src.indexOf('(', found);
      if (open < 0) {
        result += mask(src.slice(found, found + name.length));
        cursor = found + name.length;
        continue;
      }
      let depth = 0;
      let i = open;
      for (; i < src.length; i += 1) {
        if (src[i] === '(') depth += 1;
        else if (src[i] === ')') {
          depth -= 1;
          if (depth === 0) { i += 1; break; }
        }
      }
      result += mask(src.slice(found, i));
      cursor = i;
    }
    src = result;
  }
  // зачем (координатор 12.10): вызов журнала маскируется целиком, с аргументами на следующих строках — stripLegal общий для полного
  // прохода и проверки добавленных строк, поэтому трактовка одна. Правило вызова — тот же DIAGNOSTIC_LOG_CALL плюс помощники файла.
  return maskMultilineLogCalls(maskLocaleKeyedEntries(src, source), source, DIAGNOSTIC_LOG_CALL);
}

/**
 * Построчные записи словаря локалей: `ru: 'текст',` и `uk: 'текст',` на отдельных строках, рядом с ними — ключи других языков.
 *
 * зачем (координатор 12.10, подготовка к английскому интерфейсу): isTranslationDictionary видит только словари вида `const RU = {…}`, а карты
 * `{ ru: '…', uk: '…', en: '…', es: '…' }`, разложенные по строкам, считались «забытым русским» — по 2 ложных срабатывания на каждую запись
 * (PaywallProofCards, ReportErrorButton и др.). Признак перевода тот же, что у INLINE_LOCALE_MAP: рядом (в пределах ±LOCALE_WINDOW строк) есть
 * запись ДРУГОГО языка — не ru/uk. Одинокий `ru:`/`uk:` без соседей-языков остаётся нарушением.
 */
const LOCALE_KEY_ENTRY = /^\s*(?:\{\s*)?['"]?(ru|uk)['"]?\s*:\s*(?:[`'"]|\([^)]*\)\s*=>)/;
const OTHER_LOCALE_ENTRY = /['"]?\b(en|es|pl|tr|vi|id|pt-BR)['"]?\s*:\s*(?:[`'"]|\([^)]*\)\s*=>)/;
const LOCALE_WINDOW = 14;

/**
 * Тост `action_toast`: `messageRu: '…'` / `messageUk: '…'` на отдельных строках объекта.
 * зачем (12.10, английский интерфейс в R1): строже, чем карта ru/uk выше, — переведённым тост считается только при `messageEn` в том же объекте.
 * Иначе тост с es/pl/…, но без en (английский интерфейс показал бы русский) прошёл бы мимо сторожа.
 * Пара строго по виду: `messageRu` требует `messageEn`, `labelRu` (кнопка действия в тосте) — `labelEn`, только В ТОМ ЖЕ объекте/вызове и только
 * с непустым литералом (координатор 12.10): окно ±строк засчитывало перевод соседнего тоста. Разбор — maskToastEntriesWithEnglishInSameObject.
 */
function maskLocaleKeyedEntries(source, original = source) {
  const lines = maskToastEntriesWithEnglishInSameObject(source, original).split('\n');
  const hasOther = lines.map((line) => OTHER_LOCALE_ENTRY.test(line));
  for (let i = 0; i < lines.length; i += 1) {
    if (!LOCALE_KEY_ENTRY.test(lines[i])) continue;
    let neighbour = false;
    for (let j = Math.max(0, i - LOCALE_WINDOW); j <= Math.min(lines.length - 1, i + LOCALE_WINDOW); j += 1) {
      if (j !== i && hasOther[j]) { neighbour = true; break; }
    }
    if (neighbour) lines[i] = lines[i].replace(/[^\r\n]/g, ' ');
  }
  return lines.join('\n');
}

// Строчная пометка исключения с причиной: `// i18n-ok: лог трассировки` (в JSX — блочным комментарием с той же пометкой).
const I18N_OK_MARK = /i18n-ok:\s*\S.{8,}/;
const CYRILLIC_LITERAL = /(['"`])(?:(?!\1)[^\r\n])*[а-яА-ЯёЁ](?:(?!\1)[^\r\n])*\1/g;

function scanFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (CONTENT_FILES.some((re) => re.test(rel))) return null;
  const source = fs.readFileSync(file, 'utf8');
  if (isTranslationDictionary(source)) return null;
  const stripped = stripLegal(source);
  // зачем: обёртки над логгером, объявленные в этом файле (trace/logTide/logCta…), — журнал, как DebugLogger. См. localLogHelperCall.
  const logHelperCall = localLogHelperCall(source);
  // зачем построчно: только так видно, есть ли рядом парный перевод —
  // а он превращает находку в другую проблему, не в эту.
  const hits = [];
  const originalLines = source.split('\n');
  for (const [index, line] of stripped.split('\n').entries()) {
    // зачем (координатор 13.10, владелец «перевести всё», база 91 → 0): служебная строка (лог, причина события, dev-подпись,
    // перевод формами по языкам, который сторож не распознаёт) помечается в ИСХОДНОЙ строке `i18n-ok: <причина>` — причина
    // обязательна (от 10 символов), голая пометка не действует. Так исключение видно в коде и в ревью, а не прячется в базе.
    if (I18N_OK_MARK.test(originalLines[index] ?? '')) continue;
    if (PAIRED_TRANSLATION.test(line)) continue;
    if (INLINE_LOCALE_MAP.test(line)) continue;
    if (DIAGNOSTIC_LOG_CALL.test(line)) continue;
    if (logHelperCall?.test(line)) continue;
    const found = line.match(CYRILLIC_LITERAL);
    if (found) hits.push(...found);
  }
  return hits.length ? { file: rel, count: hits.length, samples: hits.slice(0, 3) } : null;
}

function scan() {
  const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const findings = files.map(scanFile).filter(Boolean);
  findings.sort((a, b) => b.count - a.count);
  return findings;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE)) return null;
  return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
}

/**
 * Файлы, которые реально уходят в этот коммит.
 *
 * зачем (2026-08-16): сторож блокировал коммит за строку, добавленную
 * ПАРАЛЛЕЛЬНОЙ сессией в чужой файл. Дерево общее, и наказывать за чужую
 * работу — верный способ приучить обходить сторожа через --no-verify,
 * после чего он перестаёт защищать вообще.
 */
function stagedUiFiles() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return new Set(out.split('\n').map((line) => line.trim()).filter((line) => line.endsWith('.tsx')));
  } catch {
    return null;
  }
}

/**
 * Непереведённые строки, добавленные ИМЕННО ЭТИМ коммитом.
 *
 * зачем (2026-08-16, владелец): проверки по именам файлов мало. Файл может
 * годами тащить чужой долг — и тогда сторож блокировал любую правку этого
 * файла, даже ту, что строки только УДАЛЯЕТ. На удалении экрана-стены
 * «Нужна безопасная проверка» диф был −168/+20 и ноль новых русских строк,
 * а сторож всё равно отказывал: _layout.tsx числился среди должников.
 *
 * Считаем по «+»-строкам стейджа тем же детектором, что и полное сканирование.
 * Чужой долг в том же файле больше не наказывает; новая непереведённая
 * строка ловится ровно как раньше.
 */
function addedUntranslatedLines() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--unified=0', '--diff-filter=ACMR', '--', '*.tsx'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const hits = [];
    let maskedLines = null;
    let logHelperCall = null;
    let newLineNumber = 0;
    for (const line of out.split('\n')) {
      const fileHeader = line.match(/^\+\+\+ b\/(.+)$/);
      if (fileHeader) {
        const rel = fileHeader[1];
        if (CONTENT_FILES.some((re) => re.test(rel))) {
          maskedLines = null;
          continue;
        }
        const stagedSource = execFileSync('git', ['show', `:${rel}`], {
          cwd: ROOT,
          encoding: 'utf8',
        });
        maskedLines = isTranslationDictionary(stagedSource)
          ? null
          : stripLegal(stagedSource).split('\n');
        logHelperCall = localLogHelperCall(stagedSource);
        continue;
      }

      const hunkHeader = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunkHeader) {
        newLineNumber = Number(hunkHeader[1]);
        continue;
      }

      // Проверяем добавленную строку в маске целого staged-файла. Так комментарии
      // и многострочные triLang-вызовы получают ту же трактовку, что полный scan().
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const added = maskedLines?.[newLineNumber - 1] ?? '';
        // зачем INLINE_LOCALE_MAP здесь тоже: полное сканирование и проверка
        // «добавленных строк» обязаны трактовать код одинаково, иначе сторож
        // молча отказывает на строке, которую сам же считает переведённой.
        if (!PAIRED_TRANSLATION.test(added)
          && !INLINE_LOCALE_MAP.test(added)
          && !DIAGNOSTIC_LOG_CALL.test(added)
          && !logHelperCall?.test(added)) {
          const found = added.match(CYRILLIC_LITERAL);
          if (found) hits.push(...found);
        }
        newLineNumber += 1;
        continue;
      }
      if (!line.startsWith('-') && !line.startsWith('\\')) newLineNumber += 1;
    }
    return hits;
  } catch {
    return null;
  }
}

const args = new Set(process.argv.slice(2));
const findings = scan();
const total = findings.reduce((sum, f) => sum + f.count, 0);

if (args.has('--report')) {
  console.log(`Файлов с непереведёнными строками: ${findings.length}, строк всего: ${total}\n`);
  for (const f of findings.slice(0, Number(process.env.I18N_REPORT_LIMIT) || 25)) {
    console.log(`${String(f.count).padStart(4)}  ${f.file}`);
    for (const s of f.samples) console.log(`      ${s.slice(0, 90)}`);
  }
  process.exit(0);
}

if (args.has('--update')) {
  const previous = readBaseline();
  // зачем только вниз: база — это храповик. Разрешить ей расти значит
  // разрешить узаконивать новые нарушения одной командой.
  if (previous && total > previous.total) {
    console.error(`ОТКАЗ: сейчас ${total}, в базе ${previous.total}. База двигается только вниз.`);
    console.error('Сначала почини новые места, потом фиксируй.');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify({
    total,
    files: findings.length,
    updatedAt: new Date().toISOString().slice(0, 10),
    note: 'Храповик: число может только уменьшаться. Обновлять через --update.',
  }, null, 2)}\n`, 'utf8');
  console.log(`База зафиксирована: ${total} строк в ${findings.length} файлах.`);
  process.exit(0);
}

const baseline = readBaseline();
if (!baseline) {
  console.error('Базы нет. Создай: node scripts/scan_untranslated_ui.mjs --update');
  process.exit(1);
}

if (total > baseline.total) {
  // зачем разделять свой и чужой рост: дерево общее, параллельные сессии
  // пишут в него одновременно. Блокировать коммит за чужую строку — верный
  // способ приучить обходить сторожа, после чего он не защищает вообще.
  const staged = args.has('--staged') ? stagedUiFiles() : null;
  const mine = staged
    ? findings.filter((f) => staged.has(f.file))
    : findings;

  if (staged && mine.length === 0) {
    console.log(`Непереведённых стало больше (${total} против ${baseline.total}),`);
    console.log('но ни один из этих файлов не в твоём коммите — пропускаю.');
    console.log('Кто-то работает в этом же дереве параллельно.');
    process.exit(0);
  }

  // Файл в коммите есть, но что именно ты в него добавил? Если ни одной новой
  // непереведённой строки — долг чужой, наказывать не за что.
  if (staged && mine.length > 0) {
    const added = addedUntranslatedLines();
    if (added !== null && added.length === 0) {
      console.log(`Непереведённых стало больше (${total} против ${baseline.total}),`);
      console.log('но твой диф не добавил ни одной непереведённой строки — пропускаю.');
      console.log(`Чужой долг в этих файлах: ${mine.map((f) => f.file).join(', ')}.`);
      process.exit(0);
    }
  }

  console.error(`ОТКАЗ: непереведённых строк стало больше — ${total}, было ${baseline.total}.`);
  console.error('');
  console.error('Русский текст в UI виден ВСЕМ не-русскоязычным пользователям.');
  console.error('Оберни новые строки в triLang, а не двигай базу вверх.');
  if (staged && mine.length > 0) {
    console.error('');
    console.error('В твоём коммите:');
    for (const f of mine.slice(0, 5)) console.error(`  ${f.file} — ${f.count}`);
  }
  console.error('');
  console.error('Где именно: node scripts/scan_untranslated_ui.mjs --report');
  process.exit(1);
}

if (total < baseline.total) {
  console.log(`Стало лучше: ${total} против ${baseline.total} в базе.`);
  console.log('Зафиксируй: node scripts/scan_untranslated_ui.mjs --update');
  process.exit(0);
}

console.log(`OK: ${total} непереведённых строк, как в базе.`);
