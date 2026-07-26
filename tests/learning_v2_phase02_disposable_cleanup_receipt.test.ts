import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const RECEIPT_PATH = path.join(
  ROOT,
  'docs',
  'v2',
  'evidence',
  'phase-02',
  '2026-07-18-disposable-app-check-cleanup-receipt.v1.json',
);

type JsonObject = Record<string, unknown>;

function expectExactKeys(value: JsonObject, keys: string[]): void {
  expect(Object.keys(value).sort()).toEqual([...keys].sort());
}

function loadReceipt(): JsonObject {
  return JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8')) as JsonObject;
}

describe('Learning V2 Phase 02 disposable App Check cleanup receipt', () => {
  it('retains one structured day-precision attestation instead of claiming a fresh provider query', () => {
    const receipt = loadReceipt();

    expectExactKeys(receipt, [
      'schema',
      'receiptId',
      'attestedOn',
      'timePrecision',
      'evidenceBasis',
      'freshProviderQueryPerformed',
      'scope',
      'transportOutcomes',
      'cleanup',
      'productionBoundary',
      'evidenceSummaries',
      'redactions',
    ]);
    expect(receipt).toMatchObject({
      schema: 'phraseman.learning-v2.disposable-app-check-cleanup-receipt.v1',
      receiptId: 'phase02-disposable-app-check-cleanup-20260718',
      attestedOn: '2026-07-18',
      timePrecision: 'day',
      evidenceBasis: 'retained_sanitized_handover_attestation',
      freshProviderQueryPerformed: false,
    });
  });

  it('pins the exact disposable project, callable, environment, and transport outcomes', () => {
    const receipt = loadReceipt();
    const scope = receipt.scope as JsonObject;

    expectExactKeys(scope, [
      'projectId',
      'projectNumber',
      'region',
      'callable',
      'environment',
    ]);
    expect(scope).toEqual({
      projectId: 'phraseman-v2-ac-test-20260718',
      projectNumber: '769668545998',
      region: 'us-central1',
      callable: 'v2ProgressTransport',
      environment: 'disposable_non_production',
    });

    expect(receipt.transportOutcomes).toEqual([
      {
        appCheck: 'missing',
        httpStatus: 401,
        outcome: 'UNAUTHENTICATED',
      },
      {
        appCheck: 'invalid',
        httpStatus: 401,
        outcome: 'UNAUTHENTICATED',
      },
      {
        appCheck: 'authentic',
        requestBody: 'malformed',
        httpStatus: 400,
        outcome: 'INVALID_ARGUMENT',
      },
    ]);
    for (const outcome of receipt.transportOutcomes as JsonObject[]) {
      expectExactKeys(
        outcome,
        outcome.appCheck === 'authentic'
          ? ['appCheck', 'requestBody', 'httpStatus', 'outcome']
          : ['appCheck', 'httpStatus', 'outcome'],
      );
    }
  });

  it('records complete cleanup and a fail-closed production boundary', () => {
    const receipt = loadReceipt();
    const cleanup = receipt.cleanup as JsonObject;
    const artifactPolicy = cleanup.artifactRegistryPolicy as JsonObject;
    const productionBoundary = receipt.productionBoundary as JsonObject;

    expectExactKeys(cleanup, [
      'remainingFunctions',
      'remainingDebugTokenResources',
      'temporaryAuthUsersRemaining',
      'anonymousAuthEnabled',
      'artifactRegistryPolicy',
    ]);
    expect(cleanup).toMatchObject({
      remainingFunctions: 0,
      remainingDebugTokenResources: 0,
      temporaryAuthUsersRemaining: 0,
      anonymousAuthEnabled: false,
    });
    expectExactKeys(artifactPolicy, ['deleteArtifactsOlderThanDays']);
    expect(artifactPolicy).toEqual({ deleteArtifactsOlderThanDays: 1 });

    expectExactKeys(productionBoundary, [
      'projectTouched',
      'functionDeployed',
      'firestoreWritten',
      'rulesChanged',
      'indexesChanged',
      'callableExported',
    ]);
    expect(productionBoundary).toEqual({
      projectTouched: false,
      functionDeployed: false,
      firestoreWritten: false,
      rulesChanged: false,
      indexesChanged: false,
      callableExported: false,
    });
  });

  it('keeps only bounded summaries and explicit redaction metadata', () => {
    const receipt = loadReceipt();
    const summaries = receipt.evidenceSummaries as JsonObject[];
    const redactions = receipt.redactions as JsonObject;

    expect(summaries).toHaveLength(2);
    expect(summaries).toEqual([
      {
        sourcePath: 'docs/v2/HANDOVER.md',
        sourceSection: '14.70 / Verified outcomes',
        summary:
          'Retained attestation records the disposable App Check transport outcomes and completed cleanup.',
      },
      {
        sourcePath: 'docs/v2/HANDOVER.md',
        sourceSection: '14.70 / Repository/release state',
        summary:
          'Retained attestation records no live disposable or production V2 progress endpoint and no production export.',
      },
    ]);
    for (const summary of summaries) {
      expectExactKeys(summary, ['sourcePath', 'sourceSection', 'summary']);
    }

    expectExactKeys(redactions, [
      'applied',
      'containsSecrets',
      'omittedCategories',
    ]);
    expect(redactions).toEqual({
      applied: true,
      containsSecrets: false,
      omittedCategories: [
        'jwt',
        'app_check_debug_secret',
        'api_key',
        'authorization_header',
        'firebase_auth_uid',
        'email',
        'billing_details',
        'dpapi_ciphertext',
        'raw_command_output',
      ],
    });
  });

  it('contains no secret values, identity values, headers, billing data, DPAPI material, or raw output', () => {
    const receipt = loadReceipt();
    const { omittedCategories: _omittedCategories, ...redactionFlags } =
      receipt.redactions as JsonObject;
    const scannableReceipt = {
      ...receipt,
      redactions: redactionFlags,
    };
    const serialized = JSON.stringify(scannableReceipt);

    expect(serialized).not.toMatch(
      /eyJ[A-Za-z0-9_-]{8,}|debug.?secret|api.?key|authorization|bearer|firebase.?auth.?uid|email|billing|dpapi|raw.?output/i,
    );
    expect(serialized).not.toMatch(/[A-Fa-f0-9]{32,}/);
  });
});
