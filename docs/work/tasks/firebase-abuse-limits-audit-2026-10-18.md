# Аудит: можно ли накрутить расходы Firebase (Ревизор, 18.10)

Задача владельца через координатора: «если будет много запросов, нам могут накрутить Firebase на деньги».

- Только чтение кода на HEAD 2745d4e60.
- **[код]** — проверено в коде, с файлом и строкой. **[вывод]** — оценка, в коде не подтверждена.
- Пункт B1 Ревизор перепроверил вручную.

## Главное
- App Check выключен (решение владельца), анонимный вход разрешён. Значит, гостей можно создавать без конца, и каждый новый uid получает свои бесплатные квоты ИИ. `resolveStableUidForAuth` при отсутствии привязки возвращает сам authUid — `auth_identity.ts:1725` **[код]**.
- Блокирующих функций (`beforeUserCreated` / `beforeUserSignedIn`) нет **[код]**.
- Лимит по IP есть только в 7 файлах **[код]**: auth_recovery, подсказка восстановления, promo, site_stats, website_contact, web_checkout, accounts_v2_deletion. У ИИ-функций его нет.
- Общий потолок: `setGlobalOptions({maxInstances:30, cpu:"gcf_gen1"})` — `index.ts:33` **[код]**; у функций ИИ maxInstances 20.
- Худший случай **[вывод]**: ≈ 860 тыс. ответов в сутки на `premiumDialogSend` ≈ 300 $/сутки. Перевод и `explainMistake` добавляют ещё порядка того же — сотни $ в сутки.

## A) Таблица по денежному риску
| Функция / путь | auth | лимит uid | лимит IP | общий потолок / maxInst | Что дорого | Риск | Что поставить |
|---|---|---|---|---|---|---|---|
| `premiumDialogTranslate` | вкл. аноним | 60/ч (окно 'tr'), дневного нет | нет | нет / 20 | OpenAI, текст до 1200 символов | 🔴 | 50/день на uid; 200/день на IP; общий 20 000/день для бесплатных; maxInstances 10 |
| `premiumDialogSend` / `Stream`, `dialogueV2TextTurn` | аноним ок | 30/мес бесплатно + 60/ч | нет | `globalDailyCap: 0`, нигде не применяется / 20 | OpenAI | 🔴 | 60 бесплатных/сутки на IP; общий 20 000 бесплатных/сутки; анониму 5 вместо 30 |
| `explainMistake` | аноним ок | 3/день (Plus 100) | нет | нет / 20 | OpenAI | 🔴 | `enforceGlobalBudget` 3000/день; 30/день на IP |
| `mistakeHubAdvice` | аноним ок | 3/день | нет | нет / 10 | OpenAI | 🟡 | общий 2000/день |
| `premiumDialogReview` | Plus / превью | 60/ч | нет | нет / 20 | OpenAI | 🟡 | общий потолок как у диалога |
| `explainPhrase`, `explainChoice` | аноним ок | 5 и 3/день | нет | 3000/день / 20 | OpenAI | 🟢 | 30/день на IP |
| `webLeadCapture` (публичная) | нет | — | нет (пауза только на адрес) | 3 | письма Resend на любой адрес | 🟡 репутация домена | 5/ч, 20/сутки на IP |
| `englishTestApi` (публичная) | нет | по клиенту | есть | 100 | Firestore | 🟡 | maxInstances 10 |
| `learningV2*SessionGet*` (content) | да | нет | нет | 40, 512 МБ | вычисления/чтения | 🟡 | maxInstances 10, 120/ч на uid |
| `authEnsureStableLink` | аноним | нет | нет | 30 | создаёт users/{id} + триггер | 🟡 | 10/ч и 30/сутки новых на IP |
| коды восстановления | да | 10/ч | 30/ч | — | письма | 🟢 | — |
| `submitWebsiteContact`, `siteStatsTrack` | нет | — | 3/10 мин, 200/10 мин | 10 | письма / Firestore | 🟢 | — |

## B) Пять опасных мест и минимальные правки
1. **Перевод без дневного лимита.** `premium_dialog.ts:1714` — бесплатный проходит, пока `freeDailyReplies > 0`; `:1721` — только `enforceRateLimit(..., 'tr')`. Перепроверено Ревизором. Правка: сразу после `:1721` — `enforceFreeJobGenLimit('dialog_tr', authUid, stableUid, 50, now)` (`explain/explain_budget.ts:123`); для Plus не применять.
2. **У диалога нет общего потолка.** `openai_jobs_config.ts:53` `globalDailyCap: 0` в `premium_dialog.ts` не читается. Правка: в бесплатной ветке `enforceGlobalBudget(20000)` (`explain_budget.ts:100`) с отдельной коллекцией; счётчик разбить на ~10 частей, чтобы не упереться в конкуренцию транзакций **[вывод]**.
3. **Нет лимита по IP у ИИ.** Правка: вынести общий помощник из `auth_recovery.ts:169` (`recoveryCallerIp`) и `:177` (`consumeRecoveryCallerRate`, uid и IP вместе) и вызвать в 6 ИИ-функциях. Плюс урезанная квота анониму по `request.auth.token.firebase.sign_in_provider === 'anonymous'`.
4. **`explainMistake` и `mistakeHubAdvice` без общего потолка.** `mistake_explain.ts:54,64,75,92`, `mistake_hub_advice.ts:34,201`. Правка: `reserveExplainBudget` (`explain_budget.ts:253`) по образцу `explain_phrase.ts:208`.
5. **`webLeadCapture` рассылает письма на любые адреса.** `web_leads.ts:346–413`. Правка: перед `sendResendEmail` — лимит по IP из `website_contact.ts:72` (`reserveContactRateLimit`), 5/ч и 20/сутки.

## C) Правила Firestore / Storage
- `firestore.rules:1124` — владелец пишет `users/{id}` без ограничения частоты; каждая запись будит `usersWriteRouter` (`retry:true`). Цикл записей превращается в счёт за функции. 🟡
- `firestore.rules:2848` — комментарии к наборам: ограничены форма и длина 200, но не число и не частота; на каждый срабатывает триггер. 🟡
- `firestore.rules:1041` — `economy_daily_stats`: любой вошедший перезаписывает общий дневной документ (порча данных и конфликты, не деньги). 🟡
- `firestore.rules:2229` — `paywall_funnel`: создание без лимита числа, форма ограничена, есть `expireAt`. 🟢
- `storage.rules:95` — запись запрещена везде 🟢. Чтение без входа (`:19, :42, :53, :65, :79`) стоит денег за трафик при флуде 🟡.
- Правила не ограничивают частоту чтений публичных коллекций. Без App Check защищает только оповещение о бюджете. 🟡

## Проверить в консоли (кодом не видно)
- Лимит регистраций с одного IP в Firebase Auth (по умолчанию около 100/ч на IP).
- Оповещения о бюджете в биллинге.
- Ручной отключатель всего ИИ `ai_global_disable` есть **[код]**, но срабатывает только вручную.
