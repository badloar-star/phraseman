// зачем (координатор 15.10, «не засчитано» по эталону Макетов 91eee157a): в уроке при провале речи с названным словом — блок вместо красной маски и звёзд; прежний вид остаётся, когда слова не названы.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('урок: «не засчитано»', () => {
  it('пропущенные слова считаются тем же оценщиком по распознанному тексту; только при провале и вне результата ответа', () => {
    expect(src).toContain("import SpeechFailBlock from '../components/speech/SpeechFailBlock';");
    // пропущенные слова приходят из результата панели (`missingWords`), пересчёта по тексту нет
    expect(src).toContain('(speakingResult.missingWords ?? [])');
    expect(src).not.toContain('scorePronunciationTranscript(');
    expect(src).toContain("speakingResult && !speakingResult.passed && status !== 'result' && spokenTargetLine");
  });

  it('блок занимает место ответа, звёзды под разделителем скрыты, прежняя маска и звёзды остаются без названных слов', () => {
    expect(src).toContain('testID="lesson1-speech-fail"');
    expect(src).toContain('{speakingFailWords.length > 0 ? (');
    expect(src).toContain('{speakingResult && speakingFailWords.length === 0 && (');
    // красная маска `t____` снята решением эталона: фраза целиком
    expect(src).not.toContain('maskSpokenPhraseKeepInitial');
    expect(src).toContain('missingWords?: readonly string[]');
  });
});
