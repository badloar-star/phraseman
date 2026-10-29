# Конкурс «Набор месяца»: исправления до старта 1.11 — передача Codex (Ядро, 29.10)

Решения владельца 29.10 ~09:30 (через координатора). Код конкурса сейчас **незакоммичен у Codex**
(`functions/src/community_month_contest.ts`, `community_contest_identity.ts`, `shared/community_month_contest.ts`,
`firestore.rules`, `firestore.indexes.json`, `functions/src/index.ts` — `??`/`M`). Поэтому здесь готовый патч, а не коммит.
Если файлы закоммитят до 1.11 — Ядро вносит его само. Выкладка — только по «да» владельца
(`scripts/deploy_from_clean_head.sh --only …`, правила раньше функций).

## 0. Что меняется (коротко)

| # | Решение владельца | Сейчас | После патча |
|---|---|---|---|
| 1 | Участвуют только наборы, созданные в текущем месяце (решение 26.10) | все наборы с `publishedAt < конец месяца` | `publishedAt` ∈ [начало, конец) месяца |
| 2 | Голос засчитывается от аккаунта ≥3 дней | любой вошедший | возраст аккаунта на момент голоса ≥ 72 ч |
| 3 | …с ≥1 пройденным уроком | нет | `lessons_completed ≥ 1` (классика) **или** ≥1 завершённая сессия V2 — см. вопрос 1 |
| 4 | До 10 голосов в месяц | без лимита | у каждого голосующего засчитываются 10 самых ранних действующих голосов месяца |
| 5 | Места — снимок раз в N часов, не обход на каждое открытие | на каждое открытие обход ВСЕХ наборов + запрос голосов по каждому | один документ `community_month_standings/{yyyy-mm}`, пересчёт раз в 3 ч |
| 6 | В правилах строка «Apple и Google не спонсоры конкурса» | нет | текст в шторке «Условия участия» (клиент, Codex) |
| 7 | Тексты на 9 языках | ru и en, остальным en | заявка Переводчику (раздел 6) |

**Почему правила Firestore для голосов НЕ ужесточаются.** Сборки 147/148 уже у людей. Лайк и голос пишутся одним пакетом
(`communityContestVoteMatches`), и если запретить голос на старый набор или голос «молодого» аккаунта, у этих людей
перестанут проходить сами лайки. Поэтому лайк остаётся лайком, а условия 1–4 применяются **при подсчёте на сервере**.
Если голос не засчитан, человек ничего не теряет, кроме места в рейтинге. Причина пишется в статистику снимка.

## 1. Новый чистый модуль подсчёта — `functions/src/community_month_tally.ts`

Чистая функция без Firestore: её и проверяют тесты, и зовут снимок и финализация.

```ts
// Подсчёт «Набора месяца» по правилам владельца 29.10. Чистая функция: ни Firestore, ни времени — всё во входе.
import type { ContestEntry, ContestMonth } from '../../shared/community_month_contest';

export const CONTEST_MIN_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000;
export const CONTEST_MIN_LESSONS = 1;
export const CONTEST_MAX_VOTES_PER_MONTH = 10;
export const CONTEST_RULE_VERSION = 3;

export type TallyPack = Readonly<{ id: string; authorId: string; title: string; publishedAtMs: number; status: string }>;
export type TallyVote = Readonly<{ packId: string; voterId: string; liked: boolean; atMs: number; voteId: string }>;
export type TallyVoter = Readonly<{ createdAtMs: number | null; lessonsCompleted: number }>;
export type TallyStats = Readonly<{
  packs: number; votesRead: number; counted: number;
  excluded: Readonly<{ outsideMonth: number; self: number; unliked: number; unknownVoter: number; tooYoung: number; noLesson: number; overCap: number; packNotEligible: number }>;
}>;

export function tallyContestMonth(input: Readonly<{
  month: ContestMonth; packs: readonly TallyPack[]; votes: readonly TallyVote[]; voters: ReadonlyMap<string, TallyVoter>;
}>): { entries: ContestEntry[]; stats: TallyStats } {
  const { month } = input;
  const ex = { outsideMonth: 0, self: 0, unliked: 0, unknownVoter: 0, tooYoung: 0, noLesson: 0, overCap: 0, packNotEligible: 0 };
  // правило 1: только наборы, опубликованные в этом месяце
  const packs = new Map(input.packs
    .filter((p) => p.publishedAtMs >= month.startMs && p.publishedAtMs < month.endMs && ['published', 'update_pending'].includes(p.status))
    .map((p) => [p.id, p]));
  // последнее состояние голоса (пакет, голосующий) внутри месяца
  const latest = new Map<string, TallyVote>();
  for (const v of input.votes) {
    if (v.atMs < month.startMs || v.atMs >= month.endMs) { ex.outsideMonth += 1; continue; }
    const key = `${v.packId}\u0000${v.voterId}`;
    const prev = latest.get(key);
    if (!prev || v.atMs > prev.atMs || (v.atMs === prev.atMs && v.voteId > prev.voteId)) latest.set(key, v);
  }
  // допуск голосующего (правила 2–3), затем лимит 10 на человека (правило 4) — по времени, стабильно
  const byVoter = new Map<string, TallyVote[]>();
  for (const v of latest.values()) {
    const pack = packs.get(v.packId);
    if (!pack) { ex.packNotEligible += 1; continue; }
    if (!v.liked) { ex.unliked += 1; continue; }
    if (v.voterId === pack.authorId) { ex.self += 1; continue; }
    const voter = input.voters.get(v.voterId);
    if (!voter) { ex.unknownVoter += 1; continue; }
    if (voter.createdAtMs == null || v.atMs - voter.createdAtMs < CONTEST_MIN_ACCOUNT_AGE_MS) { ex.tooYoung += 1; continue; }
    if (voter.lessonsCompleted < CONTEST_MIN_LESSONS) { ex.noLesson += 1; continue; }
    byVoter.set(v.voterId, [...(byVoter.get(v.voterId) ?? []), v]);
  }
  const hearts = new Map<string, number>();
  let counted = 0;
  for (const list of byVoter.values()) {
    const sorted = [...list].sort((a, b) => a.atMs - b.atMs || (a.packId < b.packId ? -1 : 1));
    sorted.slice(CONTEST_MAX_VOTES_PER_MONTH).forEach(() => { ex.overCap += 1; });
    for (const v of sorted.slice(0, CONTEST_MAX_VOTES_PER_MONTH)) { hearts.set(v.packId, (hearts.get(v.packId) ?? 0) + 1); counted += 1; }
  }
  const entries: ContestEntry[] = [...packs.values()].map((p) => ({
    id: p.id, authorId: p.authorId, title: p.title, hearts: hearts.get(p.id) ?? 0, publishedAtMs: p.publishedAtMs, status: p.status,
  }));
  return { entries, stats: { packs: packs.size, votesRead: input.votes.length, counted, excluded: ex } };
}
```

Заметка: «самые ранние 10» считаются по времени **последнего** изменения голоса (`updatedAt`): так устроена
запись `contest_votes`. Снял и снова поставил лайк — голос уходит в конец очереди. Больше 10 действующих
голосов одновременно у человека не бывает.

## 2. `community_month_contest.ts` — сборщик, снимок, рейтинг

### 2.1 Сборщик вместо `readEntries` (тот же для снимка и финализации)

```ts
import { tallyContestMonth, CONTEST_RULE_VERSION, type TallyVote, type TallyVoter } from './community_month_tally';
import { parseAccountCreatedAtMs } from './progress_events';
const STANDINGS = 'community_month_standings';
const LOG = '[CONTEST-TALLY]';

function lessonsCompleted(progress: Record<string, unknown>): number {
  const direct = Math.trunc(Number(progress.lessons_completed ?? 0));
  if (Number.isFinite(direct) && direct > 0) return direct;
  const completed = progress.completed_lessons;
  if (Array.isArray(completed)) return completed.length;
  if (completed && typeof completed === 'object') return Object.keys(completed).length;
  return 0; // + поле завершённых сессий V2 — вопрос 1
}

async function buildMonthTally(db: FirebaseFirestore.Firestore, month: ContestMonth) {
  const startedAt = Date.now();
  // правило 1 прямо в запросе: только наборы этого месяца (раньше — все наборы за всю историю)
  const packSnap = await db.collection('community_packs')
    .where('publishedAt', '>=', month.startMs).where('publishedAt', '<', month.endMs).orderBy('publishedAt').limit(2000).get();
  // голоса месяца ОДНИМ запросом по группе коллекций (раньше — запрос на каждый набор)
  const voteSnap = await db.collectionGroup('contest_votes').where('monthId', '==', month.id).limit(20000).get();
  const identities = new Map<string, Promise<string | null>>();
  const canonical = (uid: string) => { if (!identities.has(uid)) identities.set(uid, contestCanonicalOwner(db, uid)); return identities.get(uid)!; };
  const packs = [];
  for (const doc of packSnap.docs) {
    const d = doc.data();
    const authorId = String(d.authorStableId ?? d.authorId ?? '');
    if (!authorId || d.videoId || d.removedByAuthor) continue;
    const owner = await canonical(authorId);
    if (!owner) { console.warn(`${LOG} pack_skip`, JSON.stringify({ packId: doc.id, reason: 'author_unresolved' })); continue; }
    packs.push({ id: doc.id, authorId: owner, title: String(d.title ?? d.titleRu ?? ''), publishedAtMs: Number(d.publishedAt), status: String(d.listingStatus) });
  }
  const votes: TallyVote[] = [];
  for (const doc of voteSnap.docs) {
    const v = doc.data();
    const voterId = await canonical(String(v.userId ?? ''));
    if (!voterId) continue;
    votes.push({ packId: doc.ref.parent.parent!.id, voterId, liked: v.liked === true, atMs: typeof v.updatedAt?.toMillis === 'function' ? v.updatedAt.toMillis() : 0, voteId: doc.id });
  }
  // профили голосующих — getAll пачками по 300 (одно чтение на человека, не на голос)
  const voterIds = [...new Set(votes.map((v) => v.voterId))];
  const voters = new Map<string, TallyVoter>();
  for (let i = 0; i < voterIds.length; i += 300) {
    const snaps = await db.getAll(...voterIds.slice(i, i + 300).map((id) => db.collection('users').doc(id)));
    for (const s of snaps) {
      const data = s.data() ?? {};
      let createdAtMs = parseAccountCreatedAtMs(data.created_at);
      if (createdAtMs == null) {
        // зачем: у старых аккаунтов created_at бывает пуст — берём дату создания в Firebase Auth, а не отказываем молча
        try { createdAtMs = Date.parse((await admin.auth().getUser(s.id)).metadata.creationTime) || null; }
        catch (e) { console.warn(`${LOG} voter_age_unknown`, JSON.stringify({ reason: e instanceof Error ? e.message.slice(0, 80) : 'unknown' })); }
      }
      voters.set(s.id, { createdAtMs, lessonsCompleted: lessonsCompleted((data.progress ?? {}) as Record<string, unknown>) });
    }
  }
  const result = tallyContestMonth({ month, packs, votes, voters });
  console.log(`${LOG} built`, JSON.stringify({ monthId: month.id, ms: Date.now() - startedAt, packsRead: packSnap.size, votesRead: voteSnap.size, voters: voterIds.length, ...result.stats }));
  return result;
}
```

`finalizeCommunityMonth`: `rankContestEntries((await buildMonthTally(db, month)).entries, month)` вместо `readEntries`;
в результат `ruleVersion: CONTEST_RULE_VERSION` и `stats`. Победители прошлых месяцев отсекаются, как сейчас
(`community_contest_winners`). Финализация **всегда** считает заново, на снимок не опирается.

### 2.2 Снимок раз в 3 часа

```ts
export async function writeMonthStandings(db: FirebaseFirestore.Firestore, month: ContestMonth) {
  const { entries, stats } = await buildMonthTally(db, month);
  const prev = entries.length ? await db.getAll(...entries.map((e) => db.collection(WINNERS).doc(e.id))) : [];
  const ranked = rankContestEntries(entries.filter((_, i) => !prev[i].exists), month);
  const unranked = entries.filter((e, i) => !prev[i].exists && e.hearts === 0)
    .sort((a, b) => a.publishedAtMs - b.publishedAtMs);
  await db.collection(STANDINGS).doc(month.id).set({
    monthId: month.id, ruleVersion: CONTEST_RULE_VERSION, builtAtMs: Date.now(),
    // зачем: в одном документе — весь список участников месяца (сейчас их единицы; потолок 300 — запас на годы при росте)
    entries: [...ranked, ...unranked].slice(0, 300).map(({ id, authorId, title, hearts, publishedAtMs, status }) => ({ id, authorId, title, hearts, publishedAtMs, status })),
    totalEntries: ranked.length + unranked.length, stats,
  });
}

export const communityMonthStandingsRefresh = onSchedule(
  { region: 'us-central1', schedule: 'every 3 hours', timeZone: 'UTC', timeoutSeconds: 300, retryCount: 2 },
  async () => {
    const db = admin.firestore();
    const config = (await db.collection('community_contest_config').doc('current').get()).data();
    const month = contestMonth(Date.now());
    if (config?.enabled !== true || month.id < COMMUNITY_CONTEST_FIRST_MONTH || typeof config.firstFullMonth !== 'string' || month.id < config.firstFullMonth) {
      console.log('[CONTEST-TALLY] refresh_skip', JSON.stringify({ enabled: config?.enabled === true, monthId: month.id, firstFullMonth: config?.firstFullMonth ?? null }));
      return;
    }
    await writeMonthStandings(db, month);
  });
```

### 2.3 Рейтинг читает снимок (совместимо с 147/148)

```ts
export const communityMonthGetRanking = onCall({ ...HOT_CALLABLE_OPTIONS, timeoutSeconds: 30 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const db = admin.firestore();
  const uid = await resolveStableUidForAuth(db, request.auth.uid, String(request.data?.userId ?? ''), { requireKnownIdentity: true });
  const month = contestMonth(Date.now());
  const config = (await db.collection('community_contest_config').doc('current').get()).data();
  if (config?.enabled !== true || month.id < COMMUNITY_CONTEST_FIRST_MONTH || typeof config.firstFullMonth !== 'string' || month.id < config.firstFullMonth) return { monthId: month.id, entries: [] };
  let snap = await db.collection(STANDINGS).doc(month.id).get();
  if (!snap.exists) {
    // первый вызов месяца до первого расписания — строим один раз и дальше читаем снимок
    console.warn('[CONTEST-TALLY] standings_missing_build_now', JSON.stringify({ monthId: month.id }));
    await writeMonthStandings(db, month);
    snap = await db.collection(STANDINGS).doc(month.id).get();
  }
  const entries = (snap.data()?.entries ?? []) as ContestEntry[];
  // «моё сердце» — по своим голосам месяца: ≤10 документов на человека, а не по всем наборам
  const mine = await db.collectionGroup('contest_votes').where('monthId', '==', month.id).where('userId', '==', uid).limit(50).get();
  const liked = new Set(mine.docs.filter((d) => d.data().liked === true).map((d) => d.ref.parent.parent!.id));
  return { monthId: month.id, builtAtMs: snap.data()?.builtAtMs ?? null, entries: entries.map((e) => ({ ...e, myMonthHeart: liked.has(e.id) })) };
});
```

Форма ответа прежняя (`monthId`, `entries[]` с `myMonthHeart`), плюс `builtAtMs`. Старые клиенты работают без изменений.
`index.ts`: добавить `communityMonthStandingsRefresh` в строку экспорта конкурса.

## 3. Правила и индексы

`firestore.rules` — новая коллекция, запись только сервером:

```
match /community_month_standings/{monthId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

Правила `contest_votes` — **без изменений** (см. раздел 0). Шторка «Условия» должна честно говорить, что не засчитывается.

`firestore.indexes.json` — запросы по группе коллекций:

```json
"fieldOverrides": [
  { "collectionGroup": "contest_votes", "fieldPath": "monthId",
    "indexes": [ { "order": "ASCENDING", "queryScope": "COLLECTION" }, { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] }
],
"indexes": [
  { "collectionGroup": "contest_votes", "queryScope": "COLLECTION_GROUP",
    "fields": [ { "fieldPath": "monthId", "order": "ASCENDING" }, { "fieldPath": "userId", "order": "ASCENDING" } ] }
]
```

(Если в `fieldOverrides` уже есть запись для `contest_votes.monthId` — слить.) Индекс строится минуты, поэтому выкладывать его ПЕРВЫМ.

**Джарвис / контракт данных** (правило CLAUDE.md «тронул данные»): новая коллекция `community_month_standings` →
правило выше, строка в `jarvis_data_contract_guard.test.ts`, если департамент Сообщества читает конкурс.

## 4. Тесты (запускать после коммита Codex)

- `functions/src/community_month_tally.test.ts` (чистые):
  - набор прошлого месяца не участвует, набор этого месяца участвует;
  - голос аккаунта 71 ч — не засчитан (`tooYoung`), 73 ч — засчитан;
  - без урока — `noLesson`;
  - 12 лайков одного человека → засчитаны 10 самых ранних, `overCap: 2`;
  - снял и поставил лайк — уходит в конец очереди;
  - свой набор — `self`;
  - голос вне месяца — `outsideMonth`;
  - ничьи — по `rankContestEntries` (дата публикации, затем id).
- `community_month_claim.emulator.test.ts` / `community_contest_rules.emulator.test.ts`: снимок нельзя писать клиенту;
  старый клиент по-прежнему ставит лайк и голос на набор прошлого месяца (совместимость 147/148).
- Эмулятор: `communityMonthGetRanking` без снимка строит его один раз, второй вызов — 2–3 чтения.

## 5. Стоимость (Firestore, чтения)

Масштаб prod 29.10 (только `count()`): наборов 19, опубликовано 7, `publishedAt` задан у 11, в этом месяце 2,
`pack_likes` 48, `contest_votes` 0 (конкурс ещё не начался).

| | Сейчас (код Codex) | После патча |
|---|---|---|
| Открытие сцены (каждый человек, каждый раз) | 1 конфиг + все наборы за всю историю + по запросу голосов на каждый набор (≥1 чтение даже пустой) + профили авторов и голосующих + `getAll` победителей по каждому набору. Сегодня ≈ 35–45 чтений, растёт с **каждым набором навсегда** | 1 конфиг + 1 снимок + свои голоса (≤10) ≈ **2–12 чтений**, не растёт с числом наборов |
| 1000 открытий в день при 300 наборах (через полгода) | ≈ 1000 × (300 + 300 + 300 + авторы/голосующие) ≈ **1 млн чтений/день** | ≈ 1000 × ~5 = **5 тыс.** + снимок |
| Снимок | — | 8 раз в сутки × (наборы месяца + голоса месяца + 1 профиль на голосующего). При 50 наборах и 2000 голосов ≈ 8 × 2,3 тыс. ≈ 18 тыс./сутки; сегодня — десятки |
| Финализация 1-го числа | тот же обход всех наборов | один подсчёт месяца |

Время ответа рейтинга: 2–3 чтения вместо последовательного обхода (таймаут был 120 с).

## 6. Клиент (Codex) и тексты (Переводчик)

- `components/packs/CommunityScene.tsx`: рейтинг из локального кэша сразу (правило «раздел открывается мгновенно»),
  затем вызов фоном не чаще раза в 15 мин; подпись «обновлено N ч назад» из `builtAtMs` не нужна — снимок и так свежий.
- Свой лайк — оптимистично, как сейчас. Если голос не засчитается (аккаунт < 3 дней / без урока / больше 10), лайк
  остаётся, а в шторке «Условия участия» написано, кто может голосовать.
- Шторка «Условия участия» — строки (ru, затем на перевод):
  - «Голосовать могут аккаунты старше 3 дней, у которых пройден хотя бы один урок. В месяц засчитываются 10 голосов.»
  - «Участвуют наборы, опубликованные в этом месяце.»
  - «Apple и Google не являются спонсорами конкурса и не участвуют в нём.»
- **Переводчику:** все тексты конкурса (сцена, шторка условий, окно победителя, приз) — на 9 языков интерфейса
  (ru, uk, en, es, pt-BR, vi, id, tr, pl); сейчас `triLang` отдаёт en для uk/es.

## 7. Порядок выкладки (по «да» владельца, до 1.11 00:00 UTC)

1. Индексы (`firestore:indexes`) — сразу, строятся минуты.
2. Правила (`community_month_standings`).
3. Функции: `communityMonthGetRanking`, `communityMonthFinalize`, `communityMonthStandingsRefresh` (новая — проверить
   право вызова не нужно, это расписание), из снимка проверенного хэша. После — `scripts/check_callable_invoker.mjs --only communityMonthGetRanking`.
4. 1.11 после 00:05 UTC — журнал `[CONTEST-TALLY]`, документ снимка появился.

## 8. Вопросы

1. «Пройденный урок» — только классические уроки (`lessons_completed`) или и сессия Learning V2? На сервере я не нашёл
   поля завершённых сессий V2 в `users.progress` — нужен ответ Learning V2, какое поле надёжно.
2. Возраст аккаунта — по `users.created_at`, а если пусто — по дате создания в Firebase Auth. Ок?
3. Лимит 10 — «действующих голосов», снятый лайк освобождает место. Ок, или считать каждое нажатие?
4. Пересчёт раз в 3 ч (как в плане Codex 26.10) — или чаще в последние сутки месяца?
