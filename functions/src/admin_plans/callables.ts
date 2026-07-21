import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from '../callable_options';
import type { AdminPlansAuth } from './auth';
import { FirestoreAdminPlansRepository } from './firestore_repository';
import { AdminPlansLedger } from './ledger';

const OPTIONS = Object.freeze({
  region: 'us-central1',
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
});

function ledger(): AdminPlansLedger {
  return new AdminPlansLedger(new FirestoreAdminPlansRepository(admin.firestore()));
}

function auth(request: {
  auth?: { uid?: string; token?: Record<string, unknown> } | null;
}): AdminPlansAuth | null {
  return request.auth ? { uid: request.auth.uid, token: request.auth.token } : null;
}

export const adminCreatePlan = onCall(OPTIONS,
  async (request) => ledger().createPlan(auth(request), request.data));
export const adminGetPlan = onCall(OPTIONS,
  async (request) => ledger().getPlan(auth(request), request.data));
export const adminListPlans = onCall(OPTIONS,
  async (request) => ledger().listPlans(auth(request), request.data));
