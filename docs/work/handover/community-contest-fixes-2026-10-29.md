# Конкурс «Набор месяца»: исправления до старта 1.11 — передача Codex (Ядро, 29.10)

Решения владельца 29.10 07:50–07:55 (кнопки, через координатора; поручение исследования — ~09:30 по журналу координатора). Код конкурса сейчас **незакоммичен у Codex**
(`functions/src/community_month_contest.ts`, `community_contest_identity.ts`, `shared/community_month_contest.ts`,
`firestore.rules`, `firestore.indexes.json`, `functions/src/index.ts` — `??`/`M`). Поэтому здесь готовый патч, а не коммит.
Если файлы закоммитят до 1.11 — Ядро вносит его само. Выкладка — только по «да» владельца
(`scripts/deploy_from_clean_head.sh --only …`, правила раньше функций).

## 0. Что меняется (коротко)

| # | Решение владельца | Сейчас | После патча |
|---|---|---|---|
| 1 | Участвуют только наборы, созданные в текущем месяце (решение 26.10) | все наборы с `publishedAt < конец месяца` | `publishedAt` ∈ [начало, конец) месяца |
| 2 | Голос засчитывается от аккаунта ≥3 дней | любой вошедший | возраст аккаунта на момент голоса ≥ 72 ч |
| 3 | …с ≥1 пройденным уроком (любым) | нет | классика (`lessons_completed`/`completed_lessons`) **или** Learning V2 (`progress.learning_v2_course_progress_sync_v1` ≥ 1) |
| 4 | До 10 голосов в месяц | без лимита | 10 самых ранних **действующих** голосов; снятый лайк возвращает голос |
| 5 | Места — снимок, не обход на каждое открытие | на каждое открытие обход ВСЕХ наборов + запрос голосов по каждому | один документ `community_month_standings/{yyyy-mm}`, пересчёт раз в 3 ч, в последние сутки — каждый час |
| 6 | В правилах строка «Apple и Google не спонсоры конкурса» | нет | текст в шторке «Условия участия» (клиент, Codex) |
| 7 | Тексты на 9 языках | ru и en, остальным en | заявка Переводчику (раздел 6) |

**Почему правила Firestore для голосов НЕ ужесточаются.** Сборки 147/148 уже у людей. Лайк и голос пишутся одним пакетом
(`communityContestVoteMatches`), и если запретить голос на старый набор или голос «молодого» аккаунта, у этих людей
перестанут проходить сами лайки. Поэтому лайк остаётся лайком, а условия 1–4 применяются **при подсчёте на сервере**.
Если голос не засчитан, человек ничего не теряет, кроме места в рейтинге. Причина пишется в статистику снимка.

## 1. Модуль подсчёта — УЖЕ В GIT: `functions/src/community_month_tally.ts`

Чистый модуль без импорта незакоммиченных файлов Codex (свои типы, структурно совместимы с `ContestEntry`), с тестом
`functions/src/community_month_tally.test.ts` на все правила. Codex только подключает его. Что в нём:

- `tallyContestMonth({ month, packs, votes, voters })` → `{ entries, stats }` — правила 1–4 ниже, причины отсева в `stats.excluded`
  (`outsideMonth, packNotEligible, unliked, self, unknownVoter, tooYoung, noLesson, overCap`);
- `contestLessonsCompleted(progress)` — урок = **любой** (владелец 29.10): классика `lessons_completed`/`completed_lessons`
  **плюс** Learning V2: `progress.learning_v2_course_progress_sync_v1` (число пройденных подряд) или маска пройденных
  `progress.learning_v2_course_masks_sync_v1` (поле `c`, ловит прохождение не с начала; `o` — «открыто», не считается).
  Оба поля клиент уже синхронизирует с 22.10 (подтвердила сессия Learning V2), новое поле не нужно;
- `contestAccountCreatedAtMs(profileCreatedAtMs, authCreatedAtMs)` — `users.created_at`, а если пусто — Firebase Auth;
- `contestStandingsShouldRefresh(nowMs, month)` — раз в 3 ч, в последние сутки месяца — каждый час;
- `CONTEST_MAX_VOTES_PER_MONTH = 10`: засчитываются 10 **действующих** голосов, самые ранние по времени последнего
  изменения; снятый лайк перестаёт быть действующим и возвращает голос (владелец 29.10).

## 2. `community_month_contest.ts` — сборщик, снимок, рейтинг

### 2.1 Сборщик вместо `readEntries` (тот же для снимка и финализации)

```ts
import { tallyContestMonth, contestLessonsCompleted, contestAccountCreatedAtMs, contestStandingsShouldRefresh, CONTEST_TALLY_RULE_VERSION, type TallyVote, type TallyVoter } from './community_month_tally';
import { parseAccountCreatedAtMs } from './progress_events';
const STANDINGS = 'community_month_standings';
const LOG = '[CONTEST-TALLY]';

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
      const profileCreatedAtMs = parseAccountCreatedAtMs(data.created_at);
      let authCreatedAtMs: number | null = null;
      if (profileCreatedAtMs == null) {
        // зачем (владелец 29.10): у старых аккаунтов created_at бывает пуст — берём дату создания в Firebase Auth
        try { authCreatedAtMs = Date.parse((await admin.auth().getUser(s.id)).metadata.creationTime) || null; }
        catch (e) { console.warn(`${LOG} voter_age_unknown`, JSON.stringify({ reason: e instanceof Error ? e.message.slice(0, 80) : 'unknown' })); }
      }
      voters.set(s.id, {
        createdAtMs: contestAccountCreatedAtMs(profileCreatedAtMs, authCreatedAtMs),
        lessonsCompleted: contestLessonsCompleted((data.progress ?? {}) as Record<string, unknown>),
      });
    }
  }
  const result = tallyContestMonth({ month, packs, votes, voters });
  console.log(`${LOG} built`, JSON.stringify({ monthId: month.id, ms: Date.now() - startedAt, packsRead: packSnap.size, votesRead: voteSnap.size, voters: voterIds.length, ...result.stats }));
  return result;
}
```

`finalizeCommunityMonth`: `rankContestEntries((await buildMonthTally(db, month)).entries, month)` вместо `readEntries`;
в результат `ruleVersion: CONTEST_TALLY_RULE_VERSION` и `stats`. Победители прошлых месяцев отсекаются, как сейчас
(`community_contest_winners`). Финализация **всегда** считает заново, на снимок не опирается.

### 2.2 Снимок: раз в 3 часа, в последние сутки месяца — каждый час

```ts
export async function writeMonthStandings(db: FirebaseFirestore.Firestore, month: ContestMonth) {
  const { entries, stats } = await buildMonthTally(db, month);
  const prev = entries.length ? await db.getAll(...entries.map((e) => db.collection(WINNERS).doc(e.id))) : [];
  const ranked = rankContestEntries(entries.filter((_, i) => !prev[i].exists), month);
  const unranked = entries.filter((e, i) => !prev[i].exists && e.hearts === 0)
    .sort((a, b) => a.publishedAtMs - b.publishedAtMs);
  await db.collection(STANDINGS).doc(month.id).set({
    monthId: month.id, ruleVersion: CONTEST_TALLY_RULE_VERSION, builtAtMs: Date.now(),
    // зачем: в одном документе — весь список участников месяца (сейчас их единицы; потолок 300 — запас на годы при росте)
    entries: [...ranked, ...unranked].slice(0, 300).map(({ id, authorId, title, hearts, publishedAtMs, status }) => ({ id, authorId, title, hearts, publishedAtMs, status })),
    totalEntries: ranked.length + unranked.length, stats,
  });
}

export const communityMonthStandingsRefresh = onSchedule(
  { region: 'us-central1', schedule: 'every 1 hours', timeZone: 'UTC', timeoutSeconds: 300, retryCount: 2 },
  async () => {
    const db = admin.firestore();
    const config = (await db.collection('community_contest_config').doc('current').get()).data();
    const month = contestMonth(Date.now());
    if (config?.enabled !== true || month.id < COMMUNITY_CONTEST_FIRST_MONTH || typeof config.firstFullMonth !== 'string' || month.id < config.firstFullMonth) {
      console.log('[CONTEST-TALLY] refresh_skip', JSON.stringify({ enabled: config?.enabled === true, monthId: month.id, firstFullMonth: config?.firstFullMonth ?? null }));
      return;
    }
    // владелец 29.10: раз в 3 ч, в последние сутки — каждый час; лишний запуск выходит до чтений базы (кроме конфига)
    if (!contestStandingsShouldRefresh(Date.now(), month)) {
      console.log('[CONTEST-TALLY] refresh_skip', JSON.stringify({ reason: 'not_due', hourUtc: new Date().getUTCHours() }));
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

## 4. Тесты

Правила 1–4 и границы — уже в git (`functions/src/community_month_tally.test.ts`). После коммита Codex добавить:

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

## 6а. Автоначисление Plus победителям (владелец 29.10 ~07:55) — модуль УЖЕ В GIT: `functions/src/plus_grant.ts`

«Конкурсы не прекращаются, каждый месяц. Система начисляет автоматически Plus, и он активируется как надо! Юзеру приходит история.»

**Призы:** 1 место — Plus 3 месяца, 2 — 2 месяца, 3 — 1 месяц (вместо монет 2000/1000 у мест 2–3 и кнопки «Забрать»).

**Механизм — как Telegram:** `grantPlusOnce(db, { uid, grantKey, duration: { months }, plan: 'community_month', source, extraProgress })`:
- пишет `vip_active / vip_plan / vip_from / vip_until / vip_admin_override / vip_admin_grant_at` + проекцию доступа
  (`writeAccessProjectionFromPatch`) — приложение узнаёт Plus сразу (тест `tests/plus_auto_grant_client_access_2026_10_29.test.ts`:
  `isPremiumAccessProgressActive` и все 32 урока по `PLUS_OPENS_ALL_LESSONS`);
- срок = **max(конец любого текущего Plus — VIP, магазин, админ, community; сейчас) + N календарных месяцев**; бессрочный Plus — не трогаем (`lifetime`);
- идемпотентно: журнал `plus_grant_ledger/{community_month__yyyy-mm__placeN}` создаётся в той же транзакции; повтор → `already`;
- склейка аккаунта в процессе → ошибка `account_updating`, повтор следующим запуском расписания;
- логи `[PLUS-GRANT] enter / result / failed`.

**Финализация (замена `finalizeCommunityMonth` + `communityMonthClaimReward`):**

```ts
// 1-го числа: сначала итог (неизменяемый), потом выдача; выдача повторяется каждый час, пока все места не выданы
const PLUS_MONTHS_BY_PLACE = [3, 2, 1] as const;
export async function finalizeCommunityMonth(db: FirebaseFirestore.Firestore, month: ContestMonth): Promise<void> {
  const LOGF = '[CONTEST-FINAL]';
  if (Date.now() < month.endMs) { console.warn(LOGF, JSON.stringify({ step: 'skip', reason: 'month_active', monthId: month.id })); return; }
  const resultRef = db.collection(RESULTS).doc(month.id);
  let result = (await resultRef.get()).data();
  if (!result) {
    const { entries, stats } = await buildMonthTally(db, month);      // свежий подсчёт, не снимок
    const prev = entries.length ? await db.getAll(...entries.map((e) => db.collection(WINNERS).doc(e.id))) : [];
    const winners = rankContestEntries(entries.filter((_, i) => !prev[i].exists), month).slice(0, 3);
    await db.runTransaction(async (tx) => {
      if ((await tx.get(resultRef)).exists) return;                    // параллельный запуск уже записал итог
      tx.create(resultRef, { monthId: month.id, winners, stats, finalizedAtMs: Date.now(), ruleVersion: CONTEST_TALLY_RULE_VERSION });
      winners.forEach((w, i) => tx.create(db.collection(WINNERS).doc(w.id), { monthId: month.id, place: i + 1, finalizedAtMs: Date.now() }));
    });
    result = (await resultRef.get()).data();
    console.log(LOGF, JSON.stringify({ step: 'result_written', monthId: month.id, winners: (result?.winners ?? []).length, ...stats }));
  }
  for (const [index, w] of ((result?.winners ?? []) as ContestEntry[]).entries()) {
    const place = index + 1;
    try {
      const r = await grantPlusOnce(db, {
        uid: w.authorId, grantKey: `community_month:${month.id}:place${place}`, duration: { months: PLUS_MONTHS_BY_PLACE[index] },
        plan: 'community_month', source: `community_month:${month.id}`,
        // факт для истории победителя — тем же патчем, только вместе с выдачей (см. «История» ниже)
        extraProgress: { [CONTEST_WIN_STORY_FIELD]: contestWinStoryValue({ monthId: month.id, place: place as 1 | 2 | 3,
          plusMonths: PLUS_MONTHS_BY_PLACE[index], packId: w.id, packTitle: w.title, hearts: w.hearts, grantedAtMs: Date.now() }) },
      });
      console.log(LOGF, JSON.stringify({ step: 'grant', monthId: month.id, place, packId: w.id, status: r.status }));
    } catch (error) {
      console.warn(LOGF, JSON.stringify({ step: 'grant_failed', monthId: month.id, place, packId: w.id, reason: error instanceof Error ? error.message.slice(0, 120) : String(error) }));
    }
  }
}
```

Расписание финализации — **каждый час 1-го числа** (`'5 * 1 * *'`, UTC): первый запуск пишет итог и выдаёт, следующие
доделывают только упавшие выдачи (журнал не даст выдать дважды). Последний часовой пересчёт снимка — 23:00 последнего дня;
финализация считает заново от голосов, снимок ей не нужен. Старые записи `community_month_rewards` и
`communityMonthClaimReward` больше не нужны для новых месяцев; функцию оставить, пока её зовут сборки 147/148
(для них — ответ «нечего забирать», без ошибки).

**История победителю (владелец 29.10: «Да, делать в коде», макет Моментов GukYuSACfWas4P9toiG7sS).**
Сервер кладёт в профиль `progress.contest_last_win` — JSON одной строкой (`contestWinStoryValue` в
`functions/src/community_month_tally.ts`, уже в git):

```json
{ "v": 1, "monthId": "2026-11", "place": 1, "plusMonths": 3, "packId": "…", "packTitle": "до 120 знаков", "hearts": 17, "grantedAtMs": 1793… }
```

Пишется **той же транзакцией и тем же ключом журнала** `community_month:{yyyy-mm}:place{n}`, что Plus
(`grantPlusOnce.extraProgress`): история не придёт без Plus и не придёт дважды. Бессрочному подписчику Plus не
меняется, но поле истории всё равно пишется (исправлено в `plus_grant.ts`). Профиль приложение и так получает при
синхронизации — **ноль новых чтений**.

Приложение (Моменты/Codex): при синхронизации, если `contest_last_win` новое (`monthId+place` ≠ последнему
показанному) → `recordStoryEvent('contest_win', { monthId, place, plusMonths, packTitle, hearts })` → шаблон
«Твой набор — N место за <месяц>, Plus на N месяцев включён». Тип `contest_win` добавить в `StoryEventType`
(`modules/story_events/story_events_core.ts` — сейчас изменён другой сессией, правят Моменты). Повтор той же записи
(ключ повтора события = `monthId:place`) история не дублирует — это уже умеет `story_events_core`.

**Согласование с Моментами:** сообщения между сессиями у Ядра сейчас приостановлены — прошу координатора переслать
Моментам этот абзац; если им нужна другая форма полей — поменяю `contestWinStoryValue` (версия `v` для этого).

**Крайние случаи — предложения на решение:**

| Случай | Предлагаю |
|---|---|
| Ничья по сердцам | как сейчас в `rankContestEntries`: раньше опубликован — выше, затем id. Одно место — одному набору, Plus не делится |
| 0 засчитанных голосов у всех | приза нет, итог месяца пишется пустым (`winners: []`), ничего не переносится |
| Меньше трёх наборов с голосами | призы получают только они (1–2 места), пустые места не выдаются |
| Набор удалён / скрыт модерацией / снят автором до 1-го числа | не участвует; место уходит следующему |
| Автор удалил аккаунт до 1-го числа | `contestCanonicalOwner` → null, набор не участвует; место следующему |
| Автор удалил аккаунт ПОСЛЕ итога, до выдачи | `user_missing` в журнале, Plus не выдаётся, место НЕ переигрывается (итог неизменяем) |
| Аккаунт в процессе склейки | выдача повторяется каждый час 1-го числа; не вышло за сутки — строка в Джарвисе на ручной разбор |
| Победитель уже с бессрочным Plus | `lifetime`: ничего не меняем, история всё равно приходит (место честное) |
| Тот же набор снова первый | уже победившие наборы не участвуют (`community_contest_winners`), как в коде Codex |

**Лесенка приглашений (владелец: 14 дней Plus за 3 друзей, у каждого пройден 1 урок; 500 монет обоим за каждого):**
выдача Plus — тем же `grantPlusOnce`: `grantKey: 'referral_ladder:<uid>_tier3'`, `duration: { days: 14 }`,
`plan: 'referral_ladder'`. «Прошёл урок» — тот же `contestLessonsCompleted` (классика или V2). Монеты 500/500 — через
журнал монет (`prepareStarOperations`, opId `referral_friend:<inviter>_<friend>`), не через Plus-модуль.

**Правила и удаление аккаунта:** `plus_grant_ledger/{id}` — `allow read, write: if false` (только сервер).
В журнале есть uid → `account_delete.ts` должен удалять записи `where('uid', '==', uid)` (как другие журналы выдачи).

## 7. Порядок выкладки (по «да» владельца, до 1.11 00:00 UTC)

1. Индексы (`firestore:indexes`) — сразу, строятся минуты.
2. Правила (`community_month_standings`).
3. Функции: `communityMonthGetRanking`, `communityMonthFinalize`, `communityMonthStandingsRefresh` (новая — проверить
   право вызова не нужно, это расписание), из снимка проверенного хэша. После — `scripts/check_callable_invoker.mjs --only communityMonthGetRanking`.
4. 1.11 после 00:05 UTC — журнал `[CONTEST-TALLY]`, документ снимка появился.

## 8. Ответы владельца (29.10 ~07:50) и открытое

1. Пройденный урок — любой: классика или Learning V2. ✅ в модуле.
2. Возраст — `users.created_at`, иначе Firebase Auth. ✅
3. 10 действующих голосов, снятый лайк возвращает голос. ✅
4. Пересчёт раз в 3 ч, в последние сутки — каждый час. ✅ (`contestStandingsShouldRefresh`, расписание каждый час)

**Открыто — Learning V2:** испанский курс хранит прогресс под ключом `learning_v2_course_progress_sync_v1:target:es`
(`learningV2LanguageScopedStorageKeyV1`), а в список облачной синхронизации (`app/cloud_sync.ts`) входит только
английский ключ. Ученик, прошедший занятие только испанского V2 и ни одного классического урока, на сервере выглядит
как «урок не пройден». Минимальная правка (Learning V2, не Ядро — файл в их работе): добавить испанский ключ в
синхронизацию со слиянием «максимум», как у английского. Тогда в `contestLessonsCompleted` добавить чтение
`progress['learning_v2_course_progress_sync_v1:target:es']` — одна строка. Дубль поля не заводим.
