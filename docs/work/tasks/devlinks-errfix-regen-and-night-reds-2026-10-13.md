# Task packet: перегенерация DEV_LINKS_R1 после errfix 4f838ac02 + разбор красных групп ночной регрессии

Governance-ID: TG-8C1A5E63748C
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10)

## Outcome

1. DEV_LINKS_R1.md: строки errfix (cards-081, cards-section-046, cards-v2-037, spire-004/005/014/015) — по генератору;
   прочие строки, которые меняются из-за чужих незакоммиченных правок (visual_parity.json и др.), не коммитятся.
2. Красные группы ночной регрессии (G18 dev_fc_lang_state, dev_coin_rank; G23 en_readiness_dictionaries_contract и
   следующие): причина, коммит, зона → координатору; свои — чинить.

## Scope

In scope: DEV_LINKS_R1.md (только строки errfix), тесты/код своей зоны при красном от моего коммита.
Out of scope: чужие зоны — только отчёт.

## Architecture

Сборка файла: HEAD-версия + замена строк по id (скрипт в scratchpad).

## Security and privacy

Сторож prod_write_guard по ссылкам; данных не добавляем.

## Technical debt

- Contain: нет.

## Verification

node --test tests/dev_links_r1_prod_write_guard.test.mjs; numstat = только строки errfix; точечные тесты для своих правок.

## Rollback

git revert соответствующего коммита.
