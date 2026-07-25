import fs from 'fs';
import path from 'path';
import {
  EMPTY_OVERLAY_WANTS,
  FORCE_EVICTABLE_KEYS,
  NATIVE_MODAL_KEYS,
  OVERLAY_PRIORITY,
  resolveNextOverlay,
} from '../components/overlay_arbiter_core';

const ROOT = path.join(__dirname, '..');

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function rel(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('collectible drop overlay contract', () => {
  it('classifies collectibleDrop as a protected native reward modal', () => {
    expect(OVERLAY_PRIORITY).toContain('collectibleDrop');
    expect(EMPTY_OVERLAY_WANTS.collectibleDrop).toBe(false);
    expect(NATIVE_MODAL_KEYS.has('collectibleDrop')).toBe(true);
    expect(FORCE_EVICTABLE_KEYS.has('collectibleDrop')).toBe(false);
  });

  it('slots collectibleDrop after completion/rating modals but before transient toasts', () => {
    expect(resolveNextOverlay(null, { lessonCompleteNotif: true, collectibleDrop: true })).toBe('lessonCompleteNotif');
    expect(resolveNextOverlay(null, { arenaRoomConfirm: true, collectibleDrop: true })).toBe('arenaRoomConfirm');
    expect(resolveNextOverlay(null, { collectibleDrop: true, shardsEarned: true })).toBe('collectibleDrop');
    expect(resolveNextOverlay(null, { collectibleDrop: true, achievementToast: true })).toBe('collectibleDrop');
  });

  it('gates every production CollectibleDropModal renderer through OverlayArbiter', () => {
    // app/arena_results.tsx был удалён вместе с ареной; единственный
    // продакшен-рендерер дропа — экран завершения урока.
    for (const relativePath of ['app/lesson_complete.tsx']) {
      const source = read(relativePath);
      expect(source).toContain("useOverlayVisible('collectibleDrop', shownCardDrop != null)");
      expect(source).toContain('outcome={collectibleDropVisible ? shownCardDrop : null}');
    }
  });

  it('does not add unarbitrated production CollectibleDropModal renderers elsewhere', () => {
    const scannedFiles = [
      ...walkFiles(path.join(ROOT, 'app')),
      ...walkFiles(path.join(ROOT, 'components')),
    ];
    const renderers = scannedFiles
      .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('<CollectibleDropModal'))
      .map(rel)
      .sort();

    expect(renderers).toEqual([
      'app/lesson_complete.tsx',
      'components/admin_panel/sections/CollectibleDropModalsSection.tsx',
      'components/admin_panel/sections/UxOverhaulModalsSection.tsx',
    ].sort());
  });
});
