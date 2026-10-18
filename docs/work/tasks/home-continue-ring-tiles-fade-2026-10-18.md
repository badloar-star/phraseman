# Task packet: Главная — плашка «Продолжить» вариант Г, затухание ленты плиток, кнопки шторок диалога

Governance-ID: TG-1CA1D6D02263
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: правило владельца «кнопки нигде не сливаются»; слово владельца 18.10 «вариант Г», «обязаны слушаться цвета темы»

Governance-ID: TG-4F599001D760 (добавка 08:01: жест ленты плиток против пейджера вкладок)
Governance-ID: TG-A668979DA167 (08:40: возврат правки по команде координатора — лента+жест обязательны к выпуску)

Добавка 08:01 (координатор, находка Макетов на кадре 11886ef5b): свайп по ленте 4 плиток переключал вкладку («Aprendizaje») вместо прокрутки — Пик недостижим.
Решение: лента — `ScrollView` из react-native-gesture-handler (свой нативный обработчик в общей арене жестов, пейджер `TabSlider` с порогом 22 px его не перебивает)
+ на время касания ленты ставится существующий замок `tabSwipeLocked` (app/tabSwipeLock.ts; TabSlider проверяет его в onUpdate/onEnd), снимается после отпускания.
Логи `[HOME-RIBBON]` на начало/конец касания и прокрутки. Свайп вне ленты меняет вкладку как прежде. Проверка — en, 4 плитки, на эмуляторе.

## Outcome

1. Плашка «Продолжить» на Главной — вариант Г из `docs/design/v2-app/continue-card-variants.html`: кольцо прогресса вокруг иконки справа, слева название и «done / total · метка места»; без полосы и стрелки; высота 96; иконка — `continue` из набора B (b4af17fc1). Дуга `accentGraphic`, дорожка `buttonFill`, текст `text`/`secondary` — только токены темы.
2. Лента из 4 плиток: размер плиток прежний, справа затухание 24 dp от токена `bg`, касания сквозь.
3. Кнопки шторок «Задания»/«Почему так» не сливаются со шторкой (`opaqueSheet`) в светлых градиентных темах.

Мера: blend-аудит 0 провалов (23 темы × тёмная/светлая × насыщенность), тесты Главной зелёные, кадр Сверки тёмная+светлая.

## Scope

In scope: `components/home/v2/HomeV2ContinueCard.tsx`, `components/home/v2/HomeV2FeatureTiles.tsx`, `components/dialogs/DialogGoalsSheet.tsx`, `components/dialogs/DialogWhySheet.tsx`, `components/dialogs/glass/dialogue_cta_paint.ts`, `tests/blend_1018_pairs.ts`, `tests/home_four_tiles_spire.test.ts`.

Out of scope: файлы арта `assets/images/v2art/**` и `themed_art_*` (сессия арта), звуковая зона (запрет координатора 07:30), `app/(tabs)/home.tsx`.

## Architecture

No architecture change: компоненты берут цвета из тех же токенов `liquidGlassTokens` (useShadowGlass/useV2Palette). `dialogueCtaPaint` получает необязательный список поверхностей — прежние вызовы без изменений.

## Security and privacy

Не затрагивает: только отрисовка, без данных, сети и прав.

## Technical debt

- Pay now: сырой `accent` в двух шторках диалога заменён общим правилом `dialogueCtaPaint`.
- Defer: затухание ленты красится `bg`, а фон Главной — градиент bgTop→bg; проверить на кадрах Сверки градиентных тем.

## Verification

`npm run test:one` по тестам Главной, `tests/blend_1018_audit.test.ts`, `tests/home_four_tiles_spire.test.ts`; расчёт кольца: дуга к дорожке худшее 3,20 (grad_ice@1 light), дуга к плашке 6,01, дорожка к плашке 1,72, текст ≥ 5,58. Кадр Сверки тёмная+светлая.

## Rollback

`git revert` коммитов этой задачи; данных и миграций нет.
