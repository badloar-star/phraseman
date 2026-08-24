import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'max_call_prestart.tsx'),
  'utf8',
);

describe('MAX prestart ready gate', () => {
  it('enables Start only after premint is ready and minutes remain', () => {
    expect(source).toContain(
      "const startReady = prepState === 'ready' && !noMinutesLeft && (!isTutor || maxLessonEnergyReady);",
    );
    expect(source).not.toContain(
      "const startReady = prepState !== 'failed' && !noMinutesLeft;",
    );
  });

  it('shows the prefetched lesson mission instead of a disabled tutor CTA while preparing', () => {
    expect(source).toContain(
      "import MaxLessonMissionPlaque from '../components/max/MaxLessonMissionPlaque';",
    );
    expect(source).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion';");
    expect(source).toContain('const reduceMotion = useReduceMotion();');
    expect(source).toContain("prepState === 'preparing' ? (");
    expect(source).toContain('<MaxLessonMissionPlaque');
    expect(source).toContain('mission={activeTutorPreview.outcome}');
    expect(source).toContain('reduceMotion={reduceMotion}');
    expect(source).toContain("prepState === 'ready' && !noMinutesLeft");
  });

  it('does not present the MAX call count as a numbered course lesson', () => {
    expect(source).not.toContain('activeTutorPreview.lessonOrdinal');
  });

  it('hides redundant ready copy while preserving preparation failures', () => {
    expect(source).not.toContain("ru: 'Можно начинать'");
    expect(source).toContain("prepState === 'failed' ? (");
    expect(source).toContain("maxVoiceFailureMessage(preflightReason ?? 'preflight_failed', lang)");
  });
});
