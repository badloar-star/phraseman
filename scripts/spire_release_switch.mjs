// Переключение боевого конфига Пика ВМЕСТЕ со сборкой (владелец 04.11): rankBy -> 'coins' и coins.promotionBonus -> 1000.
// ПО УМОЛЧАНИЮ — СУХОЙ ПРОГОН: читает config/spire_v1 и печатает, что изменится. Запись — только с --execute.
//   node scripts/spire_release_switch.mjs                 # сухой прогон
//   node scripts/spire_release_switch.mjs --execute       # записать (merge, только эти два поля)
//   node scripts/spire_release_switch.mjs --rollback --execute   # вернуть rankBy='steps', promotionBonus=100
// Откат — те же два поля обратно. Связка (включаются ВМЕСТЕ): флаг Пика B + rankBy=coins + promotionBonus=1000 + энергия от Пика.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'functions', 'package.json'));
const admin = require('firebase-admin');

const execute = process.argv.includes('--execute');
const rollback = process.argv.includes('--rollback');
const target = rollback ? { rankBy: 'steps', promotionBonus: 100 } : { rankBy: 'coins', promotionBonus: 1000 };

admin.initializeApp({ projectId: 'phraseman-ea0b3' });
const ref = admin.firestore().doc('config/spire_v1');
const snap = await ref.get();
const data = snap.data() ?? {};
const current = { rankBy: data.rankBy ?? '(нет → steps)', promotionBonus: data.coins?.promotionBonus ?? '(нет → 100)' };
console.log('[SPIRE-SWITCH] сейчас', JSON.stringify(current));
console.log('[SPIRE-SWITCH] станет', JSON.stringify(target), execute ? 'ЗАПИСЬ' : 'сухой прогон (без --execute ничего не пишется)');
if (!execute) process.exit(0);
await ref.set({ rankBy: target.rankBy, coins: { promotionBonus: target.promotionBonus } }, { merge: true });
const after = (await ref.get()).data() ?? {};
console.log('[SPIRE-SWITCH] записано', JSON.stringify({ rankBy: after.rankBy, promotionBonus: after.coins?.promotionBonus }));
process.exit(0);
