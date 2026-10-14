# Task packet: 🔴 «Получить Plus» в окне «Недостаточно энергии» не открывает пейвол (Диалоги, Learning V2, Карточки) — координатор 14.10, первый приоритет

Governance-ID: TG-09364CD09966
Governance-ID: TG-28E85E1F18BC
Governance-ID: TG-FBD68E194BE0
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Факт (журнал Сверки 14.10 19:43 и 19:44): энергия 0 → Диалоги → «Начать диалог» → окно «Недостаточно энергии» → «Получить Plus». Окно закрывается, человек на /ai_dialog_home, пейвола нет:
- в журнале только `[NAV-BACK] decision leaving=/dialogue_v2_briefing chosen=/ai_dialog_home method=dismiss_to`;
- ни одного `[PAYWALL-OPEN]`.

Причина (код):
- `components/NoEnergyModal.tsx` откладывает `router.push('/premium_modal')` до снятия окна (`pendingPremiumContextRef`, эффект по `visible=false`, на iOS — `onDismiss`) и вызывает `onBeforeOpenPremium ?? onClose`.
- Диалоги (`app/dialogue_v2_briefing.tsx:387`) не задают `onBeforeOpenPremium`, а `onClose` уводит назад.
- Экран размонтируется вместе с окном, очистка эффекта отменяет таймер — отложенное открытие теряется.

Тот же класс:
- занятие Learning V2 (`onClose` → `/(tabs)/lessons`);
- Карточки: блиц, вспоминание, говорение (`onClose={leave}`).

Работает только урок 1 (свой `onBeforeOpenPremium`).

Починка — одно правило в самом окне: если окно размонтировалось с неотправленным открытием пейвола, пейвол всё равно открывается (глобальный `router` expo-router, после ухода экрана). Плюс постоянный журнал `[NO-ENERGY-PLUS]`: тап, обработчик, каким путём ушло открытие, ранние выходы.

Диалоги дополнительно получают `onBeforeOpenPremium`: человек остаётся на брифинге и после покупки сразу начинает диалог.

## Scope

In scope:
- `components/NoEnergyModal.tsx` (страховка при размонтировании + журнал);
- `app/dialogue_v2_briefing.tsx` (одна строка `onBeforeOpenPremium`);
- сторож `tests/no_energy_plus_opens_paywall_contract.test.ts` на каждый вход «энергия → Plus».

Out of scope: внешний вид окна, тексты, пейвол.

## Architecture

`useEffect` с пустыми зависимостями в NoEnergyModal: очистка при размонтировании берёт `pendingPremiumContextRef`. Если открытие не ушло — `setTimeout(360)` → глобальный `router.push` (тот же маршрут и параметры).

Двойного открытия нет: `flushPremiumPush` очищает ссылку до push, страховка проверяет её же.

## Security and privacy

Без данных пользователя; в журнале — контекст пейвола и имя пути.

## Technical debt

- Learning V2 и Карточки после Plus открывают пейвол поверх экрана, куда их увёл `onClose` («Уроки» / хаб Карточек), а не поверх самого занятия. Деньги не теряются; возврат на занятие — отдельной задачей при желании.

## Verification

- Сторож:
  - в окне есть страховка при размонтировании и журнал;
  - каждый вход «энергия → Plus», где `onClose` уводит с экрана (Диалоги, Learning V2, три сессии Карточек), покрыт страховкой или своим `onBeforeOpenPremium`.
- Сверка: Диалоги → Plus ×3, Карточки, Learning V2.

## Rollback

`git revert` коммита.
