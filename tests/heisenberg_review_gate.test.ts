declare const require: any;

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const review = require('../scripts/lib/heisenberg_review_core.cjs');

const CANDIDATE = {
  schema: 'heisenberg-filled-row-v1',
  id: 'ui-1',
  file: 'constants/i18n.ts',
  keyPath: 'save.ru',
  sourceLocale: 'ru',
  targetLocale: 'pt-BR',
  sourceText: 'Сохранить',
  sourceTexts: { ru: 'Сохранить', uk: 'Зберегти' },
  targetText: 'Salvar',
  status: 'GO',
  machineGenerated: true,
  humanApproved: false,
  reviewerImportAllowed: false,
  productionApplyAllowed: false,
  activationApproved: false,
};

describe('Heisenberg human review gate', () => {
  it('never allows a machine-only GO row to reach apply', () => {
    expect(review.isApplyApproved(CANDIDATE)).toBe(false);
  });

  it('promotes only a human decision bound to the immutable candidate', () => {
    const packet = review.buildReviewPacketRow(CANDIDATE);
    const result = review.finalizeReview([CANDIDATE], [packet], [{
      id: CANDIDATE.id,
      verdict: 'APPROVE',
      reviewerId: 'linguist-ptbr-01',
      reviewedAt: '2026-07-11T19:00:00.000Z',
      note: 'Natural and accurate mobile label.',
      bindingHash: packet.bindingHash,
    }]);

    expect(result.problems).toEqual([]);
    expect(result.approved).toHaveLength(1);
    expect(review.isApplyApproved(result.approved[0])).toBe(true);
    expect(result.approved[0]).toMatchObject({
      humanApproved: true,
      reviewerImportAllowed: true,
      integrationApplyAllowed: true,
      productionApplyAllowed: false,
      activationApproved: false,
    });
  });

  it('rejects tampered packets, copied hashes, HOLD and missing decisions fail-closed', () => {
    const packet = review.buildReviewPacketRow(CANDIDATE);
    const tampered = { ...packet, targetText: 'Guardar' };
    const result = review.finalizeReview([CANDIDATE], [tampered], [{
      id: CANDIDATE.id,
      verdict: 'APPROVE',
      reviewerId: 'reviewer',
      reviewedAt: '2026-07-11T19:00:00.000Z',
      note: 'approved',
      bindingHash: packet.bindingHash,
    }]);
    expect(result.approved).toEqual([]);
    expect(result.problems.map((problem: any) => problem.code)).toContain('packet-binding-mismatch');

    const missing = review.finalizeReview([CANDIDATE], [packet], []);
    expect(missing.problems).toEqual([{ id: CANDIDATE.id, code: 'missing-decision' }]);
  });

  it('quarantines every provisional approval when any row is missing a decision', () => {
    const second = { ...CANDIDATE, id: 'ui-2', keyPath: 'cancel.ru', sourceText: 'Отмена', targetText: 'Cancelar' };
    const packet = review.buildReviewPacketRow(CANDIDATE);
    const result = review.finalizeReview(
      [CANDIDATE, second],
      [packet, review.buildReviewPacketRow(second)],
      [{
        id: CANDIDATE.id,
        verdict: 'APPROVE',
        reviewerId: 'reviewer',
        reviewedAt: '2026-07-11T19:00:00.000Z',
        note: 'approved',
        bindingHash: packet.bindingHash,
      }],
    );
    expect(result.approved).toEqual([]);
    expect(result.quarantinedApproved).toHaveLength(1);
    expect(result.problems).toContainEqual({ id: second.id, code: 'missing-decision' });
  });

  it('apply dry-run reports and rejects a machine-only GO ledger', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heisenberg-review-apply-'));
    const ledger = path.join(dir, 'machine_rows.jsonl');
    const report = path.join(dir, 'apply_report.json');
    fs.writeFileSync(ledger, `${JSON.stringify(CANDIDATE)}\n`, 'utf8');
    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'heisenberg_apply_translations.mjs'),
      '--ledger', ledger,
      '--locale', 'pt-BR',
      '--out', report,
    ], { encoding: 'utf8', windowsHide: true });

    expect(result.status).toBe(0);
    expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({
      applied: 0,
      dryRunInsert: 0,
      rejectedUnapproved: 1,
      activationApproved: false,
    });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('approves existing runtime copy only for runtime evidence, never for apply', () => {
    const existing = {
      ...CANDIDATE,
      schema: 'heisenberg-existing-runtime-review-candidate-v1',
      id: 'existing:save',
      origin: 'existing-runtime',
      status: 'EXISTING_NEEDS_REVIEW',
      integrated: true,
      keyPath: 'save.pt-BR',
      targetItemId: 'target-save',
      targetItemKeyPath: 'save.pt-BR',
      machineGenerated: false,
    };
    const packet = review.buildReviewPacketRow(existing);
    const result = review.finalizeReview([existing], [packet], [{
      id: existing.id,
      verdict: 'APPROVE',
      reviewerId: 'linguist-ptbr-01',
      reviewedAt: '2026-07-11T20:30:00.000Z',
      note: 'Natural Brazilian Portuguese UI copy.',
      bindingHash: packet.bindingHash,
    }]);
    expect(result.problems).toEqual([]);
    expect(result.approved[0]).toMatchObject({
      humanApproved: true,
      runtimeReviewApproved: true,
      reviewerImportAllowed: false,
      integrationApplyAllowed: false,
      activationApproved: false,
    });
    expect(review.isApplyApproved(result.approved[0])).toBe(false);
  });
});
