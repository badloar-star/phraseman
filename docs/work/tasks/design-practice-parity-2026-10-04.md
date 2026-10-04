# Task packet: «Тренировки» по practice.html — сверка кода с CSS макета до съёмки сессией 6

Governance-ID: TG-7C2B5F6494CC
Governance-ID: TG-0481C5FDEF7A
Governance-ID: TG-E00D06F6E17D
Governance-ID: TG-B24D20763F00
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2), поручение координатора 04.10
Related epic/enabler: гейт «приложение = макет»

## Outcome

Блиц, «Устно», «Правда / ложь», «Вспомни», пилюля энергии и единый итог совпадают с practice.html по
размерам, отступам, кеглям (шкала D145 16/13, заголовки ≥19), радиусам, цветам и текстам.

## Scope

In scope: `app/flashcards_blitz_session.tsx`, `app/flashcards_speaking_session.tsx`, `app/flashcards_swipe.tsx`
(режим «Правда / ложь»), `app/flashcards_recall_session.tsx`, `components/practice/PracticeChrome.tsx`.
Out of scope: логика квоты, энергии, оценки и наград; Карточки и Мои ошибки (сессия 3); эмулятор (сессия 6).

## Architecture

No architecture change: вид.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: полоса Блица и подписи «0 · 100» — ждут решения координатора (смысл подписей в макете неясен).

## Verification

typecheck, сторожа `blitz*`, `practice*`, `speaking*`, `truefalse*`, ratchet типографики; склейка сессии 6.

## Rollback

`git revert` коммита.
