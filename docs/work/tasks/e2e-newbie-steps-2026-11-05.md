# Сценарий E2E «новичок»: онбординг → welcome B-3 → первый урок классики → +500 (поручение координатора 05.11)

Governance-ID: TG-407493C4664D
Status: Готово к передаче Сверке
Owner: «5 · ВХОД»

## Outcome

Сверка проходит путь новичка на чистой установке по точным шагам и видит ожидаемые числа и строки журнала. Остаток зоны: тест запускателя Account V2 записан в KNOWN_ISSUES.

## Scope

Документы `docs/work/release/E2E_NEWBIE_STEPS_2026-11-05.md`, запись в `docs/work/release/KNOWN_ISSUES_2026-11-05.md`. Код не меняется.

## Architecture

Шаги выведены из кода: `components/CleanOnboarding.tsx`, `app/language_welcome.tsx`, `components/onboarding/WelcomeGate.tsx`, `app/rank_gates_new_user.ts`, `app/first_lesson_bonus.ts`, `app/lesson_complete.tsx`.

## Security and privacy

Данные не затрагиваются; тестовые аккаунты создаются на эмуляторе пользователем Сверки.

## Technical debt

Журналы `console.log` в релизной сборке вырезаются — шаги с журналом выполняются на dev-сборке.

## Verification

Документ прочитан Сверкой; ожидаемые числа сверены с кодом (бонус 500, ключ флага, ключи отметок).

## Rollback

Удалить документ.
