Governance-ID: TG-7F92E00E0F57

# Task packet: экран «Из видео» — список строк как утверждённый макет

## Outcome
Слово владельца через координатора (05.11, 🔴): экран `/flashcards_video_packs` («Из видео N») — не огромные обложки с кнопкой «Добавить +», а СПИСОК строк-карточек по эталону `docs/work/golden/approved-rev8/rev7-packs-video-dark.png/-light.png` и макету Artifact 7HBvADT8mFZVNKB3jvQdgr: слева стопка `v2art/cards.webp`, жирное название НАБОРА (packTitle → название видео), серым «N карточек · длительность», справа ›. Язык справа в шапке. «Добавить» со списка убрано — добавление остаётся на экране самого набора/видео (`CommunityPackSocialBar` в `lingman_video_watch` и `VideoSetView`), функция не теряется.

## Scope
- `app/flashcards_video_packs.tsx`: строка списка = уже существующий вариант `catalog` (`PackCatalogRow`) вместо `card`; зазор между строками, скелет под геометрию строки (86), язык текстом справа в шапке (открывает то же меню с выбором языка/поиском/сортировкой).
- Тест-сторож `tests/video_packs_screen_catalog_rows_2026_11_05.test.ts`.
- Не трогаются: встроенная вкладка «Наборы» в «Видео» (`embedded`, вариант `plain`), загрузка каталога, открытие набора, `VideoPackRow` (вариант `card` остаётся для других мест).

## Architecture
Вариант `catalog` строки уже реализует эталон rev8; экран только переключается на него. Данные те же (`loadVideoPhraseSetPacks`, кэш), новых чтений нет. Название берёт `packTitleForInterface` — поле набора (titleRu…), у которого при пустом имени запасное — имя видео (см. packet video-pack-title-fallback).

## Security and privacy
Данные не собираются, новых полей и сервисов нет.

## Technical debt
Строка `catalog` не показывает «Добавить»; быстрое добавление набора со списка убрано по слову владельца — остаётся на экране набора. Общий компонент строки Тем подменит строку позже.

## Verification
Сторож по исходнику; прежние контракты экрана (`flashcards_video_liquid_source_contract`, `flashcards_no_loading_or_error_contract`); кадр через Эмулятора (тёмная и светлая) против rev7-packs-video.

## Rollback
`git revert` коммита.
