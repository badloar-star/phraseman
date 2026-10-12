# Плитки Главной на реестр тематического арта: «Мои ошибки», «Шпиль» (spire_tile), «Наборы из видео», «Сохранённые»

Governance-ID: TG-0CF7875D56A6
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (задача координатора, после 963f8ccc6)

## Outcome
Все четыре запасные плитки Главной берут картинку через resolveThemedArt (тёмная/светлая), поэтому новые файлы Codex (ICONS_FOR_CODEX_2026-10-12.md) встают сами: «Мои ошибки» → mistakes_entry (в обеих яркостях уже есть), «Шпиль» → spire_tile, затем intro_arena, затем запасной; «Наборы из видео» → cards_from_video; «Сохранённые» → cards_empty_saved. Старых картинок 1.0 на этих плитках нет.

## Scope
components/theme/themed_art_registry.ts (+ имя 'spire_tile'), app/(tabs)/home.tsx (4 строки art:), tests/themed_art.test.ts (счётчик имён 111→112). Вид плиток и логика не меняются.

## Architecture
Порядок разрешения для Шпиля: spire_tile → intro_arena → картинка v2. Остальные — разрешённое имя с нынешней картинкой как запасной (реестр FALLBACKS уже хранит их). После сдачи файла нужен запуск scripts/gen_themed_art_assets.mjs (регистрирует файлы в themed_art_assets.generated.ts).

## Security and privacy
Статические картинки, данных нет.

## Technical debt
До появления файла spire_tile dev-журнал [THEMED-ART] один раз печатает origin=none; это ожидаемо.

## Verification
Срез типов, тест themed_art, поиск старых require на плитках.

## Rollback
git revert коммита.
