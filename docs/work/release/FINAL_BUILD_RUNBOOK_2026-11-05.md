# Финальные сборки 02:30, ночь 04→05.11.2026 — runbook

Governance-ID: TG-344A0ABB77C6

Автор: «1 · ЯДРО». Цель владельца: к 07:00 готовые сборки в EAS. Android — production AAB, в Google Play НЕ отправляется. iOS — production, загрузка в App Store Connect, на ревью НЕ отправляется.

## 0. Ключевой факт про номер сборки (проверено read-only 05.11 ~00:55)

`eas build:list --platform ios`: iOS-сборки **2.0.3 / buildNumber 148 уже существовали до этой ночи** — `4a4b269d` (FINISHED, 2026-10-26 20:25, production) и три страховочные этой ночью (`087974a0`, `f36de789`, `76a99d49`). Сборка 147 (`b7cd86ab`, 26.10) и 146, 145 — тоже в истории. По `NIGHT_RELEASE_PLAN` 148 — боевой номер релиза 2.0.3.

Следствие:
- **Страховочные 148 (и iOS, и Android) НЕ могут быть загружены в магазины** — App Store Connect отвергает повторный `CFBundleVersion`, Play — повторный `versionCode` (в ASC/Play Console состояние не читалось — доступа к консолям из сессии нет; считаем, что 148 занят).
- Поэтому **сабмит страховочной невозможен**; запасной вариант = **только пересборка с новым номером**. Финал строится с `2.1.0 / 149` (см. срез ниже). Если и 149 окажется занят (проверить в ASC → TestFlight → Builds) — поднять до 150 в `app.json` (`android.versionCode` и `ios.buildNumber` ВМЕСТЕ) и повторить.
- Страховочные 148 нужны как «артефакт для проверки», а не как кандидат на сабмит.

## 1. Готовность iOS-сабмита (read-only)

- `eas.json` → `submit.production.ios = { ascAppId: "6764800879" }` — ровно один ключ; сторож `tests/release_version_consistency_2026_11_05.test.ts` проверяет, что нет параметров, которые сами отправляют на ревью.
- `eas submit` **никогда** не отправляет на ревью: он только загружает бинарник в App Store Connect (TestFlight). Отправка на ревью — отдельное действие владельца в ASC.
- Ключ ASC (API key) хранится в EAS-учётке проекта (`Using remote … credentials`); сборка и ранние `--auto-submit` (25.10, 26.10) отрабатывали. Флаги `eas submit`: `--non-interactive`, `--id <BUILD_ID>`, `--profile production`, `--platform ios`.
- Чего read-only проверить нельзя: валидность ASC API key на момент сабмита. Если ключ просрочен/отозван — `eas submit` упадёт с ошибкой авторизации ASC → шаг 6 (fallback).
- Android-сабмит (`submit.production.android`, `track: production`) НЕ используется ни в одной команде этого runbook.

## 2. Что делать ДО 02:30

1. Ревизор: `revisor_freeze.sh` — РЕАЛЬНЫЙ зелёный вердикт на финальном HEAD (первый прогон давал ложный GREEN, поправлено в de6a9961a).
2. Деплой сервера 01:50–02:00 завершён (см. `SERVER_DEPLOY_NIGHT_2026-11-05.md`).
3. Срез версии 02:15 — ОДНИМ коммитом:

```bash
node scripts/release_cut_2_1_0.mjs --apply --versions-only
git diff --stat app.json    # проверка: version/runtimeVersion 2.1.0, versionCode 149, buildNumber "149"
bash scripts/safe_commit.sh -m <msg> --expect app.json=4/4 -- app.json
```

Метку `RANK_GATES_NEW_USERS_SINCE_MS` Вход ставит сам в 01:25; скрипт её не трогает. После среза: `RELEASE_CUT=1 node --test tests/rank_gates_since_release_cut_guard.test.mjs` и `tests/release_version_consistency_2026_11_05.test.ts`.
4. `eas.json`: профиль `production` уже с `android.resourceClass: "large"` (e4ffca813) и `PHRASEMAN_R1_HIDE_V2=1`.

## 3. Команды финала (по порядку: Android → iOS)

Каждая сборка идёт из `git archive` выбранной ревизии (чистый снимок, EAS_NO_VCS=1), поэтому грязное общее дерево в неё не попадает. Брать тот HEAD, на котором Ревизор дал зелёный.

```bash
# светофор: слот (тяжёлое)
bash .claude/semaphore/slot.sh acquire "final EAS android+ios"

# 1) Android production AAB (large), в Google Play НЕ отправляется
bash scripts/eas_build_novcs.sh <HEAD_SHA> --platform android > C:/Temp/claude/eas_final_android.log 2>&1

# 2) iOS production, БЕЗ --auto-submit (сабмит вручную после FINISHED — надёжнее, чем авто-сабмит при --no-wait)
bash scripts/eas_build_novcs.sh <HEAD_SHA> --platform ios > C:/Temp/claude/eas_final_ios.log 2>&1
```

Ссылки на сборки (`https://expo.dev/accounts/badloar/projects/phraseman/builds/<id>`) выдаются в логе сразу после загрузки архива — слать координатору сразу после старта каждой платформы.

Статус смотреть (под коротким слотом):

```bash
cd C:/Temp/claude/eas_novcs_<SHORT_SHA> && EAS_NO_VCS=1 npx eas build:view <BUILD_ID> --json
```

- `FINISHED` — готово, в `artifacts.buildUrl` лежит .aab/.ipa.
- `ERRORED` — смотреть `error.errorCode` и лог (`logFiles[0]`); `IN_QUEUE`/`IN_PROGRESS` — ждать.
- `CANCELED` — кто-то остановил, повторить.

## 4. Сабмит iOS (ТОЛЬКО после FINISHED)

```bash
cd C:/Temp/claude/eas_novcs_<SHORT_SHA> && EAS_NO_VCS=1 npx eas submit --platform ios --profile production --id <IOS_BUILD_ID> --non-interactive
```

Результат: сборка 149 появляется в App Store Connect → TestFlight (Processing → Ready to Test). **Не** нажимать «Submit for Review» — это решает владелец. Если `eas submit` печатает `Waiting for build to complete` или зависает — это нормально, смотреть статус в ASC.

Перед сабмитом убедиться (глазами или по ASC): `buildNumber 149` в ASC ещё не занят.

## 5. Если сборка упала (до 3 попыток на платформу)

| Симптом | Причина | Что менять |
|---|---|---|
| Android: `EAS_BUILD_UNKNOWN_GRADLE_ERROR`, в логе `hermesc ... exit value 137` | OOM сборщика (бандл 86 % — свой код/данные, 5 курсов × 1600 фраз) | попытка 1: убедиться, что `android.resourceClass: "large"` в eas.json (уже). Попытка 2: `NODE_OPTIONS=--max-old-space-size=8192` в `eas.json` → `build.production.env` (+ коммит) и/или `--clear-cache` в команде `eas build`. Попытка 3: диагноз по логу `Run gradlew`/`Bundle JavaScript`; план Б по весу (ленивая загрузка курсов) — только по слову координатора |
| `Failed to get Git root path` в логе | шум `EAS_NO_VCS=1` (git в снимке нет) | игнорировать, это не ошибка |
| iOS: ошибка кредов/профиля (`credentials`, `provisioning`, `distribution certificate`) | сертификат/профиль в EAS | `eas credentials --platform ios` (интерактивно, владелец/координатор); проверить срок: сертификат до 2027-05-14. Повтор сборки |
| iOS: `ITMS-4238 / Redundant Binary Upload` или «build number already used» при сабмите | buildNumber занят в ASC | поднять `ios.buildNumber` и `android.versionCode` на следующий номер (150) ВМЕСТЕ, пересобрать |
| `eas submit` падает по ASC API key | ключ отозван/просрочен | сообщить координатору; сборка остаётся FINISHED как артефакт, загрузка вручную через Transporter с .ipa (`artifacts.buildUrl`) |
| `eas build` не стартует: «concurrency»/очередь | лимит параллельных сборок плана | запускать по очереди (Android первым), не ломать очередь |
| Зависание загрузки архива >15 мин | тяжёлый архив | проверить `.easignore` (`.codex-tmp-*` исключён a3eafc506), перезапустить скрипт |

После 3 неудач на платформе — стоп и рапорт координатору (никаких «не вышло, вот причина» как итога ночи: следующая ступень — план Б по весу).

## 6. Fallback: «сабмит страховочной»

НЕВОЗМОЖЕН для номера 148 (см. §0). Что есть вместо:
- страховочные 148 остаются как рабочие артефакты для установки на устройство/эмулятор и сверки;
- запасной путь к стору — **пересборка** с 149 (или 150), и **только** она. Android-страховка с 0c466ed90/e4ffca813 как «сабмит-кандидат» (формулировка координатора) работает только если versionCode 148 в Play ещё не занят: проверить в Play Console → Release → App bundles; без доступа к консоли считать занятым.

## 7. Отчёт координатору

После каждого перехода статуса (старт / FINISHED / ERRORED) — одной строкой: платформа, build ID, ссылка, статус, причина при падении. После FINISHED iOS — ещё строка о сабмите (`eas submit` выполнен, ASC: Processing/Ready, на ревью НЕ отправлено).
