// зачем (Макеты 13.10, paywalls-013): с 10.10 V2Pressable ставил `[style, { opacity }]` — прозрачность нажатия (1) перекрывала
// `opacity` из стиля, и «недоступные» кнопки (× и «Восстановить» во время оплаты, использованные слова Шпиля) не гасли.
// Анимации в тестовой среде подменены, поэтому проверяем чистый расчёт и то, что слой кнопки берёт именно его.
import fs from 'node:fs';
import path from 'node:path';

import { v2PressableStyleOpacity } from '../components/v2/V2Pressable';

describe('V2Pressable: прозрачность из стиля', () => {
  it('приглушение из стиля (в том числе в массиве стилей) берётся как есть', () => {
    expect(v2PressableStyleOpacity({ opacity: 0.4 })).toBe(0.4);
    expect(v2PressableStyleOpacity([{ padding: 4 }, { opacity: 0.3 }])).toBe(0.3);
    expect(v2PressableStyleOpacity([{ opacity: 0.3 }, null, false])).toBe(0.3);
  });

  it('без своей прозрачности, 1 или мусор — слой полностью видим', () => {
    expect(v2PressableStyleOpacity(undefined)).toBe(1);
    expect(v2PressableStyleOpacity({ padding: 4 })).toBe(1);
    expect(v2PressableStyleOpacity({ opacity: 1 })).toBe(1);
    expect(v2PressableStyleOpacity({ opacity: -1 })).toBe(1);
  });

  it('слой, что сжимается, умножает прозрачность стиля на прозрачность нажатия, а не затирает её', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'v2', 'V2Pressable.tsx'), 'utf8');
    expect(src).toContain('Animated.multiply(opacity, baseOpacity)');
    expect(src).toContain('{ opacity: layerOpacity, transform: [{ scale }] }');
    expect(src).not.toContain('<Animated.View style={[style, { opacity, transform');
  });
});
