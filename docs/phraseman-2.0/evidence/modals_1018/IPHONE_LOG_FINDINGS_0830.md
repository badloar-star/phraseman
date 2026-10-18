# Разбор консольного журнала сборщика с iPhone владельца, 08:30–09:10 (18.10, Сверка)
Источник: .expo/metro-console.log (3,2 МБ, строки с 08:27; после 09:10 файл не растёт — журнал остановился), 23 284 строки с 08:30. Устройство — iPhone (вход через Apple, ~772 упоминаний iOS). Эмулятор в этот журнал не пишет (его строки идут через logcat). Счётчики: ERROR 107 (из них настоящих 4 — остальное метка ERROR-JOURNAL-THROTTLE), WARN 4288 (в основном трассы старта), permission-denied 8, JSON Parse 44.

## 🔴 Настоящие ошибки
1. 08:45:53, 08:51:18, 09:00:52 — ERROR «Cannot update a component (HomeScreen) while rendering a different component (LangProvider)». Стек: LangContext.tsx useState(initialLangFromPeekOrDevice) → ui_lang_resolved.ts publishResolvedUiLang → app/spire_tab_flag.ts subscribeResolvedUiLang → notify → sync (setState у подписчика Главной) — публикация языка в инициализаторе useState запускает setState чужого компонента во время рендера. Повторяется на каждом старте (3 раза за 15 мин). Причина найдена по стеку, не гадание; правка — вынести publishResolvedUiLang из useState-инициализатора (в эффект/после монтирования). Владелец: Ядро/Язык.
2. 09:03:31 — ERROR SyntaxError app/lingman_videos.tsx: Unexpected keyword 'import' (53:0) — красный экран сборщика на iPhone (чужая незавершённая правка; пропала сама — на 09:10 сборка идёт). Повод проверить, что файл не уехал в коммит с таким состоянием (скобка/запятая над строкой 53).
3. 08:46:51 — JS-STALL: поток стоял 23 964 мс (экран онбординга, шаг «name», маршрут /account_details; heapMb 128, 333 GC за 401 мс). 23,9 с без ответа UI — пользователь видит зависание. Рядом 08:41:22 — 4333 мс; 08:50:49 — 3463 мс; 08:40:53/08:50:31/08:51:37 — по ~2,1–2,2 с. Всего 332 строки [JS-STALL], более 1,5 с — ~20 раз.

## 🔴 Вход Apple/Google на iPhone (поток владельца)
Последовательность [AUTH-LINK-GOOGLE] (8 попыток, 08:40:57–08:48:46):
- 08:41:04 — Apple, native ok, link conflict code=auth/email-already-in-use (expected) → branch account_switch_required, clean_proof decision=not_clean (dirty 46, progress 26).
- 08:41:39 и 08:47:45 — firebase failed code=auth/unknown (handoffMarker=true, 7030 и 6449 мс).
- 08:41:47, 08:41:59 (Google), 08:42:53 (Google), 08:48:39 (Google), 08:48:46 (Apple) — firebase failed code=provider_handoff_active (handoffMarker=false, 5,4–8,7 с каждая).
- 08:46:17 — swap merge_skipped_fallback (google), PROFILE-FLIP cleared (08:41:28 и 08:46:17).
- Итог: вход не завершился ни разу за 8 попыток; пользователь получил 5–8 с ожидания на каждую. Нужен разбор Авторизации: почему после первого auth/unknown маркер handoff остаётся активным (provider_handoff_active ×5 — повтор блокируется предыдущей неудачей).

## 🟡 local_account_data: JSON Parse error (44 строки, 08:41:04–08:48:46)
Метка [WARNING] local_account_data:parsed: JSON Parse error: Unexpected character: X (X = p, l, b, c, a, 3, e … — первые символы НЕ-JSON значений). Пачками по 3–10 в момент входа/смены аккаунта (08:41:04 ×8, 08:41:38/47/59 ×3, 08:42:53 ×3, 08:45:49 ×4, 08:47:44 ×10, 08:48:39 ×5, 08:48:46 ×5) — при clean_proof читаются ключи хранилища (allKeys 265, selected 2257, dirty 15–46), и часть значений — обычные строки («p…», «l…», «b…»), а парсится как JSON. Значит читатель local_account_data парсит строковые ключи без разбора типа; безвредно по последствиям (warn), но шум 44 раза за вход и риск потерять значения, если выбросом считаются «битыми».

## 🟡 permission-denied (8 строк)
08:41:31, 08:45:54, 08:46:19 — [MEM-TICK] чтение Firestore упало: firestore/permission-denied (query/doc); [DIAG] swallowed screen=app_messages op=refreshAppMessagesSnapshotOnce (дважды: trace mvdiod3z-001, mvdiujso-002); 08:45:54 — auth_provider getLinkedAuthInfo Firestore timeout/error → auth backup. Всё в окна смены аккаунта (пока токен ещё анонимный/меняется): чтение app_messages без прав. 💸 каждое такое чтение платное и бесполезное — пережидать смену аккаунта или читать после стабилизации uid.

## 🟡 Прочее
- 08:55:11–09:10:16 — [WARNING] ai_consent_factory:previous: UNAUTHENTICATED ×8: чтение согласия на ИИ без авторизации (после выхода/смены аккаунта).
- 08:43:33, 08:45:38 — NicknameEditModal:checkAvailabilityStatus: availability_status_error ×2 (проверка ника не ответила).
- 08:45:55 — _layout:bootstrap_deadline: bootstrap_exceeded_1000ms (старт приложения не уложился в потолок 1 с).
- 08:39–09:10 — [FIRESTORE-FIRST-TOUCH] installed default:locked(TypeError) getFirestore:locked(TypeError) ×13 — это LOG на каждом старте (ms≈92–94 млн), не краш; но слово TypeError в журнале маскирует настоящие ошибки при поиске.
- [ERROR-JOURNAL-THROTTLE] (≈90 строк) — журнал ошибок по языкам de/en/es/fr/it, источник=диск, ageMs≈2,2–3,3 ·10⁸ мс (протухла), «подтверждено=0»: выгрузка идёт, но 0 подтверждено по 4 языкам (en 1 подтверждено в 08:56:08), «осталось ≈2·10⁷ мин» (осталось до повтора — число похоже на мс в минутах: 21 578 836 м… ≈ 41 год) — ✱ вероятная ошибка единиц в подписи «осталось … мин» (ждёт проверки автора).
- Журнал остановился на 09:10:18 — после этого iPhone в журнал не пишет.

## Что не нашлось
Unhandled Promise 0, Invariant 0, ReferenceError 0, RedBox/Render Error 0, красных экранов кроме SyntaxError 09:03.
