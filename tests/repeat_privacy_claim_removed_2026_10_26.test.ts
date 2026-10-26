// зачем (координатор 26.10, находка 5 · ВХОД, docs/work/privacy-claims-truth-2026-10-26.md п. 4): подпись режима повтора обещала «голос не
// записываем и не оцениваем», а плеер включает микрофон, распознаёт речь и засчитывает попытку как произношение. Обещание снято на всех 9 языках;
// сторож не даёт вернуть его ни в одной локали, пока поведение режима такое (решение — у владельца).
import { learningV2SessionCopy } from '../app/learning_v2_session_copy';
import { INTERFACE_LANGS } from '../constants/i18n';

// «не записываем / не оцениваем» и их переводы — по корням
const PRIVACY_PROMISE = /запис|оцен|оцін|record|grad|graba|evalú|gravad|avaliad|ghi âm|được ghi|chấm|rekam|dinilai|kayded|değerlend|nagryw|ocenian/iu;

describe('режим повтора: без обещания «голос не записываем и не оцениваем»', () => {
  it('ни на одном языке подпись не обещает, что голос не слушают', () => {
    for (const lang of INTERFACE_LANGS) {
      const text = learningV2SessionCopy(lang).repeatPrivacy;
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).not.toMatch(PRIVACY_PROMISE);
    }
  });

  it('ru — текст координатора', () => {
    expect(learningV2SessionCopy('ru').repeatPrivacy).toBe('Просто повтори вслух');
    expect(learningV2SessionCopy('uk').repeatPrivacy).toBe('Просто повтори вголос');
  });
});
