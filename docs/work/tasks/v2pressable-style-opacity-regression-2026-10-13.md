# Task packet: V2Pressable затирал прозрачность из стиля — приглушение «недоступно» не работало (paywalls-013)

Governance-ID: TG-73029BF3EAEC
Status: In progress
Owner: Ядро (сессия 1)
Related: вердикт Макетов 13.10 paywalls-013 / paywalls-011; регрессия 6171a8134 (10.10, «нажатие кита»)

## Outcome

- components/v2/V2Pressable.tsx: внутренний слой ставил `[style, { opacity }]` — анимированная прозрачность нажатия (1)
  перекрывала `opacity` из стиля вызывающего. С 10.10 молча не гасли: × и «Восстановить» окна Plus во время оплаты,
  занятая кнопка итога Шпиля, использованные слова в сборке Шпиля, «Все» на подиуме без комнаты.
  Теперь прозрачность стиля умножается на прозрачность нажатия (нативный драйвер сохраняется).
- components/paywall/PaywallPlus.tsx: плашки «Год/Месяц» приглушаются, пока идёт оплата/восстановление (макет: всё
  приглушено до ответа магазина).
- Журнал [PAYWALL] окна Plus печатает payStarted/checkoutInFlight/ctaBusy.

## Scope

In scope: V2Pressable, плашки тарифов PaywallPlus, строка журнала PaywallPlusScreen, тест-контракт.
Out of scope: остальные дефекты списка Макетов (спиннер скелета тарифов, лента пробного периода, энергия Шпиля).

## Architecture

No architecture change.

## Security and privacy

Только вид кнопок; данные, сеть и платёжная логика не меняются.

## Technical debt

- Прозрачность в `style` V2Pressable теперь работает, но мерцание нажатия поверх приглушённой кнопки возможно только
  если она не `disabled` (Pressable не шлёт onPressIn для disabled) — отдельной работы не требует.

## Verification

Контракт-тест V2Pressable (прозрачность стиля доходит до слоя); babel-проверка; кадр dev `_dev_state=purchasing`.

## Rollback

Откат коммита.
