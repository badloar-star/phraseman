import { englishRecallSurface } from '../app/phrase_target_utils';
import { evaluateRecallAnswer } from '../app/review_evaluator';

describe('englishRecallSurface', () => {
  it('removes spaced chunk hyphen tokens from lesson 20 style English', () => {
    expect(
      englishRecallSurface(
        "Somebody's - neighbors planted an unusual - tree behind that - brick - fence.",
      ),
    ).toBe("Somebody's neighbors planted an unusual tree behind that brick fence");
  });

  it('keeps real hyphenated compounds intact', () => {
    expect(englishRecallSurface('Save onto that flash-drive')).toBe(
      'Save onto that flash-drive',
    );
  });
});

describe('evaluateRecallAnswer', () => {
  it('grades against prose without chunk hyphens when raw phrase has markers', () => {
    const raw =
      "Somebody's - neighbors planted an unusual - tree behind that - brick - fence.";
    const assembled = englishRecallSurface(raw);
    const { ok } = evaluateRecallAnswer(assembled, raw);
    expect(ok).toBe(true);
  });
});
