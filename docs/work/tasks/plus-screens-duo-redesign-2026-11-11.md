# Task packet: вкладка Plus и экран подключённой подписки в стиле пейвола «Два пути»

Governance-ID: TG-A6798A9F35D2
Status: In progress
Owner: сессия «редизайн вкладки Plus и подписки» (слово владельца 11.11)
Related epic/enabler: none

## Outcome

Человек без подписки видит вкладку с алмазом, а человек с Plus/Ultra — экран «Подписка» в том же оформлении, что новое окно оплаты:
знак и свечение уровня, кнопки-тарифы, карточка-пропуск. Эталон — `docs/work/mockups/plus-screens-duo-2026-11-11/index.html`
(владелец: «да, переносить», «в точности как на макете»). Мера успеха — склейка «макет | экран» без отличий на телефоне.

## Scope

In scope:
- `components/plus-tab/PlusTabScreen.tsx`, `PlusTabBenefits.tsx`, новый `PlusTabCompareTable.tsx`;
- `components/manage-subscription/ManageSubscriptionDuoView.tsx` (новый вид) и его подключение в `app/manage_subscription.tsx` — только разметка;
- экспорт блика `Sheen` из `components/paywall/duo/PaywallDuoPlans.tsx`;
- сторожа нового вида: `tests/plus_screens_duo_2026_11_11.test.ts`, правка `tests/manage_subscription_benefit_icons.test.ts`.

Out of scope:
- логика покупки, восстановления, отмены, определение уровня и доступа — не меняются;
- иконка вкладки в нижней панели (`app/(tabs)/_layout.tsx` правит другая сессия);
- сторожа `tests/plus_tab_plans_2026_11_05.test.ts`, `tests/manage_subscription_liquid_glass_source_contract.test.mjs`,
  `tests/manage_subscription_overlays_liquid_glass.test.mjs` — изменены другой сессией и красные по её незаконченной работе (U23).

## Architecture

No architecture change: экраны по-прежнему получают данные из `usePaywallPurchase` и из состояния `app/manage_subscription.tsx`.
Меняется только слой отображения: вкладка и экран подписки переиспользуют готовые части пейвола (`PaywallDuoHero`, `PaywallDuoGlow`,
`PaywallDuoPlans`, `Sheen`). Новый вид подписки — чистый компонент без своего состояния и без сети: всё приходит свойствами.
Инвариант: тексты кнопки вкладки, строка автопродления и ряд ссылок (замок владельца 05.11, требования сторов) не меняются.

## Security and privacy

Не затрагивается: новых данных, разрешений, сторонних сервисов и сетевых вызовов нет; авторизация и платёжные вызовы не меняются.
Обработчики покупки/восстановления/отмены передаются в вид как есть.

## Technical debt

- Contain: `components/plus-tab/PlusTabPlans.tsx` больше не используется экраном, но оставлен — его читает сторож
  `plus_tab_plans_2026_11_05`, занятый другой сессией. Выход: удалить файл вместе с обновлением сторожа, когда та сессия закоммитит.
- Contain: два контракта экрана подписки (`*_liquid_glass_*`) нужно перевести на новый вид (стенд должен раскрывать
  `ManageSubscriptionDuoView`). Выход: после коммита U23 той сессией; владелец — эта задача.
- Accept temporarily: светлая тема сделана по правилам пейвола (акценты цветом текста), отдельного макета светлой темы нет.
  Владелец решения — владелец продукта; потолок влияния — только внешний вид.

## Verification

- `npm run test:one -- tests/plus_screens_duo_2026_11_11.test.ts tests/manage_subscription_benefit_icons.test.ts` — зелёные;
- `tests/plus_tab_cta_approved_2026_11_05`, `owner_locks_plus_tab_disclosure_2026_11_05`, `plus_tab_copy_2026_11_05` — зелёные (замки 05.11 живы);
- `npm run typecheck` — без ошибок в изменённых файлах;
- вручную на телефоне: вкладка (Ultra ↔ Plus, загрузка цен, покупка, восстановление), подписка (год, месяц, разовая покупка,
  восстановление занято, переход на год) — склейка с макетом в `docs/phraseman-2.0/evidence/parity/`.

## Rollback

Откат одним `git revert` коммитов задачи: данные пользователя и права доступа не затрагиваются, миграций нет.
