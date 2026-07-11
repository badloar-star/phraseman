import { moodToFace, clampMood, DEFAULT_MOOD } from '../app/dialog_mood_face';

describe('dialog_mood_face — смайл настроения собеседника', () => {
  describe('moodToFace границы', () => {
    it('mood >= 80 → очень довольное лицо', () => {
      expect(moodToFace(80)).toBe('😄');
      expect(moodToFace(100)).toBe('😄');
    });

    it('60..79 → довольное лицо', () => {
      expect(moodToFace(60)).toBe('🙂');
      expect(moodToFace(79)).toBe('🙂');
    });

    it('40..59 → нейтральное лицо', () => {
      expect(moodToFace(40)).toBe('😐');
      expect(moodToFace(59)).toBe('😐');
    });

    it('20..39 → настороженное лицо', () => {
      expect(moodToFace(20)).toBe('😟');
      expect(moodToFace(39)).toBe('😟');
    });

    it('< 20 → раздражённое лицо', () => {
      expect(moodToFace(19)).toBe('😠');
      expect(moodToFace(0)).toBe('😠');
    });

    it('клампит выход за диапазон', () => {
      expect(moodToFace(150)).toBe('😄');
      expect(moodToFace(-50)).toBe('😠');
    });

    it('нечисловой/бесконечный вход → нейтральное лицо (безопасно)', () => {
      expect(moodToFace(NaN)).toBe('😐');
      expect(moodToFace(Infinity)).toBe('😐'); // !Number.isFinite → нейтрально
      expect(moodToFace(-Infinity)).toBe('😐');
    });
  });

  describe('clampMood', () => {
    it('кламп в 0..100 с округлением', () => {
      expect(clampMood(72.4)).toBe(72);
      expect(clampMood(120)).toBe(100);
      expect(clampMood(-5)).toBe(0);
    });

    it('нечисло → DEFAULT_MOOD', () => {
      expect(clampMood('abc')).toBe(DEFAULT_MOOD);
      expect(clampMood(null)).toBe(DEFAULT_MOOD);
      expect(clampMood(undefined)).toBe(DEFAULT_MOOD);
    });

    it('пустая строка → DEFAULT_MOOD (аудит M7: явная ветка кода)', () => {
      expect(clampMood('')).toBe(DEFAULT_MOOD);
    });

    it('числовая строка парсится', () => {
      expect(clampMood('80')).toBe(80);
    });
  });
});
