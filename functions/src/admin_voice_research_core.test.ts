import {
  buildCancellationSummary,
  buildCancellationTrendFromCounts,
  buildOnboardingSourceSummary,
  csvCell,
  filterIdeaRows,
  preserveIdeaRewardProgress,
  projectCancellationRow,
  projectIdeaRow,
  projectSurveyResponse,
} from './admin_voice_research_core';

const NOW = Date.UTC(2026, 6, 13, 12);
const DAY = 86_400_000;

describe('Admin Voice & Research core', () => {
  test('projects only the allowed idea fields and filters status/category/search', () => {
    const row = projectIdeaRow('idea-1', {
      uid: 'stable-1', userName: 'Alice', title: 'Offline lessons', description: 'Download lessons', benefit: 'Travel',
      category: 'feature', status: 'pending', lang: 'ru', platform: 'ios', appVersion: '1.5.0', createdAtMs: NOW,
      email: 'secret@example.com', arbitrarySecret: 'must-not-leak',
    });
    expect(row).toEqual({
      id: 'idea-1', uid: 'stable-1', userName: 'Alice', title: 'Offline lessons', description: 'Download lessons', benefit: 'Travel',
      category: 'feature', status: 'pending', lang: 'ru', platform: 'ios', appVersion: '1.5.0', createdAtMs: NOW,
      decidedAtMs: 0, decidedBy: '', decisionMessageRu: '', decisionMessageUk: '', decisionMessageEs: '', premiumGranted: false, premiumGrantUntilMs: 0,
    });
    expect(filterIdeaRows([row], { status: 'pending', category: 'feature', query: 'travel' })).toEqual([row]);
    expect(filterIdeaRows([row], { status: 'rejected' })).toEqual([]);
    expect(JSON.stringify(row)).not.toContain('secret@example.com');
  });

  test('deduplicates onboarding events by latest UID and normalizes source families', () => {
    const result = buildOnboardingSourceSummary([
      { id: 'old', uid: 'u1', source: 'instagram', platform: 'ios', createdAtMs: NOW - 100 },
      { id: 'new', uid: 'u1', source: 'youtube', platform: 'ios', createdAtMs: NOW },
      { id: 'u2', uid: 'u2', source: 'friend', platform: 'android', createdAtMs: NOW - 50 },
      { id: 'anon', source: 'TikTok', platform: 'android', createdAtMs: NOW - 20 },
    ]);
    expect(result.totalEvents).toBe(4);
    expect(result.uniqueUsers).toBe(3);
    expect(result.bySource).toEqual({ friends: 1, tiktok: 1, youtube: 1 });
    expect(result.latest.map((row) => row.source)).toEqual(['youtube', 'tiktok', 'friends']);
  });

  test('uses canonical cancellation reasonText and computes independent 14-day trends', () => {
    const projected = projectCancellationRow('c1', { uid: 'u1', userName: 'A', reason: 'too_expensive', reasonText: 'Costs too much', text: 'wrong', createdAtMs: NOW });
    expect(projected.reasonText).toBe('Costs too much');
    expect(JSON.stringify(projected)).not.toContain('wrong');
    const rows = [
      projected,
      projectCancellationRow('c2', { reason: 'too_expensive', createdAtMs: NOW - DAY }),
      projectCancellationRow('c3', { reason: 'technical_issues', createdAtMs: NOW - 15 * DAY }),
      projectCancellationRow('c4', { reason: 'technical_issues', createdAtMs: NOW - 16 * DAY }),
    ];
    const summary = buildCancellationSummary(rows, NOW);
    expect(summary.byReason).toEqual({ technical_issues: 2, too_expensive: 2 });
    expect(summary.segments.price).toMatchObject({ count: 2, recentShare: 1, previousShare: 0, trend: 'up' });
    expect(summary.segments.technical).toMatchObject({ count: 2, recentShare: 0, previousShare: 1, trend: 'down' });
  });

  test('builds exact cancellation trends independently from the capped feed', () => {
    const result = buildCancellationTrendFromCounts({
      recentTotal: 100, previousTotal: 50,
      recentByReason: { too_expensive: 30, technical_issues: 10 },
      previousByReason: { too_expensive: 5, technical_issues: 20 },
    });
    expect(result.price).toMatchObject({ recentShare: 0.3, previousShare: 0.1, trend: 'up' });
    expect(result.technical).toMatchObject({ recentShare: 0.1, previousShare: 0.4, trend: 'down' });
  });

  test('preserves lifetime and longer VIP while never returning Store field patches', () => {
    expect(preserveIdeaRewardProgress({ vip_active: 'true', vip_plan: 'admin_vip', vip_until: '0', premium_rc_product_id: 'store' }, NOW))
      .toEqual({ changed: false, nominalRewardUntilMs: NOW + 365 * DAY, patch: {} });
    const longer = NOW + 500 * DAY;
    expect(preserveIdeaRewardProgress({ vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(longer), premium_rc_product_id: 'store' }, NOW))
      .toEqual({ changed: false, nominalRewardUntilMs: NOW + 365 * DAY, patch: {} });
    const reward = preserveIdeaRewardProgress({ premium_rc_product_id: 'store' }, NOW);
    expect(reward.changed).toBe(true);
    expect(reward.patch).toMatchObject({ vip_active: 'true', vip_plan: 'idea_reward', vip_until: String(NOW + 365 * DAY) });
    expect(reward.patch).not.toHaveProperty('premium_rc_product_id');
  });

  test('projects survey answers without leaking auth identifiers', () => {
    const row = projectSurveyResponse('r1', { uid: 'u1', authUid: 'provider-secret', surveyId: 's1', submittedAtMs: NOW, platform: 'android', appVersion: '1.2', answers: { q1: '=cmd', q2: ['a', 'b'] }, comment: '@danger' });
    expect(row).toEqual({ id: 'r1', uid: 'u1', surveyId: 's1', submittedAtMs: NOW, platform: 'android', appVersion: '1.2', answers: { q1: '=cmd', q2: ['a', 'b'] }, comment: '@danger' });
    expect(JSON.stringify(row)).not.toContain('provider-secret');
  });

  test.each(['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '  =1+1'])('neutralizes CSV formulas: %s', (value) => {
    expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
  });
});
