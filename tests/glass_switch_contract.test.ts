// зачем (слово владельца, волна UX 2, 04.11): один общий переключатель с хаптиком на тап, плавным бегунком на UI-потоке и Reduce Motion; экраны берут его, а не самодельные дорожки.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('GlassSwitch — общий переключатель', () => {
  const src = read('components/settings/GlassSwitch.tsx');

  it('тумблер — управляющий элемент: хаптик на тап', () => {
    expect(src).toContain('onPress={() => { hapticTap(); onValueChange(!value); }}');
  });

  it('Reduce Motion: при включённом — без анимации; анимация на UI-потоке (Reanimated), без setState', () => {
    expect(src).toContain('useReduceMotion');
    expect(src).toContain('reduce ? target : withTiming(');
    expect(src).toMatch(/useAnimatedStyle/);
    expect(src).not.toMatch(/useState|setInterval|requestAnimationFrame/);
  });

  it('цвета из токенов темы (switch_chrome), без обводок', () => {
    expect(src).toContain("from './switch_chrome'");
    expect(src).not.toMatch(/borderWidth|borderColor/);
  });

  it('два экрана используют общий GlassSwitch; самодельной дорожки больше нет', () => {
    for (const f of ['app/settings_notifications.tsx', 'app/privacy_settings.tsx']) {
      const s = read(f);
      expect(s).toContain("from '../components/settings/GlassSwitch'");
      expect(s).toContain('return <GlassSwitch {...');
      expect(s).not.toContain('transform: [{ translateX: value ? 19 : 0 }]');
    }
  });
});
