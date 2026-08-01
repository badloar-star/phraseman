import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import {
  ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS,
} from '../app/daily_task_achievement_icons';

const iconDir = path.join(__dirname, '..', 'assets', 'images', 'daily_task_icons');
const activeIconDir = path.join(iconDir, 'by_id');
const backgroundDir = path.join(__dirname, '..', 'assets', 'images', 'daily_task_card_art');
const dailyTasksSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks.ts'), 'utf8');
const nonQuestIconFiles = ['survey.webp'];
const rotationLiteral = dailyTasksSource.match(
  /const ACTIVE_DAILY_TASK_ROTATION[\s\S]*?= \[([\s\S]*?)\n\];/,
)?.[1] ?? '';
const rerollLiteral = dailyTasksSource.match(
  /const ACTIVE_DAILY_REROLL_TASK_IDS = new Set\(\[\.\.\.ACTIVE_DAILY_TASK_IDS,([\s\S]*?)\]\);/,
)?.[1] ?? '';
const activeIds = [...new Set(
  [...rotationLiteral.matchAll(/'([a-z0-9]+)'/g), ...rerollLiteral.matchAll(/'([a-z0-9]+)'/g)]
    .map((match) => match[1]),
)].sort();
const backgroundFiles = ['lesson.webp', 'practice.webp', 'recall.webp', 'verbs.webp', 'word_trainer.webp', 'words.webp'];

describe('daily task icon coverage', () => {
  it('keeps no legacy type icons beside the separately wired survey icon', () => {
    const files = fs.readdirSync(iconDir).filter((file) => file.endsWith('.webp')).sort();
    expect(files).toEqual(nonQuestIconFiles);
  });

  it('has one explicit generated icon for every current rotation and reroll-only task id', () => {
    expect(Object.keys(ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS).sort()).toEqual(activeIds);
    expect(fs.readdirSync(activeIconDir).filter((file) => file.endsWith('.webp')).sort())
      .toEqual(activeIds.map((id) => `${id}.webp`));
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
