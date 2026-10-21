# Task packet: решения владельца 21.10 по макетам — экзамен (№8), Plus на всех местах (№6), все типы заданий (№23)

Governance-ID: TG-92C40C557623
Status: In progress
Owner: сессия «3 · МАКЕТЫ»
Related epic/enabler: docs/work/OWNER_DECISIONS_2026-10-21.md №6, №8, №23

## Outcome

(№8) Эталон экзамена — только вариант 1 с правками владельца: «Эпизод 1…8» вместо «Занятие», 12 вопросов / сдать 10, провал → разбор ошибок и повтор через час, сердечки не тратит, Free — 1 энергия, Plus бесплатно, пропущенные эпизоды после сдачи «просто открыты» (без звёзд, не пройдены). (№6) Одна страница сравнения: каждый вариант Plus (A, B, C, D и комбинации) на всех местах, где виден человек — настройки/профиль, шапка, жители Пика, лига/рейтинг, друзья, наборы сообщества, чужая визитка; тёмная и светлая темы; переключатели варианта и темы. (№23) Макеты всех режимов заданий Learning V2 и интро: «как сейчас» рядом с «как предлагаем».

## Scope

In scope: docs/design/v2-app/chapter-exam.html, docs/design/v2-app/plus-visible.html (пересборка генераторами из эталонов profile.html, community.html, community-redesign.html, player-card-states.html, spire-tower-render.js, themes-gradient-light.html), новый docs/design/v2-app/learning-v2-tasks-review.html.

Out of scope: код приложения, контент курса (зона Codex), реестр сверки.

## Architecture

No architecture change: страницы собираются скриптами из принятых эталонов; светлая тема — слой .ph.lt из themes-gradient-light.html. Режимы заданий описаны по коду modules/learning-v2/modes/*.tsx и app/learning_v2_direct_session_player_v1.tsx (только чтение).

## Security and privacy

Имена вымышленные, учебные тексты — из курса. Показ Plus другим опирается на уже публичный isPremium; при реализации проверить политику конфиденциальности.

## Technical debt

- Accept temporarily: выбор варианта Plus — владелец по странице сравнения; №23 — предложения до решения владельца не эталон.

## Verification

Снимки playwright каждой страницы в обеих темах: ошибок нет, телефоны отрисованы, тексты не обрезаны.

## Rollback

git revert соответствующих коммитов.
