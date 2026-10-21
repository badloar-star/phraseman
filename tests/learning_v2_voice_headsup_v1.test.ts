// зачем (владелец 17.10, координатор): предупреждение о голосовом лимите при старте занятия V2 — когда показывать, а когда молчать.
import {
  countLearningV2VoiceTasksV1,
  decideLearningV2VoiceHeadsupV1,
  markLearningV2VoiceHeadsupShownV1,
  resetLearningV2VoiceHeadsupForTestsV1,
  wasLearningV2VoiceHeadsupShownV1,
} from '../app/learning_v2_voice_headsup_v1';
import type { VoiceDailyAllowance } from '../app/voice_daily_allowance';

const limited = (remaining: number): VoiceDailyAllowance => ({ kind: 'limited', remaining, exhausted: remaining === 0, limit: 3 });
const PLUS: VoiceDailyAllowance = { kind: 'plus', remaining: null, exhausted: false, limit: 3 };
const UNKNOWN: VoiceDailyAllowance = { kind: 'unknown', remaining: null, exhausted: false, limit: 3 };

describe('Learning V2 voice heads-up at session start', () => {
  beforeEach(() => resetLearningV2VoiceHeadsupForTestsV1());

  it('counts only microphone tasks (scripted_speech, tap_record_compare)', () => {
    expect(countLearningV2VoiceTasksV1([
      { inputMode: 'scripted_speech' }, { inputMode: 'single_choice' }, { inputMode: 'tap_record_compare' },
      { inputMode: 'ordered_tokens' }, { inputMode: 'pair_grid' }, { inputMode: null }, {},
    ])).toBe(2);
  });

  it('Free with fewer attempts left than voice tasks: show', () => {
    expect(decideLearningV2VoiceHeadsupV1({ allowance: limited(1), voiceTasks: 4, alreadyShownForRun: false }))
      .toEqual({ decision: 'show', voiceTasks: 4, remaining: 1 });
    expect(decideLearningV2VoiceHeadsupV1({ allowance: limited(0), voiceTasks: 1, alreadyShownForRun: false }).decision).toBe('show');
  });

  it('Free with enough attempts: silent (remaining >= tasks)', () => {
    expect(decideLearningV2VoiceHeadsupV1({ allowance: limited(3), voiceTasks: 3, alreadyShownForRun: false }).decision).toBe('skip_enough_attempts');
  });

  it('Plus and unknown access stay silent; no voice tasks — silent', () => {
    expect(decideLearningV2VoiceHeadsupV1({ allowance: PLUS, voiceTasks: 9, alreadyShownForRun: false }).decision).toBe('skip_plus');
    expect(decideLearningV2VoiceHeadsupV1({ allowance: UNKNOWN, voiceTasks: 9, alreadyShownForRun: false }).decision).toBe('skip_unknown');
    expect(decideLearningV2VoiceHeadsupV1({ allowance: limited(0), voiceTasks: 0, alreadyShownForRun: false }).decision).toBe('skip_no_voice_tasks');
  });

  it('once per session run', () => {
    expect(wasLearningV2VoiceHeadsupShownV1('run-1')).toBe(false);
    markLearningV2VoiceHeadsupShownV1('run-1');
    expect(wasLearningV2VoiceHeadsupShownV1('run-1')).toBe(true);
    expect(wasLearningV2VoiceHeadsupShownV1('run-2')).toBe(false);
    expect(decideLearningV2VoiceHeadsupV1({ allowance: limited(1), voiceTasks: 4, alreadyShownForRun: true }).decision).toBe('skip_already_shown');
  });
});

// проводка в плеере: решение только пока идёт вступление (посреди занятия окно не всплывает), раз на запуск, окно поверх вступления,
// «Попробовать Plus» — тот же пейвол голосового лимита курса (openVoicePlus: premium_modal ai_voice_input / learning_v2_course_voice)
describe('Learning V2 voice heads-up wiring in the direct player', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('node:fs') as typeof import('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('node:path') as typeof import('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_direct_session_player_v1.tsx'), 'utf8').replace(/\r\n/g, '\n');

  it('decides only during the intro, once per run, from local material and the shared voice allowance', () => {
    expect(src).toContain('countLearningV2VoiceTasksV1(material?.learnerChild.interactions ?? [])');
    expect(src).toContain('if (!material || introDone) return;');
    expect(src).toContain('alreadyShownForRun: wasLearningV2VoiceHeadsupShownV1(runId)');
    expect(src).toMatch(/if \(result\.decision !== "show"\) return;\s*markLearningV2VoiceHeadsupShownV1\(runId\);\s*setVoiceHeadsupOpen\(true\);/);
  });

  // владелец 17.10, вариант 1 — шторка снизу (макет 700ad5788 #sheet): микрофон с остатком, счётчик «K из лимита», главная Plus,
  // тихая «Начать всё равно», свайп вниз = «Начать всё равно», без обводок
  it('the sheet follows the approved mockup: mic badge, counter, Plus primary, quiet start, swipe down = start anyway', () => {
    const sheet = fs.readFileSync(path.join(__dirname, '..', 'components', 'learning-v2', 'LearningV2VoiceHeadsupSheet.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(sheet).toContain("title: 'Голоса на весь эпизод не хватит'");
    expect(sheet).toContain('`${copy.today} · ${remaining} ${copy.of} ${limit}`');
    expect(sheet).toMatch(/<Lv2Cta onPress=\{tryPlus\}/);
    expect(sheet).toMatch(/gs\.dy > DISMISS_DISTANCE \|\| gs\.vy > DISMISS_VELOCITY[\s\S]{0,200}startAnywayRef\.current\(\);/);
    expect(sheet).toContain('onRequestClose={startAnyway}');
    expect(sheet).not.toMatch(/borderWidth|borderColor/);
    expect(src).toMatch(/<LearningV2VoiceHeadsupSheet[\s\S]{0,200}limit=\{voiceAllowance\.limit\}/);
  });

  it('the sheet sits over the intro; Plus goes to the course voice paywall, «start anyway» just closes', () => {
    expect(src).toMatch(/<LearningV2VoiceHeadsupSheet\s+visible=\{voiceHeadsupOpen\}/);
    const tryPlus = src.slice(src.indexOf('const voiceHeadsupTryPlus = useCallback('), src.indexOf('const voiceHeadsupStartAnyway'));
    expect(tryPlus).toContain('openVoicePlus();');
    expect(src).toContain('params: { context: "ai_voice_input", source: "learning_v2_course_voice" }');
  });
});
