import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav statistics trainer target isolation', () => {
  it('keeps trainer due counts target-scoped inside otherwise shared statistics surfaces', () => {
    const statsCache = fs.readFileSync(path.join(ROOT, 'app', 'statsCache.ts'), 'utf8');
    const streakStats = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');
    const trainerStore = fs.readFileSync(path.join(ROOT, 'app', 'trainer_store.ts'), 'utf8');
    const trainerSmartSession = fs.readFileSync(path.join(ROOT, 'app', 'trainer_smart_session.tsx'), 'utf8');
    const posWorkoutEngine = fs.readFileSync(path.join(ROOT, 'app', 'pos_workout_engine.ts'), 'utf8');

    expect(statsCache).toContain("import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys'");
    expect(statsCache).toContain('studyTarget: StatsCacheStudyTarget');
    expect(statsCache).toContain('getStatsCache(studyTarget?: RuntimeStudyTarget)');
    expect(statsCache).toContain('trainerPracticeDue: 0');
    expect(statsCache).toContain('buildFreshStatsSnapshot(studyTarget?: RuntimeStudyTarget)');
    expect(statsCache).toContain('getTrainerCounts(target)');
    expect(statsCache).toContain('refreshStatsCache(studyTarget?: RuntimeStudyTarget)');
    expect(statsCache).toContain('preloadStats(studyTarget?: RuntimeStudyTarget)');
    expect(statsCache).not.toContain('getTrainerCounts(),');

    expect(streakStats).toContain("import { useStudyTarget } from '../components/StudyTargetContext'");
    expect(streakStats).toContain('const { studyTarget } = useStudyTarget()');
    expect(streakStats).toContain('const _sc = getStatsCache(studyTarget)');
    expect(streakStats).toContain('const cachedSnapshot = getStatsCache(studyTarget)');
    expect(streakStats).toContain('refreshStatsCache(studyTarget)');

    expect(home).toContain('getTrainerTotalDue(studyTarget)');
    expect(trainerStore).toContain('getPosMasterySnapshot(studyTarget)');
    expect(trainerSmartSession).toContain('recordPosWorkoutResult(current.category, correct, studyTarget)');
    expect(posWorkoutEngine).toContain("import { posMasteryKey, type RuntimeStudyTarget } from './target_storage_keys'");
  });
});
