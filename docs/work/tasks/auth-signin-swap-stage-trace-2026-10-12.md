# Task packet: этапные логи хвоста подмены аккаунта при входе (вход в №2 за 55–61 с)

Governance-ID: TG-4C5A90B8FD72
Status: In progress
Owner: сессия «5 · АВТОРИЗАЦИЯ» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/evidence/parity/AUTH_signout_timing_2026-10-12.txt, INBOX §AUTH-0020/§AUTH-0040

## Outcome

По одному прогону Сверки видно, на каком этапе входа в аккаунт №2 уходят ~25 с внутри функции связки. Сейчас у всех строк `[AUTH-LINK-GOOGLE]` есть метка `t`, но между `swap merge_skipped_fallback` и `result merged_devices` нет ни одной строки: ожидание синхронизации (до 10 с), переходная блокировка, замок, стирание, установка id и `ensureAnonUser` сливаются в одно пятно. Успех — каждый этап печатает строку `[AUTH-LINK-GOOGLE] swap stage <имя> {tookMs, t}`.

## Scope

In scope: `app/auth_provider.ts`, ветка `merged_swap_to_remote` — только строки трассировки, плюс замер `hasMeaningfulLocalAccountData` и сетевого `ensureStableAuthLinkForStableIdDetailed`.
Out of scope: изменение порядка или поведения входа, стирания и слияния; предложения (а)/(б) из §AUTH-0040 (ждут решения).

## Architecture

No architecture change: добавляются только вызовы `identityTrace` вокруг уже существующих шагов; порядок, ожидания и ветвления те же.

## Security and privacy

В строки идут только длительности и уже применяемые `identityTag` (обезличенные метки). uid, имена, почта не печатаются. Новых данных не собирается.

## Technical debt

Contain: временная этапная трассировка. После диагноза строки этапов можно свернуть до одной сводной; строки ранних выходов и отказов остаются навсегда (правило «сперва логи»).

## Verification

`tests/auth_provider_behavior.test.ts`, `tests/aa_auth_double_tap_contract.test.ts` — точечно со слотом. Прогон Сверки: вход в №2, строки `[AUTH-LINK-GOOGLE]`, `[ACC-SWITCH-WIPE]`, `[AUTH-SWITCH-OFFER]`, `[ACC-SIGNOUT]`.

## Rollback

Откат коммита; данные и права не затрагиваются.
