import { beginExecution, decideRequest, DeliveryReceipt, StaffCommand, StaffIdentity, StaffMember, StaffRequest, assertOwner } from './admin_staff_contract';
import { reviewTaskReport, StaffTask } from './admin_staff_tasks_contract';

/** Server-only composition. Resolve UID from trusted Firebase Auth configuration,
 * never from a callable payload. This factory does not authenticate configuration. */
export function createStaffAuthority(config: Readonly<{uid:string;email:string}>) {
  if (config.email !== 'badloar@gmail.com') throw new Error('unconfirmed_owner');
  const uid = config.uid;
  assertOwner({uid, emailVerified:true}, uid);
  return Object.freeze({
    decide(identity:StaffIdentity|null, request:StaffRequest, decision:'approve'|'reject'|'return', comment:string, nowMs:number):StaffRequest {
      return decideRequest(identity, uid, request, decision, comment, nowMs);
    },
    execute(request:StaffRequest, member:StaffMember, command:StaffCommand, targetVersion:string, receipt:DeliveryReceipt|null, nowMs:number):StaffRequest {
      return beginExecution(request, member, command, targetVersion, receipt, nowMs, {uid});
    },
    review(identity:StaffIdentity|null, task:StaffTask, decision:'accept'|'return', comment:string, nowMs:number):StaffTask {
      return reviewTaskReport(identity, uid, task, decision, comment, nowMs);
    },
  });
}
