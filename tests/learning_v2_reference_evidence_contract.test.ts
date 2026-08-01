import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  evaluateReferenceEvidencePack,
  SELECTED_REFERENCE_MODE_IDS,
} from '../modules/learning-v2/reference-evidence/reference_evidence_gate';

const PREVIEW_STATES = ['prompt', 'active', 'processing', 'success', 'needs_work', 'recovery'];

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createEvidenceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-reference-evidence-'));
}

function writeValidMode(rootDir: string, modeId: string, reviewStatus: 'approved' | 'changes_requested' = 'approved'): void {
  const evidenceDir = path.join(rootDir, 'docs', 'v2', 'reference-evidence');
  const rawRelativePath = `qa-artifacts/learning-v2/reference-evidence/synthetic/${modeId}.json`;
  const rawPath = path.join(rootDir, rawRelativePath);
  const sheetPath = path.join(evidenceDir, 'contact-sheets', `${modeId}.png`);
  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  fs.mkdirSync(path.dirname(sheetPath), { recursive: true });
  fs.writeFileSync(rawPath, `${modeId}-raw`);
  fs.writeFileSync(sheetPath, `${modeId}-sheet`);

  const ledgerPath = path.join(evidenceDir, 'activity-mode-capture-ledger.json');
  const reviewPath = path.join(evidenceDir, 'activity-mode-ui-review.json');
  const ledger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
    : { selectedModes: SELECTED_REFERENCE_MODE_IDS.map((id) => ({ modeId: id, captures: [] })) };
  const reviews = fs.existsSync(reviewPath)
    ? JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
    : { decisions: [] };
  const mode = ledger.selectedModes.find((candidate: { modeId: string }) => candidate.modeId === modeId);
  mode.captures = [{
    sourceTier: 'A_first_hand_current', evidenceId: `${modeId}-evidence`, product: 'Synthetic',
    activityName: modeId, platform: 'ios', device: 'Synthetic device', osVersion: '1',
    appVersionBuild: '1', locale: 'en', learnerLevel: 'A1', accountSubscriptionState: 'free',
    captureDate: '2026-07-18', captureMethod: 'first_hand', sourceProvenance: 'test',
    rightsUseNote: 'test-only', researcher: 'test', rawArtifactPath: rawRelativePath,
    rawSha256: sha256(fs.readFileSync(rawPath)),
    states: [{ previewState: 'prompt' }, { previewState: 'active' }, { previewState: 'success' }],
  }];
  const decision = {
    modeId, status: reviewStatus, wireframeRevision: '1', wireframeSha256: sha256(fs.readFileSync(sheetPath)),
    reviewer: 'test', reviewedAt: '2026-07-18T00:00:00.000Z', notes: 'test', distinctivenessReview: 'test',
    conditionCoverage: {
      connectivity: ['online', 'offline'], microphone: ['granted', 'denied', 'unavailable'],
      signal: ['clean', 'noisy', 'silence', 'not_applicable'],
      scorerOutcome: ['pass', 'needs_work', 'uncertain', 'system_invalid', 'not_applicable'],
      motion: ['full', 'reduced'], textScalePercent: ['100', '150', '200'], colorScheme: ['light', 'dark'],
    },
    frameCount: 6, previewStates: PREVIEW_STATES, competitorAssetDependencies: 0,
  };
  const priorDecisionIndex = reviews.decisions.findIndex((candidate: { modeId: string }) => candidate.modeId === modeId);
  if (priorDecisionIndex === -1) reviews.decisions.push(decision);
  else reviews.decisions[priorDecisionIndex] = decision;
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
  fs.writeFileSync(reviewPath, JSON.stringify(reviews));
}

describe('Learning V2 reference evidence gate', () => {
  const rootDir = path.resolve(process.cwd());

  it('keeps the exact selected mode set under one fail-closed gate', () => {
    expect(SELECTED_REFERENCE_MODE_IDS).toEqual([
      'sound-discrimination',
      'guided-phrase-pronunciation',
      'prompted-translation-by-voice',
      'contextual-dialogue-mission',
    ]);
  });

  it('reports the current pack as blocked without inventing first-hand evidence or approval', () => {
    const result = evaluateReferenceEvidencePack(rootDir);

    expect(result.ready).toBe(false);
    for (const modeId of SELECTED_REFERENCE_MODE_IDS) {
      expect(result.blockers).toContain(`${modeId}:lawful_first_hand_capture_missing`);
      expect(result.blockers).toContain(`${modeId}:contact_sheet_missing`);
      expect(result.blockers).toContain(`${modeId}:current_owner_approval_missing`);
    }
    expect(result.blockers).not.toContain('selected_mode_set_mismatch');
  });

  it('cannot be promoted by a provisional Markdown statement', () => {
    const result = evaluateReferenceEvidencePack(rootDir);

    expect(result.blockers.filter((code) => code.endsWith(':current_owner_approval_missing'))).toHaveLength(
      4,
    );
    expect(result.ready).toBe(false);
  });

  it('reports three exact blockers for every mode in an empty pack while preserving aggregate failure', () => {
    const rootDir = createEvidenceRoot();
    try {
      const result = evaluateReferenceEvidencePack(rootDir);

      expect(result.ready).toBe(false);
      for (const modeId of SELECTED_REFERENCE_MODE_IDS) {
        expect(result.modeResults[modeId]).toEqual({
          ready: false,
          blockers: [
            `${modeId}:lawful_first_hand_capture_missing`,
            `${modeId}:contact_sheet_missing`,
            `${modeId}:current_owner_approval_missing`,
          ],
        });
      }
      expect(result.blockers).toEqual([
        'capture_ledger_missing',
        'ui_review_missing',
        'selected_mode_set_mismatch',
        ...SELECTED_REFERENCE_MODE_IDS.flatMap((modeId) => [
          `${modeId}:lawful_first_hand_capture_missing`,
          `${modeId}:contact_sheet_missing`,
          `${modeId}:current_owner_approval_missing`,
        ]),
      ]);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('unblocks only one fully valid mode while the other three and aggregate remain blocked', () => {
    const rootDir = createEvidenceRoot();
    try {
      const readyMode = SELECTED_REFERENCE_MODE_IDS[0];
      writeValidMode(rootDir, readyMode);
      const result = evaluateReferenceEvidencePack(rootDir);

      expect(result.modeResults[readyMode]).toEqual({ ready: true, blockers: [] });
      for (const modeId of SELECTED_REFERENCE_MODE_IDS.slice(1)) {
        expect(result.modeResults[modeId].ready).toBe(false);
      }
      expect(result.ready).toBe(false);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('marks every mode and the aggregate ready only when all four modes are valid', () => {
    const rootDir = createEvidenceRoot();
    try {
      for (const modeId of SELECTED_REFERENCE_MODE_IDS) writeValidMode(rootDir, modeId);
      const result = evaluateReferenceEvidencePack(rootDir);

      expect(result.modeResults).toEqual(
        Object.fromEntries(SELECTED_REFERENCE_MODE_IDS.map((modeId) => [modeId, { ready: true, blockers: [] }])),
      );
      expect(result).toMatchObject({ ready: true, blockers: [] });
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('fails closed for every mode when the shared ledger has an unexpected selected mode', () => {
    const rootDir = createEvidenceRoot();
    try {
      for (const modeId of SELECTED_REFERENCE_MODE_IDS) writeValidMode(rootDir, modeId);
      const ledgerPath = path.join(rootDir, 'docs', 'v2', 'reference-evidence', 'activity-mode-capture-ledger.json');
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      ledger.selectedModes.push({ modeId: 'unexpected-mode', captures: [] });
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger));

      const result = evaluateReferenceEvidencePack(rootDir);

      expect(result.blockers).toEqual(['selected_mode_set_mismatch']);
      for (const modeId of SELECTED_REFERENCE_MODE_IDS) {
        expect(result.modeResults[modeId]).toEqual({ ready: false, blockers: [] });
      }
      expect(result.ready).toBe(false);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it.each(['stale_hash', 'changes_requested'] as const)(
    'keeps other modes ready when only one mode has %s',
    (failure) => {
      const rootDir = createEvidenceRoot();
      try {
        for (const modeId of SELECTED_REFERENCE_MODE_IDS) writeValidMode(rootDir, modeId);
        const targetMode = SELECTED_REFERENCE_MODE_IDS[0];
        if (failure === 'stale_hash') {
          fs.writeFileSync(path.join(rootDir, 'docs', 'v2', 'reference-evidence', 'contact-sheets', `${targetMode}.png`), 'changed');
        } else {
          writeValidMode(rootDir, targetMode, 'changes_requested');
        }
        const result = evaluateReferenceEvidencePack(rootDir);

        expect(result.modeResults[targetMode]).toEqual({
          ready: false,
          blockers: [targetMode + (failure === 'stale_hash' ? ':approval_stale_hash' : ':current_owner_approval_missing')],
        });
        for (const modeId of SELECTED_REFERENCE_MODE_IDS.slice(1)) {
          expect(result.modeResults[modeId]).toEqual({ ready: true, blockers: [] });
        }
        expect(result.ready).toBe(false);
      } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
      }
    },
  );

  const strictGate = process.env.PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL === '1' ? it : it.skip;
  strictGate('has lawful current capture, original sheets, and fresh owner approval', () => {
    const result = evaluateReferenceEvidencePack(rootDir);
    expect(result.blockers).toEqual([]);
    expect(result.ready).toBe(true);
  });
});
