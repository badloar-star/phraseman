import {
  DEV_PREVIEW_MONTHLY_PRICE,
  DEV_PREVIEW_YEARLY_PER_MONTH,
  DEV_PREVIEW_YEARLY_PRICE,
} from '../app/paywall_dev_preview';
import { strict as assert } from 'node:assert';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
assert.equal(DEV_PREVIEW_MONTHLY_PRICE, '€7,99');
assert.equal(DEV_PREVIEW_YEARLY_PRICE, '€39,99');
assert.equal(DEV_PREVIEW_YEARLY_PER_MONTH, '€3,33');

console.log('PAYWALL DEV PREVIEW PRICES: PASS');
}

if (typeof test === "function") {
  test("paywall_dev_preview_prices", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
