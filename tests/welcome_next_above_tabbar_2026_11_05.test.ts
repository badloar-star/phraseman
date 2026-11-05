// Находка Maestro 05.11: кнопка «Next» приветствия лежала под плавающей капсулой таб-бара.
// Низ приветствия считается от верха капсулы (tab_bar_geometry), в dev-превью без таб-бара — от системной полосы.
import fs from 'node:fs';
import path from 'node:path';
import { tabPillTopOffset, V2_TAB_BAR_HEIGHT } from '../components/v2/tab_bar_geometry';

const gate = fs.readFileSync(path.join(__dirname, '..', 'components/onboarding/WelcomeGate.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('приветствие: кнопка выше таб-бара', () => {
  it('шлюз передаёт отступ от верха капсулы, а не голый inset', () => {
    expect(gate).toContain('safeBottom={force ? insets.bottom : tabPillTopOffset(insets.bottom)}');
    expect(gate).not.toContain('safeBottom={insets.bottom}');
  });
  it('верх капсулы всегда выше её высоты: кнопка не может оказаться под ней', () => {
    for (const inset of [0, 24, 34]) expect(tabPillTopOffset(inset)).toBeGreaterThan(V2_TAB_BAR_HEIGHT);
  });
});
