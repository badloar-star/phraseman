import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('startup image preload contract', () => {
  it('warms primary tab images immediately and secondary images after startup', () => {
    const rootLayoutSource = readProjectFile('app/_layout.tsx');
    const imagePreloadSource = readProjectFile('app/image_preload.ts');
    const primaryStart = imagePreloadSource.indexOf('export const preloadPrimaryTabImages');
    const deferredStart = imagePreloadSource.indexOf('export const preloadDeferredNonPrimaryImages');
    const fullStart = imagePreloadSource.indexOf('export const preloadImages');
    const primarySource = imagePreloadSource.slice(primaryStart, deferredStart);
    const deferredSource = imagePreloadSource.slice(deferredStart, fullStart);

    expect(rootLayoutSource).toContain('preloadPrimaryTabImages');
    expect(rootLayoutSource).toContain('preloadDeferredNonPrimaryImages');
    expect(rootLayoutSource).not.toContain('preloadStartupImages');
    expect(rootLayoutSource).not.toContain('preloadImages().catch');

    expect(primarySource).toContain('CLUB_IMAGES');
    expect(primarySource).toContain('MEDAL_IMAGES');
    expect(primarySource).toContain('FIRST_LESSON_SHEET_IMAGES');
    expect(primarySource).toContain('LESSON_INTRO_CTA_IMAGES');
    expect(primarySource).not.toContain('LEVEL_GIFT_IMAGE_SOURCES');
    expect(primarySource).not.toContain('LEVEL_GIFT_REWARD_ICON_SOURCES');
    expect(primarySource).not.toContain('OSKOLOK_IMAGE_SOURCES');

    expect(deferredSource).toContain('LEVEL_GIFT_IMAGE_SOURCES');
    expect(deferredSource).toContain('LEVEL_GIFT_REWARD_ICON_SOURCES');
    expect(deferredSource).toContain('OSKOLOK_IMAGE_SOURCES');

    expect(deferredSource).not.toContain('CLUB_IMAGES');
    expect(deferredSource).not.toContain('MEDAL_IMAGES');
    expect(deferredSource).not.toContain('FIRST_LESSON_SHEET_IMAGES');
    expect(deferredSource).not.toContain('LESSON_INTRO_CTA_IMAGES');
    expect(imagePreloadSource).not.toContain('ARENA_RANK_IMAGES');
    expect(imagePreloadSource).not.toContain('ARENA_ACTION_IMAGES');
  });
});
