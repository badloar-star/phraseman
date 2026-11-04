# Первая версия 2.1.0: ранговые гейты и «Открытия разделов» выключены по умолчанию (решение координатора 05.11)

Governance-ID: TG-7C4DDC4F591D
Status: В работе
Owner: «5 · ВХОД»

## Outcome

В первой версии ранговые гейты Главной и окна «Открытие разделов» выключены; включает Пульт в момент «сборка в сторе». Бонус +500 за первое занятие от гейтов не зависит и остаётся включённым. Сверка проверяет гейты принудительным включением флага в dev, не трогая боевой Пульт.

## Scope

`app/remote_flags.ts` (дефолт `rank_gates_enabled=false`; dev-принуждение `EXPO_PUBLIC_DEV_FORCE_FLAGS`), `app/lesson_complete.tsx` и `app/learning_v2_direct_session_player_v1.tsx` (бонус без чтения флага гейтов), `admin/v2/legacy.html` (тумблер «Главная по рангам» по умолчанию выкл), тесты `rank_gates_default_off_2026_11_05`, `first_lesson_bonus_wiring`, документ E2E.

## Architecture

`getRemoteBool` сперва проверяет множество принудительно включённых флагов (пустое в релизе и стор-сборке), затем Пульт, затем дефолт. `section_openings_enabled` уже был false. Приветствие B-3 флагом не управляется.

## Security and privacy

Данные не затрагиваются; принуждение работает только в dev-сборке.

## Technical debt

Включение гейтов — Пультом при выходе сборки в сторе (пункт утреннего отчёта).

## Verification

Точечный прогон: default_off, first_lesson_bonus*, rank_gates_client, section_openings, welcome_gate, newcomer_restore; типы.

## Rollback

Вернуть `rank_gates_enabled: true`, вернуть чтение флага в двух вызовах бонуса, убрать множество принуждения.
