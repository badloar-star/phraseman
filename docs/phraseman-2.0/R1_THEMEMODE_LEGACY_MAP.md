# R1: где прежний `themeMode` ещё красит по старой таблице (Темы, 12.10)

Причина: `ThemeContext` всегда отдаёт `themeMode = 'dark'` (`LEGACY_GRAPHITE_THEME_MODE`, components/ThemeContext.tsx:286, :583).
Всё, что выбирает цвет из таблицы «по id прежней темы», на ЛЮБОЙ теме Liquid Glass (в том числе светлой и любом оттенке ползунка) берёт строку `dark`.
Метод: чтение кода по строкам `themeMode` (grep), без кадров. Классы: **A** — цвет по старой таблице (видно на других темах/светлой); **B** — только выбор арта/тени/радиуса; **C** — мёртвое (результат не влияет или нет потребителей).

## Экраны R1 (приоритет)

| Файл:строка | Что красит | Класс | Предложение |
|---|---|---|---|
| `app/(tabs)/lessons.tsx:365,495–498,4153,4688–4689` | `bookPalette(num, themeMode)` берёт `LESSON_LEVEL_PALETTES['dark']`: заливка карточки урока A1–B2 — зелёные пастели `#B8D6B8…` на любой теме | **A** (видно) | Взять цвета уровней A1–B2 из токенов (`LiquidGlassPaletteRoles`, комментарий в самом файле: «токены A1–B2 — у сессии Темы»); владелец экрана — Уроки. Тема готова отдать функцию `levelFillFromTokens`. |
| `app/(tabs)/lessons.tsx:846–848,2384–2386,4686` | `isLightThemeMode / olive / gold` — всегда `false` | **C** | Ветки gold/olive/light мертвы при `themeMode='dark'`; удалить или переключить на `tokens.isLight` (светлая тема сегодня их НЕ получает). |
| `app/(tabs)/lessons.tsx:574,822,2141,2228` | `_themeMode` не используется; `PlusBadge themeMode` | **B/C** | PlusBadge — см. ниже. |
| `app/lesson_complete.tsx:153,302,509,1698` | `themeMode` пробрасывается в ReviewModal/Notif | **B** | Цвет берётся из `t`; проверить, что внутри нет таблицы по themeMode (в grep — только проброс). |
| `app/level_exam.tsx:565–568` | `isGoldTheme/isOliveTheme` (всегда false), `oliveLevelExamChrome(themeMode)`, `screenTextOnGradient` | **C** (+B) | `screenTextOnGradient` игнорирует themeMode (theme.ts:334, параметр `_themeMode`) — цвет из `t`, безопасно. Olive-ветка мертва. |
| `app/lesson1.tsx:487,565,595,1885,3966` | `screenTextOnGradient(t, themeMode)` | **B** | Безопасно: цвет из `t`. |
| `components/lesson_help_theory_ui.tsx:47–48` и `_data.tsx` (14 вызовов) | `theoryColors(t, themeMode)` → `screenTextOnGradient` | **B** | Безопасно: themeMode не влияет, цвет из `t`. Можно убрать параметр отдельным чистым коммитом (низкий приоритет). |
| `app/streak_stats.tsx:81,113,1003…2561` | комментарий: акцент «тон стекла, а не легаси-хром по themeMode»; `StatsCardArtSurface themeMode`, `statsSurfaceRadius(themeMode)` | **B** | Цвет уже из `t.accent`; `themeMode` — арт/радиус. `isGoldTheme` (1814) всегда false. Размер радиуса в таблице по themeMode — проверить кадром. |
| `app/streak_stats.tsx:2524` | цвет шеврона `isLightThemeMode(themeMode) ? … : …` | **A** | На светлой теме шеврон остаётся белым 45 % (невидим). Взять `glassTone(t.textPrimary, 0.45)`. Экран — Серия/Статистика. |
| `components/icons/LiveStreakFlame.tsx:42,137` → `constants/streakIconAssets.ts:61–73,178–195` | `FIRE_CHROME['dark']`: подложка, рамка и свечение пера — бирюза `#26D9B1` на любой теме | **A** (видно) | Взять `accent/accentGlow` из токенов; констнанта-модуль `streakIconAssets.ts` — предложение: функция `streakFeatherChromeFromTokens(tokens)`; сам файл — зона Серии (не в моём списке констант). |
| `constants/streakIconAssets.ts:100–150` | иконка заморозки по themeMode (`STREAK_FREEZE_ICON_SOURCES['dark']`) | **B** | Арт, один на все темы — по замыслу (комментарий в файле). |
| `components/ActivityHeatmap365.tsx:151–183,245–248` | `heatPalette(themeMode)` → `statsThemeAccent('dark')` (зелёный `#47C870`), `themeMode==='gold'` (мертво) | **A** (видно) | Палитра тепловой карты из `tokens.accent`; потребляет `constants/statsThemeChrome.ts` — чинится там (ниже). |

## Тосты и модули-константы

| Файл:строка | Что красит | Класс | Предложение |
|---|---|---|---|
| `constants/themedToastChrome.ts:134–143` | `CHROME_BY_THEME[themeMode]` — подложка, акцент, рамка, тень тоста | **C** | Потребителей в `app/components` нет (только комментарий в `ActionToast.tsx:81` и тесты). Либо удалить, либо дать `themedToastChromeFromTokens`. Решение: функция «из токенов» + отпечаток «БЫЛО», удаление — после подтверждения координатором. |
| `components/medalToastThemeStyles.ts:244–245` и `components/MedalToast.tsx:330` | `getMedalToastThemeStyle(themeMode ?? 'indigo')`: фон, рамка, свечения, плашка медали | **A** | `MedalToast` получает `themeMode` пропом (по умолчанию `'indigo'`); при `'dark'` берётся тёмная строка на любой теме. Функция «из токенов» + тест; подключение в `MedalToast.tsx` — Дизайну. |
| `constants/statsThemeChrome.ts:28–215` | акценты, поле страницы, обводки, подсветка статистики | **A** | Единственный потребитель — `ActivityHeatmap365` (`statsThemeAccent`). Сделать `statsThemeAccentFromTokens`. |
| `constants/v2Style.ts:68,157–177` | `getV2Palette(theme, themeMode)`: ветка со стеклом уже строит палитру из токенов, `TINT_BY_THEME[themeMode]` — запасной вариант для тем не из Liquid Glass | **B/C** | Для тем Liquid Glass запасной вариант не достигается. Правки не нужны. |
| `components/PlusBadge.tsx` (5), `app/oskolok.ts` (8), `app/olive_completion_chrome.ts` (4) | значки/осколки/олива | **B/C** | Разбор после R1; olive — мертво при `themeMode='dark'`. |

## Что делаю сам (по поручению координатора)
Только модули-константы: `statsThemeChrome.ts`, `themedToastChrome.ts`, `medalToastThemeStyles.ts` — добавляю функции «из токенов» рядом с таблицами (таблицы не трогаю, это запись «БЫЛО»), тест 4 темы × тёмная/светлая × 3 оттенка. `v2Style.ts` правки не требует (см. выше). Подключение в экраны — их владельцам через координатора.

## Передать владельцам экранов
- **Уроки (`lessons.tsx`)**: заливка карточек A1–B2 по токенам; мертвые ветки gold/olive/light.
- **Серия/Статистика (`streak_stats.tsx`, `LiveStreakFlame`, `streakIconAssets.ts`, `ActivityHeatmap365.tsx`)**: шеврон на светлой теме; бирюзовое свечение пера; зелёная тепловая карта.
- **Дизайн (`MedalToast.tsx`, `CardPackShardPaywallModal.tsx`, `useCollectionData.ts`)**: подключить функции «из токенов».
