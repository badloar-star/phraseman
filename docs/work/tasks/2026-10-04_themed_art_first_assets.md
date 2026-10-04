# Task packet: ThemedArt — первые 7 настоящих предметов Главной

Governance-ID: TG-7853118FA7D0
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: docs/work/tasks/2026-10-04_themed_art.md

## Outcome

Предметы Главной lessons, dialogs, cards, continue (1536×1024), phrase_of_day, mistakes_entry, today (коммит ассетов adfaa8c34, тёмный и светлый комплекты, без слоёв .accent) подключены в реестр ThemedArt как реальные файлы; остальные 103 имени — на прежних запасных. Комплект выбирается по яркости ФОНА темы (светлые → light; тёмные и градиентные тёмные → dark). Сессия 2 может подключать Главную.

## Scope

In scope: `app/theme/themed_art_assets.generated.ts` (пересборка скриптом), `app/theme/ThemedArt.tsx` (яркость по фону темы), `app/theme/themed_art_registry.ts` (экспорт выбора яркости), `tests/themed_art.test.ts`.
Out of scope: экраны (сессия 2); `*.glow.webp` — не мои (созданы 14:38 до этой работы, неотслеживаемые) — сообщаю координатору, не удаляю; папка `review/`.

## Architecture

Без изменений архитектуры: generated-файл пересобран `scripts/gen_themed_art_assets.mjs` по факту файлов. Яркость: относительная яркость `bg` палитры темы (WCAG) < 0.5 → dark. Палитра кэширована, расчёт — одно число на рендер.

## Security and privacy

Не применимо.

## Technical debt

Нет новой.

## Verification

`node scripts/gen_themed_art_assets.mjs --check`; тест `tests/themed_art.test.ts` (7 имён → origin v2art в обеих яркостях; без .accent слой не рисуется; выбор яркости по фону для тонированных, градиентных тёмных и «Пастели»); проверка типов — 0 ошибок в моих файлах.

## Rollback

Пересобрать generated-файл без новых файлов / `git revert` — экраны вернутся к запасным картинкам.
