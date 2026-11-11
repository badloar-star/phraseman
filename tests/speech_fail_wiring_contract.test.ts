// зачем (координатор 15.10, «не засчитано» по эталону Макетов 91eee157a): блок подключён в Карточках «Устно» и курсе V2; тексты «ты»; прежний вид остаётся, когда пропущенных слов нет.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«не засчитано»: проводка блока', () => {
  it('Карточки «Устно»: блок вместо прежней карточки при провале с названным словом; те же testID кнопок; «Пропустить» текстом', () => {
    const src = read('app/flashcards_speaking_session.tsx');
    expect(src).toContain("import SpeechFailBlock from '../components/speech/SpeechFailBlock';");
    expect(src).toContain('retainedMissingWords(attempt)');
    expect(src).not.toContain('scorePronunciationTranscript(');
    expect(src).toContain('phase === \'scored\' && attempt && band && card && failWords.length > 0');
    expect(src).toContain('testID="fc-speak-fail"');
    expect(src).toMatch(/testID="fc-speak-retry"[\s\S]*?testID="fc-speak-next"[\s\S]*?\{labels\.skip\}/);
    // прежний результат на месте для остальных случаев
    expect(src).toContain('styles.resultCard');
  });

  it('SpeechFailBlock не рисует обводок и не берёт hex: токены темы', () => {
    const block = read('components/speech/SpeechFailBlock.tsx');
    expect(block).not.toMatch(/borderWidth|borderColor/);
    expect(block).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(block).toContain('glass.badSoft');
    // 25.10 (Ревизор, прогон 05:00): текст пропущенного слова берёт контрастный badText (semanticInk, ≥ 4,55:1) — коммит Тем 0ace9f5c7 (24.10) вместо сырого glass.bad; токен темы по-прежнему, hex нет
    expect(block).toContain('semanticInk(glass).badText');
    expect(block).not.toMatch(/color: glass\.bad\b(?!Soft)/);
  });
});

describe('«не услышали слово»: только при reason === missing_words (R11)', () => {

  // зачем (владелец 11.11, пересмотр обрезанных тестов): случай был вырезан целиком вместе с курсом занятий; живая часть возвращена
  it('Карточки и урок строят блок только по причине missing_words', () => {
    expect(read('app/flashcards_speaking_session.tsx')).toContain("reason?: unknown }).reason !== 'missing_words'");
    expect(read('app/lesson1.tsx')).toContain("speakingResult.reason === 'missing_words'");
  });
});
