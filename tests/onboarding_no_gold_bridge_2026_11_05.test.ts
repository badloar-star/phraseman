// зачем (владелец 05.11): после онбординга Главная появляется сразу, без плавного проявления из жёлтого («золотой мост» в _layout).
import fs from 'node:fs';
import path from 'node:path';

const layout = fs.readFileSync(path.join(__dirname, '..', 'app/_layout.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('после онбординга нет золотого проявления', () => {
  it('armPostOnboardingGoldBridge только пишет лог и не взводит слой', () => {
    const start = layout.indexOf('const armPostOnboardingGoldBridge = useCallback');
    const body = layout.slice(start, layout.indexOf('}, []);', start));
    expect(body).toContain("[ONB-EXIT-REVEAL]");
    expect(body).not.toMatch(/setPostOnboardingGoldBridgeVisible\(true\)|setPostOnboardingGoldBridgeArmed\(true\)|setValue\(1\)/);
  });
});
