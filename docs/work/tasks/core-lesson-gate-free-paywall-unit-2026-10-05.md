# Task packet: learn-1 — юнит-тест resolveLessonAccess: Free + урок за Plus при devMode=false → пейвол

Governance-ID: TG-17BFA1055E23
Status: In progress (координатор 05.10: «юнит-тест с devMode=false; красный → прод-баг, сразу мне»)
Owner: сессия 1 · ЯДРО

## Outcome

Доказать без устройства, ведёт ли прод (devMode=false) Free на урок за Plus к пейволу, а не к «Ещё рано». Плюс закрепить:
devMode=true в dev снимает Plus-ветку (объясняет эмулятор); legacy-потолок D122 открывает уроки до 8 без пейвола; Plus —
только замок прогресса.

## Scope

tests/lesson_gate_free_user_paywall.test.ts. Код не меняется.

## Architecture

Чистая функция app/monetization_policy.ts resolveLessonAccess.

## Security and privacy

Не затрагивается.

## Technical debt

Новый долг не вносится. Известный: devMode в dev-сборке снимает Plus-ветку — Сверка не может проверить пейвол уроков как
Free на эмуляторе; нужен флаг «вести себя как Free» (решение координатора).

## Verification

Прогон теста.

## Rollback

Удалить тест.
