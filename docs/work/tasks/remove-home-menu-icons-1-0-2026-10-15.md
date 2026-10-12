# Удаление мёртвых иконок меню 1.0: home_menu_icons.ts, прогрев section_asset_preload, ≈72 картинки

Governance-ID: TG-0CF7875D56A6
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора: «убери home_menu_icons.ts и эти файлы, проверь ссылки, тесты и предзагрузку»)

## Outcome
Из сборки уходит набор иконок меню 1.0 по 8 темам. Проверено кодом: поле `img` в quickItems Главной нигде не читается (плитки берут `tile.art`), а `section_asset_preload` прогревал эти же никем не рисуемые картинки при КАЖДОМ старте и смене темы — зря тратил декодирование и память. Убираем и набор, и прогрев; приложение стартует легче.

## Scope
Удаляются: app/home_menu_icons.ts, app/section_asset_preload.ts, 71 файл assets/images/home_menu/** (кроме home-forest-diagnostic-test.webp и home-forest-practice.webp — их держит реестр арта как запасные), assets/images/levels/her man foret.webp. Правятся: app/(tabs)/home.tsx (импорт, menuImages, 3 строки img:), app/_layout.tsx (эффект прогрева), тесты section_asset_preload / live_theme_contract / olive_icon_transparency / removed_theme_assets / onboarding_graphite. Вид и логика Главной не меняются.

## Architecture
Отдельного потребителя у набора нет: единственные читатели — dead-поле img и прогрев. Реестр арта (themed_art_registry) продолжает держать 2 файла home_menu и levels/{exam-dark,SHOP FOREST} как запасные имена.

## Security and privacy
Статические картинки и код загрузки; данных пользователя нет.

## Technical debt
Файлы league/weekly-goal, SHOP FOREST, home-last-lesson-forest не трогаем (поручение). Генераторы в scripts/ (process-cinema-*, fix_ember_home_art_padding) пишут в удалённые папки — это офлайн-инструменты, к сборке не относятся; пометить в отчёте.

## Verification
Срез типов по home.tsx и _layout.tsx; тесты home/section/theme-asset; поиск остаточных ссылок на удалённые файлы (0).

## Rollback
git revert коммита (файлы вернутся из истории).
