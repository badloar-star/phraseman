import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertTournamentsReleased,
  TOURNAMENTS_DISABLED_REASON,
  TOURNAMENTS_RELEASED,
} from './tournament_release_gate';

describe('tournament owner release lock', () => {
  test('is a compile-time fail-closed lock', () => {
    expect(TOURNAMENTS_RELEASED).toBe(false);
    expect(() => assertTournamentsReleased()).toThrow(HttpsError);
    expect(() => assertTournamentsReleased()).toThrow(TOURNAMENTS_DISABLED_REASON);
  });
});
