# Task packet — №36: одна каноническая башня Пика для всех макетов

Governance-ID: TG-D402D765D66C
Governance-ID (постановка): TG-E28530F45AD1

## Outcome
Приказ владельца через координатора 13.10: «ВСЕ БАШНИ ВО ВСЕХ МАКЕТАХ ДОЛЖНЫ ВЫГЛЯДЕТЬ ИМЕННО ТАК, КАК ОНИ В ПРИЛОЖЕНИИ».
Один рендер docs/design/v2-app/spire-tower-render.js — перенос 1:1 кода башни (SpireTowerSvg, SpireTowerFinial,
SpireTowerTextures, tower_skins, spire_tower_model, spire_tower_crown, useSpireScene, окно SpireTower) в SVG-строку для браузера.
Все наши макеты с башней переходят на него; Fable (моменты вовлечения) — тоже.

## Scope
- Новый файл spire-tower-render.js (API: SpireTowerRender.svg(o), SpireTowerRender.windowHtml(o), renderTower(el, o)).
- Перевод spire.html, spire-gaps-states.html, spire-leagues.html на рендер.
- Склейка «эмулятор | рендер» 12 лиг: docs/phraseman-2.0/evidence/tower_render_parity.png.
- Не трогаем: код приложения, engagement-moments-* (файлы Fable с его незакоммиченными правками), spire-leagues-archetypes.html (архив вариантов, не экран приложения).
- Попутно: tests/video_thumb_fallback.test.tsx под решение координатора «вариант а» (превью фикстуры — настоящие ролики, d2127130e).

## Architecture
Чистые функции, возвращают строку SVG/HTML. Все id градиентов с уникальным префиксом на вызов (в RN id живут внутри одного Svg,
в браузере — на всю страницу). Радиальные градиенты RN rx/ry → браузерный r (+ gradientTransform для эллипса маски «Итога недели»).
Маркер игрока — HTML-слой поверх SVG, как в коде (40 dp: свечение 64, кольцо, монета 34); прокрутка окна — spireWindowScrollY из кода.

## Security and privacy
Данных не касается.

## Technical debt
Рендер — копия логики кода: при правке башни в приложении править и рендер (файлы-источники перечислены в шапке рендера).

## Verification
Склейка 12 лиг с кадрами эмулятора (C:/Temp/claude/sv/spire_tiers_sheet.png, spire_dock/spirecheck-003.png); playwright без ошибок страниц.

## Rollback
git revert коммитов задачи.

## Status
In progress.
