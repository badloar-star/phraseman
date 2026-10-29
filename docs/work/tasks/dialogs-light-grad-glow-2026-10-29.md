# Task packet: светлые Диалоги у grad_* — без чёрных пятен в сцене

Governance-ID: TG-05C986676715
Status: In progress
Owner: сессия «4 · ТЕМЫ»
Related epic/enabler: находка Макетов и Сверки через координатора 29.10 (чёрные пятна в светлой сцене Диалогов у grad_*)

## Outcome

В светлых Диалогах у всех grad_* нет чёрных пятен за героем и у кнопки «Начать»: свет сцены строится из accentGlow темы тем же набором слоёв, что у обычных светлых; слой из полностью прозрачного цвета не рисуется вовсе. Мера: сторож «нет слоёв из прозрачного чёрного» и «яркость светлой сцены grad_* не ниже порога» на всех grad_*; новый кадр Сверки.

## Scope

In scope: components/dialogs/scene/dialogs_scene_tokens.ts, DialogsSceneBackdrop.tsx, use_dialogs_scene_theme.ts (журнал слоёв), тест tests/dialogs_scene_light_grad_glow.test.ts. Меняются только светлые grad_*; тёмные темы визуально не меняются (кроме не-рисования полностью прозрачных слоёв).

Out of scope: Главная, Моменты, DialogsTabContent (грязный у Codex), тёмные палитры.

## Architecture

bgGlow у grad_* равен CLEAR (#00000000). Слой радиального свечения кладёт stopColor=этот цвет и stopOpacity=1; на Android прозрачность из hex8 теряется — получается чёрное пятно. Исправление двойное: (1) dialogsSceneColors для светлого оформления подставляет accentGlow вместо прозрачных слоёв; (2) подложка не рисует слой, цвет которого полностью прозрачен.

## Security and privacy

Данные не затрагиваются.

## Technical debt

Pay now: общий признак «цвет полностью прозрачен» вместо проверки на месте.

## Verification

Тест на 29 темах × 2 оформления: нет слоёв прозрачного чёрного, светлая яркость grad_* ≥ порога; соседние тесты dialogs_scene_*; кадры Сверки (aurora, ice, graphite).

## Rollback

git revert коммита.
