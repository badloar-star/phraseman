# Task packet: DEV_LINKS_R1 — перегенерация paywalls-024/025 и profile-022/023 под saveOffer (Темы 8c7499912, 13.10)

Governance-ID: TG-BACEB78E8AD5
Status: Done — 4 строки с saveOffer, wait:2000; сторож 4/4
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Строки paywalls-024, paywalls-025, profile-022 и profile-023 в `docs/phraseman-2.0/DEV_LINKS_R1.md` открываются с `&saveOffer=progress|support`, с шагом `wait:2000`, без `offerProgress`. Источник — правка Тем в `scripts/dev_links_r1_steps_errfix.py` (8c7499912), фикстура Ядра 92c6d2206.

## Scope

In scope: перегенерация и перенос ровно этих четырёх строк поверх HEAD.
Out of scope: остальные строки DEV_LINKS_R1 (их возможный дрейф не переношу) и скрипты генератора.

## Architecture

Обычный конвейер:
1. `dev_links_r1_generate.py`;
2. копия результата в scratchpad;
3. восстановление HEAD-версии;
4. `apply_rows.py` по четырём id.

## Security and privacy

Только dev-ссылки. `saveOffer` — подмена в памяти, без записи в Firestore.

## Technical debt

- Генератор переписывает и `DEV_LINKS_R1_BINDINGS.md` — это производный файл, в коммит не беру.

## Verification

- diff — только эти 4 строки, в каждой `saveOffer=`;
- сторож `dev_links_r1_prod_write_guard` зелёный.

## Rollback

`git revert` коммита.
