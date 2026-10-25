# Task packet: пейвол М — правки по замеру Тем (график формой, шапка через legibleOn)

Governance-ID: TG-D8BB937C67E5
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 25.10 по замеру Тем d987464f4)

## Outcome

Замер 174 сочетаний тем (docs/work/paywall-m-theme-token-map-2026-10-25.md) нашёл два места. 1) G4: линии Plus и «бесплатно»
на графике в 66 светлых сочетаниях почти одного цвета — различить формой: Plus сплошная 3 px с точками и заливкой
accentGraphic 12 %, «бесплатно» пунктир 2 px (4/4) без точек и заливки, подписи на концах, легенда повторяет форму.
2) M1: надпись шапки «Ты на 3-м уроке» в grad_full_titanium тёмной — legibleOn(accentTextSafe → text, [подложка], 4.55).
Внести в «Вариант М» и в контекстные окна, ссылки артефактов сохранить.

## Scope

In scope: docs/design/v2-app/paywall-variant-m.html, docs/design/v2-app/paywall-m-context.html (+ их артефакты
AKuWv3RWqbu3a4Xe7EBj7q, 6dkmYjjEX3kCv2s1nuFT9B), этот пакет. Out of scope: код пейвола, constants/liquidGlassSurfaceRoles.ts.

## Architecture

No architecture change. В наборе макета — порт legibleOn (тот же алгоритм: смешение к text шагами 5 % до контраста 4.55
со всеми подложками), чтобы макет показывал ровно то правило, которое возьмёт код.

## Security and privacy

Макет, данных нет.

## Technical debt

- Accept temporarily: макет снят в graphite · светлая, где замена цвета шапки не меняется; titanium тёмная видна только в замере.

## Verification

Пересборка кадров real_compose, глазами: пунктир виден, подписи на концах, легенда с отрезками; контраст шапки ≥ 4.55 по скрипту.

## Rollback

Вернуть прежние страницы из git — приложение не меняется.
