# Task packet: бэклог №11 — регрессия тестов по зонам, тронутым 13.10 после 12:00 (координатор ~14:10)

Governance-ID: TG-EAA36615EB37
Status: Done — 186/186 наборов зелёные; node: 2 перепина сам, 1 владельцам
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Прогон 14:07–14:09, все тесты, которые подключают 77 файлов (app/components/hooks/modules/constants), изменённых после 12:00. Партии по 30, каждая со слотом, `--runInBand`.

- jest: 186 наборов, 2320 тестов — все зелёные;
- node: 17 файлов, красных 3.

| Тест | Причина | Чья правка | Решение |
|---|---|---|---|
| `tests/saved_packs_completion.test.cjs` (3) | заглушки харнесса устарели: `premium_guard.getVerifiedPremiumAccessStatus` и `setTimeout` (61a8248b1 Дизайн — потолок проверки Plus в addFlashcard); `../dev_cards_state` в черновике набора (5b1caa8ee, 12.10); `../flashcards/pack_deck_meta` в localAuthorPacks (ee01d089a, 11.10) | Дизайн / Ядро | перепин харнесса сам (код верный, сверено по diff) |
| `tests/flashcards_training_setup_liquid_glass_source_contract.test.mjs` (1) | хэш бизнес-AST: только en-текст practise→practice (bccef0011); затем общая зависимость V2Pressable (21cf84b2e — прозрачность из style умножается на нажатие) | Ядро / Дизайн | перепин сам, сверено по diff — логика выдачи наборов и «Начать» прежняя |
| `tests/spire_tab_gate_source_contract.test.mjs` (2) | `SpireTour.tsx:70` — имена-заглушки «Аня…» (правило «no mockup names»); `SpireHomeScreen.tsx` 439 строк > 400 (c0ed887cc, ca2e1791b, bd8cea0f0) | Дизайн / Темы | строкой владельцам (настоящие нарушения, не устаревший сторож) |

## Scope

In scope:
- прогон тестов;
- перепин явно устаревшего харнесса `saved_packs_completion` (только заглушки и привязки vm, проверки не ослабляются);
- сообщения владельцам.

Out of scope: код приложения.

## Architecture

В харнессе `run()` получает `setTimeout`/`clearTimeout`. Новые зависимости — настоящие чистые модули (`pack_deck_meta`) или выключенные dev-заглушки, как в сторе.

## Security and privacy

Нет данных.

## Technical debt

- Харнессы на vm с ручными заглушками ломаются от каждой новой зависимости. Стоит перевести их на jest-моки, после R1.

## Verification

`node --test tests/saved_packs_completion.test.cjs` — все зелёные.

## Rollback

`git revert` коммита.
