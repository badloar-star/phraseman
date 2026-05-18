import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

import { ALL_TASKS } from '../app/daily_tasks';
import { DAILY_TASK_ID_ACHIEVEMENT_ICONS } from '../app/daily_task_achievement_icons';

describe('daily task artwork coverage', () => {
  it('has an id-specific achievement icon for every production daily task', () => {
    const productionIds = ALL_TASKS.map((task) => task.id).sort();
    const iconIds = Object.keys(DAILY_TASK_ID_ACHIEVEMENT_ICONS).sort();

    expect(iconIds).toEqual(productionIds);
  });

  it('has a concrete webp asset file for every daily task icon id', () => {
    const iconDir = path.join(__dirname, '..', 'assets', 'images', 'daily_task_icons', 'by_id');
    const missingFiles = ALL_TASKS
      .map((task) => task.id)
      .filter((id) => !fs.existsSync(path.join(iconDir, `${id}.webp`)));

    expect(missingFiles).toEqual([]);
  });

  it('keeps daily task icon files transparent and consistently sized', async () => {
    const iconDir = path.join(__dirname, '..', 'assets', 'images', 'daily_task_icons', 'by_id');
    const invalidFiles = await Promise.all(
      ALL_TASKS.map(async (task) => {
        const meta = await sharp(path.join(iconDir, `${task.id}.webp`)).metadata();
        return meta.width === 256 && meta.height === 256 && meta.hasAlpha ? null : task.id;
      }),
    );

    expect(invalidFiles.filter(Boolean)).toEqual([]);
  });
});
