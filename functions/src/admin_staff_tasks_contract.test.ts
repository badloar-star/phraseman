import { taskOccurrenceId } from './admin_staff_contract';
import { submitTaskReport, reviewTaskReport, type StaffTask } from './admin_staff_tasks_contract';
const staff={uid:'staff-1',emailVerified:true},owner={uid:'owner-1',emailVerified:true};
const member={uid:'staff-1',active:true,revision:1,badge:'Редактор',sections:{}};
const task:StaffTask={id:taskOccurrenceId('daily-1','staff-1','2026-10-25'),templateId:'daily-1',assigneeUid:'staff-1',revision:1,localDate:'2026-10-25',state:'assigned',requiredChecklist:['Проверить обращения'],deadlineMs:2000};
const report={summary:'Проверено 10 обращений, обнаружены две ошибки',evidence:['https://example.com/report'],checklist:[true],blockers:''};
describe('staff tasks and reports',()=>{
 test('only the assignee may submit, never another staff user',()=>expect(()=>submitTaskReport({...staff,uid:'staff-2'},member,task,report,1000)).toThrow());
 test('revoked member cannot submit',()=>expect(()=>submitTaskReport(staff,{...member,active:false},task,report,1000)).toThrow());
 test('empty report and unfinished checklist cannot claim completion',()=>{
  expect(()=>submitTaskReport(staff,member,task,{...report,summary:' '},1000)).toThrow();
  expect(()=>submitTaskReport(staff,member,task,{...report,checklist:[false]},1000)).toThrow();
 });
 test('submitted is not accepted and late status is retained',()=>{
  const submitted=submitTaskReport(staff,member,task,report,2001);
  expect(submitted.state).toBe('submitted');expect(submitted.report?.late).toBe(true);
  expect(()=>reviewTaskReport(staff,'owner-1',submitted,'accept','',2002)).toThrow();
 });
 test('owner may return report with comment and resubmission increments revision',()=>{
  const submitted=submitTaskReport(staff,member,task,report,1000);
  expect(()=>reviewTaskReport(owner,'owner-1',submitted,'return','',1001)).toThrow();
  const returned=reviewTaskReport(owner,'owner-1',submitted,'return','Добавьте доказательства',1001);
  const revised=submitTaskReport(staff,member,returned,report,1002);
  expect(revised.revision).toBe(4);
 });
 test('accepted report cannot be overwritten',()=>{
  const accepted=reviewTaskReport(owner,'owner-1',submitTaskReport(staff,member,task,report,1000),'accept','Проверено',1001);
  expect(accepted.state).toBe('accepted');
  expect(()=>submitTaskReport(staff,member,accepted,report,1002)).toThrow();
 });
 test('daily occurrence cannot be reused for another day or template',()=>{
  expect(()=>submitTaskReport(staff,member,{...task,localDate:'2026-10-26'},report,1000)).toThrow();
  expect(()=>submitTaskReport(staff,member,{...task,templateId:'different'},report,1000)).toThrow();
 });
 test('unsafe evidence links refused',()=>expect(()=>submitTaskReport(staff,member,task,{...report,evidence:['javascript:alert(1)']},1000)).toThrow());
});
