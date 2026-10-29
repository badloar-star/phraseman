import {isSpireZoneWarningSilent as silent} from './diagnostics_cron_freshness';
const ms=(s:string)=>Date.parse(s);
describe('Sunday warning cron freshness',()=>{
 test('healthy Sunday final run stays fresh on Saturday',()=>expect(silent(ms('2026-10-18T22:00:00Z'),ms('2026-10-24T18:00:00Z'))).toBe(false));
 test('missed later Sunday hourly runs are stale after grace',()=>expect(silent(ms('2026-10-18T06:00:00Z'),ms('2026-10-18T10:00:00Z'))).toBe(true));
 test('before Sunday first deadline last week remains fresh',()=>expect(silent(ms('2026-10-18T22:00:00Z'),ms('2026-10-25T07:59:00Z'))).toBe(false));
 test('missing first Sunday run becomes stale',()=>expect(silent(ms('2026-10-18T22:00:00Z'),ms('2026-10-25T08:00:00Z'))).toBe(true));
 test('a late final run is accepted',()=>expect(silent(ms('2026-10-18T22:04:00Z'),ms('2026-10-19T02:00:00Z'))).toBe(false));
 test('missing final run is detected after midnight',()=>expect(silent(ms('2026-10-18T21:00:00Z'),ms('2026-10-19T00:01:00Z'))).toBe(true));
});
