// PM-222 проба плана отключения кронов (evidence/PM-222_cron_retirement_plan.md).
// зачем: код-сторона плана — (A1) consumers удалённых фич (лиги, Арена, XP, курс монет, MAX,
// турниры) больше НЕ экспортируются, значит пост-релизный деплой их снимет; (A2) удаление
// аккаунта, восстановление покупок и истечение Plus экспортируются и в список удаления не попадут.
// Прод не трогается: это разбор functions/src/index.ts, а не firebase functions:list.
// Запуск: npx tsx tests/pm222_cron_dependency_plan.probe.ts (exit 0 = PASS).
import assert from 'node:assert/strict';

// @ts-expect-error — .mjs без деклараций типов
import { readLiveExports } from '../scripts/pm221_server_domain_map.mjs';

const live = readLiveExports(process.cwd()) as Set<string>;

// §1 плана + кроны, снятые раньше (MAX 2026-09-04, турниры, Help Board).
const RETIRED_CONSUMERS = [
  'leagueFinalizeCron', 'leagueResidentsTickCron', 'computeLeaderboardStatsCron', 'resetWeeklyXpCron',
  'arenaV2CleanupHourly', 'recalcCoinExchangeRate', 'maxLessonReminderCron',
  'maxVoiceWatchdog', 'maxVoiceUsageRecon',
  'tournamentAdvanceRooms', 'tournamentCreateRooms', 'tournamentFillBots', 'tournamentWeeklyBankCron',
  'compassChatDailyCronDisabled', 'helpBoardCompassRetryCronDisabled',
];
// §3 плана — обязаны пережить деплой удалений.
const MUST_STAY = [
  'accountDeleteWorker', 'accountDeleteRetryCron', 'accountDeleteMine', 'accountDeleteEnqueue', 'accountDeleteCredentialStatus',
  'premiumExpiryCron', 'premiumExpiryReminderCron',
  'revenueCatShardsWebhook', 'revenueCatPremiumReconcileMine', 'adminAlertOnRevenueCatReceipt',
  'accountMergeOutboxRetryCron',
];

const stillLive = RETIRED_CONSUMERS.filter((n) => live.has(n));
assert.deepEqual(stillLive, [], 'A1: крон удалённой фичи всё ещё экспортируется');
const missing = MUST_STAY.filter((n) => !live.has(n));
assert.deepEqual(missing, [], 'A2: удаление аккаунта / покупки / Plus потеряли экспорт');

process.stdout.write(`PM-222 PROBE PASS: retired_not_exported=${RETIRED_CONSUMERS.length} must_stay_exported=${MUST_STAY.length} live_exports=${live.size}\n`);
