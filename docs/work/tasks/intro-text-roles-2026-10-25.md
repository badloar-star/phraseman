# Цвета текста вступления: английский / частицы / перевод — токены (без подключения к экрану)

Governance-ID: TG-38580D24DB16

## Outcome
Владелец 25.10 через координатора: во вступлениях занятий (app/learning_v2_session_intro.tsx) английский текст, русский перевод и грамматические частицы (is/are, a/the, -s, «A + is + B») — разные цвета во всех 29 темах; эталон — макет intro-text-colors.html (Макеты). Часть 4 · ТЕМЫ: токены трёх ролей (langText, particle, gloss) из палитры темы, контраст ≥ 4,5 на карточке вступления, проверка по всем темам. Подключение к экрану — после утверждения макета владельцем.

## Scope
In scope: `constants/liquidGlassIntroTextRoles.ts` (новый), экспорт `toContrast` в `constants/liquidGlassPaletteRoles.ts`, сторож `tests/intro_text_roles_contrast.test.ts`.
Out of scope: экран вступления, тексты курса, макет.

## Architecture
langText = текст темы, gloss = вторичный текст — оба доведены legibleOn до 4,55 на plateFillFrom/plateFillTo; particle = оттенок акцента темы с «Максимума» (у серых — оттенок контрола), насыщенность OKLCH 0,13, светлота подобрана toContrast до 4,55. Кэш по теме/варианту.

## Результат (29 тем × 2 оформления × 3 уровня)
| Роль | Худший контраст на карточке | Где |
|---|---|---|
| langText (английский) | 8,77 | dark/grad_full_olive/calm |
| particle (частицы) | 4,59 | light/sage/calm |
| gloss (перевод) | 4,75 | light/grad_ice/max |

Различимость: ΔE OKLab ≥ 0,069 попарно (минимум — light/eucalyptus/calm, перевод зелёно-серый), частицы всегда цветные (насыщенность ≥ 0,05).
Примеры (calm): ink тёмная #F9FAFE / #9899F4 / #C1C4CF; ink светлая #17181E / #5A56AA / #595A63; marine тёмная #F6FBFC / #00B8D9 / #B9C7C9; «Оливковая» светлая #181A20 / #566E00 / #55505B.

## Security and privacy
Не касается.

## Technical debt
Не подключено к экрану до утверждения макета.

## Verification
tests/intro_text_roles_contrast.test.ts — зелёный.

## Rollback
Откатить коммит.
