# STORE_PRIVACY_FORMS_R1 — готовые ответы для форм приватности сторов (выпуск 17.10)

Для владельца: что отмечать в **Google Play → Data safety** и **App Store Connect → App Privacy**. Сверено с кодом на 12.10
(`package.json`, `app.json`, клиентские вызовы, `functions/src`), политикой `legal/privacy_policy_en.json` (Last updated: October 12, 2026)
и страницей удаления. Основа — `evidence/E24_store_declarations_2026-10-01.md`, обновлена. В консолях ничего не публиковалось.
Проверка «что реально уходит в сеть» сделана **по коду**; сетевой снимок на устройстве не делался (NOT_RUN) — см. §4.

## 0. Карта: какие сервисы реально получают данные (по коду)

| Сервис | Где в коде | Что получает | Когда |
|---|---|---|---|
| Firebase Auth (аноним, Google, Apple) | `@react-native-firebase/auth`, `google-signin`, `expo-apple-authentication`; сервер `functions/src/auth_identity.ts` (email в метаданных связки) | uid, email и имя от Google/Apple (только при входе) | гость — всегда (анонимный uid); email — только при входе |
| Cloud Firestore / Functions | `@react-native-firebase/firestore`, `functions` | прогресс, карточки, ник, друзья, рефералы, Шпиль, наборы сообщества, жалобы, опросы, согласия (`user_consents`), push-токен + язык + часовой пояс | работа приложения |
| Firebase Crashlytics | `app/_layout.tsx` (включён всегда) | сбои, стек, модель/ОС | всегда (строго необходимое) |
| Firebase Analytics | `app/firebase.ts`, `app/analytics_consent.ts` | события использования, ID экземпляра | **только после согласия** |
| PostHog (EU) | `app/posthog_client.ts` | продуктовые события | только после согласия **и** если в сборке задан `EXPO_PUBLIC_POSTHOG_KEY` — в `eas.json` и `.env*` его НЕТ (см. §4.1) |
| RevenueCat | `react-native-purchases` | app user id, покупки, статус подписки | при покупке/проверке прав |
| OpenAI (сервер) | Диалоги V2, разбор ошибок (`ai_*`), модерация, перевод и **озвучка карточек опубликованных наборов** (`functions/src/card_tts_worker.ts` → `api.openai.com/v1/audio/speech`) | текст сообщений и ответов, контекст урока; текст карточек наборов | только при использовании функции; ИИ-разбор и Диалоги — после отдельного согласия |
| Push (Expo + FCM/APNs) | `expo-notifications`, `app/push_token_registration.ts` | push-токен, язык интерфейса, часовой пояс | после разрешения уведомлений |
| Распознавание речи | `expo-speech-recognition`; запись `app/speaking_hold_recorder.ts` → локальный whisper (пакета `whisper.rn` в сборке нет → системный распознаватель) | голос обрабатывает **ОС** (iOS — на устройстве, где доступно; Android — сервис Google по настройкам телефона); на наши серверы аудио **не уходит** | только в упражнении «говорение», после разрешения микрофона |
| Play Install Referrer | `app/_layout.tsx` ~2834 | из строки установки берётся ТОЛЬКО код приглашения друга (`ref=`) | первый запуск Android |
| YouTube (WebView) | `react-native-webview` | YouTube/Google сами ставят свои идентификаторы при просмотре | при просмотре видео |
| Resend / Gmail (сервер) | `functions/src/admin_email.ts`, `auth_recovery.ts` | email — для писем восстановления и поддержки | по запросу |
| ElevenLabs | только заранее озвученные фразы курса (`app/phrase_audio_url_map.generated.ts`) | **данных пользователей не получает** | — |
| SQLCipher (`expo-sqlite`), SecureStore | на устройстве | не уходит | — |
| Реклама / AD_ID / IDFA | `app.json` blockedPermissions: AD_ID, ADSERVICES_*; `NSUserTrackingUsageDescription` нет | — | **не используется** |

## 1. Google Play — Data safety

**Общие вопросы:**
- Собирает ли приложение или передаёт данные? — **Да.**
- Все данные шифруются при передаче? — **Да** (HTTPS/TLS: Firebase, RevenueCat, OpenAI, Expo push).
- Можно ли запросить удаление данных? — **Да**: в приложении (Настройки → Аккаунт → Удалить аккаунт) и по URL
  **https://knowlyapps.com/legal/data-deletion/** (см. §3).
- Независимая проверка безопасности (MASA) — **Нет** (не проходили).
- Приложение для детей (Families)? — **Нет**, 16+.

**Передача третьим лицам (shared):** — **Нет.** Firebase, RevenueCat, OpenAI, Expo, Resend работают как обработчики от нашего имени —
по правилам Play это «не передача». Данные не продаются. YouTube-плеер: ролик воспроизводит YouTube, он собирает данные сам по своей
политике (см. §4.6).

| Категория Play | Тип | Собирается | Обязательно? | Цели | Основание в коде / политике |
|---|---|---|---|---|---|
| Personal info | Name | Да | Необязательно (ник выбирает человек; имя от Google/Apple — только при входе) | App functionality, Account management | ник — профиль/друзья/рейтинг; §4, §5 |
| Personal info | Email address | Да | Необязательно (только при входе через Google/Apple) | Account management, App functionality | `auth_identity.ts`, поддержка; §4 |
| Personal info | User IDs | Да | **Обязательно** | App functionality, Account management, Fraud prevention, Analytics | Firebase uid, stable id; §3–4 |
| Financial info | Purchase history | Да | Необязательно (только при покупке) | App functionality, Account management | RevenueCat; §9 |
| App activity | App interactions | Да | **Обязательно** (прогресс) / аналитика — по согласию | App functionality, Analytics, Personalization | Firestore прогресс; Analytics/PostHog после согласия; §3, §10 |
| App activity | Other user-generated content | Да | Необязательно | App functionality | карточки, опубликованные наборы, жалобы, ответы опросов; §6, §8 |
| App activity | Other actions | Да | Необязательно | App functionality, Fraud prevention | друзья, рефералы (код из Install Referrer), реакции, голоса; §7–8 |
| Messages | Other in-app messages | Да | Необязательно | App functionality, Developer communications | сообщения в ИИ-диалогах, обращения в поддержку; §10–11 |
| App info and performance | Crash logs | Да | **Обязательно** | Analytics (стабильность) | Crashlytics; §10 |
| App info and performance | Diagnostics | Да | **Обязательно** | Analytics, App functionality | журналы ошибок/активности, техистория для обращения; §10 |
| App info and performance | Other app performance data | Да | По согласию | Analytics | события производительности; §10 |
| Device or other IDs | Device or other IDs | Да | **Обязательно** | App functionality, Analytics, Fraud prevention | push-токен, ID экземпляра Firebase, stable id; §10, §12 |
| Audio | Voice or sound recordings | **Нет** (решение — §4.3) | — | — | аудио не уходит на наши серверы |
| Location | — | **Нет** | — | — | часовой пояс для уведомлений — не местоположение |
| Contacts, Calendar, Photos, Files, Health, Financial (cards) | — | **Нет** | — | — | — |
| Web browsing, Search history | — | **Нет** | — | — | — |

«Обработка эфемерна?» — для сообщений ИИ-диалогов: **Нет** (хранится ограниченная история, §11); для остального — Нет.

## 2. App Store — App Privacy (Nutrition Labels)

**Отслеживание (Tracking): НЕТ** — данные не объединяются с чужими для рекламы, IDFA не используется, ATT-окна нет.

| Категория Apple | Тип | Собирается | Связано с человеком | Для отслеживания | Цели |
|---|---|---|---|---|---|
| Contact Info | Name | Да (ник; имя от Apple/Google при входе) | Да | Нет | App Functionality |
| Contact Info | Email Address | Да (только при входе) | Да | Нет | App Functionality |
| User Content | Other User Content | Да (карточки, наборы, жалобы, ответы опросов) | Да | Нет | App Functionality |
| User Content | Customer Support | Да (обращения из приложения) | Да | Нет | App Functionality |
| User Content | Other User Content — сообщения ИИ-диалогов | Да | Да | Нет | App Functionality |
| Identifiers | User ID | Да | Да | Нет | App Functionality, Analytics |
| Identifiers | Device ID | Да (push-токен, ID экземпляра) | Да | Нет | App Functionality, Analytics |
| Purchases | Purchase History | Да | Да | Нет | App Functionality |
| Usage Data | Product Interaction | Да (прогресс; аналитика — по согласию) | Да | Нет | App Functionality, Analytics, Product Personalization |
| Diagnostics | Crash Data | Да | Да | Нет | App Functionality, Analytics |
| Diagnostics | Performance Data | Да | Да | Нет | Analytics |
| Diagnostics | Other Diagnostic Data | Да | Да | Нет | App Functionality |
| Audio Data | — | **Нет** (решение — §4.3) | — | — | — |
| Location, Health, Financial Info (карты), Contacts, Browsing/Search History, Sensitive Info | — | **Нет** | — | — | — |

Third-party advertising, Developer's advertising — **не используются** ни в одной категории.

## 3. Ссылка на удаление аккаунта (Play требует URL)

- URL: **https://knowlyapps.com/legal/data-deletion/** — страница есть и открывается (проверено 12.10).
- Содержание: путь в приложении «Settings > Account > Delete account», email `support.phraseman@gmail.com` с темой «Delete My Data»,
  что удаляется/обезличивается, что может храниться (налоги, споры, мошенничество), подписка в сторе не отменяется сама.
- ⚠️ На сайте опубликована редакция **October 10**, в репозитории (`knowly-www/legal/data-deletion/`) — **October 12**; нужна выкладка сайта.
- ⚠️ На странице нет 14-дневного окна восстановления и правила для гостя (оба есть в политике §20 и в коде) — см. §4.2.

## 4. Расхождения «форма ↔ политика ↔ код» (решение — за кем)

1. **PostHog в стор-сборке — неизвестно, включён ли.** Ключа `EXPO_PUBLIC_POSTHOG_KEY` нет в `eas.json` и `.env*`; если он не задан
   переменными EAS на сервере сборки — PostHog выключен, и в формах его не отмечать отдельно (данные те же, что у Firebase Analytics).
   → **Владелец:** `eas env:list --environment production` и сказать, включён ли.
2. **Страница удаления короче политики:** нет 14 дней на восстановление для входа через Google/Apple и того, что гостевой аккаунт не
   восстанавливается, а серверные данные гостя удаляются не позднее конца 14 дней (политика §20, код `functions/src/account_delete_grace.ts`
   — `ACCOUNT_DELETE_GRACE_MS = 14 дней`). Play читает именно эту страницу. → **Владелец:** добавить абзац (текст можно взять из §20).
3. **Голос (Audio): решение «не собираем» требует подтверждения.** Аудио не уходит на наши серверы; распознаёт ОС (Android — сервис Google,
   iOS — на устройстве, где возможно). По правилам Play/Apple обработку системным сервисом обычно не декларируют как сбор разработчиком,
   но это толкование. → **Владелец:** подтвердить «Нет»; осторожный вариант — отметить «Voice recordings: собирается, эфемерно,
   необязательно, App functionality».
4. **Политика §13 неполна про озвучку:** там сказано, что озвучка только на устройстве (`expo-speech`), а карточки опубликованных наборов
   сообщества озвучиваются на сервере через OpenAI (`card_tts_worker.ts`) — текст карточек уходит в OpenAI. §6 говорит про проверку и
   перевод наборов, не про озвучку. Для форм это уже покрыто строкой «User-generated content / OpenAI как обработчик».
   → **Владелец:** одно предложение в §13 или §6: «Card text of published Community Packs may be sent to our AI provider to generate audio».
5. **Строки назначения iOS без функции:** `NSPhotoLibraryUsageDescription`, `NSFaceIDUsageDescription`, `NSMotionUsageDescription` есть в
   `app.json`, а кода выбора фото, Face ID и датчиков движения нет (SecureStore с `requireAuthentication: false`). Политика §13 объясняет
   камеру/движение библиотеками, про фото и Face ID — нет. Ревью Apple может спросить. → **Ядро/координатор:** убрать лишние ключи
   или подтвердить, какая библиотека их требует.
6. **YouTube-плеер:** ролики проигрывает YouTube в WebView, он собирает данные сам (политика §16 это раскрывает). В формах Play/Apple
   это не наш сбор; если ревью спросит — ссылка на §16.
7. **E24 устарело в одном месте:** «токен аттестации» в Device IDs — App Check снят 01.10, в формах его НЕ указывать.
8. **Сайт с политикой и условиями отстаёт:** опубликованы October 10 / September 1, в репозитории — October 12 (сообщено координатору ранее).
   Ссылка в формах сторов должна вести на актуальную политику. → **Владелец:** выкладка hosting `knowly-www`.
9. **Запись выбора согласий** (аналитика, ИИ — granted/denied, версия, платформа) хранится в облаке; политика §2 звучит как «только
   возраст» (абзац для §2/§18 передан владельцу 12.10). На формы не влияет (это часть App activity / User IDs).
10. **Сетевой снимок не делался:** все выводы — по коду. Перед отправкой форм желательно один прогон стор-сборки с прокси
    (что реально уходит) — NOT_RUN.
