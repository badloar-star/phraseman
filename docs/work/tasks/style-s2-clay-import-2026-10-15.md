# Приёмка стиля S2_clay («Глина берём», решение владельца) и уборка старого свечения .glow

Governance-ID: TG-3D533949F41A
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (приказ координатора: владелец выбрал S2_clay, вне очереди)

## Outcome
В assets/images/v2art/{dark,light}/ встают lessons, dialogs, spire_tile — каждый с .accent, в обеих яркостях (через scripts/import_art_style.mjs S2_clay: сжатие ≤ 400 КБ, сторож альфы, бэкап заменённого, регистрация генератором). Плитки «Уроки», «Диалоги», «Шпиль» получают цветную деталь в цвет темы. Остальные предметы Главной пока прежние. Старые файлы свечения lessons.glow / dialogs.glow (прежний стиль) убраны из assets: на них никто не ссылается.

## Scope
assets/images/v2art/** (6 основ + 6 accent), components/theme/themed_art_assets.generated.ts (генератор), три файла *.glow.webp → ART_STYLE_FOR_CODEX/_backup/glow_old_style/, лог генератора о пропущенных .glow, тест «в v2art нет .glow». Код плиток не меняется (accent-слой уже готов, d54586e75).

## Architecture
Импорт — штатной командой приёмки; сторож [THEMED-ART-GUARD] и «всё или ничего» действуют. .glow генератор и экраны не читают (регулярка имён их отсекает) — свечение поверх глины невозможно, файлы лишь тяжёлый мусор в сборке.

## Security and privacy
Статические картинки.

## Technical debt
Прочие предметы Главной (cards, continue, today, phrase_of_day, mistakes_entry) — прежнего стиля до дорисовки Codex в S2.

## Verification
Тесты themed_art, themed_art_guard, home_art_accent_layers, asset_hygiene; --check генератора.

## Rollback
git revert; прежние версии заменённых файлов — в ART_STYLE_FOR_CODEX/_backup/S2_clay-<время>/.
