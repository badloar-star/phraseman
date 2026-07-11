import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LEDGER = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'docs', 'reports', 'borderless_surface_inventory.json'), 'utf8'),
) as {
  entries: Array<{
    id: string;
    category: string;
    status: string;
    scanState: string;
    reason: string;
  }>;
};

const SETTINGS_TARGET_IDS = [
  'surface:app-tabs-settings:l:11',
  'surface:app-tabs-settings:l:12',
  'surface:app-tabs-settings:l:4',
  'surface:app-tabs-settings:l:6',
  'surface:app-tabs-settings:l:7',
  'surface:app-tabs-settings:l:8',
  'surface:app-tabs-settings:l:9',
  'surface:app-tabs-settings:settings-language-row:1',
] as const;

const FRIENDS_TARGET_IDS = [
  'surface:app-tabs-friends:requestrow:2',
  'surface:app-tabs-friends:friends-found-user-card:1',
  'surface:app-tabs-friends:l:4',
  'surface:app-tabs-friends:contentcontainerstyle:1',
  'surface:app-tabs-friends:friends-open-referrals:1',
  'surface:app-tabs-friends:friends-empty-enter-code:1',
  'surface:app-tabs-friends:friendstabscreen:3',
  'surface:app-tabs-friends:friendstabscreen:4',
] as const;

const LESSONS_TARGET_IDS = [
  'surface:app-tabs-lessons:lessonstab:1',
] as const;

const HOME_TARGET_IDS = [
  'surface:app-tabs-home:homescreen:6',
  'surface:app-tabs-home:homescreen:9',
  'surface:app-tabs-home:homescreen:15',
  'surface:app-tabs-home:homescreen:16',
  'surface:app-tabs-home:home-open-trainer:2',
  'surface:app-tabs-home:homescreen:19',
  'surface:app-tabs-home:screen-home:1',
  'surface:app-tabs-home:homescreen:23',
] as const;

const QUIZZES_TARGET_IDS = [
  'surface:app-tabs-quizzes:basequizlevelcard:1',
  'surface:app-tabs-quizzes:basequizlevelcard:2',
  'surface:app-tabs-quizzes:basequizlevelcard:3',
  'surface:app-tabs-quizzes:levelselect:2',
  'surface:app-tabs-quizzes:personal-plan-quiz-instruction:1',
  'surface:app-tabs-quizzes:quiz-explain-retry-button:1',
  'surface:app-tabs-quizzes:quiz-game-screen:2',
  'surface:app-tabs-quizzes:quiz-level-select-settings:1',
  'surface:app-tabs-quizzes:quizcardlogoimagewithfallback:1',
  'surface:app-tabs-quizzes:quizgame:1',
  'surface:app-tabs-quizzes:quizgame:10',
  'surface:app-tabs-quizzes:quizgame:13',
  'surface:app-tabs-quizzes:quizgame:14',
  'surface:app-tabs-quizzes:quizgame:16',
  'surface:app-tabs-quizzes:quizgame:2',
  'surface:app-tabs-quizzes:quizgame:3',
  'surface:app-tabs-quizzes:quizgame:4',
  'surface:app-tabs-quizzes:quizgame:6',
  'surface:app-tabs-quizzes:quizgame:7',
  'surface:app-tabs-quizzes:thematicquizlevelcard:1',
  'surface:app-tabs-quizzes:thematicquizlevelcard:2',
  'surface:app-tabs-quizzes:thematicquizlevelcard:3',
] as const;

const TAB_LAYOUT_TARGET_IDS = [
  'surface:app-tabs-layout:tabactivepill:1',
  'surface:app-tabs-layout:tabpill:1',
] as const;

function expectMigrated(ids: readonly string[]): void {
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    const row = LEDGER.entries.find((entry) => entry.id === id);
    expect(row).toBeDefined();
    expect(row?.category).toBe('MIGRATE');
    expect(row?.status).toBe('migrated');
    expect(row?.scanState).toBe('missing');
    expect(row?.reason).toBeTruthy();
  }
}

describe('main tabs borderless production surfaces', () => {
  it('migrates the reviewed Settings containers', () => {
    expectMigrated(SETTINGS_TARGET_IDS);
  });

  it('migrates the reviewed Friends containers', () => {
    expectMigrated(FRIENDS_TARGET_IDS);
  });

  it('migrates the reviewed Lessons containers', () => {
    expectMigrated(LESSONS_TARGET_IDS);
  });

  it('migrates the reviewed Home containers', () => {
    expectMigrated(HOME_TARGET_IDS);
  });

  it('migrates the reviewed Quizzes containers', () => {
    expectMigrated(QUIZZES_TARGET_IDS);
  });

  it('migrates the reviewed tab shell containers', () => {
    expectMigrated(TAB_LAYOUT_TARGET_IDS);
  });
});
