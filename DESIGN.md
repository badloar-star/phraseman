# Design

Визуальная система Phraseman. Источник истины — код: токены темы в
[components/ThemeContext.tsx](components/ThemeContext.tsx), палитры тем в
`constants/*Theme*.ts` (goldTheme, compassTheme, cinemaThemes, flatDesign и др.).
Этот файл фиксирует РОЛИ токенов и правила применения; конкретные hex живут в
темах и меняются только там.

## Themes

Мультитемное приложение; режим по умолчанию — `midnight` (тёмный). Каждая тема
поставляет один и тот же набор токенов `t.*` — компоненты НИКОГДА не хардкодят
цвета (исключение: `shadowColor: '#000000'` и белые/чёрные alpha-слои).
Премиальный акцент-стиль владельца: «Золотой танец» — тёмный оливковый фон +
золото `#C9A84C` (см. память style_golden_dance).

## Color Tokens (роли)

| Токен | Роль |
| --- | --- |
| `t.accent` / `t.accentBg` | Действие, выигрыш, активные состояния / их тональная подложка |
| `t.bgGradient` | Градиент фона экрана (ScreenGradient) |
| `t.bgSurface` / `t.bgSurface2` | Поверхности первого/второго уровня |
| `t.bgCard` | Карточки и модалки |
| `t.textPrimary` / `t.textSecond` / `t.textMuted` | Иерархия текста |
| `t.correctText` | Текст на акцентной заливке |
| `t.gold` | Премиум/награды |
| `t.border` | ТОЛЬКО односторонние разделители и грабберы (не рамки!) |

Полупрозрачные поверхности — через `glassFill(t.bgSurface, α)`
(components/GlassSurface), тональные карточки — `TonalSurface`
(tone: subtle 0.34 / card 0.56 / raised 0.72 + акцентное свечение).

## Typography

Единая шкала `BASE_FONTS` × пользовательский масштаб (`createFonts(scale)`);
шрифт семейства темы — `ds.fontFamily`.

| Токен | pt | Использование |
| --- | --- | --- |
| h1 | 22 | крупные заголовки |
| h2 | 18 | заголовки экранов/модалок |
| h3 | 16 | подзаголовки |
| bodyLg | 16 | текст кнопок |
| body | 14 | основной текст |
| sub | 14 | подписи, мета |
| caption | 13 | мелкие пометки |
| label | 12 | uppercase-лейблы (letterSpacing ~1) |
| numLg / numMd | 28 / 20 | крупные числа (стрик, счётчики) |

Правила: fontWeight ТОЛЬКО '400' и '700'; в плотных местах
`maxFontSizeMultiplier={1.2}`; `adjustsFontSizeToFit` запрещён.

## Shape & Spacing

- Радиусы: чипы/поля 12–14, кнопки/карточки 16–18, крупные карточки 20,
  модалки/шиты 24–28. Кнопки высотой `ds.buttonHeight` (мин. 46–52).
- Базовая сетка отступов: 4/8/12/16/20; горизонтальный паддинг экрана 20,
  full-bleed элементы — `marginHorizontal: -20`.
- Тени: токены `ds.shadow.*` (направленные чёрные, `shadowColor '#000000'`);
  на Android — elevation; shadowRadius держим ≤ ~16 (perf-guard).

## Components (переиспользуй, не изобретай)

- `ScreenGradient` — фон экрана (+ `artBackdrop`).
- `SectionSheetHeader` — шапка «шторки раздела» (крестик + аксессуар).
- `TonalSurface`, `glassFill` — карточки/поверхности без обводок.
- `TapScale` — нажимаемые элементы с масштабом; `SkeletonShimmer` — скелетоны
  с зарезервированной геометрией.
- Шиты: `referral_sheet_shell`-паттерн (drag-to-dismiss: вниз 1:1, вверх
  резина ×0.12, закрытие 88px / velocityY 900).

## Motion

- Только Reanimated на UI-треде; из worklet — `scheduleOnRN` (runOnJS в
  спин-экранах запрещён контрактом).
- Появление: ease-out / `FadeInDown` с каскадом 40мс; входы «reveal enhances
  an already-visible default» — контент виден и без анимации.
- Пресс-фидбек: scale ~0.97 (TapScale) или activeOpacity 0.8.
- Каждый повторяющийся цикл обязан иметь владельца (runtime_lifecycle_ratchet):
  гард `useRuntimeActive`/фокус+AppState, либо конечная длительность.
- `useReducedMotion` — обязательная ветка каждой анимации.
- Хаптика: тап — `hapticTap`, успех — `hapticSuccess`, тики механики —
  `hapticLightImpact`; только на управляющих элементах.

## Hard Bans (владелец)

1. Контейнеры с `borderWidth`/`borderColor` (разделяем тоном/тенью/фоном).
2. Подпись-расшифровка мелким шрифтом под названием пункта.
3. `adjustsFontSizeToFit` для ужатия текста.
4. Слова «рулетка/крутить/прокрут» в любых видимых строках.
5. Полноэкранные спиннеры там, где хватает локального состояния.
6. fontWeight кроме 400/700.

## Guards (не ослаблять)

`tests/perf_freeze_contract.test.ts`, `tests/layout_stability_contract.test.ts`
(+ `config/layout-stability-baseline.json` — может только уменьшаться),
`tests/runtime_lifecycle_ratchet.test.ts`, design-guard/a11y-guard хуки на
записи файлов. Новые исключения — только осознанным решением владельца.
