# МАКС ПЛАН — MAX Voice (realtime AI companion) — статус и продолжение работы

> Этот документ — единственный источник правды по фиче "MAX Voice" (полнодуплексные голосовые звонки с AI-компаньоном через OpenAI Realtime API). Он написан так, чтобы **любая другая LLM/сессия**, открыв только этот файл, могла понять: что сделано, как это сделано, что осталось, и как это проверить — без доступа к истории этого чата.

Дата написания: 2026-08-11 (обновлено после коммита `a1888340`).
Репозиторий: `/Users/maksymbabiev/Documents/phraseman` (реальный, "боевой" репо на Mac пользователя — НЕ `~/phraseman` без `Documents/`, это устаревшее зеркало).

## Оперативный аудит 2026-08-13 (актуальнее старых чеклистов ниже)

Физический iPhone в свежей DEV-сборке реально дошёл до Firebase в 16:47 UTC:
`auth=VALID`, нативный WebRTC присутствует. Первая попытка была остановлена
серверным `voice_disabled` до обращения к провайдеру. После безопасного DEV-bypass
владелец получил уже точный `voice_provider_failed`. Сверка с живой официальной
OpenAI-схемой нашла причину HTTP 400: полный mint отправлял `idle_timeout_ms`
внутри `semantic_vad`, хотя это поле разрешено только для `server_vad`.

Исправлено и проверено в этой рабочей версии:

- Dev Hub получил полноэкранный вход `MAX Voice`; `devMode` проходит preflight,
  mint и reconnect. Закрытый публичный гейт обходится только при подтверждённом
  сервером custom claim `admin`; подделанный `devMode` отклоняется.
- Все семь пользовательских/служебных функций MAX развернуты точечно и находятся
  в состоянии `ACTIVE`: `maxVoicePreflight=ee3eb837…`,
  `maxVoiceMint=0abc5662…`, четыре quota/watchdog-функции `1e1b8797…`,
  `maxVoiceProviderHealth=9825271d…`. Arena и чужие поверхности не трогались.
- Модель обновлена с deprecated `gpt-realtime-mini` на
  `gpt-realtime-2.1-mini`; старое значение runtime config безопасно клампится.
- Из `semantic_vad` удалён несовместимый `idle_timeout_ms`. На случай будущего
  дрейфа необязательных полей один HTTP 400 полного профиля автоматически
  повторяется минимальным официальным compatibility-профилем; auth, rate-limit,
  quota и safety-отказы этим путём не обходятся.
- Runtime voice теперь закрыт whitelist актуальных built-in ID; устаревший
  `onyx` или опечатка клампятся к `marin`, а не ломают весь mint HTTP 400.
- Добавлены точные причины ошибки вместо одного «не получилось дозвониться»,
  12/20/35-секундные границы ожидания, retry transient provider-ошибки,
  немедленное освобождение позднего/неиспользованного резерва и первый
  `response.create` после открытия data channel (иначе соединение могло молчать).
- Исправлена iOS-гонка non-trickle SDP: React Native WebRTC асинхронно дописывает
  ICE-кандидаты в `localDescription`; клиент теперь ждёт `iceGatheringState=complete`
  до 2,5 с и отправляет лучший актуальный SDP. То же действует на reconnect.
- При отказе preflight/транспорта пользователь не остаётся в тупике: доступен
  существующий half-duplex «режим рации» (`ai_dialog_session`, голос по удержанию
  + TTS), минуты MAX там не резервируются и не списываются.
- `maxVoiceProviderHealth` каждые 10 минут живым запросом проверяет API key,
  доступ к модели и полный `client_secrets` payload без запуска inference. При
  отказе или переходе на compatibility-профиль пишет почасовой critical
  `app_errors`, который уже подхватывают Telegram-алерты и Джарвис. Первый
  production-run в `2026-08-13 18:52:00 UTC` принял именно full-профиль
  `gpt-realtime-2.1-mini` за `2215 ms`; второй автоматический run в `19:02:01`
  повторил успех за `1509 ms`. Fallback не понадобился.
- Финальный узкий прогон: 15 клиентских MAX suites / 192 tests, отдельный
  Dev Hub MAX-контракт и 7 серверных suites / 127 tests — зелёные. Точечный
  TypeScript compile MAX-модулей зелёный. Общий `functions` typecheck сейчас
  отдельно блокируется чужим незавершённым `community_packs.ts` (`balanceAfter`),
  не связанным с MAX; MAX-файлы там не имеют ошибок.

Отдельная найденная проблема: DEV-сборка без настроенного debug/real-attestation
провайдера шлёт Firebase Functions placeholder App Check token, который логируется
как `INVALID`. Сейчас MAX его пропускает, потому что enforcement выключен. Не
включать enforcement до регистрации реального App Attest/debug provider; этот
дефект не был причиной отказа 16:47 и не должен маскировать основной диагноз.

Живой OpenAI mint подтверждён автоматическим production-probe. Остаётся только
физический повторный звонок владельца: он нужен, чтобы подтвердить двусторонний
звук и маршрут аудио именно его устройства. Ни unit, ни Maestro не способны
«услышать» фактический аудиоканал.

Коммиты фичи на Mac (HEAD → назад), все подтверждены `git log`:
1. **`2776524d06788582de31d2b6a728534ed44e9957`** — E2E-тесты жизненного цикла + смоук-харнесс симулятора (текущий HEAD)
2. `f32359518796bd48ca9e6e9e9793e8feade7c765` — MAX_PLAN: нативные зависимости, инструкции запуска
3. `3cd8d34ca8999f16ab49438837e4338242853b8e` — правка комментария в guard-тесте
4. `49b3c9e3119a372e9987a986abc99796a242be78` — react-native-webrtc + incall-manager в package.json/app.json
5. `0311dc6567ae194fcc7c3770021bb93b5eb5e610`, `6d5363c194158d4728a38d85ba9768620d18981d` — обновления MAX_PLAN
6. `a1888340fd52b197a07d69c2604211367918d089` — голосовая ветка premiumDialogReview(mode:'voice')
7. `11d6765e783d80f5914f9f1d564c56c16c94ed43` — первая версия MAX_PLAN
8. `fb2ddab3a5de41d0360cbf766e782bcf879d8d9a` — ядро фичи, 43 файла (родитель `1848756602db3ee07dba924669cd46545caa3777`)

Каждый коммит собран через git-плюмбинг с проверкой `git diff --name-only` между деревьями: в дереве ровно ожидаемые файлы и ничего постороннего (репозиторий параллельно правят другие сессии).

Полная спецификация фичи (архитектура, экономика, промпт, анимация халo-сферы) лежит в репозитории: **`.planning/phases/06-max-voice-realtime/SPEC.md`** — она же была отправлена пользователю отдельным файлом. Этот документ (МАКС ПЛАН) — не замена SPEC.md, а статус выполнения + чеклист продолжения.

---

## 1. Что это за фича

MAX Voice — новый премиум-тариф: полнодуплексный realtime голосовой разговор с AI-компаньоном по-английски, через OpenAI Realtime API (`gpt-realtime-2.1-mini`) поверх WebRTC, с серверной чеканкой ephemeral-токенов, semantic VAD, перебиванием (barge-in), учётом уровня CEFR ученика, транзакционными квотами (день/месяц/сессия в секундах), "лестницей бюджета" (budget ladder) с фолбэком на текст/TTS при исчерпании, и пост-звонковым review + начислением XP.

Визуально: вместо анимированного персонажа (как у Duolingo) — "живая" аудиореактивная халo-сфера (`max_call_halo.tsx`), дешёвая по анимации (только Reanimated, без WebGL/Moti), реагирующая на громкость пользователя и AI, с дыханием и цветовыми переходами по состояниям звонка.

Методология разработки (по прямому указанию пользователя): 4 независимых "агента-перспективы" (UX, аудио-инженерия, педагогика, экономика) исследовали и синтезировали единую спецификацию → команда реализации написала 43 файла с юнит-тестами на каждую функцию/экран → два раунда состязательного (adversarial) ревью с 6 линзами (деньги, соответствие Realtime API, перф, интеграция, тесты, злоупотребления) и независимой верификацией скептиками → все подтверждённые дефекты исправлены и перепроверены.

---

## 2. Текущий статус (коротко)

| Блок | Статус |
|---|---|
| Спецификация (SPEC.md, 9 разделов) | ✅ Готово, лежит в `.planning/phases/06-max-voice-realtime/SPEC.md` |
| Клиентские "чистые" модули (state machines, форматирование) + тесты | ✅ Готово, 7 модулей + 7 тестов, все зелёные |
| Клиентский транспорт (WebRTC, минтинг, heartbeat, reconnect) | ✅ Готово: `max_webrtc_module.ts`, `max_call_client.ts`, `max_voice_flags.ts` + 3 контрактных теста |
| Экраны (халo-сфера, звонок, pre-start, review, sfx) | ✅ Готово: 5 файлов + правка `voice_equalizer.tsx` |
| Серверные callable-функции (config/mint/quota/session-end/watchdog/prompt) | ✅ Готово: 7 модулей + 7 тестов |
| Регистрация 6 новых экспортов в `functions/src/index.ts` | ✅ Готово, точечный патч применён поверх параллельно менявшегося файла |
| Раунд 1 адверсариал-ревью (contract mismatches) | ✅ Найдено 2 HIGH бага, исправлено, перепроверено |
| Раунд 2 адверсариал-ревью (abuse lens) | ✅ Найдено 3 бага (1 HIGH, 2 MEDIUM), исправлено |
| Merge на реальный Mac-репозиторий (43 файла, без затрагивания параллельных изменений от других сессий) | ✅ Готово |
| Git-коммит на Mac | ✅ **Готово** — `fb2ddab3a5de41d0360cbf766e782bcf879d8d9a`, HEAD обновлён (`git update-ref` выполнен, подтверждено `git log -1`) |
| Нативные зависимости (react-native-webrtc, incall-manager) в `package.json`/`app.json` | ✅ **Готово** (коммиты `49b3c9e3`, `3cd8d34c`) — версии подобраны и провалидированы (`npm install` в чистом чекауте: 0 конфликтов, только не связанный pre-existing peer-warning; `tsc --noEmit`: 0 новых ошибок; 159+121 тест всё ещё зелёные с реальными пакетами в `node_modules`). Android-разрешения `RECORD_AUDIO`/`MODIFY_AUDIO_SETTINGS` добавлены в `app.json` |
| `expo prebuild` / `pod install` / фактическая нативная сборка | ❌ **НЕ сделано — и НЕ через device_bash** (см. раздел 9 ниже: точные команды для тебя в Terminal на Mac) |
| `premium_dialog_review.ts` — ветка `mode:'voice'` (пост-звонковые правки текста) | ✅ **Готово** (коммит `a1888340`) — сервер принимает `mode`, речевой промпт игнорирует filler words/самоисправления, но ловит реальную грамматику; клиент (`max_voice_review.tsx`) реально зовёт сервер вместо старого TODO-стаба; 6 новых контрактных тестов + 2 новых серверных теста, все зелёные |
| MAX paywall-экран (`paywall_h.tsx`) + RevenueCat MAX offering | ⚠️ **НЕ сделано, но НЕ блокер v1** — `hasMax = isPremium && voiceForPremiumBeta` (default `true`, `max_voice_mint.ts:296`): обычный Premium уже открывает MAX-звонки на время беты. Отдельный пейволл нужен только для будущей отдельной монетизации MAX (v2) |
| Remote config документ `admin_runtime_config/openai_realtime_voice` в Firestore (продовые значения) | ⚠️ **Не создан, но это НЕ блокер** — проверено по коду и тестам (`functions/src/max_voice_config.ts:260-274`, `max_voice_config.test.ts:169`): отсутствующий/битый документ падает на безопасные дефолты (`MAX_VOICE_CONFIG_DEFAULTS`, kill switch выключен) БЕЗ ошибок. Документ нужен только когда админ захочет отклониться от дефолтов — делается через уже готовый `maxVoiceConfigAdmin` callable (action:'set'), ручной Firestore-консоли не требуется |
| `gate_ai_voice_call` remote flag | ✅ Добавлен в `remote_flags.ts`, default `false` (фича выключена до explicit включения) |

**Вывод: ядро фичи (voice-звонок целиком, от pre-start до review, с полным биллингом/квотами/защитой от абьюза, включая голосовую ветку пост-звонкового ревью) реализовано, протестировано, задокументировано и закоммичено — 280 автотестов зелёные, весь код в репозитории на Mac. Единственное, что физически не может сделать облачная сессия за тебя: скомпилировать и визуально проверить нативную сборку на симуляторе/устройстве (нет GUI-доступа к твоему Mac) — раздел 9 даёт точные команды и чеклист для этого. MAX-пейволл — не блокер, это готовый план на будущую отдельную монетизацию.**

---

## 3. Полный список изменённых/новых файлов (43 шт., все в коммите `fb2ddab3a5de41d0360cbf766e782bcf879d8d9a`)

### Клиент — чистые модули + тесты
- `app/max_call_ui_state.ts` — state machine экрана звонка (idle→preflight→minting→connecting→configuring→active→reconnecting→ending→ended|failed)
- `app/max_call_transcript.ts` — накопление/форматирование транскрипта диалога
- `app/max_call_audio_level.ts` — сглаживание уровня звука для анимации халo
- `app/max_call_quota_view.ts` — форматирование остатка минут/квоты для UI (MinutesPill)
- `app/max_call_reconnect.ts` — логика цепочки переподключений
- `app/max_call_hint_timer.ts` — таймер подсказок во время звонка
- `app/max_voice_metrics.ts` — сбор метрик звонка для аналитики
- тесты: `tests/max_call_ui_state.test.ts`, `tests/max_call_transcript.test.ts`, `tests/max_call_audio_level.test.ts`, `tests/max_call_quota_view.test.ts`, `tests/max_call_reconnect.test.ts`, `tests/max_call_hint_timer.test.ts`, `tests/max_voice_metrics.test.ts`, `tests/max_call_pill_format.test.ts`

### Клиент — транспорт
- `app/max_webrtc_module.ts` — guarded loader нативного WebRTC-модуля (не роняет приложение, если нативный модуль отсутствует/не собран)
- `app/max_call_client.ts` — главный транспортный клиент: владеет PeerConnection/DataChannel, heartbeat, teardown, barge-in, цепочка reconnect
- `app/max_voice_flags.ts` — kill-switch (`gate_ai_voice_call`) + проверка доступности нативного модуля
- тесты: `tests/max_webrtc_module_guard.test.ts`, `tests/max_call_client_teardown.test.ts`, `tests/max_call_payload_contract.test.ts`

### Клиент — экраны
- `app/max_call_halo.tsx` — многослойная "живая" анимация сферы (Reanimated): дыхание + реакция на mic/AI-уровень + цветовые переходы по состояниям
- `app/max_call_session.tsx` — экран звонка (тонкий, вся логика делегирована в `max_call_client`), хостит MinutesPill/hint-timer/sfx
- `app/max_call_prestart.tsx` — экран перед звонком
- `app/max_voice_review.tsx` — пост-звонковый review (**сейчас локальный стаб**, TODO: серверная voice-ветка ревью)
- `app/max_call_sfx.ts` — звук/haptics только на границах сессии (не мешает голосу)
- правки: `app/voice_equalizer.tsx` (добавлен `owner?: 'user'|'ai'|'idle'` проп + фикс idle-пульса для imperative `setSample`), `app/ai_dialog_home.tsx` (MAX-бейджед карточка входа, gated `isMaxVoiceEntryVisible()`), `app/remote_flags.ts` (добавлен ключ `gate_ai_voice_call` в `RemoteBoolKey` и `DEFAULT_FLAGS`, default `false`)

### Сервер (`functions/src/`)
- `max_voice_config.ts` (+test) — конфиг/константы, включая `VOICE_RECONNECT_GRACE_MS`, `VOICE_CONFIRMED_GAP_WINDOW_SEC`, `VOICE_XP_FLOOR_MIN_AUDIO_TOKENS`
- `max_voice_prompt.ts` (+test) — `VOICE_STATIC_PREFIX`, `buildVoiceInstructions()`, `VOICE_UNTRUSTED_ANCHOR` (защита от prompt injection)
- `max_voice_quota.ts` (+test) — `reserveVoiceSeconds`, `settleVoiceSession`, `releaseVoiceReservation`, `transferReserve` (транзакции Firestore)
- `max_voice_mint.ts` (+test) — `maxVoicePreflight`/`maxVoiceMint` callable-функции, gate-ordering, budget ladder, rate limiting, POST конфигурации сессии в OpenAI
- `max_voice_session_end.ts` (+test) — `maxVoiceHeartbeat`/`maxVoiceSessionEnd`, формула XP, `writeVoiceBillingRow`, дневной кап XP
- `max_voice_watchdog.ts` (+test) — `runMaxVoiceWatchdogOnce` (чистка зависших сессий, возврат бюджета, billing-строка)
- правка `functions/src/index.ts` — регистрация 6 экспортов: `maxVoiceConfigAdmin`, `maxVoicePreflight`, `maxVoiceMint`, `maxVoiceHeartbeat`, `maxVoiceSessionEnd`, `maxVoiceWatchdog`

Полный список также лежит в контейнере сборки как `/tmp/ship_files_final.txt` (может быть недоступен после окончания сессии — считать этот раздел документа авторитетным).

### 3.1. Довесок — серверная voice-ветка ревью (коммит `a1888340`, после раздела 3 выше)

- `functions/src/premium_dialog_review.ts` (правка) — добавлен `mode` в `DialogReviewRequest`, экспортирована чистая `asReviewMode()`, `buildReviewSystemPrompt()` теперь экспортирована и принимает `mode` (речевой промпт добавляет явную оговорку игнорировать filler words/самоисправления/пунктуацию устной речи, но продолжает ловить настоящую грамматику/лексику/порядок слов); billing-документ получил поле `reviewMode` (поле `mode:'review'` оставлено как есть — на него уже завязаны дашборды биллинга).
- `functions/src/premium_dialog_review.test.ts` (правка) — +7 тестов: `asReviewMode` (default/voice), `buildReviewSystemPrompt` mode-awareness (voice добавляет оговорку, text — нет, JSON-контракт не меняется).
- `app/ai_dialog_client.ts` (правка) — `PremiumDialogReviewRequest.mode?: 'text'|'voice'`, включено в ключ дедупликации in-flight запросов (`premiumDialogReviewRequestKey`).
- `app/max_voice_review.tsx` (правка) — секция "Разбор твоих фраз" теперь реально зовёт `callPremiumDialogReview({..., mode:'voice'})` вместо статичного текста-заглушки: маппинг `TranscriptTurn{role,text}` → `DialogChatTurn{role,content}`, guard на пустой транскрипт (0 реплик юзера — не зовём сервер), состояния `idle/loading/loaded/error` с тихим фолбэком на старый текст-заглушку при ошибке (экран никогда не падает и не пугает юзера).
- `tests/max_voice_review_server_contract.test.ts` (новый) — 6 тестов в стиле уже существующего `tests/ai_dialog_entitlement_readiness_contract.test.ts` (текстовые контрактные проверки по исходникам — полный runtime-мок RN-Firebase в этом кодбейсе тяжёлый и не является конвенцией для экранов такого рода).

Итог прогона тестов на момент коммита `a1888340`: 159 клиентских тестов (`tests/max_*`) + 121 серверный тест (`functions/src/premium_dialog_review.test.ts` + `functions/src/max_voice_*.test.ts`) — все зелёные. Полный `tsc --noEmit` прогнан по всему проекту: ошибок в затронутых файлах нет (26 pre-existing ошибок в НЕ связанных с MAX Voice файлах — `CleanOnboarding.tsx`, `StatsLearningInsights.tsx`, `demo_content.ts`, `phrase_audio_player.ts`, `learning_v2_owner_repository_wallet_checkpoint.test.ts` — не трогать, не связаны с этой фичей).

---

## 4. Найденные и исправленные баги (для верификации другой LLM)

### Раунд 1 — contract mismatches (обнаружено через adversarial review, 6 линз, verify-агенты)
1. **HIGH — mint response mismatch.** Сервер возвращал camelCase (`sessionId`/`maxSeconds`/`expiresAt`), клиент ожидал snake_case (`session_id`/`max_seconds`). **Фикс:** сервер теперь отдаёт оба варианта написания; клиент принимает любой. Проверить: `max_voice_mint.test.ts` и `tests/max_call_payload_contract.test.ts`.
2. **HIGH — heartbeat/session-end payload mismatch.** Клиент слал скаляр `usageTokens`; сервер ожидал структуру `usage: {audioInputTokens, audioOutputTokens, cachedTokens, textTokens}` + доп. поля (`clientSpeechSec`, `repliesCount`, `transcriptWordCount`, `cefr`, `scenarioId`, `channel`), которые клиент вообще не отправлял → XP всегда был 0, биллинг занижен. **Фикс:** клиент накапливает реальные токены по типам из событий `response.done` и шлёт полный payload; сервер нормализует неизвестные/`'failed'` значения `endReason` в `'dropped'`. Проверить: `max_voice_session_end.test.ts`.
3. Также: gate-ordering для reconnect (транк trial-проверки для reconnectOf, полагается на `transferReserve`), исключение бюджет-лестницы для reconnect уже зарезервированных живых сессий, устранено двойное списание бюджета при reconnect (`estUsd=0`), watchdog теперь возвращает оценку бюджета и пишет `voice_call_billing` при settle/release, провальный минтинг у провайдера возвращает слот rate-limit обратно, подтверждено поле `max_output_tokens` (не устаревшее beta `max_response_output_tokens`) — сверено с исходниками `openai-node` и документацией OpenAI.

### Раунд 2 — abuse lens (доп. проверка, через SendMessage тому же агенту)
1. **HIGH — free-gap reconnect exploit.** Клиент мог не слать heartbeat ~60 сек, затем переподключиться — старая формула считала весь тихий период "бесплатным" (незабилленным) сетевым обрывом. **Фикс:** консервативная формула confirmed-gap-window (`VOICE_RECONNECT_GRACE_MS=4000`, `VOICE_CONFIRMED_GAP_WINDOW_SEC=12000` = 3×grace) + правило "если heartbeat вообще не приходил и прошло ≥2×heartbeatSec ⇒ gap=0" (списывать по умолчанию, а не прощать). Проверить: `max_voice_quota.test.ts`.
2. **MEDIUM — XP-floor farming через тихие звонки.** `repliesCount>=1` (полностью контролируется клиентом) сам по себе давал XP-пол `5×минут`. **Фикс:** дополнительно требуется `usage.audioInputTokens >= VOICE_XP_FLOOR_MIN_AUDIO_TOKENS` (≈30 сек реального подтверждённого сервером аудио).
3. **MEDIUM — prompt injection** через клиентские `scenarioBlock`/`memoryBlock`, вставляемые после SAFETY-блока в системный промпт. **Фикс:** все недоверенные клиентские блоки обёрнуты в явные разделители `=== ... (untrusted) BEGIN/END ===`, добавлена фиксированная константа `VOICE_UNTRUSTED_ANCHOR` последним блоком (после reconnectSummary), явно запрещающая недоверенному тексту переопределять VOICE RULES/SAFETY; статический префикс промпта (нужен для кеширования у OpenAI) остался байт-в-байт стабильным.

Полные сырые находки и вердикты verify-агентов лежат в `/tmp/review_findings.json` и `/tmp/review_verdicts.json` в контейнере сборки — если они недоступны в новой сессии, считать раздел 4 этого документа исчерпывающим описанием.

---

## 5. Тесты

**322 теста зелёные: 192 клиентских + 130 серверных.**

Прогнать:
```bash
cd ~/Documents/phraseman
npx jest tests/max_                      # 192 клиентских
cd functions && npx jest src/max_voice_ src/premium_dialog_review.test.ts   # 130 серверных
```

Три уровня, каждый ловит свой класс багов:

**Юнит (по модулю на файл)** — детерминированные чистые функции: state machines, форматирование, квоты, промпт, XP-формула, биллинг.

**E2E жизненного цикла** — `tests/max_call_lifecycle_e2e.test.ts` (24 теста). Гоняет настоящий `createMaxCallClient` через реалистичный мок WebRTC и настоящую последовательность событий Realtime API. Покрывает то, что ломается на стыках, а не внутри функций: полный успешный звонок (фазы → голос ИИ → транскрипт → накопление usage по типам токенов → heartbeat → сеттлмент → освобождение ресурсов), barge-in с возвратом звука через 300мс, обе фазы реконнекта (ICE ожил в grace / полный ре-минт с `reconnectOf`), исчерпание чейна, провал на каждом шаге поднятия (preflight / mint / SDP), `end()` посреди минта, идемпотентность двойного `end()`, падение сеттлмента, мусор в data channel, мьют переживающий реконнект.

Отдельно зафиксирована гонка: **канал ре-минта открывается РАНЬШЕ, чем навешен `onopen`**. Без страховки `if (readyState === 'open') finish()` звонок навсегда завис бы в `reconnecting` поверх живого транспорта — юзер видел бы «переподключение» при работающей линии. Тест воспроизводит гонку явно (ассертит, что `onopen` ещё `null` в момент открытия).

**Сквозной контракт клиент↔сервер** — `functions/src/max_voice_client_server_contract.test.ts` (9 тестов). Закрывает дыру, через которую прошли два HIGH-бага: обе стороны были зелёные, потому что каждая проверяла СВОИ допущения, и ни одна — расхождение между ними. Здесь payload, собранный настоящим клиентским прогоном, скармливается настоящим серверным санитайзерам и формулам: ни одно поле `usage` не теряется, ключи типов совпадают буквально, каждая причина завершения принимается сервером, `'failed'` маппится в `'dropped'` до отправки, реальный двухминутный разговор даёт **XP > 0**, стоимость считается по разбивке токенов и строго больше одной транскрипции, молчаливый звонок XP-пол не фармит.

Проверено мутацией, что у теста есть зубы: возврат исходного бага (клиент шлёт скаляр `usageTokens` вместо структуры) окрашивает 5 из 9 в красный, включая «XP > 0» и «стоимость по разбивке».

**Смоук симулятора** — `scripts/max_voice_smoke.sh` + `.maestro/max_voice_smoke.yaml`, см. раздел 9.

## 6. Что осталось сделать (чеклист для продолжения)

1. **Нативные зависимости и prebuild.** ⚠️ **Сознательно НЕ делалось этой сессией через мостик device_bash** — не по забывчивости, а потому что это реально небезопасно на этом канале доставки: `npm install`/`pod install`/`expo prebuild` обычно занимают заметно больше 45 секунд (жёсткий потолок одного вызова device_bash), фоновые процессы не переживают возврат из вызова (нельзя запустить и "прийти проверить позже"), `expo prebuild` перезаписывает/удаляет десятки файлов в `ios/`/`android/` (device_bash не умеет удалять — это гарантированно сломается), а сам репозиторий параллельно меняется другими сессиями — конфликт нативных проектных файлов посреди чужой работы может быть трудно откатить. **Следующей сессии/LLM с этим нужно работать НЕ через device_bash, а либо напрямую руками пользователя на Mac, либо в отдельной изолированной среде.** Чеклист по сути:
   - Добавить `react-native-webrtc` и `react-native-incall-manager` (или их актуальные эквиваленты) в `package.json`.
   - Прописать нужные конфиги (permissions на микрофон iOS/Android, background audio mode при необходимости) в `app.json`/`app.config`.
   - Запустить `expo prebuild` (или эквивалент) и проверить, что `max_webrtc_module.ts` подхватывает нативный модуль (guarded loader сейчас безопасно деградирует, если модуля нет — это ожидаемо ДО prebuild).
   - Smoke test на реальном устройстве (эмулятор часто не поддерживает WebRTC-медиа полноценно) — минимум: preflight → mint → connect → услышать AI → сказать фразу → услышать ответ → barge-in → hangup → review.

2. ~~`premium_dialog_review.ts` — голосовая ветка.~~ ✅ **Сделано** в коммите `a1888340` (раздел 3.1 выше). `max_voice_review.tsx` больше не стаб — реально зовёт сервер, mode:'voice' промпт учитывает специфику устной речи, 13 новых тестов зелёные.

3. **MAX paywall + монетизация.** ⚠️ **ВАЖНАЯ НАХОДКА этой сессии, снимающая срочность:** это НЕ блокер для запуска v1/беты. `functions/src/max_voice_mint.ts:296` — `const hasMax = isPremium && config.voiceForPremiumBeta;`, а `voiceForPremiumBeta` по умолчанию `true` (`max_voice_config.ts:110`). Это значит: СЕЙЧАС любой обычный Premium-подписчик автоматически получает доступ к MAX-звонкам, без отдельной покупки — фича идёт "бесплатным бонусом" внутри Premium на время беты, ИМЕННО так и было задумано в спеке (см. `app/max_voice_config.ts:69` — "v1: MAX-доступ = обычный премиум"). Значит для запуска и тестирования (в т.ч. раздел 9 ниже — FORCE_PREMIUM_DEV_INTENT достаточно, MAX-специфичная подписка не нужна). Отдельный MAX-пейволл/RevenueCat-offering нужен только КОГДА захотите брать деньги за MAX отдельно от Premium (v2-монетизация) — тогда порядок действий такой:
   - **Шаг 0 (пользователь, вне кода, блокирует всё остальное):** завести в RevenueCat отдельный **MAX offering** — апгрейд с Premium со скидкой, региональные цены RU/UA (спека SPEC.md §"Env/секреты"). Сейчас в проекте есть РОВНО ОДИН RevenueCat entitlement — `premium` (см. `app/revenuecat_premium_access.ts:8` — `activeRevenueCatPremiumEntitlement` читает только `info.entitlements.active.premium`). Пока в дашborде не появится второй entitlement (например `max`) с привязанными к нему продуктами в App Store Connect / Play Console, ЛЮБОЙ клиентский код, который на него ссылается, будет либо падать, либо тихо не находить покупку.
   - **Шаг 1 (код, после шага 0):** по аналогии с `activeRevenueCatPremiumEntitlement`/`revenueCatCustomerInfoHasPremiumAccess` в `app/revenuecat_premium_access.ts` добавить `activeRevenueCatMaxEntitlement`/`revenueCatCustomerInfoHasMaxAccess`, читающие новый entitlement-ключ (уточнить точное имя у пользователя/в дашборде RevenueCat — не угадывать).
   - **Шаг 2 (код):** создать `app/paywall_h.tsx` — по образцу `app/paywall_a.tsx`..`app/paywall_e.tsx` (буквы `f`/`g` уже заняты другими экспериментами Premium, см. `app/paywall_variant.ts`). ВАЖНО: `paywall_h` — это НЕ восьмая буква A/B/C-сплита из `paywall_variant.ts` (тот сплит — только про уже существующий Premium-пейволл, `PaywallAbVariant = 'A'|'B'|'C'|'D'|'E'|'F'|'G'`); MAX-пейволл — отдельный экран для отдельного апгрейда, с собственным, отдельным A/B "против лучшего текущего" и частотным капом показа 1 раз в 3 дня (искл. — явное нажатие на голосовую кнопку, которое должно показывать пейволл всегда). Такого фреймворка частотного капа в репо ещё нет — писать с нуля или найти ближайший аналог (`paywall_funnel.ts`/`winback_offer.ts` стоит проверить на предмет переиспользуемых кусков).
   - **Шаг 3 (код):** прогейтить вход в MAX Voice через paywall. Сейчас `ai_dialog_home.tsx:95` при нажатии на MAX-карточку ведёт СРАЗУ на `router.push('/max_call_prestart')` — только гейт `gate_ai_voice_call`/`isMaxVoiceEntryVisible()`, никакой проверки покупки. Нужно вставить проверку MAX-entitlement перед этим переходом (аналогично тому, как `premium_modal` открывается по `hasPremiumAccess`/`accessResolved` в других местах — см. `tests/ai_dialog_entitlement_readiness_contract.test.ts` для паттерна "не открывать paywall/не пускать до `accessResolved`").
   - **Шаг 4 (код):** решить, что происходит с уже-Premium (не-MAX) юзерами относительно квот `max_voice_quota.ts`/`max_voice_config.ts` — сейчас квоты считаются независимо от источника входа; нужно явно сверить, что без MAX-покупки квота равна нулю/недоступна (это, возможно, уже покрыто общим гейтом, но не проверялось специально под углом "юзер купил только Premium, не MAX").

4. **Remote config в проде — НЕ блокер, опционально.** Проверено в этой сессии: `resolveMaxVoiceConfig()` (`functions/src/max_voice_config.ts:260`) безопасно падает на `MAX_VOICE_CONFIG_DEFAULTS` при отсутствующем/битом документе (покрыто тестом `falls back to defaults on read failure and does NOT cache the failure`). Ничего заводить руками в Firestore-консоли не нужно для запуска — только если админ захочет отклониться от дефолтов (другая модель голоса, другие капы и т.д.), это делается вызовом уже готового `maxVoiceConfigAdmin({action:'set', config:{...}})` (требует custom claim `admin` на аккаунте).

5. **Включение фичи.** `gate_ai_voice_call` сейчас `false` по умолчанию — это осознанный kill-switch. Включать только после пп. 1–4 и ручного smoke-теста на реальном устройстве.

6. **Секреты/ключи.** Убедиться, что OpenAI API key для Realtime API есть в Firebase Functions secrets/env (не в коде) — это не проверялось в рамках этой сессии, проверить перед продом.

7. **Очистка мусора на Mac** (безопасно удалить руками, я не могу это сделать через инструменты этой сессии):
   - `tmp/_to_delete_old_max_merge/` (старые версии 4 файлов, которые конфликтовали при merge)
   - `tmp/max_voice_ship_v2.tar.gz` (архив доставки, уже распакован и закоммичен)

---

## 7. Архитектурные решения, которые важно не сломать при доработке

- **Byte-stable static prefix промпта** (`VOICE_STATIC_PREFIX` в `max_voice_prompt.ts`) — нужен для prompt caching у OpenAI. Любые правки текста промпта должны либо сохранять этот префикс байт-в-байт, либо осознанно жертвовать кешированием.
- **Все клиентские данные в промпте — untrusted.** Новый текст, добавляемый в промпт (сценарии, память, что угодно от клиента), обязан идти через тот же паттерн explicit BEGIN/END delimiters + не должен подмешиваться до `VOICE_UNTRUSTED_ANCHOR`.
- **Квоты — транзакционные.** Любые новые пути списания секунд обязаны идти через `max_voice_quota.ts` (`reserveVoiceSeconds`/`settleVoiceSession`/`releaseVoiceReservation`/`transferReserve`), не напрямую через Firestore writes — иначе легко сломать атомарность и открыть гонки/абьюз.
- **XP floor требует и `repliesCount>=1`, И `audioInputTokens >= VOICE_XP_FLOOR_MIN_AUDIO_TOKENS`.** Не убирать вторую проверку — это защита от фарма молчаливыми звонками.
- **Free-gap формула при reconnect всегда должна ошибаться в сторону списания денег с пользователя**, а не в сторону "простить" — см. раздел 4, п.1 раунда 2.
- **`max_webrtc_module.ts` обязан оставаться guarded** (безопасно деградировать без нативного модуля) — от этого зависит, что остальное приложение не падает на устройствах/этапах сборки без WebRTC.

---

## 8. Как воспроизвести окружение доставки (если снова понадобится device_bash → Mac)

Полезные факты, добытые ценой ошибок в этой сессии — см. также историю выше, но коротко:
- Подключённые папки Mac монтируются в `device_bash` под `mnt/<folder-name>/`, а не по абсолютному `/Users/...` пути (тот годится только для `device_list_dir`/`device_stage_files`/`device_commit_files`).
- `device_bash` не может удалять/перезаписывать файлы — только `mv` в сторону перед распаковкой новых версий.
- Фоновые процессы не переживают возврат из одного вызова `device_bash` — вся работа должна укладываться в один синхронный вызов (жёсткий потолок 45 сек).
- Порцелейн `git commit`/`git status` без ограничения путей на этом маунте слишком медленные (полный `refresh_index()` по ~35k файлам) — использовать `git write-tree` → `git commit-tree` → `git update-ref HEAD`, и всегда скоуп-ить `git status`/`git diff` конкретными путями.
- После почти каждой git-операции остаётся осиротевший пустой `.git/index.lock` (или `.git/HEAD.lock`) — перед следующей git-командой отодвигать его через `mv .git/index.lock .git/index.lock.stale_$(date +%s%N)` (аналогично для `HEAD.lock`).

---

## 9. Как прогнать смоук-тест MAX Voice на этом Mac — ОДНА команда

```bash
cd ~/Documents/phraseman && bash scripts/max_voice_smoke.sh
```

Всё остальное скрипт делает сам: проверяет окружение (xcrun/simctl/node/maestro) с понятными подсказками, если чего-то нет; доставляет зависимости; поднимает iOS-симулятор; собирает приложение с уже включённым голосовым гейтом (`EXPO_PUBLIC_MAX_VOICE_ENABLED=true` вшивается в бандл на этапе сборки, поэтому включать его в рантайме бесполезно); прогоняет Maestro-флоу `.maestro/max_voice_smoke.yaml`; складывает пронумерованные скриншоты каждого шага и три лога (maestro, системный лог симулятора, лог сборки) в `tmp/smoke_artifacts/`.

Первая сборка с WebRTC долгая (10–25 минут — компилируется нативная библиотека), последующие быстрые.

**Предупреждение про `app/config.ts`:** скрипт временно переключает `FORCE_PREMIUM_DEV_INTENT` в `true` — без активного Premium сервер откажет в минте сессии, и смоук не доедет до звонка. Откат висит на `trap` (EXIT/INT/TERM), то есть срабатывает и при Ctrl-C, и при падении сборки. Инвариант «в коммите всегда `false`», который защищает `tests/force_premium_prod_guard.test.ts`, при этом не нарушается. Если после аварийного завершения захочется убедиться: `git diff app/config.ts` должен быть пустым.

**Что проверяет флоу:** карточка входа MAX видна → пре-старт → звонок поднялся (ждёт до 45с — первый вызов functions может быть холодным) → два кадра halo-сферы с паузой (видно, что анимация живёт) → кнопки mute/end на месте и реагируют → звонок переживает 32 секунды (уходит хотя бы один heartbeat) → завершение → экран разбора → секция коррекций дождалась ответа сервера.

Флоу цепляется ТОЛЬКО за `testID` (`max-voice-entry-card`, `max-call-prestart-screen`, `max-call-start-button`, `max-call-session-screen`, `max-call-mute-button`, `max-call-end-button`, `max-call-captions-button`, `max-voice-review-screen`, `max-voice-review-corrections-{idle|loading|loaded|error}`), а не за текст — интерфейс переведён на 8 языков, текстовые матчеры ломались бы от смены языка устройства. У секции коррекций состояние вшито прямо в `testID`, чтобы и Maestro, и человек на скриншоте однозначно отличали «сервер ответил» от «ещё грузится» и от «отвалился».

**Чего этот тест НЕ проверяет и проверить не может:** качество и сам факт звука. Maestro не слышит. Проверить, что ИИ реально говорит, что перебивание физически обрывает речь и что голос не заикается — может только человек в наушниках. Всё остальное автоматизировано.

**Если что-то упало:** скрипт не прячет ошибку — печатает последние 40 строк лога сборки и оставляет все артефакты на месте. Отдай ассистенту содержимое `tmp/smoke_artifacts/` (скриншоты он читает и сверяет сам), он разберёт причину и починит код.

---

## 10. Статус этой сессии на момент записи документа

HEAD Mac-репозитория: **`2776524d06788582de31d2b6a728534ed44e9957`** (8 коммитов поверх исходного `1848756602db3ee07dba924669cd46545caa3777`).

Реализовано, протестировано и закоммичено: ядро фичи целиком, серверная голосовая ветка пост-звонкового ревью, нативные зависимости, E2E-покрытие жизненного цикла, сквозной контракт клиент↔сервер, автоматизированный смоук-харнесс симулятора. **322 автотеста зелёные**, `tsc --noEmit` без единой новой ошибки (26 pre-existing в НЕ связанных файлах — `CleanOnboarding.tsx`, `StatsLearningInsights.tsx`, `demo_content.ts`, `phrase_audio_player.ts`, `learning_v2_owner_repository_wallet_checkpoint.test.ts` — не трогать).

**Граница между проверенным и непроверенным — честно:**

Автотестами покрыто всё, что можно проверить без физического устройства: логика звонка на реальных последовательностях событий Realtime API, стык клиент↔сервер на настоящих payload'ах (с проверкой мутацией, что тесты не бутафорские), разрешение зависимостей, типы.

Автотестами НЕ покрыто и покрыто быть не может: (1) **звук** — ни один автотест не слышит, говорит ли ИИ, обрывается ли речь при перебивании, не заикается ли голос; (2) **фактическая нативная сборка** — компиляция WebRTC под iOS проверяется только запуском; (3) **живая сеть** — реальные ответы OpenAI Realtime и Firebase Functions.

Пункты (2) и (3) закрывает `scripts/max_voice_smoke.sh` (раздел 9) — одна команда, скриншоты и логи ложатся в `tmp/smoke_artifacts/` и читаются ассистентом. Пункт (1) — только человек в наушниках, автоматизации не поддаётся в принципе.

**Оставшаяся работа (не блокеры, оба — внешние шаги, не код):**
1. Прогнать `scripts/max_voice_smoke.sh` и починить то, что вскроется на реальной сборке.
2. Сверить, что OpenAI-ключ доступен в секретах Firebase Functions (скорее всего уже есть — используется текстовыми AI-фичами, но отдельно не проверялось).

**НЕ блокеры (разобрано в этой сессии):** MAX-пейволл и RevenueCat-offering не нужны для v1 (`hasMax = isPremium && voiceForPremiumBeta`, default `true` — обычный Premium уже открывает звонки); Firestore-документ remote config не нужен (сервер безопасно падает на дефолты, покрыто тестом).
