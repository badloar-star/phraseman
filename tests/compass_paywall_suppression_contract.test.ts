import { readFileSync } from 'fs';
import { join } from 'path';

const hostSrc = readFileSync(
  join(__dirname, '..', 'app', 'compass', 'compass_briefing_host.tsx'),
  'utf8',
);

describe('Compass briefing paywall suppression contract', () => {
  it('does not request the global modal slot while a paywall route is active', () => {
    expect(hostSrc).toContain('COMPASS_BRIEFING_SUPPRESSED_PATHS');
    for (const route of [
      "'/premium_modal'",
      "'/paywall_a'",
      "'/paywall_b'",
      "'/paywall_c'",
      "'/manage_subscription'",
    ]) {
      expect(hostSrc).toContain(route);
    }
    expect(hostSrc).toContain("useOverlayVisible('compassBriefing', visible && !compassSuppressedByRoute)");
    expect(hostSrc).toContain('if (!compassOn() || compassSuppressedByRoute');
    expect(hostSrc).toContain('navigateAfterModalClose');
    expect(hostSrc).toContain('compass_day_closing');
  });
});
