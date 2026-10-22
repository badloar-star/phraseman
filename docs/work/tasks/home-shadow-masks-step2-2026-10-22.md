# Главная, шаг 2 ускорения первого кадра: тени плит сцены — запечённые маски вместо размытия boxShadow

Governance-ID: TG-8328CD70181C
Owner: 3 · МАКЕТЫ · Date: 2026-10-22 · Source: владелец кнопкой (ускорение первого кадра Главной); план 4 · ТЕМЫ
docs/work/home_first_frame_effects_2026-10-22.md (п. 1 описи — тени-размытие blur 26–28 у 6 плит); ассеты 99165475b / 8d4454aaa
(components/home/v2/scene/home_scene_baked_assets.generated.ts: HOME_SCENE_SHADOW_MASKS[tile|today|phrase][dark|light|lightSoft]).

## Outcome
- Плиты сцены Главной — 4 плитки (HomeV2FeatureTiles, класс tile), карточка «Сегодня» (HomeV2TodayCard, today), фраза дня
  (DailyPhraseCard на сцене, phrase) — тень рисуется картинкой-маской позади плиты, без размытия в реальном времени. Вид тот же.

## Scope / как
- Новый компонент components/home/v2/scene/HomeScenePlateShadow.tsx: Image (expo-image или RN Image) позади плиты, position
  absolute, вставки left/right = −margin, top = −margin + offsetY, bottom = −margin − offsetY (размер плиты не меряем — первый кадр
  сразу с тенью), resizeMode stretch, tintColor: тёмная тема — слой dark → g.plateShadow; светлая — light → g.plateShadow и
  lightSoft → g.plateShadowSoft; pointerEvents none. Лёгкий режим (isLiteModeOn) — масок нет, как и теней раньше.
- Почему маска не ребёнком плиты: фон плиты красит сам слой, дети рисуются поверх — размытая середина маски легла бы на плиту.
  Поэтому заливка плиты переезжает в дочерний слой: [маска, заливка absoluteFill со скруглением, содержимое]; у плиты нет overflow
  hidden (sceneTile, sceneCard) — маска выходит за края; при нажатии V2Pressable масштабирует всё вместе.
- boxShadow у этих трёх плит убирается только когда маска есть (класс известен); иначе — прежний boxShadow.

## Architecture
- Один маленький компонент на все три класса; данные — сгенерированная таблица 4 · ТЕМЫ; без замеров и без лишних перерисовок.

## Security and privacy
- Данные, сеть, хранилище не затронуты.

## Technical debt
- Шаг 3 (фон сцены запечённым backdrop), шаг 4 (фон под сценой, герой 512), шаг 5 (CapFill таб-бара по HOME_TABBAR_CAP) — далее.

## Verification
- Срез типов трёх компонентов, тесты Главной (home_* сторожа плит/теней), храповик литералов — через слот.
- Приёмка — только снимки до/после у Сверки во всех темах (тёмная + светлая), плитки, «Сегодня», фраза.

## Rollback
- git revert коммита; или вернуть boxShadow — маски не используются.
