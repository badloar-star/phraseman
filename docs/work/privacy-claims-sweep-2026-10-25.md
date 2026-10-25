# Обещания о данных и оплате в текстах приложения — прочёсывание (Переводчик, 25.10)

Для: 5 · ВХОД (проверка правды по коду и политике), координатор. Только текст: без вердиктов и без правок кода.
Охват: все видимые строки ru и en в `app/`, `components/`, `constants/`, `hooks/`, `modules/`. Отброшены тесты, dev-экраны,
комментарии, логи и учебный контент: «Мы не делимся едой», «возвратные местоимения», «The private table is clean» — это фразы
уроков, а не обещания приложения.

Искал:
- «никому не передаём / не делимся»;
- «только на телефоне / остаётся у тебя»;
- «анонимно / обезличенно», «видим только»;
- «не храним / не записываем»;
- «удалим сразу / навсегда / безвозвратно»;
- «без рекламы / трекинга»;
- «никто не увидит / приватно»;
- отмена, возврат денег, «ничего не спишем», «напомним».

Сводка: обещаний «без рекламы / без трекинга», «никто не увидит» и о возврате денег в интерфейсе **нет**. «Приватность»
встречается только как название раздела настроек.

## 1. Куда уходят данные

| Где (файл:строка) | Текст ru / en | Что обещает |
|---|---|---|
| `components/onboarding/clean_onboarding_copy_core.ts:71` `privacyBody` | Мы ничего не продаём и никому не передаём. Данные нужны только чтобы сохранить твой прогресс. / We don’t sell your data or share it with anyone. We only need it to save your progress. | не продаём; никому не передаём; используем только для прогресса. *(замена готова: 9bf39df30, вносит ВХОД)* |
| `components/onboarding/clean_onboarding_copy_core.ts:70` `privacyTitle` | Твои данные — только твои / Your data stays yours | данные принадлежат человеку и никуда не уходят (читается так рядом с телом). *(вариант без обещания — в 9bf39df30)* |
| `app/privacy_settings.tsx:393` | Каждая функция работает только после отдельного согласия. В зависимости от функции в OpenAI отправляется текст или речь. Выключено — новые запросы не отправляются. / Each feature works only after separate consent. Depending on the feature, text or speech is sent to OpenAI. Turned off — no new requests are sent. | (а) без согласия функции ИИ не работают; (б) в OpenAI уходит **текст или речь** — по проверке Ядра (e384e0228) в OpenAI уходит только текст, звук — нет; сверить; (в) после выключения запросы прекращаются |
| `components/AiDialogConsentModal.tsx:86/88` | …то, что ты пишешь или говоришь, отправляется в OpenAI текстом. Голос распознаёт сервис телефона — Apple или Google… Сама запись остаётся у тебя. | в OpenAI — текст; распознавание у Apple/Google; файл записи на телефоне. *(уже обновлено по f4cb658a2)* |
| `app/learning_v2_session_copy.ts:116 / :223` | Просто повтори вслух — голос не записываем и не оцениваем / Practice repeat · your voice isn’t recorded or graded | в режиме «повтори» голос не записывается и не оценивается |

## 2. Анонимность и аналитика

| Где | Текст ru / en | Что обещает |
|---|---|---|
| `components/onboarding/clean_onboarding_copy_core.ts:121` `improveBody` | Мы видим только цифры: где урок даётся легко, а где все спотыкаются. / We only see numbers: where a lesson feels easy and where everyone stumbles. | аналитика — только числа, без личного |
| `components/onboarding/clean_onboarding_copy_core.ts:122` `improveShare` | Делиться анонимной статистикой / Share anonymous stats | статистика анонимна |
| `app/privacy_settings.tsx:331–332` | Обезличенные данные о том, как проходит обучение. Не обязательно — приложение работает и без этого. Сбор сбоев для стабильности продолжается… / Anonymous data about how your learning goes. Optional — the app works without it. Crash reports for stability are always collected. | данные обезличены; необязательны; отчёты о сбоях собираются всегда |
| `app/privacy_settings.tsx` (подпись при выключенной аналитике) | Сейчас данные об использовании не отправляются. Сбор технических сбоев для стабильности продолжается. | при выключенной аналитике данные не уходят, кроме сбоев |

## 3. Удаление аккаунта

| Где | Текст ru / en | Что обещает |
|---|---|---|
| `components/DeleteAccountConfirmModal.tsx:543/545` | Прогресс удалится безвозвратно. Подписка в App Store или Google Play не отменится автоматически. / Your progress will be deleted permanently… | удаление полное и необратимое; подписку надо отменить самому |
| `app/account_delete_restore_prompt.ts:90` | Этот аккаунт удалён безвозвратно. Войди другим способом или начни заново. | аккаунт удалён полностью |
| `components/account/delete_account_variant_b_copy.ts` `w1Cta` / `w1BodyAfter` | Удалить через 14 дней · …Передумаешь — войди снова тем же способом, и всё вернётся. | удаление через 14 дней; в эти 14 дней вход возвращает всё |
| там же `w2BodyBefore/Bold/After` | Аккаунт, прогресс, фразы и серия удалятся **сразу**. Вернуть их будет нельзя. | немедленное и необратимое удаление |
| там же `w1Subscription` | Подписка в App Store или Google Play сама не отменится. | подписка не отменяется удалением аккаунта |

## 4. Оплата, пробный период, отмена

| Где | Текст ru / en | Что обещает |
|---|---|---|
| `components/onboarding/clean_onboarding_copy_core.ts:139`, `…_copy_paywall.ts:22` | Сейчас ничего не спишем | при оформлении пробного денег не списывают |
| `components/onboarding/clean_onboarding_copy_core.ts:141–142` | Отмени до {date}, чтобы не списали деньги. / Cancel before the trial ends to avoid being charged. | отмена до конца пробного = без списания |
| `components/onboarding/clean_onboarding_copy_core.ts:143–144` | Попробуй Plus бесплатно {n} {days}. Мы напомним заранее, чтобы решение… осталось за тобой. | приложение **напомнит** до конца пробного |
| `components/paywall/PaywallProofCards.tsx:430` (en) | …If notifications are allowed, we'll remind you before it ends… | напоминание до конца пробного (при разрешённых уведомлениях) |
| `app/paywall_purchase.ts:397/399` | Затем — ${price}. Отменить можно в любой момент в настройках магазина. | отмена в любой момент через магазин |
| `app/paywall_purchase.ts:425` | Дальше — ${price}. Останешься? Отменить можно в два тапа. | отмена «в два тапа» |
| `components/paywall/PaywallPlusCopy.ts:77/85/160/167` | Затем {v} в год/месяц · Отмена в любой момент; Продлевается каждый год/месяц · Отмена в любой момент | автопродление; отмена в любой момент |
| `components/paywall/PaywallPlusCopy.ts:102/104` | Списание {v}. Отменить можно в любой момент до этого / You are charged {v}. Cancel anytime before that | отмена до списания = без списания |
| `app/paywall_copy.ts:1627` | Отменить можно в любой момент | отмена в любой момент |
| `app/paywall_subscription_disclosure.ts:30`, `…_copy_paywall.ts:29` | Подписка продлевается автоматически. Отменить можно в настройках магазина. | автопродление; отмена через магазин |
| `components/LangContext.tsx:1140/1162`, `constants/theme.ts:461` | Отмена в любое время в настройках App Store (Подписки). / Cancel anytime in your app store’s subscriptions section. | отмена через App Store (ru упоминает **только App Store** — на Android это Google Play; сверить, где показывается) |
| `components/onboarding/clean_onboarding_copy_paywall.ts:21` | Отмена в любой момент | то же |
| `app/manage_subscription.tsx:688` | Не удалось открыть магазин. Отмени подписку в настройках телефона. | отмена возможна в настройках телефона |
| `app/paywall_copy.ts:1405` | Созданное остаётся у тебя навсегда / What you create stays with you for good | созданное (наборы, фразы) сохраняется навсегда, в том числе после конца Plus |
| `app/manage_subscription.tsx:1061` (en) | Your progress stays with you, but you'll have to keep learning without Plus. | после отмены прогресс сохраняется |
| `app/referral_access_ended_modal.tsx:91` (en) | Everything you unlocked stays with you. | открытое по рефералу остаётся после конца доступа |
| `components/BillingIssueToastHost.tsx:94` (en) | Payment failed — update your card and Plus stays with you | обновишь карту — Plus не прервётся |

## 5. Сохранность прогресса (не приватность, но обещание)

| Где | Текст | Что обещает |
|---|---|---|
| `app/account_switch_copy.ts:74`, `app/account_sync_copy.ts:25`, `app/account_switch_still_running_copy.ts:30/32`, `app/account_backup_blocked_copy.ts:79` | Прогресс в безопасности… / Your progress is safe… | прогресс не потеряется при смене аккаунта / медленной сети / работе без входа |
| `components/onboarding/clean_onboarding_copy_language.ts:17` | …то, что уже выучено, никуда не денется. | выученное по одному языку сохраняется при выборе другого |

## Что я бы проверил первым (без вердикта, по риску)

1. `privacy_settings.tsx:393` — «в OpenAI отправляется текст **или речь**» против находки Ядра «только текст».
2. «Мы напомним заранее» (онбординг) — есть ли напоминание, если уведомления запрещены; в en-карточке пейвола условие
   («if notifications are allowed») есть, в онбординге — нет.
3. «Отмена в любое время в настройках App Store» — не показывается ли на Android.
4. «Мы видим только цифры» / «анонимная статистика» — что реально уходит в аналитику (есть ли идентификатор).
5. «Созданное остаётся у тебя навсегда» — что происходит с созданным после удаления аккаунта (там «безвозвратно»).
