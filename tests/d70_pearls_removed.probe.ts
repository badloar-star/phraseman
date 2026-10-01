/**
 * D70 ratchet: жемчуг (в коде shards) удаляется вместе с остатками (D70, D84, D78).
 *
 * Проба держит ДВЕ вещи:
 * 1. Удалённое остаётся удалённым (файлы и серверные экспорты не возвращаются).
 * 2. Трата/начисление жемчуга живёт ТОЛЬКО в файлах из списка ниже. Список может
 *    лишь СОКРАЩАТЬСЯ: новый файл с тратой/начислением роняет пробу, а файл, из
 *    которого вызовы уже ушли, обязан быть вычеркнут (иначе проба тоже падает).
 *
 * Сработала — убери вызов жемчуга, а не расширяй список. Расширять можно только
 * решением владельца.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const exists = (relative: string) => fs.existsSync(path.join(root, relative));
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

// ── 1. Удалённое остаётся удалённым ────────────────────────────────────────
const DELETED_FILES = [
  // биржа «жемчуг → звёзды» (клиент + сервер + стор-заглушка)
  'app/coin_exchange.tsx',
  'app/coin_exchange_client.ts',
  'app/coin_exchange_wallet_outbox.ts',
  'store_release_stubs/coin_exchange_wallet_outbox_stub.ts',
  'functions/src/coin_exchange.ts',
  'functions/src/coin_exchange_core.ts',
  // мёртвые серверные модули жемчуга
  'functions/src/shards_apply_delta.ts',
  'functions/src/shard_reward_catalog.ts',
  // клиентские траты/начисления без живых вызовов
  'app/energy_shard_refill.ts',
  'app/quota_day_pass.ts',
  'app/release_wave_bonus.ts',
  // конвертация жемчуга в монеты отменена D70 (без компенсации)
  'app/pearls_to_coins_migration_v1.ts',
  // D102: косметика (ауры/образы за жемчуг и руны) — редактор и покупка удалены целиком
  'app/customization_purchase_intent.ts',
  'app/customization_editor_purchase.ts',
  'app/customization_purchase_confirmation.ts',
  'app/customization_purchase_cta.ts',
  'app/customization_purchase_validation.ts',
  'app/customization_rune_purchase.ts',
  'app/customization_editor_entry.ts',
  'app/customization_editor_accessibility.ts',
  'app/customization_draft.ts',
  'app/customization_service.ts',
  'app/customization_catalog.ts',
  'components/customization/AvatarEditorSheet.tsx',
  'components/customization/CustomizationPurchaseConfirmModal.tsx',
  // D70/D78 + PM-148: покупка урока за жемчуг удалена (ядро и флаг)
  'app/lessons_pearl_unlock.ts',
  'app/lessons_pearl_unlock_flag.ts',
  // PM-289 этап 1: синхронизатор внешних событий жемчуга, дотягивание оплаченных
  // пакетов (корреляция RevenueCat) и мёртвая заглушка магазина жемчуга
  'app/economy/external_shard_event_sync.ts',
  'app/revenuecat_pending_correlation.ts',
  'app/pearl_store_retired.ts',
];
for (const file of DELETED_FILES) {
  assert.equal(exists(file), false, `D70: удалённый модуль жемчуга вернулся: ${file}`);
}

// PM-148-A2: хранилище УЖЕ купленных уроков обязано остаться — из него читаются прошлые покупки
assert.equal(
  exists('app/lessons_pearl_unlock_storage.ts'),
  true,
  'PM-148-A2: app/lessons_pearl_unlock_storage.ts удалён — прошлые покупки уроков перестанут открывать уроки',
);

const serverIndex = read('functions/src/index.ts');
for (const callable of [
  'shardsApplyDelta',
  'getCoinExchangeQuote',
  'getCoinExchangeHistory',
  'exchangeCoinsForStars',
  'adminSetCoinExchangeRate',
  'recalcCoinExchangeRate',
  'adminGetCoinExchangeCenter',
]) {
  assert.doesNotMatch(serverIndex, new RegExp(`exports\\.${callable}\\s*=`), `D70: вернулся экспорт ${callable}`);
}
assert.doesNotMatch(read('functions-admin/index.ts'), /coin_exchange/, 'D70: админ-кодбаза снова экспортирует биржу');
assert.doesNotMatch(read('app/_layout.tsx'), /coin_exchange/, 'D70: корневой layout снова знает про биржу');

// D86: админ-выдача — монетами; корректировка баланса жемчуга снята.
assert.doesNotMatch(serverIndex, /adminSetShardBalance/, 'D86: вернулся adminSetShardBalance');
// D103: вебхук RevenueCat не начисляет пакеты жемчуга (Plus-ветка остаётся).
assert.doesNotMatch(read('functions/src/revenuecat_shards.ts'), /handleShardPurchaseEvent/, 'D103: вернулось начисление пакетов жемчуга');
// D101: потеря серии больше не создаёт оффер восстановления за жемчуг.
assert.doesNotMatch(read('app/hall_of_fame_utils.ts'), /markStreakLost/, 'D101: вернулся оффер восстановления серии');

// D101/D107: платная заморозка и восстановление серии удалены — файлы не должны вернуться.
for (const removed of ['app/streak_freeze_purchase.ts', 'app/streak_revive.ts', 'components/StreakReviveModal.tsx']) {
  assert.equal(exists(removed), false, `D101/D107: вернулся удалённый файл ${removed}`);
}

// Обнуление остатка обязано оставаться подключённым.
assert.ok(exists('app/pearl_retire_d70.ts'), 'D70: модуль обнуления остатка удалён');
assert.match(read('app/_layout.tsx'), /import\('\.\/pearl_retire_d70'\)/, 'D70: обнуление остатка не запускается');

// ── 2. Ратчет: где ещё живут траты/начисления жемчуга ──────────────────────
const SPEND_OR_GRANT_CALL = new RegExp(
  '\\b(?:commitShardCompositeOperation|spendShards|spendShardsIdempotent|addShards|addShardsRaw'
  + '|commitShardCreditOperation|commitConfirmedExternalShardEvent|awardOneTime|awardOneTimeVariable'
  + '|awardOneTimePerAccount|claimReferralSpinPearls|buyLessonWithPearls|purchaseStreakFreeze'
  + '|reviveStreak|addShardsLocalOnlyForPendingServerClaim|keepShardsBalanceLocalAtLeast'
  + '|appendExternalEconomyEvent)\\(',
);

/**
 * Разрешённые места. Категории:
 * - design-ui: UI-файлы сессии «Дизайн» — жемчуг оттуда убирает она;
 * - history: ядро/синхронизация, которые обязаны принимать исторические операции;
 * - pending: ещё не снято (ждёт решения владельца или следующего захода) — см.
 *   docs/phraseman-2.0/evidence/D70_pearl_removal_inventory.md.
 */
const ALLOWLIST: Readonly<Record<string, 'design-ui' | 'history' | 'pending'>> = {
  'functions/src/external_economy_events.ts': 'history',
  // зона соревнований (турниры) — не трогаем в этом заходе
  'functions/src/tournament_weekly_payout.ts': 'pending',
  'functions/src/tournaments.ts': 'pending',
};

const SCAN_ROOTS = ['app', 'components', 'hooks', 'modules', 'functions/src'];
const SKIP_DIRS = new Set(['node_modules', 'lib', 'content']);

function walk(relative: string, out: string[]): void {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(child, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(child);
    }
  }
}

const files: string[] = [];
for (const scanRoot of SCAN_ROOTS) walk(scanRoot, files);
const offenders = files.filter((file) => SPEND_OR_GRANT_CALL.test(read(file))).sort();

const unexpected = offenders.filter((file) => !(file in ALLOWLIST));
assert.deepEqual(unexpected, [], `D70: новая трата/начисление жемчуга вне списка: ${unexpected.join(', ')}`);

const stale = Object.keys(ALLOWLIST).filter((file) => !offenders.includes(file)).sort();
assert.deepEqual(stale, [], `D70: вычеркни из ALLOWLIST — жемчуга там больше нет: ${stale.join(', ')}`);

console.log(`D70 PEARLS REMOVED RATCHET: PASS (${offenders.length} files left)`);
