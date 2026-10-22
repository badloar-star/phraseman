# Task packet: тень плит заданий в светлой теме — из токена темы, а не сине-фиолетовая

Governance-ID: TG-0EA83A3A90B6
Governance-ID: TG-1827C23EB261
Status: Готово к коммиту
Owner: 2 · ДИЗАЙН (координатор 22.10: тень rgba(51,51,87,.30) сине-фиолетовая, мимо темы → g.dropShadow, закон «цвета строго цвета и оттенки текущей темы»)
Related epic/enabler: перенос заданий №23 (tasks-23-theme-tokens-2026-10-22.md, п. 5)

## Outcome

Тень плит заданий в светлой теме берёт цвет из g.dropShadow текущей темы; белая кромка сверху и тёмная тень не меняются. Мера успеха: в светлой теме тень тонируется темой, а не фиксированным фиолетовым.

## Scope

In scope: components/learning-v2/learning_v2_task_theme_tokens.ts (тень светлой темы), сторожевой тест tests/learning_v2_task_body_proposed_2026_10_22.test.ts.
Out of scope: тень шторки экзамена (чёрная в обеих темах по эталону), тёмная тень.

## Architecture

Константа LIGHT_SHADOW заменена функцией lightShadow(tint), токены собираются из g (кэш по объекту g сохранён); g.dropShadow — существующий токен роли поверхности (constants/liquidGlassSurfaceRoles.ts).

## Security and privacy

Не затрагивается: только цвет тени.

## Technical debt

- Нет нового долга: фиксированный цвет заменён токеном темы; чёрная тень тёмной темы и шторки экзамена остаются под пометкой theme-exempt как в эталоне.

## Verification

Точечный прогон сторожевого теста tests/learning_v2_task_body_proposed_2026_10_22.test.ts через светофор: 19 из 19 прошли.

## Rollback

Откат коммита возвращает прежний цвет тени.
