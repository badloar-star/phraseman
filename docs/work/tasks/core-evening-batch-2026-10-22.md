# Task packet: вечерняя пачка Ядра 22.10 — хвост «Дневного пути», инвентарь Learning V2, метрика limits_flag, хотфикс OTA Пика

Governance-ID: TG-A3328E012D30
Status: В работе. Решения координатора и кнопки владельца 22.10 (вечер).
Owner: Ядро (сессия 1).

## Outcome

1. Старые операции «Дневного пути» без `promotionEligibility` принимаются кошельком как gameplay (кнопка владельца «Да, выложить»). Явное `excluded_compensation` — по-прежнему отказ, потолок пути 2000/сутки остаётся. Коммит со сторожем; выкладку `levelSpinStarGrant` запускает координатор по точной команде.
2. Инвентарь переноса Account V2: `learning_v2_course_progress_sync_v1` и `learning_v2_course_masks_sync_v1` → keep_in_place (координатор, решение 3).
3. Лог-метрика по `[COIN-WALLET] limits_flag` + алерт, без чтений Firestore (координатор, решение 2).
4. План хотфикса OTA: прошлый OTA + ТОЛЬКО коммит вершины Пика, отдельная папка экспорта, без ветки и worktree. Выпуск — только с «да» владельца у координатора.

## Scope

- `functions/src/coin_wallet_policy.ts` (`assertJourneyShape`) + тест-сторож.
- `functions/src/accounts_v2_migration/inventory.ts` (правило progress).
- Cloud Logging / Monitoring: одна метрика и одна политика алерта (конфигурация облака, без кода).
- Снимок OTA во временной папке `C:\Temp\claude\ota_hotfix_*` (вне репозитория).

## Architecture

- Отсутствие поля у старой операции — это не решение «давать или нет», а отсутствие разметки: операции ставились в очередь до появления поля. Закон «сервер хранит, а не решает».
- Перенос: курс Learning V2 уже живёт в хранилище 2.0, переносить нечего, поле остаётся на месте.

## Security and privacy

Новых данных нет. Метрика считает строки журнала без uid.

## Technical debt

Выкладка `levelSpinStarGrant` из чистого HEAD унесёт и `lessontogether_`/`stars_2` (652953424). Без клиента это инертно, координатор предупреждён.

## Verification

Тесты политики кошелька и `level_spin_star_grant`, PM-080, сторож переписи корня и инвентаря, сухой прогон выкладки. Для OTA — сверка строк Hermes с прошлым OTA.

## Rollback

Функция — прежняя ревизия `levelspinstargrant-00010-kin`. Инвентарь — откат коммита. Метрика и алерт — удаление по имени. OTA — `eas update:rollback`.

Governance-ID: TG-744D78280C9F
Governance-ID: TG-6B83D98623EC
Governance-ID: TG-D1462149D079

## Хотфикс OTA вершины Пика (c2ad7ec38 + 34de6c00c) — ручной перенос на базу прошлого OTA

Папка экспорта C:\Temp\claude\ota_patch_108b37562 (= прошлый OTA, группа b7e1f972). Опубликованный бандл отложен в dist_prev_ota для сверки строк Hermes. Чисто легли: use_spire_game, SpireMomentsLayer, spire_game_strings (+34de6c00c), report_queue, новый use_spire_summit. Вручную: SpireClimbDock (в 142 нет пропсов сцены — ветка searching не переносится), SpireHomeScreen. Превью и фикстуры не переносятся. Оригиналы — C:\Temp\claude\ota_hotfix_orig.

Governance-ID: TG-D1462149D079

## Ревизор: source_guard_eol_normalized_contract — три сторожа Ядра читают через normalizeEol

tests/ios_firebase_default_app_configure.test.mjs, tests/lessons_coin_balance_kept_contract.test.mjs, tests/plus_splash_state_offer.test.ts: чтение файлов обёрнуто в normalizeEol (tests/helpers/read_source*.{mjs,ts}). tests/learning_v2_plan_b_gates.test.mjs — передан Learning V2.

Governance-ID: TG-BB8FB8F9EECF

## Наблюдение за пакетом «Друзей» после выкладки 18:17Z (HEAD 54f47688e)

6 срезов по 10 минут: ошибки Cloud Run по 10 функциям, принятие старой награды «Дневного пути» (dailyjourney_228…), шаги удаления аккаунта (friend_duels_anonymize), limits_flag. Скрипты в scratchpad, без записи в базу.

Governance-ID: TG-6236776A1D66

- Проверка вершины на НЕИЗМЕННОМ бандле: скрипт-рецепт для 6 · СВЕРКА ставит неделю Пика на вершине в AsyncStorage эмулятора (RKStorage/catalystLocalStorage, ключ spire_week_v1:{uid}:{lang}); бандл и dist не трогаются.

## Тексты пушей и ленты «Друзей» на 9 языках (Переводчик, 9c137f5af)

Модуль functions/src/friends_push_copy.ts сгенерирован из таблицы черновика (ключи — дословно); плюральные слова ячеек → {days}/{coins}, склонение ru/uk/pl, en/es/pt one/other. Язык получателя — цепочка admin_push_jobs (lang || app_lang || pushTokenLang || progress.lang || progress.app_lang), запасной ru. Сторож: 9 языков у каждого ключа, плейсхолдеры как в ru.

Governance-ID: TG-60B4AE2168B8

## Хотфикс OTA отменён владельцем; очередь по текущей версии

Владелец через координатора: хотфикс на старой базе отменён, OTA не выпускаем, папка экспорта забыта. Очередь: (1) TTL ~30 дней на friend_lesson_invite_receipts и friend_duel_receipts — поле expireAt (Timestamp) в квитанциях + политика TTL на группы коллекций (команда — координатору); (2) пуши «Друзей» на 9 языках — прогоны, коммит, команда выкладки; (3) итог наблюдения за 10 функциями.

Governance-ID: TG-EC3F85D869DA
