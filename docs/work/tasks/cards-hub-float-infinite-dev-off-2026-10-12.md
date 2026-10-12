# Task packet: хаб Карточек — вернуть бесконечное «парение» (приказ владельца 11.10) + dev-подмена animations=off

Governance-ID: TG-B34C307F479A
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по решению координатора (12.10)
Related epic/enabler: c112b0fea (конечное парение), tests/motion_allowlist_contract.test.mjs, app/dev_overlays_off.ts

## Outcome

1. В продукте «парение» стопки хаба снова бесконечное (`withRepeat(..., -1, true)`): оно возвращено «хабом утра» по приказу владельца 11.10, по коду крутится на UI-потоке и останавливается вне фокуса и в фоне. Лог [CARDS-HUB-ANIM] остаётся.
2. Для робота — dev-подмена `dev_state?animations=off|on`: только память процесса, в стор-сборке геттер всегда false, установка отклоняется (как overlays=off). Хаб при animations=off не запускает парение — стопка стоит, дерево интерфейса отдаётся, кадр совпадает с неподвижным макетом.
3. Ссылки хаба Карточек (HUB_FREE) получают `animations=off`.

## Scope

In scope: app/flashcards/CardsHubV2.tsx, CardsHubAnimProbe.tsx, новый app/dev_animations_off.ts, app/dev_state_fixtures.ts (параметр), scripts/dev_links_r1_steps.py, тесты (allowlist, сторож парения, сторож подмены), DEV_LINKS_R1.md.
Out of scope: другие экраны с анимациями.

## Architecture

No architecture change: модуль-флаг в памяти по образцу dev_overlays_off, одна подписка в хабе.

## Security and privacy

Данных не касается; в стор-сборке подмена недоступна.

## Technical debt

Pay now: нет способа остановить вечную анимацию для робота, не трогая продукт.

## Verification

Тесты: motion_allowlist_contract (вечный цикл снова разрешён), сторож хаба, сторож dev_animations_off (стор-сборка), срез типов.

## Rollback

Откат коммита.
