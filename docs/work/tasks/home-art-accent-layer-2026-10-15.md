# Слой .accent на плитках Главной и карточке «Сегодня/Продолжить»

Governance-ID: TG-3D533949F41A
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (приказ координатора: делать сейчас, не дожидаясь выбора стиля арта)

## Outcome
Плитки Главной (HomeV2FeatureTiles) и карточка «Сегодня/Продолжить» (HomeV2ContinueCard) рисуют второй Image — слой `.accent` с tintColor = accentBright поверх основы, ТОЛЬКО когда resolveThemedArt вернул accent != null. Файлов .accent у картинок Главной пока нет — вреда ноль (один слой); выбранный стиль встанет сразу, как только файлы появятся и будут зарегистрированы генератором.

## Scope
components/theme/ThemedArtLayers.tsx (новый общий слой «основа + accent»), components/home/v2/home_v2_types.ts (+artAccent), HomeV2FeatureTiles.tsx, HomeV2ContinueCard.tsx, app/(tabs)/home.tsx (передача accent из того же resolve), тест tests/home_art_accent_layers.test.ts. Геометрия не меняется: слои — абсолютное заполнение контейнера прежнего размера.

## Architecture
Accent берётся из того же resolveThemedArt (кэшируется реестром по имени+яркости) — второго разрешения нет. Цвет tint — liquidGlassTokens(...).accentBright, как в ThemedArt; компоненты уже подписаны на тему, новых перерисовок нет. transition 0, accessible=false.

## Security and privacy
Статические картинки, данных нет.

## Technical debt
Для плитки Шпиля accent берётся от того имени, которое дало основу (spire_tile или intro_arena).

## Verification
Тест: с accent — 2 слоя, без — 1; соседние контракты Главной; срез типов.

## Rollback
git revert коммита.
