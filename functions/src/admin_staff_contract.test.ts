import { makeRequest, decideRequest, beginExecution, canReadSection, canRequestChange, assertOwner, taskOccurrenceId, type StaffMember } from './admin_staff_contract';

const owner = { uid:'owner-1', emailVerified:true };
const staff = { uid:'staff-1', emailVerified:true };
const member: StaffMember = { uid:staff.uid, active:true, revision:3, badge:'Редактор', sections:{ reports:'request', users:'view' } };
const input = { id:'request-1', section:'reports', action:'reports.resolve', targetId:'report-1', reason:'Ошибка подтверждена воспроизведением', payload:{status:'fixed'}, beforeVersion:'v1', expiresAtMs:2000 };
const command = { section:'reports', action:'reports.resolve', enabled:true };
const receipt=(r:ReturnType<typeof makeRequest>)=>({requestId:r.id,digest:r.digest,ownerUid:'owner-1',deliveredAtMs:1001,messageId:'42'});
const request = () => makeRequest(staff, member, command, input, 1000);

describe('staff boundaries',()=>{
 test('only exact verified owner identity is owner',()=>{
  expect(()=>assertOwner(owner,'owner-1')).not.toThrow();
  for(const actor of [staff,{...owner,emailVerified:false},null])expect(()=>assertOwner(actor,'owner-1')).toThrow();
  expect(()=>assertOwner(owner,'')).toThrow();
 });
 test('badge does not confer powers and read does not confer change',()=>{
  expect(canReadSection(member,'users')).toBe(true);
  expect(canRequestChange(member,'users')).toBe(false);
  expect(canReadSection({...member,badge:'Владелец'},'payments')).toBe(false);
  expect(canRequestChange({...member,active:false},'reports')).toBe(false);
 });
 test.each(['','   ','x'])('requires a meaningful reason: %s',reason=>expect(()=>makeRequest(staff,member,command,{...input,reason},1000)).toThrow());
 test('unknown or disabled action cannot become a request',()=>{
  expect(()=>makeRequest(staff,member,{...command,enabled:false},input,1000)).toThrow();
  expect(()=>makeRequest(staff,member,command,{...input,action:'users.delete'},1000)).toThrow();
 });
 test('cannot impersonate another staff member',()=>expect(()=>makeRequest(owner,member,command,input,1000)).toThrow());
 test('unverified email denied',()=>expect(()=>makeRequest({...staff,emailVerified:false},member,command,input,1000)).toThrow());
 test('self approval and stale owner decisions denied',()=>{
  expect(()=>decideRequest(staff,'owner-1',request(),'approve','',1001)).toThrow();
  expect(()=>decideRequest(owner,'owner-1',request(),'approve','',2000)).toThrow();
 });
 test('rejection requires a reason',()=>expect(()=>decideRequest(owner,'owner-1',request(),'reject','',1001)).toThrow());
 test('approval does not execute and cannot be repeated',()=>{
  const approved=decideRequest(owner,'owner-1',request(),'approve','Проверено',1001);
  expect(approved.state).toBe('approved');
  expect(()=>decideRequest(owner,'owner-1',approved,'approve','',1002)).toThrow();
 });
 test('execution requires delivered Telegram notification',()=>{
  const approved=decideRequest(owner,'owner-1',request(),'approve','',1001);
  expect(()=>beginExecution(approved,member,command,'v1',null,1002,{uid:'owner-1'})).toThrow();
 });
 test('payload mutation invalidates approval',()=>{
  const approved=decideRequest(owner,'owner-1',request(),'approve','',1001);
  expect(()=>beginExecution({...approved,payload:{status:'deleted'}},member,command,'v1',receipt(approved),1002,{uid:'owner-1'})).toThrow();
 });
 test('revocation, changed rights and changed target invalidate execution',()=>{
  const approved=decideRequest(owner,'owner-1',request(),'approve','',1001);
  expect(()=>beginExecution(approved,{...member,active:false},command,'v1',receipt(approved),1002,{uid:'owner-1'})).toThrow();
  expect(()=>beginExecution(approved,{...member,revision:4},command,'v1',receipt(approved),1002,{uid:'owner-1'})).toThrow();
  expect(()=>beginExecution(approved,member,command,'v2',receipt(approved),1002,{uid:'owner-1'})).toThrow();
 });
 test('execution is single claim, never blind retry after external effects',()=>{
  const approved=decideRequest(owner,'owner-1',request(),'approve','',1001);
  const executing=beginExecution(approved,member,command,'v1',receipt(approved),1002,{uid:'owner-1'});
  expect(executing.state).toBe('executing');
  expect(()=>beginExecution(executing,member,command,'v1',receipt(approved),1003,{uid:'owner-1'})).toThrow();
 });
 test('foreign approver and unrelated notification rejected',()=>{
  const approved=decideRequest(owner,'owner-1',request(),'approve','',1001);
  expect(()=>beginExecution({...approved,decision:{ownerUid:'attacker',atMs:1001,comment:''}},member,command,'v1',receipt(approved),1002,{uid:'owner-1'})).toThrow();
  expect(()=>beginExecution(approved,member,command,'v1',{...receipt(approved),requestId:'other'},1002,{uid:'owner-1'})).toThrow();
 });
 test('daily occurrence stable per template, assignee, local date',()=>{
  expect(taskOccurrenceId('daily','staff-1','2026-10-25')).toBe(taskOccurrenceId('daily','staff-1','2026-10-25'));
  expect(taskOccurrenceId('daily','staff-1','2026-10-25')).not.toBe(taskOccurrenceId('daily','staff-2','2026-10-25'));
  expect(()=>taskOccurrenceId('daily','staff-1','2026-02-30')).toThrow();
 });
});
