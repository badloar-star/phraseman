# Task packet: откат прерванного входа при загрузке не сбрасывает согласия

Governance-ID: TG-E7A6517729BD
Status: В работе (координатор 18.10 10:10: «откат не должен сбрасывать согласия»)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Если загрузочное восстановление откатывает прерванную передачу входа к гостю, это тот же человек — его согласие на
аналитику и принятие Условий не сбрасываются, экран согласия не всплывает. Обычный выход и смена аккаунта — как раньше.

## Факты

- resumeInternal (account_switch_quarantine) при откате передачи зовёт deps.wipeLocalData → стирание 'signout' →
  resetConsentsBeforeSignoutWipe + событие consent_regate_requested (журнал iPhone 08:46:17: consent_reset после отката).

## Scope

- cloud_sync.wipeLocalAccountData: опция `keepConsents` — без сброса согласий и без события экрана согласия; журнал
  [ACCOUNT-WIPE] … keepConsents.
- account_switch_quarantine: необязательная зависимость `wipeLocalDataForHandoffRollback`; ветка отката передачи берёт её.
- Обе сборки зависимостей (account_switch_quarantine runtime, auth_provider) дают её с keepConsents: true.
- Тесты.

## Architecture

Флаг только для отката передачи входа; смена аккаунта A→B (карантин) по-прежнему сбрасывает согласия.

## Security and privacy

Согласия того же человека сохраняются — это и есть его выбор.

## Technical debt

Довод входа вперёд — решение координатора.

## Verification

Адресные тесты через светофор.

## Rollback

`git revert <hash>`.
