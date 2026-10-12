#!/usr/bin/env node
/**
 * Сторож «число + существительное вне помощника склонения» на экранах R1.
 *
 * зачем (координатор 12.10): экраны писали «Удалить 3 карточек?», «1 дней», «+1 карточек скрыто» — число подставлялось в фиксированную форму множественного числа.
 * Склонять надо через constants/plural.ts (pluralWithCount / pluralWord / pluralFormFor). Скрипт ищет в исходниках экранов R1 шаблоны `${выражение} слово` с
 * существительными-счётными словами (ru/uk/pl/en/es/pt-BR) и сообщает те, что не обёрнуты помощником. Языки без форм числа (vi/id/tr) не проверяются.
 *
 * Использование:  node scripts/scan_number_noun_pairs.mjs [--report] [--json]
 * Код выхода 1, если находки вне разрешённого списка (config/number-noun-allowlist.json — «файл:подстрока строки» с причиной). Файлы Ядра/Авторизации в выводе помечены.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_PATH = path.join(ROOT, 'config', 'number-noun-allowlist.json');

/** Экраны R1: Карточки, Диалоги, Шпиль, Пейволы, Главная, Настройки (+ их компоненты). */
export const R1_PATTERNS = [
  /^app\/flashcards[^/]*\.tsx?$/, /^app\/flashcards\//, /^app\/community_pack[^/]*\.tsx?$/, /^app\/community_packs\//, /^components\/cards-grid\//, /^components\/packs\//,
  /^components\/dialogs\//, /^app\/dialogue_v2[^/]*\.tsx?$/, /^app\/ai_dialog[^/]*\.tsx?$/,
  /^components\/spire\//, /^app\/spire[^/]*\.tsx?$/, /^modules\/spire\//,
  /^components\/paywall\//, /^app\/paywall[^/]*\.tsx?$/, /^app\/premium[^/]*\.tsx?$/, /^app\/manage_subscription\.tsx$/,
  /^app\/\(tabs\)\/(home|settings)\.tsx$/, /^components\/home\//, /^app\/settings[^/]*\.tsx?$/, /^app\/privacy_settings\.tsx$/, /^app\/support_report\.tsx$/,
];

/** Файлы, которые ведут другие сессии: в выводе только список (правит владелец). */
export const OTHER_OWNER = [
  { rx: /^(components\/spire\/|app\/spire|modules\/spire\/)/, owner: 'Ядро/Темы (Шпиль)' },
  { rx: /^(app\/(auth|account|onboarding)|components\/(CleanOnboarding|auth))/, owner: 'Авторизация' },
];

const NOUNS = [
  // ru
  'карточ\\p{L}*', 'слов\\p{L}*', 'дн(?:ей|я)', 'день', 'монет\\p{L}*', 'реплик\\p{L}*', 'ступен\\p{L}*', 'урок\\p{L}*', 'минут\\p{L}*', 'секунд\\p{L}*', 'час(?:а|ов)?', 'раз(?:а)?', 'ошибк\\p{L}*', 'ошибок',
  'попыт\\p{L}*', 'вопрос\\p{L}*', 'набор\\p{L}*', 'фраз\\p{L}*', 'друз\\p{L}*', 'очк\\p{L}*', 'осколк\\p{L}*', 'рун\\p{L}*', 'задани\\p{L}*', 'диалог\\p{L}*', 'ролик\\p{L}*', 'недел\\p{L}*', 'месяц\\p{L}*',
  // uk
  'картк\\p{L}*', 'карток', 'слів', 'днів', 'дні', 'реплік', 'ступен\\p{L}*', 'уроків', 'хвилин\\p{L}*', 'годин\\p{L}*', 'разів', 'помилк\\p{L}*', 'помилок', 'спроб\\p{L}*', 'питан\\p{L}*', 'фраз\\p{L}*', 'друзів',
  // pl
  'kart(?:y|ę|a)?', 'słów', 'słowa', 'dni', 'monet\\p{L}*', 'replik\\p{L}*', 'stopni\\p{L}*', 'lekcj\\p{L}*', 'minut\\p{L}*', 'sekund\\p{L}*', 'godzin\\p{L}*', 'błęd\\p{L}*', 'prób\\p{L}*', 'pytań', 'zestaw\\p{L}*', 'fraz\\p{L}*',
  // en / es / pt
  'cards?', 'words?', 'days?', 'coins?', 'replies', 'reply', 'steps?', 'lessons?', 'minutes?', 'seconds?', 'hours?', 'times', 'mistakes?', 'attempts?', 'questions?', 'packs?', 'phrases?', 'friends?', 'points?',
  'tarjetas?', 'palabras?', 'd[ií]as?', 'monedas?', 'lecciones', 'minutos?', 'segundos?', 'horas?', 'errores', 'intentos?', 'preguntas?',
  'cartões', 'cartão', 'palavras?', 'dias?', 'moedas?', 'lições', 'minutos?', 'segundos?', 'horas?', 'erros', 'tentativas?', 'perguntas?',
];
const NOUN_RX = new RegExp(`\\$\\{[^}]+\\}\\s+(?:${NOUNS.join('|')})(?![\\p{L}])`, 'iu');
const HELPER_RX = /pluralWithCount|pluralWord|pluralFormFor|spirePlural|Plural/;
/** Строки журнала и служебные: человек их не видит. */
const NON_UI_RX = /console\.|DebugLogger|logPublish|logger\.|trace\(|throw new |\[[A-Z][A-Z0-9-]+\]|identityTrace|noteSwallowed/;
/** Языки без форм числа (vi/id/tr): слово после числа не меняется — пропускаем строки, начинающиеся с этих ключей. */
const NO_PLURAL_LANG_RX = /^\s*(?:vi|id|tr):/;
/** JSX-текст «{count} слов» и конкатенация «n + ' карточек'» — тот же дефект без шаблонной строки. */
const JSX_NOUN_RX = new RegExp(`\\{[^{}]+\\}\\s+(?:${NOUNS.join('|')})(?![\\p{L}])`, 'iu');
const CONCAT_NOUN_RX = new RegExp(`\\+\\s*['"]\\s*(?:${NOUNS.join('|')})(?![\\p{L}])`, 'iu');
export const matchesNounPair = (line) => NOUN_RX.test(line) || (/<Text|<\/Text|>\s*\{/.test(line) && JSX_NOUN_RX.test(line)) || CONCAT_NOUN_RX.test(line);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.expo', '_archive', '.claude', '.codex-tmp', 'tests', 'docs'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

export function scan() {
  const allow = fs.existsSync(ALLOWLIST_PATH) ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8')).entries ?? [] : [];
  const findings = [];
  for (const top of ['app', 'components', 'modules']) {
    if (!fs.existsSync(path.join(ROOT, top))) continue;
    for (const file of walk(path.join(ROOT, top))) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (!R1_PATTERNS.some((rx) => rx.test(rel))) continue;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (!matchesNounPair(line) || HELPER_RX.test(line) || NON_UI_RX.test(line) || NO_PLURAL_LANG_RX.test(line)) return;
        if (allow.some((a) => a.file === rel && line.includes(a.contains))) return;
        const owner = OTHER_OWNER.find((o) => o.rx.test(rel))?.owner ?? null;
        findings.push({ file: rel, line: i + 1, text: line.trim().slice(0, 220), owner });
      });
    }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = scan();
  if (process.argv.includes('--json')) console.log(JSON.stringify(findings, null, 2));
  else {
    for (const f of findings) console.log(`${f.file}:${f.line}${f.owner ? ` [${f.owner}]` : ''}  ${f.text}`);
    console.log(`\n${findings.length} находок «число + существительное без помощника склонения»`);
  }
  process.exit(findings.length > 0 ? 1 : 0);
}
