import { communityContestSchedule } from '../shared/community_month_contest';

describe('owner-approved first contest and monthly rollover', () => {
  it('counts down to 1 November, without an active October contest', () => {
    expect(communityContestSchedule(Date.UTC(2026, 9, 26, 15))).toEqual({ phase: 'upcoming', monthId: '2026-11', days: 6 });
  });
  it('keeps the last fraction of a day before launch as one day', () => {
    expect(communityContestSchedule(Date.UTC(2026, 9, 31, 23, 59, 59))).toEqual({ phase: 'upcoming', monthId: '2026-11', days: 1 });
  });
  it('starts exactly at midnight UTC and counts down to month end', () => {
    expect(communityContestSchedule(Date.UTC(2026, 10, 1))).toEqual({ phase: 'active', monthId: '2026-11', days: 30 });
    expect(communityContestSchedule(Date.UTC(2026, 10, 30, 23, 59))).toEqual({ phase: 'active', monthId: '2026-11', days: 1 });
  });
  it('automatically starts December and then the new year', () => {
    expect(communityContestSchedule(Date.UTC(2026, 11, 1))).toEqual({ phase: 'active', monthId: '2026-12', days: 31 });
    expect(communityContestSchedule(Date.UTC(2027, 0, 1))).toEqual({ phase: 'active', monthId: '2027-01', days: 31 });
  });
});
