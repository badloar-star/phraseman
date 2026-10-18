# Task packet: четыре отличия от макетов по вердиктам Макетов c0cd6e2ae (cards-009, spire-009, dialogs-009, overlays-041)

Governance-ID: TG-64097ABA23B1
Governance-ID: TG-5074C5773D85
Status: In progress
Owner: сессия «2 · ДИЗАЙН» (поручение координатора 18.10 05:09, до 08:00, по одному коммиту на отличие)
Related epic/enabler: ГЕЙТ «приложение = макет» (CLAUDE.md), docs/phraseman-2.0/registries/visual_parity.json

## Outcome

Четыре экрана совпадают с образцом в указанных местах: cards-009 (пустое состояние «Сохранённые»), spire-009 (шапка ступени без «⚡ 2»), dialogs-009 (согласие на ИИ: первый абзац полужирный, «Не сейчас» на плашке), overlays-041 (знакомство с Карточками: плитка-значок вместо иллюстрации с коробкой, ассет только из макета). Доказательство — пересъёмка Сверки и склейка в docs/phraseman-2.0/evidence/parity/.

## Scope

In scope: `components/cards-grid/CardsKit.tsx` / `app/flashcards/SavedCollectionStates.tsx` (только если расхождение подтвердится на свежем кадре), `components/spire/SpireStepScreen.tsx`, `components/AiConsentSheetModalHybrid.tsx`, `components/FeatureIntroModal.tsx` и их сторожа.

Out of scope: энергия (energy-modes-004, dialogs-011) — у «Темы»; текст согласия не меняется; новые ассеты, которых нет в макете, не придумываются.

## Architecture

Чисто визуальные правки существующих компонентов без новых данных и состояний. spire-009: пилюля энергии убирается из шапки ступени (в макете `stepHead` только заголовок и сердца), её компонент остаётся для главной Шпиля. dialogs-009 и overlays-041 — по образцу dialogs.html phone 10 и overlays.html phone 41.

## Security and privacy

Текст согласия на передачу сообщений в OpenAI не меняется (только начертание первого абзаца и вид кнопки «Не сейчас»); данные не затрагиваются.

## Technical debt

Pay now: сторож сверяет убранную пилюлю в шапке ступени. cards-009: вердикт датирован 12.10 03:09, исправление центрирования в ada33c4c4 (12.10 04:55) позже кадра — нужна пересъёмка, а не новая правка (пока не подтверждено иначе).

## Verification

Сторожа в слоте; пересъёмка Сверки по каждому экрану; склейка «макет | эмулятор».

## Rollback

Откат коммита по каждому отличию отдельно.
