// Жалоба №4 (25.10): «говорю — не слышат, «скажите громче», не слышат всё предложение». Только логи, поведение не меняется:
// каждый пустой вердикт нейро-судьи пишет причину, исход «не расслышал» на пути удержания уходит в прод-журнал раз на причину.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('жалоба №4: причина «не расслышал» видна', () => {
  const judge = read('app/speaking_neural_judge.ts');
  const panel = read('components/SpeakingPanel.tsx');

  it('судья: у каждого пустого вердикта своя причина, немых catch нет', () => {
    for (const reason of ['ctx_unavailable', 'timeout', 'empty_transcript', 'score_null', 'threw']) expect(judge).toContain(`'${reason}'`);
    const fn = judge.slice(judge.indexOf('export async function judgeWithNeuralEngine'), judge.indexOf('export default function __RouteShim'));
    expect(fn).not.toMatch(/return null;/);
    expect(fn).not.toMatch(/catch \{/);
    expect(judge).toContain("console.warn('[SPEAK-MIC] judge:init_failed'");
    expect(judge).toContain('export function lastNeuralJudgeNullReasonV1()');
  });

  it('панель: «не расслышал» на пути удержания — с причиной судьи и числами; в прод-журнал один раз на причину', () => {
    expect(panel).toMatch(/if \(reportedNoSpeechReasons\.has\(reason\)\) return kind;\s*reportedNoSpeechReasons\.add\(reason\);/);
    expect(panel).toContain("DebugLogger.error(`speak_mic:no_speech_${reason}`");
    expect(panel).toContain("reportHoldNoSpeech('no_wav', { holdMs, firstAudioMs");
    expect(panel).toContain("lastNeuralJudgeNullReasonV1()?.reason ?? 'no_verdict'");
    // текст речи в прод-журнал не уходит
    const report = panel.slice(panel.indexOf('function reportHoldNoSpeech'), panel.indexOf('function errorText'));
    expect(report).not.toMatch(/transcript/);
    // поведение то же: «не расслышал» по-прежнему показывается
    expect(panel).toMatch(/reportHoldNoSpeech\(judgeReason[\s\S]{0,400}setStatus\('no_speech'\); playNoSpeech\(\);/);
  });
});
