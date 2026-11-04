// зачем (Волна 2, пункт 18; владелец одобрил 04.11): статичные скелетоны каталога, «Мои наборы» и «Из видео» дышат ОДНИМ общим пульсом на группу
// (opacity на нативном драйвере, reduce-motion — статично), без анимации на каждой строке и без смены геометрии.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('общий пульс скелетонов группой', () => {
  const pulse = read('components/feedback/SkeletonPulse.tsx');
  it('пульс: только opacity, нативный драйвер, reduce-motion без движения, остановка при размонтировании', () => {
    expect(pulse).toContain('useNativeDriver: true');
    expect(pulse).toContain('useSystemReduceMotion');
    expect(pulse).toMatch(/if \(reduceMotion\) \{\s*opacity\.setValue\(1\)/);
    expect(pulse).toContain('opacity.stopAnimation()');
    expect(pulse).not.toMatch(/\b(width|height|margin|padding|scale|translate)\w*\s*:/);
  });
  it('три скелетона обёрнуты в SkeletonPulse (одна анимация на группу)', () => {
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toContain('<SkeletonPulse testID="flashcards-community-skeleton"');
    expect(read('app/flashcards/MyPacksV2.tsx')).toContain('<SkeletonPulse testID="fc-my-packs-loading"');
    expect(read('app/flashcards_video_packs.tsx')).toContain('<SkeletonPulse style={embedded ?');
  });
  it('каждый SkeletonPulse закрыт и строки скелетона не получили собственной анимации', () => {
    for (const rel of ['app/flashcards/FlashcardsCategoryHub.tsx', 'app/flashcards/MyPacksV2.tsx', 'app/flashcards_video_packs.tsx']) {
      const src = read(rel);
      expect((src.match(/<SkeletonPulse/g) ?? []).length).toBe((src.match(/<\/SkeletonPulse>/g) ?? []).length);
    }
  });
});
