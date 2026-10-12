# Task packet: утренняя выкладка — срез без перевода строк (git archive при core.autocrlf=true) + тосты друзей EN

Governance-ID: TG-56EC3B930AC8
Status: Done — сборка среза rc=0 (35 с)
Owner: сессия «1 · Ядро» (координатор 12.10: проверка сборки среза до утра; friends.tsx messageEn — ДА).

## Outcome
Вторая проверка среза прошла шаг support-context и упала на `gate:spire-multilingual`: «es/tasks.jsonl is stale». Причина
— не код: репозиторий с `core.autocrlf=true`, и `git archive` при выгрузке превращает LF в CRLF (4000 CR в этом файле),
а сторож сверяет файлы с генератором побайтно (в рабочей копии и в коммите — LF). Срез выгружается
`git -c core.autocrlf=false archive` — байты ровно как в коммите. Команда утренней выкладки и проверочный скрипт обновлены.
Плюс: 5 тостов экрана друзей без messageEn получили английский текст (+ сторож-тест).

## Scope
In: `docs/phraseman-2.0/DEPLOY_MORNING_2026-10-13.md`, проверочный скрипт (scratchpad), `app/(tabs)/friends.tsx`,
`tests/friends_toasts_en.test.ts`. Out: выкладка, генератор пула.

## Architecture
Только флаг выгрузки; тосты — необязательное поле messageEn, которое отображение уже читает.

## Security and privacy
Без секретов.

## Technical debt
Нет: поведение выкладки из обычного checkout не меняется.

## Verification
Сборка в срезе rc=0; тест тостов друзей; сканер (friends −5).

## Rollback
`git revert`.
