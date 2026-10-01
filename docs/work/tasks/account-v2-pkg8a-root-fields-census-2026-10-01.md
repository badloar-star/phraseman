# Task packet: Account V2 — Пакет 8A: перенос не уходит в HOLD из-за служебных корневых полей users/{id}

Governance-ID: TG-1967EAAB739B
Status: Done (SPEC+SECURITY APPROVE)
Owner: Claude session (Account V2, /loop)

## Outcome

E2E 2026-10-01 (квитанция 5b18dd743, сценарий A FAIL): `accountsV2MigrateMine` → `migrate hold reasons=unknown_field writes=0_v2` у аккаунта, в корне `users/{id}` которого есть поля вне `ROOT_RULES` (`functions/src/accounts_v2_migration/inventory.ts`): `accountGeneration` (Learning V2), `updatedAt`, `last_active_at`, `created_at` (старый cloud_sync). У реальных людей таких полей больше — перенос OD21 встанет у всех.

1. **Перепись по КОДУ:** найти ВСЕХ писателей корня `users/{id}` (клиент `set/update` по users/uid и users/stableId, функции, триггеры, админка, Learning V2, identity/auth_links, удаление аккаунта, Шпиль, монеты, рефералы…) и составить полный список корневых полей (кроме `progress`) с писателем file:line. Прод не читать.
2. Классифицировать каждое правилом инвентаря. Служебные метаданные (время, поколение, флаги идентичности) — `keep_in_place` (информационно, не переносятся, не блокируют, не чистятся до OD20). Перенос доменов V2 (уроки/карточки/наборы) не меняется.
3. **Сторож реального состава:** тест, который строит список корневых полей из кода (по маркерам записи) и падает, если поле есть у писателя, но нет в `ROOT_RULES` (как сторож PM-233). Плюс тест dry-run: документ со всеми найденными полями → status ready.
4. Попутно 🟡 по правилу «сперва логи»: `persistFlashcards` (`hooks/use-flashcards.ts`) — 4 немых `return false` и немой `catch {}` → постоянные логи `[ACCOUNT-V2]`/`[FLASHCARDS]` с причиной на каждом раннем выходе (без id/текста карточек). Поведение не менять.

## Scope

functions/src/accounts_v2_migration/{inventory,dry_run,report}.ts + тесты, новый сторож, hooks/use-flashcards.ts (только логи). Out of scope: прод, флаги, деплой, лишняя переотправка карточек после гидрации (отдельный пакет 8B), скелетон «Мои наборы».

## Architecture

Правила инвентаря — единственный источник классификации; сторож связывает код-писателей и правила.

## Security and privacy

Новых данных нет; логи без uid/PII. Privacy policy не меняется.

## Technical debt

Accept temporarily: поля, которые пишет только прод-скрипт вне репозитория, сторож не увидит — отметить в отчёте.

## Verification

RED→GREEN (dry-run с реальным набором полей HOLD → ready), мутации (поле убрано из правил → сторож красный), functions-тесты accounts_v2_migration по одному, затронутые app-тесты по одному, независимое ревью.

## Rollback

git revert; бэкап `.tmp_pkg8a_backup/`.

## Итог исполнителя (2026-10-01, вечер) — не закоммичено

**Параллельная работа.** Пока шёл пакет, ДРУГАЯ сессия правила те же файлы: `inventory.ts`
(правила `r.runtime_metadata`, `r.service_metadata`, `r.achievements_root` — по списку этой переписи),
`inventory.test.ts`, `hooks/use-flashcards.ts` (логи `[FLASHCARDS] persist skipped reason=…` на всех
ранних выходах и в `catch`) + `tests/flashcards_persist_logging_contract.test.ts`, и поправила фильтр
`progress` в сторож. Эти ханки исполнитель пакета не трогал: п.4 закрыт той сессией, правила инвентаря —
тоже ею. Бэкап `.tmp_pkg8a_backup/` снят ПОСЛЕ её первой правки (уже содержит `r.runtime_metadata`).

**Перепись по коду** — `scripts/accounts_v2_root_fields_code_census.cjs` (разбор TypeScript, без сети):
писатели users/{uid} и users/{stableId} в app/, components/, hooks/, modules/, functions/src, shared/, lib/,
constants/, admin/v2/legacy.html (админка в корень напрямую не пишет — только через функции). Сквозные
функции (`writeUserDocWithNestedProgress`, `commitStarOperations`, `stampSpirePushMarks`…), документы запросов
по users, помощники, возвращающие ссылку, деструктуризация. Итог: **64 корневых поля + progress**,
неразобранных записей 0. Полный список с file:line: `node scripts/accounts_v2_root_fields_code_census.cjs`.

| Правило | Судьба | Поля |
|---|---|---|
| r.runtime_metadata | keep_in_place (OD20) | accountGeneration, updatedAt, created_at, last_active_at |
| r.service_metadata | keep_in_place (OD20) | accountId*, duplicateCleanup*, banned/bannedAt/accessBlocked, ideaSubmission*, push-токены и pushPrefs, отметки пушей (last*Reminder*, lastReEngagePushAt, lastTournamentPushAt, spire*PushWeekId), tournament_* (9), user_avatar, user_avatar_frame |
| r.achievements_root | keep_in_place (OD8) | achievements_state |
| уже были | drop/info/keep | login_service (9), currency_counters (5), levelSpinMergePending, stars |
| r.mistake_merge, r.progress_markers (было HOLD Пакета 5) | keep_in_place (OD20, решение координатора 8A) | mistakePracticeMergePending, progressServerState/Authoritative/CutoverAt, progressMigratedAt |

**Сторож** `functions/src/accounts_v2_migration/root_fields_census_guard.test.ts` (13): поле у писателя без
правила → красный; неразобранная запись → красный; протухшая подсказка → красный; новый HOLD корня только
по записанному списку. **Dry-run** `root_fields_dry_run.test.ts` (5): документ со всеми найденными полями
(кроме решённых HOLD) → ready; сценарий A из E2E → ready, 2 операции.

**Прод-сверка** `scripts/accounts_v2_root_fields_census.mjs` (+ `.test.mjs`, 4): по умолчанию — план без сети;
`--emulator` (FIRESTORE_EMULATOR_HOST); прод — только `--project=<id> --owner-command="…"`. Читает users/*
порциями ≤500 с курсором (лимит `--max-docs`, по умолчанию 100 000), печатает только имена полей, число
документов и правило инвентаря (UNKNOWN = HOLD). Значений, uid, id нет; имена, похожие на почту/uid, — хэш.
Записей нет. Стоимость: 1 чтение на документ. Запускает только владелец.

**RED→GREEN.** Инвентарь из HEAD: 43 поля без правила, сценарий A → `hold unknown_field` ×4. Текущий: 0, ready.
Мутации (копия ядра во временной папке, общий файл не трогался): убрать accountGeneration → сторож и
сценарий A красные; убрать expoPushToken → сторож красный; tournament_title в HOLD → сторож красный;
без подсказки auth_merge → писатели identityMergedAt пропадают (ловит тест «не слепой»).

**🔴 Открытый вопрос координатору/Fable.** `progressServerState` пишет `progressSubmitEvent` при КАЖДОМ
завершении урока (app/lesson_complete.tsx → functions/src/progress_events.ts:808) — значит почти у всех
активных людей перенос OD21 всё равно уйдёт в HOLD `no_owner_decision`. Рекомендация: progressServer*/
progressMigratedAt → keep_in_place (маркер, данные уроков лежат в самом progress и читаются как есть);
mistakePracticeMergePending → keep_in_place (практика ошибок — не домен V2; true = незавершённое слияние,
false пишется после каждого слияния). Нужна запись решения — Пакет 8A их не менял.

**Попутно найдено:** админская «Сброс достижений» (`functions/src/admin_user_operations.ts:483`) пишет
`achievements_state` в КОРЕНЬ, а приложение держит его в `progress.achievements_state` — сброс, вероятно,
ничего не сбрасывает. Отдельная задача.

**Не видит сторож:** поля старых версий приложения и прод-скриптов вне репозитория (напр. корневой
`user_name`, по которому ищет админка) — только прод-сверка перед выкладкой.

## Решение координатора (сессия Account V2, 2026-10-01) по открытому вопросу
`progressServerState/Authoritative/CutoverAt`, `progressMigratedAt`, `mistakePracticeMergePending` → **keep_in_place (OD20)**. Основание: в инвентаре Пакета 5 у них стояло «решения нет» без технической причины; progressServerState пишется при каждом уроке → hold остановил бы OD21 почти у всех; данные уроков лежат в самом progress; практика ошибок — не домен V2. Правка в inventory.ts с `// зачем:`; тесты обновляются исполнителем.

**Решение координатора (2026-10-01):** progressServer*, progressMigratedAt, mistakePracticeMergePending → keep_in_place OD20
(правка inventory.ts — координатор). Тесты обновлены: inventory.test.ts (mistakePracticeMergePending = keep_in_place OD20),
сторож — список утверждённых HOLD корня пуст (любой новый HOLD корня → красный), dry-run — документ со ВСЕМИ полями
переписи, включая эти 5 → ready. Мутация «progressServerState обратно в hold» → сторож красный, сценарий A → hold.
Прогоны: inventory 40/40, guard 13/13, dry-run 5/5. Лог типа ошибки в catch persistFlashcards — зона другой сессии, не тронут.
