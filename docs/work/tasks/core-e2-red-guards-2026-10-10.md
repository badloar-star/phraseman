# Task packet: E2 — красные сторожа manage_subscription_*, survey_unavailable, video_market_loader, settings_*

Governance-ID: TG-C7DD7985C593
Status: In progress (координатор 10.10, срез E2: «если сторожит снятый вид — переписать; если правда сломано — чинить»)
Owner: сессия 1 · ЯДРО

## Outcome

Каждый сторож разобран по причине:
- сторожит снятый вид / старую форму кода → обновить под текущее, не ослабляя;
- правда сломано → починить код.
manage_subscription_* (2 файла): код управления подпиской осознанно изменён в ebc1a860d (account-authority S2d,
withPurchaseFlow, перенос Plus после смены аккаунта). Тестовый стенд не знает нового импорта
./purchase_flow_activity и держит старые хэши. Добавляется заглушка (withPurchaseFlow выполняет операцию);
хэши обновляются ТОЛЬКО для файлов, изменённых этим коммитом, после чтения диффа.

## Scope

tests/manage_subscription_*.test.mjs, tests/survey_unavailable_*.test.mjs, tests/video_market_loader_error_contract.test.cjs,
tests/settings_*.test.mjs; код — только если найдена реальная поломка.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Хэш-сторожа будут падать при каждой осознанной правке — так задумано, но стенды обязаны знать новые импорты.

## Verification

node --test каждого сторожа: зелёный; при правке кода — синтаксис и затронутые сторожа.

## Rollback

git revert коммита.
