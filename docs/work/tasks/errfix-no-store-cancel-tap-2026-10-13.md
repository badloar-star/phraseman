# errfix: убрать тап «Перейти к отмене» из шагов manage-subscription (не уводить в магазин с аккаунтов владельца)

Governance-ID: TG-859F93B31BED
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора)

## Outcome
Из шагов paywalls-024, paywalls-025, profile-022 и profile-023 убран `tap:#manage-subscription-reasons-continue`. В `app/manage_subscription.tsx` этот тап вызывает `submitCancel`: если шаг удержания не положен (`resolveSaveOffer` = `none`), вызывается `openStoreCancel` → `Linking.openURL(getStoreManageUrl())` — выход в магазин управления подпиской. С аккаунтов владельца этого делать нельзя.

## Scope
Только `scripts/dev_links_r1_steps_errfix.py` (мой модуль): фильтр шагов четырёх записей. paywalls-023 и profile-020/021 этого тапа не содержали. Код приложения не меняется; DEV_LINKS пересоберёт Авторизация.

## Architecture
Идемпотентная правка: шаг убирается из списка, остальное (открыть отмену, выбрать причину) остаётся.

## Security and privacy
Робот больше не может случайно открыть системный экран отмены подписки у аккаунта владельца.

## Technical debt
Состояния «оверлей удержания» (paywalls-024 / profile-022: «Сохранить доступ или отменить», цифры 12/38) без этого тапа недостижимы шагами: нужна dev-подмена, открывающая шаг удержания напрямую (Ядро, например `saveOffer=progress`). До этого кадры этих строк покажут список причин.

## Verification
Цепочка модулей шагов грузится без исключений; в итоговых шагах четырёх строк нет `reasons-continue`.

## Rollback
git revert коммита.
