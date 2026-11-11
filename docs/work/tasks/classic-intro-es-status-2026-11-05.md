# Task packet: статус интро es 1–4 и синхронизация индекса

Governance-ID: TG-05517710BCC8
Status: In progress
Owner: сессия «Темы» (интро классики)
Related epic/enabler: TG-6264B42C1D88 (интро es 1–4), TG-19A392108D9B (статус сессии)

## Outcome

Зафиксировать в статус-файле коммит интро es 1–4 (`6c2c81ef8`) и исправление оверрайда для `titleByLocale`/`textByLocale`. Пользователь выигрывает: очередь мастер-плана видна без догадок, а испанские уроки 1–4 без «Представь ситуацию» отражены в статусе.

## Scope

In scope: `docs/work/release/status/04_temy.md` (строка про интро es); синхронизация индекса git по путям интро и пакета (без коммитов).
Out of scope: новые правки текстов; уроки 5+; fr/de/it; uk-поля (Переводчик); правки чужих хунков в `scripts/classic_course_pack.mjs`.

## Architecture

Без изменения архитектуры: статус — текстовый файл; индекс git — локальная служебная операция `git reset -q` по своим путям, рабочая копия не меняется.

## Security and privacy

Не применимо: текстовый статус и служебные операции git; персональных данных и сети нет.

## Technical debt

- Accept temporarily: uk-поля интро es 1–4 и остальные уроки/языки — владелец Переводчик и следующие пачки; срок — в очереди мастер-плана.

## Verification

- В HEAD `modules/classic-courses/es/intro.json` и `docs/work/classic_intro_overrides.json` совпадают с рабочей копией (`git diff HEAD --ignore-cr-at-eol` пусто).
- В статус-файле есть хеш `6c2c81ef8`.

## Rollback

Вернуть прежний текст статус-файла; индекс восстанавливается из HEAD.
