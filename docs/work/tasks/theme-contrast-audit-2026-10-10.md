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

На границе порога (запас ≤ 0.1, смотреть при любой правке формул): `good / плашка` в светлой (4.50, lavender, шаг 0.9), `bad / плашка` в светлой (4.50, taupe, 0.75) и в тёмной (4.51, grad_ice, 0.9), `ctaInk / cta` и `accentInk / accent` в светлой (4.56, grad_lilac, 0.6).

## Что не покрыто

- Цвета, зашитые прямо в экранах (остаток храповика цветов, `config/theme-hardcoded-colors-baseline.json`): там контраст зависит от экрана, а не от темы. Главный остаток — старые экраны сессии Learning V2 (кодмод ждёт решения владельца, см. `2026-10-10_owner_lv2_session_theme_migration_commands.md`).
- Текст поверх картинок и арта (визитка, награды): иллюстрации, цвет задаёт арт; для них есть `mediaInk` (≥ 7 на подложке `deepBase`).
- Полупрозрачные плашки (`hairlineSoft`, `*Soft`) считаются отдельно: поверх них стоит основной текст темы, его пары проверены выше.
