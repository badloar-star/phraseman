# Dev-превью Шпиля: скрытие/сворачивание полосы состояний для съёмки

Governance-ID: TG-967BFB5A537D
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора)

## Outcome
`/dev_spire_preview?...&spirePanel=off` — полоса чипов состояний не рисуется (чистый кадр); `spirePanel=dot` — полоса свёрнута в маленькую точку в углу, тап раскрывает.

## Scope
app/dev_spire_preview.tsx (dev-маршрут, в релизе вырезан). app/dev_state_fixtures.ts сейчас правит другая сессия (конфетти) — не трогаю, `dev_state?spirePanel=` отложен.

## Architecture
Параметр ссылки + локальное состояние; полоса по умолчанию и так показывается только при `selector=1`.

## Security and privacy
Не применимо; только dev.

## Technical debt
dev_state?spirePanel=off после освобождения файла другой сессией.

## Verification
Точечный тест на источник и сторож `spire_dev_preview_release_guard`.

## Rollback
git revert коммита.
