export type GenerationCheckpointAction =
  | { readonly action: 'replay' }
  | { readonly action: 'resume'; readonly payload: unknown; readonly qaReceipt: Record<string, unknown> }
  | { readonly action: 'busy' }
  | { readonly action: 'generate' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertGenerationCheckpointIdentity(
  data: unknown,
  expected: { unitId: string; jobId: string; studyTarget: string; learnerSourceLocale: string; surface: string; lessonId: number },
): void {
  if (!isRecord(data) || data.unitId !== expected.unitId || data.jobId !== expected.jobId || data.studyTarget !== expected.studyTarget || data.learnerSourceLocale !== expected.learnerSourceLocale || data.surface !== expected.surface || data.lessonId !== expected.lessonId) {
    throw new Error('generation_checkpoint_identity_mismatch');
  }
}

export function chooseGenerationCheckpointAction(data: unknown, nowMs: number): GenerationCheckpointAction {
  if (!isRecord(data)) return Object.freeze({ action: 'generate' });
  if (data.state === 'succeeded') return Object.freeze({ action: 'replay' });
  if (data.state === 'generated' && isRecord(data.generatedPayload) && isRecord(data.qaReceipt) && data.qaReceipt.status === 'passed') {
    return Object.freeze({ action: 'resume', payload: data.generatedPayload, qaReceipt: data.qaReceipt });
  }
  if (data.state === 'running' && Number.isFinite(Number(data.leaseExpiresAtMs)) && Number(data.leaseExpiresAtMs) > nowMs) return Object.freeze({ action: 'busy' });
  return Object.freeze({ action: 'generate' });
}
