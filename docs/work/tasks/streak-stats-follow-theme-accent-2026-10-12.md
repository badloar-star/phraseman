# Серия и статистика следуют цвету темы (перо, тепловая карта, шеврон)

Governance-ID: TG-8B54EC9B1DCA
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора 12.10: экраны Серии/Статистики берёт Темы, их сейчас никто не держит)

## Outcome
1) Свечение пера серии (`components/icons/LiveStreakFlame.tsx`) красится акцентом темы вместо бирюзы `FIRE_CHROME['dark']`. 2) Палитра годовой тепловой карты (`components/ActivityHeatmap365.tsx`) строится от `theme.accent`, а не от зелёного `statsThemeAccent('dark')`. 3) Шеврон блока «Архив» в `app/streak_stats.tsx` — тон текста темы (`glassTone(t.textPrimary, 0.45)`), виден на светлой теме (раньше белый 45 % на светлой почти невидим).

## Scope
Три точечные правки цвета в трёх файлах. Таблицы `streakIconAssets.ts`, `statsThemeChrome.ts` не меняются (запись «БЫЛО», иконки-арт заморозки и пера прежние). Мёртвые ветки gold/olive/light не удаляются до конца R1. Размеры, анимации, тексты не меняются.

## Architecture
Цвет берётся из `useTheme().theme` (Theme, собранный `makeLiquidGlassTheme` из токенов) и `glassTone` (тон по цвету текста темы). Без нового состояния и без сети; `useTheme` в LiveStreakFlame — подписка на уже существующий контекст, один раз на компонент; сила свечения считается как прежде из `variant.intensity`.

## Security and privacy
Только цвета. Данные, права, сеть не затрагиваются; политика конфиденциальности не меняется.

## Technical debt
`FIRE_CHROME` в `streakIconAssets.ts` остаётся по `themeMode` для `backgroundColor/borderColor/accentColor` (их никто не использует, кроме glowColor в LiveStreakFlame); убрать вместе с мёртвыми ветками после R1. `EXEMPT_COLOR_4/5` в `streak_stats.tsx` станут неиспользуемыми — убрать в этой же правке.

## Verification
Точечный jest при ≥3 ГБ свободной памяти и слоте светофора (`--maxWorkers=1`): контракты серии/статистики и ratchet цветов; срез типов только по трём файлам; кадры светлой/цветной темы — через Сверку (эмулятор занят).

## Rollback
git revert коммита; поведение возвращается к бирюзовому перу, зелёной карте и белому шеврону.
