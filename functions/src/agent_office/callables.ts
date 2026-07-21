import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from '../callable_options';
import type { AgentOfficeAuth } from './auth';
import { FirestoreAgentOfficeRepository } from './firestore_repository';
import { AgentOfficeLedger } from './ledger';

const OPTIONS = Object.freeze({
  region: 'us-central1',
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
});

function ledger(): AgentOfficeLedger {
  return new AgentOfficeLedger(new FirestoreAgentOfficeRepository(admin.firestore()));
}

function auth(request: { auth?: { uid?: string; token?: Record<string, unknown> } | null }): AgentOfficeAuth | null {
  if (!request.auth) return null;
  return { uid: request.auth.uid, token: request.auth.token };
}

export const agentOfficeListCases = onCall(OPTIONS, async (request) => ledger().listCases(auth(request), request.data));
export const agentOfficeGetCase = onCall(OPTIONS, async (request) => ledger().getCase(auth(request), request.data));
export const agentOfficeGetAggregateHealth = onCall(OPTIONS, async (request) => ledger().getAggregateHealth(auth(request)));
export const agentOfficeListRecommendations = onCall(OPTIONS, async (request) => ledger().listRecommendations(auth(request), request.data));
export const agentOfficeDecideRecommendation = onCall(OPTIONS, async (request) => ledger().decideRecommendation(auth(request), request.data));
export const agentOfficeListTasks = onCall(OPTIONS, async (request) => ledger().listTasks(auth(request), request.data));
export const agentOfficeListAuditEvents = onCall(OPTIONS, async (request) => ledger().listAuditEvents(auth(request), request.data));
export const agentOfficeGetControl = onCall(OPTIONS, async (request) => ledger().getControl(auth(request)));
export const agentOfficeSetKillSwitch = onCall(OPTIONS, async (request) => ledger().setKillSwitch(auth(request), request.data));
