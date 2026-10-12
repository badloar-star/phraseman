# Task packet: светлая тема — литералы Главной и Настроек; окно покупки набора по теме; красный сторож Настроек

Governance-ID: TG-8415C650C732
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер)
Related epic/enabler: docs/phraseman-2.0/R1_LIGHT_THEME_LITERALS.md

## Outcome

1) Белая дымка 4,5 % в модалке «Звания» (home.tsx:2525) видна на светлой теме; остальные литералы Главной (7) и Настроек (32) разобраны: ломающие светлую тему — чиню, ложные — помечаю theme-exempt с причиной. 2) Окно покупки набора (CardPackShardPaywallModal.tsx:457, useCollectionData.ts:1253) берёт токены темы через cardPackPaywallShellFromTokens вместо зелёной оболочки; контраст цены и кнопки проверен на светлой и 2–3 оттенках ползунка. 3) Красный tests/settings_root_liquid_glass_source_contract (haptics_tap в toggleTapHaptics) разобран и починен.

## Scope

In scope: app/(tabs)/home.tsx, экраны/компоненты Настроек, CardPackShardPaywallModal.tsx, useCollectionData.ts, тесты-сторожа.
Out of scope: файлы, которыми владеет Темы (constants/liquidGlass*, components/theme, components/v2), серверная часть.

## Architecture

Архитектура не меняется: замена литералов цвета на существующие токены темы, подключение готового модуля оболочки.

## Security and privacy

Данных не касается; окно покупки набора — только вид.

## Technical debt

Pay now: литералы цвета, не работающие в светлой теме; зелёная оболочка окна покупки.

## Verification

test:one по сторожам, срез типов по затронутым файлам, проверка контраста по токенам.

## Rollback

Откат коммитов.
