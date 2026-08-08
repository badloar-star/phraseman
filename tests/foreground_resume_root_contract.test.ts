import fs from 'fs';
import path from 'path';

describe('foreground root resume contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

  it('queues root housekeeping instead of running it inside the active event', () => {
    expect(source).toContain("scheduleCoalescedForegroundTask('root_level_up_queue_flush'");
    expect(source).toContain("scheduleCoalescedForegroundTask('root_widget_snapshot_refresh'");
    expect(source).toContain("scheduleCoalescedForegroundTask('root_league_bonus_availability'");
  });
});
