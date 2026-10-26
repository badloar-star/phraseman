import { assertOwner, taskOccurrenceId, type StaffIdentity, type StaffMember } from './admin_staff_contract';
export interface StaffTask {
  readonly id:string; readonly templateId:string; readonly assigneeUid:string; readonly revision:number;
  readonly localDate:string; readonly deadlineMs:number; readonly requiredChecklist:readonly string[];
  readonly state:'assigned'|'returned'|'submitted'|'accepted';
  readonly report?: TaskReport & { readonly submittedAtMs:number; readonly late:boolean };
  readonly review?: { readonly ownerUid:string; readonly comment:string; readonly atMs:number };
}
export interface TaskReport { readonly summary:string; readonly evidence:readonly string[]; readonly checklist:readonly boolean[]; readonly blockers:string; }
function assertOccurrence(task:StaffTask):void {if(task.id!==taskOccurrenceId(task.templateId,task.assigneeUid,task.localDate))throw new Error('task_occurrence_mismatch');}
function validTime(value:number):void {if(!Number.isSafeInteger(value)||value<0)throw new Error('invalid_time');}
/** Persist every revision as an immutable event alongside the task head, in one transaction. */
export function submitTaskReport(identity:StaffIdentity, member:StaffMember, task:StaffTask, report:TaskReport, nowMs:number):StaffTask {
  validTime(nowMs);assertOccurrence(task);
  if(!identity.emailVerified||!member.active||identity.uid!==member.uid||identity.uid!==task.assigneeUid)throw new Error('assignee_required');
  if(!['assigned','returned'].includes(task.state))throw new Error('task_not_editable');
  if(!Number.isSafeInteger(task.revision)||task.revision<1)throw new Error('invalid_task_revision');
  if(typeof report.summary!=='string'||report.summary.trim().length<10||report.summary.length>12000)throw new Error('report_required');
  if(typeof report.blockers!=='string'||report.blockers.length>4000)throw new Error('invalid_blockers');
  if(!Array.isArray(report.checklist)||report.checklist.length!==task.requiredChecklist.length||report.checklist.some(v=>v!==true))throw new Error('checklist_incomplete');
  if(!Array.isArray(report.evidence)||report.evidence.length>20)throw new Error('invalid_evidence');
  for(const item of report.evidence){
    if(typeof item!=='string'||item.length>2048)throw new Error('invalid_evidence');
    const url=new URL(item);
    if(url.protocol!=='https:'||url.username||url.password)throw new Error('unsafe_evidence_url');
  }
  return {...task,state:'submitted',revision:task.revision+1,review:undefined,
    report:{summary:report.summary.trim(),blockers:report.blockers.trim(),evidence:[...report.evidence],checklist:[...report.checklist],submittedAtMs:nowMs,late:nowMs>task.deadlineMs}};
}
export function reviewTaskReport(identity:StaffIdentity|null, ownerUid:string, task:StaffTask, decision:'accept'|'return',comment:string,nowMs:number):StaffTask {
  assertOwner(identity,ownerUid);validTime(nowMs);
  if(task.state!=='submitted'||!task.report)throw new Error('report_not_pending');
  if(!['accept','return'].includes(decision))throw new Error('invalid_decision');
  if(typeof comment!=='string'||comment.length>4000||(decision==='return'&&!comment.trim()))throw new Error('review_comment_required');
  return {...task,state:decision==='accept'?'accepted':'returned',revision:task.revision+1,review:{ownerUid:identity.uid,comment:comment.trim(),atMs:nowMs}};
}
