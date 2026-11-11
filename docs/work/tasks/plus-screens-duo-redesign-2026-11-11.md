# Task packet: вкладка Plus и экран подключённой подписки в стиле пейвола «Два пути»

Governance-ID: TG-A6798A9F35D2
Status: In progress
Owner: сессия «редизайн вкладки Plus и подписки» (слово владельца 11.11)
Related epic/enabler: none

## Outcome

Человек без подписки видит вкладку с алмазом, а человек с Plus/Ultra — экран «Подписка» в том же оформлении, что новое окно оплаты:
знак и свечение уровня, кнопки-тарифы, карточка-пропуск. Эталон — `docs/work/mockups/plus-screens-duo-2026-11-11/index.html`
(владелец: «да, переносить», «в точности как на макете», затем «да, всё доделать» — сторожа и иконка вкладки).
Мера успеха — склейка «макет | экран» без отличий на телефоне.

## Scope

In scope:
- `components/plus-tab/PlusTabScreen.tsx`, `PlusTabBenefits.tsx`, новый `PlusTabCompareTable.tsx`; удаление неиспользуемого `PlusTabPlans.tsx`;
- `components/manage-subscription/ManageSubscriptionDuoView.tsx` (новый вид) и его подключение в `app/manage_subscription.tsx` — только разметка;
- экспорт блика `Sheen` из `components/paywall/duo/PaywallDuoPlans.tsx`;
- иконка вкладки Plus: необязательные поля `capGradient` / `capInk` у пункта общей панели (`components/v2/V2TabBar.tsx`,
  `constants/mainTabs.ts`, проброс в `app/(tabs)/_layout.tsx` и `components/packs/CommunityRootTabs.tsx`);
- сторожа: `tests/plus_screens_duo_2026_11_11.test.ts`, `tests/plus_tab_plans_2026_11_05.test.ts`,
  `tests/manage_subscription_benefit_icons.test.ts`, стенды `tests/manage_subscription_liquid_glass_source_contract.test.mjs` и
  `tests/manage_subscription_overlays_liquid_glass.test.mjs` (раскрывают настоящий вид через `tests/helpers/manage_subscription_duo_view.mjs`).

Out of scope:
- логика покупки, восстановления, отмены, определение уровня и доступа — не меняются;
- перепин хешей платёжного кода (`handleRestore`, эффект загрузки) и `components/DuoPressable.tsx` в двух стендах: это правки других
  сессий (U23 и др.), сверять их по диффу должна сессия-автор.

## Architecture

No architecture change: экраны по-прежнему получают данные из `usePaywallPurchase` и из состояния `app/manage_subscription.tsx`.
Меняется только слой отображения: вкладка и экран подписки переиспользуют готовые части пейвола (`PaywallDuoHero`, `PaywallDuoGlow`,
`PaywallDuoPlans`, `Sheen`). Новый вид подписки — чистый компонент без своего состояния и без сети: всё приходит свойствами,
включая масштаб шрифта из настройки «Размер текста».
Панель вкладок: у пункта появились два необязательных поля; без них поведение и вид прежние (остальные вкладки не затронуты).
Инвариант: тексты кнопки вкладки, строка автопродления и ряд ссылок (замок владельца 05.11, требования сторов) не меняются.

## Security and privacy

Не затрагивается: новых данных, разрешений, сторонних сервисов и сетевых вызовов нет; авторизация и платёжные вызовы не меняются.
Обработчики покупки/восстановления/отмены передаются в вид как есть.

## Technical debt

- Pay now: неиспользуемый `PlusTabPlans.tsx` удалён вместе с обновлением его сторожа.
- Pay now: стенды экрана подписки раскрывают настоящий вид, а не муляж.
- Contain: цвета градиента вкладки продублированы в `constants/mainTabs.ts` (чтобы список вкладок не тянул модуль пейвола на старте);
  равенство с `DUO_TIER_COLORS.ultra` держит `tests/plus_screens_duo_2026_11_11.test.ts`.
- Accept temporarily: плашка вкладки всегда в цвете Ultra, даже когда на экране выбран Plus — панель не знает выбранный тариф.
  Владелец решения — владелец продукта; потолок влияния — только цвет плашки.
- Accept temporarily: светлая тема сделана по правилам пейвола (акценты цветом текста), отдельного макета светлой темы нет.

## Verification

- `npm run test:one -- tests/plus_screens_duo_2026_11_11.test.ts tests/plus_tab_plans_2026_11_05.test.ts tests/manage_subscription_benefit_icons.test.ts` — зелёные;
- `node --test tests/manage_subscription_liquid_glass_source_contract.test.mjs` — 7 из 8 (красный — чужой перепин хешей оплаты);
- `node --test tests/manage_subscription_overlays_liquid_glass.test.mjs` — 11 из 12 (красный — чужой хеш `DuoPressable.tsx`);
- замки 05.11: `plus_tab_cta_approved`, `owner_locks_plus_tab_disclosure`, `plus_tab_copy` — зелёные;
- сторожа панели вкладок (`tabbar_*`, `fc_navigation_visual_contract`, `home_chrome_no_outlines`) — зелёные;
- `npm run typecheck` — без ошибок в изменённых файлах;
- вручную на телефоне: вкладка (Ultra ↔ Plus, загрузка цен, покупка, восстановление, плашка в панели), подписка (год, месяц,
  разовая покупка, восстановление занято, переход на год, три размера текста) — склейка с макетом в `docs/phraseman-2.0/evidence/parity/`.

## Rollback

Откат одним `git revert` коммитов задачи: данные пользователя и права доступа не затрагиваются, миграций нет.
