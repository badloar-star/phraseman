# Дорога к $1/мес — план исполнения (2026-09-02)

Факты аудита (метрики Cloud Monitoring, журнал аудита, логи запросов) — в памяти
`project_firebase_cost_audit_2026-09-01`. Счёт: июль €15.99 → август €45.95, сентябрь без
правок ≈ €28–46. Честный пол для живого приложения с MAX и ИИ — **$2–3/мес**; $1 — потолок амбиций.

Точной росписи по SKU нет: нужен скриншот Billing → Reports → Group by: SKU → 1–31 августа.

## Сделано в этой сессии (коммиты в feature/referral-roulette)

| Что | Где | Деплой | Эффект |
|---|---|---|---|
| `maxVoiceMint` без тёплого инстанса (`minInstances: 0`) | `functions/src/max_voice_mint.ts` | `firebase deploy --only functions:max` | −86 400 с/сутки ≈ −$6.6/мес |
| Санитар `finalizeStaleEnglishTests` удалён (падал каждый запуск, результат ни на что не влиял) и дворник `cleanupEnglishTestAnalytics` заменён TTL-реестром `ENGLISH_TEST_TTL_COLLECTIONS` | `functions-english-test/index.js`, `site_report.test.js` | сначала TTL (0.2), потом `firebase deploy --only functions:english-test --force` — удалит 2 функции из прода | тест сайта ≈ $0.00 |

## Этап 0 — конфигурация, нужен явный «да» владельца (кода нет)

```bash
# 0.1 бюджетный алерт (API не включён — поэтому рост в августе никто не увидел)
gcloud services enable billingbudgets.googleapis.com --project=phraseman-ea0b3
gcloud billing budgets create --billing-account=017996-4720F9-0D0E63 \
  --display-name="Phraseman monthly" --budget-amount=20EUR \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0

# 0.2 TTL вместо дворника english-test (6 коллекций, поле expiresAt = Timestamp)
for cg in english_test_attempts english_test_clients english_test_daily \
          english_test_rate_limits english_test_completion_rate_limits english_test_report_rate_limits; do
  gcloud firestore fields ttls update expiresAt --collection-group=$cg --enable-ttl --project=phraseman-ea0b3 --async
done

# 0.3 мусор исходников деплоев: 43.8 GB (~$0.9/мес) — правило жизни 3 дня; образы функций — политика очистки
printf '{"rule":[{"action":{"type":"Delete"},"condition":{"age":3}}]}' > /tmp/lc.json
gcloud storage buckets update gs://gcf-v2-sources-1047658658799-us-central1 --lifecycle-file=/tmp/lc.json
gcloud storage buckets update gs://gcf-v2-sources-1047658658799-europe-west1 --lifecycle-file=/tmp/lc.json
firebase functions:artifacts:setpolicy --location us-central1 --days 1 --project phraseman-ea0b3

# 0.4 пять функций без исходников (расписания удалены 23.08, сервисы висят)
gcloud functions list --project=phraseman-ea0b3 --filter="name~matchmaking OR name~adminEmailCampaigns OR name~agentManagerRun" --format="value(name.basename())"
gcloud functions delete <каждое имя> --region=us-central1 --gen2 --quiet --project=phraseman-ea0b3

# 0.5 три секрета, к которым не привязана ни одна функция
gcloud secrets delete AGENT_MANAGER_INTAKE_HMAC_KEY AGENT_OFFICE_TELEGRAM_CONFIG REVENUECAT_ANALYTICS_API_KEY --quiet
```

## Этап 1 — код, модель Opus 5 (high)

**1.1 Турниры — выключить полностью (решение владельца 2026-09-02).**
Снять экспорты в `functions/src/index.ts`: клиентские callable (строки ~1008–1021), `adminSeedBotProfiles`
(~1022), админские (~1097–1118). Деплой `--only functions:default --force` удалит 29 функций.
Проверить: 11 тестов, завязанных на турниры (`functions/src/tournament_*.test.ts`,
`tests/retired_competitive_mode_full_removal_contract.test.ts`); `tournament_bots` — единый реестр
персонажей с лигами, модуль остаётся, снимается только callable. Старые клиенты зовут
`tournamentWeeklyBankInfo` ~150×/сутки (в клиенте 1.6.15 вызова нет) — получат not-found.
Открытый вопрос: `tournamentClaimReward` — невыданные награды сгорают.

**1.2 Надгробия Help Board / Compass (12 функций).** За 30 дней 0 вызовов у всех, кроме крона-надгробия
(703 — сам себя). Удалить `help_board_decommission.ts` и его экспорты/`Object.assign` в index.ts.

**1.3 Cloud Scheduler 32 → 1.** Диспетчер `cronTick` (`every 5 minutes`, основная кодбаза — остаётся
тёплым, холодных стартов нет) с таблицей `{ name, due(nowUtc), run }`; имена `withCronHeartbeat`
сохранить — панель здоровья кронов и `adminAlertOnCronHeartbeat` не заметят. Кроны functions-max
(`maxVoiceWatchdog`, `maxVoiceProviderHealth`) — их runner-функции лежат в `functions/src`, диспетчер
импортирует напрямую; тест `max_voice_watchdog.test.ts:340–345` переписать (health → раз в час).
Задания сейчас: 5 мин ×2 (accountMergeOutbox, youtubeCatalogSync), 10 мин ×6 (4 support/telegram,
maxVoice ×2), 30 мин ×1, 60 мин ×7, 6 ч ×2, сутки ×8, неделя ×4, +2 надгробия. −$2.9/мес и минус
холодные старты всех редких кронов.

**1.4 Деплой только точечно.** Полный деплой 509 функций = 90–265k оплачиваемых секунд ($2–6).
Правило в CLAUDE.md: `firebase deploy --only functions:<codebase>:<имя>`.

**1.5 Серии входа с Android.** Один IP: 48 вызовов `authEnsureStableLink` за 22 минуты, следом
сотни чтений. СПЕРВА ЛОГИ: префикс `[AUTH-LOOP]` в `app/auth_provider.ts` вокруг вызова —
счётчик за 10 минут, причина каждого повтора, откуда пришёл stableId. Потом предохранитель.

**1.6 Секреты 24 → ≤6.** Значения секретов ИИ не трогает — скрипт слияния выполняет владелец.
Группы: ARENA_V2_* (3→1 JSON), AUTH_RECOVERY_* (2→1), EMAIL_UNSUBSCRIBE_* (2→1), PAYPAL_* (2→1),
STRIPE_* (2→1), PHRASEMAN_PREMIUM_* (3→1), REVENUECAT_* (2→1), OPENAI_* (2→1) → 13; до 6 — один
`APP_SECRETS`. −$1.1/мес.

## Этап 2 — Firestore и холодные старты (→ ~€2–4)

- 2.1 1M чтений/мес несуществующих документов: лог `[FS-MISS]` в клиентской обёртке `getDoc`,
  затем кэш «документа нет» на N часов (правило владельца: кэш + рефреш по расписанию).
- 2.2 `computeLeaderboardStatsCron` — 8 143 чтения в 03:01 каждую ночь: count()-агрегации или раз в неделю.
- 2.3 Ночной фон 143k чтений/сутки без людей — после 1.5 замерить заново.
- 2.4 Скрипты миграций против прода: 1 сентября 617k чтений + 31k записей за вечер — только выборочно/эмулятор.
- 2.5 Холодный старт основной кодбазы 4–12 с: lazy require в хендлерах или кодбазы по доменам.
- 2.6 English-test: отчёт из дневных сводок (28 чтений вместо 5 000), события сайта пакетом раз в 5 вопросов.

## Этап 3 — архитектура (→ ~$1–3)

- 3.1 Функции в `europe-west1` рядом с Firestore `eur3`: −100 мс на каждое чтение, egress 0 (нужен релиз клиента).
- 3.2 509 → ~150 функций: админские callable в один роутер.
- 3.3 8 Eventarc-сторожей (`adminAlertOn*`) → один часовой дайджест.

## Вопросы владельцу перед этапом 1

1. Турниры: удалить все 29 функций, включая `tournamentClaimReward` (невыданные награды сгорят) и админские вкладки?
2. Надгробия Help Board/Compass — удалить все 12?
3. Бюджетный алерт — €20 с письмами на 50/90/100 %?
4. TTL на english_test_* и правило жизни 3 дня на исходники деплоев — «да»?
5. Диспетчер кронов: все расписания в один тик каждые 5 минут — ок?
