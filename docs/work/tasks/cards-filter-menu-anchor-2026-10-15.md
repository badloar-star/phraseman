# Меню фильтра Карточек: позиция от измеренного низа шапки (cards-gap-023, 15.10)

Governance-ID: TG-2960646BD2BF

## Outcome
Меню фильтра («Все / группы») не перекрывает кнопки шапки: его верх = измеренный низ шапки + зазор образца (11 dp), а не константа `top: 56`.

## Scope
`app/flashcards_collection.tsx` (обёртка шапки + измерение), `app/flashcards/FlashcardsFilterDropdown.tsx` (проп `anchorBottom`, лог `[CARDS-FILTER-MENU]`), тест-контракт.

## Architecture
Шапка завёрнута в `View` с `onLayout` → `measureInWindow` → ref с низом шапки в окне. Меню берёт `anchorBottom + 11`; если замера ещё нет — `insets.top + 56` (то же, что у меню действий в `CollectionHeader`). Образец (cards-gaps-states.html №23): низ шапки ≈95, верх меню 106 при статус-баре 50.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Старый диагностический `[FILTER-MENU]` оставлен как есть до проверки на эмуляторе.

## Verification
Контрактный тест по тексту исходников; замер `[CARDS-FILTER-MENU]` на эмуляторе — в списке съёмки Макетов.

## Rollback
Откат коммита.
