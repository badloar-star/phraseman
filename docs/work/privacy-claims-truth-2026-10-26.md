# Обещания о данных и оплате: правда / неправда по коду и политике (5 · ВХОД, 26.10)

Основа: прочёсывание Переводчика 1353b9a26 (`docs/work/privacy-claims-sweep-2026-10-25.md`). Ничего не чинил — только вердикты.
Политика — `legal/privacy_policy_en.json` (§ — номер раздела).

## 🔴 Неправда (передано координатору)

| утверждение | где | почему неправда | доказательство |
|---|---|---|---|
| «В зависимости от функции в OpenAI отправляется текст **или речь**» (ru/uk/es/pt «voz») | `app/privacy_settings.tsx:393` | речь (звук) в OpenAI не уходит: распознавание — системный сервис Apple/Google или whisper на телефоне; в OpenAI — только текст (завышает, но неправда) | политика §11, §13; `app/speaking_neural_judge.ts:1-20` (on-device); OpenAI-вызовы только с текстом: `functions/src/dialogue_v2_freeform_openai_transport.ts:17` |
| «Мы напомним заранее, чтобы решение… осталось за тобой» (без условия) | `components/onboarding/clean_onboarding_copy_core.ts:143–144` | напоминание ставится, только если человек выбрал уведомления и система разрешила, и только если магазин отдал длительность пробного; иначе напоминания нет | `app/paywall_purchase.ts:1386–1399` (выходы `skip/blocked`, `!granted`, `!reminderDays`); en-карточка пейвола говорит честно «If notifications are allowed» (`components/paywall/PaywallProofCards.tsx:430`) |
| «Мы видим только цифры: где урок даётся легко…» / «Делиться **анонимной** статистикой» / «**Обезличенные** данные…» | `components/onboarding/clean_onboarding_copy_core.ts:121–122`, `app/privacy_settings.tsx:331–332` | при согласии события журнала активности пишутся в Firestore с `uid` аккаунта (псевдонимно, админка видит по человеку) — это не «анонимно» и не «только цифры» | `app/app_activity.ts:114–127` (`uid: uid ?? 'unknown'`, запись при `isAnalyticsConsentGranted()`); политика §10 описывает app activity logs |
| «Просто повтори вслух — голос не записываем и не оцениваем» в режиме `scripted_speech` | `app/learning_v2_direct_session_player_v1.tsx:3809–3836` (строка `app/learning_v2_session_copy.ts:116/223`) | в живом плеере урока (его открывает `app/learning-v2/session/[id].tsx:94`) этот режим включает микрофон, распознаёт речь, берёт распознанный текст как ответ и засчитывает попытку как «произношение» | `app/learning_v2_direct_session_player_v1.tsx:2003` (facet `pronunciation`), `:3418` (`kind: 'transcript'`); политика §13 (запись — во временном хранилище) |

Примечание: на экране `app/learning-v2/session/[id].tsx:1414–1425` режим «повтори» без микрофона — там строка правдива.

## 🟡 Не доказуемо / зависит от магазина

| утверждение | где | что не так |
|---|---|---|
| «Отменить можно в два тапа» | `app/paywall_purchase.ts:425` (текст push о конце пробного) | отмена проходит в магазине, число шагов мы не контролируем; честнее «отменить можно в настройках магазина» |
| «Payment failed — update your card and Plus stays with you» | `components/BillingIssueToastHost.tsx:94` | верно, только пока у магазина идёт льготный период/повтор списания; после — Plus прекратится |
| «Твои данные — только твои / Your data stays yours» | `components/onboarding/clean_onboarding_copy_core.ts:70` | рядом с новой privacyBody не противоречит; формулировку решает владелец (вариант Переводчика 9bf39df30) |

## ✅ Правда

| утверждение | где | доказательство |
|---|---|---|
| privacyBody (новая): не продаём; прогресс и подбор уроков; остальное — в Политике | `clean_onboarding_copy_core.ts:73` | §10/§17/§22; §4; `app/plan_lesson_gate.ts:62`; ссылка на политику на экране `CleanOnboarding.tsx:4187` |
| окно согласия ИИ: в OpenAI — текст, голос распознаёт Apple/Google, запись у тебя | `components/AiDialogConsentModal.tsx` (f91a2bad6) | §11, §13 |
| «Каждая функция работает только после отдельного согласия… Выключено — новые запросы не отправляются» | `app/privacy_settings.tsx:393` (кроме «или речь») | `app/ai_dialog_consent.ts`, `app/ai_explain_consent` — тумблеры, гейты читают согласие |
| «Сбор сбоев для стабильности продолжается» / «Сейчас данные об использовании не отправляются» | `app/privacy_settings.tsx` | Crashlytics всегда (`app/firebase.ts:91–97`); Analytics/PostHog/журнал — только с согласием (`app/posthog_client.ts:235,248`, `app/app_activity.ts:114`) |
| «Прогресс удалится безвозвратно» (окно удаления гостя) | `components/DeleteAccountConfirmModal.tsx` | гость удаляется сразу (D189) |
| «Этот аккаунт удалён безвозвратно» | `app/account_delete_restore_prompt.ts:90` | показывается на `identity_retired` — после 14 дней |
| вариант Б: «через 14 дней… войди снова — всё вернётся», «навсегда — сразу», «подписка сама не отменится» | `components/account/delete_account_variant_b_copy.ts` | сервер 713677ddd (за флагом до выкладки) |
| «Сейчас ничего не спишем», «Отмени до {date}, чтобы не списали» | `clean_onboarding_copy_core.ts:139–142`, `_copy_paywall.ts:22` | правила пробного периода магазинов |
| «Отмена в любой момент в настройках магазина», «Подписка продлевается автоматически» | `paywall_purchase.ts:397/399`, `PaywallPlusCopy.ts`, `paywall_subscription_disclosure.ts:30`, `paywall_copy.ts:1627` | правила магазинов |
| «Отмена в настройках App Store / Google Play» | `components/LangContext.tsx:1136–1170`, `constants/theme.ts:455–463` | строка выбирается по платформе (iOS — App Store, Android — Google Play) |
| «Не удалось открыть магазин. Отмени подписку в настройках телефона» | `app/manage_subscription.tsx:688` | обе платформы позволяют отменить из настроек |
| «Созданное остаётся у тебя навсегда» | `app/paywall_copy.ts:1405` | `app/creator_access.ts`: уже созданное не отбирается после конца Plus (решение владельца) |
| «Your progress stays with you» (после отмены) | `app/manage_subscription.tsx:1061` | отмена Plus прогресс не трогает |
| «Everything you unlocked stays with you» (после реферального доступа) | `app/referral_access_ended_modal.tsx:91` | не проверял механику отзыва открытого — 🟡 при сомнении уточнить у владельца зоны рефералов |
| «Прогресс в безопасности…» (смена аккаунта) | `app/account_switch_copy.ts:74` и др. | по замыслу потоков смены аккаунта (не перепроверял каждую ветку) |
| «…то, что уже выучено, никуда не денется» (смена языка) | `components/onboarding/clean_onboarding_copy_language.ts:17` | прогресс хранится по языку изучения отдельно (`app/target_storage_keys.ts`) |
