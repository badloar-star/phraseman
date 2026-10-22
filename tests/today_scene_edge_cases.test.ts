// зачем (2 · ДИЗАЙН 22.10, scenes-edge-cases; координатор): «Сегодня» на крупном системном шрифте и в длинных языках — межстрочный растёт, кнопка и подпись переносятся, кольца-герой вписаны в слот, а не заезжают под текст.
import { readSource } from './helpers/read_source';

const src = readSource('components/home/v2/today_scene/TodaySceneView.tsx');

describe('TodaySceneView: крайние случаи', () => {
  it('межстрочный масштабируется вместе с системным шрифтом', () => {
    expect(src).toContain('useScaledTextStyles(baseStyles)');
  });
  it('кнопка: minHeight вместо height 54, название задания переносится', () => {
    expect(src).toMatch(/cta: \{[^}]*minHeight: 50/); // вариант 2 scenes-compact (владелец 22.10)
    expect(src).not.toMatch(/cta: \{[^}]*\bheight: 54/);
    expect(src).not.toMatch(/ctaText\}\s+numberOfLines/);
    expect(src).toContain('<Text style={s.ctaText}>');
  });
  it('подпись строки — до 2 строк', () => {
    expect(src).toMatch(/s\.rowSub[^>]*numberOfLines=\{2\}/);
  });
  it('кольца-герой на крупном шрифте стоят во flex-слоте, масштаб ≤ 1', () => {
    expect(src).toContain('TODAY_HERO_BOUND_FONT_SCALE');
    expect(src).toMatch(/heroSlot: \{ flex: 1/);
    expect(src).toContain('Math.min(1, slotH / HERO_SIZE)');
  });
  it('шрифт не сжимается', () => {
    expect(src).not.toContain('adjustsFontSizeToFit');
  });
});
