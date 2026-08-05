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
const sagePorcelainBackgroundDir = path.join(backgroundDir, 'sagePorcelain');
const backgroundRegistrySource = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_task_background_art.ts'), 'utf8');
const dailyTasksSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks.ts'), 'utf8');
const nonQuestIconFiles = ['survey.webp'];
const tierCatalogLiteral = dailyTasksSource.match(
  /const DAILY_SETS_TIER1[\s\S]*?const getSetsForPlayerLevel/,
)?.[0] ?? '';
const activeCatalogLiteral = dailyTasksSource.match(
  /const ACTIVE_DAILY_TASK_ROTATION[\s\S]*?const getTodayTasksByLevel/,
)?.[0] ?? '';
const catalogIds = [...new Set(
  [...tierCatalogLiteral.matchAll(/'([a-z][a-z0-9]+)'/g), ...activeCatalogLiteral.matchAll(/'([a-z][a-z0-9]+)'/g)]
    .map((match) => match[1]),
)].sort();
const backgroundFiles = ['lesson.webp', 'practice.webp', 'recall.webp', 'verbs.webp', 'word_trainer.webp', 'words.webp'];

describe('daily task icon coverage', () => {
  it('keeps no legacy type icons beside the separately wired survey icon', () => {
    const files = fs.readdirSync(iconDir).filter((file) => file.endsWith('.webp')).sort();
    expect(files).toEqual(nonQuestIconFiles);
  });

  it('has one explicit generated icon for every retained tier-catalog task id', () => {
    expect(catalogIds).toHaveLength(89);
    expect(catalogIds.length + nonQuestIconFiles.length).toBe(90);
    expect(Object.keys(ACTIVE_DAILY_TASK_ID_ACHIEVEMENT_ICONS).sort()).toEqual(catalogIds);
    expect(fs.readdirSync(activeIconDir).filter((file) => file.endsWith('.webp')).sort())
      .toEqual(catalogIds.map((id) => `${id}.webp`));
  });

  it('keeps every retained catalog icon square, transparent, compressed, and visually unique', async () => {
    const hashes = new Set<string>();
    for (const id of catalogIds) {
      const file = path.join(activeIconDir, `${id}.webp`);
      const meta = await sharp(file).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 256, height: 256, hasAlpha: true });
      expect(fs.statSync(file).size).toBeLessThanOrEqual(20_000);
      hashes.add(createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    }
    const surveyFile = path.join(iconDir, 'survey.webp');
    const surveyMeta = await sharp(surveyFile).metadata();
    expect(surveyMeta).toMatchObject({ format: 'webp', width: 256, height: 256, hasAlpha: true });
    expect(fs.statSync(surveyFile).size).toBeLessThanOrEqual(20_000);
    hashes.add(createHash('sha256').update(fs.readFileSync(surveyFile)).digest('hex'));
    expect(hashes.size).toBe(90);
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

  it('keeps a complete compressed and unique light background set for sagePorcelain', async () => {
    expect(fs.readdirSync(sagePorcelainBackgroundDir).filter((file) => file.endsWith('.webp')).sort())
      .toEqual(backgroundFiles);

    const hashes = new Set<string>();
    for (const name of backgroundFiles) {
      const file = path.join(sagePorcelainBackgroundDir, name);
      const meta = await sharp(file).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: 768, height: 256 });
      expect(fs.statSync(file).size).toBeLessThanOrEqual(80_000);
      hashes.add(createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    }
    expect(hashes.size).toBe(backgroundFiles.length);

    expect(backgroundRegistrySource).toContain("themeMode === 'sagePorcelain'");
    for (const name of backgroundFiles) {
      expect(backgroundRegistrySource).toContain(`daily_task_card_art/sagePorcelain/${name}`);
    }
  });
});
