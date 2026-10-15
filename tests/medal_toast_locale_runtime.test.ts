import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'components', 'MedalToast.tsx'), 'utf8');

describe('MedalToast planned locale runtime copy', () => {
  it('does not route planned locales through legacy RU/UK/ES branches', () => {
    expect(source).not.toMatch(/\b(lang === 'ru'|lang === 'uk'|lang === 'es')\b/u);
    expect(source).not.toContain('lang ===');
    expect(source).not.toContain('fallback');
  });

  it('has explicit medal labels for planned locales', () => {
    for (const marker of ["'pt-BR'", 'vi:', 'id:', 'tr:', 'pl:']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Medalha de ouro');
    expect(source).toContain('Huy chương vàng');
    expect(source).toContain('Medali emas');
    expect(source).toContain('Altın madalya');
    expect(source).toContain('Złoty medal');
  });

  // зачем (координатор 15.10): кикер тоста МЕДАЛИ писал «НОВЫЙ РАНГ» и путался с рангом за монеты — теперь «НОВАЯ МЕДАЛЬ».
  it('has explicit medal badge labels for planned locales (not «rank»)', () => {
    expect(source).toContain('NOVA MEDALHA');
    expect(source).toContain('HUY CHƯƠNG MỚI');
    expect(source).toContain('MEDALI BARU');
    expect(source).toContain('YENİ MADALYA');
    expect(source).toContain('NOWY MEDAL');
    expect(source).not.toMatch(/НОВЫЙ РАНГ|NEW RANK|NOVO RANK|RANK BARU|YENİ RÜTBE|NOWA RANGA/);
  });

  it('owns a real swipe gesture and exposes an immediate dismiss callback', () => {
    expect(source).toContain('PanResponder.create');
    expect(source).toContain('onDismiss?: () => void');
    expect(source).toContain("pointerEvents={onDismiss ? 'box-none' : 'none'}");
    expect(source).toContain('if (finished) onDismiss()');
    expect(source).not.toContain('Animated.add(');
    expect(source).not.toContain('useNativeDriver: true');
    expect(source).toContain("accessibilityActions={onDismiss ? [{ name: 'dismiss'");
  });
});
