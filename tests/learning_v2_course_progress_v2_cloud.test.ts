// Прогресс v2, облачная часть (координатор 22.10, ревью 1 · ЯДРО): маски едут в той же записи синка, слияние — только ИЛИ;
// старое число «пройдено подряд» — своим правилом максимума; локальные маски — данные аккаунта (стираются и переносятся).
describe('progress v2: cloud sync record', () => {
  it('cloud: masks ride in the same sync record with OR merge; the old number keeps its own max merge', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const sync = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    const keysBlock = sync.slice(sync.indexOf('export const SYNC_KEYS = ['), sync.indexOf('] as const;', sync.indexOf('export const SYNC_KEYS = [')));
    expect(keysBlock).toContain('LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1,');
    expect(keysBlock).toContain('LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1,');
    expect(sync).toContain('[LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1]: (localRaw, cloudRaw) => mergeCourseMasksRestoreValueV1(');
    expect(sync).toContain('[LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1]: mergeCourseProgressSyncRestoreValueV1,');
    // локальные маски — данные аккаунта: стираются и переносятся вместе с цепочкой
    expect(sync).toContain("'learning-v2:course-local-progress:masks:v1:',");
  });

});
