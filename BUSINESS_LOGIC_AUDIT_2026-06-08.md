# Аудит бизнес-логики Phraseman — что приложение упускает
**Дата:** 2026-06-08 · **Метод:** 8 параллельных доменных аудиторов → адверсариальная верификация каждой находки → синтез. · **Фокус:** экономика и античит.

## Сводка

| Severity | Количество |
|----------|------------|
| Critical | 4 |
| High     | 19 |
| Medium   | 21 |
| Low      | 8 |

Проверено 84 кандидата, опровергнуто 29, подтверждено 52. Главный вывод: экономика Phraseman держится на честности клиента. Прогресс уроков, экзаменов, дневных заданий, XP и осколков начисляется и валидируется локально в AsyncStorage без серверной проверки, а Firestore Rules разрешают владельцу писать любые поля своего документа. Это даёт класс эксплойтов «отредактируй JSON → получи награды». Второй системный класс — отсутствие идемпотентности: гонки и дубли запросов на серверных функциях (TOCTOU read-modify-write вместо `FieldValue.increment`, дедупликация по клиентскому `sessionId`, merge перезаписывающий nested-счётчики).

## Критические и высокие находки

### Домен: Прогресс уроков/экзаменов/заданий (клиент как источник истины)

### [CRITICAL] Прогресс урока сохраняется только на клиенте без валидации
- **Файл:** `app/lesson1.tsx:2370-2371`
- **Что упущено:** `np` (массив статусов фраз) и `cellIndex` пишутся в AsyncStorage без checksum, подписи и cross-check. Финальный счёт `correct/effectiveTotal*5` вычисляется на клиенте (строки 2399-2409) и используется для разблокировки. Firestore Rules (`firestore.rules:57-89`) не валидируют `lesson_*_best_score`, `cloud_sync.ts:774-775` берёт max двух значений без проверки источника.
- **Чем грозит бизнесу:** пользователь редактирует JSON, отмечает 50 фраз как correct, мгновенно получает XP, осколки, медали и разблокирует следующие уроки. Полная инфляция экономики.
- **Как чинить:** при завершении урока клиент отправляет serverLog ответов `[{phraseIndex, correct, timestamp}]`; сервер пересчитывает счёт в CF и только тогда начисляет награды. Не доверять `np[]` из AsyncStorage.
- **Верификация:** подтверждено. `tryUnlockNextLesson` (`lesson_lock_system.ts:70-85`) сохраняет id урока без проверки реального прохождения; `registerXP` начисляет без проверки answers; наличие `tester_no_limits` (строки 2403-2405) подтверждает отсутствие защиты.

### [CRITICAL] Дневные задания могут быть выполнены через редактирование daily_tasks ключа
- **Файл:** `app/daily_tasks.ts` (ключ `daily_tasks_{YYYY-MM-DD}`, `target_storage_keys.ts:254-256`)
- **Что упущено:** прогресс заданий — JSON в AsyncStorage без checksum. Claim-валидация (`daily_tasks.ts:2954-2960`) читает только локальный `loadTodayProgress`, `registerXP('daily_task_reward')` не делает серверных проверок.
- **Чем грозит бизнесу:** установив `completed: true`, пользователь получает ежедневные XP, осколки и streak-бонус без выполнения. За месяц — годовая норма наград без обучения.
- **Как чинить:** хранить состояние заданий на сервере; при submit отправлять данные в CF, которая валидирует факт выполнения (например, по логам `lesson_complete`).
- **Верификация:** подтверждено. AsyncStorage без криптозащиты, нет серверной валидации ни в claim, ни в `registerXP`.

### [HIGH] Награды за perfect pass урока выдаются клиентом без валидации
- **Файл:** `app/lesson_complete.tsx:600-645`
- **Что упущено:** `correct === effectiveTotal` проверяется на клиенте из локального `progress[]`, затем `addShards('lesson_perfect')` без дедупликации/reward_claims.
- **Чем грозит бизнесу:** бонус за perfect выдаётся повторно при каждом открытии экрана завершения и при отредактированном прогрессе.
- **Как чинить:** начислять только после серверного подтверждения финального счёта; запретить клиенту самостоятельно начислять осколки за lesson/quiz/exam.
- **Верификация:** подтверждено. `addShards` (`shards_system.ts:299-338`) добавляет без проверки дублирования; нет reward_claims-ключа как у daily_tasks_all.

### [HIGH] Нет cross-match между фактическим счётом и финальной оценкой экзамена
- **Файл:** `app/level_exam.tsx:760-762`
- **Что упущено:** `correctCount`, `pct`, `passed` вычисляются на клиенте из `choices[]`; сервер не пересчитывает счёт при `finishExam`. Результат пишется в AsyncStorage (строка 733) без верификации.
- **Чем грозит бизнесу:** отредактировав `choices[]` в памяти, пользователь проходит экзамен с 0% и получает passed + награды + разблокировку уровня.
- **Как чинить:** сервер хранит правильные ответы; клиент отправляет `choices[]`; сервер пересчитывает и только затем начисляет.
- **Верификация:** подтверждено. `lesson_lock_system.ts:160-165` читает `passed` из AsyncStorage без серверной верификации.

### [HIGH] Нет rate-limit на регистрацию XP и shards
- **Файл:** `app/xp_manager.ts`, `app/shards_system.ts`
- **Что упущено:** `registerXP()` и `addShards()` без throttle на клиенте и сервере. `addShardsRaw` (`shards_system.ts:473`) экспортирована и принимает произвольное число. Firestore Rules разрешают update владельцу без ограничений на поля.
- **Чем грозит бизнесу:** через DevTools/бота — тысячи XP и осколков в день без обучения.
- **Как чинить:** CF-валидация с rate-limit по user_id (≤100 XP/мин), серверная валидация источника начисления, дебаунс на клиенте.
- **Верификация:** подтверждено. `applyShardDeltaToCloud` проверяет только `next >= 0` (строка 269).

### [HIGH] Прогресс может быть потерян при оффлайне без синхронизации
- **Файл:** `app/lesson1.tsx:2370-2372`, `app/cloud_sync.ts`
- **Что упущено:** правильные ответы синхронизируются через `registerXP → syncToCloud({deferMs:3500})` (race при краше в первые 3.5 с); **неправильные ответы не вызывают `registerXP` → не синхронизируются вовсе**.
- **Чем грозит бизнесу:** потеря промежуточного прогресса → фрустрация → падение retention.
- **Как чинить:** синхронизировать прогресс на завершении цикла урока; награды только после подтверждения.
- **Верификация:** подтверждено частично.

### Домен: Экономика — осколки, подарки, рефералы

### [HIGH] Контрибьюция в клубных войнах может быть записана дважды
- **Файл:** `functions/src/arena_club_wars.ts:69-186`
- **Что упущено:** `contributionId = {weekId}_{sessionId}_{stableUid}`, `sessionId` из `request.data` (контролируется клиентом). Изменив `sessionId` (`-retry`), клиент создаёт второй contribution, `FieldValue.increment(points)` применяется дважды.
- **Чем грозит бизнесу:** удвоение клубных баллов, нарушение экономики лиги.
- **Как чинить:** дедуп по доверенному источнику; проверять, что сессия `finished` и принадлежит игроку.
- **Верификация:** подтверждено по коду.

### [HIGH] friend_gift_daily_limits merge обнуляет nested-счётчик recipients
- **Файл:** `functions/src/friend_gifts.ts:328-335`
- **Что упущено:** `tx.set(..., { recipients: { [friendStableId]: n+1 } }, {merge:true})` — merge заменяет весь объект `recipients`.
- **Чем грозит бизнесу:** обход per-friend лимита подарков → gift spam.
- **Как чинить:** nested через FieldPath: `{ ['recipients.' + friendStableId]: FieldValue.increment(1) }`.
- **Верификация:** подтверждено.

### [HIGH] Дневной счётчик зелий обходится параллельными запросами (TOCTOU)
- **Файл:** `functions/src/admin_grant.ts:131-136`
- **Что упущено:** read-modify-write вместо `FieldValue.increment`; два параллельных вызова пишут одинаковый `next`.
- **Чем грозит бизнесу:** больше зелий в день, чем задумано.
- **Как чинить:** `FieldValue.increment()`; requestId/дедупликация.
- **Верификация:** классическая TOCTOU.

### [HIGH] Community pack: self-purchase через alt-stableId одного authUid
- **Файл:** `functions/src/community_packs.ts:771-916`
- **Что упущено:** self-purchase проверяет только `stableId`, не `authUid`. Один authUid → до 50 stableId.
- **Чем грозит бизнесу:** перевод осколков между своими аккаунтами, извлечение валюты.
- **Как чинить:** сверять `firebaseAuthUid` автора и покупателя; rate-limit; мониторинг.
- **Верификация:** подтверждено; эксплойт тривиален.

### Домен: Арена PvP — скоринг и финализация

### [CRITICAL] Нет финализации aborted-сессий — orphan-игроки без откатов
- **Файл:** `functions/src/index.ts:605-901`
- **Что упущено:** `onArenaSessionFinished` срабатывает только на `finished`. Переход в `aborted` не обрабатывается; нет откатов рейтинга/XP/звёзд.
- **Чем грозит бизнесу:** игроки теряют XP/звёзды без отката; «призрачные» очки; ломается лидерборд.
- **Как чинить:** триггер `onArenaSessionAborted` для отката + удаление orphan `session_players`.
- **Верификация:** подтверждено; `arena_cleanup.ts:25` комментирует отсутствие начисления при abort.

### [HIGH] Нет защиты от повторного onAnswerSubmitted за один ответ
- **Файл:** `functions/src/index.ts:521-602`
- **Что упущено:** окно между проверкой `if (pending.serverScored) return` и `tx.update` с increment. Два инстанса читают `serverScored===false`, оба инкрементят.
- **Чем грозит бизнесу:** двойное начисление очков; искажение исхода матча.
- **Как чинить:** проверять `serverScored` внутри той же транзакции; `answerIdempotencyId`.
- **Верификация:** подтверждено.

### [HIGH] Forfeit не откатывает рейтинг в state='question'
- **Файл:** `functions/src/index.ts:629-705`
- **Что упущено:** forfeit-игроку безусловно ставится `isLast=true` → `-1` звезда в ranked. Нет проверки forfeit vs честный проигрыш.
- **Чем грозит бизнесу:** игрок теряет рейтинг при дисконнекте — нечестное наказание.
- **Как чинить:** при `forfeitedBy` ставить `xpDelta=0`, `newStars=oldStars`.
- **Верификация:** подтверждено по коду.

### [HIGH] Нет rate-limit на arenaHillRecordAttempt — фарм побед Hill
- **Файл:** `functions/src/arena_hill.ts:97-194`
- **Что упущено:** дедуп по `sessionId`, но клиент генерирует бесконечно `bot_hill_{timestamp}`. Нет лимита попыток/побед в день.
- **Чем грозит бизнесу:** спам 1000+ запросов → гарантированный трон Hill + THRONE_REWARD_SHARDS.
- **Как чинить:** rate-limit/cooldown по игроку, либо серверный `sessionId`.
- **Верификация:** подтверждено.

### Домен: Монетизация и подписки

### [HIGH] RevenueCat webhook не обрабатывает REFUND
- **Файл:** `functions/src/revenuecat_shards.ts:16-32`
- **Что упущено:** `REFUND` отсутствует в `PREMIUM_INACTIVE_EVENTS`; при возврате premium не деактивируется.
- **Чем грозит бизнесу:** возврат денег + сохранённый Premium = прямая потеря дохода.
- **Как чинить:** добавить `REFUND` в `PREMIUM_INACTIVE_EVENTS`.
- **Верификация:** подтверждено.

### Домен: Время/ключи дня и retention-push

### [HIGH] Рассинхрон часовых поясов в расчёте дневного ключа (local vs UTC)
- **Файл:** `app/daily_tasks.ts:1984-1986`, `app/arena_daily_limit.ts:21-22`, `app/streak_safety.ts:56-57`
- **Что упущено:** `getTodayKey()` — local time, `todayStr()`/`todayKey()` — UTC. Около полуночи ключи расходятся.
- **Чем грозит бизнесу:** двойной сбор дневных наград, потеря прогресса задач, сломанный лимит Арены, несправедливый сброс streak.
- **Как чинить:** унифицировать всё на UTC; unit-тест на граничный день.
- **Верификация:** подтверждено.

### [HIGH] Отсутствует push при получении подарка от друга
- **Файл:** `functions/src/friend_gifts.ts:154-381`
- **Что упущено:** `friendSendGift` не вызывает Expo Push; нет триггера на `friend_gifts_received`.
- **Чем грозит бизнесу:** ключевая retention-фича даёт 0 переоткрытий.
- **Как чинить:** после commit отправлять Expo Push получателю.
- **Верификация:** подтверждено.

### [HIGH] Отсутствует push при завершении матча
- **Файл:** `functions/src/index.ts:605-901`
- **Что упущено:** после финализации нет push о результате. (matchmaking-push работает корректно.)
- **Чем грозит бизнесу:** игрок в фоне не узнаёт исход PvP → не возвращается.
- **Как чинить:** push участникам после `onArenaSessionFinished`.
- **Верификация:** подтверждено для завершения матча.

### [HIGH] failedChunks в re_engage_push не ретраятся — потеря streak-push
- **Файл:** `functions/src/re_engage_push.ts:260-288`
- **Что упущено:** при ошибке только `failedChunks++`, но `lastReEngagePushAt=now` ставится ВСЕМ. Чанк теряется.
- **Чем грозит бизнесу:** для `streak_at_risk` потеря push невосстановима → серия сгорает.
- **Как чинить:** ретрай с backoff; `lastReEngagePushAt` только успешным.
- **Верификация:** подтверждено.

### Домен: Auth / идентичность / удаление аккаунта

### [HIGH] firebaseAuthUid nullable → выдача себя за legacy-аккаунт
- **Файл:** `functions/src/auth_identity.ts:68-69`, `functions/src/friend_gifts.ts:198-199`
- **Что упущено:** `if (linkedAuthUid && linkedAuthUid !== request.auth.uid)` пропускает доступ при пустом `linkedAuthUid`.
- **Чем грозит бизнесу:** действие от имени legacy-аккаунта — траты чужих осколков. (Связано с H3 security-аудита, другие места.)
- **Как чинить:** требовать явное совпадение; при пустом — `throw 'no_auth_link'`.
- **Верификация:** подтверждено в friend_gifts.

### [HIGH] friend_code переиспользуется после удаления владельца
- **Файл:** `functions/src/friend_codes.ts:96-115`
- **Что упущено:** проверка не срабатывает, когда index-документ удалён вместе с аккаунтом.
- **Чем грозит бизнесу:** опубликованный код достаётся новому владельцу → перехват referral-бонусов.
- **Как чинить:** tombstone кода, отклонять повторный захват.
- **Верификация:** подтверждено; `account_delete.ts:61-62`.

### [HIGH] account_delete оставляет orphan-документы при timeout/crash
- **Файл:** `functions/src/account_delete.ts:641-683`
- **Что упущено:** стадии последовательны с немедленным commit; tombstone только при полном успехе. Нет idempotency/resume.
- **Чем грозит бизнесу:** orphan-данные, нарушение GDPR.
- **Как чинить:** `account_deletion_log` со стадиями; на resume пропускать завершённые.
- **Верификация:** подтверждено.

## Средние и низкие находки

| Severity | Заголовок | Файл | Суть |
|----------|-----------|------|------|
| Medium | Рассинхрон user_total_xp vs arena_profiles.xp | `index.ts:189-248` | Два источника истины XP; ограничено до sync. |
| Medium | Нет cap на totalMultiplier | `app/xp_manager.ts:144-211` | Множители суммируются до ~10-11x. Чинить: `Math.min(8, ...)`. |
| Medium | Фарм XP при сбое syncToCloud | `app/xp_manager.ts:272-274` | Локальный XP остаётся повышенным при сетевой ошибке. |
| Medium | Потеря weekly_xp на Monday 00:00 UTC | `reset_weekly_xp.ts:32-73` | Race; есть self-heal. Чинить: transaction. |
| Medium | Self/cycle-referral A→B→A | `referral.ts:306-308` | Прямой self заблокирован, циклы/фарм окном 14 дней возможны. |
| Medium | Лидерборд: дубли при account-merge | `sync_leaderboard.ts:86-122` | Несколько users-доков с одним authUid. Чинить: Set dedup. |
| Medium | Rematch даёт «бесплатный» XP | `index.ts:629,761-775` | type='rematch' начисляет XP без риска звёзд. Чинить: xpDelta=0. |
| Medium | Нет валидации playerIds==session_players | `index.ts:638-659` | Orphan-доки молча пропускаются. |
| Medium | onQuestionTimeout зависит от клиента | `index.ts:1003-1033` | При краше сессия висит до cleanup (2 ч). |
| Medium | Нет валидации timeMs от клиента | `index.ts:576-584` | Отрицательное → 0 → max speedBonus. Чинить: clamp. |
| Medium | Rematch-orphans (countdown→aborted) | `index.ts:904-1001` | Мусор данных. |
| Medium | League crown дважды при ничье | `league_chest.ts:436-451` | Нестабильная сортировка. Чинить: (points desc, uid asc). |
| Medium | RevenueCat: двойное начисление (race) | `revenuecat_shards.ts:297-378` | Защищено OCC; риск низкий. |
| Medium | Cardpack-ваучер дважды с двух устройств | `app/flashcards/cardPackShardPurchase.ts:82-110` | Нет атомарного серверного потребления. |
| Medium | Premium expiry < 0 → вечный доступ | `app/premium_guard.ts:80-88` | Чинить: `Math.max(0, parseInt)`. |
| Medium | Нет push при BILLING_ISSUE | `revenuecat_shards.ts:25-28` | Retention-gap. |
| Medium | Ghost-челлендж: дубль playCount | `arena_ghosts.ts:120-148` | Инфляция метрик. Чинить: дедуп-doc. |
| Medium | Экзамены без лимита попыток | `app/level_exam.tsx:723-758` | +1 осколок за каждую сдачу ≥70%. |
| Medium | Нет проверки порядка предусловий уроков | `lesson_lock_system.ts:49-65` | UI-неточность; реальный доступ блокируется score≥2.5. |
| Medium | Нет server-side сессии экзамена | `app/exam.tsx:461-470` | Можно подсмотреть ответы и пересдать. |
| Medium | League group boost дважды при CF timeout | `league_groups.ts:395-475` | Read-modify-write без idempotency-key. |
| Medium | Два устройства — два friend_code | `friend_codes.ts:80-142` | Дубль/потеря referral. |
| Low | weekly_xp sticky-path при restore | `app/weekly_xp.ts:38-52` | Минимально; есть self-heal. |
| Low | Нет инварианта weekly_xp ≤ user_total_xp | `app/weekly_xp.ts:38-52` | Маловероятно из-за _xpLock. |
| Low | Дубль XP при переустановке без sync | `app/xp_manager.ts:123-308` | В основном защищено cloudXP>localXP. |
| Low | Hill daily throne: отказ в награде | `arena_hill_daily_reward.ts:44-62` | Потенциальный отказ начисления, не misdelivery. |
| Low | Telegram Premium: поддельный nickname | `telegram_premium_bot.ts:565-584` | Rules запрещают client create; спам дорог. |
| Low | friend_activity_like: мусор-документы | `friend_activity_likes.ts:70-72` | Накопление без TTL. |
| Low | Orphan daily_tasks при смене уровня/Premium | `app/daily_tasks.ts:2654-2700` | Техдолг, не накапливается. |
| Low | last_active_date vs last_active_at | `re_engage_push.ts:39` | Рассинхрона нет на практике. |
| Low | friend_activity_mirror лаг 0-6 ч | `friend_activity_mirror.ts:90-159` | Архитектурный trade-off. |

## Тематические выводы

**Клиент как источник истины для экономики.** Самый массовый и тяжёлый класс. Прогресс уроков, экзаменов, дневных заданий, XP и осколков считается и сохраняется в AsyncStorage без серверной валидации, без checksum/подписи, а `firestore.rules` разрешают владельцу записывать любые поля своего документа. Любой путь — редактирование JSON прогресса, подмена `choices[]` экзамена, флага `completed` задания, вызов `addShardsRaw`/`registerXP` в цикле через DevTools — даёт неограниченную инфляцию валюты и взрыв лидербордов. Системное лечение: перенести начисление наград за обучение в Cloud Functions, которые пересчитывают результат из лога ответов и являются единственным писателем критичных полей (XP, shards, unlocks).

**Отсутствие идемпотентности и TOCTOU на серверных операциях.** admin-гранты (read-modify-write вместо increment), скоринг ответов (окно между проверкой флага и increment), клубные войны и Hill (дедуп по клиентскому sessionId), league group boost (без requestId). Транзакция Firestore гарантирует консистентность снимка, но не защищает от двух параллельных или повторно доставленных (at-least-once) вызовов. Лечение: идемпотентные ключи, `FieldValue.increment`, серверная генерация sessionId, проверка флага внутри той же транзакции.

**Незавершённые состояния и orphan-данные.** `onArenaSessionFinished` обрабатывает только `finished`; `aborted` не откатывается — теряются звёзды/XP, копятся orphan `session_players`. `account_delete` без resume оставляет orphan при таймауте, удаление аккаунта переоткрывает friend_code. Нужны явные обработчики терминальных состояний и идемпотентные возобновляемые операции.

**Рассинхрон ключей/полей и retention-пробелы.** Смешение local-time и UTC при расчёте дневного ключа даёт двойные сборы и потерю прогресса. Дублирование источников (user_total_xp vs arena_profiles.xp, два friend_code на authUid). Retention: нет push при подарке и завершении матча, нет retry для streak-push, REFUND не деактивирует premium. Лечение: единый UTC-ключ, один канонический источник на сущность, закрытие push-петель.

## Что НЕ нашли проблем (зоны выглядящие здоровыми)

- **RevenueCat дедупликация платежей** — защищено OCC Firestore-транзакций.
- **Идемпотентность лайков активности друзей** — дата серверная (UTC), «infinite farm» опровергнут.
- **week_points_v2 / достижения** — self-heal через `resetWeekPointsIfStale`.
- **Matchmaking push** — реально отправляется с защитой от double-matching.
- **Реальная блокировка доступа к урокам** — второй уровень `isLessonUnlockedByEarnedProgress` (score≥2.5).
- **friend_activity_mirror / Hill daily throne** — стабильные doc-id; championAuthUid обновляется корректно.
- **Telegram Premium заказы** — клиентский create запрещён Rules.

---
_Связанный отчёт: `SECURITY_AUDIT_2026-06-07.md` (16 security-находок). Данный аудит покрывает бизнес-логику и НЕ повторяет security-CVE._
