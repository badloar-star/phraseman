# Task packet: плитка «Месяц» в окне Plus — пробный из своего пакета

Governance-ID: TG-B42F45277386
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: владелец 18.10 через координатора — «почему на месяце написано БЕЗ ПРОБНОГО ПЕРИОДА? По-моему, пробный установлен и там, и там».

## Outcome

1. Плитка «Месяц» показывает пробный период своего месячного пакета, какой бы тариф ни был выбран.
2. Если у месячного пакета пробного нет, на плитке нет строки «Без пробного периода»: она путала владельца. Раскрытие условий под кнопкой не меняется (требование магазинов).
3. Журнал `[PAYWALL-TRIAL]` по каждому пакету (год, месяц): что пришло из магазина (introPrice, цена и период, freePhase Play, eligibility), итог (есть ли пробный, сколько дней, источник) и что написано на плитке. По нему видно, даёт ли магазин месяцу пробный период.

## Причина

`PaywallPlusScreen.tsx`: `monthlyTrialDays = pricesReady && p.selected === 'monthly' ? p.trialDays : null`. По умолчанию выбран год, поэтому у месяца всегда был `null`, и плитка писала `COPY.noTrial`. У хука не было отдельного пробного месяца: был только `trial` выбранного пакета и `yearlyTrial`.

## Scope

- `app/paywall_purchase.ts`: `monthlyTrial`, `monthlyTrialDays`, `monthlyTrialSource` по образцу `yearlyTrial`, плюс журнал `[PAYWALL-TRIAL]`.
- `app/paywall_trial_info.ts`: чистый помощник `describeTrialSource(pkg, eligibility)` — строка для журнала.
- `components/paywall/PaywallPlusScreen.tsx`: месяц берёт `p.monthlyTrialDays` без условия на выбор.
- `components/paywall/PaywallPlus.tsx`: строку «нет пробного» не рисуем. Внешний вид плиток не трогаем (координатор: стиль окна переделывается макетом).
- `tests/design_paywall_trial_truth_contract.test.ts`: сторож.

## Architecture

Источник пробного не меняется, это только магазин: introPrice плюс eligibility на iOS, defaultOption.freePhase на Play. Dev-превью (`_force_trial_ui`) как и раньше даёт N обоим пакетам только в dev-обходе.

## Security and privacy

Нет новых данных. В журнал попадают только id продукта и параметры фазы.

## Technical debt

`COPY.noTrial` остаётся в словаре без использования, на случай если макет владельца его вернёт. Владелец: Ядро.

## Verification

- Сторож `design_paywall_trial_truth_contract`, тесты `paywall_trial_info`, `paywall_store_promo_price_contract`, `paywall_ux_r1_contract`.
- Разбор файлов.

## Rollback

Ревертнуть коммит.
