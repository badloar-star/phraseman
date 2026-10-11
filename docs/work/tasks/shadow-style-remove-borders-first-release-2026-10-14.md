# Стиль «Тень»: снять обводки контейнеров на экранах первого выпуска

Governance-ID: TG-07BCA1D47668
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора ночью 14.10, приказ владельца 12.10: стиль «Тень» без обводок)
Related epic/enabler: home-chrome (19d104523), shadow-style-tokens-2026-10-14.md

## Outcome
На экранах первого выпуска — Карточки (app/flashcards*, components/flashcards*), Диалоги (dialogue_v2_*), Шпиль (components/spire), Настройки (app/settings_*, components/settings), пейволы (components/paywall), энергия (NoEnergyModal) — у контейнеров нет обводок: рамки заменены тоном фона и малой внешней тенью. База сторожа `shadow_style_no_container_borders` (266) снижается только вниз. Пачками по разделу, один коммит на пачку.

## Scope
Только контейнеры (карточки, плашки, чипы, кнопки-плашки). Остаются: поля ввода (TextInput hairline), индикаторы (кольца верно/неверно, радио/чекбокс, трек переключателя, пунктир, граница внутри арта) — они помечаются `shadow-ok: <причина>` строго по смыслу. Не трогаю: онбординг и CleanOnboarding (заморожены), `FlashcardsHubScreen.tsx` (Макеты), файлы аккаунта и приватности (Авторизация), `home.tsx` (Ядро). Перед каждым файлом — git status и git log.

## Architecture
Плашка = заливка + `plateBoxShadow`/`nestedBoxShadow` из `components/v2/ShadowSurface.tsx`; рамка убирается вместе с `borderWidth`. Контейнер без `overflow: hidden`, если тень рисуется на нём самом (клип режет тень).

## Security and privacy
Не применимо.

## Technical debt
Часть мест может оказаться индикаторами, а не контейнерами — они помечаются `shadow-ok` с причиной, а не удаляются. Остаток вне первого выпуска (профиль, уроки, друзья и др.) — отдельные пачки.

## Verification
Ратчет `node tests/shadow_style_no_container_borders.test.mjs`, контракты разделов (node:test), точечные jest, кадры Сверки по разделам.

## Rollback
git revert коммита пачки.
