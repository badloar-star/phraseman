import fs from 'node:fs';
import path from 'node:path';
import { assertTransactionalTournamentAccess } from './tournaments';

const source = fs.readFileSync(path.join(__dirname, 'tournaments.ts'), 'utf8');

function callableBlock(name: string, nextMarker: string): string {
  const start = source.indexOf(`export const ${name}`);
  const end = source.indexOf(nextMarker, start);
  return source.slice(start, end > start ? end : undefined);
}

const snapshot = (data?: Record<string, unknown>) => ({
  exists: data !== undefined,
  data: () => data,
}) as FirebaseFirestore.DocumentSnapshot;

describe('tournament automatic-account entry access', () => {
  it('keeps both free and paid entry independent of App Check while requiring Firebase identity', () => {
    const paidJoin = callableBlock('tournamentJoin', '// ── Cancellation');
    const freeStart = callableBlock('tournamentStartNow', 'export const tournamentRoundReview');

    for (const block of [paidJoin, freeStart]) {
      expect(block).toContain('enforceAppCheck: false');
      expect(block).toContain("if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required')");
      expect(block).not.toContain('request.auth?.token?.admin');
    }
  });

  it('accepts the automatic anonymous owner proof but rejects forged or conflicting identity', () => {
    expect(() => assertTransactionalTournamentAccess(
      'anon-auth',
      'stable-profile',
      snapshot(),
      snapshot({ firebaseAuthUid: 'anon-auth' }),
      snapshot(),
    )).not.toThrow();

    expect(() => assertTransactionalTournamentAccess(
      'attacker-auth',
      'stable-profile',
      snapshot(),
      snapshot({ firebaseAuthUid: 'anon-auth' }),
      snapshot(),
    )).toThrow('stable_identity_changed');

    expect(() => assertTransactionalTournamentAccess(
      'anon-auth',
      'stable-profile',
      snapshot({ stable_id: 'other-profile' }),
      snapshot({ firebaseAuthUid: 'anon-auth' }),
      snapshot(),
    )).toThrow('stable_identity_changed');
  });
});
