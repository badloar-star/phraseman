# Поэтапное включение App Check (H9) — инструкция

**Контекст:** App Check НЕ энфорсится в проде. Все callable-функции (`HOT_CALLABLE_OPTIONS`)
и `accountDeleteMine`/`vipRevokeMine` зовут `enforceAppCheck: ENFORCE_APP_CHECK`, где
`ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true'` (по умолчанию **false**).
Любой с валидным Firebase Auth токеном (в т.ч. анонимным) может дёргать endpoint без аттестации.

**Резкое включение СЛОМАЕТ прод**: клиенты старых версий и анонимные вызовы (OpenAI-функции)
пойдут без App Check-токена → `unauthenticated`. Поэтому — строго поэтапно.

Код уже готов: предохранитель `ENFORCE_APP_CHECK` на месте; добавлен прогрев-лог
`app_check_header_shape` на критичных identity-функциях (`authEnsureStableLink`,
`authStampAnonOwnership`, `authMergeStableAccounts`).

## Шаги (ручные, в Firebase Console — Claude не может их выполнить)

### 1. Включить App Check API и провайдеры (Console)
- Firebase Console → App Check → включить (сейчас API отдаёт 403).
- Android: зарегистрировать **Play Integrity** для package `com.<...>.phraseman`.
- iOS: зарегистрировать **DeviceCheck** (или App Attest).
- Веб (админка/сайт), если зовёт CF: reCAPTCHA Enterprise / v3.

### 2. Инициализация App Check в клиенте
- Проверить, что клиент инициализирует App Check ПЕРЕД первым вызовом CF
  (`initFirebaseAppCheckIfAvailable()` уже вызывается в `ensureStableAuthLinkForStableId`
  и `mergeStableAccountsViaServer` — убедиться, что он реально активирует провайдер,
  а не no-op в текущей сборке).
- Раскатить релиз с рабочим App Check СНАЧАЛА (клиенты должны начать слать токен
  до того, как сервер начнёт его требовать).

### 3. Прогрев по логам (НЕ энфорсить)
- Несколько дней наблюдать `app_check_header_shape` в Cloud Logging:
  ```
  resource.type="cloud_function" jsonPayload.event="app_check_header_shape"
  ```
- Смотреть распределение `header.kind`: доля `jwt_like` (валидный токен) vs
  `missing`/`short_non_jwt` (старые клиенты). Включать энфорс, только когда `jwt_like`
  ≈ почти весь живой трафик (старые версии вымылись).

### 4. Включить энфорс ПОЭТАПНО  ✅ КОД ГОТОВ К ЧАСТИЧНОМУ ROLLOUT
Добавлены **per-group флаги** в `functions/src/callable_options.ts` (2026-06-14, B-audit),
чтобы включать энфорс по группам, а не «всё или ничего». Каждый флаг по умолчанию
наследует глобальный `ENFORCE_APP_CHECK` (т.е. сейчас все = false, поведение не изменилось):

| Env-переменная | Группа функций | Когда включать |
|---|---|---|
| `ENFORCE_APP_CHECK_SENSITIVE` | `accountDeleteMine`, `vipRevokeMine` (разрушительные) | ПЕРВЫМИ |
| `ENFORCE_APP_CHECK_OPENAI` | `explainPhrase`, `explainMistake`, `premiumDialogSend`, `weeklyReviewGenerate`, `statsInsightsGenerate` (платный OpenAI) | ПОСЛЕДНИМИ, после прогрева |
| `ENFORCE_APP_CHECK` | всё остальное (`HOT_CALLABLE_OPTIONS`: auth/league/leaderboard/…) | в конце, общим махом |

Порядок раската:
1. Сначала `ENFORCE_APP_CHECK_SENSITIVE=true` (мало трафика, высокий риск) → `deploy:safe`,
   мониторить `unauthenticated`. Каждый флаг = `'true'` включает, `'false'` принудительно
   выключает (даже если глобальный true), отсутствие = следует глобальному.
2. Затем общий `ENFORCE_APP_CHECK=true` для остальных `HOT_CALLABLE_OPTIONS`-функций.
3. В последнюю очередь `ENFORCE_APP_CHECK_OPENAI=true` (анонимные платные вызовы — самый
   хрупкий кейс: анонимная сессия тоже должна получать App Check-токен).
- При всплеске `unauthenticated` — откатить соответствующий флаг (unset / `false`).

### 5. Полный энфорс
- Когда все группы стабильны под App Check — оставить все три флага в `true`.
- ВАЖНО: код уже разведён по группам; вручную в коде менять ничего не нужно — только env
  переменные функций и `deploy:safe`.

## 2026-07-02 — проводка флага завершена по ВСЕМ `onCall`

**Дыра, которую закрыли:** план предполагал, что достаточно перещёлкнуть env-переменные, но
часть `onCall`-функций вообще НЕ ссылалась ни на один `enforceAppCheck` — они бы навсегда
остались без энфорса, сколько бы env-флагов ни включили. Теперь провязка полная: каждый
`onCall` в `functions/src` ссылается на соответствующий групповой флаг (напрямую, через spread
`HOT_CALLABLE_OPTIONS`/`CALLABLE_BASE`/`ACCOUNT_DELETE_OPTIONS`, либо через новую строку в
объекте опций). Аудит `grep onCall(` по всему `functions/src` — ни одной функции без флага.

**Довязано 32 сайта в 17 файлах** (остальные уже были провязаны ранее):
- `ENFORCE_APP_CHECK` (общая группа, 30): `community_packs` (7), `league_chat` (4),
  `arena_hill` (2), `arena_ghosts` (2), `arena_season_rewards` (2),
  `openai_dialog_model_config` (2), `promo_codes` — admin upsert/batch (2),
  `arena_club_wars` (1), `arena_bot_match` (1), `admin_grant` (1), `friend_codes` (1),
  `league_chest` (1), `help_board` — `helpBoardAdminModerate` (1),
  `openai_budget_dashboard` (1), `openai_jobs_config` (1).
- `ENFORCE_APP_CHECK_OPENAI` (платный OpenAI, 2): `admin_translate` (`adminTranslateMessage`),
  `compass_chat_cron` (`compassChatRunNow`) — обе реально зовут OpenAI.
- `ENFORCE_APP_CHECK_SENSITIVE`: новых нет (`accountDeleteMine`/`vipRevokeMine`/`adminDecideUserIdea`
  были провязаны ранее).

Поведение по умолчанию НЕ изменилось: все флаги наследуют `ENFORCE_APP_CHECK` (=false), пока
env-переменные не выставлены. `npm run build` (tsc) — зелёный, 0 ошибок до и после правок.

## Что НЕ делать
- Не включать `ENFORCE_APP_CHECK=true` глобально одним махом до прогрева — гарантированный
  массовый `unauthenticated` у живых пользователей.
- Анонимные OpenAI-вызовы: убедиться, что анонимная сессия тоже получает App Check-токен,
  иначе платные фичи отвалятся (App Check ≠ Auth — он про аттестацию приложения, не юзера).

---

- App Check сейчас выключен — функции зовутся без проверки «это настоящее приложение».
- Включать надо осторожно и по шагам, иначе у живых людей всё сломается.
- Код уже готов к включению; добавлены «датчики», чтобы видеть, готовы ли телефоны, прежде чем включать.
- Сами шаги включения — в панели Firebase вручную (я туда не могу), по инструкции выше.
