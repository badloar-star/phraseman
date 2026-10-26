# Хендовер: 1 · ЯДРО (сервер, навигация, сборка) → Codex, 26.10.2026

Пишется для агента без нашего контекста. Репозиторий `C:/appsprojects/phraseman`, ветка `feature/referral-roulette`.
Правила проекта — `CLAUDE.md` и `AGENTS.md` в корне. Обязательно прочитать до работы:
- коммит только через `scripts/safe_commit.sh` (dry-run → `--expect путь=+/-` → коммит; `--wait-window` для app/ components/
  modules/ functions/ hooks/ constants/);
- тяжёлое (jest, tsc, сборки) — только через светофор `bash .claude/semaphore/slot.sh run --wait=600 "зачем" -- bash <скрипт>`;
  хук блокирует команды со словами jest/tsc/npm run/eas build в тексте → писать команды в файл-скрипт и запускать файл;
- jest — только точечно с `NODE_OPTIONS=--max-old-space-size=8192` (без него OOM); смотреть ТЕКСТ «Tests: N passed», не код
  возврата;
- в дереве тысячи чужих незакоммиченных правок (Codex, другие сессии) — чужое не трогать, проверки и сборки — только в
  чистом снимке `git -c core.autocrlf=false archive <хэш>`;
- App Check запломбирован навсегда; прод-выкладки и записи в прод — только по «да» владельца.

## 1. Сделано 26.10 (хэши)

### Сервер — на бою, журналы чистые
| Шаг | HEAD выкладки | Время UTC | Что |
|---|---|---|---|
| 2 | 36938fd46 | 05:53–06:00 | 13 функций (вариант Б удаления, шлюз отсрочки, подтяжка Plus, `dialogueV2FreeformTranslate` — создана, ступени в лесенке, «золото» `spireReportSteps`, сводка восстановления) + `hosting:admin` + `hosting:knowlywww` (политика October 25) |
| 2б | ebe2b465a | 06:44–06:51 | 11 функций: права до разбора (`adminGrantAccess`, `adminSetUserBan`), настоящий срок Plus для кольца, журнал `[FREEFORM-PLUS]`, пуш `streak_at_risk` без «урока» (`reEngagePushCron`), пуш «Позвать» без «урока» (`friendsNudge`, 005508955) |
Пакет и журнал: `docs/work/release/server-deploy-pack-2026-10-26.md` (строки «выложено» в разделе «Порядок» и под шагом 2б).
Выкладка — только `bash scripts/deploy_from_clean_head.sh --only "<цели>"` (сухой) → то же с `--execute`; скрипт сам
проверяет право вызова. Выгрузка не содержит `docs/` — тест `functions/src/friends_push_copy.test.ts` в ней падает ENOENT,
черновик кладётся из HEAD (`git show <sha>:docs/work/tasks/friends-push-copy-9-lang-draft-2026-10-22.md`).

### Магазинная сборка 2.0.3 (145) — из снимка b60fa6ea3
- Номера: b60fa6ea3 (`app.json`: version 2.0.3, runtimeVersion 2.0.3, versionCode 145, buildNumber "145").
- EAS: Android `3d0a5f8d-73af-49f0-b34d-1164b2d36a73`, iOS `4cd4b013-181b-4c27-a1a1-fb57b415abac` — FINISHED.
- iOS отправлен в App Store Connect (submission `d41ffcf3-2c54-42fe-ba53-8289d1f07faa`). «Submit for Review» — кнопка владельца.
- Android: отправка `9883ed46-95b1-4226-a1ed-a9c096380791` → 403 «The Google service account cannot submit this app» (у ключа
  `firebase-adminsdk-fbsvc@phraseman-ea0b3` нет прав в Play Console). `.aab`:
  https://expo.dev/artifacts/eas/RnjFE4vlKGKqGcsyQ6O8rbHuvrqmaXiRaWHK1PKgmeA.aab — ручная загрузка владельцем или права ключу.

### Код
- b07d0ca24 — «Нет сети» на Главной только при подтверждённом офлайне (лог `[NET-BANNER]`, тест
  `tests/home_net_banner_debounce_2026_10_26.test.ts`).
- 005508955 — пуш «Позвать» без «урока» ×9 + сторож NFC.
- 614e76486, fd4aac9ef — пуш `streak_at_risk` без «урока» + сторож NFC.
- 7116bc581 — тап пуша / плитка Главной ведут во вкладку «Уроки» (OTA3 2.0.2 опубликован координатором).
- Ночные (см. git log 25.10 вечер – 26.10): R50 монеты за диалог за флагом (3734fb949), защита двойного «назад» (08d00bcd5),
  счётчик вызовов функций в dev (151c7cd31), `[WELCOME-2-0]` (9f0c59cfb), права до разбора (99637a1a6), срок Plus (43053dbd5),
  `[FREEFORM-PLUS]` (c0473f366), `component_unreachable` в гейте паритета (531596d31).

## 2. Сделано последним (26.10 утро, для 2.0.3 146) — ЗАКОММИЧЕНО, в сборку 146 ещё не попало

### А. Общий помощник «нет сети» (координатор 26.10) — 5e1300cd4
- Новый `app/net_offline_step.ts`: `netOfflineStep` (connected=false — сразу; reachable=false — только 5 с подряд; null = сеть
  есть; возврат — сразу), `netOfflineInstant` (разовая проверка — офлайн только при connected=false), `trackNetOffline(place,
  subscribe, onDecision)` (подписка + таймер перепроверки + журнал `[NET-BANNER]` с меткой места).
- Переведены: `components/home/v2/scene/use_home_scene_offline.ts` (+ `home_net_banner_step.ts` — переэкспорт),
  `app/flashcards/useCatalogOffline.ts` (второе чтение через 5 с), `app/flashcards/useSavedLoadOffline.ts` (подписка через
  помощник), `app/friends_together/nudge_queue.ts` (`isOfflineNow` мгновенно, `subscribeOffline`/`subscribeNetworkBack` через
  помощник). Пик (`components/spire/spire_config_offline.ts`) меняется через `catalogOfflineVerdict`.
- Тесты: `tests/net_offline_tracker_2026_10_26.test.ts` (новый), `tests/catalog_offline_state.test.ts`,
  `tests/friends_offline_strip.test.ts` (перепривязаны), плюс `friends_together_nudge_client`, `saved_load_branch`,
  `a4_decisions_contract`, `dialogs_offline_retry_2026_10_22`.
- Пакет: `docs/work/tasks/core-net-offline-shared-helper-2026-10-26.md`.

### Б. 4 флага ВКЛ по умолчанию в 2.0.3 (146) (слово владельца) — a8d043624
- `app/remote_flags.ts`: `dialogue_freeform_translate_enabled`, `account_delete_variant_b_ui_enabled`,
  `dialogue_coin_intent_host_enabled`, `spire_gold` = true с «зачем».
- Перепривязаны сторожа: `tests/account_delete_variant_b_windows.test.tsx`, `tests/dialog_translate_every_reply.test.ts`,
  `tests/spire_golden_task.test.ts`; моки `parseAccountRestoreSummary` добавлены в `tests/aa_dev_robot_no_cloud_and_restore.test.ts`,
  `tests/aa_release_registration_restore_prompt.test.ts`, `tests/account_delete_restore_prompt_retry.test.ts` (окно
  восстановления при варианте Б читает сводку — без мока TypeError).
- Эталон флагов OTA уже обновил Ревизор (250176395).
- Пакет: `docs/work/tasks/core-flags-on-2-0-3-146-2026-10-26.md`.
- Факт боя (чтение `remote_config/app.bools` 26.10): `spire_gold` УЖЕ `true` с 25.10 12:51 (у клиентов с кодом «золото»
  включено; сервер с goldRule — с 06:00 26.10); три других не заданы → решает дефолт сборки.

## 3. Красные тесты (не мои)
- `tests/spire_optimistic_ui_r1.test.ts` — файл с ЧУЖИМИ незакоммиченными правками; мок `../app/spire_report_client` без
  `peekSpireWeekLocal`, а `app/spire/spire_load_trace.ts:82` зовёт его в первом кадре Пика. Чинится добавлением
  `peekSpireWeekLocal: jest.fn(() => null)` в мок — но файл чужой, спросить координатора.

## 4. Риски
- Политика: при варианте Б ВКЛ пакет требует в тот же день снять оговорку «Where available in the app» (legal/*.json →
  `npm run legal:sync` → коммит → `deploy_from_clean_head.sh --only "hosting:admin,hosting:knowlywww"` по «да» владельца;
  копия политики в приложении едет сборкой/OTA). С оговоркой текст верен и до, и после — не авария, но владелец просил.
- «Пульт» (`admin/v2/legacy.html`): у 4 переключателей подпись `def: false`, дефолт приложения теперь true. Сторожа
  `tests/admin_*_toggle_contract.test.ts`, `tests/spire_golden_task.test.ts` («Пульт») ждут `def: false`. Править — по слову
  владельца (админка выкладывается `hosting:admin`).
- OTA-скрипты `scripts/ota_from_head.sh`, `scripts/ota_final_check.sh` привязаны к runtime 2.0.2 и базе 009c40c97 — для OTA на
  2.0.3 перепривязать (runtime 2.0.3, база = снимок сборки 2.0.3), это поручено Ревизору.
- Гейт паритета макетов красный (351 нарушение) — 2.0.3 собирался с обходом по слову владельца; переснять и чинить.
- Не вошло в натив 2.0.3: заставка Android цветом темы (только план `docs/work/tasks/splash-theme-color-2026-10-25.md`), отзыв
  Sign in with Apple (`apple_signin_revoke_enabled` ВЫКЛ — нужен ключ Apple в консоли и фраза в политике).

## 5. Кнопка 2 (НЕ сделано, ждёт «да» владельца)
Ротация ключа отписки `EMAIL_UNSUBSCRIBE_*` — пошагово в `docs/work/release/server-deploy-pack-2026-10-26.md`, раздел
«Кнопка 2». Значения ключей не печатать никогда.

## 6. Инструкция: сборка и отправка 2.0.3 (146)

Предусловие: в HEAD закоммичены задачи А и Б (и всё, что координатор велел взять в 146), Ревизор дал 🟢 по хэшу.

1. **Номера** — отдельный коммит: `app.json` → `"versionCode": 146`, `"buildNumber": "146"`; `version` и `runtimeVersion`
   остаются `2.0.3` (OTA-ветка 2.0.3 общая для 145 и 146). Сторож `tests/android_aab_size_report.test.mjs` (тест «production
   build metadata…») перепривязать на 146; прогон `node --test tests/android_aab_size_report.test.mjs` → 8/8. Образец —
   коммит b60fa6ea3.
2. **Снимок** (не worktree, обычная папка):
   ```bash
   S=/c/Temp/claude/release_2_0_3_146; rm -rf "$S"; mkdir -p "$S"; git -c core.autocrlf=false archive <ХЭШ_НОМЕРОВ> | tar -x -C "$S"; echo <полный хэш> > "$S/.snapshot_head"
   cmd //c "mklink /J C:\Temp\claude\release_2_0_3_146\node_modules C:\appsprojects\phraseman\node_modules"
   cmd //c "mklink /J C:\Temp\claude\release_2_0_3_146\functions\node_modules C:\appsprojects\phraseman\functions\node_modules"
   ```
   (Старый снимок 145 — `C:/Temp/claude/release_2_0_3`, держать до загрузки Android 145; связки удалять `rmdir`, не `rm -rf`.)
3. **Проверки в снимке** (через светофор, скриптом; образец — `C:/Temp/claude/C--appsprojects-phraseman/129f91a4-53c5-416d-988a-0f73c489dfc8/scratchpad/rel203_check.sh`):
   - типы: `NODE_OPTIONS=--max-old-space-size=12288 npx tsc --noEmit --pretty false` → 0 ошибок;
   - `EXPO_PUBLIC_STORE_RELEASE=1 PARITY_GATE_WAIVER="owner-2026-10-26:собрать 2.0.3 с красным паритетом макетов, переснять и
     чинить после выпуска" node scripts/release_precheck.mjs` → `PRECHECK_RC=0`. Waiver — ТОЛЬКО в этом локальном прогоне,
     в окружение EAS не класть. Все остальные гейты обязаны быть зелёными;
   - вердикт Ревизора: `bash /c/Temp/claude/release_203_check.sh <хэш>` (его скрипт: версии, профиль, флаги, бандлы).
4. **Сборка** (из снимка; без `--auto-submit`: в eas.json Android-ключ задан локальным `./service-account.json`, которого в
   снимке нет, и автоотправка живёт, пока жив CLI):
   ```bash
   cd /c/Temp/claude/release_2_0_3_146 && EAS_NO_VCS=1 eas build --platform all --profile production --non-interactive --no-wait --json > build.json
   ```
   Статус: `EAS_NO_VCS=1 eas build:view <id> --json` (в выводе перед JSON строка «Failed to get Git root…» — резать до `{`).
   Образец наблюдателя — `.../scratchpad/watch_builds.sh`.
5. **Отправка** по id, когда FINISHED:
   - iOS: `cd <снимок> && EAS_NO_VCS=1 eas submit --platform ios --profile production --id <IOS_ID> --non-interactive`;
   - Android: ключ кладётся в снимок только на время отправки и удаляется (`trap 'rm -f "$S/service-account.json"' EXIT;
     cp /c/appsprojects/phraseman/service-account.json "$S/"`), затем `eas submit --platform android … --id <ANDROID_ID>`.
     Ожидаемо 403, пока владелец не выдал ключу права в Play Console → отдать владельцу ссылку на `.aab` из
     `eas build:view` (`artifacts.applicationArchiveUrl`).
6. **Отчёт координатору**: хэш, id и ссылки сборок, номера отправок, статус Android.

## 7. Состояние незакоммиченного (на 07:50 UTC 26.10)
- Моего незакоммиченного кода нет: b07d0ca24, 5e1300cd4, a8d043624 — последние коммиты Ядра; этот файл — следующим.
- Тесты 5e1300cd4 + a8d043624: сеть (Главная 7/7, подписка, каталог, полоса друзей, клиент зовов, «Сохранённые», Пик, «Диалоги»,
  реестр «назад») и зона флагов (49 файлов) — зелёные, кроме чужого `tests/spire_optimistic_ui_r1.test.ts` (раздел 3).
  Проверка типов затронутых файлов — 0 (точечно, своим tsconfig с `expo-env.d.ts`; полный `tsc` приложения на хэше сборки
  146 — шаг 3 инструкции).
- Ничего не проверено на эмуляторе: «Нет сети» на Главной владелец видел на эмуляторе со старым бандлом — после 146/OTA
  проверить: журнал `[NET-BANNER] decision … place=home_scene` при живой сети должен давать `offline:false`.
- Временные файлы в `C:/Temp/claude/` (снимки `release_2_0_3`, `deploy_clean_*`, логи) — не в репозитории; снимок 2.0.3 (145)
  держать до загрузки Android 145.
- Чужие незакоммиченные файлы в дереве — тысячи (Codex и другие сессии); в т.ч. `functions/src/account_delete.ts`,
  `tests/spire_optimistic_ui_r1.test.ts`, `package.json` (скрипт owner-map). Не трогать.
