# PM-250 — таблица соответствия: сторы (Data Safety / App Privacy) ↔ код и SDK

Дата: 2026-10-01. Метод: `package.json` (зависимости), `app.json` / `app.config.js` (разрешения, плагины), чтение кода по месту. Публикация в консолях Google Play и App Store Connect — ТОЛЬКО владелец (в коде это не делается). Это таблица для заполнения, не подтверждение «уже заполнено».
Прежняя памятка: `docs/reports/legal_compliance_deploy_checklist_2026-06-29.md` §4 — устарела по голосу/Арене/жемчугу (см. «Изменилось с июня»).

## 1. SDK и сервисы, реально собирающие данные

| SDK / сервис | Откуда | Какие данные | Условие | Куда в декларации |
|---|---|---|---|---|
| Firebase Auth (аноним + Google + Apple) | `@react-native-firebase/auth`, `google-signin`, `expo-apple-authentication` | идентификатор пользователя, email/имя при входе через Google/Apple | всегда (аноним) / по входу | Personal info (email, name), User IDs |
| Cloud Firestore / Functions | `@react-native-firebase/firestore`, `functions` | прогресс, карточки, профиль (ник, аватар-монета), друзья, Шпиль, избранные видео, список блокировок, жалобы, согласия | всегда при облаке | App activity, User content (карточки, наборы), Other user-generated content |
| Firebase Crashlytics | `app/_layout.tsx:1874` включён всегда | сбои, трассировки, устройство | без согласия (строго необходимое) | App info and performance → Crash logs, Diagnostics |
| Firebase Analytics | `app/firebase.ts:55`, `app/analytics_consent.ts` | события использования, идентификатор приложения | ТОЛЬКО после согласия | App activity, Device or other IDs |
| PostHog (EU-хост) | `app/posthog_client.ts` | продуктовые события, идентификатор | ТОЛЬКО после согласия; ключ задаётся env — проверить, что в стор-сборке он задан или нет | App activity |
| RevenueCat | `react-native-purchases` | история покупок, статус подписки, app user id | при покупке/проверке прав | Purchase history; не «Tracking» |
| Firebase App Check (Play Integrity / App Attest) | `app/app_check_init.ts`, `app/config.ts:66`, `app/_layout.tsx:1876` | токен аттестации устройства | в стор-сборке — да; сервер не требует (запломбировано) | Device or other IDs / Security (оставить, пока код жив). **Проект-конфликт**, см. §4 |
| Push (expo-notifications / FCM) | `expo-notifications`, `app/push_token_registration.ts` | токен устройства | после разрешения | Device or other IDs |
| Распознавание речи | `expo-speech-recognition`, микрофон `RECORD_AUDIO` (`app.json`) | голос → системное распознавание (Google/Apple), на iOS по возможности на устройстве; `whisper.rn` — на устройстве | по запросу пользователя | Audio: «Voice or sound recordings» — только если звук уходит с устройства (системное распознавание: уходит к провайдеру платформы). Решение: объявлять «Collected, not linked, функционал приложения» |
| OpenAI (серверный) | функции Диалоги V2, разбор ошибок, озвучка карточек (D128) | текст сообщений, текст карточек опубликованных наборов, без идентификаторов | при использовании ИИ | User content (сообщения), Shared with third party: OpenAI |
| Play Install Referrer | `react-native-play-install-referrer` | источник установки (Android) | при первом запуске | App activity / Device IDs (атрибуция) |
| WebView / YouTube | `react-native-webview` | воспроизведение ролика; YouTube ставит свои идентификаторы | при просмотре | отметить как сторонний контент; Tracking = No (наши данные для рекламы не передаются) |
| SQLCipher (expo-sqlite) | `app.config.js:161` | на устройстве, не уходит | — | Не декларируется (локально) |
| Реклама / AD_ID | `app.json` blockedPermissions: AD_ID, ADSERVICES_* заблокированы | — | — | AD_ID НЕ декларировать |

Разрешения Android (`app.json:73-79`): INTERNET, RECEIVE_BOOT_COMPLETED, VIBRATE, POST_NOTIFICATIONS, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS. Заблокированы: AD_ID, ADSERVICES_*, READ/WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW.

## 2. Что значит для полей деклараций

Google Play Data Safety:
- Personal info: email, имя (вход Google/Apple, необязательно); User IDs.
- Financial info: покупки (история через магазин/RevenueCat); платёжные карты мы не получаем.
- App activity: прогресс, события (после согласия), Spire, друзья, избранные видео.
- App info and performance: сбои, диагностика.
- Device or other IDs: идентификатор приложения, токен push, токен аттестации.
- User content: карточки, опубликованные наборы, сообщения ИИ, жалобы.
- Audio: речь при практике произношения — проверить по фактическому пути (системное распознавание).
- Шифрование при передаче: да. Запрос на удаление: https://knowlyapps.com/legal/data-deletion/ (проверить, что открывается — владелец).
- Данные не продаются; AD_ID не объявлять.

Apple App Privacy:
- Linked to You: Contact info (email), Identifiers (User ID, Device ID), Purchases, User content, Usage data, Diagnostics.
- Tracking: No (IDFA не используется; `NSUserTrackingUsageDescription` в проекте нет — проверено `app.json`/`app.config.js`).
- Микрофон и распознавание речи: строки назначения есть (`app.config.js:134`, `app.json:109`).

## 3. Изменилось с июня (чего больше НЕТ — убрать из деклараций, если стоит)
- Голосовые звонки и «минуты голосового репетитора» (раздел MAX законсервирован, функции сняты с деплоя). `react-native-webrtc`, `react-native-incall-manager`, `@fugood/react-native-audio-pcm-stream` остаются в пакете — это код под пломбой, не работающая функция; если после сборки нативные библиотеки попадают в бандл, декларация по звуку должна опираться на реальный путь (распознавание речи), а не на звонки.
- Арена, турниры, подарки, XP, жемчуг — данные этих функций не собираются клиентом 2.0.
- Новые данные 2.0: Spire (результаты недели), избранные видео, список блокировок, «Привет» (окно тишины), хранилище Account V2.

## 4. Расхождения и риски
1. **App Check:** клиент всё ещё запрашивает аттестацию устройства в стор-сборке, при том что проект запломбирован «App Check не используется». Либо снять (отдельной сессией по CLAUDE.md), либо оставить и честно декларировать «Device or other IDs». Решение координатора/владельца.
2. **TTL 90 дней** журналов ошибок/активности в коде не реализован — в декларациях «срок хранения» не указывать числом.
3. **Ключ PostHog:** не проверялось, задан ли `EXPO_PUBLIC_POSTHOG_KEY` в `eas.json` стор-профиля — владельцу сверить; если не задан, PostHog в сторах не декларировать.
4. Опубликованная Privacy всё ещё описывает удалённое (Shards, Arena, voice tutor) — декларации в сторах не должны ссылаться на старый текст; обновить политику до правок деклараций.
5. Аппаратные проверки (что реально уходит по сети) на устройстве не выполнялись — NOT_RUN.

## 5. PM-250-A1 «Нет копирования брендов/ассетов»
Автоматически не доказывается. Что можно проверить кодом: нет сторонних брендов в именах ассетов. Что требует человека: визуальное сравнение экранов 2.0 с интерфейсами других приложений и источник каждого изображения (D69: старые изображения удалены, остаются новые ассеты главной и 20 изображений рангов монет — их происхождение/лицензию подтверждает владелец). Статус: NOT_MET.

## Итог критериев
- PM-250-A1 — NOT_MET (нужен владелец: источник/лицензии ассетов и визуальная сверка).
- PM-250-A2 — NOT_MET: таблица готова, но декларации в консолях заполняет владелец; два расхождения (App Check, TTL) открыты.
