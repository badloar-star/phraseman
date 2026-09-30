# Инвентаризация runtime XP (PM-067)

READ-ONLY инвентаризация для будущей задачи PM-068 (удаление). Ничего не удалено и не изменено.
Основание: `docs/phraseman-2.0/PROGRESS.md` раздел 1, решение D02 — XP и обычный уровень удаляются
полностью, заменяются рангом монеты (уже частично реализовано: PM-073/075/076 — ветка монет ранга).

Дата инвентаризации: 2026-09-24. HEAD ветки `feature/referral-roulette` на момент разведки не
зафиксирован отдельным SHA (см. PM-067 preflight — `Audit SHA: не установлен`); эта таблица не
заменяет обязательный preflight PM-068.

Область поиска: `app/`, `functions/src/`, `components/` (без `.claude/worktrees/`, `.worktrees/`,
`_archive/`, `node_modules/`). Обнаружены посторонние копии рабочего дерева
(`.worktrees/post-delete-fresh-identity/...`) — содержат собственные копии `xp_manager.ts`,
`xp_levels.ts` и тестов; в эту инвентаризацию НЕ включены (это копия, не источник истины), но
отмечаю на случай, если PM-068 наткнётся на них как на "ещё один xp_manager".

---

## 1. Начисления XP (`registerXP(...)`, `app/xp_manager.ts`)

24 вызывающих места вне тестов. Все идут через единственную точку входа `registerXP` в
`app/xp_manager.ts`. Сложность удаления вызова — **тривиальна везде** (это все листья: убрать вызов
или заменить на начисление coin_rank), но сама функция `registerXP` — узел с побочными эффектами
(weekly_xp, season_pass, achievements-каскад, level-up реконсиляция) — **требует замены логики**.

| Домен | Файл:строка | reason | Заметка |
|---|---|---|---|
| Уроки | `app/lesson1.tsx:3179` | `lesson_answer` | основной поток начисления за урок |
| Уроки | `app/lesson_words.tsx:3099` | `vocabulary_learned` | |
| Уроки | `app/lesson_help.tsx:389` | `vocabulary_learned` | |
| Уроки | `app/lesson_theory_v2.tsx:236` | `vocabulary_learned` | |
| Уроки | `app/lesson_irregular_verbs.tsx:627` | `verb_learned` | |
| Уроки | `app/preposition_drill.tsx:252,420` | `preposition_drill_perfect` / `_answer` | 2 вызова в одном файле |
| Уроки | `app/hint.tsx:193` | `vocabulary_learned` | |
| Уроки (бонус) | `app/lesson_bonus_grant.ts:186` | `bonus_chest` | |
| Learning V2 | `app/learning_v2_direct_session_player_v1.tsx:2027` | (многострочный вызов) | новая сессионная система — важно свериться, не дублирует ли она начисление со старым `lesson1.tsx` |
| Диалоги | `app/ai_dialog_session.tsx:1293` | `dialog_complete` | |
| Диалоги | `app/ai_dialog_tutor_session.tsx:200` | `dialog_complete` | |
| Диалоги (MAX) | `app/max_voice_xp_award.ts:106` | `max_voice` | ⚠️ раздел MAX законсервирован (см. CLAUDE.md) — код не удалять без снятия пломбы, но это отдельная точка начисления XP |
| Персональный план | `app/personal_plan_xp.ts:133` | `plan_task_complete` | есть свой леджер `app/personal_plan_xp_ledger.ts` — отдельная бухгалтерия внутри XP-системы |
| Стрики | нет прямого вызова `registerXP` в `streak_repair.ts`/`streak_stats.tsx` — стрик влияет на множители, не начисляет сам | | косвенно завязан, см. раздел 4 |
| Экзамены | `app/exam.tsx:788` | `exam_complete` | |
| Экзамены | `app/level_exam.tsx:950` | `exam_complete` | |
| Экзамены | `components/level-exam/LevelExamV2.tsx:210` | `exam_complete` | дублирующая реализация (старая + V2) |
| Диагностика | `app/diagnostic_test.tsx:1094` | `diagnostic_test` | |
| Достижения | `app/achievements.ts:1810` | `achievement_reward` | ⚠️ самоподдерживающийся каскад — см. раздел 4 |
| Достижения (ошибка отчёта) | `app/error_report.ts:231` | `achievement_reward` | побочный путь начисления через отчёты об ошибках |
| Level gift | `app/level_gift_system.ts:2908` | `achievement_reward` | подарок за уровень тоже начисляет XP (!) — потенциальный цикл level→gift→XP→level |
| Level-up бонус | `app/_layout.tsx:820` | `level_up_bonus` | начисление XP ЗА получение уровня — рекурсивный риск при удалении уровня |
| Друзья вместе | `app/friends_together/chest_reward_apply.ts:110` | `bonus_chest` | |
| Ежедневный квест | `app/daily_phrase_quest.ts:309` | `daily_phrase_quest` | |
| Спор/ставка (стрик) | `app/streak_wager.ts:355` | `wager_win` | |

**Серверная копия начислений (functions/):** `functions/src/arena_xp.ts` — Арена начисляет XP
СЕРВЕРНО через `arenaXpUserPatch` (не через клиентский `registerXP`), напрямую пишет
`state.totalXp`/`state.level`/`state.weekXp`. Это отдельный путь начисления, не идёт через
`xp_manager.ts`. Сложность удаления: **требует замены логики** — Арена сейчас качает XP, который
одновременно является недельными очками лиги (см. раздел 4, самое рискованное место).

---

## 2. Чтение/отображение XP и старого уровня (`getLevelFromXP`, вне home.tsx/_layout.tsx)

97 упоминаний `getLevelFromXP` найдено вне worktree-копий. `home.tsx` и `_layout.tsx` уже разведаны
в PM-041 (см. `docs/phraseman-2.0/tasks/PM-041.md`) — не дублирую, только сверяю: PM-041 явно
пишет "xp_manager.ts (начисление XP) НЕ трогать — это S2-миграция PM-067/068/069", то есть эта
инвентаризация продолжает именно ту работу.

Домены вне home/_layout:

| Домен | Файлы | Сложность |
|---|---|---|
| Профиль друга/чужой | `app/(tabs)/friends.tsx` (7 мест: 401,476,684,704,882,2919,3757) | требует замены — уровень используется и для выбора аватара/рамки (`getBestAvatarForLevel`), не только для текста |
| Клуб/лига участники | `app/club_screen.tsx:841,1704`, `app/LeagueResultModal.tsx:1447,1554`, `components/league/LeagueResultHybrid.tsx:709,757` | требует замены — уровень определяет визуал (аватар/рамка) участника лиги |
| Профиль (модалка) | `components/PlayerProfileModal.tsx:414`, `components/AvatarView.tsx:97`, `components/DialogsTabContent.tsx:259` | требует замены |
| Стрик-статистика | `app/streak_stats.tsx:2900` | тривиально (только отображение) |
| Снапшоты/гидратация | `app/app_snapshot_bootstrap.ts:141`, `app/app_snapshot_store.ts:364`, `app/home_screen_hydration.ts:157`, `app/personal_progress_store.ts:120` | требует замены — уровень встроен в снапшот-контракт, читается многими потребителями |
| Публичный профиль | `app/public_profile_snapshot.ts:216`, `functions/src/public_profile_projection.ts:137`, `functions/src/friends_profiles.ts:292` | требует замены (серверная проекция + клиент) |
| Прогресс-события | `app/progress_events_client.ts:614`, `functions/src/progress_events.ts` (6 мест: 346,370,706,879,932,1133) | требует замены — `user_level` пишется в событийный поток, вероятно читается аналитикой/Джарвисом (см. правило CLAUDE.md "тронул данные — обнови Джарвиса") |
| Отчёты об ошибках | `app/error_report.ts:109`, `functions/src/report_replies.ts:82,100,105` | требует замены — уровень пользователя попадает в тикет поддержки |
| Achievements | `app/achievements.ts` (импорт) | требует замены |
| Кастомизация (аватар/рамка) | `app/customization_selection_runtime.ts:55` | требует замены — уровень определяет доступный аватар/рамку по умолчанию |
| Восстановление XP | `app/xp_level_restore.ts:36,66` | вероятно весь файл на удаление целиком (сам механизм восстановления теряет смысл без XP) |
| Level-up реконсилятор | `app/level_up_reward_reconciler.ts:474,475` | требует замены логики — см. раздел 4 |
| Level-up очередь показа | `app/home_level_up_celebration_queue.ts:99` | уже упомянут в PM-041 как часть home.tsx-гребня, но сам файл живёт отдельно от home.tsx — уточнить границу с PM-041 |
| Подарки друзей (сервер) | `functions/src/friend_gifts.ts:1042,1043`, `functions/src/level_spin_enrollment.ts:55` | требует замены — уровень определяет доступный подарок/спин |
| Синхронизация лидерборда | `functions/src/sync_leaderboard.ts:48` | требует замены |
| Арена (сервер) | `functions/src/arena_xp.ts:178` | требует замены — см. раздел 4 |
| Источник формулы | `functions/src/xp_levels.ts:38` (`getLevelFromXP` определение), `constants/theme.ts` (реэкспорт для клиента) | ядро — удаляется последним, когда все потребители убраны |

---

## 3. Хранение XP

| Где | Поле/ключ | Комментарий |
|---|---|---|
| AsyncStorage (клиент) | `user_total_xp` | основное поле, читается/пишется в `xp_manager.ts` (7 мест: 507,712,715,942,945,1078,1083) и десятках потребителей выше |
| AsyncStorage (клиент) | `weekly_xp`, `weekly_xp_period_start` (`app/weekly_xp.ts`) | вызывается ИЗ `registerXP` сразу после записи `user_total_xp` (комментарий в коде подтверждает: "called from xp_manager.registerXP() right after user_total_xp is written") |
| Firestore (сервер) | `progress.user_total_xp`, `progressServerState.totalXp`, `.level`, `.weekXp`, `.weekPoints` | `functions/src/progress_events.ts`, `functions/src/arena_xp.ts` — серверная авторитетная копия |
| Firestore (сервер) | `report.userXP` / `report.userLevel` | `functions/src/report_replies.ts` — XP пользователя попадает в тикеты поддержки, денормализовано |
| Season Pass | прогресс сезонного пропуска качается КАЖДЫМ начислением XP (`app/season_pass_model.ts:476` — комментарий "здесь была addSeasonPassXp, которую дёргал registerXP на ЛЮБОЕ начисление") — сейчас, судя по комментарию в прошедшем времени, возможно уже отключено; **нужно перепроверить фактическое состояние `season_pass_model.ts`, не полагаться на комментарий** |

---

## 4. XP/уровень как УСЛОВИЕ ДОСТУПА — самые рискованные места

**Владелец: тут нужно явное решение, не моё предположение.** Простая замена
`getLevelFromXP(totalXp) >= N` на аналогичный порог `coin_rank` может незаметно изменить, кому что
доступно, и это не техническое решение, а продуктовое (пороги ранга монеты не обязаны совпадать по
кривой с прежними уровнями XP).

1. **Диалоги открываются по уровню (D05, PM-014 — уже зафиксировано открытым решением).**
   `components/DialogsTabContent.tsx:453,454,501` — `requiredLevel: scenario.requiredAccountLevel ?? 1`
   сравнивается с `accountLevel = getLevelFromXP(totalXp)` (строка 259). PM-014 существует именно
   под эту замену — "какой уровень (ранг монеты) открывает диалоги после удаления XP" и "Plus не
   обходит ранговый доступ без нового явного решения". **Не трогать до ответа владельца по PM-014.**

2. **Level Gift (подарки за уровень) — целая подсистема на XP-уровне.**
   `app/level_gift_system.ts` — `LEVEL_GIFT_MILESTONE_LEVELS = [5,10,...,100]`,
   `getMilestoneLevelGift(level, ...)` выдаёт подарок (включая `PREMIUM_LEVEL_GIFT_UNLOCK_PACK_IDS` —
   премиум-паки карточек!). `app/level_up_reward_reconciler.ts:467-483` (`reconcileUnlocked`) —
   перебирает КАЖДЫЙ уровень между previousLevel и nextLevel и выдаёт подарок за каждый пройденный
   уровень. Это не просто отображение — это реальная выдача наград (включая, по имени
   `PREMIUM_LEVEL_GIFT_UNLOCK_PACK_IDS`, платный контент). Удаление XP без замены логики на
   coin_rank оставит игроков без пути получения этих подарков вообще, либо потребует миграции уже
   выданных/невыданных подарков. **Высокий риск, нужна явная замена или явное решение "подарки за
   уровень отменяются".**

3. **Арена → недельные очки лиги (`weekXp` = `weekPoints`).**
   `functions/src/arena_xp.ts:170-181` (`arenaXpUserPatch`): `state.weekXp += delta` (где delta —
   это XP-дельта от арены), затем `state.weekPoints = Math.max(state.weekPoints, state.weekXp)`.
   Это означает: очки лиги за неделю ЧАСТИЧНО текут из XP, заработанного в Арене. Проект имеет
   отдельное жёсткое правило `⛔ ЛИГИ: ПОНИЖЕНИЕ ОБЯЗАНО РАБОТАТЬ` и `⛔ ЛИГИ: КЭШ 6 ЧАСОВ` — трогать
   расчёт очков лиги без синхронной правки `app/league_engine.ts` И
   `functions/src/league_finalize_cron.ts` запрещено правилами CLAUDE.md. Удаление XP из Арены
   обязано сохранить (или явно заменить) поток weekPoints, иначе лига массово сломается — класс
   бага, который уже один раз "положил прод" (инцидент 2026-08-17 в CLAUDE.md).

4. **Level Spin (розыгрыш при получении уровня) завязан на `levelBaseline: getLevelFromXP(totalXp)`.**
   `functions/src/level_spin_enrollment.ts:55` — участие в розыгрыше призов идёт по XP-уровню.
   Судя по имени `LEVEL_SPIN_PROTOCOL`, это тоже реальная механика с призами
   (`tests/local_level_spins.test.ts`, `tests/level_spin_currency_rewards.test.ts`,
   `tests/level_spin_reward_definitions.test.ts` существуют — механика активна). Требует замены на
   coin_rank или явного решения отключить.

5. **Уровень попадает в кастомизацию по умолчанию (аватар/рамка).**
   `app/customization_selection_runtime.ts:55` — `getBestAvatarForLevel(level)` /
   `getBestFrameForLevel(level)` выбирают дефолтные визуальные элементы по XP-уровню, когда
   пользователь ничего не выбрал сам. Менее рискованно, чем 1-4 (не блокирует функциональность,
   только косметика по умолчанию), но тоже требует решения, на что заменить условие выбора.

6. (менее критично, но отмечаю) **Достижения → XP → достижения — самоподдерживающийся каскад.**
   Комментарий в самом коде (`app/xp_manager.ts:833,872`): "самоподдерживающийся каскад: достижение
   → registerXP('achievement_reward') → checkAchievements → ...". При удалении `registerXP` нужно
   убедиться, что цепочка проверки достижений не завязана НА сам факт начисления XP как триггер
   (иначе достижения перестанут проверяться, а не просто перестанут давать награду).

---

## Итоговая оценка объёма для PM-068

- **~24 места начисления** (тривиальные вызовы-листья) + 1 серверный путь начисления (Арена,
  требует замены логики weekPoints).
- **~97 мест чтения/отображения уровня**, из них PM-041 уже закрывает home.tsx/_layout.tsx; из
  оставшихся примерно треть — чистое отображение (тривиально), примерно две трети — уровень
  используется как ВХОД в другую логику (выбор аватара/рамки, снапшот-контракты, публичные
  проекции, прогресс-события, тикеты поддержки) — требует замены, не просто удаления строки.
- **6 мест, где XP/уровень — явное условие доступа или выдачи награды** (диалоги, level gift,
  очки лиги через Арену, level spin, дефолтная кастомизация, каскад достижений) — каждое требует
  ОТДЕЛЬНОГО явного решения владельца перед изменением кода, не автоматической замены на coin_rank.
- Хранение: 1 клиентское поле AsyncStorage (`user_total_xp`) + примыкающий `weekly_xp`, плюс
  серверная Firestore-копия (`progressServerState.totalXp/.level/.weekXp/.weekPoints`) и
  денормализация в `report.userXP/userLevel` — потребует продуманной миграции/очистки полей, не
  только удаления кода, который их читает.
- Обнаружена подозрительная копия `xp_manager.ts`/`xp_levels.ts` в `.worktrees/post-delete-fresh-identity/`
  — не источник истины, но при выполнении PM-068 стоит убедиться, что эта ветка-копия не тянется в
  сборку и не создаёт путаницы (вне scope этой инвентаризации, только предупреждение).

PM-068 (или его декомпозиция) не должен начинать удаление, пока владелец явно не ответит на PM-014
(диалоги) и не даст решение по разделу 4 (Level Gift / Level Spin / Арена→Лига / достижения-каскад)
— это прямо совпадает с обязательными gate'ами PM-067:
`DOMAIN_AUDIT_AND_IMPACT_ACCEPTED`, `MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE`.

## Current runtime checkpoint — 2026-09-27

Этот исторический инвентарь сохранён как traceability-артефакт, но его список
активных модулей устарел после PM-067/068 retirement. В текущем дереве отсутствуют
`app/xp_manager.ts`, `app/league_engine.ts`, `functions/src/level_spin_enrollment.ts`
и `functions/src/league_finalize_cron.ts`; `PROGRESS_EVENT_TYPES` содержит только
учебные события, а runtime scan не нашёл активных `grant/award XP` вызовов.
Оставшиеся XP-идентификаторы находятся в compatibility/quarantine allowlist для
чтения и закрытия старых квитанций без выдачи.

## Current runtime checkpoint — 2026-09-27 (follow-up)

Source scan for `registerXP`, `grantXP`, `xpDelta`, and active XP-field assignments
returned no non-test producer matches in `app`, `modules`, `components`, or
`functions/src`. Retirement probes `quest_xp_retirement.probe.ts`,
`release_wave_without_xp.probe.ts`, `level_spin_assets_without_xp.probe.ts`, and
`level_gift_client_retirement.probe.ts` completed without failure. This confirms
absence of active XP grants in the scanned runtime; historical compatibility reads
and test fixtures remain intentionally out of scope.
