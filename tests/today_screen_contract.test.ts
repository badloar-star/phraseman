import fs from 'node:fs';
import path from 'node:path';

const screenPath = path.join(process.cwd(), 'components/today/TodayScreen.tsx');
const compassPath = path.join(process.cwd(), 'components/today/TodayAmbientCompass.tsx');

describe('Today screen contract', () => {
  test('keeps Today swipe-only and its compass decorative', () => {
    const screen = fs.readFileSync(screenPath, 'utf8');
    const compass = fs.readFileSync(compassPath, 'utf8');

    expect(screen).toContain('today-primary-cta');
    expect(screen).toContain('today-recommendation');
    expect(screen).not.toMatch(/from ['"]\.\.\/\.\.\/app\/compass\//);
    expect(`${screen}\n${compass}`).not.toMatch(/expo-location|DeviceMotion|Magnetometer|request.*Permission/i);
  });

  test('gates the breathing loop behind runtime ownership and reduced motion', () => {
    const compass = fs.readFileSync(compassPath, 'utf8');
    expect(compass).toContain('active && !reduceMotion');
    expect(compass).toContain('useRuntimeActive(ownerVisible)');
    expect(compass).toContain('cancelAnimation');
  });

  test('matches the approved immersive compass hierarchy', () => {
    const screen = fs.readFileSync(screenPath, 'utf8');
    const compass = fs.readFileSync(compassPath, 'utf8');

    expect(screen).toContain('today-date');
    expect(screen).toContain('today-heading');
    expect(screen).toContain('today-direction');
    expect(screen).toContain('today-resume-title');
    expect(screen).toContain('today-resume-meta');
    expect(screen).toContain('today-progress-summary');
    expect(screen).toContain('today-metrics');
    expect(screen).toContain('today-recommendation');
    expect(screen).not.toContain('LinearGradient');
    expect(screen).not.toContain('ctaArrow');
    expect(compass).toContain('entryEpoch');
    expect(compass).toContain('withSequence');
    expect(compass).toContain('withRepeat');
    expect(compass).toContain('OUTER_RING_SIZE = 164');
    expect(compass).toContain('INNER_RING_SIZE = 116');
    expect(compass).toContain('CORE_SIZE = 70');
  });

  test('shows canonical daily totals and records completed lessons', () => {
    const screen = fs.readFileSync(screenPath, 'utf8');
    const lesson = fs.readFileSync(path.join(process.cwd(), 'app/lesson1.tsx'), 'utf8');

    expect(screen).toContain("import('../../app/activity_365_analytics')");
    expect(screen).toContain('loadActivity365Analytics(studyTarget)');
    expect(screen).toContain('selectTodayMetricsFromActivity');
    expect(screen).not.toContain("value === null ? '—'");
    expect(lesson).toContain("bumpStatsDaily('lessons_completed', 1, studyTargetRef.current)");
  });

  test('keeps user-facing Today sources valid UTF-8 without mojibake markers', () => {
    const sources = [
      fs.readFileSync(screenPath, 'utf8'),
      fs.readFileSync(path.join(process.cwd(), 'lib/today/fallback.ts'), 'utf8'),
      fs.readFileSync(path.join(process.cwd(), 'lib/today/recommendation_catalog.ts'), 'utf8'),
    ].join('\n');
    const suspicious = [String.fromCharCode(0xfffd), String.fromCharCode(0x00d0), String.fromCharCode(0x00d1), `${String.fromCharCode(0x00c2)}${String.fromCharCode(0x00b7)}`];
    expect(suspicious.filter((marker) => sources.includes(marker))).toEqual([]);
  });
});
