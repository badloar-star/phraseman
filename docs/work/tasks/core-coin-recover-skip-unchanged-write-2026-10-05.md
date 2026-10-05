# Task packet: шаг К1 — восстановление кошелька не перезаписывает неизменённые проекцию и outbox (деньги)

Governance-ID: TG-D15247B7BFE4
Status: In progress (ОК координатора 05.10; перед коммитом ревью opus)
Owner: сессия 1 · ЯДРО

## Outcome

Пакет 04:26: multi_set 0,8–0,86 с на каждом проходе recoverProjection, проходов на старте до трёх — проекция и
outbox перезаписывались, даже когда не менялись. К1: пропуск записи ТОЛЬКО при байтовом совпадении нового JSON с
прочитанным под тем же storage-замком значением.

## Scope

app/level_spin_star_grants.ts (блок writes в recoverProjection); тесты: новый
coin_recover_skip_unchanged_write.test.ts; в coin_divergence_cold_start триггер «снимок поднялся между observe и
publish» смотрит на запись проекции ИЛИ outbox (окно то же).

## Architecture

Сравнение строк JSON.stringify(projection/pending) с projectionRaw/outboxRaw, прочитанными под тем же
withStorageLock; журналы практики и подготовленные операции пишутся как раньше; multiSet пропускается, если писать
нечего.

## Security and privacy

Деньги: запись идентичного значения — no-op; при любом отличии запись как раньше. Без деплоя.

## Technical debt

Нет.

## Verification

Тесты кошелька (101); ревью opus; замер 05:26.

## Rollback

git revert коммита.
