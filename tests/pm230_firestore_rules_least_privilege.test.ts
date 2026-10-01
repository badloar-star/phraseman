/**
 * PM-230 (A2) — «минимальные права без отключения защиты ради скорости».
 *
 * зачем: firestore.rules на ~440 блоков растёт годами; одно случайное
 * `allow write: if true` или `if request.auth != null` на записи отдаёт базу
 * любому вошедшему. firestore_rules_security.test.ts сторожит конкретные
 * формулировки; этот тест сторожит ОБЩУЮ ФОРМУ прав, чтобы расширение доступа
 * нельзя было сделать молча:
 *   1. запись (create/update/delete/write) никогда не открыта `true` или голым
 *      `request.auth != null`;
 *   2. публичное чтение (`if true`) — только из явного списка (прогретый кэш
 *      объяснений и агрегат процентилей);
 *   3. чтение «любым вошедшим» — только из списка, который может лишь сокращаться;
 *   4. isAdmin() = claim `admin == true` (не роль из документа и не клиентское поле);
 *   5. последний блок — запрет по умолчанию `/{document=**}`.
 * Данные остаются авторитетными по D66 (local-first): правила не заставляют
 * сервер пересчитывать монеты/ранг, они лишь не дают чужим клиентам писать
 * чужое.
 */
import { readFileSync } from 'fs';
import path from 'path';

const PUBLIC_READ_ALLOWED = new Set([
  '/leaderboard_stats/{docId}',
  '/phrase_explanations/{phraseHash}',
  '/choice_explanations/{choiceHash}',
]);

// Только сокращать. Новые записи сюда не добавлять: давай доступ по владельцу/дружбе/админу.
// Часть строк — коллекции удалённой Арены/Лиг: уйдут из правил вместе с деплоем 2.0 (D91).
const AUTHED_READ_NO_OWNER_ALLOWED = new Set([
  '/referral_codes/{code}',
  '/leaderboard/{userId}',
  '/top_helpers/{userId}',
  '/public_profiles/{userId}',
  '/video_save_counts/{docId}',
  '/users/{userId}/activity_like_stats/{docId}',
  '/user_warnings/{docId}',
  '/remote_config/{docId}',
  '/config/spire_v1',
  '/video_phrase_sets/{videoId}',
  '/app_messages/{messageId}',
  '/daily_polls/{dateKey}',
  '/daily_phrases/{phraseId}',
  '/daily_phrase_save_counts/{phraseId}',
  '/name_index/{nameKey}',
  '/friend_code_index/{code}',
  '/users/{ownerUid}/friend_auth_edges/{readerAuthUid}',
  '/league_groups/{groupId}',
  '/spire_groups/{groupId}',
  '/app_meta/{docId}',
  '/community_packs/{packId}',
  '/pack_likes/{likeUserId}',
  '/pack_adds/{addUserId}',
  '/pack_comments/{commentId}',
  '/league_chest_events/{eventId}',
  '/league_crowns/{crownId}',
  '/tournamentSchedule/{docId}',
  '/tournamentSeasons/{weekId}',
  '/entries/{uid}',
  '/tournamentBank/{docId}',
  '/botProfiles/{botId}',
]);

interface Allow { path: string; ops: string; expr: string }

function loadRules(): string {
  const raw = readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
  // строчные комментарии первыми (см. firestore_rules_security.test.ts: «/*» внутри // ломал разбор)
  return raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
}

function parseAllows(src: string): Allow[] {
  const out: Allow[] = [];
  const re = /match\s+(\/\S+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const open = src.indexOf('{', m.index + m[0].length - 1);
    let depth = 1;
    let i = open + 1;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') depth -= 1;
      i += 1;
    }
    const body = src.slice(open + 1, i - 1).replace(/match\s+[^{]+\{[\s\S]*?\n\s*\}\s*(?=\n)/g, '');
    for (const a of body.matchAll(/allow\s+([a-z, ]+?)\s*:\s*if\s+([\s\S]*?);/g)) {
      out.push({ path: m[1]!, ops: a[1]!.replace(/\s+/g, ''), expr: a[2]!.replace(/\s+/g, ' ').trim() });
    }
  }
  return out;
}

const isWrite = (ops: string): boolean => ops.split(',').some((o) => ['write', 'create', 'update', 'delete'].includes(o));
const isRead = (ops: string): boolean => ops.split(',').some((o) => ['read', 'get', 'list'].includes(o));

describe('PM-230 firestore.rules: форма минимальных прав', () => {
  const src = loadRules();
  const allows = parseAllows(src);

  it('разбор нашёл правила (защита от пустого прохода)', () => {
    expect(allows.length).toBeGreaterThan(400);
  });

  it('ни одна запись не открыта через `true` или голый request.auth != null', () => {
    const bad = allows
      .filter((a) => isWrite(a.ops) && (a.expr === 'true' || /^request\.auth\s*!=\s*null$/.test(a.expr)))
      .map((a) => `${a.path} [${a.ops}] if ${a.expr}`);
    expect(bad).toEqual([]);
  });

  it('публичное чтение (`if true`) — только из явного списка', () => {
    const found = new Set(allows.filter((a) => isRead(a.ops) && a.expr === 'true').map((a) => a.path));
    const extra = [...found].filter((p) => !PUBLIC_READ_ALLOWED.has(p));
    expect(extra).toEqual([]);
  });

  it('чтение любым вошедшим — только из списка, и список не устаревает', () => {
    const found = new Set(
      allows.filter((a) => isRead(a.ops) && /^request\.auth\s*!=\s*null$/.test(a.expr)).map((a) => a.path),
    );
    const extra = [...found].filter((p) => !AUTHED_READ_NO_OWNER_ALLOWED.has(p));
    const stale = [...AUTHED_READ_NO_OWNER_ALLOWED].filter((p) => !found.has(p));
    expect({ extra, stale }).toEqual({ extra: [], stale: [] });
  });

  it('isAdmin() опирается на claim admin == true из токена', () => {
    const m = src.match(/function isAdmin\(\)\s*\{([\s\S]*?)\n\s*\}/);
    expect(m).not.toBeNull();
    const body = m![1]!.replace(/\s+/g, ' ');
    expect(body).toContain('request.auth != null');
    expect(body).toContain("request.auth.token.keys().hasAny(['admin'])");
    expect(body).toContain('request.auth.token.admin == true');
    expect(body).not.toMatch(/get\(|exists\(|resource\.data/);
  });

  it('последний блок — запрет по умолчанию', () => {
    const tail = src.slice(src.lastIndexOf('match /{document=**}')).replace(/\s+/g, ' ');
    expect(tail).toMatch(/^match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
  });
});
