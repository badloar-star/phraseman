import {
  SAFETY_FLAG_AGE_CONTRACT,
  deriveSafetyAgeEvidence,
} from './safety_flag_age_contract';

describe('server-authoritative safety age evidence', () => {
  test('exposes exactly the three allowed evidence states', () => {
    expect(SAFETY_FLAG_AGE_CONTRACT.evidenceStates).toEqual([
      'confirmed_adult',
      'age_unverified',
      'unavailable',
    ]);
  });

  test('confirms adulthood only from an available user_consents adult row', () => {
    expect(deriveSafetyAgeEvidence({ available: true, ageBracket: 'adult' }))
      .toBe('confirmed_adult');
  });

  test.each([
    'unknown',
    'under13',
    'teen_safe',
    'minor',
    '',
    null,
    undefined,
  ])('never turns unsupported/client-like age value %p into minor evidence', (ageBracket) => {
    expect(deriveSafetyAgeEvidence({ available: true, ageBracket }))
      .toBe('age_unverified');
  });

  test('fails closed when the server consent source cannot be read', () => {
    expect(deriveSafetyAgeEvidence({ available: false }))
      .toBe('unavailable');
  });
});
