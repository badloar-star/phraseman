# Task packet: вопросы Макетов по кадрам (43b9b135b) — greet=Alex, плашка DEV и «Нашёл ошибку?» в кадрах, флажок Шпиля, хаб «Сообщество»

Governance-ID: TG-645BF506AABC
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/OWNER_REQUESTS_LEDGER.md п.66, R1_ROBOT_LINKS_GAPS.md

## Outcome

1. onboarding-009: dev `greet=Alex` подставляет имя в «Рад познакомиться» и при открытии шага напрямую (`onbstep=niceToMeet`), а не только после входа.
2. community-020: при dev `overlays=off` плашка «DEV» («боты Вместе») и триггер «Нашёл ошибку?» не рисуются (в стор-сборке их и так нет).
3. Шпиль, красный флажок «пожаловаться»: проверка кода — флажок есть (SpireTaskReportButton, рабочая функция, в сторе не прячется); отсутствие на кадре — состояние (не фаза «играет»), не дефект кода.
4. community-001: по п.66 код прав (вкладки «Шпиль · Друзья · Наборы»), хаб community.html №1 устарел — строка координатору.

## Scope

In scope: components/CleanOnboarding.tsx (строка niceToMeet), app/(tabs)/friends.tsx (плашка DEV), components/ReportErrorButton.tsx (шлюз), тест-сторож.
Out of scope: перекомпоновка онбординга (onboarding-001/011 — отдельным заданием), Шпиль.

## Architecture

No architecture change: чтение существующих dev-флагов (isDevOverlaysOff, getDevGreetName).

## Security and privacy

Данных не касается; флаги dev-only, в сторе пустышки.

## Technical debt

Pay now: кадры сверки не должны содержать dev-плашки.

## Verification

Тест-сторож по исходникам, соседние тесты, срез типов.

## Rollback

Откат коммита.
