# Task packet: Блиц — `animations=off` замораживает таймер, чтобы робот мог снять дерево экрана

Governance-ID: TG-0F0C23267F2B
Governance-ID: TG-1CDDB245C8D3
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по результату дампа Сверки (evidence/blitz_dump2/)
Related epic/enabler: app/dev_animations_off.ts (dev-флаг для хаба Карточек), steps-модуль p84, practice-001…003, cards-section-044/045

## Outcome

Причина `step_target_not_found:#fc-blitz-opt-target` установлена (Сверка): пока идёт раунд Блица, `uiautomator dump` не отдаёт дерево («could not get idle state») — непрерывная анимация полосы таймера (UI-поток, Reanimated `withTiming` на весь раунд) и тики таймера не дают устройству дойти до idle. Это ограничение съёмки, не дефект экрана (экран отрисован, `[BLITZ-DEV] target` с `hasQuestion:true`). Решение: dev-флаг `animations=off` (уже есть для хаба Карточек) в Блице не запускает анимацию полосы и тикер секунд — экран стоит на «до ответа» (таймер полный, как в макете practice.html №1); ссылкам Блица в steps-модуле добавляется `animations=off`.

## Scope

In scope: app/flashcards_blitz_session.tsx — два места старта отсчёта (первый запуск и возобновление после паузы): при `isDevAnimationsOff()` не стартовать `withTiming` и `setInterval`, журнал; scripts/dev_links_r1_steps_p84.py — параметр `animations=off` всем ссылкам на `flashcards_blitz_session`; контракт-тест.

Out of scope: боевое поведение таймера (в стор-сборке `isDevAnimationsOff()` всегда false), остальные экраны с непрерывными анимациями.

## Architecture

Флаг читается синхронно из памяти (`dev_animations_off.ts`), в стор-сборке недоступен (`IS_STORE_RELEASE`). Раунд при замороженном таймере не заканчивается сам — только для съёмки.

## Security and privacy

Не затрагивает данные и права; dev-ветка отключена в стор-сборке.

## Technical debt

Pay now: съёмочная ветка в игровом таймере — минимальная, с журналом.

## Verification

Контракт-тест строк; перегенерация DEV_LINKS_R1 (только строки Блица); прогон Сверки practice-001/002/003: `uiautomator dump` отдаёт дерево, `fc-blitz-opt-target` найден.

## Rollback

git revert коммита.
