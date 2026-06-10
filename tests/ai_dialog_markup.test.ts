import {
  parseKeyPhrases,
  stripMarkers,
  extractKeyPhrases,
} from '../app/ai_dialog_markup';

describe('ai_dialog_markup', () => {
  describe('parseKeyPhrases', () => {
    it('returns one plain segment when there are no markers', () => {
      const segs = parseKeyPhrases('How are you today?');
      expect(segs).toEqual([{ text: 'How are you today?', isKey: false }]);
    });

    it('splits a single key phrase from surrounding text', () => {
      const segs = parseKeyPhrases('You could say [[I would love to]] here.');
      expect(segs).toEqual([
        { text: 'You could say ', isKey: false },
        { text: 'I would love to', isKey: true },
        { text: ' here.', isKey: false },
      ]);
    });

    it('handles multiple key phrases in order', () => {
      const segs = parseKeyPhrases('[[Good morning]]! Did you [[sleep well]]?');
      expect(segs).toEqual([
        { text: 'Good morning', isKey: true },
        { text: '! Did you ', isKey: false },
        { text: 'sleep well', isKey: true },
        { text: '?', isKey: false },
      ]);
    });

    it('trims whitespace inside markers', () => {
      const segs = parseKeyPhrases('Try [[  on the other hand  ]] now.');
      expect(segs[1]).toEqual({ text: 'on the other hand', isKey: true });
    });

    it('drops empty markers but keeps surrounding text', () => {
      const segs = parseKeyPhrases('Hello [[]] world');
      expect(segs).toEqual([{ text: 'Hello ', isKey: false }, { text: ' world', isKey: false }]);
    });

    it('returns a single empty plain segment for empty input', () => {
      expect(parseKeyPhrases('')).toEqual([{ text: '', isKey: false }]);
    });

    it('is reusable across calls (no leaked regex state)', () => {
      const a = parseKeyPhrases('[[one]] x');
      const b = parseKeyPhrases('[[two]] y');
      expect(a[0]).toEqual({ text: 'one', isKey: true });
      expect(b[0]).toEqual({ text: 'two', isKey: true });
    });
  });

  describe('stripMarkers', () => {
    it('removes markers and keeps inner text', () => {
      expect(stripMarkers('I [[would rather]] not, [[to be honest]].')).toBe(
        'I would rather not, to be honest.',
      );
    });

    it('leaves marker-free text unchanged (trimmed)', () => {
      expect(stripMarkers('  Just talking.  ')).toBe('Just talking.');
    });
  });

  describe('extractKeyPhrases', () => {
    it('returns only the key phrases', () => {
      expect(extractKeyPhrases('[[hop in]] and [[buckle up]], ok?')).toEqual([
        'hop in',
        'buckle up',
      ]);
    });

    it('returns empty array when there are no markers', () => {
      expect(extractKeyPhrases('nothing here')).toEqual([]);
    });
  });
});
