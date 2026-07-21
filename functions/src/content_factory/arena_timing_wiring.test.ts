import fs from 'node:fs';
import path from 'node:path';

const read = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

describe('Arena timing production wiring', () => {
  it('records stable server-observed timing exactly once with server scoring', () => { const source = read('index.ts'); expect(source).toContain("if (pending.serverScored) return"); expect(source).toContain('event.data?.after.updateTime?.toMillis()'); expect(source).toContain("timingSource: hasServerStart ? 'server_observed' : 'client_bounded'"); expect(source).toContain('applyArenaTimingEvent(timingSnap.exists'); expect(source).toContain('tx.set(timingRef, timingAggregate)'); expect(source).toContain('tx.set(timingRollupRef, timingRollup)'); });
  it('attributes client and watchdog timeouts without inventing device identity', () => { const client = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'hooks', 'use-arena-session.ts'), 'utf8'); expect(client).toContain("submitAnswer(sid, uid, qid, null, sessionRef.current?.questionTimeoutMs ?? 0, arenaDeviceClass())"); const watchdog = read('game_loop.ts'); expect(watchdog).toContain("?? 'unknown'"); expect(watchdog).toContain('deviceClass,'); });
  it('exposes only bounded aggregates to the admin and preserves 40 seconds', () => { const source = read('admin_content_factory_read.ts'); expect(source).toContain("limit(1001)"); expect(source).toContain('summarizeArenaTiming'); expect(source).toContain('timingScanTruncated'); const adapter = fs.readFileSync(path.join(__dirname, 'arena_stage_consumer_adapter.ts'), 'utf8'); expect(adapter).toContain('difficulty'); expect(adapter).toContain('questionTimeoutMs !== 40000'); });
});
