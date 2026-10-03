import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// зачем (§99, 03.10): клиентский каталог подарков уровня (app/level_gift_system.ts) удалён целиком (D09) —
// охраняем, что он не вернулся, и что клиент сообществ не принимает снятые поля наград.
assert.equal(fs.existsSync(path.resolve(__dirname, '../app/level_gift_system.ts')), false, 'level_gift_system.ts must stay deleted');
assert.equal(fs.existsSync(path.resolve(__dirname, '../app/theme_gift_pool.ts')), false, 'theme_gift_pool.ts must stay deleted');
const functionsClient = fs.readFileSync(path.resolve(__dirname, '../app/community_packs/functionsClient.ts'), 'utf8');
assert.doesNotMatch(functionsClient, /chainShield\?:|giftXpMultiplier\?:|clubGiftFreeBoostCount\?:/);
