# Task packet: bootstrap_locale_contract — гейт сплеша после 8516191b5 (проверка, не прячет ли баг)

Governance-ID: TG-D2F59FBC8A9A
Status: In progress (координатор 05.10: «сначала проверь, не прячут ли старые красные настоящий баг»)
Owner: сессия 1 · ЯДРО

## Outcome

Сторож ждёт в nativeSplashCanHide «(effectiveShowOnboarding || isBanned || firstContentReady)»; с 8516191b5 (13.09) там
«(effectiveShowOnboarding || isBanned || (firstContentReady && homeScreenReady))». Проверка по коду: онбординг и бан
стоят в ИЛИ раньше homeScreenReady — человек на онбординге или забаненный снимает сплеш без ожидания Главной; потолок
homeScreenReady (HOME_SCREEN_READY_FALLBACK_MS, 21.09) тоже не взводится при онбординге/бане. JS-заставка
(startupSplashVisible) устроена так же. Бага первого запуска нет — обновляем сторожа под нынешнюю логику и закрепляем
главное: онбординг/бан не ждут готовности Главной; язык/пакеты/сеть по-прежнему запрещены в гейте.

## Scope

tests/bootstrap_locale_contract.test.ts — один тест.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

auth_recovery_boot_integration не трогаем: замена resumePendingAccountDeleteLocalExit на
ensureFreshPostDeletionIdentity('startup') пришла в f5a01076d («checkpoint: вся накопленная работа») без причины в
сообщении — зона Авторизации, решение владельца.

## Verification

test:one этого файла — 5/5.

## Rollback

git revert коммита.
