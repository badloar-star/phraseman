/**
 * Генерує app/flashcards/bundles/royal_tea_11_40.json з вмісту royal_tea_data.cjs
 * Запуск: node scripts/emit_royal_tea_bundle.mjs
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { ROYAL_TEA_11_40 } = require('./royal_tea_data.cjs');
const out = join(__dirname, '../app/flashcards/bundles/royal_tea_11_40.json');
writeFileSync(out, JSON.stringify(ROYAL_TEA_11_40, null, 2), 'utf8');
console.log('Wrote', out, ROYAL_TEA_11_40.length, 'cards');
