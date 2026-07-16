/**
 * Semantic Firestore Rules gate for the eight server-only Agent Office roots.
 *
 * Usage:
 *   firebase emulators:exec --only firestore --project demo-agent-office \
 *     "node functions/scripts/e2e_agent_office_rules_emulator.cjs"
 *
 * The script deliberately uses the Firestore REST client surface instead of the
 * Admin SDK so every request is evaluated by firestore.rules. It refuses to run
 * unless firebase emulators:exec supplies FIRESTORE_EMULATOR_HOST.
 */
'use strict';

const host = String(process.env.FIRESTORE_EMULATOR_HOST || '').trim();
if (!host) {
  console.error('REFUSING TO RUN: FIRESTORE_EMULATOR_HOST is not set.');
  process.exit(2);
}

const projectId = String(process.env.GCLOUD_PROJECT || 'demo-agent-office').trim();
const baseUrl = `http://${host}/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;

const AGENT_OFFICE_ROOTS = Object.freeze([
  'agent_cases',
  'agent_recommendations',
  'agent_approvals',
  'agent_tasks',
  'agent_audit_events',
  'agent_office_control',
  'agent_telegram_tokens',
  'agent_observation_receipts',
]);

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createAdminEmulatorToken() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'none', typ: 'JWT' });
  const payload = base64UrlJson({
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    auth_time: nowSeconds,
    user_id: 'agent-office-rules-owner',
    sub: 'agent-office-rules-owner',
    iat: nowSeconds,
    exp: nowSeconds + 60 * 60,
    admin: true,
    adminRole: 'owner',
    firebase: { identities: {}, sign_in_provider: 'custom' },
  });
  return `${header}.${payload}.`;
}

const clients = Object.freeze([
  { name: 'anonymous', authorization: null },
  { name: 'admin-shaped', authorization: `Bearer ${createAdminEmulatorToken()}` },
]);

function documentUrl(path) {
  return `${baseUrl}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

async function requestDocument(method, path, authorization) {
  const headers = {};
  if (authorization) headers.Authorization = authorization;
  if (method === 'PATCH') headers['Content-Type'] = 'application/json';

  const response = await fetch(documentUrl(path), {
    method,
    headers,
    body: method === 'PATCH'
      ? JSON.stringify({ fields: { semanticRulesProbe: { booleanValue: true } } })
      : undefined,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function describeResponse(result) {
  const status = result.body && result.body.error && result.body.error.status;
  const message = result.body && result.body.error && result.body.error.message;
  return JSON.stringify({ httpStatus: result.status, status, message });
}

function isPermissionDenied(result) {
  return result.status === 403
    && result.body
    && result.body.error
    && result.body.error.status === 'PERMISSION_DENIED';
}

async function assertAdminTokenReachesRules(adminClient) {
  const probePath = `agent_office_rules_probe/admin-token-${process.pid}`;
  const write = await requestDocument('PATCH', probePath, adminClient.authorization);
  if (write.status < 200 || write.status >= 300) {
    throw new Error(`Admin-shaped token was not accepted on control path: ${describeResponse(write)}`);
  }

  const read = await requestDocument('GET', probePath, adminClient.authorization);
  if (read.status !== 200) {
    throw new Error(`Admin-shaped token could not read control path: ${describeResponse(read)}`);
  }

  const cleanup = await requestDocument('DELETE', probePath, adminClient.authorization);
  if (cleanup.status < 200 || cleanup.status >= 300) {
    throw new Error(`Could not clean local control path: ${describeResponse(cleanup)}`);
  }
}

async function main() {
  const adminClient = clients.find((client) => client.name === 'admin-shaped');
  await assertAdminTokenReachesRules(adminClient);

  const failures = [];
  let checks = 0;

  for (const root of AGENT_OFFICE_ROOTS) {
    const paths = [
      `${root}/direct-${process.pid}`,
      `${root}/parent-${process.pid}/nested/child-${process.pid}`,
    ];
    for (const path of paths) {
      for (const client of clients) {
        for (const method of ['GET', 'PATCH']) {
          const result = await requestDocument(method, path, client.authorization);
          checks += 1;
          if (!isPermissionDenied(result)) {
            failures.push({ root, path, client: client.name, method, response: describeResponse(result) });
          }
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length}/${checks} Agent Office rule checks did not return PERMISSION_DENIED.`);
    for (const failure of failures) console.error(JSON.stringify(failure));
    process.exit(1);
  }

  console.log(`PASS: ${checks}/${checks} semantic Agent Office rule checks returned PERMISSION_DENIED.`);
  console.log('Covered 8 roots, direct+nested documents, read+write, anonymous+admin-shaped clients.');
}

main().catch((error) => {
  console.error('Agent Office rules emulator gate crashed:', error);
  process.exit(3);
});
