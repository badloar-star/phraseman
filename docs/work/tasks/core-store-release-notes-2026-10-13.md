# Task packet: черновик «Что нового» 2.0 для Google Play и App Store (9 языков)

Governance-ID: TG-C8D35BDB98B5
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: заказ координатора 13.10 (сторы 17.10), прежний текст STORE_WHATS_NEW.md (11.10)

## Outcome

`docs/phraseman-2.0/STORE_RELEASE_NOTES_2_0_DRAFT.md` — тексты по фактическому составу R1 на 9 языках интерфейса, каждый
≤500 знаков (Google Play), без цен и других платформ (App Store). Владелец утверждает утром; ничего не публикуется.

## Scope

In scope: только документ. Out of scope: публикация, окно «Что нового» в приложении (`components/release_notes_v2_copy.ts`).

## Architecture

No architecture change: документ.

## Security and privacy

Не касается: тексты маркетинга, без данных.

## Technical debt

- Accept temporarily: переводы vi/id/tr/pl/pt-BR носителем не проверены (как и остальные тексты приложения).

## Verification

Скрипт подсчёта знаков по каждому языку (≤500); сверка пунктов с решениями D129/D130, D164, D165 и коммитом 4b5162622 (Шпиль ru/uk).

## Rollback

Удалить документ.
