# Task packet: «долго не входил → предложение купить → закрыл → всё приложение зависло» — трассировка [WINBACK-FREEZE] (координатор 14.10, 🔴 приоритет №1)

Governance-ID: TG-89BF9FCAA148
Status: Шаг 1 (журнал) — скрипт готов, в код сразу после прогона №2 (правка app/components меняет сборку посреди прогона)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Баг владельца на телефоне. Правило — сперва логи; чиним только по фактам.

**Что открывается после долгого отсутствия** (найдено по коду):
1. **winback** — `app/_layout.tsx` `checkWinbackOffer`: не Plus, 7+ дней без активности (`winback_last_active_at_v1`), в этом окне ещё не показывали → `globalRouter.push('/premium_modal', { context: 'winback' })`. Проверка на старте и на каждом возврате в приложение.
2. **intro_ended** — `checkIntroFullAccessEndedModal`: кончился вводный полный доступ → окно «72 часа закончились» (в очереди арбитра, `introFullAccessModalVisible`). Кнопка «продолжить» → `setIntroFullAccessModal(null)` и сразу `router.replace('/premium_modal', { context: 'intro_ended' })`.

Пейвол `premium_modal` — маршрут `presentation: 'transparentModal'` (`PAYWALL_SHEET_STACK_OPTIONS`). Если маршрут остаётся в стеке пустым или закрывающимся, прозрачный экран может забирать все касания: класс «зависло, даже не скроллится».

**Попутная находка — ОТОЗВАНА (14.10 ~18:20).** Перехвата первого тапа нет: `PaywallPlusScreen` передаёт хуку `disableExitOffer: true`; у онбординга контекст `onboarding_plan` не входит в список exit-контекстов. Перехват возможен только в dev с `_force_trial_ui=1`. Зависание этим не объясняется.

**Трассировка `[WINBACK-FREEZE]`** (dev, одна строка на событие, с временем `t=` и id окна):
- `winback_offer.shouldShowWinback`: возраст активности в днях, `shown`, причина каждого `return false`, `catch`;
- `_layout.checkWinbackOffer`: гейт (ready, onboarding, banned, firstContentReady), isPremium, introPending, решение, push;
- `_layout.closeIntroFullAccessModal`: вариант, действие, replace на пейвол;
- `premium_modal`: монтирование и размонтирование (context, source, decision);
- `PaywallPlusScreen`: монтирование и размонтирование; Android «назад» (кто обработал);
- `paywall_purchase.handleClose`: причина, exitEligible, «оффер поставлен, но не рисуется»; `doClose`: замок, ветка навигации;
- `navigation_back.dismissPaywallModal`: leaving, candidate, chosen, ветка dismiss / dismissTo / replace; через 800 мс — текущая запись стека и активный ключ арбитра окон.

**Воспроизведение без ожидания** (Сверка, после прогона №2):
- winback: `phraseman://dev_state?onboarding=done&intros=seen&plus=off&overlays=off&next=/premium_modal?context=winback%26source=winback`;
- закрыть каждым способом: крестик, тап по затемнению, Android «назад»;
- после каждого — попробовать прокрутку Главной.

## Scope

In scope (только журнал): `app/winback_offer.ts`, `app/_layout.tsx` (3 вставки), `app/premium_modal.tsx`, `components/paywall/PaywallPlusScreen.tsx`, `app/paywall_purchase.ts` (2 вставки), `app/navigation_back.ts` (1 функция).

Out of scope до фактов: любая починка; `app/dev_state_fixtures.ts` (правит другая сессия — dev-ссылка через существующий `next=`).

## Architecture

Только `console.log` под `__DEV__` с общим префиксом и `t=Date.now()%100000`. Поведение не меняется. Немые `catch` в `shouldShowWinback` получают постоянный лог.

## Security and privacy

В журнал — только контекст окна и флаги, без uid и почт.

## Technical debt

- После починки временная трассировка снимается. Логи на ранних выходах и в `catch` остаются.
- Код exit-оффера сейчас мёртвый (выключен на единственном пейволе). Рисовать оффер на выходе — по решению владельца после R1.

## Verification

- Синтаксис (babel) всех 7 файлов.
- Сторожа пейвола и навигации зелёные.
- Журнал Сверки по сценарию выше.

## Rollback

`git revert` коммита.
