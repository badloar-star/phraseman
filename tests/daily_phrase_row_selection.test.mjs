import assert from 'node:assert/strict';
import test from 'node:test';

import { selectExactDailyPhraseRows } from '../scripts/daily_phrase_row_selection.mjs';

const rows = [{ id: 'es-001' }, { id: 'es-002' }];

test('selector treats only null or undefined as no filter', () => {
  assert.equal(selectExactDailyPhraseRows(rows, null), rows);
  assert.equal(selectExactDailyPhraseRows(rows, undefined), rows);

  for (const invalid of ['es-999', {}, 123]) {
    assert.throws(
      () => selectExactDailyPhraseRows(rows, invalid),
      /requestedIds|selector|array|filter/iu,
    );
  }
});
