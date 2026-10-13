# Task packet: корзина (б) разбора diff — образцы к коду, уточнение разбора

Governance-ID: TG-581AC667122F
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: MACETS_DIFF_TRIAGE_R1_2026-10-13.md

## Outcome

1. Разбор уточнён по ответу кода: чип языка каталога виден только при наборах на 2+ языках (flashcards_packs.tsx:427), чипы уровней — только когда у наборов есть уровень (стр. 197) → cards-047 и cards-v2-025 из «дефектов» в «образец к коду».
2. Строки корзины (б) в образцах приведены к коду или помечены «данные, не дефект»; строки реестра — pending с пометкой.

## Scope

In scope: docs/phraseman-2.0/MACETS_DIFF_TRIAGE_R1_2026-10-13.md, образцы docs/design/v2-app/cards-v2.html, cards-states.html, cards-gaps-states.html, community.html, dialogs-gaps-states.html, energy-modes-states.html (только кадры строк корзины), registries/visual_parity.json (строки корзины по id).

Out of scope: код приложения, материалы для магазинов.

## Architecture

No architecture change: образцы, документация, реестр.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: вопрос «4/3 в лимите наборов» — владельцу через координатора.

## Verification

Образцы открываются без ошибок консоли, изменённые кадры сняты playwright и проверены глазами; реестр — число строк прежнее, гейт считает.

## Rollback

Откат коммита.
