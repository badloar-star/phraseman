# Task packet — D187: «предложение при выходе» и остатки «Бонуса на старт» в образцах и реестре

Governance-ID: TG-18ED8A96473C

## Outcome
Координатор 14.10: пройти все образцы и реестр паритета — окна и состояния exit-offer (D187) → плашка «Удалено решением владельца 14.10 (D187)»,
строки → removed_by_owner; найти остатки «72 ч / Бонус на старт / intro_full_access» (D186).

## Scope
docs/design/**/*.html|js|md, registries/visual_parity.json. Файлы агента Fable (all-modals-*.html) не правим — находки ему через координатора.

## Architecture
Поиск по текстам кода (paywall_purchase.ts: «Точно уходишь? … доступа — бесплатно», «Платить сейчас не нужно…») и по реестру.

## Security and privacy
Не касается.

## Technical debt
Нет.

## Verification
grep по docs/design и реестру; 0 ошибок страницы overlays-more.

## Rollback
git revert.

## Status
Done.
