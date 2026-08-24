import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('MAX preserves the active course target end to end', () => {
  const mintRequest = read(path.join('app', 'max_call_mint_request.ts'));
  const session = read(path.join('app', 'max_call_session.tsx'));
  const review = read(path.join('app', 'max_voice_review.tsx'));
  const mint = read(path.join('functions', 'src', 'max_voice_mint.ts'));
  const prompt = read(path.join('functions', 'src', 'max_voice_prompt.ts'));
  const finalize = read(path.join('functions', 'src', 'max_voice_finalize.ts'));

  it('does not collapse Spanish or French to English in the client payload', () => {
    expect(mintRequest).not.toContain("params.studyTarget === 'fr' ? 'fr' : 'en'");
    expect(mintRequest).toContain('buildLessonSyllabusBlock(callStudyTarget)');
    expect(mintRequest).toContain('buildLearnerSnapshot(cefr, callStudyTarget)');
    expect(session).toContain('studyTarget: callStudyTarget');
    expect(review).not.toContain("localResult?.studyTarget === 'fr' ? 'fr' : 'en'");
  });

  it('passes the normalized call target into the live tutor tool runner', () => {
    const runnerStart = session.indexOf('createTutorToolRunner({');
    const runnerEnd = session.indexOf('});', runnerStart);
    expect(runnerStart).toBeGreaterThanOrEqual(0);
    expect(session.slice(runnerStart, runnerEnd)).toContain('studyTarget: callStudyTarget');
  });

  it('resolves the selected target on the server for the lesson prompt and final review', () => {
    expect(mint).toContain('maxVoiceStudyTarget(data.studyTarget)');
    expect(mint).toContain('maxVoiceTargetLanguageName(studyTarget)');
    expect(prompt).toContain('targetLangName');
    expect(finalize).toContain('request.studyTarget');
    expect(finalize).toContain('maxVoiceReviewSystemPrompt(request.cefr, request.interfaceLang, request.studyTarget)');
  });
});
