import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_data_17_24.ts'), 'utf8');

function lessonSourceBlock(lessonId: number): string {
  const match = source.match(
    new RegExp(`export const LESSON_${lessonId}_PHRASES:[\\s\\S]*?= \\[([\\s\\S]*?)\\n\\];`),
  );
  if (!match) {
    throw new Error(`LESSON_${lessonId}_PHRASES block not found`);
  }
  return match[1];
}

function phraseIds(lessonId: number): number[] {
  const idRegex = new RegExp(`id:\\s*['"]lesson${lessonId}_phrase_(\\d+)['"]`, 'g');
  return Array.from(lessonSourceBlock(lessonId).matchAll(idRegex), (match) => Number(match[1]));
}

describe('lesson 17-24 phrase source counts', () => {
  it('keeps each lesson at 50 playable source phrases', () => {
    for (let lessonId = 17; lessonId <= 24; lessonId += 1) {
      const ids = phraseIds(lessonId);
      expect(ids).toHaveLength(50);
      expect(new Set(ids).size).toBe(50);
    }
  });
});
