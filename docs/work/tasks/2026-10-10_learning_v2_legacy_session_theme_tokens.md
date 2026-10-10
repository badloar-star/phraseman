# Task packet: старые экраны сессии Learning V2 — цвета из токенов темы

Governance-ID: TG-F33C0EFFAB0E
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0» (контур: токены тем)
Related epic/enabler: координатор 10.10 20:22 — «ПЕРЕНОСИ на токены темы, функция-построитель стилей + хук, разметку и поведение не менять»; владелец: цвета по выбранной теме везде

## Outcome

`app/learning-v2/session/[id].tsx` (118 цветов) и `app/learning_v2_session_intro_check.tsx` (52) рисуют сессию своей тёмно-синей палитрой и не реагируют на выбор темы. Переносим на токены темы: модульный `StyleSheet.create` становится функцией `createStyles(g)`, компонент берёт `g = useLv2Glass()` и мемоизированные стили; встроенные цвета в разметке — `g.*`. Разметка, логика, тайминги и состояния не меняются. Палитры семейств режимов (`MODE_META.accent`) — идентичность режима, помечены theme-exempt.

## Scope

In scope: оба файла; пометки theme-exempt в `MODE_META` и градиенте кнопки режима; база храповика (строки этих файлов).
Out of scope: `LearningV2DirectSessionPlayerV1` (английский, новый плеер), `UpdateModal`/`ForceUpdateGate`/`GlobalBroadcastModal` (следующая задача), Главная.

## Architecture

Соответствие ролей: фон → `bg/bgTop/bgBottom`; карточка → `opaqueCard`; плашка/чип/поле → `opaqueControl`; кант → `glassEdge`; текст → `text/secondary/mutedText`; главная кнопка и активное → `accent/accentInk`; верно → `good/goodSoft`; ошибка → `bad`; звёзды и золото → `warn`; тень → `dropShadow`. Все токены дают контраст ≥ 4.5 на карточке, фоне и плашке во всех 23 темах (`theme_palette_roles`). Стили пересчитываются только при смене объекта токенов темы (мемо), ноль работы на кадр.

## Security and privacy

Не применимо.

## Technical debt

- Остаток цветов, которым нет роли в токенах, остаётся с пометкой и причиной.

## Verification

Синтаксис и вывод транспилятора без цветовых литералов; `learning_v2_liquid_glass_source_contract`, `short_screen_layout_contract`, тесты, ссылающиеся на файлы, храповик цветов; проверка тёмная + светлая тема через Сверку (эмулятор после 20:40).

## Rollback

`git revert` — вернутся прежние палитры.
