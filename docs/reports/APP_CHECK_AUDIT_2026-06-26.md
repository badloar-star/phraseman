# App Check audit — 2026-06-26

## Короткий ответ

По коду App Check подготовлен, но серверный callable-enforce не включен глобально сам по себе.

- Store release client: пробует реальный App Check через Play Integrity на Android и App Attest with DeviceCheck fallback на iOS.
- Expo Go / cloud sync off: App Check выключается.
- Dev/internal build: App Check включается только явно через debug provider (`EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG=1` или `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN`).
- Callable Cloud Functions: enforce управляется env-флагами функций, по умолчанию `ENFORCE_APP_CHECK=false`.
- HTTP `questionTimeout`: отдельно требует `x-firebase-appcheck` и вручную проверяет токен через `admin.appCheck().verifyToken`.

Я не переключал боевое поведение и не включал App Check глобально. Этот аудит только фиксирует текущий контракт и защитный тест.

Recheck 2026-06-27:

- `firebase use` still points at `phraseman-ea0b3`.
- `firebase --version` is `15.15.0`.
- `firebase appcheck:apps:list --project phraseman-ea0b3 --json` is still unavailable in this CLI build (`appcheck:apps:list is not a Firebase command`).
- `firebase functions:config:get --project phraseman-ea0b3` returns `{}`; this does not expose Gen2 env vars.
- `gcloud` is not installed in this workspace, so deployed Gen2 environment variables could not be inspected here.
- Repo-local search found no checked-in `ENFORCE_APP_CHECK=true`; by code, callable enforcement remains off unless the deployed function environment sets the relevant env flag to `true`.

Локальная CLI-проверка 2026-06-26:

- `firebase use` показывает проект `phraseman-ea0b3`.
- `firebase --version` показывает `15.15.0`.
- В этой CLI-сборке App Check commands не доступны (`firebase appcheck:apps:list --json` вернул "not a Firebase command"), поэтому факт включения providers в Firebase Console этим способом не подтвержден.

## Клиент

Источник: `app/app_check_init.ts`, `app/_layout.tsx`, `firebase.json`.

Что хорошо:

- Native auto refresh в `firebase.json` стоит `false`, поэтому приложение не начинает само mint-ить мусорные/placeholder tokens до настройки provider.
- `initFirebaseAppCheckIfAvailable()` кеширует in-flight init promise, поэтому несколько мест старта не запускают параллельную тяжелую инициализацию.
- Перед включением auto refresh код проверяет настоящий JWT-like token: сначала `getToken(false)`, потом `getToken(true)`.
- Если токен не похож на настоящий JWT или native module падает, promise сбрасывается, auto refresh выключается, будущая попытка возможна.
- Получение токена ограничено `3500 ms`, чтобы не подвесить старт.
- В `_layout.tsx` прогрев App Check перед cloud hydrate ограничен `1200 ms`, поэтому первый кадр приложения не должен ждать сеть/App Check слишком долго.

Режимы:

| Режим | Что происходит |
|---|---|
| Expo Go | App Check не инициализируется |
| `CLOUD_SYNC_ENABLED=false` | App Check не инициализируется |
| Store release | Play Integrity / App Attest with DeviceCheck fallback |
| Dev/internal без debug env | App Check не инициализируется |
| Dev/internal с debug env/token | Debug provider |

## Сервер

Источник: `functions/src/callable_options.ts`.

Есть центральные флаги:

| Флаг | Смысл | Дефолт |
|---|---|---|
| `ENFORCE_APP_CHECK` | общий callable enforce | `false`, если env не равен `true` |
| `ENFORCE_APP_CHECK_SENSITIVE` | destructive/identity-sensitive функции | наследует общий флаг, но может включаться отдельно |
| `ENFORCE_APP_CHECK_OPENAI` | платные OpenAI функции | наследует общий флаг, но может включаться отдельно |

Примеры покрытия:

- `accountDeleteMine`, `vipRevokeMine`: `ENFORCE_APP_CHECK_SENSITIVE`.
- `premiumDialogSend`, `premiumDialogTranslate`, `explainPhrase`, `explainChoice`, `explainQuiz`, `explainMistake`, `statsInsightsGenerate`, `weeklyReviewGenerate`, `compassGenerate`: `ENFORCE_APP_CHECK_OPENAI`.
- Горячие runtime callable через `HOT_CALLABLE_OPTIONS`: общий `ENFORCE_APP_CHECK`. Сюда входят progress/league/leaderboard/auth горячие пути.
- `questionTimeout`: не callable, проверяет App Check вручную по HTTP header.

## Риск

Глобально включать `ENFORCE_APP_CHECK=true` одним шагом нельзя. Это может дать массовые `unauthenticated`, если часть живых клиентов еще не присылает нормальный App Check token или если Firebase Console providers не готовы.

Это особенно важно для:

- анонимных пользователей;
- OpenAI/paywall функций;
- старых версий приложения;
- preview/internal сборок без debug provider.

## Безопасный следующий план

1. Не трогать T0 runtime сейчас.
2. Проверить Firebase Console вручную: включен ли App Check API и зарегистрированы ли Play Integrity / App Attest / DeviceCheck providers.
3. Раскатить store build, где клиент уже умеет присылать настоящий token.
4. Несколько дней смотреть Cloud Logging по форме App Check header: доля `jwt_like` должна стать почти всей живой аудиторией.
5. Включать server enforce по группам:
   - сначала `ENFORCE_APP_CHECK_SENSITIVE=true`;
   - потом общий `ENFORCE_APP_CHECK=true`;
   - последними `ENFORCE_APP_CHECK_OPENAI=true`.
6. При всплеске `unauthenticated` выключать конкретный env-флаг, а не менять код.

## Guard added

`tests/firebase_cost_controls_contract.test.ts` теперь дополнительно проверяет:

- native auto refresh остается выключенным до настоящего provider;
- client provider matrix содержит debug / Play Integrity / App Attest fallback;
- App Check token mint имеет timeout и JWT-shape проверку;
- startup warmup ограничен `1200 ms`;
- server rollout остается staged через env flags;
- sensitive и OpenAI функции привязаны к своим группам;
- `questionTimeout` вручную проверяет `x-firebase-appcheck`.
