import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import {
  ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS,
  DAILY_TASK_ACHIEVEMENT_ICONS,
} from '../app/daily_task_achievement_icons';

const iconDir = path.join(__dirname, '..', 'assets', 'images', 'daily_task_icons');
const activeIconDir = path.join(iconDir, 'by_id');
const backgroundDir = path.join(__dirname, '..', 'assets', 'images', 'daily_task_card_art');
const fallbackTypes = Object.keys(DAILY_TASK_ACHIEVEMENT_ICONS).sort();
const activeIds = ['da1', 'ra1', 'ra2', 'tp1', 'tp2', 'tw1', 'tw2', 'vl1', 'wl1'];
const backgroundFiles = ['lesson.webp', 'practice.webp', 'recall.webp', 'verbs.webp', 'word_trainer.webp', 'words.webp'];

describe('daily task icon coverage', () => {
  it('has exactly one concrete WebP file for every wired legacy type fallback', () => {
    const files = fs.readdirSync(iconDir).filter((file) => file.endsWith('.webp')).sort();
    expect(files).toEqual(fallbackTypes.map((type) => `${type}.webp`).sort());
  });

  it('has one explicit generated icon for every current rotation and reroll-only task id', () => {
    expect(Object.keys(ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS).sort()).toEqual(activeIds);
    expect(fs.readdirSync(activeIconDir).filter((file) => file.endsWith('.webp')).sort())
      .toEqual(activeIds.map((id) => `${id}.webp`));
  });

  it('keeps every bundled icon square, transparent, and aggressively compressed', async () => {
    const invalidFiles = await Promise.all(fallbackTypes.map(async (type) => {
      const file = path.join(iconDir, `${type}.webp`);
      const meta = await sharp(file).metadata();
      const bytes = fs.statSync(file).size;
      return meta.format === 'webp' && meta.width === 256 && meta.height === 256 && meta.hasAlpha && bytes <= 20_000
        ? null
        : type;
    }));

    expect(invalidFiles.filter(Boolean)).toEqual([]);
  });

  it('uses a distinct final image for every task type', () => {
    const hashes = fallbackTypes.map((type) => createHash('sha256')
      .update(fs.readFileSync(path.join(iconDir, `${type}.webp`)))
      .digest('hex'));

    expect(new Set(hashes).size).toBe(fallbackTypes.length);
  });

  it('keeps every active id icon square, transparent, compressed, and visually unique', async () => {
    const hashes = new Set<string>();
    for (const id of activeIds) {
      const file = path.join(activeIconDir, `${id}.webp`);
      const meta = await sharp(file).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 256, height: 256, hasAlpha: true });
      expect(fs.statSync(file).size).toBeLessThanOrEqual(20_000);
      hashes.add(createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    }
    expect(hashes.size).toBe(activeIds.length);
  });

  it('preserves the six original category backgrounds unchanged in shape and size', async () => {
    expect(fs.readdirSync(backgroundDir).filter((file) => file.endsWith('.webp')).sort()).toEqual(backgroundFiles);
    for (const name of backgroundFiles) {
      const file = path.join(backgroundDir, name);
      const meta = await sharp(file).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 768, height: 256 });
      expect(fs.statSync(file).size).toBeLessThanOrEqual(8_000);
    }
  });
});
