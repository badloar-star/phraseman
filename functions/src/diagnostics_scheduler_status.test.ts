import { classifyCron } from './diagnostics_scheduler_status';
const now=Date.parse('2026-10-24T18:30:00Z');
const last=Date.parse('2026-10-18T20:00:00Z');
const heartbeat={lastRunAtMs:last,ok:true};
const job=(overrides:Record<string,unknown>={})=>({state:'ENABLED',lastAttemptTime:new Date(now-3600000).toISOString(),status:{},...overrides});
describe('cron evidence classification',()=>{
 test('confirmed retirement is historical, not failure',()=>expect(classifyCron('arenaV2CleanupHourly',heartbeat,{},now).health).toBe('retired'));
 test('failed inventory cannot retire a task',()=>expect(classifyCron('arenaV2CleanupHourly',heartbeat,null,now).health).toBe('unknown'));
 test('reintroduced scheduler prevents retirement',()=>expect(classifyCron('arenaV2CleanupHourly',heartbeat,{arenaV2CleanupHourly:job()},now).health).not.toBe('retired'));
 test('new heartbeat prevents old retirement assertion',()=>expect(classifyCron('arenaV2CleanupHourly',{...heartbeat,lastRunAtMs:now},{},now).health).not.toBe('retired'));
 test('unknown absent task is not automatically retired',()=>expect(classifyCron('futureCron',heartbeat,{},now).health).not.toBe('retired'));
 test('weekly SOC2 is fresh after five days',()=>expect(classifyCron('soc2ReadinessCollectorCron',heartbeat,{soc2ReadinessCollectorCron:job()},now).health).toBe('healthy'));
 test('failed heartbeat is never hidden by healthy scheduler',()=>expect(classifyCron('soc2ReadinessCollectorCron',{...heartbeat,ok:false},{soc2ReadinessCollectorCron:job()},now).health).toBe('error'));
 test('new Sunday schedule does not require retroactive hours',()=>expect(classifyCron('spireZoneWarningCron',heartbeat,{spireZoneWarningCron:job({userUpdateTime:'2026-10-22T07:12:57Z'})},now).health).toBe('scheduled'));
 test('missed due hour after schedule change stays stale',()=>expect(classifyCron('spireZoneWarningCron',heartbeat,{spireZoneWarningCron:job({userUpdateTime:'2026-10-22T07:12:57Z'})},Date.parse('2026-10-25T10:00:00Z')).health).toBe('stale'));
 test('old web runtime has scheduler-only success, not heartbeat success',()=>expect(classifyCron('webLeadNudgeCron',heartbeat,{webLeadNudgeCron:job()},now).health).toBe('scheduler-only'));
 test('scheduler error is visible',()=>expect(classifyCron('webLeadNudgeCron',heartbeat,{webLeadNudgeCron:job({status:{code:7}})},now).health).toBe('error'));
 test('old scheduler attempt is stale',()=>expect(classifyCron('webLeadNudgeCron',heartbeat,{webLeadNudgeCron:job({lastAttemptTime:new Date(last).toISOString()})},now).health).toBe('stale'));
 test('paused scheduler is not healthy',()=>expect(classifyCron('webLeadNudgeCron',heartbeat,{webLeadNudgeCron:job({state:'PAUSED'})},now).health).toBe('paused'));
 test('missing scheduler is not healthy',()=>expect(classifyCron('webLeadNudgeCron',heartbeat,{},now).health).toBe('unknown'));
 test('fresh heartbeat on future web deployment takes priority',()=>expect(classifyCron('webLeadNudgeCron',{lastRunAtMs:now,ok:true},{webLeadNudgeCron:job()},now).health).toBe('healthy'));
});

describe('required scheduler evidence',()=>{
 test('missing SOC2 schedule is unknown despite fresh heartbeat',()=>expect(classifyCron('soc2ReadinessCollectorCron',{lastRunAtMs:now,ok:true},{},now).health).toBe('unknown'));
 test('post-retirement heartbeat without a schedule remains unknown',()=>expect(classifyCron('arenaV2CleanupHourly',{lastRunAtMs:now,ok:true},{},now).health).toBe('unknown'));
});
