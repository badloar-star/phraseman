# Task packet: 7 красных тестов зоны АВТОРИЗАЦИИ из полного прогона (HEAD 32f96a169, координатор 15.10)

Governance-ID: TG-F81E15E90073
Status: Разбор — новое (после 14.10 18:00) vs давнее
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Тесты: aa_guest_delete_deadline_and_cache (ReferenceError __DEV__), aa_r1_switches_cards_friends, auth_identity_anon_relink,
account_authority_s2b_auth_provider_guard, account_delete_warm_client_contract, unit/use-flashcards (getVerifiedPremiumAccessStatus
is not a function), session_attempts_hud (rntl, failed to run). Для каждого — причина по полному выводу и `git log` теста/источника;
новое (после 14.10 18:00) — чинить в окна; давнее — список координатору.

## Scope

In scope: тесты и/или код зоны (вход, аккаунт, удаление, пейвол) — только то, что сломалось недавно и по нашей вине.
Out of scope: чужие зоны (передаётся координатору с причиной).

## Architecture

Сначала факты (полный вывод теста, коммит, который сломал), потом правка. Сторожа не ослабляются: чинится код или устаревшее ожидание теста с объяснением.

## Security and privacy

Удаление аккаунта и вход — только чтение логики; без запуска удаления, без паролей.

## Разбор (15.10, полный вывод по GO, git log источника)

| Тест | Причина | Когда / кто | Решение |
|---|---|---|---|
| aa_guest_delete_deadline_and_cache | голый `__DEV__` в `app/firestore_cache_clear.ts` (стр. 128, 157) — ReferenceError в тестах | 4f6334b20, 14.10 19:32, моя трассировка [FIRESTORE-FIRST-TOUCH] — НОВОЕ | `typeof __DEV__ !== 'undefined' && __DEV__` (код, окно 01:00) |
| aa_r1_switches_cards_friends | `dev_moments_preview` вписан в середину вырезаемой группы `router.ctx.js`, тест ждал соседство имён | a317aa98d, 14.10 21:00 — НОВОЕ | тест: каждое имя в группе (47a65e402) |
| auth_identity_anon_relink | исход обёрнут в `done('bN', …)` (журнал [AUTH-ENSURE-LINK]) | 9835f75a7, 14.10 20:32 — НОВОЕ | тест: регулярка принимает обёртку (47a65e402) |
| account_authority_s2b_auth_provider_guard | тело запроса вынесено в `payload` (fetch под флагом) | 0c094c846, 14.10 22:00 — НОВОЕ | тест: payload + `() => fn(payload)` (47a65e402) |
| account_delete_warm_client_contract | срез «до следующей функции» захватил вставленный блок ensure_link со `stableId` | 594f643ad, 14.10 21:01 — НОВОЕ | тест: срез ровно тела функции (47a65e402) |
| session_attempts_hud (rntl) | HybridAlertShell оборачивает шторку в SheetSwipeRoot (жесты + createAnimatedComponent), заглушка reanimated теста этого не умеет | 99b21318e, 14.10 19:35 — НОВОЕ | тест: заглушка SheetSwipeClose (47a65e402) |
| unit/use-flashcards | `hooks/use-flashcards.ts` зовёт `getVerifiedPremiumAccessStatus`, мок `premium_guard` в тесте знает только `getVerifiedPremiumStatus` | 61a8248b1, 13.10 12:30 — ДАВНЕЕ, зона Карточек | координатору |

Прогон после правок (по GO): 5 основных наборов PASS + rntl session_attempts_hud 2/2; use-flashcards — 4 failed (давнее, не трогала).

## Technical debt

- use-flashcards: мок `premium_guard` нужно дополнить `getVerifiedPremiumAccessStatus` (зона Карточек).

## Verification

Каждый исправленный тест: N passed, N>0, PASS = числу файлов; запуск только по GO светофора.

## Rollback

`git revert` соответствующего коммита.
