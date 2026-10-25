# Task packet: шторка «В какой набор?» — сбой чтения ≠ «Своих наборов пока нет» (5 · ВХОД)

Governance-ID: TG-532AB3BB24FE
Status: Done — pack_picker_state 9/9, тесты наборов 30/30, сторож шторки 5/5
Owner: 5 · ВХОД И АККАУНТ (координатор 25.10; находка Ревизора, тест 458d70cf6 tests/pack_picker_state_2026_10_25.test.ts)

## Outcome

Если локальные наборы не прочитались (status 'stale': аккаунт не готов на холодном старте, сменилось поколение, AsyncStorage
бросил без тёплого кэша), человек больше не видит «Своих наборов пока нет». Один тихий повтор чтения; снова 'stale' и наборов
нет — «Не удалось загрузить наборы» и строка «Повторить». Если тёплый кэш дал наборы — показываем их.

## Scope

- app/community_packs/localPackCardAdd.ts — loadPackPickerState на loadLocalAuthorPacksResult, тихий повтор при 'stale',
  status в результате и в журнале [PACK-CARD-ADD].
- app/community_packs/localAuthorPacks.ts — немой `catch {` в readPacksForTargetResult пишет причину.
- app/flashcards/ExpandedCardV2.tsx — состояние «не удалось загрузить» + «Повторить» (и при отказе промиса, раньше тоже уходило
  в «наборов нет»).
- tests/pack_picker_state_2026_10_25.test.ts — два test.failing → test; проверка «сейчас» старого поведения переписана.

## Architecture

Без новых зависимостей и вызовов сервера: только локальное хранилище. Повтор — один, через короткую паузу; дальше решает человек.

## Security and privacy

Новых данных нет; в журнале — числа, статус и текст ошибки хранилища.

## Technical debt

Новые строки «Не удалось загрузить наборы» / «Повторить» на 9 языках — черновик, вычитка 10 · ПЕРЕВОДЧИКА.

## Verification

tests/pack_picker_state_2026_10_25.test.ts, expanded_card_large_font_contract, разбор файлов.

## Rollback

git revert.
