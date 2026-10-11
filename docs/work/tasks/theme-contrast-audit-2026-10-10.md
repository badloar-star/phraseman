# Аудит контраста AA — пары «текст/значок на плашке» по всем темам (10.10)

Governance-ID: TG-F33C0EFFAB0E
Status: Done
Owner: сессия «4 · ТЕМЫ 2.0»

Охват: 23 тем × 2 оформления (тёмное, светлое) × 21 шаг ползунка насыщенности = 966 комбинаций на каждую пару.
Источник: `tests/theme_contrast_report.test.ts` (контраст WCAG по относительной яркости, без прозрачности — цвета берутся без альфы). Порог: 4.5 — текст и кнопки, 3 — приглушённый и акцентный текст/графика.
Перегенерировать: `THEME_REPORT=1 npm run test:one -- tests/theme_contrast_report.test.ts` — отчёт появится в временной папке (`%TEMP%/theme-contrast-audit-2026-10-10.md`), скопировать сюда.

| Пара | Порог | Худший в тёмных (тема\|оформление\|шаг) | Худший в светлых | Итог |
|---|---|---|---|---|
| text / карточка | 4.5 | 14.45 (grad_ice|dark|1) | 17.17 (terracotta|light|1) | ок |
| text / плашка | 4.5 | 11.99 (grad_ice|dark|1) | 13.02 (terracotta|light|1) | ок |
| text / шторка | 4.5 | 11.99 (grad_ice|dark|1) | 17.15 (ink|light|0) | ок |
| text / фон | 4.5 | 18.60 (sage|dark|1) | 13.57 (grad_jade|light|1) | ок |
| secondary / карточка | 4.5 | 7.37 (grad_ice|dark|1) | 6.62 (marine|light|1) | ок |
| secondary / плашка | 4.5 | 6.12 (grad_ice|dark|1) | 5.05 (olive|light|1) | ок |
| secondary / шторка | 4.5 | 6.12 (grad_ice|dark|1) | 6.55 (marine|light|0) | ок |
| secondary / фон | 4.5 | 9.91 (graphite|dark|0) | 4.77 (grad_jade|light|1) | ок |
| mutedText / карточка | 3 | 6.37 (eucalyptus|dark|1) | 4.70 (sage|light|1) | ок |
| accentText / карточка | 3 | 8.20 (grad_orchid|dark|1) | 5.66 (eucalyptus|light|1) | ок |
| accentText / плашка | 3 | 6.84 (grad_orchid|dark|1) | 4.33 (eucalyptus|light|1) | ок |
| ctaInk / cta (главная кнопка) | 4.5 | 8.52 (grad_midnight|dark|1) | 4.56 (grad_lilac|light|0.6) | ок |
| accentInk / accent (кнопка цвета темы) | 4.5 | 8.52 (grad_midnight|dark|1) | 4.56 (grad_lilac|light|0.6) | ок |
| good / карточка | 4.5 | 7.31 (grad_ice|dark|1) | 5.48 (grad_aurora|light|0) | ок |
| bad / карточка | 4.5 | 5.41 (grad_midnight|dark|0.9) | 5.82 (slate|light|0.8) | ок |
| warn / карточка | 4.5 | 8.82 (grad_ice|dark|1) | 5.54 (grad_aurora|light|0) | ок |
| info / карточка | 4.5 | 7.35 (grad_ice|dark|1) | 5.42 (grad_aurora|light|0) | ок |
| good / плашка | 4.5 | 6.06 (grad_ice|dark|1) | 4.50 (lavender|light|0.9) | ок |
| bad / плашка | 4.5 | 4.51 (grad_ice|dark|0.9) | 4.50 (taupe|light|0.75) | ок |
| белый значок / tileBlueDeep | 4.5 | 5.46 (graphite|dark|0.1) | 5.96 (graphite|light|0.05) | ок |
| белый значок / medalGoldDeep | 4.5 | 5.54 (graphite|dark|0) | 6.07 (graphite|light|0) | ок |
| levelA1 / levelA1Bg | 4.5 | 8.18 (grad_magma|dark|1) | 7.03 (eucalyptus|light|0.95) | ок |
| levelB2 / levelB2Bg | 4.5 | 6.59 (iris|dark|0.95) | 4.64 (sage|light|0.95) | ок |

## Нарушений нет

## Градиентные плашки (пункт 3 координатора, 21:12)

Текст кнопки (`accentInk`) проверяется на КАЖДОЙ точке градиента `accentGradient`, а не только на заливке `accent`: `tests/theme_gradient_plate_contrast.test.ts` (23 темы × 2 оформления × 21 шаг).
**Найдено и исправлено:** в светлом оформлении у 7 тонированных тем (Графит, Сланец, Чернила, Роза, Таупе, Олива, Шалфей) первая точка градиента на «Акценте»/«Максимуме» давала белому тексту 4.27–4.46 (< 4.5), всего 78 комбинаций. Причина — фиксированная светлота L .58 первой точки (зелёные и малонасыщенные тона ярче по восприятию). Исправление в `constants/liquidGlassThemeVariants.ts`: `whiteSafe(maxL, chroma, hue)` подбирает светлоту не выше .55 до контраста ≥ 4.55. Тёмное оформление и «Спокойно» не менялись. Теперь нарушений 0.

## Кнопки «Максимум»: светлый текст поверх градиента (12.10)

Сторож `tests/theme_max_button_matrix.test.ts`: `accentInk` на КАЖДОЙ точке `accentGradient` при ползунке = 1, 23 темы × 2 оформления. Нарушений нет; худшая точка по теме:

| Тема | Тёмное | Светлое |
|---|---|---|
| graphite | 7.29 | 4.54 |
| polar | 9.62 | 5.07 |
| slate | 5.74 | 5.02 |
| ink | 10.91 | 5.05 |
| lavender | 5.53 | 5.31 |
| iris | 10.82 | 5.20 |
| rose | 7.09 | 4.77 |
| terracotta | 8.88 | 5.64 |
| taupe | 7.15 | 4.69 |
| olive | 7.21 | 4.69 |
| sage | 6.14 | 4.61 |
| eucalyptus | 9.61 | 4.72 |
| marine | 9.69 | 4.83 |
| grad_aurora | 11.68 | 11.68 |
| grad_iris | 10.08 | 10.08 |
| grad_magma | 9.38 | 9.38 |
| grad_midnight | 8.52 | 8.52 |
| grad_champagne | 9.99 | 9.99 |
| grad_jade | 10.40 | 10.40 |
| grad_orchid | 8.62 | 8.62 |
| grad_ice | 11.19 | 11.19 |
| grad_coral | 8.78 | 8.78 |
| grad_lilac | 10.48 | 10.48 |

Самый тонкий запас — светлый Графит (4.54 при пороге 4.5). Перегенерировать: `THEME_REPORT=1 npm run test:one -- tests/theme_max_button_matrix.test.ts`.

## Что не покрыто

- Цвета, зашитые прямо в экранах (остаток храповика цветов, `config/theme-hardcoded-colors-baseline.json`): там контраст зависит от экрана, а не от темы. Главный остаток — старые экраны сессии Learning V2 (кодмод ждёт решения владельца, см. `2026-10-10_owner_lv2_session_theme_migration_commands.md`).
- Текст поверх картинок и арта (визитка, награды): иллюстрации, цвет задаёт арт; для них есть `mediaInk` (≥ 7 на подложке `deepBase`).
- Полупрозрачные плашки (`hairlineSoft`, `*Soft`) считаются отдельно: поверх них стоит основной текст темы, его пары проверены выше.
