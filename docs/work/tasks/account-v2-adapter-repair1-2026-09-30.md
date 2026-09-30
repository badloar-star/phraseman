# Task packet: Account V2 — Firestore-адаптер, ремонт №1 (дешёвый лимит частоты, коды ошибок)

Governance-ID: TG-A09A44FE758E
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

Закрыть SECURITY HOLD ревью адаптера: (P1) отказ по лимиту стоит ≤1 чтения (сначала tx.get(meta/rate), только потом getAll плана), повторные отказы — 0 чтений (кэш blockedUntilMs в памяти инстанса), «ядовитый» пакет (детерминированная ошибка ядра) всё равно тратит лимит (коммитим только счётчик), суточный предел; (P2) классификация кодов: окончательные vs повторяемые, retryAfterMs для resource-exhausted, детерминированные accounts_v2_* и gRPC 3/9 не маппятся в unavailable; (P2) тест повтора транзакции ловит утечку записей между попытками; P3: getall_mismatch-тест по сообщению, age<0 окна, assert пути guard, переименовать коллекции в accounts_v2_ops/accounts_v2_entities, бюджет коммита с expireAt+meta/rate.

## Scope

In scope: functions/src/accounts_v2_adapter/* (+ при необходимости accounts_v2_commit_budget.test.ts). Out of scope: ядро accounts_v2_*.ts (кроме теста бюджета), index.ts, firestore.rules, deploy, commit, клиент.

## Architecture

Одна транзакция: tx.get(rate) → decide → (отказ: записать только счётчик/блок, выйти) → tx.getAll(plan) → applyBatch; детерминированная ошибка ядра ловится внутри транзакции → коммитится только счётчик → ошибка бросается после транзакции. Все чтения до записей сохраняется.

## Security and privacy

Логи без PII; коды ошибок без данных. Таблица кодов — в TEMP-контракт клиента.

## Technical debt

Contain: админский catch-all в firestore.rules — задача пакета правил.

## Verification

RED→GREEN; jest src/accounts_v2_; strict tsc; eslint; мутационные проверки теста повтора; независимое ревью до APPROVE.

## Rollback

Копия `.tmp_adapter_backup1/`.
