// зачем (гейт safe-area Тем 26.10): окно «Скажи вслух» — прозрачная модалка; без statusBarTranslucent на Android над затемнением
// оставалась светлая полоса строки состояния. Затемнение — от верха экрана, карточку держат безопасные отступы (только useStableSafeAreaInsets).
import fs from 'node:fs';
import path from 'node:path';

const panel = fs.readFileSync(path.join(__dirname, '..', 'components/SpeakingPanel.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('окно «Скажи вслух»: под строкой состояния и с безопасными отступами', () => {
  it('модалка прозрачная и statusBarTranslucent', () => {
    expect(panel).toContain('<Modal transparent statusBarTranslucent animationType="fade" onRequestClose={handleClose} visible>');
  });

  it('затемнение держит карточку ниже часов и выше нижней полосы', () => {
    expect(panel).toContain('const safeInsets = useStableSafeAreaInsets();');
    expect(panel).toContain('{ paddingTop: safeInsets.top + 20, paddingBottom: safeInsets.bottom + 20 }');
    expect(panel).not.toMatch(/useSafeAreaInsets\(/);
  });
});
