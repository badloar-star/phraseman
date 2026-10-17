# Task packet: R109 — хаб Карточек, число справа от иконки

Governance-ID: TG-1E8EB2EBE35A
Governance-ID: TG-AE23A1F2B77A
Governance-ID: TG-077D2F48205B
Governance-ID: TG-6DDC5D1614AF
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: прямое слово владельца 17.10 со скрином: «Цифры будут СПРАВА от иконки, а не внизу»; эталон Макетов `docs/design/v2-app/cards-section.shadow.html#hub` (2ad48d298).

## Outcome
На каждой из 4 плиток хаба Карточек (Сохранённые / Мои наборы / Из видео / Сообщество): верхняя строка — иконка 52 слева, число справа (22/28, 700, tabular-nums, цвет основного текста, по центру иконки); под ними только название (19/25, 700). «6 наборов» → «6». При загрузке на месте числа «…». Новичок: 0 / 0 / 3 / 1 240.

## Scope
`app/flashcards/CardsHubV2.tsx` (разметка плитки и стили), `app/flashcards/FlashcardsHubScreen.tsx` (число «Из видео» без слова), тесты-сторожа.

## Architecture
Плитка: `tileTop` (row, space-between) = иконка + число; ниже `tileTitle`. Данные и форматирование чисел не меняются (Intl.NumberFormat), слово «наборов» убирается только у «Из видео».

## Security and privacy
Данные не собираются.

## Technical debt
Функция склонения `packsWord` остаётся в файле, пока не используется — убрать отдельной чисткой.

## Verification
`tests/fc_cards_hub_entry_contract.test.ts`, новый сторож разметки плитки; кадр Сверке.

## Rollback
`git revert`.
