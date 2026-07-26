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
    // app/arena_results.tsx был удалён вместе с ареной. Экран завершения урока
    // держит своё имя состояния (shownCardDrop); остальные точки дропа —
    // турнир, словарь, неправильные глаголы, предлоги — используют cardDrop.
    const source = read('app/lesson_complete.tsx');
    expect(source).toContain("useOverlayVisible('collectibleDrop', shownCardDrop != null)");
    expect(source).toContain('outcome={collectibleDropVisible ? shownCardDrop : null}');

    for (const relativePath of [
      'app/tournament_results.tsx',
      'app/lesson_words.tsx',
      'app/lesson_irregular_verbs.tsx',
      'app/preposition_drill.tsx',
    ]) {
      const screen = read(relativePath);
      expect(screen).toContain("useOverlayVisible('collectibleDrop', cardDrop != null)");
      expect(screen).toContain('outcome={cardDropVisible ? cardDrop : null}');
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
      'app/lesson_irregular_verbs.tsx',
      'app/lesson_words.tsx',
      'app/preposition_drill.tsx',
      'app/tournament_results.tsx',
      'components/admin_panel/sections/CollectibleDropModalsSection.tsx',
      'components/admin_panel/sections/UxOverhaulModalsSection.tsx',
    ].sort());
  });

  it('rolls each new drop point once per closed section, not per day', () => {
    // Турнир/словарь/глаголы/предлоги закрываются один раз — dailyScoped:false,
    // иначе один и тот же раздел давал бы карточку каждый день заново.
    const points: Array<[string, string]> = [
      ['app/tournament_results.tsx', "maybeRollCollectibleDrop('tournament'"],
      ['app/lesson_words.tsx', "maybeRollCollectibleDrop('vocab'"],
      ['app/lesson_irregular_verbs.tsx', "maybeRollCollectibleDrop('verbs'"],
      ['app/preposition_drill.tsx', "maybeRollCollectibleDrop('prep'"],
    ];
    for (const [relativePath, call] of points) {
      const source = read(relativePath);
      expect(source).toContain(call);
      const callIndex = source.indexOf(call);
      expect(source.slice(callIndex, callIndex + 220)).toContain('dailyScoped: false');
    }
  });
});
