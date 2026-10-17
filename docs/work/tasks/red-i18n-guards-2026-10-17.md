# Task packet: красные сторожа зоны переводчика — design-zone, «ты» в ru/uk, «Пять минут на английский?» (координатор 17.10)

Governance-ID: TG-9E818AE3D11D
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: таблица `docs/work/tasks/red-tests-head-2026-10-17.md`, № 9, 14, 15

## Outcome

Три сторожа зелёные на HEAD:
- `i18n_design_zone_ratchet`: новые тексты переведены на 9 языков, а служебные строки (журналы, ключи) помечены `guard-ok` с причиной;
- `informal_address_ru_uk_guard`: новые «вы / Нажмите» приведены к «ты»;
- `friend_study_invite_liquid_glass`: выяснено, куда делся «одобренный текст» «Пять минут на английский?». Если владелец одобрял именно его — вернуть.

## Scope

In scope: строки в файлах, которые называют сторожа.

Out of scope:
- логика;
- чужие незакоммиченные правки (коммит только своими хунками, правило 21:05);
- сами сторожа (не ослаблять).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Служебные литералы журналов в новых файлах — Accept temporarily: помечаю `guard-ok` с причиной, а не переношу в переводы (их не видит человек).

## Verification

`scan_i18n_design_zone`, `informal_address_ru_uk_guard`, `friend_study_invite_liquid_glass` — через slot.sh.

## Rollback

`git revert`.
