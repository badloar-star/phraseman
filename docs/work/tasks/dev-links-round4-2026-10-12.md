# Task packet: dev-фикстура coinRank, mood в подставном ходе, робот: пустые кадры, держатель загрузки пейвола, Настройки (promo/язык)

Governance-ID: TG-CEBBE60F7F0D
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/DEV_LINKS_R1.md, scripts/parity_batch_shoot.mjs, hooks/use_my_coin_rank.ts, app/dev_state_fixtures.ts

## Outcome

1. `dev_state?coinRank=N`: подмена ЗНАЧЕНИЯ хука useMyCoinRank только в памяти (без записи монет/ранга в хранилище и облако), чтобы у гостя открывались диалоги; ссылки Диалогов получают coinRank=6.
2. dev_dialog_mood применяется и в ветке подставного хода (dev_dialog_send), только в dev.
3. Робот: проверка «пустого кадра» (повторные снимки до 6 раз, ms_to_nonblank, статус blank_too_long, опция --burst-ms).
4. Держатель загрузки условий пейвола (_dev_state=loading_terms) и ссылки Настроек: plus по промокоду (settings-gap-004), шторка «Язык изучения» (settings-gap-019).

## Scope

In scope: тонкая точка подмены в хуке ранга (dev-геттер), `app/dev_state_fixtures.ts`, новый dev-модуль в памяти, `app/dialogue_v2_turn_coaching_client.ts` (ветка devSend), `scripts/parity_batch_shoot.mjs`, `scripts/dev_links_r1_steps.py`, тесты.
Out of scope: изменение порога ранга в продукте, запись ранга/монет, файлы с чужими незакоммиченными правками.

## Architecture

No architecture change: dev-подмена значения в памяти за `__DEV__ && !IS_STORE_RELEASE`, в стор-сборке геттер всегда «выключено».

## Security and privacy

Ранг/монеты синхронизируемы — фикстура их НЕ пишет, только подменяет возвращаемое значение хука в процессе; на уровне облака ничего не меняется.

## Technical debt

Pay now: без coinRank ни один кадр внутри диалога недостижим на госте.

## Verification

Юнит-тесты геттера (dev/стор), разбор параметра, робот на подставных PNG (пустой/непустой), срез типов.

## Rollback

Откат коммитов.
