# Task packet: ник — строка «Сменить имя можно через {N} мин» на 9 языках (координатор, лимит 5 смен в час)

Governance-ID: TG-A8EE11496D88
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

Готовая экспортируемая функция `nickRetryInMinutesText(lang, minutes)` в `components/account/NicknameEditModal.tsx` рядом с черновиком «Слишком часто…»: «Сменить имя можно через 12 мин» на 9 языках. Сокращения «мин/хв/min/phút/mnt/dk» не склоняются — верно при 1, 2, 5, 21; между числом и единицей неразрывный пробел; минуты округляются вверх, минимум 1. Сайт подключает её в ветку `rate_limited`, когда сервер отдаёт время.

## Scope

In scope: новая функция в `NicknameEditModal.tsx` (без изменения поведения окна).

Out of scope: подключение в ветку `rate_limited` и получение времени с сервера (Сайт).

## Architecture

Чистая функция над `triLang`; компонент не меняется.

## Security and privacy

Не применимо.

## Technical debt

- Функция пока не вызывается — Accept temporarily: Сайт подключает, как только сервер отдаёт оставшееся время.

## Verification

- `babel.parseSync`;
- `git diff --numstat` — только моя вставка.

## Rollback

`git revert <коммит>`.
