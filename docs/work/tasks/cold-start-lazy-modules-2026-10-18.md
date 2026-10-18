# Task packet: холодный старт (б) — ленивые модули данных и тяжёлые зависимости корня

Governance-ID: TG-914C8564835A
Status: Cancelled (координатор 18.10: задача снята, правок нет)
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: координатор 18.10, разбор холодного старта; замер [COLD-START] layout.module_eval (импорты корня ≈ 0,9 с dev, 2916 модулей)

## Outcome

Модули, не нужные первому кадру Главной, не вычисляются при старте: (1) app/lesson_words, app/achievements, app/paywall_copy, app/ai_dialog_scenarios — ленивый доступ в местах, через которые они попадают в граф корня; (2) app/user_notifications и hooks/use_community_tab_dot — разобрать, что тянут (≈100 мс с деревом), тяжёлое в ленивое. Мера: [COLD-START] module_imports и self_top до/после.

## Scope

In scope: места импорта этих модулей из графа корня (находятся статическим обходом от index.js), сами модули — только если нужно разделить лёгкую и тяжёлую части.

Out of scope: app/(tabs)/lessons.tsx и Learning V2 (Codex); шаги входа/аккаунта (Авторизация).

## Architecture

No architecture change: статический import → ленивый require/import в функции, которая реально нужна позже; поведение и данные прежние.

## Security and privacy

Не затрагивает: порядок загрузки модулей.

## Technical debt

- Pay now: данные уроков/достижений/диалогов/пейвола в графе старта.

## Verification

Статический граф (кратчайший путь от index.js) до/после; тесты затронутых модулей; [COLD-START] module_imports на эмуляторе.

## Rollback

`git revert` по коммиту на каждый модуль.
