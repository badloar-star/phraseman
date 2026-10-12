# Task packet: пейвол онбординга — stale на том же аккаунте не оставляет человека на пейволе (третье ревью 0d76a9528, 🟡1)

Governance-ID: TG-B3EC162D9823
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

onboardingFinishFailureAction решает по факту смены аккаунта, а не по статусу обёртки: stale на ТОМ ЖЕ аккаунте (замок перехода не взят
за 1,5 с) → emit_completed (выход дальше по сценарию, Plus уже включён). Аккаунт сменился → skip, как раньше.

## Scope

In scope: app/paywall_purchase_failure.ts (одна функция), таблица-тест в tests/paywall_purchase_failure_ui_contract.test.ts.
Out of scope: app/paywall_purchase.ts — пункты (2) текст not_applied на том же аккаунте и (3) .catch у выбора в диалоге ждут коммита
незакоммиченной правки Ядра в этом файле (замок покупки, refillToMax(lease)). EnergyContext/refillToMax не трогаются.

## Architecture

Чистая функция; вызовы в покупке и восстановлении не меняются (уже передают accountCurrent: isOperationAccountCurrent()).

## Security and privacy

Не затрагивает данные и деньги: Plus уже применён до этой ветки; меняется только выход с экрана.

## Technical debt

- Contain: нет.

## Verification

paywall_purchase_failure_ui_contract 37/37: строки таблицы stale+тот же аккаунт → emit_completed, сменился → skip.

## Rollback

Откат коммита.
