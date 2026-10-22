// зачем (координатор 22.10): правило «новое слово объявлено до фразы» сторожило только архивный источник
// (content/source, authored_sessions_v1), а ученик проходит боевой курс — factory_native generated_release. Здесь то же правило
// для боевого курса: каждое слово из «Новые слова» занятия (final.ru.md) имеет карточку слова в этом занятии, и карточка стоит
// раньше первой фразы (ответ из 2+ слов) с этим словом. Известные дыры заморожены списком — он может только сокращаться.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const RELEASE = path.join(ROOT, 'modules/learning-v2/content/factory_native/generated_release/en');
const SOURCE = path.join(ROOT, 'content/learning-v2-course/sessions/en');

/** Дыры на 22.10 (передано координатору). Исправил — вычеркни строку; новых сюда не добавлять. */
// зачем: 7 из 12 исправлены и перенесены 22.10 (вычитка Теории); эти 5 исправлены в фабрике, но ждут озвучки новой фразы —
// перенос в приложение после звука (scripts/learning_v2_transfer_pending.v1.json)
const KNOWN_HOLES = new Set<string>([
  'l01/s44:ancient', 'l01/s48:sticky',
  'l02/s54:dramatic',
  'l03/s08:bucket',
  'l06/s40:doorstep',
]);

type Payload = Readonly<{
  family?: string;
  isWordCard?: boolean;
  wordCard?: Readonly<{ word?: string }> | null;
  orderedTokens?: readonly string[];
  referenceAudio?: Readonly<{ transcript?: string }> | null;
  targetPhrase?: string;
}>;

const norm = (w: string) => w.normalize('NFKC').replace(/[’]/gu, "'").replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '').toLowerCase();
const tokens = (s: string | undefined) => String(s ?? '').split(/\s+/u).map(norm).filter(Boolean);

function answerOf(p: Payload): string {
  if (p.isWordCard) return '';
  if (Array.isArray(p.orderedTokens)) return p.orderedTokens.join(' ');
  if (p.family === 'listen_choose' && p.referenceAudio) return p.referenceAudio.transcript ?? '';
  return p.targetPhrase ?? '';
}

function scan(): Readonly<{ sessions: number; declared: number; holes: string[]; missingCards: string[] }> {
  const holes: string[] = [];
  const missingCards: string[] = [];
  let sessions = 0;
  let declaredTotal = 0;
  for (const lesson of fs.readdirSync(RELEASE).sort()) {
    for (const s of fs.readdirSync(path.join(RELEASE, lesson)).sort()) {
      const learnerFile = path.join(RELEASE, lesson, s, 'learner.json');
      const sourceFile = path.join(SOURCE, lesson, s, 'final.ru.md');
      if (!fs.existsSync(learnerFile) || !fs.existsSync(sourceFile)) continue;
      sessions += 1;
      const line = fs.readFileSync(sourceFile, 'utf8').match(/^\*\*Новые слова:\*\*(.*)$/mu)?.[1] ?? '';
      const declared = line.split(/[,;]/u)
        .map((part) => tokens(part.split('—')[0]!.replace(/[.()«»]/gu, ' ')).join(' '))
        .filter(Boolean);
      declaredTotal += declared.length;
      const learner = JSON.parse(fs.readFileSync(learnerFile, 'utf8')) as { interactions: { ordinal: number; modePayload?: Payload | null }[] };
      const cardAt = new Map<string, number>();
      const phrases: { at: number; text: string }[] = [];
      for (const it of learner.interactions) {
        const p = it.modePayload ?? {};
        if (p.isWordCard && p.wordCard?.word) {
          const word = tokens(p.wordCard.word).join(' ');
          if (!cardAt.has(word)) cardAt.set(word, it.ordinal);
        }
        const answer = tokens(answerOf(p));
        if (answer.length >= 2) phrases.push({ at: it.ordinal, text: ` ${answer.join(' ')} ` });
      }
      for (const word of declared) {
        const card = cardAt.get(word);
        const firstPhrase = phrases.find((ph) => ph.text.includes(` ${word} `))?.at;
        if (card === undefined) missingCards.push(`${lesson}/${s}:${word}`);
        else if (firstPhrase !== undefined && firstPhrase < card) holes.push(`${lesson}/${s}:${word}`);
      }
    }
  }
  return { sessions, declared: declaredTotal, holes, missingCards };
}

describe('live course: a new word is declared (word card) before its first phrase', () => {
  const result = scan();

  it('scans the real release (not an empty folder)', () => {
    expect(result.sessions).toBeGreaterThan(50);
    expect(result.declared).toBeGreaterThan(200);
  });

  it('every declared new word has its own word card in the session', () => {
    expect(result.missingCards).toEqual([]);
  });

  it('no new holes: a word never appears in a phrase before its card', () => {
    expect(result.holes.filter((hole) => !KNOWN_HOLES.has(hole))).toEqual([]);
  });

  it('the frozen list only shrinks: a fixed hole must be removed from KNOWN_HOLES', () => {
    const current = new Set(result.holes);
    expect([...KNOWN_HOLES].filter((hole) => !current.has(hole))).toEqual([]);
  });
});
