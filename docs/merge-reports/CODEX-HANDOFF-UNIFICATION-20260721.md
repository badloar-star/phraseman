# CODEX HANDOFF — Унификация всех веток Phraseman в одну

Дата: 2026-07-21. Для: Codex (следующая сессия). Язык отчётов владельцу: русский, простыми словами.

## 0. МИССИЯ (один абзац)

Свести все разрозненные ветки/worktree Phraseman в одну ветку `integration/unified-20260721`, не потеряв ни одной уникальной функции (прод = 366 живых Cloud Functions, собран частичными деплоями из 4–5 worktree), с сохранением намеренных удалений (чаты, арена-игра) и с переносом уникальных фич в НОВЫЙ редизайн Admin V2. После сведения — гейт «экспорты vs прод» и только потом любые полные деплои.

## 1. ЧТО УЖЕ СДЕЛАНО (не трогать, не переделывать)

### 1.1. Экономика «Монеты и Звёзды» — ГОТОВА И В ПРОДЕ ✅
- Спека: `docs/plans/2026-07-20-coins-stars-economy-plan.ru.md` + `docs/v2/05-stars-progress-and-mastery.md` (ревизия 2026-07-20/21) + `docs/v2/HANDOVER.md` §14.34.
- Сервер (functions/src/coin_exchange.ts + coin_exchange_core.ts): 7 функций В ПРОДЕ (us-central1, nodejs22): `getCoinExchangeQuote`, `getCoinExchangeHistory`, `exchangeCoinsForStars`, `adminSetCoinExchangeRate`, `adminGetCoinExchangeCenter`, `recalcCoinExchangeRate` (cron `17 4 * * *` UTC), `claimCoinMigration`.
- Курс биржи: база 80, коридор 60–100, ±10%/сутки, дрейф к базе. Конвертация осколков→монеты 20:1 (ceil, min 1), флаг `coins_migration_v1`, аудит `coin_migrations/{uid}`.
- Все gameplay-начисления осколков обнулены и в app (`app/shards_system.ts` и др.), и на сервере (`functions/src/shard_reward_catalog.ts`, league_chest, collectibles, shard_survey, daily_tasks_shards). Единственный источник монет: покупка + 1 монета за подтверждённый репорт.
- Приложение: иконки `assets/images/currency/coin_{1,2,3,5,10}.webp` + `app/coin_icons.ts` (пороги 0–19/20–99/100–299/300–999/1000+); экран биржи `app/coin_exchange.tsx`; модал миграции `components/CoinsMigrationHost.tsx` + `app/coins_migration_modal.ts` (одноразовый, превью в `app/_admin_settings_testers.tsx`); переименование Осколки→Монеты во всех 8 локалях.
- Admin V2: раздел «Центр монет» (#coin-center, Деньги → Центр монет) — курс, ручное переопределение, график истории, статистика, аудит. Задеплоен: https://phraseman-ea0b3.web.app
- Коммиты на ветке: `18faadb72` (spec docs), `f6cc0859d` (server), `285ac732c` (app), `e30a9349d` (admin center), `3628d1504` (restored sources).

### 1.2. Снапшоты — 46 веток `prod-snapshot/*-20260721` ✅
Все грязные worktree закоммичены (см. `git branch | grep prod-snapshot`). Секреты (.env) НЕ закоммичены — лежат на диске в соответствующих worktree. 5 мёртвых `.claude/worktrees/agent-*` (без .git, ветка feature/tournaments-phase1, ~381 файл турнирной фичи) — НЕ сохранены; владелец спросил про zip-архив, ответа нет — при старте спросить или скопировать в `backups/claude-worktrees-20260721.zip`.

### 1.3. Мердж №1 — арена-пул ✅
`8882a9732 merge: arena question pool...` — серверные модули арена-генератора/пула вопросов внесены (генератор переиспользуем позже; сама арена-игра удалена намеренно). tsc чист, 38 тестов coin_exchange зелёные. Отчёт мерджа НЕ написан — написать ретроспективно (`git show --stat 8882a9732`).

## 2. ТЕКУЩЕЕ СОСТОЯНИЕ — ПРЕРВАННЫЙ МЕРДЖ №2 ⚠️

Ветка `integration/unified-20260721`, идёт `git merge codex/learning-v2-pilot` (MERGE_HEAD существует). Конфликты (10 файлов), разрешение ещё НЕ сделано:

| Файл | Тип | Правило разрешения |
|---|---|---|
| `docs/v2/05-stars-progress-and-mastery.md` | AA | **НАША версия побеждает** (в ней ревизия экономики 2026-07-20/21). Если в их версии есть разделы, которых нет у нас — дописать их в конец под заголовком `<!-- merged from learning-v2-pilot -->`. |
| `docs/v2/HANDOVER.md` | AA | **НАША** (запись §14.34 экономики). Их новые записи — дописать после наших, не перезаписывать. |
| `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md` | AA | Объединить: наша версия базовая, их дополнения — в конец с пометкой. |
| `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md` | AA | То же. |
| `docs/v2/08-admin-content-studio-and-mode-authoring.md` | AA | То же. |
| `firestore.rules` | UU | Объединить аддитивно; наши блоки `economy/*`, `coin_exchange_trades/*`, `coin_migrations/*`, `v2_star_journal`, поля-стражи `v2_access_stars`, `coins_migration_v1*` — обязательно сохранить. Чат-правила НЕ восстанавливать. |
| `functions/package.json` / `package-lock.json` | UU | Объединить зависимости (union), при расхождении версий — выше/новее; lock пересоздать `npm install` в functions/ и закоммитить. |
| `functions/src/index.ts` | UU | **Union экспортов** (обе стороны, дедупликация). ВСЕ 7 coin-функций сохранить. |
| `tests/firestore_rules_security.test.ts` | UU | Наша версия + их новые тесты добавить; запустить. |

После разрешения: `git add` → `git commit` (merge) → `cd functions && npx tsc --noEmit` (чисто) → `npx jest coin_exchange` (38 зелёных) → отчёт `docs/merge-reports/merge-02-learning-v2-orbit.md`.

## 3. РЕШЕНИЯ ВЛАДЕЛЬЦА (обязательны для всех конфликтов)

1. **Admin V2 (admin/v2/) — каноническая админка с фул-редизайном.** Старые админские поверхности проигрывают. Уникальные фичи из старых веток ПЕРЕНОСИМ в Admin V2 вручную (через capability registry → hash router → admin-core.js, как сделан Центр монет — эталон), а не слепым мерджем.
2. **Чаты НЕ восстанавливать**: leagueChat (e6351db4e) и legacy user chat (9af87817d) удалены намеренно. Конфликты вокруг чат-кода — всегда в пользу удаления.
3. **Арена-игра удалена намеренно**, но генератор/пул вопросов — в новую админку (мердж №1 уже внёс сервер; UI-порт в Admin V2 — отдельная задача).
4. Топ-5 важных экранов при UI-конфликтах — показывать владельцу скриншоты обеих версий; остальное — diff + описание.
5. Курс миграции 20:1 — финальный.

## 4. ОСТАВШИЕСЯ РАБОТА (по порядку)

### Шаг A. Завершить мердж №2 (learning-v2-pilot) — см. §2.
### Шаг B. Мердж `codex/orbit-unified-release-base-20260718` (прогноз ~244 конфликта, после шага A часть схлопнется; горячие: app/* friends/quizzes/_layout/club/cloud_sync, admin/legacy). Правила: app/* — наша, если только их файл не чисто аддитивный; admin — наша; docs — union. Verify + отчёт.
### Шаг C. Линия agent-manager (по порядку): `codex/agent-manager-foundation` → `codex/agent-office-orchestrator` → `codex/agent-manager-digest-integration` (уникальный `agentManagerRecommendCriticalDigest`). ~91 конфликт: functions/src/agent_manager/* (аддитивно), admin/v2/* (НАША структура; фичи — портом), firestore.rules (union).
### Шаг D. Порт фич в Admin V2 (НЕ мердж веток, а ручной перенос в новый дизайн; эталон — Центр монет):
- из `prod-snapshot/all-development-integration-20260721`: `adminWebsiteInboxList`, `helpBoard*` (сервер уже в проде — исходники восстановить в functions/src из снапшота!), `adminGenerateProductBrief`, `adminMutateProductItem`, `getPublishedCourse*`;
- из `prod-snapshot/admin-integrated-20260716-20260721`: `adminYoutubeAnalytics`, `agentOfficeTelegram*`;
- из `codex/arena-question-pool-complete`/снапшотов 5f15/fc6b: UI пула вопросов арены (сервер уже влит);
- из `prod-snapshot/admin-language-factory-20260721`: `adminGetMoneyOperationsWorkspace` + money-ops модули (cherry-pick, НЕ полный мердж — ветка 294 behind).
### Шаг E. Мелкие ветки в конец: `codex/stats-redesign-current` (0 ahead, но история содержит 9af87817d — проверить, что удаление чата сохранено), `codex/league-club-hub` (4 ahead — экран Club Hub, решить с владельцем: порт или пропустить).
### Шаг F. Финальный гейт: скрипт — собрать functions (`npx tsc`), извлечь `exports.X` из `functions/lib/index.js`, сравнить с `firebase functions:list` (366+7 функций). Требование: **ноль живых функций без исходников** (кроме осознанно удалённых чатов — список зафиксировать в отчёте). Положить скрипт в `scripts/` рядом с deploy_lock_guard.mjs и внедрить как pre-deploy проверку.
### Шаг G. Отчёт владельцу + обновить `docs/v2/HANDOVER.md`.

ПРОПУСТИТЬ (superseded, есть в снапшотах): youtube-analytics-integration-result, youtube-final-integration, youtube-release-1.5.56, admin-v2-canonical-analytics-20260717b, agent-office-* промежуточные (0–2 ahead), июньские feat-ветки (speaking-mode, ai-dialogue-phase0, referral-vip, lingman-montazher — 1400+ behind), analytics-release-20260713.

## 5. ПРАВИЛА ДЕПЛОЯ (критично)

- **НИКОГДА** не запускать полный `firebase deploy --only functions` до прохождения шага F — CLI предложит удалить ~90 живых функций. Только явные списки `--only functions:name,...`.
- Админ-хостинг: только `npm run hosting:admin` (target `admin`).
- firebase-tools глобальный сломан (шим Git-Bash); рабочая копия 15.24.0 установлена в npm-global Kimi с патчем `lib/deploy/functions/runtimes/node/index.js` (запуск `node firebase-functions.js` напрямую). Если CLI падает с `'""' is not recognized` — это оно.
- При первом создании новой функции возможен транзиентный сбой IAM-invoker — просто повторить деплой.
- Firestore rules: `firebase deploy --only firestore:rules` безопасно.

## 6. ОТКРЫТЫЕ ПРОДУКТОВЫЕ РЕШЕНИЯ (спросить владельца, не решать самому)

1. Ставка на стрик: выигрыш теперь только XP (монетные выплаты 0). Оставить ставку в монетах / перевести на звёзды / убрать фичу?
2. Левел-гифты и буны (Mystery Monday, Comeback, Perfect Week): модалки празднуют награду = 0 монет. Заменить на звёзды/XP или редизайн?
3. Достижения: кнопка «+1 монета» только отмечает получение. Убрать или конвертировать в звёзды?
4. `admin_grant.ts` и бродкаст-компенсации осколков — оставить как админ-инструмент?
5. RevenueCat: переименование offering «shards»→«coins» и product IDs — требует сторов.
6. Бэкфилл-миграция 20:1 для неактивных пользователей (pure-функция `computeCoinMigration` готова в coin_exchange_core.ts).
7. Архив 5 мёртвых `.claude` worktree (zip?).
8. League Club Hub экран (ветка league-club-hub, 4 ahead) — портировать или пропустить?

## 7. ИЗВЕСТНЫЕ ПРЕ-СУЩЕСТВУЮЩИЕ ПОЛОМКИ (не из этой работы)

- `tests/firestore_rules_security.test.ts`: 1 stale-тест про legacy admin catch-all (62/63).
- `app/daily_tasks.ts`: TS-ошибки (неэкранированные апострофы `12:00'den`, `пам'ять`).
- `boon_icon_assets.test.ts`: дубликат пути ассета.
- `achievements.test.ts`: 2 падения (ruAchievementRewardPhrase, ENOENT quizzes.tsx — возможно уже починено коммитом 3628d1504).

## 8. КОМАНДЫ БЫСТРОГО СТАРТА

```bash
cd C:\appsprojects\phraseman
git status                       # продолжить прерванный мердж (§2)
# после разрешения: git add -A && git commit
cd functions && npx tsc --noEmit && npx jest coin_exchange --no-coverage
git branch | grep prod-snapshot  # все снапшоты на месте
```

Верификация в конце каждого шага: tsc чист, coin_exchange 38 зелёных, отчёт в docs/merge-reports/. Не пушить, не деплоить (кроме явных задач деплоя), не удалять функциональность.
