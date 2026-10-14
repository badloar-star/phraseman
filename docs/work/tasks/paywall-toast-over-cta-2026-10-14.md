# Task packet: тост ошибки пейвола лежит поверх кнопки «Начать…» (Макеты paywall-price #2, координатор 14.10)

Governance-ID: TG-DF2F901D8012
Status: Шаг 1 (журнал) готов черновиком; в код — после прогона №2 (правка app/components меняет сборку на эмуляторе посреди прогона)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

На пейволе при ошибке до checkout (`_dev_state=store_unreachable`, DEV_LINKS paywalls-012) `ActionToast` встаёт у низа экрана и закрывает кнопку покупки.

Гипотеза по коду, требует подтверждения журналом:
- `useGlobalBottomOverlayOffset()` вне вкладок = `max(insets.bottom, 12) + 8`;
- пейвол — экран стека со своим нижним доком (`PaywallPlusDock`: кнопка 58 + тихая строка + ссылки + `paddingBottom = max(inset, 16)`);
- о доке хост тоста не знает.

**Шаг 1 — журнал `[PAYWALL-TOAST]`** (dev):
- док: `dock layout y=… h=… windowH=… inset=…` (onLayout корня `PaywallPlusDock`);
- тост: `toast show path=… bottomOffset=… inset=… toastH=… type=…` (onLayout якоря `ActionToast` при показе).

Сверка открывает paywalls-012 и присылает строки. По ним видно: `bottomOffset` < высоты дока, значит тост в зоне кнопки.

**Шаг 2 — по фактам:** тост над доком, не поверх кнопки. Лёгкая резервация нижнего дока:
- экран с доком сообщает его высоту, пока смонтирован;
- `useGlobalBottomOverlayOffset` поднимает тост над доком;
- лог `[PAYWALL-TOAST] offset dock=… final=…`.

## Scope

In scope:
- `components/paywall/PaywallPlus.tsx` — onLayout дока и лог;
- `components/ActionToast.tsx` — лог при показе;
- шаг 2: `hooks/use-global-bottom-overlay-offset.ts` + новый `app/bottom_dock_reservation.ts`, регистрация из `PaywallPlusDock`.

Out of scope: тексты тоста, другие экраны (механизм общий, подключаем только пейвол), тост на вкладках.

## Architecture

- `bottom_dock_reservation`: модульное значение + подписка (`useSyncExternalStore`).
- Док регистрирует высоту при layout и снимает при размонтировании.
- Хук отступа: `max(обычный отступ, dockHeight + 8)`.
- Без нового глобального состояния React, без перерисовок вне хоста тоста.

## Security and privacy

Только вёрстка.

## Technical debt

- Другие экраны с нижним доком (покупки карточек, диалоги) могут иметь ту же проблему. Механизм общий — подключать по находкам.

## Verification

- Строки журнала до/после на paywalls-012.
- Кадр Сверки: тост над кнопкой, кнопка видна и нажимается.
- Тесты пейвола и тоста: `overlays_runtime_liquid_glass_source_contract`, наборы paywall.

## Rollback

`git revert` коммита.
