# Task packet: замок трёх эталонов, утверждённых владельцем 21.10

Governance-ID: TG-A493F9AA051C
Status: In progress
Owner: сессия «3 · МАКЕТЫ»
Related epic/enabler: docs/work/OWNER_DECISIONS_2026-10-21.md — «Найди пары» вариант 2, Пик «Собери перевод» вариант A, эталон кольца Plus

## Outcome

Три утверждённых эталона зафиксированы так же, как прочие (packs-simple, mistakes-panel, cards): файл SHA-256 `docs/design/v2-app/approved-2026-10-21.lock.json`, скрипт пересчёта `scripts/approved_2026_10_21_lock_update.mjs`, тест-сторож `tests/approved_2026_10_21_locked.test.mjs`, записка `docs/design/v2-app/APPROVED_2026-10-21_LOCKED.md`. Любая правка эталона без слова владельца роняет тест.

## Scope

In scope: четыре новых файла выше. Эталоны speed-match-long-pairs.html, peak-phrase-builder.html, plus-ring-etalon.html не меняются.

Out of scope: код приложения, перенос эталонов в приложение, прочие замки.

## Architecture

No architecture change: копия существующего образца packs_simple_lock_update.mjs + packs_simple_locked.test.mjs (node:test, хэш с нормализацией переводов строк).

## Security and privacy

Нет данных пользователей; только хэши файлов макетов.

## Technical debt

- Accept temporarily: отдельный замок на дату утверждения, а не общий реестр замков — как у остальных.

## Verification

`node --test tests/approved_2026_10_21_locked.test.mjs` — 3 из 3 зелёные; порча копии файла роняет тест (проверено на временной копии).

## Rollback

git revert коммита.
