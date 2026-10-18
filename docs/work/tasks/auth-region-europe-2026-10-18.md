# Task packet: функции входа в europe-west1 (рядом с базой eur3), клиент — Европа с запасным путём на США

Governance-ID: TG-BF91922282E7
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: владелец 18.10 кнопкой «Да, перенести» (через координатора). Разбор — docs/work/tasks/auth-server-path-2026-10-18.md (fc30ae94a).

## Outcome

Функции входа работают рядом с базой: каждое обращение к базе ~5–10 мс вместо ~120 мс через океан. На проде сейчас authEnsureStableLink отвечает 3,6–5,9 с. Ожидание после переноса — 0,3–0,6 с на тёплом экземпляре.

Старые сборки продолжают звать us-central1 и работают как прежде.

## Scope

Сервер — одна и та же функция выкладывается сразу в два региона (`region: ['us-central1', 'europe-west1']`, firebase-functions 7.2.5):
- `authEnsureStableLink`;
- `authStampAnonOwnership`;
- `authMergeStableAccounts`.

Клиент — `app/auth_callable_fetch.ts`, единая обёртка всех трёх вызовов, и `app/auth_warm_fetch.ts`, прогрев:
- сначала Европа, нативным callable в europe-west1 или fetch по флагу `auth_callables_fetch_v1`;
- запасной путь на США:
  - функции нет в Европе (`not-found`, ещё не выложена) — для всех трёх, и Европа запоминается мёртвой до конца запуска;
  - сбой связи или таймаут — только для `authEnsureStableLink`: она идемпотентна. Метку и слияние дважды выполнять нельзя;
- выключатель: Remote Config `auth_region_eu_v1 = false` → сразу США;
- журнал `[AUTH-REGION]`: функция, регион, исход, код, мс, причина запасного пути.

Вне работы:
- `auth_provider.ts` и `cloud_sync.ts` не трогаются: они уже зовут обёртку, а запасной нативный путь на США — их замыкание;
- восстановление по коду и подсказка — отдельно, они не в цепочке обычного входа.

## Architecture

Обёртка `invokeAuthCallable(name, payload, nativeUs, opts)`:
1. Регион: если Европа не помечена мёртвой и выключатель не стоит → `europe-west1`.
2. Вызов в Европе:
   - флаг fetch включён → fetch на `https://europe-west1-<project>.cloudfunctions.net/<name>`;
   - иначе → нативный RNFirebase `httpsCallable(getFunctions(app, 'europe-west1'), name, { timeout })`.
3. Ошибка:
   - `not-found` → пометить Европу мёртвой, вызвать США (запрос не исполнялся);
   - для `authEnsureStableLink`: `unavailable` / `deadline-exceeded` / сеть → США;
   - иначе — ошибка наверх как есть: ответы сервера (`permission-denied`, `failed-precondition`…) одинаковы в обоих регионах.
4. США — прежний путь без изменений: fetch по флагу или `nativeUs()`.

Прогрев открывает экран входа в том регионе, который выбран сейчас.

## Security and privacy

Код и решения доступа те же, это одна функция в двух регионах. Данные по-прежнему в eur3. Новых данных нет.

## Technical debt

Копии в us-central1 живут, пока ими пользуются старые сборки. Снимает их координатор по имени и региону, когда в журнале запросов US останется ноль, как с `voiceMinuteWalletMine`. Владелец Ядро.

## Verification

- Тесты обёртки: Европа ok; not-found → США и память «мертва»; таймаут ensureLink → США; таймаут merge/stamp → ошибка без США; выключатель → США; ошибка сервера → наверх без США.
- Тест прогрева: URL в выбранном регионе.
- Узкий tsc.
- После выкладки — время `authEnsureStableLink` в журнале запросов europe-west1 (шаг плана fe8734d4d).

## Rollback

- Remote Config `auth_region_eu_v1 = false` — клиенты сразу идут в США, без сборки.
- Сервер: убрать `europe-west1` из списка регионов и выложить (копия в Европе удаляется по имени).
