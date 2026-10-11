# Task packet: Шпиль на ru/uk (и 9 языках) — плюрали, единое имя раздела, сторож полноты словарей

Governance-ID: TG-5351B35F80E6
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по приказу координатора (12.10, владелец спит)
Related epic/enabler: docs/phraseman-2.0/SPIRE_I18N_AUDIT.md (§6 плюрали, §5 имена, §8 дыры 🟡)

## Outcome

Шпиль в первом выпуске только для ru и uk, поэтому текст на них должен быть безупречным, а на остальных семи языках — не хуже. Результат: (1) подписи «ступеней/сходинок/steps/людей/people» склоняются по числу через `constants/plural.ts` на всех 9 языках во всех экранах Шпиля; (2) имя раздела на польском и вьетнамском одно по всем местам, сообщение о релизе (`app/app_messages.ts`) без английского «Spire» и со словом на языке интерфейса; (3) тест полноты словарей `spire_strings` и `spire_game_strings` × 9 языков и совпадения чисел в турах/правилах с константами. Мера успеха: тесты зелёные, срез типов чистый, счётчики baseline не растут.

## Scope

In scope: `components/spire/spire_strings.ts`, `spire_game_strings.ts`, экраны `SpirePodium`, `SpireAllMembers`, `SpireWeekResultCard`, `SpireResultPanel`, `SpireHomeScreen` (только подписи со счётом); `app/app_messages.ts` (сообщение о релизе Шпиля); имя раздела на pl/vi в `app/(tabs)/home.tsx` (только строка плитки), `app/energy_activity_titles.ts`, `modules/today-tasks/today_tasks_view.ts`, `app/settings_notifications.tsx`; новый тест `tests/spire_strings_completeness.test.ts`.

Out of scope: вкладка и шлюз Шпиля (`app/(tabs)/_layout`, логика Главной, spire gate) — это Ядро; пуши на сервере (`functions/src/spire_*_push.ts`) — Ядро; русские фразы в заданиях (`promptRu`) — решение владельца; вёрстка и внешний вид экранов не меняются.

## Architecture

No architecture change: те же словари и `triLang`; добавляется чистое склонение через существующий `constants/plural.ts`. Инвариант: ключи словарей остаются 9-язычными, набор `{плейсхолдеров}` во всех языках совпадает.

## Security and privacy

Только строки интерфейса: данные, разрешения и сторонние сервисы не затрагиваются; политика конфиденциальности не меняется.

## Technical debt

Pay now: плюрали и единое имя. Contain: тест полноты словарей и сверка чисел с константами не даёт расхождению вернуться. Accept temporarily: переводы es/pt-BR/vi/id/tr/pl не вычитаны носителями (владелец/носители, уже записано в шапках словарей).

## Verification

Точечный прогон `npm run -s test:one -- tests/spire_strings_completeness.test.ts` и соседних тестов Шпиля; срез типов по затронутым файлам; сканеры `scan_untranslated_ui` / `scan_missing_en_dictionaries` — счётчики не растут.

## Rollback

Откат коммитов по файлам; данные пользователей не затрагиваются.
