# МАКС ПЛАН — MAX Voice (realtime AI companion) — статус и продолжение работы

> Этот документ — единственный источник правды по фиче "MAX Voice" (полнодуплексные голосовые звонки с AI-компаньоном через OpenAI Realtime API). Он написан так, чтобы **любая другая LLM/сессия**, открыв только этот файл, могла понять: что сделано, как это сделано, что осталось, и как это проверить — без доступа к истории этого чата.

Дата написания: 2026-08-11.
Репозиторий: `/Users/maksymbabiev/Documents/phraseman` (реальный, "боевой" репо на Mac пользователя — НЕ `~/phraseman` без `Documents/`, это устаревшее зеркало).
Коммит, в котором зафиксирована вся фича: **`fb2ddab3a5de41d0360cbf766e782bcf879d8d9a`** — "Add MAX Voice: realtime voice calls with AI companion (WebRTC)", родитель `1848756602db3ee07dba924669cd46545caa3777`. Коммит подтверждён (`git log -1` на Mac показывает именно этот SHA как HEAD).

Полная спецификация фичи (архитектура, экономика, промпт, анимация халo-сферы) лежит в репозитории: **`.planning/phases/06-max-voice-realtime/SPEC.md`** — она же была отправлена пользователю отдельным файлом. Этот документ (МАКС ПЛАН) — не замена SPEC.md, а статус выполнения + чеклист продолжения.

---

## 1. Что это за фича

MAX Voice — новый премиум-тариф: полнодуплексный realtime голосовой разговор с AI-компаньоном по-английски, через OpenAI Realtime API (`gpt-realtime-mini`) поверх WebRTC, с серверной чеканкой ephemeral-токенов, semantic VAD, перебиванием (barge-in), учётом уровня CEFR ученика, транзакционными квотами (день/месяц/сессия в секундах), "лестницей бюджета" (budget ladder) с фолбэком на текст/TTS при исчерпании, и пост-звонковым review + начислением XP.

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
| Нативные зависимости (react-native-webrtc, incall-manager) + prebuild | ❌ **НЕ сделано** |
| `premium_dialog_review.ts` — ветка `mode:'voice'` (пост-звонковые правки текста) | ❌ **НЕ сделано** (сейчас `max_voice_review.tsx` — локальный стаб, TODO на сервер) |
| MAX paywall-экран (`paywall_h.tsx`) + RevenueCat MAX offering | ❌ **НЕ сделано** |
| Remote config документ `admin_runtime_config/openai_realtime_voice` в Firestore (продовые значения) | ❌ **НЕ создан в проде** (схема описана в SPEC.md, но реальный документ в Firestore нужно завести руками/скриптом) |
| `gate_ai_voice_call` remote flag | ✅ Добавлен в `remote_flags.ts`, default `false` (фича выключена до explicit включения) |

**Вывод: ядро фичи (voice-звонок целиком, от pre-start до review, с полным биллингом/квотами/защитой от абьюза) реализовано, протестировано, задокументировано и закоммичено. Не хватает: нативной сборки под реальное устройство, монетизационной обвязки (paywall) и голосовой ветки пост-звонкового ревью текста.**

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

263 юнит-теста написаны (по одному файлу теста на каждый новый модуль/функцию, клиент и сервер), все зелёные на момент коммита. Полный список тестовых файлов — см. раздел 3 (все файлы `*.test.ts` в списке). Для перезапуска на Mac:
```
cd /Users/maksymbabiev/Documents/phraseman
npx jest tests/max_call_ tests/max_voice_ tests/max_webrtc_
cd functions && npx jest src/max_voice_
```
(Точные npm-скрипты могут отличаться — свериться с `package.json`/`functions/package.json`, если команда выше не сработает "из коробки".)

---

## 6. Что осталось сделать (чеклист для продолжения)

1. **Нативные зависимости и prebuild.**
   - Добавить `react-native-webrtc` и `react-native-incall-manager` (или их актуальные эквиваленты) в `package.json`.
   - Прописать нужные конфиги (permissions на микрофон iOS/Android, background audio mode при необходимости) в `app.json`/`app.config`.
   - Запустить `expo prebuild` (или эквивалент) и проверить, что `max_webrtc_module.ts` подхватывает нативный модуль (guarded loader сейчас безопасно деградирует, если модуля нет — это ожидаемо ДО prebuild).
   - Smoke test на реальном устройстве (эмулятор часто не поддерживает WebRTC-медиа полноценно) — минимум: preflight → mint → connect → услышать AI → сказать фразу → услышать ответ → barge-in → hangup → review.

2. **`premium_dialog_review.ts` — голосовая ветка.** Сейчас `max_voice_review.tsx` — локальный стаб. Нужно:
   - Добавить `mode:'voice'` ветку в существующий `premium_dialog_review.ts` (сервер), принимающую транскрипт голосового звонка вместо текстового диалога.
   - Подключить `max_voice_review.tsx` к этому серверному эндпоинту вместо локального TODO.
   - Написать юнит-тест на новую ветку по аналогии с существующими тестами `premium_dialog_review`.

3. **MAX paywall + монетизация.**
   - Создать `app/paywall_h.tsx` (описан в SPEC.md, но не реализован).
   - Завести MAX offering в RevenueCat (продовая конфигурация вне кода — сделать руками в дашборде RevenueCat, затем подключить product ID в код).
   - Прогейтить вход в MAX Voice через paywall (сейчас `ai_dialog_home.tsx` показывает карточку по `isMaxVoiceEntryVisible()`, но флоу покупки не реализован).

4. **Remote config в проде.** Завести документ `admin_runtime_config/openai_realtime_voice` в реальном Firestore (схема ~25 полей — см. SPEC.md раздел 3), значения по умолчанию описаны там же. Без этого документа сервер, вероятно, должен падать на дефолты или отказывать — проверить поведение `max_voice_config.ts` при отсутствующем документе (`maxVoiceConfigAdmin`) и явно решить, безопасно ли это.

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

## 9. Статус этой сессии на момент записи документа

Коммит `fb2ddab3a5de41d0360cbf766e782bcf879d8d9a` подтверждённо на HEAD Mac-репозитория. Документ МАКС ПЛАН создан и будет держаться в актуальном состоянии по ходу дальнейшей работы (см. раздел 6 — следующий шаг: нативные зависимости/prebuild). Копия документа сохраняется в репозитории по пути `.planning/phases/06-max-voice-realtime/MAX_PLAN.md` и отправляется пользователю напрямую.
