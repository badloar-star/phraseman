# mutedText как текст в Карточках 2.0 и Шпиле: ≥ 4,5 на плашках и фоне в светлых темах

Governance-ID: TG-6CC70B279708
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора: проверка тем на новых экранах Карточек 2.0 и Шпиля, светлая/тёмная и градиентные темы; срок 12.10)
Related epic/enabler: shadow-style-tokens-2026-10-14.md

## Outcome

Токен `mutedText` в светлом оформлении всех 23 тем держит ≥ 4,5:1 на самых тёмных поверхностях, где его рисуют текстом (фон `bg`/`bgTop`/`bgBottom`, `opaqueCard`/`opaqueControl`/`opaqueSheet`, низ плашки и выбранного «Тени»). Сейчас замер: на низе плашки 4,06 (`polar`, calm, шаг 1), на фоне 3,64 (`grad_jade`). В Карточках `mutedText` как цвет текста используется в ~20 местах (счётчики, номера, подписи 13 px). Тёмное оформление не меняется (≥ 6,37).

## Scope

In scope: `constants/liquidGlassThemePalette.ts` (доводка `mutedText` в светлом после сборки ролей), `constants/liquidGlassSurfaceRoles.ts` (общая функция `legibleOn`), тест. Out of scope: экраны Дизайна (их цвета не меняю), `secondary`/`text` (уже ≥ 4,5).

## Architecture

После сборки базовых токенов и ролей «Тени» в `liquidGlassTokens` светлый `mutedText` смешивается с `text` темы шагами по 5 %, пока контраст со всеми поверхностями не достигнет 4,55; иерархия (secondary темнее mutedText) проверяется тестом.

## Security and privacy

Не применимо.

## Technical debt

Другие приглушённые цвета (`textGhost` = `mutedText` в старой теме) наследуют доводку автоматически.

## Verification

Новый тест контраста `mutedText` по слоту; соседние наборы тем (поверхности, палитра, контраст, «Тень», нетекстовые).

## Rollback

`git revert` коммита.
