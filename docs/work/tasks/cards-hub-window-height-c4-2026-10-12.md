# Хаб Карточек: высота окна читается внутри CardsHubV2, а не в корне (аудит скорости R1, пункт C4)

Governance-ID: TG-C4HUBWINDOW01
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора, обход 22:35)

## Outcome
`FlashcardsHubScreen` больше не подписан на `useWindowDimensions()`: изменение размера окна или клавиатуры перестаёт перерисовывать корень хаба (квота, окно режимов, загрузчики, плитки). Высоту читает сам `CardsHubV2` (он уже читает `fontScale` оттуда же), корень передаёт только сумму вырезов `verticalInsets`. Раскладка стопки и плиток не меняется.

## Scope
`app/flashcards/FlashcardsHubScreen.tsx` (убрать подписку и вычитание в пропсе), `app/flashcards/CardsHubV2.tsx` (пропс `availableHeight` → `verticalInsets`, высота из `useWindowDimensions`), сторож `tests/cards_hub_stable_props_contract.test.ts` (расширить). Логика квоты и пейвола не затрагивается.

## Architecture
`availableHeight = windowHeight − insets.top − insets.bottom` считался в корне. Теперь корень отдаёт число `verticalInsets = insets.top + insets.bottom` (стабильное, insets из `useStableSafeAreaInsets`), а `CardsHubV2` берёт `height` из `useWindowDimensions()` и считает то же значение у себя. Дочерний компонент и так перерисовывается при смене размеров из-за `fontScale`, поэтому новых рендеров не добавляется, а корневой убирается.

## Security and privacy
Только расчёт высоты; данные, сеть и покупка не затрагиваются.

## Technical debt
Число перерисовок по-прежнему меряется только замером `[PERF-R1]` через Сверку (нет RN-renderer в тестах).

## Verification
Сторож по исходнику (в корне нет `useWindowDimensions`/`windowHeight`, у хаба нет пропса `availableHeight`), существующие контракты хаба, срез типов по двум файлам; тесты при ≥3 ГБ и слоте светофора.

## Rollback
git revert коммита: высота снова считается в корне.
