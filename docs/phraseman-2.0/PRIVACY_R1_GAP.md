# PRIVACY_R1_GAP — политика конфиденциальности против первого выпуска (12.10.2026)

> **Статус:** документ для решения владельца. Ничего не опубликовано: `legal/` не менялся, `legal:sync` и деплой не запускались.
> **Проверка Авторизацией (главная находка п.1):** подтверждено по коду — `functions/src/dialogue_v2_freeform_session_firestore_repository.ts` хранит `turns` с полем `expiresAt`, а в `firestore.indexes.json` TTL есть только у `dialogue_v2_sessions` / `dialogue_v2_session_terminals`, для `dialogue_v2_freeform_sessions` — нет; удаление аккаунта (`functions/src/account_delete*.ts`) эту коллекцию не упоминает. Оговорка: TTL могли включить вручную в консоли Firestore — это отсюда не проверить (`gcloud firestore fields ttls list`, только чтение, делает координатор/владелец).


Пакет: `docs/work/tasks/privacy-r1-gap-2026-10-12.md` (TG-C5C59E59DE8B).
Источник политики: `legal/privacy_policy_en.json` (Android/общая) и `legal/privacy_policy_en_ios.json`,
обе с пометкой «Last updated: October 10, 2026», по 27 разделов (0–26).
Что делали: только читали код, `legal/*.json`, HTML-копии и публичные страницы. Ничего не опубликовано,
`legal/` не менялся, `legal:sync` не запускался.

---

## Краткий итог

Политика подробная и в основном соответствует коду. Из 8 пунктов **2 покрыты полностью, 6 — частично,
полностью не покрыт ни один**. Но внутри пунктов нашлось **10 конкретных фактов**, о которых политика
молчит или которые код делает не так, как в ней написано.

**Главные риски для ревью в сторах (по убыванию):**

1. 🔴 **Свободный ИИ-чат: переписка лежит на сервере без срока хранения и не удаляется вместе с аккаунтом.**
   Коллекция `dialogue_v2_freeform_sessions` хранит полный текст реплик (ученик + ИИ). У неё есть поле
   `expiresAt` (24 ч), но **правила автоудаления (TTL) в `firestore.indexes.json` для неё нет**, хотя у
   соседних `dialogue_v2_sessions` оно есть. Удаление аккаунта эту коллекцию тоже не трогает. Политика
   при этом обещает «не храним сырой транскрипт» (раздел 11) и удаление данных аккаунта (раздел 20).
   Лечится кодом, а не текстом политики (см. «Вопросы владельцу», п. 1).
2. 🔴 **Текст пользователя уходит в ИИ без отдельного согласия — в трёх местах.** Apple 5.1.2(i) требует
   раскрывать передачу персональных данных стороннему ИИ и получать явное разрешение:
   - комментарии в карточке оценки уходят в OpenAI, и политика прямо пишет «without a separate in-app checkbox» (раздел 11);
   - текст наборов сообщества уходит в OpenAI (проверка качества и автоперевод) — в политике об этом ни слова;
   - текст жалоб и обращений используется для ИИ-черновиков ответа — в политике ни слова.
3. 🟡 **Шпиль: в комнатах есть боты, и об этом нигде не сказано** (ни в политике, ни в условиях). А документ
   комнаты по правилам Firestore может прочитать **любой вошедший пользователь**, не только участник
   комнаты. Там видны имена, ступени и стабильные ID участников. В политике же написано, что недельные
   монеты видны «members of your Spire room».
4. 🟡 **Не раскрыты мелкие, но проверяемые поля:** часовой пояс и язык при push-токене; полный набор
   данных об устройстве и аккаунте в обращении в поддержку; запись о нарушении безопасности в ИИ-диалоге,
   которая хранит текст сообщения; кэш переводов; вход по коду на почту; аварийная копия прогресса на
   телефоне при смене аккаунта.
5. 🟡 **Копии на сайте совпадают с источником байт в байт, но опубликована только Android/общая версия.**
   iOS-текста (`_ios.json`) на сайте нет, хотя в приложении на iOS показывается именно он. Если в App Store
   стоит ссылка на `knowlyapps.com/legal/privacy/`, по ней открывается текст с упоминанием Google Play.

---

## Таблица пунктов

| # | Пункт | Что говорит политика (раздел, цитата) | Что делает код (файл:строка) | Вердикт |
|---|---|---|---|---|
| 1 | **ИИ-диалоги через OpenAI** | §11: «we may send the AI provider the text you enter, recent conversation history, selected scenario or mode, language level…»; согласие: «AI dialogs … require your explicit, separate opt-in»; память: «Knowly does not retain the raw transcript of your dialogues for this memory». §16 называет OpenAI. | В OpenAI уходят системный промпт, структурированная память и вся история беседы: `functions/src/dialogue_v2_freeform_openai_transport.ts:16,128-150,199-207`. Окно согласия называет OpenAI: `components/AiDialogConsentModal.tsx:69-71`. Память «посмотреть / стереть»: `app/privacy_settings.tsx:334-340`, функции `dialogueV2MemoryView/Clear` (`functions/src/index.ts:166-167`). **Не раскрыто:** (а) реплики свободного чата хранятся на сервере в `dialogue_v2_freeform_sessions` (`functions/src/dialogue_v2_freeform_session_firestore_repository.ts:32,181-193`, срок 24 ч в `dialogue_v2_freeform_session_ledger.ts:12`), но TTL в `firestore.indexes.json` нет (TTL есть только у `dialogue_v2_sessions`, `…_terminals`, `…_bot_voice_claims`: `firestore.indexes.json:1294-1308`); у сценарных сессий `dialogue_v2_sessions` реплики тоже лежат ~24 ч с TTL; (б) каждое сообщение проверяет модерация OpenAI (`functions/src/ai_safety.ts:219-220`); если сообщение помечено, в `safety_flags` пишется его текст (до 2000 знаков), 8 последних реплик и транскрипт (до 12 000 знаков) (`ai_safety.ts:340-371`); (в) запрошенные переводы кэшируются вместе с исходным текстом, без ID пользователя и без срока (`functions/src/premium_dialog.ts:1848-1855`). | **Частично** |
| 1б | **ИИ-разбор ошибок** | §11: «Mistake-explanation features … require your explicit, separate opt-in … you can withdraw that consent». | Окно согласия называет OpenAI и сообщает, что отправляется ответ: `components/AiExplainConsentModal.tsx:39-41`; гейт — `app/ai_explain_consent.ts`. | **Покрыт** |
| 2 | **Шпиль** | §5: «Spire floor, steps and weekly result, weekly coins earned (shown to members of your Spire room)»; §4: «Spire progress» в облаке. | Участник комнаты: `uid` (стабильный ID), имя, аватар, рамка, аура, ступени, время (`functions/src/spire_groups.ts:140-156`). Читать комнату может любой вошедший пользователь (`firestore.rules:2591-2592`). Боты — «лица» в roster и ступени по формуле (`modules/spire/residents.ts:1-20`). Комнаты прошлых недель не удаляются; при удалении аккаунта убирается только своя строка (`functions/src/account_delete.ts:1396-1411`). Срок хранения истории комнат в политике не назван. | **Частично** |
| 3 | **Сообщество (наборы, комментарии, жалобы, модерация)** | §6 подробно: содержимое и метаданные наборов, комментарии видны тем, кто добавил набор, правки автора без отдельной модерации, жалобы, модерация. | Правки автора публикуются сразу (`functions/src/community_packs.ts:464-480`) — описано. **Не раскрыто:** текст наборов (карточки, заголовки) отправляется в OpenAI для ИИ-проверки (`functions/src/admin_community_pack_qa.ts:1-20`) и автоперевода на все языки интерфейса (`functions/src/admin_community_pack_translate.ts:1-15`); переводы видят другие пользователи. Текст жалобы уходит в OpenAI для черновика ответа модератора (`functions/src/report_replies.ts:615-640`). | **Частично** |
| 4 | **Поддержка с диагностикой** | §10: «the App keeps a bounded technical action history on your device … sent to Knowly only when you explicitly submit an in-app support report». | Вместе с отчётом уходят: экран, ID и текст элемента, ответ ученика, комментарий, модель устройства, ОС и версия, размер экрана, имя, уровень, XP, серия, Premium, язык, дни в приложении, диагностика (`functions/src/client_reports.ts:342-366`; клиент — `app/support_report_outbox.ts:84-100`, схема — `app/support_diagnostic_schema.ts:38-51`). Хранится в `error_reports` без TTL, удаляется вместе с аккаунтом (`account_delete.ts:208`). ИИ-черновик ответа — см. п. 3. В §10 устройство и версия перечислены в общем списке; размер экрана, уровень, серия, Premium и дни в приложении применительно к отчёту не названы. | **Частично** |
| 5 | **Push-токены и язык пушей** | §12: «Expo push tokens, native push tokens where applicable, device/platform metadata, user IDs, and related delivery metadata». | В `users/{id}` пишутся токен, `pushTokenLang` и `pushTokenTimezone` (`app/push_token_registration.ts:107-137`). Пуши от сервера: Шпиль, возврат в приложение, рассылки (`functions/src/spire_notifications.ts`, `re_engage_push.ts`, `admin_push_jobs.ts`, `expo_push.ts`); тумблер «События Шпиля» → `pushPrefs.league` (`app/notifications.ts:1227,1371`). Часовой пояс и язык в политике не названы. | **Частично** |
| 6 | **Восстановление из облака** | §4: «Cloud sync may store progress and app state in Firebase Firestore, including lessons, streaks…»; §3: стабильный ID «account recovery». | Облачная копия описана. **Не раскрыто:** (а) восстановление по коду на почту привязки: письмо уходит через Resend, код живёт 10 мин, хранится только хэш, ведутся журналы и лимиты попыток (`functions/src/auth_recovery.ts:22-46,71,402-404`); (б) аварийная копия при смене аккаунта лежит **на телефоне** (AsyncStorage) до 30 дней и возвращается только в тот же аккаунт (`app/account_switch_backup_restore.ts:1-20,40`; запись — `app/cloud_sync.ts:5459`). §15 говорит про служебные письма через Resend в общем виде. | **Частично** |
| 7 | **Удаление аккаунта** | §20: «Server-side deletion is then scheduled after a 14-day grace period … if you sign in again during those 14 days, the App offers to restore»; про гостя: «a guest account has no sign-in method and therefore cannot be restored»; §19 — 14 дней. | 14 дней и восстановление — `functions/src/account_delete_grace.ts:22-51`; гость — фоновое прямое удаление (`app/auth_provider.ts:4551,4680-4696,4760`); после удаления остаётся запись с хэшами ID (`account_delete.ts:1630-1637`) — покрыто фразой о «limited records». **Расхождение в коде:** `dialogue_v2_freeform_sessions` не удаляется (см. п. 1). | **Покрыт текстом** (код надо догнать) |
| 8 | **Аналитика и сторонние сервисы** | §10: «We use Firebase Analytics, Firebase Crashlytics, PostHog where enabled…», согласие на необязательную аналитику, «does not use the Google Play Services Advertising ID»; §16 — список: Firebase, Google Play, Sign-In, Apple, OpenAI, YouTube, PostHog, RevenueCat, Expo, Resend/Gmail, Stripe/PayPal, Meta, Telegram. | Зависимости приложения (`package.json`): `@react-native-firebase/{analytics,crashlytics,auth,firestore,functions}`, `react-native-purchases` (RevenueCat), `@react-native-google-signin`, `expo-apple-authentication`, `expo-notifications`, `posthog-react-native`, `react-native-play-install-referrer`, `expo-speech-recognition`, `whisper.rn`. Функции: `firebase-admin`, `@google-cloud/bigquery`, `imapflow`/`mailparser`/`nodemailer` (почта поддержки); Resend — через HTTP (`functions/src/resend_secret.ts`, `auth_recovery.ts`, `web_*.ts`). Автосбор аналитики выключен до согласия (`firebase.json:263`, `app/firebase.ts:50-59`, `app/analytics_consent.ts:1-20`). AD_ID заблокирован (`app.json:81-84`). Ключ PostHog берётся из `EXPO_PUBLIC_POSTHOG_KEY` (`app/posthog_client.ts:23`); в `app.config.js`, `eas.json` и `.env*` его нет — похоже, PostHog выключен, что укладывается в «where enabled». **Не названо:** модель речи Whisper скачивается с Hugging Face (`app/speaking_whisper_models.ts:32,45`) — данные пользователя туда не уходят, только сам запрос на скачивание. | **Покрыт** (мелкое дополнение) |

Будущее (не в R1): озвучка карточек сообщества через OpenAI TTS (`functions/src/card_tts_worker.ts:1-10`: «Экспортирован, но НЕ задеплоен», после релиза 2.0). После включения текст карточек будет уходить в OpenAI, и это придётся раскрыть в §6 и §13. Раздел §13 сейчас пишет «pronunciation is generated on device».

---

## Предлагаемые тексты (ru — черновик, политика сейчас только на английском; en — для `legal/*.json`)

Все абзацы написаны так, чтобы не обещать больше, чем делает код. Где обещание зависит от правки кода,
это отмечено.

### П1. ИИ-диалоги: временное хранение беседы, проверка безопасности, кэш переводов → §11, после абзаца о памяти

> ⚠️ Фразу «удаляется примерно через 24 часа» можно публиковать **только после** того, как для
> `dialogue_v2_freeform_sessions` включат TTL (и, желательно, добавят коллекцию в удаление аккаунта).
> Пока этого нет, используйте вариант Б.

**EN (вариант А — после правки кода):**
While an AI dialogue is in progress, we keep the messages of that conversation (your messages and the AI replies) on our servers so the conversation can continue and a repeated request is not processed twice. This session record is set to expire about 24 hours after the conversation starts and is then deleted automatically.

**EN (вариант Б — до правки кода):**
While an AI dialogue is in progress, we keep the messages of that conversation (your messages and the AI replies) on our servers so the conversation can continue and a repeated request is not processed twice. These session records are kept only as long as needed for that purpose and for security and abuse prevention.

**EN (общий хвост для обоих вариантов):**
Messages in AI dialogues are checked automatically for safety, including by our AI provider's moderation service. If a message is flagged, we may keep that message and a short excerpt of the preceding conversation as a safety record that only authorised moderators can review. Safety records are kept only as long as needed for safety, abuse prevention, or legal reasons. If you ask the App to translate text in a dialogue, the text and its translation may be kept in a shared translation cache that is not linked to your account.

**RU (вариант А):**
Пока идёт ИИ-диалог, мы храним сообщения этой беседы (ваши и ответы ИИ) на наших серверах, чтобы беседу можно было продолжить, а повторный запрос не обработался дважды. Запись беседы автоматически удаляется примерно через 24 часа после её начала.

**RU (вариант Б):**
Пока идёт ИИ-диалог, мы храним сообщения этой беседы (ваши и ответы ИИ) на наших серверах, чтобы беседу можно было продолжить, а повторный запрос не обработался дважды. Эти записи хранятся только столько, сколько нужно для этой цели, а также для безопасности и защиты от злоупотреблений.

**RU (общий хвост):**
Сообщения в ИИ-диалогах автоматически проверяются на безопасность, в том числе сервисом модерации нашего ИИ-провайдера. Если сообщение помечено, мы можем сохранить его и короткий фрагмент предыдущей беседы как запись безопасности, доступную только уполномоченным модераторам. Такие записи хранятся только столько, сколько нужно для безопасности, защиты от злоупотреблений или по требованиям закона. Если вы просите приложение перевести текст в диалоге, текст и перевод могут храниться в общем кэше переводов, не связанном с вашим аккаунтом.

### П2. Шпиль: кто что видит, боты, сроки → §5, после первого абзаца

> Фразу о ботах включать только по решению владельца (вопрос 2). Слова «members of the same room»
> верны, только если правило чтения сузят до участников комнаты (вопрос 3). Иначе — вариант в скобках.

**EN:**
The Spire groups players into weekly rooms of up to 30 places for each study language. Other members of your room [other app users who open the room] can see your nickname, avatar and cosmetic style, your steps, place and weekly result. Some places in a room may be filled by computer-controlled participants rather than real people. Weekly room records are kept as part of the Spire history; your entry is removed from them when your account is deleted.

**RU:**
Шпиль объединяет игроков в недельные комнаты до 30 мест для каждого изучаемого языка. Другие участники вашей комнаты [другие пользователи приложения, открывшие комнату] видят ваш никнейм, аватар и оформление, ваши ступени, место и итог недели. Часть мест в комнате могут занимать участники, которыми управляет компьютер, а не живые люди. Записи недельных комнат хранятся как история Шпиля; при удалении аккаунта ваша строка из них удаляется.

### П3. Сообщество: ИИ-проверка, автоперевод, ответы на жалобы → §6, после абзаца о правках автора

**EN:**
To check Community Packs for mistakes and to show them in other interface languages, the text of a pack (title, description, and card text) may be sent to our AI provider (OpenAI) for review and automatic translation. Translated versions may be shown to other users who view the pack. When we reply to a report you sent, a moderator may use AI assistance to draft the reply from the report text; a person reviews the reply before it is sent to you in the App.

**RU:**
Чтобы проверять наборы сообщества на ошибки и показывать их на других языках интерфейса, текст набора (название, описание и текст карточек) может отправляться нашему ИИ-провайдеру (OpenAI) для проверки и автоматического перевода. Переведённые версии могут видеть другие пользователи, которые открывают набор. Когда мы отвечаем на вашу жалобу, модератор может составить черновик ответа по её тексту с помощью ИИ; ответ проверяет человек, прежде чем он придёт вам в приложении.

### П4. Обращение в поддержку: что прикладывается → §10, после абзаца о диагностике

**EN:**
When you send an in-app report about a problem, we receive your comment, the screen and content item it concerns, the answer you gave (if any), your nickname and interface language, basic account information (such as level, streak, Premium status, and days in the App), and device information (device model, operating system and version, and screen size). If support diagnostics are enabled, the technical action history described above is attached.

**RU:**
Когда вы отправляете из приложения сообщение о проблеме, мы получаем ваш комментарий, экран и элемент, к которому оно относится, ваш ответ (если был), никнейм и язык интерфейса, основные сведения об аккаунте (например, уровень, серию, статус Premium и число дней в приложении) и сведения об устройстве (модель, операционную систему и её версию, размер экрана). Если включена диагностика поддержки, прикладывается описанная выше история технических действий.

(Про ИИ-черновик ответа — фраза в П3; можно продублировать здесь одним предложением.)

### П5. Push: язык и часовой пояс → §12, в конец первого абзаца

**EN:**
To send remote notifications in your language and at a suitable time of day, we store your interface language and your device's time zone together with your push token.

**RU:**
Чтобы присылать уведомления на вашем языке и в подходящее время суток, вместе с push-токеном мы храним язык интерфейса и часовой пояс устройства.

### П6. Восстановление по коду и аварийная копия на телефоне → §4 (код) и §3 (копия)

**EN (§4, в конец раздела):**
If you lose access to your progress, for example after reinstalling the App or choosing a different Google or Apple account, the App may offer to restore it with a one-time code. The code is sent by email, through our email provider (Resend), only to the email address already linked to your account. It expires after 10 minutes. We store only a protected (hashed) form of the code, together with attempt counters and recovery records used to prevent abuse.

**RU (§4):**
Если вы потеряли доступ к прогрессу, например после переустановки приложения или входа в другой аккаунт Google или Apple, приложение может предложить восстановить его по одноразовому коду. Код приходит письмом через нашего почтового провайдера (Resend) и только на адрес, уже привязанный к вашему аккаунту. Код действует 10 минут. Мы храним только защищённую (хэшированную) форму кода, а также счётчики попыток и записи о восстановлении, которые нужны для защиты от злоупотреблений.

**EN (§3, после абзаца о гостевом режиме):**
When you switch accounts on a device, the App may keep a temporary copy of the previous account's local progress on that device, so that it can be returned if you sign back in to the same account. This copy stays on the device, is only restored into the same account, and is discarded after 30 days.

**RU (§3):**
Когда вы меняете аккаунт на телефоне, приложение может сохранить на этом телефоне временную копию локального прогресса предыдущего аккаунта, чтобы вернуть её, если вы снова войдёте в тот же аккаунт. Копия не покидает телефон, восстанавливается только в тот же аккаунт и отбрасывается через 30 дней.

> Проверить перед публикацией: копия старше 30 дней удаляется лениво, при следующей проверке
> (`account_switch_backup_restore.ts:15`), поэтому написано «discarded», а не «deleted on day 30».

### П7. Удаление аккаунта

Текст §19–20 менять не нужно. Нужна правка кода: добавить `dialogue_v2_freeform_sessions` в удаление
аккаунта и/или включить для неё TTL. Отдельная задача, вне этой сверки.

### П8. Сторонние сервисы → §16, новая строка списка (необязательно)

**EN:**
- Hugging Face, from which the App downloads an on-device speech model for pronunciation practice; your recordings and recognized speech are not sent to it

**RU:**
- Hugging Face — оттуда приложение скачивает модель распознавания речи, которая работает на устройстве, для практики произношения; ваши записи и распознанный текст туда не отправляются

---

## Копии и сайт

| Копия | Дата в тексте | Совпадает с `legal/privacy_policy_en.json` | Раздел 20 о госте |
|---|---|---|---|
| `app/legal/privacy_policy_en.json` / `_ios.json` | 10.10.2026 | байт в байт (`cmp`) | есть |
| `privacy.html` (корень) | October 10, 2026 | все 127 абзацев на месте | есть |
| `admin/v2/oauth-privacy.html` | October 10, 2026 | все 127 абзацев на месте | есть |
| `knowly-www/legal/privacy/index.html` | October 10, 2026 | все 127 абзацев на месте | есть |
| **опубликовано** `https://phraseman-ea0b3.web.app/oauth-privacy.html` | October 10, 2026 | **байт в байт = локальной копии** | есть |
| **опубликовано** `https://knowlyapps.com/legal/privacy/` | October 10, 2026 | **байт в байт = локальной копии** | есть |

Проверка шла скриптом по абзацам: каждый абзац источника искался в тексте HTML. Единственное отличие —
обратные кавычки вокруг `phraseman_uid` в HTML остаются буквально. Это косметика, а не отставание.

Замечания:
- Сайт **не отстаёт**: последний коммит копий `a350f04ba` от 10.10 (после `0af36379f` с разделом 20 о госте) опубликован.
- iOS-версия (`_ios.json`, 26 отличающихся абзацев: «iOS app», App Store, ATT/IDFA вместо AD_ID, APNs) **нигде на сайте не опубликована**. Все веб-копии собраны из Android/общего текста.
- `https://phraseman-ea0b3.web.app/privacy.html` отдаёт 404: хостинг публикует `admin/v2`, а корневой `privacy.html` туда не попадает. Если где-то стоит эта ссылка, она битая.

---

## Вопросы владельцу

1. **Свободный ИИ-чат.** Включить TTL для `dialogue_v2_freeform_sessions` (как у `dialogue_v2_sessions`) и добавить коллекцию в удаление аккаунта? Это правка кода и индексов, отдельная сессия. До неё в §11 подойдёт только вариант Б из П1.
2. **Боты в Шпиле.** Раскрываем, что часть мест занимают компьютерные участники? Где: в политике (П2), в условиях использования, в самой комнате?
3. **Кто видит комнату Шпиля.** Сейчас любой вошедший пользователь может прочитать любую комнату вместе со стабильными ID участников (`firestore.rules:2591-2592`). Сузить правило до участников комнаты (правка кода) или смягчить текст политики до «другие пользователи приложения»?
4. **Комментарии из карточки оценки → OpenAI без отдельного согласия** (§11 прямо это говорит). С учётом Apple 5.1.2(i) оставить так или добавить согласие либо обезличивание без ИИ?
5. **ИИ на тексте пользователя без согласия** (проверка и перевод наборов, черновики ответов на жалобы). Хватит раскрытия в политике (П3) или нужно согласие при публикации набора?
6. **Русская версия политики** — публиковать как отдельный документ? Сейчас RU-тексты в этом файле только черновики.
7. **iOS-версия на сайте** — нужна отдельная страница (например, `/legal/privacy-ios/`) и ссылка в App Store Connect?
8. **Озвучка карточек сообщества (OpenAI TTS)** — после деплоя `cardTts*` надо дописать §6 и §13. Поставить в план релиза 2.x?
9. **Неиспользуемые зависимости** `react-native-webrtc` и `react-native-incall-manager` (остатки MAX) — убрать из сборки? Они могут добавлять в манифест лишние разрешения, которые §13 сейчас объясняет оговоркой.

---

Самопроверка: каждый «покрыт» подтверждён цитатой раздела, каждый «частично» — ссылкой на код.
Персональных данных (uid, email) в документе нет.
