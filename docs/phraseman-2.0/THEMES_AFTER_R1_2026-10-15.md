# Темы 2.0: что сделать ПОСЛЕ R1 (список сессии «4 · ТЕМЫ 2.0»)

- **app.json** (общий файл сборки, не трогать до сборки 16.10): убрать мёртвые шаблоны путей `assets/images/league/league_crown.webp` и `assets/images/levels/league-v6-icons/*.webp` — файлов нет, шаблоны безвредны (решение координатора 15.10).
- **Старые картинки 1.0, ещё используемые как запасные** (заменить, когда будет арт 2.0): `levels/SHOP FOREST.webp` (запасной «Магазин»), `levels/exam-dark.webp` («Экзамен»), `home_menu/home-forest-{diagnostic-test,practice}.webp` («Диагностика», «Практика»), `home_last_lesson/home-last-lesson-forest.webp` (превью видео-наборов, VideoThumb), `levels/{almaz,bronza,izumrud,rubin,serebro,zoloto,achivement}.webp` и `levels/generated-v5-dalle` (ранги монеты, достижения).
- **Арт Codex**: `spire_tile`, `cards_from_video`, `cards_empty_saved` — сдать в `assets/images/v2art/{dark,light}/` (≤ 400 КБ, настоящая прозрачность), затем `node scripts/gen_themed_art_assets.mjs` (запуск при приёмке — координатор).
- **Слой .accent** у картинок Главной — код готов (d54586e75), нужны файлы `<имя>.accent.webp`.
- **Названия категорий карточек при en** («Scenes», «Links» — укорочены под чип 68): подтвердить формулировки.
