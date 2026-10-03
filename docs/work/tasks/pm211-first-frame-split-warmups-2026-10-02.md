# Task packet: PM-211 — Разделить первый кадр и необязательные прогревы

Governance-ID: TG-476A7D23CC76
Status: In progress
Owner: Claude session (Account V2 → очередь координатора §91: PM-211…)

## Outcome

PM-211 (docs/phraseman-2.0/tasks/PM-211.md): A1 — главный интерактивный экран (Главная) не ждёт лигу/друзей/достижения/AI; A2 — необходимые локальные данные и auth согласованы. Источник: «так чтобы все летало не лагало».

1. **Preflight-аудит (обязателен до правок):** по коду и логам старта перечислить, что Главная и корневой `_layout` ждут до первого интерактивного кадра (await/Promise.all/флаги сплеша/гейты), с файлами и строками; для каждого — нужно ли это первому кадру (A2) или это необязательный прогрев (A1). Учесть уже сделанное другими сессиями (память `project_phone_state_cold_start_2026-10-02`, сессия замеров старта «App Check 10db1105», коммиты perf последних дней) — не дублировать и не трогать их незакоммиченные файлы. Лига/Арена удалены (D54/D74/D83) — проверить, нет ли их остатков на пути старта.
2. **Правка (минимальная):** необязательные прогревы — после первого кадра (InteractionManager / после `onLayout` Главной / idle), без изменения поведения; обязательные — оставить. Логи `[FIRST-FRAME]` с таймингами (старт→первый кадр, что отложено).
3. Сторожевой тест: «путь первого кадра Главной не ждёт <список необязательных>» (структурный или поведенческий).

## Scope

app/_layout.tsx, app/(tabs)/home.tsx и модули прогрева, найденные аудитом. ВНИМАНИЕ: в `app/(tabs)/home.tsx`, `app/_layout.tsx` и др. могут быть ЧУЖИЕ незакоммиченные правки — сверять `git diff`, чужие хунки не трогать; если нужная правка в файле с чужими хунками — минимально или отложить и описать. Out of scope: дизайн, прод, сервер.

## Architecture

Первый кадр = локальный снимок + auth-гейт; всё остальное — отложенный прогрев после кадра.

## Security and privacy

Новых данных нет.

## Technical debt

Accept temporarily: точные замеры на устройстве — у сессии замеров; здесь — логи и структурные гарантии.

## Verification

Аудит-таблица в итоге; RED→GREEN сторожа; затронутые тесты по одному (perf_freeze_contract, layout_stability_contract и тесты затронутых модулей); тайпчек изменённых; независимое ревью.

## Rollback

git revert; бэкап `.tmp_pm211_backup/`.

## Итог исполнителя (2026-10-02)

Исполнитель: Claude (Opus 5.5), субагент-исполнитель пакета. Git-записей не делал (без коммитов и веток), без деплоя и прода.

### Что уже было сделано другими сессиями (не дублировал, не трогал)
- 31f6e03ac — PM-211: прогрев друзей вынесен из Promise.all снапшота (`app/app_snapshot_bootstrap.ts:223`, вызов `void primeFriendsSnapshot()` :276 после публикации снапшота). Теперь закреплён сторожем.
- 415f9ec83 / a91a86cfa / b400151c3 / 677d8c1f8 — phone-state после кадра Главной (`homePaintedForPhoneState`, потолок 8 с), проверка целостности в фоне, ключ в памяти. Не трогал.
- 2d97d6dfd / 6bb14d3f5 / 31cfd76c4 — `[COLD-START-IO]`, флаги тестера, флаг удаления аккаунта. Не трогал.
- 031d6ef70 / 3cd296873 — метка `[HOME-PAINT]` первого кадра Главной. Не трогал.

### Preflight-аудит: что ждёт первый интерактивный кадр (строки — текущая рабочая копия)
Сплеш снимается при `fontsReady && ready && liquidGlassChoiceReady && (firstContentReady && homeScreenReady)` (`app/_layout.tsx:1492`); потолки: ready 1000 мс (:418), firstContentReady 400 мс (:391), homeScreenReady 550 мс (:395).

| # | Что | Где | Ждёт ли кадр | Класс |
|---|-----|-----|--------------|-------|
| 1 | `ensureFreshPostDeletionIdentity('startup')` | `_layout.tsx:2099` | await до setReady | A2 (защита удалённого аккаунта) |
| 2 | `runAuthRecoveryBootGate` | `_layout.tsx:2131` | await | A2 (auth-гейт) |
| 3 | `getStableId()` | `_layout.tsx:2174` | await | A2 (личность/поколение аккаунта) |
| 4 | `startupLocalHydration` Promise.all (снапшот, опрос, экранные снапшоты, фраза дня, канал YouTube, кэш статистики, кэш remote config, настройки, хаптик, согласия аналитики/AI, возраст) | `_layout.tsx:2241`, гонка 350 мс `:2282` | до 350 мс | A2 (локальный снимок для кадра без скелетонов); друзей/достижений/AI/лиги в нём нет — закреплено сторожем |
| 5 | `onboarding_done` multiGet | `_layout.tsx:2300` | await (параллельно с п.4) | A2 (выбор онбординг/Главная) |
| 6 | Проверка достижений «Монетная заначка» (getStableId → баланс рун → checkAchievements) | был `_layout.tsx:~2286`, теперь `:2293` | не await, но стартовала ДО setReady и делила поток/диск с кадром | **A1 → отложено** |
| 7 | Шрифты иконок, картинки вкладок, посев озвучки V2 | `_layout.tsx:2342–2348` | не await | оставлено (шрифты/картинки нужны кадру; посев озвучки — кандидат, не трогал) |
| 8 | `runHeavyInit` (remote config, PostHog, **прогрев друзей** :1891, RevenueCat, маркетплейс, crashlytics, облако→серия→sync, премиум, рефералы, арт достижений, карточки, EAS update) | эффект `_layout.tsx:1568–1580` | после firstContentReady + interactions + 250 мс; firstContentReady мог прийти ЗАПАСНЫМ таймером 400 мс раньше чанка Главной | **A1 → отложено до кадра Главной** |
| 9 | phone-state bootstrap | `_layout.tsx:~1160` | после `homePaintedForPhoneState` | уже сделано другой сессией |
| 10 | Главная: `loadData` (таймер 80 мс `home.tsx:1417`), внутри последовательно `loadAchievementStates()` `home.tsx:1578` перед чтением прогресса уроков | `app/(tabs)/home.tsx` | после первого кадра (кадр из снапшота), но достижения задерживают «Продолжить обучение» и `app_first_content_ready` | A1 внутри loadData — **НЕ правил**: строка 1578 = чужой хунк PM-229; предложение — распараллелить |
| 11 | Главная: прогрев Диалогов V2 (AI) `useDialogueV2Warmup` | `home.tsx:437`, `hooks/use_dialogue_v2_warmup.ts` | уже runAfterInteractions + 1,5 с | A1, уже отложено |
| 12 | Лига/Арена на пути старта | grep `_layout.tsx`, `home.tsx` | — | остатков кода нет; в `home.tsx:2114` только имя ассета `home-forest-league.webp` (плитка) |

### Изменения
1. Новый модуль `app/first_frame_deferred_warmups.ts` — `runAfterHomeFirstFrame(label, task, { fallbackMs = 2500 })`: ждёт липкое `app_home_screen_ready` (или потолок), затем `InteractionManager.runAfterInteractions`, запускает задачу; возвращает отмену; ошибки задачи (синхронные и асинхронные) не пробрасываются, пишутся в лог. Логи `[FIRST-FRAME]`: `deferred:register` (log), `home_painted proc=…ms` (один раз), `deferred:release trigger=home_painted|fallback waitedMs`, `deferred:done taskMs proc`, `deferred:failed reason`, `deferred:cancel stage`, `deferred:skip` (итоговые строки — console.warn, чтобы пережили release-сборку).
2. `app/_layout.tsx` (минимальные вставки вне чужих хунков):
   - :190 импорт помощника;
   - :1568–1580 эффект тяжёлой инициализации: `InteractionManager.runAfterInteractions` → `runAfterHomeFirstFrame('heavy_init', …)`; задержка 250 мс и отмена сохранены;
   - :2290–2297 проверка достижений по монетам обёрнута `runAfterHomeFirstFrame('achievements_coins_boot_check', …)`; цепочка и её лог `[ACHIEVEMENTS] coins_boot_check_failed` прежние.
   Поведение не меняется: в обычном старте Главная рисуется до firstContentReady, задачи идут как раньше; на слабом телефоне (чанк Главной позже 400 мс) они ждут кадр Главной, максимум +2,5 с.

### Файлы с чужими незакоммиченными правками
- `app/_layout.tsx` — чужие хунки PM-229 (немые catch → `noteSwallowed*`) по всему файлу, в т.ч. :2, :364, :2211, :2238–2283, :2313, :2337. Мои хунки: одна новая строка импорта после строки `coldStartMark` (:190), эффект :1568–1580, блок :2290–2297. Чужие строки не менял. Исходник до правки: `.tmp_pm211_backup/_layout.tsx.orig`.
- `app/(tabs)/home.tsx` — чужие хунки PM-229 (:122, :1210, :1578, :1726, :1864); правка п.10 упирается в :1578 → **пропущено**. Предложение после коммита PM-229: в `loadData` запускать `loadAchievementStates()` без await до чтения прогресса уроков и применять `setSpecialTitleStats` по готовности.
- `app/app_snapshot_bootstrap.ts` — не правил, только сторож читает его.

### Тесты
- Новый сторож `tests/pm211_first_frame_deferred_warmups.test.ts` (11 тестов): 5 поведенческих на помощник (не стартует до кадра; липкое событие; потолок; отмена до/после релиза; ошибки не немые) + 6 структурных (гидрация первого кадра без друзей/достижений/AI/лиги/арены; checkAchievements в bootstrap только через помощник; bootstrap без друзей/лиги/арены; heavy init через `runAfterHomeFirstFrame('heavy_init'` без прямого InteractionManager; прогрев друзей вне Promise.all снапшота).
- RED: до создания модуля — `TS2307 Cannot find module '../app/first_frame_deferred_warmups'`. GREEN: 11/11.
- Мутации (каждая поймана, затем откат, файлы сверены cmp): coin-check без помощника → 1 FAIL; heavy init обратно на InteractionManager → 1 FAIL; помощник отпускает задачу сразу, не дожидаясь кадра → 2 FAIL.
- Затронутые: `streak_journal_continuity_2026_10_01` 8/8, `startup_cloud_identity_recovery` 2/2, `perf_freeze_contract` 12/12, `layout_stability_contract` 15/15 — PASS. `auth_recovery_boot_integration` 2 FAIL — не от этой правки: ждёт строку `if (authRecoveryBootstrapInFlight) return;` и порядок вокруг замка удаления, а в коде уже `bootMark('bootstrap SKIPPED …')`; участки PM-211 там не проверяются (протухший сторож, отдельная задача).
- Тайпчек (временный tsconfig на `_layout.tsx` + модуль + тест): ошибок в изменённых файлах нет; единственная ошибка — чужой `modules/account-session-v2/account_authority_production_adapter.ts:584` (Account V2 в работе).
- NOT_RUN: замер на устройстве (у сессии замеров), независимое ревью.

### Точный список изменённых файлов
- `app/first_frame_deferred_warmups.ts` (новый)
- `app/_layout.tsx` (3 хунка, см. выше)
- `tests/pm211_first_frame_deferred_warmups.test.ts` (новый)
- `docs/work/tasks/pm211-first-frame-split-warmups-2026-10-02.md` (этот итог)

Откат: удалить два новых файла и вернуть три хунка `_layout.tsx` (чужие хунки PM-229 сохранить).
