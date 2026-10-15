# Task packet: сторож [JS-STALL] онбординга не считает фон (бета А6, координатор 15.10)

Governance-ID: TG-0E7F0AC4F87C
Status: Готово к коммиту
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

«step=privacy 9,7 с / 5,6 с» из беты А6 совпали по времени с системными окнами входа Google (08:42:20→08:42:28) и Apple
(08:42:12→08:42:18): приложение в фоне, JS приостановлен, сторож считал паузу простоем. Работа приложения не тормозила.

## Scope

`components/CleanOnboarding.tsx`: dev-сторож копит время в фоне по AppState и вычитает его; строка `skipped_background`.
Out of scope: логика онбординга, прод-поведение (сторож только в __DEV__).

## Verification

Наборы тестов, читающие CleanOnboarding (51 файл); разбор babel.

## Rollback

`git revert`.
