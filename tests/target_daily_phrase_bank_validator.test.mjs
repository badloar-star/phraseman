import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateTargetDailyPhraseBank,
  validateTargetDailyPhraseSubset,
} from '../scripts/validate_target_daily_phrase_bank.mjs';

function row(id) {
  return {
    id: `es-${String(id).padStart(3, '0')}`,
    order: id,
    studyTarget: 'es',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    targetText: `expresión ${id}`,
    targetExample: `Usamos expresión ${id} en una frase natural.`,
    literal_ru: `буквально ${id}`,
    meaning_ru: `значение ${id}`,
    text_ru: `В разговоре скажи expresión ${id}.`,
    literal_uk: `буквально ${id}`,
    meaning_uk: `значення ${id}`,
    text_uk: `У розмові скажи expresión ${id}.`,
    allowSave: true,
    active: false,
    activationApproved: false,
  };
}

function bankWithFirstExample(targetExample) {
  return {
    studyTarget: 'es',
    sourceLocale: 'ru',
    surface: 'daily_phrase',
    activationApproved: false,
    rows: Array.from({ length: 176 }, (_, index) => ({
      ...row(index + 1),
      ...(index === 0 ? { targetExample } : {}),
    })),
  };
}

test('accepts lowercase and titlecase Spanish todo instead of treating them as placeholders', () => {
  for (const example of [
    'Antes del viaje lo revisó todo con calma.',
    'Todo quedó preparado antes del viaje.',
  ]) {
    const result = validateTargetDailyPhraseBank(bankWithFirstExample(example));
    assert.equal(result.status, 'STRUCTURAL_PASS', example);
    assert.deepEqual(result.errors, [], example);
  }
});

test('accepts canonical Italian ids and rejects a foreign id inside an Italian bank', () => {
  const bank = bankWithFirstExample('Todo quedó preparado antes del viaje.');
  bank.studyTarget = 'it';
  bank.rows.forEach((item) => {
    item.studyTarget = 'it';
    item.id = `it-${String(item.order).padStart(3, '0')}`;
  });
  assert.equal(validateTargetDailyPhraseBank(bank).status, 'STRUCTURAL_PASS');
  bank.rows[1].id = 'de-002';
  assert.ok(validateTargetDailyPhraseBank(bank).errors.includes('row:it-002:canonical_id_required'));
});

test('rejects exact uppercase TODO while preserving ordinary Spanish todo', () => {
  const result = validateTargetDailyPhraseBank(bankWithFirstExample('TODO'));
  assert.ok(result.errors.includes('row:es-001:targetExample_contains_placeholder'));
});

test('rejects tbd and placeholder authoring markers in every supported case', () => {
  for (const marker of ['tbd', 'Tbd', 'TBD', 'placeholder', 'Placeholder', 'PLACEHOLDER']) {
    const result = validateTargetDailyPhraseBank(bankWithFirstExample(marker));
    assert.ok(
      result.errors.includes('row:es-001:targetExample_contains_placeholder'),
      `${marker} must remain blocked`,
    );
  }
});

test('validates an explicitly selected authoring subset without promoting unfinished scaffold rows', () => {
  const bank = bankWithFirstExample('Todo quedó preparado antes del viaje.');
  for (const unfinished of bank.rows.slice(5)) {
    unfinished.targetExample = '';
    unfinished.literal_ru = '';
    unfinished.meaning_ru = '';
    unfinished.text_ru = '';
    unfinished.literal_uk = '';
    unfinished.meaning_uk = '';
    unfinished.text_uk = '';
  }

  const result = validateTargetDailyPhraseSubset(
    bank,
    bank.rows.slice(0, 5).map((item) => item.id),
  );

  assert.equal(result.status, 'STRUCTURAL_PASS', JSON.stringify(result.errors, null, 2));
  assert.deepEqual(result.checkedRows, bank.rows.slice(0, 5).map((item) => item.id));
});

test('authoring subset validation fails closed for unknown, duplicate, or incomplete selected rows', () => {
  const bank = bankWithFirstExample('Todo quedó preparado antes del viaje.');
  bank.rows[1].text_uk = '';

  const incomplete = validateTargetDailyPhraseSubset(bank, [bank.rows[1].id]);
  assert.ok(incomplete.errors.includes(`row:${bank.rows[1].id}:text_uk_required`));

  const unknown = validateTargetDailyPhraseSubset(bank, ['es-999']);
  assert.ok(unknown.errors.includes('requested_row:es-999:not_found'));

  const duplicate = validateTargetDailyPhraseSubset(bank, [bank.rows[0].id, bank.rows[0].id]);
  assert.ok(duplicate.errors.includes(`requested_row:${bank.rows[0].id}:duplicate_request`));
});

test('binds every canonical row id and order to its exact bank position', () => {
  const wrongOrder = bankWithFirstExample('Todo quedó preparado antes del viaje.');
  wrongOrder.rows[2].order = 999;
  const full = validateTargetDailyPhraseBank(wrongOrder);
  assert.equal(full.status, 'FAIL');
  assert.ok(full.errors.includes('row:es-003:canonical_order_required'));

  const subset = validateTargetDailyPhraseSubset(wrongOrder, ['es-001']);
  assert.equal(subset.status, 'FAIL');
  assert.ok(subset.errors.includes('row:es-003:canonical_order_required'));

  const swapped = bankWithFirstExample('Todo quedó preparado antes del viaje.');
  [swapped.rows[0].order, swapped.rows[1].order] = [swapped.rows[1].order, swapped.rows[0].order];
  const swappedResult = validateTargetDailyPhraseBank(swapped);
  assert.ok(swappedResult.errors.includes('row:es-001:canonical_order_required'));
  assert.ok(swappedResult.errors.includes('row:es-002:canonical_order_required'));
});

test('rejects target duplicates hidden only by punctuation', () => {
  const bank = bankWithFirstExample('Todo quedó preparado antes del viaje.');
  bank.rows[1].targetText = 'expresión, 1';

  const result = validateTargetDailyPhraseBank(bank);

  assert.ok(result.errors.includes('row:es-002:duplicate_target_text'));
});

test('rejects lexical duplicate meanings independently in both learner locales', () => {
  const bank = bankWithFirstExample('Todo quedó preparado antes del viaje.');
  bank.rows[1].meaning_ru = 'значение, 1';
  bank.rows[1].meaning_uk = bank.rows[0].meaning_uk;

  const result = validateTargetDailyPhraseBank(bank);

  assert.ok(result.errors.includes('row:es-002:duplicate_meaning_ru'));
  assert.ok(result.errors.includes('row:es-002:duplicate_meaning_uk'));
});

test('requires exact raw bank scope scalars without trimming', () => {
  for (const [field, value] of [
    ['studyTarget', ' es '],
    ['sourceLocale', ' ru '],
    ['surface', ' daily_phrase '],
  ]) {
    const bank = bankWithFirstExample('Todo quedó preparado antes del viaje.');
    bank[field] = value;

    const full = validateTargetDailyPhraseBank(bank);
    const subset = validateTargetDailyPhraseSubset(bank, ['es-001']);

    assert.equal(full.status, 'FAIL', field);
    assert.equal(subset.status, 'FAIL', field);
  }
});

test('subset validation reports every malformed requested id instead of dropping it', () => {
  for (const invalidId of [[], 123, {}, '  ']) {
    const bank = bankWithFirstExample('Todo quedó preparado antes del viaje.');

    const result = validateTargetDailyPhraseSubset(bank, ['es-001', invalidId]);

    assert.equal(result.status, 'FAIL', JSON.stringify(invalidId));
    assert.ok(
      result.errors.includes('requested_row:1:invalid_id_type'),
      JSON.stringify(result.errors, null, 2),
    );
  }
});
