# Admin v2 YouTube Analytics — план реализации

> Для выполнения использовать `subagent-driven-development` (рекомендуется) или `executing-plans`. Работать последовательно, по одному заданию, с RED → GREEN → проверка diff.

**Цель:** добавить consent-gated измерение YouTube-видео в приложении и отдельный read-only экран `#youtube-analytics` в Admin v2. Источник отчёта — ежедневный экспорт Firebase Analytics в BigQuery; в Admin попадают только анонимные агрегаты.

**Спецификация:** `docs/superpowers/specs/2026-07-13-admin-v2-youtube-analytics-design.md`.

**Архитектура:** приложение отправляет девять управляемых событий через существующий `trackEvent()`; WebView сообщает только валидированные состояния YouTube IFrame API; чистый runtime считает настенное активное время только в состоянии PLAYING; admin-only callable агрегирует BigQuery в полуинтервале `[fromMicros,toMicros)`; Admin v2 отображает готовый ограниченный snapshot без сырых идентификаторов.

## Обязательные ограничения до начала работы

- Прочитать `docs/design/ADMIN_UI_BIBLE.md` перед изменением Admin v2.
- Сохранить исходный SHA: `$env:YOUTUBE_ANALYTICS_BASE_SHA = git rev-parse HEAD` и записать его в журнал выполнения.
- Рабочее дерево уже содержит чужие изменения в `admin/v2/scripts/admin-core.js`, `admin-firebase.js`, `admin-router.js`, `admin.css`, `functions/src/index.ts` и `functions/lib/**`. Перед каждым патчем перечитывать актуальные фрагменты. Ничего не откатывать и не форматировать целиком.
- Для файлов с исходными чужими изменениями использовать `git diff -- <file>`, затем `git add -p -- <file>`; для новых файлов допустим `git add -- <file>`. Всегда проверить `git diff --cached`. При смешанном hunk остановиться и разделить патч вручную.
- Не использовать `git add .`, `git reset --hard`, `git checkout --`, проектный `OPENAI_API_KEY` и Firestore для YouTube-событий.
- Тесты не должны переписывать source-файлы. Не добавлять `functions/lib/**` в feature-коммиты.
- Приложение отправляет события только при текущем consent `granted`. Отзыв согласия локально прекращает попытку без terminal-события и без любого обхода consent gate.
- Серверный callable применяет существующую политику `ENFORCE_APP_CHECK`. Строгое production enforcement включается только вместе с корректно настроенным App Check для Admin web; до этого нельзя заявлять, что App Check фактически обязателен.

## Карта изменений

Новые файлы:

- `app/youtube_analytics_contract.ts`
- `app/youtube_playback_runtime.ts`
- `tests/youtube_analytics_contract.test.ts`
- `tests/youtube_playback_runtime.test.ts`
- `functions/src/admin_youtube_analytics_core.ts`
- `functions/src/admin_youtube_analytics_core.test.ts`
- `functions/src/admin_youtube_analytics.ts`
- `functions/src/admin_youtube_analytics.test.ts`
- `admin/v2/scripts/pages/youtube-analytics.js`
- `tests/admin_v2_youtube_analytics_contract.test.ts`

Изменяемые файлы:

- `app/product_analytics_event_catalog.ts`
- `tests/product_analytics_event_catalog.test.ts`
- `app/lingman_youtube.ts`
- `tests/lingman_youtube.test.ts`
- `app/lingman_video_player.tsx`
- `app/lingman_videos.tsx`
- `components/LingmanVideosButton.tsx`
- `tests/lingman_youtube_quality_gate.test.ts`
- `functions/src/admin/permissions.ts`
- `functions/src/admin/permissions.test.ts`
- `functions/src/index.ts`
- `admin/v2/index.html`
- `admin/v2/scripts/admin-firebase.js`
- `admin/v2/scripts/admin-router.js`
- `admin/v2/scripts/admin-core.js`
- `admin/v2/styles/admin.css`

## Task 1. Строгий событийный контракт

**Файлы:** `app/youtube_analytics_contract.ts`, `app/product_analytics_event_catalog.ts` и их два focused-теста.

- [ ] Добавить RED-тест каталога на все девять событий:
  `youtube_home_entry_click`, `youtube_catalog_open`, `youtube_video_select`, `youtube_player_ready`, `youtube_playback_start`, `youtube_playback_checkpoint`, `youtube_playback_end`, `youtube_external_video_open`, `youtube_channel_open`.
- [ ] Добавить table-driven RED-тест всех девяти допустимых форм payload и отдельных недопустимых комбинаций.
- [ ] Реализовать discriminated union по имени события. Общие обязательные поля каждого варианта: `eventId`, `sessionId`, `channelId`, `source`, `platform`, `appVersion`, `buildNumber`, `occurredAtMs`.
- [ ] Единый app-emitter сначала читает `getProductAnalyticsSessionId()`. Если сессия отсутствует, пуста или невалидна, событие пропускается полностью: builder/`trackEvent` не вызываются, fallback вроде `missing_session` не создаётся. Добавить тест нулевой отправки для этого случая.
- [ ] `videoId` обязателен для select/ready/playback/external-open; для `youtube_channel_open` он обязателен при `source:'player'` и запрещён/необязателен для catalog согласно явному варианту union.
- [ ] `playbackId` обязателен только для start/checkpoint/end. Числовые playback-поля допускаются только в соответствующих вариантах и ограничиваются finite bounds.
- [ ] `videoTitle` допускается только у `youtube_video_select`, где он берётся непосредственно из загруженного объекта `LingmanYoutubeVideo` на экране каталога. Не передавать title через route params и не принимать его от player screen. На сервере title используется только из select-событий, нормализуется до 100 символов; Admin всегда экранирует его.
- [ ] Для channel click зафиксировать `source:'catalog'|'player'`; для остальных событий — точные допустимые source, чтобы произвольные сочетания не компилировались и не проходили runtime-проверку.
- [ ] Добавить `parseYoutubePlayerMessage(raw)` с allowlist форм `{version:1,type:'ready'}`, `{version:1,type:'state',state,positionMs,durationMs}` и `{version:1,type:'error',code}`; position/duration finite в диапазоне `0..86_400_000`, error code — только известный bounded числовой код YouTube IFrame API, неизвестные значения возвращают `null`. Тест error-варианта входит в `tests/youtube_analytics_contract.test.ts` уже в этой задаче.
- [ ] Зарегистрировать поля и уникальные metric IDs `youtube.*.v1` в governed каталоге. Каноническое поле — `session_id`; `product_session_id` не использовать в новом контракте.

Команды:

```powershell
npx jest --runTestsByPath tests/product_analytics_event_catalog.test.ts tests/youtube_analytics_contract.test.ts --no-cache --runInBand
```

Ожидание: сначала RED из-за отсутствующего контракта, после реализации PASS. Отдельно тест подтверждает, что все девять payload содержат `platform`, `app_version`, `build_number`, а title отсутствует во всех событиях кроме select.

Коммит: `feat: define governed youtube analytics events`. Перед staging применить правила частичного staging выше.

## Task 2. Чистый runtime активного просмотра

**Файлы:** `app/youtube_playback_runtime.ts`, `tests/youtube_playback_runtime.test.ts`.

- [ ] RED-тест: PLAYING 4 секунды → PAUSED 10 секунд → seek → PLAYING 3 секунды → background даёт ровно 7000 ms active watch и один start.
- [ ] Добавить тесты buffering, повторного playing callback, 10-секундного checkpoint, end, exit, external, error, seek назад/вперёд, duration=0, unknown duration и новой попытки после terminal.
- [ ] Разделить два завершения: `finish(reason)` может emit terminal через переданный emitter; `revokeConsent()` только очищает локальное состояние, таймеры и playback ID без emit. После revoke runtime остаётся заблокированным до явного `setConsent(true)`.
- [ ] Добавить поведенческий тест: после `revokeConsent()` ни текущая попытка, ни дальнейшие callbacks не вызывают emitter; после нового granted создаётся новый playback ID.
- [ ] Реализовать wall-clock подсчёт только между подтверждённым PLAYING и следующим pause/buffer/background/end. Position нужен для прогресса, но seek не добавляет watch time.
- [ ] Terminal и revoke идемпотентны. Checkpoint имеет номинальный интервал 10 секунд; никаких обещаний о сохранении последнего отрезка после OS suspension.

Команда:

```powershell
npx jest --runTestsByPath tests/youtube_playback_runtime.test.ts --no-cache --runInBand
```

Коммит: `feat: measure youtube active playback time`.

## Task 3. YouTube IFrame bridge и остановка фоновой работы

**Файлы:** `app/lingman_youtube.ts`, `tests/lingman_youtube.test.ts`.

- [ ] RED-тест на IFrame API, `onReady`, state mapping, snapshot только в PLAYING, отсутствие autoplay и очистку interval.
- [ ] HTML создаёт `YT.Player`, а не голый iframe. Каждое сообщение включает `version:1`; наружу передаются только ready/state/position/duration/error.
- [ ] Явно подключить `YT.Player.events.onError`: очистить polling и отправить bounded `{version:1,type:'error',code}`; parser принимает только известный числовой bounded code, а RN runtime завершает попытку с terminal `error` только пока consent granted.
- [ ] Добавить `window.__phrasemanSetAnalyticsActive(boolean)`: `false` немедленно очищает interval; `true` может восстановить его только если document видим и player PLAYING.
- [ ] `visibilitychange`, `pagehide` и `beforeunload` останавливают polling. Повторный start не создаёт второй interval.
- [ ] Тест статически и/или через выделенный чистый helper проверяет наличие `document.visibilityState`, `clearInterval`, идемпотентность start/stop и mapping `1→playing`, `2→paused`, `3→buffering`, `0→ended`.

Команда:

```powershell
npx jest --runTestsByPath tests/lingman_youtube.test.ts --no-cache --runInBand
```

Коммит: `feat: bridge youtube iframe playback state`.

## Task 4. Подключение событий в приложении и полный lifecycle

**Файлы:** три app-компонента и `tests/lingman_youtube_quality_gate.test.ts`.

- [ ] RED quality gate подтверждает все девять вызовов, отсутствие Firestore writes, отсутствие title в route params/player payload и наличие consent/focus/AppState guards.
- [ ] Создать единый helper контекста на базе `Platform.OS`, `Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown'`, `Constants.nativeBuildVersion ?? 'unknown'`, `Date.now()`; каждый builder получает эти поля явно.
- [ ] Home button: emit `youtube_home_entry_click` до навигации.
- [ ] Catalog: один `youtube_catalog_open` на product session + channel; select получает `video_id` и `video_title` из текущего загруженного `LingmanYoutubeVideo`; external video/channel click emit до `Linking.openURL`.
- [ ] Player: ready/start/checkpoint/end и external/channel click. Route params содержат только allowlisted `videoId`; title не является источником аналитики.
- [ ] Подписаться на `subscribeAnalyticsConsent`. Переход granted → denied/unknown вызывает только `runtime.revokeConsent()` и выключает WebView polling. Не вызывать `trackEvent` после закрытия consent gate и не хранить события в Firebase, PostHog или локальной очереди.
- [ ] Использовать `useIsScreenFocused()` и `AppState`. При blur/background вызвать runtime background flush только пока consent ещё granted, затем `webViewRef.injectJavaScript('window.__phrasemanSetAnalyticsActive(false);true;')`; при focus/active включить polling только если consent granted. Cleanup не должен emit после revoke.
- [ ] Поведенческий тест с mock `trackEvent`: revoke → state/tick/unmount → 0 новых отправок; отдельный поиск подтверждает отсутствие PostHog/local queue/Firestore paths.
- [ ] Не добавлять RN `setInterval`; секундный polling остаётся внутри WebView и управляется lifecycle-командами.

Команда:

```powershell
npx jest --runTestsByPath tests/youtube_analytics_contract.test.ts tests/youtube_playback_runtime.test.ts tests/lingman_youtube.test.ts tests/lingman_youtube_quality_gate.test.ts tests/product_analytics_event_catalog.test.ts --no-cache --runInBand
```

Коммит: `feat: track youtube engagement in app`.

## Task 5. Серверная семантика, точные окна и BigQuery SQL

**Файлы:** `functions/src/admin_youtube_analytics_core.ts`, `functions/src/admin_youtube_analytics_core.test.ts`.

- [ ] Сначала создать fixture-тесты отдельными cases: упорядоченная воронка; события не по порядку; повторы event_id; конфликтующие video IDs; незавершённая попытка; duration=0; thresholds 25/50/75/100; quantiles; UTC boundary; filters; partial/empty/ready quality state.
- [ ] Request parser принимает только `rangeDays:7|28|90`, `platform:'all'|'ios'|'android'`, необязательные непустые `videoId`/`channelId`. Пустые строки означают отсутствие фильтра; непустое невалидное значение вызывает `HttpsError('invalid-argument', ...)`, а не превращается в `null`.
- [ ] Callable вычисляет `toMicros` один раз на старте запроса и `fromMicros = toMicros - rangeDays*86_400_000_000`. SQL обязательно фильтрует `event_timestamp >= @fromMicros AND event_timestamp < @toMicros`; suffix-границы используются только для pruning. Это rolling UTC окно, не календарные локальные дни.
- [ ] Для тестируемости SQL builder получает уже вычисленные `fromMicros/toMicros`; тесты проверяют включение ровно `fromMicros`, исключение ровно `toMicros` и одинаковые границы для всех CTE.
- [ ] Сначала нормализовать отдельные строки и выявить конфликт: одна пара `(user_pseudo_id,playback_id,schema_version)` с более чем одним непустым `video_id` **или** `channel_id` помечается invalid и исключается. Только после этого строить attempt key `(user_pseudo_id,playback_id,video_id,schema_version)`. Сделать отдельные fixture-тесты для конфликта видео и конфликта канала.
- [ ] Валидная попытка имеет ровно один start. Duplicate event_id дедуплицируется до подсчётов. Незавершённая попытка берёт последний checkpoint до `toMicros` и получает `is_unfinished:true`.
- [ ] `duration_ms`: брать последнее положительное finite значение в валидной попытке, ограниченное `1..86_400_000`; ноль/отрицательное/неfinite исключать. Threshold = accumulated active watch / chosen duration, не max position и не покрытие уникальных участков.
- [ ] Фильтры platform/channel/video применяются ко всем метрикам. Для ранних funnel-ступеней без video ID: channel filter применяется там, где поле существует; video filter начинает воронку с `youtube_video_select`, а home/catalog steps возвращаются как `not_applicable`, не как нефильтрованные числа.
- [ ] Последовательная funnel-пара — `(user_pseudo_id,session_id)`; следующий шаг должен быть позже предыдущего, после select совпадают channel/video. Число следующего шага не выше предыдущего.
- [ ] Title для строки видео берётся только из нормализованных `youtube_video_select`, выбирается последний непустой title для exact `(channel_id,video_id)`. Если title нет, snapshot возвращает `title:null`, UI показывает video ID.
- [ ] Response не содержит `user_pseudo_id`, `session_id`, `playback_id`, event_id или raw rows. Snapshot включает exact filters с `fromMicros/toMicros`, generated/data-through time, summary, trend, funnel, videos, quality.
- [ ] Ограничить `videos` максимум 200 строками. SQL запрашивает 201 строку после стабильной сортировки `playback_starts DESC, active_watch_ms DESC, channel_id ASC, video_id ASC`; 201-я строка не возвращается, но выставляет `quality.videosTruncated:true` и `quality.videoRowsReturned`. Тест проверяет лимит, стабильный tie-break и индикатор усечения; UI не называет усечённый набор полным.

Команда:

```powershell
cd functions
npx jest --runInBand src/admin_youtube_analytics_core.test.ts
```

Коммит: `feat: aggregate youtube analytics semantics`.

## Task 6. Permission, callable, ограниченный cache и App Check policy

**Файлы:** permissions, callable, index и focused backend tests.

- [ ] RED permission matrix: `analytics.read` только owner/admin/analyst; support/editor без права.
- [ ] RED callable tests: unauthenticated; permission-denied; invalid filter; exact query params; `maximumBytesBilled`; safe response; known missing daily export → empty; unknown BigQuery error → throw.
- [ ] Callable использует `onCall({...DEFAULT_CALLABLE_OPTIONS, enforceAppCheck: ENFORCE_APP_CHECK})`. Тест явно сравнивает эту политику с другими Admin analytics callables; документация не утверждает strict enforcement, если env-флаг выключен.
- [ ] Добавить bounded cache `MAX_CACHE_ENTRIES=50`, `CACHE_TTL_MS=600_000` (10 минут). После валидации сначала искать cache по role-neutral filter-only key. На hit вернуть сохранённый snapshot вместе с его исходными точными `fromMicros/toMicros`; новый `toMicros` не вычислять. Только на miss один раз вычислить точные границы, выполнить SQL и положить весь snapshot в cache. Перед insert удалить expired; при переполнении удалить oldest/LRU.
- [ ] Тест cache проверяет TTL, max size, eviction и отсутствие возврата snapshot для другого набора фильтров.
- [ ] Проверить, что response JSON не содержит сырых идентификаторов; логирование не печатает query rows или payload событий.
- [ ] Экспортировать callable из `functions/src/index.ts`, не затрагивая чужие экспорты.

Команды:

```powershell
cd functions
npx jest --runInBand src/admin/permissions.test.ts src/admin_youtube_analytics_core.test.ts src/admin_youtube_analytics.test.ts
npm run build
```

Коммит: `feat: expose protected youtube analytics snapshot`.

## Task 7. Отдельный доступный экран Admin v2

**Файлы:** page module, Admin v2 wiring/CSS и contract test.

- [ ] RED contract: route `#youtube-analytics`, mount `youtube-analytics-panel`, link из текущего `#analytics`, permission `analytics.read`, callable bridge, отсутствие восьмой top-level категории.
- [ ] Добавить JS runtime-тесты (через export чистых helpers или jsdom): `escapeHtml`; безопасный title/ID; сортировка; loading/empty/ready/partial/error; сохранение `lastSnapshot` при refresh error; permission-denied; неизвестный response shape.
- [ ] Route остаётся sub-route. Экран доступен owner/admin/analyst и не виден ролям без `analytics.read`.
- [ ] Filters: 7/28/90, all/iOS/Android, channel, video и одна primary кнопка «Обновить данные». Невалидный фильтр показывает понятную ошибку и не очищает последний snapshot.
- [ ] KPI: home clicks, starts, анонимные экземпляры со start, total active time, average per attempt, channel-open clicks. Funnel уважает `not_applicable` ранних шагов при video filter.
- [ ] Trend показывает UTC-дни и имеет табличную альтернативу. Videos table сортируется доступными кнопками; если title отсутствует, главным текстом служит безопасный video ID и подпись «Название недоступно».
- [ ] Все server strings проходят `escapeHtml`; никакого `innerHTML` с неэкранированным значением. Error refresh оставляет старые цифры и добавляет warning.
- [ ] Disclosure: учитываются только consented анонимные экземпляры; переустановка может создать новый экземпляр; channel-open — только клик, не подтверждение просмотра/подписки; 10 секунд — номинальный checkpoint.
- [ ] Scoped `.youtube-analytics-*` CSS по Admin UI Bible: существующие tokens, dark foreground на lime, focus-visible, reduced motion, локальный table scroll, одна колонка controls до 760px.
- [ ] App Check readiness: не добавлять фиктивный токен. Если production включает `ENFORCE_APP_CHECK=true`, отдельным release prerequisite настроить Admin web App Check provider/site key и проверить получение токена до включения флага. Без этого оставить существующий conditional policy.

Команды:

```powershell
node --check admin/v2/scripts/pages/youtube-analytics.js
node --check admin/v2/scripts/admin-core.js
node --check admin/v2/scripts/admin-firebase.js
node --check admin/v2/scripts/admin-router.js
npx jest --runTestsByPath tests/admin_v2_youtube_analytics_contract.test.ts tests/admin2_detailed_analytics_integration.test.ts tests/admin_v2_analytics_contract.test.ts --no-cache --runInBand
```

Перед коммитом для каждого изменённого существующего Admin-файла: `git diff -- <file>` → `git add -p -- <file>` → `git diff --cached`. Коммит: `feat: add youtube analytics to admin v2`.

## Task 8. Интеграционная проверка и release evidence

- [ ] App gate:

```powershell
npx jest --runTestsByPath tests/product_analytics_event_catalog.test.ts tests/youtube_analytics_contract.test.ts tests/youtube_playback_runtime.test.ts tests/lingman_youtube.test.ts tests/lingman_youtube_quality_gate.test.ts --no-cache --runInBand
```

- [ ] Backend gate:

```powershell
cd functions
npx jest --runInBand src/admin/permissions.test.ts src/admin_youtube_analytics_core.test.ts src/admin_youtube_analytics.test.ts
npm run build
cd ..
```

- [ ] Admin gate и запрещённые пути:

```powershell
node --check admin/v2/scripts/pages/youtube-analytics.js
node --check admin/v2/scripts/admin-core.js
node --check admin/v2/scripts/admin-firebase.js
node --check admin/v2/scripts/admin-router.js
npx jest --runTestsByPath tests/admin_v2_youtube_analytics_contract.test.ts tests/admin2_detailed_analytics_integration.test.ts tests/admin_v2_analytics_contract.test.ts --no-cache --runInBand
rg -n "submitClientReport|app_activity|OPENAI_API_KEY|collection\(|addDoc\(|setDoc\(|posthog|local.*queue" app/youtube_analytics_contract.ts app/youtube_playback_runtime.ts app/lingman_video_player.tsx app/lingman_videos.tsx components/LingmanVideosButton.tsx
npm run scan:secrets:staged
```

- [ ] Manual iOS/Android: consent granted; play 12s, pause 5s, seek, play 8s, background/return, external open. Подтвердить один start, около 20s active, отсутствие счёта pause/seek/background.
- [ ] Manual consent revoke во время PLAYING: после revoke в Firebase Analytics DebugView нет checkpoint/end и любых новых custom YouTube events; в PostHog/локальной очереди также ничего не появилось.
- [ ] Admin widths 375/768/1024/1440: нет page-level horizontal scroll; loading/empty/partial/error сохраняют геометрию; focus видим; chart имеет table; lime CTA имеет тёмный foreground.
- [ ] App Check release check: если `ENFORCE_APP_CHECK=true`, доказать успешный токен Admin web и успешный callable; если false, явно записать «conditional policy, enforcement не проверен».
- [ ] Итоговый diff относительно сохранённого SHA, а не `HEAD~N`:

```powershell
git status --short
git diff --check $env:YOUTUBE_ANALYTICS_BASE_SHA..HEAD
git log --oneline "$env:YOUTUBE_ANALYTICS_BASE_SHA..HEAD"
git diff --cached --check
```

- [ ] Проверить каждый feature-коммит на отсутствие чужих hunks. Не считать ручные сценарии выполненными без фактического устройства/эмулятора.
- [ ] Перед заявлением о завершении применить `verification-before-completion` и передать Advisor: objective, spec, фактический diff, список команд и результаты, состояние App Check, невыполненные manual checks. Завершать только после `DECISION: APPROVED`.

## Release-порядок после реализации

Реализация сама ничего не деплоит. После согласованного release:

1. выпустить приложение с новыми событиями;
2. дождаться первого ежедневного BigQuery export;
3. сверить контрольный сценарий с агрегатами;
4. настроить и проверить Admin web App Check до включения strict enforcement;
5. только затем считать production-данные доступными; для более ранних периодов показывать empty state.
