import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateDailyPhraseTargetSurface } from '../scripts/daily_phrase_target_surface.mjs';

test('canonical target matching requires a complete token sequence', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'an die',
    targetExample: 'Span Diego ist heute sonnig.',
  }, 'targetExample');

  assert.equal(result.status, 'missing_surface');
});

test('declared surface matching requires a complete token sequence', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'foo bar',
    targetExample: 'Der kungfoo barista arbeitet heute.',
    targetSurfaceForms: { targetExample: 'foo bar' },
  }, 'targetExample');

  assert.equal(result.status, 'declared_surface_missing');
});

test('French apostrophe clitics do not hide the complete target token sequence', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'Être la cinquième roue du carrosse',
    targetExample: 'Malik a l’impression d’être la cinquième roue du carrosse dans l’équipe.',
  }, 'targetExample');

  assert.equal(result.status, 'PASS');
  assert.equal(result.usedDeclaredSurface, false);
});

test('declared target surface forms must be strings, not coercible containers', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'être à bout',
    targetExample: 'Après le trajet, Paul est à bout.',
    targetSurfaceForms: { targetExample: ['est', 'à', 'bout'] },
  }, 'targetExample');

  assert.equal(result.status, 'invalid_surface');
});

test('a canonical match cannot cross a terminal sentence boundary', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'an die',
    targetExample: 'Wir denken an. Die Reise beginnt morgen.',
  }, 'targetExample');

  assert.equal(result.status, 'missing_surface');
});

test('a malformed present declaration fails even when the canonical target also matches', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'être à bout',
    targetExample: 'Après le trajet, Paul va être à bout.',
    targetSurfaceForms: { targetExample: ['est', 'à', 'bout'] },
  }, 'targetExample');

  assert.equal(result.status, 'invalid_surface');
});

test('learner-facing target fields must be strings instead of coercible arrays', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'être à bout',
    targetExample: ['Après le trajet, Paul est à bout.'],
    targetSurfaceForms: { targetExample: 'est à bout' },
  }, 'targetExample');

  assert.equal(result.status, 'invalid_value');
});

test('a target that contains its own sentence boundary matches the same phrase shape', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: '¿Dónde va Vicente? Donde va la gente',
    targetExample: 'Siguió al grupo: «¿Dónde va Vicente? Donde va la gente».',
  }, 'targetExample');

  assert.equal(result.status, 'PASS');
});

test('a declared surface form cannot introduce a sentence boundary absent from the canonical target', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'an die',
    targetExample: 'Wir denken an. Die Reise beginnt morgen.',
    targetSurfaceForms: { targetExample: 'an. Die' },
  }, 'targetExample');

  assert.equal(result.status, 'invalid_surface');
});

test('the earliest declared surface wins position metadata when the canonical lemma also appears later', () => {
  const result = evaluateDailyPhraseTargetSurface({
    targetText: 'jemandem sein Herz ausschütten',
    text_ru: 'Anna wollte ihrer Schwester ihr Herz ausschütten. Später erklärte sie: jemandem sein Herz ausschütten kann erleichtern.',
    targetSurfaceForms: { text_ru: 'ihrer Schwester ihr Herz ausschütten' },
  }, 'text_ru');

  assert.equal(result.status, 'PASS');
  assert.equal(result.usedDeclaredSurface, true);
  assert.equal(result.startSentenceIndex, 0);
});

test('all present targetSurfaceForms keys and values are validated globally', () => {
  for (const targetSurfaceForms of [
    { unused: 'etre a bout' },
    { unused: [] },
    { text_uk: ['est', 'à', 'bout'] },
  ]) {
    const result = evaluateDailyPhraseTargetSurface({
      targetText: 'être à bout',
      targetExample: 'Après le trajet, Paul va être à bout.',
      targetSurfaceForms,
    }, 'targetExample');

    assert.equal(result.status, 'invalid_surface');
  }
});
