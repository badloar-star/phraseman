// зачем (координатор 15.10, «не засчитано» по эталону Макетов 91eee157a): блок подключён в Карточках «Устно» и курсе V2; тексты «ты»; прежний вид остаётся, когда пропущенных слов нет.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«не засчитано»: проводка блока', () => {
  it('Карточки «Устно»: блок вместо прежней карточки при провале с названным словом; те же testID кнопок; «Пропустить» текстом', () => {
    const src = read('app/flashcards_speaking_session.tsx');
    expect(src).toContain("import SpeechFailBlock from '../components/speech/SpeechFailBlock';");
    expect(src).toContain('scorePronunciationTranscript({ targetText: card.en, transcript: spokenTranscript }).missingWords');
    expect(src).toContain('phase === \'scored\' && attempt && band && card && failWords.length > 0');
    expect(src).toContain('testID="fc-speak-fail"');
    expect(src).toMatch(/testID="fc-speak-retry"[\s\S]*?testID="fc-speak-next"[\s\S]*?\{labels\.skip\}/);
    // прежний результат на месте для остальных случаев
    expect(src).toContain('styles.resultCard');
  });

  it('курс V2: блок вместо карточки «Ты сказал(а)» при провале; кнопка голоса подписана «Ещё раз»; прежняя карточка остаётся иначе', () => {
    const src = read('app/learning_v2_direct_session_player_v1.tsx');
    expect(src).toContain('import SpeechFailBlock from "../components/speech/SpeechFailBlock";');
    expect(src).toContain('voiceAttemptResult && voiceTargetText && voiceFailWords.length > 0');
    expect(src).toContain('testID="learning-v2-speech-fail"');
    expect(src).toContain('"Ещё раз", uk: "Ще раз"');
    expect(src).toContain('styles.voiceResultCard');
  });

  it('курс V2: «ты» вместо «вы» в неверном вердикте (ru/uk/tr)', () => {
    const src = read('modules/learning-v2/modes/mode_feedback_v1.tsx');
    expect(src).toContain('ru: "Попробуй ещё раз."');
    expect(src).toContain('uk: "Спробуй ще раз."');
    expect(src).toContain('tr: "Tekrar dene."');
    expect(src).not.toContain('ru: "Попробуйте');
    expect(src).not.toContain('uk: "Спробуйте');
    expect(src).not.toContain('tr: "Tekrar deneyin');
  });

  it('SpeechFailBlock не рисует обводок и не берёт hex: токены темы', () => {
    const block = read('components/speech/SpeechFailBlock.tsx');
    expect(block).not.toMatch(/borderWidth|borderColor/);
    expect(block).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(block).toContain('glass.badSoft');
    expect(block).toContain('glass.bad,');
  });
});
