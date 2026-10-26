import * as admin from 'firebase-admin';
import { latestSpireZoneDueMs } from './diagnostics_cron_freshness';

export interface SchedulerJob {
  state?: string; lastAttemptTime?: string; userUpdateTime?: string;
  scheduleTime?: string; schedule?: string; timeZone?: string; status?: {code?: number};
}
export type SchedulerJobs = Record<string, SchedulerJob>;
export type CronHealth = 'healthy'|'stale'|'error'|'unknown'|'paused'|'retired'|'scheduled'|'scheduler-only';
export interface CronClassification { health:CronHealth; note:string; schedulerLastAttemptAtMs?:number; }
const HOUR=3600000;
// Verified against deployed Functions + Scheduler inventories on 2026-10-24.
// A restored job or a heartbeat newer than this audit invalidates retirement.
const RETIREMENT_VERIFIED_AT=Date.parse('2026-10-24T18:20:00Z');
const RETIRED:Record<string,string>={
 arenaV2CleanupHourly:'Старая Арена удалена (D74); функция и расписание отсутствуют.',
 resetWeeklyXpCron:'Серверный недельный XP удалён (PM-222/D78); функция и расписание отсутствуют.',
 leagueResidentsTickCron:'Старые лиги удалены (D83); функция и расписание отсутствуют.',
 leagueFinalizeCron:'Старые лиги удалены (D83); функция и расписание отсутствуют.',
 jarvisDailyBusinessHistoryCron:'Джарвис отключён владельцем 17.10; функция и расписание удалены.',
 jarvisDailyDepartmentsCron:'Джарвис отключён владельцем 17.10; функция и расписание удалены.',
 jarvisProductKnowledgeReviewCron:'Джарвис отключён владельцем 17.10; функция и расписание удалены.',
 maxVoiceWatchdog:'MAX выведен из эксплуатации; функция и расписание отсутствуют.',
 maxLessonReminderCron:'MAX выведен из эксплуатации; функция и расписание отсутствуют.',
 maxVoiceUsageRecon:'MAX выведен из эксплуатации; функция и расписание отсутствуют.',
 maxVoiceProviderHealth:'MAX выведен из эксплуатации; функция и расписание отсутствуют.',
};
const WEEKLY=new Set(['spireFinalizeCron','spirePackWeeklyCron','leagueFinalizeCron','soc2ReadinessCollectorCron']);
const NEEDS_SCHEDULER=new Set([...Object.keys(RETIRED),'spireZoneWarningCron','webLeadNudgeCron','soc2ReadinessCollectorCron']);
export function classifyCron(name:string, heartbeat:{lastRunAtMs:number;ok:boolean}, jobs:SchedulerJobs|null, nowMs:number):CronClassification {
 const job=jobs?.[name];
 const age=nowMs-heartbeat.lastRunAtMs;
 if (RETIRED[name] && jobs && !job && heartbeat.lastRunAtMs<=RETIREMENT_VERIFIED_AT)
   return {health:'retired',note:RETIRED[name]+' Историческая отметка сохранена; проверено 24.10.2026.'};
 if (!jobs && NEEDS_SCHEDULER.has(name)) return {health:'unknown',note:'Не удалось проверить Scheduler. Здоровое состояние не подтверждено.'};
 if (jobs && NEEDS_SCHEDULER.has(name) && !job) return {health:'unknown',note:'Обязательное расписание отсутствует. Свежая отметка сама по себе не подтверждает плановые запуски.'};
 if (job && job.state!=='ENABLED') return {health:job.state==='PAUSED'?'paused':'unknown',note:'Состояние Scheduler: '+(job.state||'неизвестно')};
 if (job?.status?.code && job.status.code!==0) return {health:'error',note:'Последняя попытка Scheduler завершилась ошибкой '+job.status.code};
 if (!heartbeat.ok) return {health:'error',note:'Последний зарегистрированный запуск завершился ошибкой.'};
 if (name==='webLeadNudgeCron') {
   if (!job) return {health:'unknown',note:'Расписание не найдено. Исторический heartbeat не подтверждает работу.'};
   if (heartbeat.lastRunAtMs>0 && age<=8*HOUR) return {health:'healthy',note:'Свежий heartbeat.'};
   const attempt=Date.parse(job.lastAttemptTime||'');
   if (!Number.isFinite(attempt)) return {health:'unknown',note:'Нет времени последней попытки Scheduler.'};
   if (nowMs-attempt>8*HOUR) return {health:'stale',note:'Нет успешной попытки Scheduler за 8 часов.',schedulerLastAttemptAtMs:attempt};
   return {health:'scheduler-only',note:'Scheduler получил успешный ответ. Опубликованная старая версия не пишет heartbeat. Это не подтверждение доставки писем.',schedulerLastAttemptAtMs:attempt};
 }
 if (name==='spireZoneWarningCron') {
   if (!job) return {health:'unknown',note:'Расписание Пика не найдено; состояние не подтверждено.'};
   const due=latestSpireZoneDueMs(nowMs);
   const changed=Date.parse(job.userUpdateTime||'');
   if (Number.isFinite(changed) && due<changed) return {health:'scheduled',note:'Новое расписание ещё не имело обязательного запуска. Следующий: '+(job.scheduleTime||'по расписанию')};
   return heartbeat.lastRunAtMs>=due ? {health:'healthy',note:'Отметка соответствует воскресному почасовому расписанию.'} : {health:'stale',note:'Нет отметки последнего ожидаемого воскресного часа (запас 2 часа).'};
 }
 if (!(heartbeat.lastRunAtMs>0)) return {health:'unknown',note:'Отметка запуска отсутствует.'};
 const stale=age>(WEEKLY.has(name)?8*24:26)*HOUR;
 return {health:stale?'stale':'healthy',note:WEEKLY.has(name)?'Недельное расписание; порог 8 дней.':stale?'Нет свежей отметки.':'Свежая отметка запуска.'};
}

type Snapshot={jobs:SchedulerJobs|null;checkedAtMs:number;error:string|null};
let cached:Snapshot|undefined;
let pending:Promise<Snapshot>|undefined;
export async function readDiagnosticsScheduler():Promise<Snapshot> {
 if(cached && Date.now()-cached.checkedAtMs<60000)return cached;
 if(pending)return pending;
 pending=(async()=>{
   try {
     const project=process.env.GCLOUD_PROJECT||admin.app().options.projectId;
     if(!project || !/^[a-z0-9-]+$/.test(project))throw new Error('project-unavailable');
     const token=await admin.credential.applicationDefault().getAccessToken();
     const response=await fetch('https://cloudscheduler.googleapis.com/v1/projects/'+project+'/locations/us-central1/jobs?pageSize=500',{
       headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(5000),
     });
     if(!response.ok)throw new Error('scheduler-http-'+response.status);
     const data=await response.json() as {jobs?:Array<SchedulerJob & {name?:string}>;nextPageToken?:string};
     if(!data || typeof data!=='object' || Array.isArray(data) || 'error' in data)throw new Error('scheduler-inventory-invalid');
     if(data.nextPageToken || (data.jobs!==undefined && !Array.isArray(data.jobs)))throw new Error('scheduler-inventory-incomplete');
     const jobs:SchedulerJobs={};
     for(const row of data.jobs||[]){
       if(!row || typeof row.name!=='string' || !row.name)throw new Error('scheduler-inventory-invalid');
       const id=row.name?.split('/').pop()?.match(/^firebase-schedule-(.+)-us-central1$/)?.[1];
       if(id)jobs[id]={state:row.state,lastAttemptTime:row.lastAttemptTime,userUpdateTime:row.userUpdateTime,scheduleTime:row.scheduleTime,schedule:row.schedule,timeZone:row.timeZone,status:row.status};
     }
     return {jobs,checkedAtMs:Date.now(),error:null};
   } catch(error) {
     const message=error instanceof Error ? error.message : 'scheduler-unavailable';
     return {jobs:null,checkedAtMs:Date.now(),error:message.startsWith('scheduler-')?message:'scheduler-unavailable'};
   }
 })();
 try{cached=await pending;return cached;}finally{pending=undefined;}
}
