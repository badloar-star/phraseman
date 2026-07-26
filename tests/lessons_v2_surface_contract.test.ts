// зачем: 2026-07-25 владелец заменил старый хекс-макет V2 на лабораторию всех режимов
// Learning V2. Контракт переписан осознанно под новую поверхность: дев-гейт остаётся,
// каталог покрывает ВСЕ семьи активностей, снятый владельцем режим не запускается,
// стили не нарушают запреты владельца (обводки контейнеров, adjustsFontSizeToFit).
import fs from 'node:fs';
import path from 'node:path';

import {
  LAB_MODE_CATALOG,
  labCatalogCoversAllFamilies,
} from '../components/learning-v2-lab/mode_catalog';
import { V2_ACTIVITY_FAMILIES } from '../modules/learning-v2/contracts/activity';
import { buildDemoRound, getDemoUnit, isAssembledCorrect } from '../components/learning-v2-lab/demo_content';

const lessonsSource = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/lessons.tsx'), 'utf8');
const labSource = fs.readFileSync(path.join(process.cwd(), 'components/learning-v2-lab/LearningV2ModesLab.tsx'), 'utf8');
const playerSource = fs.readFileSync(path.join(process.cwd(), 'components/learning-v2-lab/ModeDemoPlayer.tsx'), 'utf8');

describe('lessons V2 modes lab surface', () => {
  test('exposes a dev-gated V2 page wired to the modes lab', () => {
    expect(lessonsSource).toMatch(/ENABLE_DEV_TOOLS/);
    expect(lessonsSource).toMatch(/useState<\s*'lessons'\s*\|\s*'dialogs'\s*\|\s*'v2'/);
    expect(lessonsSource).toMatch(/label="V2"/);
    expect(lessonsSource).toMatch(/LearningV2ModesLab/);
    expect(lessonsSource).not.toMatch(/LessonsV2TabContent/);
  });

  test('catalog covers every activity family exactly once', () => {
    expect(labCatalogCoversAllFamilies()).toBe(true);
    expect(LAB_MODE_CATALOG).toHaveLength(V2_ACTIVITY_FAMILIES.length);
    const removed = LAB_MODE_CATALOG.filter((entry) => entry.removedByOwner);
    expect(removed.map((entry) => entry.family)).toEqual(['describe_scene']);
  });

  test('every launchable mode builds a deterministic demo round', () => {
    for (const entry of LAB_MODE_CATALOG) {
      if (entry.removedByOwner) continue;
      const first = buildDemoRound(entry.family, entry.interaction);
      const second = buildDemoRound(entry.family, entry.interaction);
      expect(second).toEqual(first);
      expect(first.instruction.length).toBeGreaterThan(0);
      expect(first.answer.length).toBeGreaterThan(0);
      if (entry.interaction === 'choice' || entry.interaction === 'listen') {
        expect(first.options.filter((option) => option.correct)).toHaveLength(1);
        expect(first.options.length).toBeGreaterThanOrEqual(3);
      }
      if (entry.interaction === 'assemble') {
        expect(first.tiles.length).toBeGreaterThan(1);
        const restored = first.answer.replace(/[.?!]/g, '').split(' ').filter(Boolean);
        expect([...first.tiles].sort()).toEqual([...restored].sort());
      }
    }
  });

  test('demo unit comes from the real compiler with twelve sessions', () => {
    const unit = getDemoUnit();
    expect(unit.sessions).toHaveLength(12);
    expect(unit.episodeId).toBe('ep-01');
  });

  test('assemble check normalizes case and punctuation but not word order', () => {
    expect(isAssembledCorrect(['i', 'am', 'anna'], 'I am Anna.')).toBe(true);
    expect(isAssembledCorrect(['am', 'i', 'anna'], 'I am Anna.')).toBe(false);
  });

  test('lab styling respects owner bans', () => {
    for (const source of [labSource, playerSource]) {
      expect(source).not.toMatch(/adjustsFontSizeToFit/);
      // Обводки контейнеров запрещены; разделитель одной стороны разрешён.
      expect(source).not.toMatch(/(?<!Bottom)borderWidth/);
      expect(source).not.toMatch(/(?<!borderBottom)borderColor/);
    }
    expect(playerSource).toMatch(/useRuntimeActive/);
  });
});
