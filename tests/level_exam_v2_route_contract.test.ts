import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('level exam v2 route contract', () => {
  it('routes English exams through the new engine while preserving the gated French runtime', () => {
    const route = read('app/level_exam.tsx');
    expect(route).toContain('<LevelExamV2');
    expect(route).toContain('if (!isFrenchExam && !frenchExamBlocked)');
    expect(route).toContain('loadFrenchRemoteLevelExamQuestions');
  });

  it('connects persisted attempts, wall-clock timeout, scoring, and every UI format', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    expect(route).toContain('buildLevelExamBlueprint');
    expect(route).toContain('loadActiveLevelExamAttempt');
    expect(route).toContain('persistActiveLevelExamAttempt');
    expect(route).toContain('restoreLevelExamAttempt');
    expect(route).toContain('remainingLevelExamMs');
    expect(route).toContain("finishExam('timeout')");
    expect(route).toContain('scoreLevelExam');
    expect(route).toContain('<ContextChoiceQuestion');
    expect(route).toContain('<PhraseBuilderQuestion');
    expect(route).not.toContain('MeaningChoiceQuestion');
    expect(route).toContain("task.format === 'guess_phrase' || task.format === 'fill_gap' || task.format === 'find_oddity'");
    expect(route).toContain("task.format === 'translate_build'");
    expect(route).not.toContain('<SpotErrorQuestion');
    expect(route).toContain('<SpeedMatchQuestion');
  });

  it('removes immediate correctness reveals and makes every attempt exactly 30 scored units', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    expect(route).not.toContain('showAnswer');
    expect(route).not.toContain('isOptCorrect');
    expect(route).toContain('scoredUnitIds.length !== 30');
  });

  it('opens directly on the intro without a separate preparation screen', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    expect(route).not.toContain('Готовим экзамен');
    expect(route).toContain("const showIntro = accessState === 'checking' || phase === 'loading' || phase === 'intro'");
  });

  it('validates exam content before it can debit energy and gates unavailable locales visibly', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    const start = route.indexOf('const startExam');
    const build = route.indexOf('buildLevelExamBlueprint', start);
    const debit = route.indexOf('await spendAmount(ENERGY_COST)', start);
    expect(build).toBeGreaterThan(start);
    expect(debit).toBeGreaterThan(build);
    expect(route).toContain('setContentUnavailable(true)');
    expect(route).toContain('Энергия не списана');
  });

  it('never shows or debits exam energy for a verified Plus account', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    const legacyRoute = read('app/level_exam.tsx');
    const intro = read('components/level-exam/LevelExamIntro.tsx');
    expect(route).toContain('const unlimitedEnergy = isUnlimited || hasPremiumAccess');
    expect(route).toContain('if (!unlimitedEnergy && !await spendAmount(ENERGY_COST))');
    expect(route).toContain('unlimitedEnergy={unlimitedEnergy}');
    expect(intro).toContain('{!unlimitedEnergy ? <View style={[styles.energyPill');
    expect(intro).toContain('{!unlimitedEnergy ? <View style={styles.costBadge}>');
    expect(intro).toContain("? copy.startCta");
    expect(legacyRoute).toContain("import { usePremium } from '../components/PremiumContext'");
    expect(legacyRoute).toContain('const { hasPremiumAccess } = usePremium()');
    expect(legacyRoute).toContain('const examEnergyUnlimited = energyUnlimited || hasPremiumAccess');
  });

  it('keeps local 1/0 writers compatible while accepting cloud true flags', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    const legacyRoute = read('app/level_exam.tsx');
    expect(route).toContain("storedProgressFlagIsTrue(previousPassed) || scored.passed ? '1' : '0'");
    expect(route).toContain('const firstPass = !storedProgressFlagIsTrue(previousPassed)');
    expect(route).not.toContain("previousPassed !== '1'");
    expect(legacyRoute).toContain("passed ? '1' : '0'");
  });

  it('reads lesson boundaries from the canonical course map', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    expect(route).toContain('getFirstLessonForLevel(level)');
    expect(route).toContain('getLastLessonForLevel(level)');
    expect(route).not.toContain("level === 'A1' ? 1 : level === 'A2' ? 13");
  });
});
