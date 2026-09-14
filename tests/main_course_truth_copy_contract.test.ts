import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete.tsx'), 'utf8');

describe('main course completion copy is commercially truthful', () => {
  test('does not claim that Plus unlocks lessons or that only three lessons are free', () => {
    expect(source).not.toMatch(/Plus (?:откроет|відкриє|unlocks|abre|libera|mở|membuka|açar|otwiera) (?:все|всі|every|todas|todas as|mọi|semua|tüm|wszystkie) (?:уроки|уроки|lesson|lecciones|lições|bài học|pelajaran|ders|lekcje)/i);
    expect(source).not.toMatch(/3 (?:бесплатных|безкоштовні|free|lecciones gratis|lições grátis|bài miễn phí|pelajaran gratis|ücretsiz ders|darmowe lekcje)/i);
  });

  test('states the free-course truth and real Plus value in every locale record', () => {
    expect(source.match(/32/g)?.length ?? 0).toBeGreaterThanOrEqual(9);
    expect(source).toContain('Все 32 урока остаются бесплатными');
    expect(source).toContain('All 32 lessons remain free');
    expect(source).toContain('Plus снимает паузы энергии');
    expect(source).toContain('Plus removes energy pauses');
  });
});
