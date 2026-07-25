# FULL HANDOFF: Турниры — весь режим → Codex

**Дата:** 2026-07-21 · **Статус:** сервер Фазы 1 ЗАДЕПЛОЕН в prod · клиент/админка/контент — предстоит Codex
**Спека (источник истины по продукту):** `docs/tournaments/2026-07-21-tournaments-mode-spec.md`
**Макеты (47 состояний, утверждены владельцем):** `docs/design/tournaments/shots/`
**Живой прототип для портирования:** `C:\Users\badlo\Documents\kimi\workspace\tournament-mockups` (React+TS+Vite, компоненты/токены портируются почти 1:1)

Владелец сказал: Codex доделывает ВСЁ, включая генерацию контента для турниров. Этот документ — полный бриф.

---

## 0. Что уже сделано и задеплоено (НЕ переделывать)

**Prod `phraseman-ea0b3`, us-central1, nodejs22:**
- Cloud Functions живы: `tournamentCreateRooms` (scheduler */5мин), `tournamentFillBots` (scheduler */1мин), `tournamentJoin`, `tournamentSubmitAnswers`, `tournamentFinalize`, `tournamentClaimReward` (callable), `adminSeedBotProfiles` (callable, админ).
- Firestore rules: турнирные коллекции добавлены — клиенты read-only, записи только Admin SDK.
- Индекс `tournamentRooms` задеплоен.
- **`tournamentSchedule/config` в Firestore: все 3 слота (12:00/19:00/21:00, Europe/Moscow) стоят `enabled: false`** — чтобы планировщики не плодили комнаты без клиента. Включить = выставить `enabled: true` (код уважает флаг, `tournaments.ts:201`).
- Тесты: `functions/src/tournament_core.test.ts` — 31/31 PASS. `tsc --noEmit` чисто.
- Последний коммит по режиму: `340ca6aaf` (ветка `feature/referral-roulette`).

**Файлы сервера:** `functions/src/tournament_core.ts` (типы, стейт-машина, скоринг, seed, призы, банк, сезон, стрики, боты), `functions/src/tournaments.ts` (6 функций), `functions/src/tournament_bots.ts` (сидер), экспорты в `functions/src/index.ts:468–477`.

---

## 1. ЧТО ДОДЕЛАТЬ — роадмап для Codex

### 1.1 Сидер ботов (первым делом)
Вызвать `adminSeedBotProfiles` из админки/консоли с админским токеном → создаст персонажей в `botProfiles`. Проверить: имена без «битв/боёв» (уже почищено), винрейт из реалистичного распределения. Боты незаметны: карточки кликабельны, заявки в друзья не принимают, в сезонный рейтинг НЕ попадают, призовые места не занимают.

### 1.2 RN-клиент (основной объём)
Портировать прототип `workspace/tournament-mockups` → `app/` + `components/tournament/`.
Эталон стиля: новая Лига (`components/league/*`, ветка league-hub-redesign) + канон `UI_STANDARD_V5_CANONICAL.md`. Жёсткие правила владельца:
- контейнеры СТРОГО без обводок (тональные заливки `#101710/#17241A/#1D2E22`, bg `#030604`, акцент `#47C870`, золото `#FFC800`);
- типографика крупная: hero 52–64px/900, тело ≥15px, микро-текст запрещён;
- один герой на экран, ноль пояснительных абзацев, всё самоочевидно;
- анимации лучше Duolingo: spring pop-in, FLIP-обгоны в таблице, подиум с короной 👑, shard-burst, летающие реакции;
- таймеры: единый формат `<1ч → MM:SS`, `<24ч → H:MM:SS`, `≥24ч → бейдж «Nд» + H:MM`, tabular-nums;
- слова «битва», «бой», «дуэль» ЗАПРЕЩЕНЫ в UI (grep-проверка в CI желательна).

Экраны (все 47 состояний в `docs/design/tournaments/shots/`, sheet-1..5 — обзорные листы):
1. **Таббар**: 5-я иконка-кубок 🏆 по центру (line-стиль как у 4 реальных), LIVE-точка во время турнира.
2. **Главная Турниров**: hero-отсчёт, слоты дня, вход за 1🎟 (bottom-sheet), банк недели (тикающий счётчик + пульс), VIP-тизер, сезон-тизер, free-вход недели, LIVE-состояние, «нет билетов».
3. **Лобби** (фиксированная сетка 4×4, игроки pop-in НА МЕСТЕ, никакого overflow): подключение игроков, таймер старта, кликабельные карточки (bottom-sheet профиль: ранг, титулы, винрейт, «в друзья»), летающие реакции 👍🔥😎⚔️🍀.
4. **Раунд**: интро раунда (режим + 3-2-1) → **батч ~5 вопросов** («Вопрос N из 5», точки прогресса, авто-переход 1.4с после фидбека) → таблица. Режимы: угадай фразу, перевод на скорость (сборка из слов), тайм-атака (60с), голосовой (микрофон, волна, чип ×1.5). «Правильно!»/«Почти!» (НЕ «неверно»).
5. **Таблица между раундами** (10–12 сек): 16 горизонтальных плашек, FLIP-перестановки, «обгон! ⚡», своя строка подсвечена, авто-переход.
6. **Результаты**: подиум gold/silver/bronze, корона spring'ом, призы (🥇 🎟+50💎+титул+рамка 24ч, 🥈 🎟+25💎, 🥉 10💎, остальным XP-кэшбэк), shard-burst при победе, шер-карточка «Поделиться 📤», «На главную». **Никаких «сыграть ещё» — турнир завершён.**
7. **Сезон**: недельный лидерборд, отсчёт до сброса (красный за 3ч), тиры наград.
8. **Билеты**: инвентарь, «Как получить» (уровень / стрик 7д / рулетка / за 💎), FREE-бейдж.
9. **Краевые**: skeleton, нет сети, preseason, «ты уже в лобби», отмена турнира (возврат 🎟 + 3💎).
10. Клиент слушает ОДИН документ комнаты (`tournamentRooms/{roomId}`) — cost-контроль, см. спеку §11.

Виральность (КФ-5): шер-карточка генерится клиентски (canvas/view-shot), реферальная ссылка «Сможешь меня победить?» — **оба получают по 1 билету** (серверная часть рефералки — в `tournamentFinalize`/отдельный callable, идемпотентно через `reward_claims`).

### 1.3 Генерация контента для турниров (админка + пул)
Переиспользовать существующий конвейер: `functions/src/arena_question_pool.ts`, `functions/src/admin_arena_question_pool.ts`, `functions/src/content_factory/*` (там уже есть генерация квизов для арены, grounding, ledger, review queue). Задача — аналог для турниров:

1. **Админ-раздел «Турниры»** (`admin/v2/`): генератор заданий → ревью-очередь → публикация в `tournamentTasks`.
2. **Схема задания** (`functions/src/tournament_core.ts` → `TournamentTask`): `{ taskId, mode, isVoice, difficulty 1..3, payload, tags[], verified }`. Payload по режиму: choice (фраза + 4 варианта + correctIndex), translate-bank (фраза + банк слов), timeattack-сет, voice (фраза для произношения + reference).
3. **Правила пула:** режимы Learning v2 все, включая голосовые (`isVoice: true`, базовые очки ×1.5 — уже в скоринге). Сложность: раунд 1 → easy, раунд 2 → easy/medium микс, раунд 3 → medium, раунд 4 → medium/hard. Теги тем под темы/дни интерфейса.
4. **Качество:** как в арена-пуле — grounding к реальному контенту приложения, без emergency-фоллбэков, ledger против повторов, человеческое ревью перед `verified: true`. Минимальный объём для запуска: ~400 заданий (100 на режим × сложность), дальше пополнение конвейером.
5. **Выборка в комнату** — серверная, seeded (`seed = roomId + roundNo`), уже в `selectRoundTasks`; админка должна лишь держать пул полным и verified.
6. Редактор расписания/призов/банка в админке → пишет `tournamentSchedule/config` (там же кнопка включения слотов!).

### 1.4 Ассеты
- Иконка подарка «Турнирный билет» для системы подарков за уровень — генерация через нано-банану в стиле существующих иконок приложения (референсы: `assets/`, стиль roulette-cards). Скины билета: обычный / VIP gold / огненный (макеты в `shots/sheet-5-assets.png`).
- Переиспользовать арена-ассеты билетов, где есть.
- Билет добавить в награды: level-up gift, стрик 7 дней, рулетка, магазин за 💎.

### 1.5 Включение режима
1. Пул заданий наполнен и verified → 2. боты засеяны → 3. клиент в релизе за Remote Config гейтом `tournaments_enabled` → 4. `enabled: true` в слотах → 5. дым-тест на staging: join → 5 вопросов → таблица → … → finalize → claim.

### 1.6 Фаза 2 (после MVP)
VIP-турнир воскресный (вход 5🎟, банк недели сплит 50/30/20 топ-3), **трансляция**: лобби зрителей с прогнозами «Кто победит?» 5💎 ×3 — **ставки ТОЛЬКО до старта, после старта закрыты** (макеты 29/34/35), LIVE-таблица зрителя, реакции; голосовой раунд отдельным таймером; финал топ-8 ×2; «Зал славы».
App Store policy: призы всегда системные фиксированные, НЕ трансфер покупной валюты между игроками (спека §4).

### 1.7 Фаза 3
Кланы с нуля: 5–20 чел., название/тег/эмблема, очки клана = сумма топ-5 членов в обычных турнирах, клановая рамка чемпиона недели. Стандарт владельца: «лучше чем у Duolingo».

---

## 2. Продуктовые решения владельца (НЕ менять)

3 слота/день (12:00/19:00/21:00 лок.) · 16 игроков, мин. 8 живых · 12–15 мин · 4 раунда, батчи ~5 вопросов, таблица между раундами · билет сгорает при неявке · отмена → возврат + 3💎 · 1 free-вход/нед · все режимы v2 + голосовые ×1.5 · скоринг = база + скорость ≤+40% + стрик ×1.5/×2 · боты незаметны · призы 50/25/10💎 · валюта «дорогая», малые числа · сезон недельный со сбросом · банк = 20% стоимости билета · КФ: банк, шер-рефералка (оба +1🎟), серии 🔥 (3/5/10 эскалация), трансляция (ф.2), кланы (ф.3) · «реванш» ОТМЕНЁН · без слов «битва/бой».

## 3. Метрики

D1/D7 retention турнирных vs обычных · доходимость до конца · K-factor шер-карточек · конверсия free→билет · заполняемость комнат живыми (цель ≥8 в прайм).

## 4. Быстрые проверки

```bash
cd functions && npx tsc --noEmit && npx jest tournament_core   # 31/31
firebase deploy --only firestore:rules,firestore:indexes       # уже сделано
firebase deploy --only functions:tournamentCreateRooms,...     # уже сделано (7 фн.)
```

Ловушки: `firestore.rules` — клиенты НЕ должны писать в турнирные коллекции; `tournamentTasks` read:false для всех (задания отдаёт сервер); scheduler'ы работают даже при `enabled:false` (это ок, дёшево); `.swarm/` мусор в репо — игнорить.

---

## 5. Hardening backend Фазы 1 — 2026-07-22 (локально, без deploy)

### Результат

Закрыт локальный audit-slice серверной Фазы 1. Все денежные/доступные изменения теперь строятся как Firestore-транзакции с детерминированными маркерами/receipts: join, submit, cancel/refund, finalize и claim не полагаются на клиентский read-modify-write. Два параллельных submit сохраняются после transaction retry, replay не добавляет очки второй раз. Join и cancel конфликтуют на документе комнаты: если join победил, cancellation видит игрока и возвращает именно записанный `ticketsSpent`; если cancel победил, join fail-closed.

Комната теперь проходит сохранённые состояния `scheduled → lobby → round/table ×4 → final → results → rewards → closed`. У каждого активного состояния есть server deadline. Новый participant callable `tournamentAdvanceRound` даёт точный переход после 10–12 секунд, а `tournamentAdvanceRooms` остаётся минутным recovery fallback; ранний вызов запрещён. Отсутствующий игрок получает серверный timeout с нулём и не блокирует комнату. Боты получают детерминированные очки в каждом раунде, а не только в финале.

Пул fail-closed: отсутствующий/невалидный config, недостаток ботов, неполные или не `verified: true` задания не создают/не запускают пустую комнату. При fill приватные ключи заданий транзакционно замораживаются в `tournamentRooms/{roomId}/taskSecrets/*`; room содержит только public payload без `correct*`, `reference`, `expected` и `answer`. Choice проверяется по `correctIndex`, translate-bank по порядку токенов, timeattack по массиву индексов. Voice не начисляет очки по строке reference: он явно выключен до появления server-verifiable evidence-контракта.

Cancellation записывает provenance каждого входа, возвращает 0/1/5 фактически потраченных билетов, восстанавливает бесплатный вход отдельно, откатывает вклад в банк и ровно один раз начисляет 3 gems. Finalize одним transaction обновляет weekly season points, `tournamentsPlayed`, best place, hot streak/tier и создаёт server-only reward entitlement. Claim точно один раз выдаёт существующие gems/tickets/title. Для мест 4–16 создаётся entitlement с явным pending XP gate. Комнаты получают Firestore TTL timestamp; при `closed` приватные task secrets удаляются.

Rules: browser/admin catch-all больше не открывает tournament roots; pool/task secrets и все tournament writes закрыты; после lobby room читают только auth UID, записанные join; server-only `tournament_receipts` нельзя создать клиентом. Старый общий `reward_claims` не менялся, чтобы не сломать существующие reward flows.

### RED → GREEN evidence

- Baseline: `cd functions && npx jest src/tournament_core.test.ts --runInBand --no-cache` → 31/31 PASS.
- RED-1: core/backend contracts → 14 FAIL / 30 PASS (fail-open config, отсутствующие payload/timing/deadline/receipt/privacy contracts).
- RED-2: transaction plans → 5 FAIL / 39 PASS (submit merge/replay, join↔cancel, cancel replay, round timeout+bot, finalize replay отсутствовали).
- Последующие RED: immutable task snapshot; IANA/difficulty/voice validation; participant deadline callable; scheduler late-join recheck — каждый тест падал по ожидаемой причине до production-изменения.
- GREEN: `cd functions && npx jest src/tournament_core.test.ts src/tournament_backend_contract.test.ts --runInBand --no-cache` → 2 suites, 54/54 PASS.
- GREEN: `cd functions && npx tsc --noEmit` → exit 0.
- GREEN: `npx jest tests/firestore_rules_security.test.ts --runInBand --no-cache` → 68/68 PASS (Jest сообщил только существующий forced-exit/open-handle warning).
- GREEN: `git diff --check -- <tournament scope>` → exit 0; только line-ending warnings.

### Изменённые файлы

- `functions/src/tournament_core.ts` — fail-closed contracts, public payload, answer normalization, server timing, deadline/refund/reward/transaction plans.
- `functions/src/tournaments.ts` — transactional IO, immutable task snapshots, advancement scheduler/callable, exact-once cancellation/finalize/claim, close/TTL.
- `functions/src/tournament_core.test.ts` — 44 pure behavior tests, включая deterministic concurrency harness.
- `functions/src/tournament_backend_contract.test.ts` — 10 backend/rules/export contracts.
- `functions/src/index.ts` — только tournament export block (`tournamentAdvanceRooms`, `tournamentAdvanceRound`); чужие auth/referral изменения сохранены.
- `firestore.rules` — только tournament protections/catch-all exclusions и server-only receipt block; чужие identity changes сохранены.
- `firestore.indexes.json` — index `state + stateDeadlineAtMs` для recovery scheduler.
- этот handoff — фактический статус и воспроизводимые gates.

### Явные pending gates / остаточная неопределённость

- `voiceScoring`: disabled — нет server-verifiable voice evidence contract. Обычная строка reference всегда даёт 0.
- `xpCashback`: disabled — canonical XP идёт через `progressSubmitEvent`; прямое изменение несовместимо.
- `avatarFrameExpiry`: disabled — в проекте не найден authoritative frame-expiry contract.
- `referralTickets`: disabled — нет tournament-ticket referral receipt contract.
- `seasonPayout`: disabled — weekly points реализованы, но payout receipt/rollover contract отсутствует.
- Firestore emulator/runtime concurrency в этой сессии не запускались. Доказательство гонок — deterministic pure transaction-plan harness + source/rules contracts; production certainty без staging не заявляется.
- Checkout стартовал на фактическом HEAD `08608c2e7`, хотя task packet ожидал `d7bf52842`; tournament-файлы до работы были чистыми. Большой пользовательский dirty-state, включая существующие изменения `firestore.rules` и `functions/src/index.ts`, сохранён. Commit/push/deploy/production access не выполнялись.

### Точный следующий шаг

На отдельном staging Firebase project: задеплоить только Functions + rules + indexes из review-approved commit, включить один тестовый слот и выполнить emulator/staging smoke с двумя конкурентными submit, replay, join↔cancel в обоих порядках, повторными finalize/claim и forced timeout. Acceptance: один debit/refund/claim receipt на uid+room, оба concurrent результата присутствуют, все `table/final/results/closed` наблюдаемы, secrets недоступны клиенту, room/taskSecrets очищаются по lifecycle. Только после этого владелец отдельно решает вопрос production deploy; текущая сессия deploy не авторизует.

---

## 6. Повторный hardening после независимого review — 2026-07-22

### Закрытые findings

- Public task payload теперь создаётся по allowlist-схеме каждого поддержанного режима. Неизвестные поля, вложенные объекты/массивы и варианты ключей вроде `correct_answer`, `CorrectAnswer`, `answerKey`, `expected_answer` не попадают в lobby-readable room.
- Пока `voiceScoring.enabled == false`, voice-задачи не участвуют в общей серверной выборке. Эта выборка едина для людей и ботов, поэтому не существует отдельного bot-only обхода.
- Сложность закреплена по раундам: 1 → easy; 2 → easy/medium; 3 → medium; 4 → medium/hard. Choice требует фразу и ровно четыре варианта; translate-bank — фразу, непустой банк и server answer; timeattack — общий prompt и полный prompt/options/correctIndex для каждого item.
- Повторный join существующего `stableUid` не списывает билет повторно и атомарно добавляет текущий `authUid`. Новый участник после `startsAt` получает `join_cutoff_elapsed`.
- Legacy scheduled/lobby без deadline ждут только до `startsAt`, затем отменяются. Legacy active room без deadline или полного immutable `taskSecrets` atomically отменяется; cancellation receipt сохраняет exact-once. Если старая запись входа не содержит provenance, сервер консервативно возвращает `ticketsRequired` комнаты (fallback 1), не пытаясь угадать bank contribution.
- Для legacy rooms без `participantAuthUids` Rules разрешают document listener только точному player id либо stable id из server-owned `auth_links`. Проверка ограничена 16 позициями, не открывает broad active-room list и проходит Rules expression limit даже для участника на позиции 16.
- Cancellation больше не передаёт pure-plan с `undefined` в Firestore. Backend пишет явный allowlist полей и удаляет `stateDeadlineAtMs` через `FieldValue.delete()`.

### RED → GREEN evidence второго цикла

- RED unit/source: `cd functions && npx jest src/tournament_core.test.ts src/tournament_backend_contract.test.ts --runInBand --no-cache` → 12 FAIL / 53 PASS.
- GREEN unit/source: та же команда → 2 suites, 65/65 PASS.
- Emulator RED-1: усиленный production-plan transaction test → 1 FAIL / 4 PASS; Firestore отверг `stateDeadlineAtMs: undefined`.
- Emulator RED-2: legacy participant на позиции 16 → 1 FAIL / 4 PASS; правило достигло лимита 1000 expressions.
- Emulator GREEN: `cd functions && npm run test:emulator:tournament-runtime` → 1 suite, 5/5 PASS. Проверены реальные get/list/query Rules, denied writes/taskSecrets, concurrent production join plan и exact-once legacy cancellation/refund plan.
- TypeScript: `cd functions && npx tsc --noEmit` → exit 0.
- Корневой security gate: `npx jest tests/firestore_rules_security.test.ts --runInBand --no-cache` → 68/68 PASS; остаётся прежнее Jest forced-exit/open-handle предупреждение.

### Дополнительные изменённые файлы

- `functions/src/tournament_runtime.emulator.test.ts` — реальный Firestore emulator runtime для access/query и транзакционных гонок.
- `functions/package.json` — воспроизводимая команда `test:emulator:tournament-runtime`.
- Остальные изменения второго цикла находятся в ранее перечисленных `tournament_core.ts`, `tournaments.ts`, их focused tests и `firestore.rules`.

### Остаточная неопределённость и следующий шаг

- Emulator доказывает Rules и Firestore transaction retry локально, но не заменяет staging с развёрнутыми callable/scheduler, индексом и TTL policy.
- Legacy fallback намеренно может вернуть один билет бывшему free-entry пользователю, если provenance отсутствует. Это безопасная сторона совместимости: пользователь не остаётся списанным; неизвестный bank contribution не уменьшается без доказательства.
- Voice, XP cashback, avatar-frame expiry, referral tickets и season payout остаются выключенными до появления соответствующих authoritative contracts.
- Следующий шаг не изменился: fresh review этого замороженного diff, затем только по отдельному разрешению — staging deploy/smoke. Production deploy этой сессией не разрешён.

---

## 7. Третий hardening после повторного независимого review — 2026-07-22

### Закрытые findings

- `participantAuthUids` теперь считается авторитетным только при явном `participantAuthUidsComplete: true`. Новые комнаты создаются с полным флагом, а legacy-комнаты с частично восстановленным массивом продолжают безопасный `auth_links` fallback для остальных реальных участников. Эмулятор проверяет 16 участников после повторной авторизации одного из них: все законные точечные listener/get разрешены, outsider и broad list/query запрещены.
- Чтение immutable `taskSecrets` различает доказанное отсутствие/невалидность данных и временный инфраструктурный отказ. Только первый случай может привести к legacy cancellation; `permission-denied`, `internal` и другие rejected reads пробрасываются для retry до любой транзакционной записи, refund или смены состояния.
- Emulator suite больше не тестирует упрощённые копии планов: он напрямую вызывает экспортированные production handlers `tournamentJoinTransaction`, `tournamentSubmitTransaction`, `tournamentFinalizeTransaction`, `tournamentClaimTransaction`, `tournamentCancelTransaction`, `advanceRoomAtDeadline` и `scanLegacyTournamentRooms`.
- Legacy recovery scan получил persisted cursor `tournamentSchedule/_legacy_recovery_cursor_v1` по `(startsAt, roomId)`. Каждая минута обрабатывает ограниченную страницу и продвигает курсор; после конца выборки курсор сбрасывается. Эмулятор доказывает достижение legacy-комнаты за более чем 800 современными активными комнатами.
- Реальный production finalize дополнительно выявил и закрыл Firestore-сбой: вместо spread всего domain room с необязательными `undefined` полями транзакция пишет явный allowlist полей финализации.

### RED → GREEN evidence третьего цикла

- RED unit/source до production-изменений: `cd functions && npx jest src/tournament_core.test.ts src/tournament_backend_contract.test.ts --runInBand --no-cache` → 4 FAIL / 63 PASS.
- RED emulator до production-изменений: `cd functions && npm run test:emulator:tournament-runtime` → 5 FAIL / 1 PASS.
- Промежуточный emulator RED после основных исправлений: 1 FAIL / 5 PASS; Admin Firestore отверг `ticketsRequired: undefined` из `...plan.room` в production finalize. После явной сериализации функциональный сбой исчез; лимит emulator suite увеличен с 5 до 30 секунд без изменения assertions или числа конкурентных вызовов.
- GREEN focused: `cd functions && npx jest src/tournament_core.test.ts src/tournament_backend_contract.test.ts --runInBand --no-cache` → 2 suites, 67/67 PASS.
- GREEN emulator: `cd functions && npm run test:emulator:tournament-runtime` → 1 suite, 6/6 PASS. Warning `PERMISSION_DENIED` ожидаем: тест намеренно доказывает запрет клиентской записи.
- TypeScript: `cd functions && npx tsc --noEmit` → exit 0.
- Корневой security gate: `npx jest tests/firestore_rules_security.test.ts --runInBand --no-cache` → 68/68 PASS; прежнее forced-exit/open-handle предупреждение остаётся только у корневого Jest.
- `git diff --check` → exit 0; только существующие line-ending warnings.

### Фактическое состояние и следующий точный шаг

- Третий цикл менял только tournament backend/rules/tests и этот handoff поверх сохранённого общего dirty-state. Commit, push, deploy, rollback и production access не выполнялись.
- На момент заморозки общий checkout: `C:\appsprojects\phraseman`, branch `feature/referral-roulette`, HEAD `0fdcd2654`; настроенный upstream не обнаружен. HEAD менялся из-за параллельной работы в общем workspace, tournament-изменения остаются незакоммиченными.
- Следующий шаг: fresh read-only review замороженного tournament diff с повторным запуском четырёх GREEN-команд выше. Acceptance: reviewer подтверждает отсутствие P1/P2, прямое покрытие production transaction handlers, сохранение legacy listener-доступа и отсутствие записей при transient secret-read failure.
- После review владелец отдельно решает вопрос staging deploy/smoke. Локальный emulator не доказывает развёрнутые scheduler/callable, production index/TTL policy или поведение под реальной сетевой задержкой; production release не разрешён.

---

## 8. Четвёртый hardening: Firestore size/economy safety — 2026-07-22

### Закрытый P1

- Поля заданий теперь проверяются по UTF-8 byte length до любого попадания в room или `taskSecrets`: `taskId` 160 B, `mode` 40 B, phrase/prompt 512 B, option/token 128 B, reference/answer 1024 B, tag 64 B. Массивы ограничены: tags 12, word bank/correct tokens 32, timeattack items 8, timeattack options 6, task ids 8 на раунд, task secrets 32 на fill.
- Payload каждого режима имеет закрытый allowlist. Неизвестные поля, вложенные объекты и массивы больше не сохраняются даже в приватный `taskSecrets`; это исключает обход публичной схемы через огромный неизвестный private payload.
- `validateTournamentFillMutation` детерминированно сериализует полный write envelope с отсортированными ключами: итоговую room mutation, public rounds/tasks, всех игроков, metadata и уникальные `taskSecrets`. Жёсткий aggregate budget — 384 KiB, существенно ниже лимита Firestore 1 MiB и с запасом на Firestore overhead.
- `tournamentFillRoomTransaction` теперь является экспортированным production handler. Если build, bot quorum, schema или aggregate budget детерминированно невалидны, тот же Firestore transaction ставит cancellation marker, возвращает билеты и bank contribution, начисляет одну компенсацию и создаёт exact-once receipts. Комната не остаётся в lobby для повторения того же падающего fill.
- Любая инфраструктурная ошибка до/во время commit пробрасывается наружу: транзакция не пишет room/economy и остаётся retryable. Emulator seam `beforeWrites` подтверждает abort до первой записи и успешный последующий retry того же production handler.
- Legacy `cancel_resources` больше не загружает pool и не запускает повторно потенциально тот же failing fill: recovery сразу выполняет exact-once cancellation/refund. При гонке `not_enough_players` повторный fill сохранён только для случая, когда quorum действительно успел измениться.

### RED → GREEN evidence четвёртого цикла

- RED focused: `cd functions && npx jest src/tournament_core.test.ts src/tournament_backend_contract.test.ts --runInBand --no-cache` → 4 FAIL / 66 PASS. Падали unknown private payload, отсутствующие byte bounds, cumulative budget и round taskIds guard.
- RED emulator: `cd functions && npm run test:emulator:tournament-runtime` → 2 FAIL / 6 PASS: production fill handler и bounds отсутствовали.
- GREEN focused: та же команда → 2 suites, 72/72 PASS. Включены schema-valid, но cumulatively oversized timeattack tasks; multibyte Unicode; exact-bound valid set; oversized taskIds.
- GREEN emulator: `cd functions && npm run test:emulator:tournament-runtime` → 1 suite, 8/8 PASS. Oversize production fill с 8 людьми отменён атомарно; concurrent replay не дал второй refund; каждому возвращён 1 ticket + 3 shards, bank 16→0, один receipt. Transient abort оставил room/economy без изменений и следующий retry завершился `filled`. `PERMISSION_DENIED` warning ожидаем от отдельного assertFails Rules-теста.
- TypeScript после production-рефактора: `cd functions && npx tsc --noEmit` → exit 0. Финальный повтор после параллельного изменения общего workspace остановился только на чужом `src/referral_spin_ledger.test.ts(7,3) TS2724`: отсутствует экспорт `reconcileLedgerRowsForClaim`; tournament-файлы в выводе ошибок отсутствуют. Referral scope не изменялся.
- Корневой security gate: `npx jest tests/firestore_rules_security.test.ts --runInBand --no-cache` → 68/68 PASS; прежний forced-exit/open-handle warning остаётся.
- Scoped `git diff --check` → exit 0; только line-ending warnings.

### Состояние заморозки и следующий шаг

- Общий checkout на момент четвёртой заморозки: `C:\appsprojects\phraseman`, branch `feature/referral-roulette`, HEAD `5302ba365`; upstream не обнаружен. HEAD снова изменился из-за параллельной работы, tournament diff остаётся незакоммиченным.
- Commit, push, deploy, release, rollback и production access не выполнялись. Чужой dirty-state сохранён.
- Следующий точный шаг: fresh read-only review этого нового freeze. Acceptance: нет P1/P2; reviewer подтверждает byte-aware bounds, закрытые private schemas, conservative aggregate budget, atomic invalid-resource refund и retry-with-zero-writes для transient failure. После этого общий TypeScript gate должен быть повторён владельцем referral scope после устранения внешнего TS2724, а staging deploy/smoke возможен только по отдельному разрешению.
