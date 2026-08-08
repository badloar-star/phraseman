# Тир «Max»: живой голосовой репетитор — план внедрения

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (рекомендуется) или superpowers:executing-plans — исполнять задача-за-задачей, чекбоксы `- [ ]` для трекинга. Этапы 0 и 1 расписаны до шагов; для этапов 2–4 исполнитель генерирует пошаговый под-план из этого документа ПОСЛЕ спайка (этап 1), потому что детали транспорта фиксируются спайком.

**Goal:** Разговор с ИИ-репетитором голосом с задержкой ответа ≤1.2 с (перебивания работают), замкнутый на тренажёр (звонок → слабости → SRS → следующий звонок), продаваемый как подписка Max с капом минут. Параллельно — существующие текстовые диалоги ускоряются с 4–12 с до ~1–2 с и получают человеческий голос.

**Architecture:** Телефон соединяется с OpenAI Realtime (модель `gpt-realtime-mini`, речь-в-речь) напрямую по WebRTC — Firebase в звонке не участвует. Firebase Functions делают три вещи: минтят одноразовый ephemeral-токен (постоянный ключ никогда не на клиенте), ведут квоты/метринг минут (2 записи на звонок), и делают дешёвый пост-разбор транскрипта обычной текстовой моделью. Существующие диалоги отдельно получают SSE-стриминг и серверный TTS.

**Tech Stack:** `react-native-webrtc` + `@config-plugins/react-native-webrtc` + `react-native-incall-manager` (Expo 54 dev build, newArch), OpenAI Realtime API (`/v1/realtime/client_secrets`), `gpt-4o-mini-tts`, Firebase Functions v2, RevenueCat (entitlement `max`).

---

## 0. Решения владельца (зафиксированы 2026-08-02)

| Вопрос | Решение |
|---|---|
| Цены сейчас | Plus €4.99/мес, €29.99/год; Pro (lifetime, разовая) €99.99 |
| Кап минут в Max | **Да** (значение — ручка, старт 10 мин/день, см. §2) |
| Образ собеседника | **Орб/волна** (без персонажа-лица) |
| Бесплатный пробный звонок | **Да** |
| Текущий устный разбор речи | **НЕ ТРОГАТЬ. Работает хорошо. Запретная зона.** |

**⛔ Запретная зона (ни одна задача плана не правит эти файлы):**
`components/SpeakingPanel.tsx`, `app/speaking_neural_judge.ts`, `functions/src/pronunciation_scoring_core.ts`, `app/speaking_recognition_options.ts`, `app/personal_plan_speech_module.ts`. Пост-разбор звонка (этап 3) — полностью отдельный новый модуль.

**Открытые решения (утвердить до этапа 2, рекомендации проставлены):**
1. Цена Max — рекомендация **€12.99/мес, €79.99/год** (×2.6 от Plus; нетто после комиссии стора 15% ≈ €11.04/€5.67 в мес).
2. Кап — рекомендация **10 мин/день** (ручка в конфиге, поднимем по телеметрии).
3. Lifetime Pro и Max — рекомендация: **Max в Pro НЕ входит** (разовый платёж не может покрывать вечные поминутные расходы); владельцам Pro — разовый приветственный пакет 30 минут.
4. Пробный звонок — рекомендация: **1 звонок × 3 мин в календарный месяц** всем без Max.

## 1. Почему так (диагноз, кратко)

Сейчас: отпускание кнопки → фикс-таймер 1.2 с → холодный старт функции (minInstances: 0; 1–5 с) → 2 последовательные транзакции Firestore → OpenAI **без стриминга** (2–6 с до последнего токена) → озвучка системным роботом `expo-speech`. Итого 4–12 с. Качественный TTS-пайплайн (голос fable) в проекте есть, но привязан к статичной карте фраз уроков — LLM-реплики в неё не попадают никогда.

Duolingo маскирует такую же задержку Rive-анимацией («Лили задумалась»); Speak решает честно — OpenAI Realtime API. Мы идём путём Speak + наш козырь: память слабых слов и замкнутый цикл с тренажёром.

## 2. Экономика и ручки

Все ручки — в Firestore `admin_runtime_config` (по образцу `admin_runtime_config/openai_dialog_model`) + тумблеры в `admin/v2/legacy.html` (единственная рабочая админка):

| Ручка (док/поле) | Старт | Зачем |
|---|---|---|
| `max_call/model` | `gpt-realtime-mini` | смена модели без релиза |
| `max_call/enabled` | `false` | **kill switch** — мгновенно закрыть минт токенов, если расходы взорвутся |
| `max_call/dailyCapSec` | `600` (10 мин) | кап минут/день Max |
| `max_call/trialSecPerMonth` | `180` | пробный звонок |
| `max_call/maxMintsPerDay` | `12` | анти-абьюз потолок сессий |
| `max_call/shardsPerTenMin` | `25` | курс докупки минут жемчужинами |
| `openai_dialog_model/voiceRepliesPerDay` | `60` | кап серверного TTS в Plus-диалогах |
| `openai_dialog_model/streamingEnabled` | `false→true` | флаг SSE-стриминга с откатом |

Себестоимость (реальные цены 2026-08): `gpt-realtime-mini` ≈ **$0.02–0.05/мин** разговора. Типичный Max-пользователь 100–200 мин/мес → **$2–10**; потолок при капе 10 мин/день (~300 мин) → $6–15. Годовой тяжёлый пользователь — маржа тонкая, это осознанно принято (ограничено капом; хвост монетизируется жемчужинами). Пробный: ≤$0.15/пользователь/мес. Серверный TTS в диалогах: ~$0.002/озвучка, при капе 60/день ≤$3.6/мес у супертяжёлого Plus. Кэш инструкций Realtime (cached input $0.40/1M) включён по умолчанию — длинные сессии дешевеют.

Firebase-нагрузка: звонок идёт **мимо** Firebase; на звонок — 1 вызов минтера + 2 записи Firestore (старт/финиш), 0 листенеров. Пост-разбор — 1 вызов функции + 1 запись.

## 3. Метрики успеха

- p50 «конец моей реплики → первый звук ответа» в звонке ≤ 1.2 с; в текстовых диалогах после этапа 0: первый токен ≤ 1.5 с (тёплый), первый звук голоса ≤ 2.5 с.
- Доля активных, попробовавших пробный звонок; конверсия trial→Max; ср. минут/подписчика; COGS ≤ 35% нетто-выручки Max; W1-возврат к звонкам.
- Телеметрия: PostHog-события `max_call_start/end/paywall_shown/trial_used` + суточный счётчик минут в Telegram-дайджест (только количества, без PII — правило проекта).

---

# ЭТАП 0 — «Турбо-диалоги» (Plus, 1–2 дня, независим от Max; можно вести параллельной сессией)

### Task 0.1: Прогрев premiumDialogSend

**Files:** Modify: `functions/src/premium_dialog.ts:592-599` (конфиг onCall)

- [ ] В объект опций `onCall` добавить `minInstances: 1` с комментарием `// зачем: холодный старт давал 1–5 с тишины в диалоге; турнирные функции уже греются так же`. `premiumDialogTranslate`/`premiumDialogReview` оставить на 0 (не на критическом пути первого звука).
- [ ] Прогнать тесты функций: `cd functions && npx jest --runTestsByPath src/premium_dialog.test.ts` (если файла нет — `npx tsc -p functions --noEmit`). Expected: зелено/чисто.
- [ ] Деплой: `firebase deploy --only functions:premiumDialogSend`. Проверить в консоли, что инстанс держится тёплым.
- [ ] Commit: `git add functions/src/premium_dialog.ts && git commit -m "perf(dialog): minInstances=1 — убрать холодный старт из голосового диалога"`

### Task 0.2: SSE-стриминг реплики

**Files:** Create: `functions/src/premium_dialog_stream.ts`, `app/ai_dialog_stream_client.ts` · Modify: `functions/src/premium_dialog.ts` (экспорт общих хелперов), `functions/src/index.ts` (регистрация), `app/ai_dialog_client.ts`, `app/ai_dialog_session.tsx`, `app/ai_companion_session.tsx`

Принцип: **не трогаем работающий callable** — он остаётся фолбэком. Рядом появляется `onRequest`-эндпоинт `premiumDialogSendStream`, включаемый флагом `streamingEnabled`.

- [ ] Investigation-шаг (≤30 мин): поддерживает ли `@react-native-firebase/functions@21.14` стриминговые callable (`.stream()`). Да → использовать их вместо SSE (меньше кода, тот же протокол ниже). Нет (ожидаемо) → SSE.
- [ ] Вынести из `premium_dialog.ts` в экспортируемые хелперы сборку промпта и пре-чеки (они уже функции: `buildMemoryBlock`, enforce-цепочка) — только `export`, без изменения логики. Проверка: `npx tsc -p functions --noEmit`.
- [ ] Написать `premium_dialog_stream.ts` — onRequest (us-central1, 512MiB, `minInstances: 1`, timeout 60 c):

```ts
// зачем: реплика должна появляться пословно — ждать весь ответ было главной задержкой диалога
export const premiumDialogSendStream = onRequest({ region: 'us-central1', memory: '512MiB', minInstances: 1, timeoutSeconds: 60 }, async (req, res) => {
  const idToken = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const decoded = await admin.auth().verifyIdToken(idToken); // 401 при ошибке
  await verifyAppCheckSoft(req.headers['x-firebase-appcheck']); // мягко: лог, не блок (как в остальных функциях)
  // те же пре-чеки, что в premiumDialogSend (общие хелперы), тот же биллинг
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  const upstream = await fetch(OPENAI_CHAT_URL, { method: 'POST', headers: openAiHeaders, body: JSON.stringify({ ...payload, stream: true }) });
  for await (const chunk of upstream.body) {          // перекладываем дельты как есть
    res.write(chunk);                                  // клиент парсит SSE-строки сам
  }
  res.end();
});
```

- [ ] Клиент `app/ai_dialog_stream_client.ts`: `import { fetch } from 'expo/fetch'` (Expo 54 — поток есть), читать `ReadableStream`, парсить `data:`-строки, отдавать наружу колбэк `onDelta(text)`; собрать «конверт» игрового режима из финального сообщения так же, как сейчас. Заголовки: `Authorization: Bearer <getIdToken()>`.
- [ ] В `ai_dialog_session.tsx` / `ai_companion_session.tsx`: при флаге `streamingEnabled` использовать стрим-клиент; пузырь ответа появляется пустым сразу и наполняется дельтами; любая ошибка стрима → прозрачный откат на старый callable (пользователь видит просто чуть медленнее, не ошибку). Guard от гонок: у каждого запроса requestId, поздние дельты отменённого запроса игнорируются.
- [ ] Тест: `tests/ai_dialog_stream_client.test.ts` — парсер SSE-строк на фикстуре из 3 чанков (чистая функция парсинга выносится и тестируется без сети). Прогон: `npx jest --runTestsByPath tests/ai_dialog_stream_client.test.ts --runInBand`.
- [ ] Ручная проверка на устройстве: первый токен ≤1.5 с; выключить флаг в админке → работает по-старому.
- [ ] Commit: `git add functions/src/premium_dialog_stream.ts functions/src/premium_dialog.ts functions/src/index.ts app/ai_dialog_stream_client.ts app/ai_dialog_client.ts app/ai_dialog_session.tsx app/ai_companion_session.tsx tests/ai_dialog_stream_client.test.ts && git commit -m "feat(dialog): SSE-стриминг реплик за флагом — первое слово вместо ожидания всего ответа"`

### Task 0.3: Живой голос вместо робота (серверный TTS)

**Files:** Create: `functions/src/premium_dialog_voice.ts`, `app/ai_reply_voice.ts` · Modify: `functions/src/index.ts`, `app/ai_dialog_session.tsx` (`speakAiReply`), `app/ai_companion_session.tsx` (тап-озвучка)

**Не трогаем** `hooks/use-audio.ts` (общий с уроками) — новый модуль поверх.

- [ ] `premium_dialog_voice.ts` — onRequest (256MiB, minInstances 0): auth как в 0.2 → инкремент счётчика `ttsCount` в СУЩЕСТВУЮЩЕМ доке квоты `premium_dialog_quotas` (та же транзакция, что дневная квота — 0 новых чтений; отказ при превышении `voiceRepliesPerDay`) → `POST /v1/audio/speech` `{ model: 'gpt-4o-mini-tts', voice: 'fable', input: text, instructions: 'Спокойный дружелюбный темп, чуть медленнее обычного' }` → pipe тела в ответ `audio/mpeg`.
- [ ] `app/ai_reply_voice.ts`: скачать во временный файл (`expo-file-system`, кэш-директория, удалять после проигрывания), проиграть через `expo-audio`; экспорт `speakAiReplyServer(text): Promise<boolean>` — `false` при любой ошибке/таймауте 4 с.
- [ ] В `speakAiReply` (ai_dialog_session.tsx:772) и тап-озвучке компаньона: сначала `speakAiReplyServer`, при `false` — прежний `expo-speech` (робот остаётся фолбэком, немоты не бывает). В связке со стримингом 0.2: TTS запрашивается, как только пришло первое законченное предложение, а не весь ответ.
- [ ] Тест функций: `functions/src/premium_dialog_voice.test.ts` — мок fetch: превышение капа → 429; happy path → заголовок audio/mpeg. Прогон: `cd functions && npx jest --runTestsByPath src/premium_dialog_voice.test.ts`.
- [ ] Ручная проверка: голос в диалоге — человеческий (тот же fable, что в уроках), старт звука ≤2.5 с от отправки.
- [ ] Commit: `git add functions/src/premium_dialog_voice.ts functions/src/premium_dialog_voice.test.ts functions/src/index.ts app/ai_reply_voice.ts app/ai_dialog_session.tsx app/ai_companion_session.tsx && git commit -m "feat(dialog): человеческий голос ответов (gpt-4o-mini-tts) с фолбэком на системный"`

### Task 0.4: Убрать фикс-таймер 1.2 с после отпускания кнопки

**Files:** Modify: `app/ai_dialog_session.tsx:111` и обработчики `handleMicPressOut`

- [ ] Заменить безусловное ожидание `CONVERSATION_SEND_GRACE_MS` на условное: если финальный результат распознавания уже получен к моменту отпускания — отправлять немедленно; таймер остаётся только как потолок ожидания финализации. Guard: не отправлять дважды (requestId/флаг inFlight уже есть).
- [ ] Ручная проверка на iOS и Android: быстрая речь не обрезается (10 реплик подряд), выигрыш ~1 с на реплику.
- [ ] Commit: `git add app/ai_dialog_session.tsx && git commit -m "perf(dialog): отправка сразу по готовности распознавания вместо фикс-паузы 1.2с"`

### Task 0.5: Одна транзакция пре-чеков вместо двух

**Files:** Modify: `functions/src/premium_dialog.ts` (`enforceRateLimit` + `enforceDailyQuota`)

- [ ] Объединить рейт-лимит и дневную квоту в один док/одну транзакцию (поля обоих счётчиков в доке квоты). Минус ~200–400 мс и минус операции. Старые доки рейт-лимита — игнорировать (TTL/мусор, миграции не нужно).
- [ ] Прогнать тесты функций + `npx tsc -p functions --noEmit`.
- [ ] Commit: `git add functions/src/premium_dialog.ts && git commit -m "perf(dialog): рейт-лимит и квота в одной транзакции"`

**Приёмка этапа 0:** тёплый p50 «отправил → первый токен» ≤1.5 с; «отправил → первый звук» ≤2.5 с; флаги позволяют откатить каждое изменение отдельно; `npm run audit:no-visible-loading` зелёный.

---

# ЭТАП 1 — Спайк звонка (3–5 дней, критический путь Max)

Цель спайка: на двух реальных устройствах (iPhone + Android) получить звонок с p50 ≤1.2 с и рабочими перебиваниями, замерить реальный COGS в OpenAI dashboard. Спайк фиксирует транспорт; под-планы этапов 2–4 генерируются после него.

### Task 1.1: Нативные зависимости и конфиг (audio-only)

**Files:** Modify: `package.json`, `app.json`

- [ ] `npm i react-native-webrtc @config-plugins/react-native-webrtc react-native-incall-manager`
- [ ] `app.json` → plugins: `["@config-plugins/react-native-webrtc", { "cameraPermission": false }]` — точную форму опций сверить с README плагина на момент установки; **камера не нужна**: в `android.blockedPermissions` добавить `android.permission.CAMERA`, НЕ добавлять `NSCameraUsageDescription` (iOS-описания микрофона уже покрывают звонок: «…вести голосовой диалог с ИИ-собеседником»).
- [ ] Пересборка dev-клиента: `npm run dev` (Android) и `npm run ios`. **Риски сборки, проверяемые именно этим шагом:** newArchEnabled: true + RN 0.81 (webrtc ≥124 через interop), iOS `useFrameworks: "static"` + бинарный WebRTC.xcframework. Не собирается за полдня → запасной транспорт: WebSocket + PCM (в проекте уже есть `@fugood/react-native-audio-pcm-stream`), но приоритет — WebRTC (родное эхоподавление и джиттер-буфер).
- [ ] ⚠️ Нативный модуль ⇒ **OTA-обновления это не доставят**: только store-билд, bump `runtimeVersion`. В релизном чеклисте этапа 4.
- [ ] Commit: `git add package.json package-lock.json app.json && git commit -m "feat(max): нативные зависимости звонка (webrtc, incall-manager), audio-only"`

### Task 1.2: Минтер ephemeral-токена

**Files:** Create: `functions/src/max_call_token.ts`, `functions/src/max_call_token.test.ts` · Modify: `functions/src/index.ts`

- [ ] Тест первым (`max_call_token.test.ts`, мок fetch + мок Firestore как в соседних тестах функций): (а) `enabled:false` → ошибка `failed-precondition`; (б) не-Max без остатка пробных → `permission-denied`; (в) happy path Max → возвращает `{clientSecret, expiresAt, sessionBudgetSec}` и передаёт в OpenAI instructions с «терпеливым» промптом. Прогон: `cd functions && npx jest --runTestsByPath src/max_call_token.test.ts`. Expected: FAIL (модуля нет).
- [ ] Реализация `mintMaxCallToken` — onCall (us-central1, 256MiB, minInstances 0, timeout 15 c):

```ts
// зачем: постоянный ключ OpenAI не должен попадать на клиент; квота минут решается ДО звонка
export const mintMaxCallToken = onCall({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 15 }, async (req) => {
  const uid = requireAuth(req);
  const cfg = await readMaxCallConfig();            // admin_runtime_config/max_call, 1 чтение с кэшем в инстансе
  if (!cfg.enabled) throw new HttpsError('failed-precondition', 'max-call-disabled');
  const grant = await reserveCallBudget(uid, cfg);  // одна транзакция: entitlement/trial, secondsLeft, mintsToday++
  const instructions = buildCallInstructions({      // сервер собирает промпт сам — клиент промпт НЕ передаёт
    scenarioId: validateScenarioId(req.data?.scenarioId),          // только из белого списка каталога
    weakWords: sanitizeWeakWords(req.data?.weakWords),             // ≤8 строк, ≤40 симв., [a-zA-Z' -]
    patientMode: req.data?.patientMode === true,                   // медленнее и проще
  });
  const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST', headers: openAiHeaders,
    body: JSON.stringify({ expires_after: { anchor: 'created_at', seconds: 600 },
      session: { type: 'realtime', model: cfg.model, instructions, audio: { input: { noise_reduction: { type: 'far_field' } } } } }),
  });                                                // точную форму body сверить с актуальной докой Realtime на шаге реализации
  ...
  return { clientSecret, expiresAt, sessionBudgetSec: grant.secondsLeft };
});
```

- [ ] Тесты зелёные; `npx tsc -p functions --noEmit`.
- [ ] Commit: `git add functions/src/max_call_token.ts functions/src/max_call_token.test.ts functions/src/index.ts && git commit -m "feat(max): минтер ephemeral-токена с квотами и серверной сборкой промпта"`

### Task 1.3: Экран звонка

**Files:** Create: `app/max_call_session.tsx` (тонкий экран), `app/max_call_state.ts` (чистый редьюсер состояний), `app/max_call_webrtc.ts` (обёртка соединения), `app/max_call_orb.tsx` (орб) · Test: `tests/max_call_state.test.ts`

- [ ] Тест редьюсера первым: состояния `preview → connecting → live → ending → summary`, события (tokenReady, connected, budgetWarning60s, budgetExhausted, dropped, reconnectFailed, userEnded); гонка «poздний connected после ending» игнорируется. Прогон: `npx jest --runTestsByPath tests/max_call_state.test.ts --runInBand`. Expected: FAIL → реализация → PASS.
- [ ] `max_call_webrtc.ts`: `getUserMedia({audio:true})` → `RTCPeerConnection` → data channel `oai-events` → SDP-offer POST на Realtime-эндпоинт с Bearer ephemeral (точный URL — по актуальной доке, сверить на реализации) → удалённый аудиотрек в плеер. `InCallManager.start({media:'audio'})` + `setForceSpeakerphoneOn(true)`. Парсинг событий data channel: транскрипты входа/выхода, VAD-события — копим массив для этапа 3.
- [ ] `max_call_session.tsx`: превью (skeleton с финальной геометрией, кнопка «Позвонить», выбор сценария из каталога) — **токен префетчится на маунте превью** (optimistic: по тапу соединение уже готово, тап = мгновенный переход в connecting без спиннера на весь экран); live (орб + таймер остатка минут, предупреждение «последняя минута» за 60 с, мягкое завершение по бюджету); первая реплика собеседника — короткая скриптованная (гасит известный iOS-баг эхоподавления первых ~10 с); разрыв сети → 1 автопереподключение → вежливое завершение с сохранением транскрипта.
- [ ] `max_call_orb.tsx`: reanimated-worklet, амплитуда из аудиостатистики в sharedValue (опрос ≤10 Гц, анимация целиком на UI-треде), микрореакция на голос пользователя <200 мс. Никаких обводок контейнеров; тон/свечение по правилам владельца.
- [ ] Perf Bible: freezeOnBlur, первый кадр = финальная геометрия, нет полноэкранных спиннеров. Прогнать: `npx jest --runTestsByPath tests/perf_freeze_contract.test.ts tests/layout_stability_contract.test.ts --runInBand --no-cache`.
- [ ] Дизайн-скиллы по правилу владельца (заметный новый экран): impeccable → taste-skill → emil-design-eng.
- [ ] Полевая приёмка спайка на iPhone + Android: p50 голос-к-голосу ≤1.2 с (10 замеров), перебивание обрывает речь орба, 10-минутный звонок не рвётся, расход в OpenAI dashboard ≈ расчётному ($0.02–0.05/мин).
- [ ] Commit: `git add app/max_call_session.tsx app/max_call_state.ts app/max_call_webrtc.ts app/max_call_orb.tsx tests/max_call_state.test.ts && git commit -m "feat(max): экран живого звонка — WebRTC, орб, бюджет минут"`

---

# ЭТАП 2 — Продукт и деньги (3–4 дня; под-план генерируется после спайка)

| Задача | Файлы | Суть |
|---|---|---|
| 2.1 Entitlement и пейволл | `app/premium_guard.ts` (+`hasMaxAccess`), `app/paywall_copy.ts`, `app/paywall_dev_preview.ts`, новый экран пейволла Max | RevenueCat: entitlement `max`, продукты `phraseman_max_monthly_v1` (€12.99), `phraseman_max_annual_v1` (€79.99). Карточка апселла сразу после пробного звонка («вот что Max сделал бы с этим разговором»). Optimistic-паттерн покупки как в существующем пейволле. |
| 2.2 Квоты и метринг | `functions/src/max_call_token.ts`, новая `functions/src/max_call_finish.ts` | `max_call_quotas/{uid}`: `{dayKey, secondsUsed, mintsToday, trialMonthKey, trialSecondsUsed}` (dayKey — по образцу `premium_dialog_quotas`). `max_call_sessions/{id}`: `{uid, startedAt, endedAt, durationSec, scenarioId, endReason, model}` — пишут ТОЛЬКО функции. Финиш-репорт с клиента сверяется с TTL токена и капом (доверие клиенту v1, ограничено `maxMintsPerDay`; серверный релей — v2 только если увидим абьюз). |
| 2.3 Пробный звонок | минтер + пейволл | 1×3 мин/календарный месяц всем без Max; владельцам Pro — разовые 30 мин (после утверждения §0.3). |
| 2.4 Минуты за жемчужины | экран звонка, `app/shards_shop_catalog.ts`-механика списания (investigation: точка списания жемчужин) | Курс `shardsPerTenMin` из конфига; мгновенный локальный апдейт остатка минут + откат при ошибке. |
| 2.5 Правила и Джарвис | `firestore.rules`, `functions/src/jarvis/jarvis_data_contract_guard.test.ts`, `admin/v2/legacy.html` | Новые коллекции: клиент читает только своё, не пишет ничего. По правилу проекта: контракт-гвард обновить В ТОМ ЖЕ ходу; счётчик минут/звонков — серверные `.count()`-агрегации в существующий департамент (Удержание или Выручка — решить при реализации); ручки Max в админку (`JF_DEPARTMENT_META` — только если заводим отдельный департамент). |

# ЭТАП 3 — Цикл обучения (2–3 дня)

| Задача | Файлы | Суть |
|---|---|---|
| 3.1 Пост-разбор звонка | новая `functions/src/max_call_review.ts` | Транскрипт (собран клиентом из data-channel событий) → модель из конфига (`gpt-4.1-mini`) → строгий JSON `{mistakes≤3, focusPhrases≤3, praise}` → карточка итога на экране summary. 1 вызов, 1 запись. |
| 3.2 Слабости → тренажёр | investigation: публичный API добавления в SRS (`getTrainerPremiumItems` — найти парный писатель) | focusPhrases уходят в тренажёр; следующий звонок получает их в weakWords. Замкнутый цикл — главный козырь против Duolingo. **Запретная зона не затрагивается.** |
| 3.3 «Речь за неделю» | локальный агрегат | Из локального кэша сессий, 0 новых чтений Firestore. |

# ЭТАП 4 — Полировка и релиз (3–5 дней + ревью сторов)

| Задача | Суть |
|---|---|
| 4.1 Суфлёр | Кнопка «Подскажи» → `maxCallHint` (gpt-4.1-nano): 2 варианта ответа по транскрипту. Не автоматом — не перебивать ученика подсказками. |
| 4.2 Перевод по тапу | Reuse `premiumDialogTranslate` для последней реплики орба. |
| 4.3 Privacy Policy — **блокер релиза** | Сегодня аудио до OpenAI не доходит (распознаёт ОС). Звонок = аудио в OpenAI в реальном времени + транскрипты. Обновить политику ДО стор-релиза (`npm run legal:sync`; investigation: исходник политики), отразить: аудио-стрим в OpenAI, транскрипты, сроки хранения. |
| 4.4 Релизный чеклист | Деплой functions **ДО** стор-билда (урок рулетки); bump `runtimeVersion` (нативный модуль — без OTA); `npm run audit:pre-release`; `update:gate`; поэтапный rollout: internal → флаг `enabled` на % пользователей (hash uid) → 100%; бюджет-алерты в OpenAI dashboard; суточные количества в Telegram-дайджест. |

## Риски и обходы

| Риск | Обход |
|---|---|
| WebRTC не собирается с newArch/static frameworks | Спайк 1.1 ловит это в первый день; план Б — WebSocket + PCM (`@fugood/react-native-audio-pcm-stream` уже в проекте) |
| iOS-эхо первых ~10 с (модель слышит себя) | Короткая скриптованная первая реплика + `far_field`; известный самопроходящий баг |
| Расходы взорвались | Kill switch `max_call/enabled`, кап минут, `maxMintsPerDay`, TTL токена 10 мин, алерты |
| Клиентский таймер капа обманут | Потолок: минты/день × TTL; телеметрия расхождений; серверный релей только как v2 при реальном абьюзе |
| Ревью Apple | Разрешения не добавляются (микрофон уже описан «голосовым диалогом с ИИ»); камера заблокирована; фоновых режимов нет |
| Слабая сеть | Opus сам адаптируется; 1 реконнект; вежливое завершение с сохранением разбора |

## Чего НЕ делаем в v1

Видео/персонаж с лицом (решение: орб), свой медиасервер-релей, свой ASR, full-duplex поверх текстовых диалогов, Gemini Live (медленнее по независимым замерам, нет готового RN-пути), любые правки существующего разбора речи (запрет владельца).

## Порядок и оценка

Этап 0 — параллелизуем хоть сегодня (отдельная сессия). Критический путь: 1 → 2 → 3 → 4. Чистой работы ~2.5–3.5 недели до стор-релиза Max; первый «вау» на своих телефонах — конец этапа 1.
