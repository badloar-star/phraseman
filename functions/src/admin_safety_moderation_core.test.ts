import {
  buildPolicyEvidence,
  buildUserReportsCsv,
  filterBanSummaries,
  filterSafetyFlagSummaries,
  filterUserReportSummaries,
  projectBanSummary,
  projectConsentAggregateInput,
  projectSafetyFlagSummary,
  projectUserReport,
  sourceState,
} from './admin_safety_moderation_core';

const NOW = Date.UTC(2026, 6, 13, 12);
const DAY = 86_400_000;

describe('Admin Safety & Moderation core', () => {
  test('projects user reports through an explicit allowlist', () => {
    const result = projectUserReport('report-1', {
      reportedUid: 'target-1', reportedName: 'Alice', reporterUid: 'reporter-1',
      reason: 'offensive_nickname', status: 'new', screen: 'league', platform: 'ios',
      appVersion: '2.4.1', createdAtMs: NOW, privateEmail: 'secret@example.com', accessToken: 'secret-token',
    });

    expect(result).toEqual({
      id: 'report-1', reportedUid: 'target-1', reportedName: 'Alice', reporterUid: 'reporter-1',
      reason: 'offensive_nickname', status: 'new', screen: 'league', platform: 'ios',
      appVersion: '2.4.1', createdAtMs: NOW,
    });
    expect(JSON.stringify(result)).not.toContain('secret@example.com');
    expect(JSON.stringify(result)).not.toContain('secret-token');
  });

  test('projects safety list rows without leaking raw history', () => {
    const result = projectSafetyFlagSummary('flag-1', {
      uid: 'target-1', category: 'self_harm', handled: false, ageBracket: 'teen_safe', mode: 'chat',
      matchedTerm: 'trigger', userText: `  ${'x'.repeat(150)}  `,
      historyContext: [{ role: 'user', text: 'must not appear in list' }], createdAtMs: NOW,
    });

    expect(result).toEqual({
      id: 'flag-1', uid: 'target-1', category: 'self_harm', handled: false, ageBracket: 'teen_safe',
      mode: 'chat', matchedTerm: 'trigger', textPreview: 'x'.repeat(120), createdAtMs: NOW,
      disposition: '', handledBy: '', handledAtMs: 0,
    });
    expect(JSON.stringify(result)).not.toContain('must not appear');
  });

  test('projects consent and ban data without document spreading', () => {
    expect(projectConsentAggregateInput('u1', {
      birthYear: 2010, ageBracket: 'teen_safe', analyticsConsent: 'denied', legalAccepted: true,
      platform: 'android', updatedAt: NOW, locale: 'de', authUid: 'private-provider-id',
    })).toEqual({
      ageBracket: 'teen_safe', analyticsConsent: 'denied', legalAccepted: true,
      platform: 'android', policyVersion: '', updatedAtMs: NOW,
    });

    expect(projectBanSummary('u1', {
      uid: 'u1', name: 'Alice', reason: 'abuse', bannedAt: NOW, bannedBy: 'owner-1',
      email: 'private@example.com', internalNotes: 'do not leak',
    })).toEqual({
      uid: 'u1', name: 'Alice', reason: 'abuse', bannedAtMs: NOW, bannedBy: 'owner-1',
      usersBanned: null, leaderboardPresent: null, chatRestricted: null, consistency: 'unavailable',
    });
  });

  test('preserves legacy report, safety and ban filters', () => {
    const reports = [
      projectUserReport('r1', { reportedUid: 'u1', reportedName: 'Alice', reason: 'offensive_nickname', status: 'new', createdAtMs: NOW }),
      projectUserReport('r2', { reportedUid: 'u2', reportedName: 'Bob', reason: 'cheating', status: 'archived', createdAtMs: NOW - 1 }),
    ];
    expect(filterUserReportSummaries(reports, { status: 'new', reason: 'offensive_nickname', query: 'alice' }).map((row) => row.id)).toEqual(['r1']);
    expect(filterUserReportSummaries(reports, { status: 'all', reason: 'all', query: 'u2' }).map((row) => row.id)).toEqual(['r2']);

    const flags = [
      projectSafetyFlagSummary('f1', { uid: 'u1', category: 'suicide', handled: false, createdAtMs: NOW }),
      projectSafetyFlagSummary('f2', { uid: 'u2', category: 'violence', handled: true, createdAtMs: NOW - 1 }),
    ];
    expect(filterSafetyFlagSummaries(flags, { status: 'open', category: 'suicide', query: '' }).map((row) => row.id)).toEqual(['f1']);
    expect(filterSafetyFlagSummaries(flags, { status: 'handled', category: 'all', query: 'u2' }).map((row) => row.id)).toEqual(['f2']);

    const bans = [projectBanSummary('u2', { name: 'Zed', bannedAt: NOW - 1 }), projectBanSummary('u1', { name: 'Alice', bannedAt: NOW })];
    expect(filterBanSummaries(bans, { query: '', sort: 'date_desc' }).map((row) => row.uid)).toEqual(['u1', 'u2']);
    expect(filterBanSummaries(bans, { query: 'zed', sort: 'name' }).map((row) => row.uid)).toEqual(['u2']);
  });

  test('reports truthful source coverage instead of presenting capped data as complete', () => {
    expect(sourceState({ scanned: 200, matched: 20, cap: 500, hasMore: false, capturedAtMs: NOW })).toEqual({
      status: 'ready', scanned: 200, matched: 20, cap: 500, capturedAtMs: NOW, reason: '',
    });
    expect(sourceState({ scanned: 500, matched: 80, cap: 500, hasMore: true, capturedAtMs: NOW })).toEqual({
      status: 'partial', scanned: 500, matched: 80, cap: 500, capturedAtMs: NOW, reason: 'source_cap_reached',
    });
    expect(sourceState({ scanned: 0, matched: 0, cap: 500, hasMore: false, capturedAtMs: NOW, error: 'permission-denied' })).toEqual({
      status: 'error', scanned: 0, matched: 0, cap: 500, capturedAtMs: NOW, reason: 'permission-denied',
    });
  });

  test('builds factual policy evidence without language jurisdiction or consent verdicts', () => {
    const result = buildPolicyEvidence([
      projectConsentAggregateInput('u1', { ageBracket: 'teen_safe', analyticsConsent: 'denied', legalAccepted: true, platform: 'ios', locale: 'de', updatedAtMs: NOW }),
      projectConsentAggregateInput('u2', { ageBracket: 'adult', analyticsConsent: 'granted', legalAccepted: false, platform: 'android', locale: 'en', updatedAtMs: NOW - 200 * DAY }),
      projectConsentAggregateInput('u3', { ageBracket: 'not-real', analyticsConsent: 'maybe', platform: 'web' }),
    ], { nowMs: NOW, staleAfterMs: 180 * DAY, runtimeMinimumAge: null, declaredMinimumAge: 16 });

    expect(result).toEqual({
      sourceKind: 'client_reported_legacy_telemetry', total: 3,
      ageBrackets: { adult: 1, teen_safe: 1, under13: 0, unknown: 1 },
      analyticsConsent: { granted: 1, denied: 1, unknown: 1 },
      legalAcceptance: { accepted: 1, notAccepted: 1, unknown: 1 },
      platforms: { android: 1, ios: 1, web: 1 }, stale: 1, invalid: 1,
      policyRuntimeMismatch: true,
      missingEvidence: ['append_only_server_ledger', 'guardian_relationship', 'jurisdiction', 'purpose_specific_legal_basis', 'server_timestamp'],
    });
    expect(JSON.stringify(result).toLowerCase()).not.toContain('gdpr compliant');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('violation');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('germany');
  });

  test('exports the legacy report columns from safe rows and neutralizes formulas', () => {
    const csv = buildUserReportsCsv([
      projectUserReport('r1', {
        reportedUid: '=2+2', reportedName: '+cmd', reporterUid: '@attacker', reason: '-formula', status: 'new',
        screen: 'league,board', platform: 'ios', appVersion: '2.0', createdAtMs: NOW,
      }),
    ]);

    expect(csv.split('\n')[0]).toBe('Report ID,Reported UID,Reported name,Reporter UID,Reason,Status,Screen,Platform,App version,Created at');
    expect(csv).toContain("\"'=2+2\"");
    expect(csv).toContain("\"'+cmd\"");
    expect(csv).toContain("\"'@attacker\"");
    expect(csv).toContain("\"'-formula\"");
    expect(csv).toContain('"league,board"');
    expect(csv).not.toContain('historyContext');
  });
});
