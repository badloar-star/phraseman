# Токены «текст поверх заливки» и матрица кнопок «Максимум» по 23 темам

Governance-ID: TG-DFC24708F023
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора 01:58)
Related epic/enabler: theme-contrast-audit-2026-10-10.md; находка Сверки по каталогу наборов (светлая)

## Outcome

Ответ, есть ли во всех 23 темах токен «текст поверх заливки»; сторож и таблица «Максимум»: светлый текст кнопки поверх каждой точки градиента; список мест, где экраны берут старый `correctText` вместо токена, — Дизайну.

## Scope

In scope: новый тест `tests/theme_max_button_matrix.test.ts`, отчёт, запись в INBOX. Out of scope: правка экранов `app/flashcards/*` и `app/community_packs/*` (Дизайн), токены не меняются, если проверка зелёная.

## Architecture

Токены уже есть в каждой теме: `accentInk` (на `accent` и точках `accentGradient`), `ctaInk` (на `cta`). Тест только читает токены.

## Security and privacy

Не применимо.

## Technical debt

В экранах каталога наборов остался старый `t.correctText` (constants/theme.ts) на заливке `cta`.

## Verification

Точечный запуск набора по слоту светофора; чтение текста вывода.

## Rollback

`git revert` коммита.
