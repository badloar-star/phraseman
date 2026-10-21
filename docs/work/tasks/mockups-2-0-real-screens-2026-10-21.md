# Task packet: макеты 21.10 в настоящем дизайне 2.0 — Plus (№6), экзамен (№8), все типы заданий Learning V2 (№23)

Governance-ID: TG-A48B5CF50049
Status: In progress
Owner: сессия «3 · МАКЕТЫ»
Related epic/enabler: docs/work/OWNER_DECISIONS_2026-10-21.md №6, №8, №23

## Outcome

Владелец видит варианты ровно как экраны приложения 2.0 (kit.css/kit.js: телефоны, шрифты, токены, плашки, таббар и сейф-зоны эталонов), а не концепт-картинки: (№6) Plus заметно — 4 варианта на настоящих экранах «Настройки» (profile.html), «Пик» (рендер башни spire-tower-render.js) и «Наборы» (плашка community-redesign); (№8) экзамен главы — 2 варианта на карте V2 (стили learning-v2-icons.html) с числами из реестра (12 вопросов, порог 10/12, из занятий 1–7); (№23) все режимы заданий Learning V2 и интро — «как сейчас» рядом с «как предлагаем», с реальными текстами курса и разделением «что сделать» / «ситуация».

## Scope

In scope: docs/design/v2-app/plus-visible.html, docs/design/v2-app/chapter-exam.html (пересборка), новый docs/design/v2-app/learning-v2-tasks-review.html; публикация артефактами.

Out of scope: код приложения и контент курса (правило захода 21.10; файлы Codex не трогаем), реестр сверки.

## Architecture

No architecture change: макеты подключают общие kit.css/kit.js/extension.css и стили эталонов-источников (вырезаются скриптом из profile.html, community-redesign.html, learning-v2-icons.html, learning-v2.html), рендер башни spire-tower-render.js, шрифт assets/Ionicons.ttf.

## Security and privacy

Имена и цифры вымышленные или из учебного контента. Показ Plus другим опирается на уже публичный isPremium — при реализации проверить политику конфиденциальности.

## Technical debt

- Accept temporarily: выбор вариантов — владелец через координатора; до выбора макеты не эталон.

## Verification

Снимки playwright: ошибок на странице нет, все телефоны отрисованы, тексты не обрезаны; сравнение «как сейчас» с текущим эталоном learning-v2.html и кодом режимов.

## Rollback

git revert соответствующих коммитов.
