# Task packet: макет сценок для карт разминки (7 игр × 2 варианта) — на утверждение владельцу

Governance-ID: TG-11557AB19D38
Status: In progress
Owner: сессия «банк заданий игр de/fr» по задаче сессии «Elevate app механики и макеты»
Related epic/enabler: D207 — перенос игр Elevate; решение владельца 11.11 «Нарисую макеты сценок»

## Outcome

Отдельная страница макета `docs/design/v2-app/elevate-warmup-scenes.html`, где все 10 карт разминки показаны на
реальном размере 268×372: три готовые сценки (Поток, Лишнее слово, Сортировка) как образец и для каждой из семи
игр без сценки — по два варианта (А и Б). Владелец выбирает вариант; перенос в приложение — отдельная задача
после утверждения. Мера: снимок страницы в `docs/phraseman-2.0/evidence/parity/elevate-warmup-scenes-mockup_2026-11-12.png`.

## Scope

In scope (новые файлы): `docs/design/v2-app/elevate-warmup-scenes.html`, `elevate-warmup-scenes.css`,
`elevate-warmup-scenes.js`, снимок в evidence, этот пакет.

Out of scope: `kit.css`, `kit.js` (только подключаются), общие `elevate-*.css`, приложение (`components/games/WarmupCardArt.tsx`).

## Architecture

No architecture change: статическая страница макета. Стиль сценок — как у трёх утверждённых (elevate-mechanics.css:87–102):
белые полупрозрачные плашки и полосы на цветном градиенте карты, одна короткая петля 2–3,5 с, суть механики одним
жестом, без текста; сценка — в верхней части карты (`inset: 0 0 132px 0`). Все классы — с префиксом `ws-`.

## Security and privacy

Не применимо: макет без данных и сети.

## Technical debt

- Contain: подписи карт — из `modules/games/warmup_state.ts` (только ru). Выход — перенос после выбора владельца.

## Verification

Снимок страницы Edge headless; осмотр снимка глазами (сценки в верхней части, текст карты не перекрыт).

## Rollback

Удалить новые файлы макета (`git revert`). Приложение не меняется.
