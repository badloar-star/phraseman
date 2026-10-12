// зачем (координатор 12.10: «три случая „робот писал в прод“ за день — хватит ловить глазами»): каждая ссылка робота из
// docs/phraseman-2.0/DEV_LINKS_R1.md, чьи шаги ведут к записи в прод (сессия Диалога, свободный разговор, публикация набора,
// отклик, жалоба, лайк, «добавить себе», заявка в друзья, промокод, обращение, удаление аккаунта, согласия, очистка памяти
// Диалогов), обязана нести dev-флаг, который подменяет эту запись в памяти (DEV_SWITCHES_R1_CORE.md). Иначе — красный.
//
// PENDING_FIX — строки, найденные сторожем при введении и переданные Макетам на правку; сторож требует, чтобы они ВСЁ ЕЩЁ
// нарушали правило: после правки строку нужно убрать из списка (иначе список тихо устареет).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LINKS_DOC = path.join(ROOT, 'docs', 'phraseman-2.0', 'DEV_LINKS_R1.md');

/** Строки таблицы: id, ссылка (без префикса), шаги робота. */
export function parseDevLinksRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('| ') || line.startsWith('| id ') || line.startsWith('|---')) continue;
    const id = line.slice(2).split(' | ')[0].trim();
    const link = (line.match(/`phraseman:\/\/dev_state\?([^`]+)`/) || [])[1] || '';
    const steps = (line.match(/`((?:tap|long|type|swipe-left|see|wait|back|settle)[:][^`]*)`/) || [])[1] || '';
    if (link) rows.push({ id, link, steps });
  }
  return rows;
}

const param = (link, key) => new RegExp(`(?:^|&)${key}=([^&]+)`).exec(link)?.[1] ?? null;
const nextRoute = (link) => decodeURIComponent(param(link, 'next') ?? '');

/**
 * Правила: `applies` — шаги/маршрут ведут к записи в прод; `safe` — есть dev-флаг, подменяющий запись в памяти.
 * Каждое правило называет, ЧТО ушло бы в прод, чтобы отказ сторожа объяснял себя сам.
 */
export const RULES = [
  {
    name: 'сессия Диалога (старт/ход/итог на сервере)',
    applies: (r) => /dialogue-v2-briefing-start|dialogue-v2-session-send|dialogue-v2-session-menu-complete/.test(r.steps),
    safe: (r) => param(r.link, 'dev_dialog_send') !== null,
    fix: 'добавить dev_dialog_send=ok',
  },
  {
    name: 'свободный разговор (сессия на сервере)',
    applies: (r) => nextRoute(r.link).startsWith('/dialogue_v2_freeform'),
    safe: (r) => param(r.link, 'dev_dialog_send') !== null,
    fix: 'добавить dev_dialog_send=ok',
  },
  {
    name: 'публикация набора',
    applies: (r) => /#fc-pack-publish|#ugc-pack-save/.test(r.steps),
    safe: (r) => /^(?:private|few)$/.test(param(r.link, 'packdraft') ?? '')
      || /(?:^|,)(?:publish_error|publish_daily_limit)(?:,|$)/.test(param(r.link, 'fail') ?? '')
      // предохранитель publishLocalAuthorPack: демо-наборы dev_state из dev не публикуются никогда
      || /pack=local_pack_dev_demo/.test(nextRoute(r.link)),
    fix: 'packdraft=private|few или fail=publish_error',
  },
  {
    name: 'отклик / жалоба / лайк / «Добавить себе» под набором сообщества',
    applies: (r) => /#pack-comment-send|#pack-like-|#pack-add-|Отправить жалобу|#flashcards-pack-add/.test(r.steps),
    safe: (r) => param(r.link, 'packcards') !== null
      || /(?:^|,)pack_write(?:,|$)/.test(param(r.link, 'fail') ?? ''),
    fix: 'packcards=on (+ community=reset) — демо-наборы без сети',
  },
  {
    name: 'заявка в друзья',
    applies: (r) => /#friends-add-found|#friends-accept|#friends-request-accept/.test(r.steps),
    safe: (r) => /type:DEVFND/.test(r.steps) || param(r.link, 'dev_friends_fail') !== null || param(r.link, 'dev_friends_hold') !== null,
    fix: 'код друга DEVFND или dev_friends_fail/hold',
  },
  {
    name: 'активация промокода',
    applies: (r) => /#promo-code-submit/.test(r.steps),
    safe: (r) => param(r.link, 'promo') !== null,
    fix: 'promo=<исход>',
  },
  {
    name: 'обращение в поддержку',
    applies: (r) => nextRoute(r.link).startsWith('/support_report') && /Отправить|#support-send/.test(r.steps),
    safe: (r) => /^(?:sent|fail)$/.test(param(r.link, 'support') ?? ''),
    fix: 'support=sent|fail',
  },
  {
    name: 'удаление аккаунта',
    applies: (r) => /#delete-account-confirm/.test(r.steps),
    safe: (r) => /^(?:fail|throw)$/.test(param(r.link, 'delete') ?? ''),
    fix: 'delete=fail|throw',
  },
  {
    name: 'согласия (запись в user_consents)',
    applies: (r) => /consent-switch/.test(r.steps),
    safe: (r) => param(r.link, 'robot_no_cloud') === '1',
    fix: 'robot_no_cloud=1',
  },
  {
    name: 'очистка памяти Диалогов',
    applies: (r) => /#dialogue-v2-memory-clear-dialog-confirm/.test(r.steps),
    safe: (r) => param(r.link, 'dev_dialog_memory') !== null,
    fix: 'dev_dialog_memory=demo|clearing|clear_fail',
  },
];

/** Найдено сторожем 12.10 (Ядро) и передано Макетам; убрать строку из списка после правки ссылки. */
const PENDING_FIX = new Map([
  ['dialogs-009', 'старт сессии без dev_dialog_send (aiConsent=off)'],
  ['dialogs-011', 'старт сессии без dev_dialog_send (energy=0)'],
  ['dialogs-gap-017', 'старт сессии без dev_dialog_send (dev_energy_fail=1)'],
  ['dialogs-gap-009', 'свободный разговор без dev_dialog_send (hold=freeform_loading — старт сессии всё равно идёт)'],
  ['dialogs-gap-010', 'свободный разговор без dev_dialog_send (Free)'],
  ['cards-070', '«Сохранить» нового набора без packdraft/fail=publish_error'],
]);

export function findProdWriteViolations(rows) {
  const out = [];
  for (const row of rows) {
    for (const rule of RULES) {
      if (rule.applies(row) && !rule.safe(row)) out.push({ id: row.id, rule: rule.name, fix: rule.fix });
    }
  }
  return out;
}

test('DEV_LINKS_R1: таблица разбирается (ссылки есть)', () => {
  const rows = parseDevLinksRows(fs.readFileSync(LINKS_DOC, 'utf8'));
  assert.ok(rows.length > 300, `ожидалось больше 300 ссылок, разобрано ${rows.length}`);
});

test('DEV_LINKS_R1: ни одна ссылка не пишет в прод без dev-флага', () => {
  const violations = findProdWriteViolations(parseDevLinksRows(fs.readFileSync(LINKS_DOC, 'utf8')));
  const fresh = violations.filter((v) => !PENDING_FIX.has(v.id));
  assert.deepEqual(
    fresh.map((v) => `${v.id}: ${v.rule} → ${v.fix}`),
    [],
    'ссылки робота ведут к записи в прод без подмены — добавьте флаг (см. docs/phraseman-2.0/DEV_SWITCHES_R1_CORE.md)',
  );
});

test('DEV_LINKS_R1: список PENDING_FIX не устарел (исправленные строки убрать)', () => {
  const violating = new Set(findProdWriteViolations(parseDevLinksRows(fs.readFileSync(LINKS_DOC, 'utf8'))).map((v) => v.id));
  const stale = [...PENDING_FIX.keys()].filter((id) => !violating.has(id));
  assert.deepEqual(stale, [], 'эти строки уже исправлены — уберите их из PENDING_FIX');
});

test('правила ловят известные случаи «робот писал в прод» (12.10)', () => {
  const caught = findProdWriteViolations([
    { id: 'x1', link: 'plus=off&next=/ai_dialog_home', steps: 'tap:#dialogue-v2-briefing-start' },
    { id: 'x2', link: 'plus=on&next=/dialogue_v2_freeform', steps: '' },
    { id: 'x3', link: 'next=/flashcards_collection?pack=abc', steps: 'tap:#pack-like-abc' },
    { id: 'x4', link: 'cards=demo&next=/community_pack_create', steps: 'tap:#ugc-pack-save' },
  ]).map((v) => v.id);
  assert.deepEqual(caught, ['x1', 'x2', 'x3', 'x4']);
  const clean = findProdWriteViolations([
    { id: 'ok1', link: 'dev_dialog_send=ok&next=/ai_dialog_home', steps: 'tap:#dialogue-v2-briefing-start' },
    { id: 'ok2', link: 'packcards=on&community=reset&next=/x', steps: 'tap:#pack-like-dev_demo_community_2' },
    { id: 'ok3', link: 'packdraft=private&next=/community_pack_create', steps: 'tap:#ugc-pack-save' },
  ]);
  assert.deepEqual(clean, []);
});
