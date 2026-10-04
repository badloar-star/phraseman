# Task packet: реестр событий/оверлеев — 4 события без слушателя

Governance-ID: TG-5B7549060534
Status: In progress
Owner: сессия 1 · ЯДРО (красная находка Дизайна через координатора 04.10)

## Outcome

Сторож tests/app_events_overlay_registry.test.ts честный. По каждому событию — факт из истории git:
- pack_trial_gift_set / pack_trial_gift_consumed — слушатели жили только в app/shards_shop.tsx (магазин
  жемчуга, снят в 2.0, снимок efe19ae9d). Событие мёртвое → эмиты и типы убраны.
- cloud_profile_hydrated — единственный слушатель был в hooks/use-streak-freeze-active.ts, удалённом
  как хук без вызовов (14d724030). Сам сигнал — контракт загрузки (boot_cloud_restore_contract,
  startup_cloud_identity_recovery, nickname_guard_reconcile) → оставлен как emit-only с причиной.
- post_delete_identity_ready — слушателя не было никогда (f5a01076d); эмит в auth_provider (зона
  сессии 5), проверяется post_delete_fresh_identity_integration → emit-only с причиной, сессии 5 — к сведению.
Непрописанные ключи оверлеев — по выводу сторожа в окне jest.

## Scope

app/events.ts, app/flashcards/pack_trial_gift.ts (эмиты), tests/app_events_overlay_registry.test.ts.
Вне: auth_provider.ts (сессия 5).

## Architecture

Без изменения поведения: мёртвые эмиты никто не слушал.

## Security and privacy

Нет.

## Technical debt

Emit-only события с причиной — до решения, нужен ли экранам рефреш после облачного восстановления.

## Verification

Сторож реестра в окне jest ядра.

## Rollback

git revert.
