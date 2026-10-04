# Task packet: сторожа тем под темы 2.0

Governance-ID: TG-D7A439D6A799
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0» (контур: constants/*theme*, экран «Темы», ползунок, градиенты, сторожа тем — docs/phraseman-2.0/LANES.md)
Related epic/enabler: docs/work/tasks/2026-10-04_theme_intensity_slider.md

## Outcome

Два сторожа тем снова зелёные и сторожат то, что действует СЕЙЧАС, ничего не ослабив:
- `tests/sage_porcelain_picker_contract.test.ts` — 4 проверки искали код, удалённый решениями владельца 30.09 («ТЕМЫ ВСЕ ФРИ», примерка убрана, Нефрит снят).
- `tests/legacy_theme_retirement_compatibility.test.ts` — написан на `node:test`, а запускается jest: «Your test suite must contain at least one test», т.е. НЕ выполнялся вообще.

## Scope

In scope: только эти два файла тестов + этот пакет.
Out of scope: код экранов, ThemeContext, сервер, макеты (контур координатора: «НЕ ТРОГАТЬ»).

## Architecture

No architecture change — тесты. Разбор каждой проверки:

| Проверка | Статус | Что делаю |
|---|---|---|
| 13 тонированных тем, графит первым, полярная…морская | действует | оставляю |
| «Plus на остальных» | отменено 30.09 (все темы бесплатны) | заменяю обратной: в выборе тем нет Plus / пейвола / замка |
| строки красятся `makeLiquidGlassTheme(id, DARK)` / `palette.cardGradient` | отменено (кружок по формуле `themeSwatchSpec`) | заменяю: строка рисует `<ThemeSwatch id={option.mode}` (настоящая формула, не ручной дубль) |
| экран читает `liquidGlassTokens(liquidGlassThemeId)`; нет толстых обводок; нет `adjustsFontSizeToFit` | действует | оставляю |
| примерка по тапу + пейвол темы | отменено 30.09 (тап = применить сразу, бесплатно) | заменяю: тап вызывает `setLiquidGlassThemeId(mode)` сразу, превью темы и интенсивности чистятся при уходе |
| ачивка `profile_theme_set` после смены темы | действует | оставляю |
| имя «Нефрит» в настройках | Нефрит снят | заменяю: настройки берут имя из общего словаря `themeDisplayName` без своих копий; у каждой из 23 тем есть имя на 9 языках |
| legacy-сторож (весь файл) | не выполнялся | перевожу на jest `describe/it/expect` один-в-один; строку `makeLiquidGlassTheme(liquidGlassThemeId, DARK)` — под текущую сигнатуру с вариантом |
| новое | — | градиентные темы берутся из одного конфига (`LIQUID_GLASS_GRADIENT_THEME_IDS.map`) |

## Security and privacy

Не применимо: тесты.

## Technical debt

- Pay now: мёртвый (не выполнявшийся) сторож legacy переведён на jest.

## Verification

`npm run test:one -- tests/sage_porcelain_picker_contract.test.ts tests/legacy_theme_retirement_compatibility.test.ts` — по тексту вывода: все проверки выполнены и зелёные; для legacy — что тестов > 0.

## Rollback

`git revert` коммита — вернутся прежние (красные) версии тестов. Код приложения не затронут.
