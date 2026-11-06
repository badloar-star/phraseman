// зачем (слово владельца 06.11, TestFlight 150): на экране «Награда за друга» нет значка «?», дублирующего кнопку «Как это работает» лесенки.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'referrals.tsx'), 'utf8');

describe('«Награда за друга»: «?» не дублирует «Как это работает»', () => {
  it('значок в шапке рисуется только без лесенки (режим рулетки)', () => {
    expect(src).toContain('accessory={referralUiVisible && !ladderShown ? (');
    expect(src).not.toContain('accessory={referralUiVisible ? (');
  });
  it('кнопка «Как это работает» в карточке лесенки остаётся', () => {
    expect(src).toContain('onHow={() => setLadderHowOpen(true)}');
  });
});
