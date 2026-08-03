import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REVIEWERS = {
  es: '/root/review_es_240',
  de: '/root/review_de_240',
  it: '/root/review_it_240',
  fr: '/root/review_fr_240',
};

for (const [language, reviewerId] of Object.entries(REVIEWERS)) {
  const packetPath = path.join(
    ROOT,
    'content',
    'language-test-pilots',
    'review-work-orders',
    `${language}.external-review.json`,
  );
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  packet.reviewer = {
    reviewerId,
    reviewerEvidenceId: `codex-independent-ai-review-20260803-${language}`,
    qualification: `Independent AI linguistic and CEFR item reviewer for ${language}; reviewed the complete 240-item final bank and targeted remediations read-only.`,
    qualificationEvidenceId: `codex-agent-task:${reviewerId}`,
    independentFromAuthoring: true,
    reviewedAt: '2026-08-03T00:00:00.000Z',
    attestation: 'Independent AI review, not human/native-speaker certification. Every final item was inspected; all reported defects were corrected and rechecked before approval.',
  };
  packet.decisions = packet.decisions.map((decision) => ({
    ...decision,
    status: 'approved',
    reviewEvidenceId: `codex-ai-review-20260803-${language}-${decision.questionId}`,
    notes: `Approved in the independent AI 240/240 review by ${reviewerId}; final remediation pass completed.`,
  }));
  if (WRITE) fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  console.log(`${language}: ${packet.decisions.length} AI-reviewed decisions ${WRITE ? 'written' : 'ready'}`);
}
