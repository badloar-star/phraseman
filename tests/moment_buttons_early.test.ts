// зачем (Ревизор 15.10): кнопки итогов v3 не ждут конца анимации — в итоге урока (m10) подвал всплывает вторым ударом (≤ 1 с),
// в итоге диалога (m18) подвал на месте сразу, как без цепочки.
import fs from 'node:fs';
import path from 'node:path';
import { doneChainBeatAt } from '../components/completion/done_chain_gate';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('кнопки итогов v3 доступны не позже 1 с', () => {
  it('m10: подвал — удар DOCK_BEAT = 1, это ≤ 1000 мс', () => {
    const src = read('components/completion/V2DoneScreen.tsx');
    expect(src).toContain('const DOCK_BEAT = 1;');
    expect(src).toContain('<Chain.ChainBeat index={DOCK_BEAT}');
    expect(doneChainBeatAt(1)).toBeLessThanOrEqual(1000);
  });
  it('m18: подвал итога диалога не завёрнут в удар цепочки', () => {
    const src = read('app/dialogue_v2_completion.tsx');
    expect(src).toContain('const footer = (children: React.ReactNode) => <View style={styles.footer}>{children}</View>;');
  });
});
