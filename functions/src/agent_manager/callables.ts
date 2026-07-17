import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { requireAgentOfficeOwner, type AgentOfficeAuth } from '../agent_office/auth';
import { FirestoreAgentManagerRepository } from './firestore_repository';
import { AgentManagerLedger } from './ledger';
import { inboxSourceRef, parseAgentManagerInboxRequest } from './intake';

const OPTIONS = Object.freeze({ region: 'us-central1', enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '256MiB' as const });
export const AGENT_MANAGER_INTAKE_HMAC_KEY = defineSecret('AGENT_MANAGER_INTAKE_HMAC_KEY');
function ledger(): AgentManagerLedger { return new AgentManagerLedger(new FirestoreAgentManagerRepository(admin.firestore())); }
function auth(request: { auth?: { uid?: string; token?: Record<string, unknown> } | null }): AgentOfficeAuth | null { return request.auth ? { uid: request.auth.uid, token: request.auth.token } : null; }

export const agentManagerCreateTask = onCall(OPTIONS, async (request) => ledger().createTask(auth(request), request.data));
export const agentManagerTransitionTask = onCall(OPTIONS, async (request) => ledger().transitionTask(auth(request), request.data));
export const agentManagerListTasks = onCall(OPTIONS, async (request) => ledger().listTasks(auth(request), request.data));
export const agentManagerListAgents = onCall(OPTIONS, async (request) => ledger().listAgents(auth(request), request.data));
export const agentManagerListRunbooks = onCall(OPTIONS, async (request) => ledger().listRunbooks(auth(request)));
export const agentManagerInitializeRoster = onCall(OPTIONS, async (request) => ledger().initializeRoster(auth(request)));
export const agentManagerCreateInboxTask = onCall({ ...OPTIONS, secrets: [AGENT_MANAGER_INTAKE_HMAC_KEY] }, async (request) => {
  requireAgentOfficeOwner(auth(request));
  const input = parseAgentManagerInboxRequest(request.data);
  const sourceCollection = input.sourceType === 'support' ? 'support_inbox' : input.reportSource!;
  const source = await admin.firestore().collection(sourceCollection).doc(input.sourceId).get();
  if (!source.exists) throw new HttpsError('not-found', 'inbox source not found');
  const sourceRef = inboxSourceRef(input, String(AGENT_MANAGER_INTAKE_HMAC_KEY.value() || '').trim());
  return ledger().createInboxTask(auth(request), {
    sourceType: input.sourceType,
    sourceRef,
    reportSource: input.reportSource,
    // Kept solely in the server-only link document; task/UI/Telegram retain the HMAC reference.
    sourceDocumentId: input.sourceId,
  });
});
