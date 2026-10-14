// зачем (D193, владелец 14.10: «ВМЕСТО ПРЕДЛОЖЕНИЯ КУПИТЬ — ВОТ ЭТОТ БУДЕТ ЛУЧШЕ»): по возвращении после долгого отсутствия
// пейвол Plus больше не открывается — его заменит окно «С возвращением». Гейт и запись активности остаются (на них сядет окно).
import fs from 'fs';
import path from 'path';

const layout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

function winbackCheckBody(): string {
  const start = layout.indexOf('const checkWinbackOffer = useCallback(');
  expect(start).toBeGreaterThan(-1);
  const end = layout.indexOf('}, [', start);
  return layout.slice(start, end);
}

describe('D193: winback no longer opens the Plus paywall', () => {
  it('does not navigate to the paywall from the winback check', () => {
    const body = winbackCheckBody();
    expect(body).not.toContain('/premium_modal');
    expect(body).not.toContain("context: 'winback'");
  });

  it('logs the skipped paywall with the reason and still marks the return as handled', () => {
    const body = winbackCheckBody();
    expect(body).toMatch(/\[WINBACK\] show=skipped reason=paywall_retired_D193/);
    expect(body).toContain('markWinbackShown(nowMs)');
    expect(body).toContain('recordLastActive(nowMs)');
  });

  it('does not report a paywall impression that no longer happens', () => {
    const body = winbackCheckBody();
    expect(body).not.toContain("trackEvent('winback_shown'");
    expect(body).not.toContain('logWinbackShown');
  });
});
