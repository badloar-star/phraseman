# Task packet: DEV_LINKS — доработки по разбору Макетов/Сверки (раунд 3), защита гостя, неизвестный контекст пейвола, фикстура ответа в уроке

Governance-ID: TG-3B08BE39E3A1
Governance-ID: TG-7B004AA473E7
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/DEV_LINKS_R1.md, app/dev_state_account_guard.ts, app/paywall_entry_contract.ts, app/flashcards/FlashcardDetailsBody.tsx

## Outcome

1. Защита гостя: тест на все 6 карточных фикстур (0 записей + лог refused), пометка «только гость» в документе, предупреждение/отказ робота без подтверждения гостя.
2. Ссылки пейвола с несуществующим контекстом `energy_empty` заменены на настоящий; проверено, что неизвестный контекст в стор-сборке не роняет экран (иначе — безопасный общий контекст + лог [PAYWALL-ENTRY] unknown_context).
3. Пересмотр шагов Диалогов (023/031/032/034/gap-017), cards-v2-030, cards-gap-016 (needs_rework), cards-gap-026.
4. RowDivider в FlashcardDetailsBody — токен разделителя вместо акцента (красный контрактный тест).
5. Новая dev-фикстура `lesson_answer=wrong|right|wrong_all` для старых уроков (только память, одна точка подключения) — открывает кадры «Два режима энергии».

## Scope

In scope: `app/dev_state_account_guard.ts`/тесты, `scripts/parity_batch_shoot.mjs`, `scripts/dev_links_r1_steps.py` и генератор, `app/paywall_entry_contract.ts` (только если в проде бросает), `app/flashcards/FlashcardDetailsBody.tsx` (цвет разделителя), `app/dev_state_fixtures.ts` + новый `app/dev_lesson_answer.ts`, одна строка в экране старого урока (если файл свободен).
Out of scope: Learning V2 (Codex), файлы Ядра с чужими незакоммиченными правками, онбординг/аккаунт.

## Architecture

No architecture change: dev-фикстуры в памяти, в стор-сборке вырезаны; защита fail-closed; для пейвола — только мягкое поведение на неизвестный контекст, если сейчас он падает.

## Security and privacy

Внешняя ссылка phraseman://premium_modal?context=<мусор> не должна ронять экран. Фикстуры карточек не пишут на привязанных аккаунтах. Данные пользователей не собираются.

## Technical debt

Pay now: ссылки без доведения до кадра тратят время Макетов и Сверки.

## Verification

Тесты: guard (6 фикстур × linked), контракт пейвола (неизвестный контекст), accent-контракт, dev_state_fixtures, dev_links_r1_contract; срез типов.

## Rollback

Откат коммитов.
