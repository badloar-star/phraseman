import { createStaffAuthority } from './admin_staff_authority';
import { makeRequest } from './admin_staff_contract';
const member={uid:'staff-1',active:true,revision:1,badge:'Владелец',sections:{reports:'request' as const}};
const command={section:'reports',action:'reports.resolve',enabled:true};
const req=makeRequest({uid:member.uid,emailVerified:true},member,command,{id:'r1',section:'reports',action:command.action,targetId:'report1',reason:'Ошибка подтверждена',payload:{status:'fixed'},beforeVersion:'v1',expiresAtMs:2000},1000);
describe('server authority composition',()=>{
 test('rejects missing UID and unconfirmed owner email',()=>{
  expect(()=>createStaffAuthority({uid:'',email:'badloar@gmail.com'})).toThrow();
  expect(()=>createStaffAuthority({uid:'attacker',email:'other@example.com'})).toThrow();
 });
 test('request data cannot choose approver UID',()=>{
  const policy=createStaffAuthority({uid:'owner-1',email:'badloar@gmail.com'});
  expect(()=>policy.decide({uid:'attacker',emailVerified:true},req,'approve','',1001)).toThrow();
  const approved=policy.decide({uid:'owner-1',emailVerified:true},req,'approve','',1001);
  expect(approved.decision?.ownerUid).toBe('owner-1');
 });
 test('configuration captured by value, not caller-mutable reference',()=>{
  const config={uid:'owner-1',email:'badloar@gmail.com'};const policy=createStaffAuthority(config);config.uid='attacker';
  expect(()=>policy.decide({uid:'attacker',emailVerified:true},req,'approve','',1001)).toThrow();
 });
});
