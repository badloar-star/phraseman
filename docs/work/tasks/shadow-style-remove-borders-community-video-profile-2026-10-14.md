# Стиль «Тень»: снять обводки — Сообщество и друзья, Видео, профиль и достижения

Governance-ID: TG-5CAEB0338E21
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора, продолжение приказа владельца 12.10)
Related epic/enabler: shadow-style-remove-borders-first-release-2026-10-14.md

## Outcome
Следующие разделы после экранов первого выпуска: Сообщество и друзья (`app/(tabs)/community*`, `components/friends*`), Видео (`components/youtube*`), профиль и достижения (`components/profile-card`, `components/achievements`, `app/achievements_screen`). Обводки контейнеров сняты, база сторожа `shadow_style_no_container_borders` снижается только вниз (стартовая 229). Пачками, один коммит на пачку.

## Scope
Контейнеры (карточки, плашки, чипы, кнопки-плашки, шторки). Разделители — `RowDivider`. Индикаторы (кольца верно/неверно, радио, трек, пунктир, граница внутри арта) помечаются `shadow-ok: <причина>`; поля ввода (TextInput) не трогаю. Не трогаю: онбординг, файлы Авторизации (account*, auth*, privacy*), `home.tsx`. Перед каждым файлом — `git status`.

## Architecture
Плашка = тон заливки + `plateBoxShadow`/`nestedBoxShadow` (`components/v2/ShadowSurface.tsx`); рамка убирается вместе с `borderWidth`; разделители — `components/v2/RowDivider.tsx`.

## Security and privacy
Не применимо.

## Technical debt
Часть мест окажется индикаторами (кольцо аватара, значок уровня) и получит `shadow-ok`; макет-эталон vs «Тень без обводок» там, где макет рисует кромку, — вопрос координатору, не решение в коде.

## Verification
Ратчет `node tests/shadow_style_no_container_borders.test.mjs`, контракты затронутых разделов (node:test и точечный jest через слот), без полного tsc.

## Rollback
git revert коммита пачки.
