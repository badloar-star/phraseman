import {
  DEV_PREVIEW_MONTHLY_PRICE,
  DEV_PREVIEW_YEARLY_PER_MONTH,
  DEV_PREVIEW_YEARLY_PRICE,
} from '../app/paywall_dev_preview';
import { strict as assert } from 'node:assert';

assert.equal(DEV_PREVIEW_MONTHLY_PRICE, '€7,99');
assert.equal(DEV_PREVIEW_YEARLY_PRICE, '€39,99');
assert.equal(DEV_PREVIEW_YEARLY_PER_MONTH, '€3,33');

console.log('PAYWALL DEV PREVIEW PRICES: PASS');
