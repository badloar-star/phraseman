import { parseAndValidatePmBriefJson, sanitizePmMarkdown } from './admin_pm_generation';

const evidenceIds = new Set(['ev-1']);
const codexIds = new Set(['screen:/home']);

test('parses and validates strict PM JSON with evidence and Codex provenance', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    mode: 'coverage_only',
    executiveSummary: 'Coverage only.',
    article: 'Coverage only.',
    observations: [{ id: 'obs-1', text: 'Observed.', evidenceIds: ['ev-1'], codexEntityIds: ['screen:/home'], confidence: 0.7 }],
    risks: [],
    questionsForOwner: [],
    blindSpots: ['RevenueCat unavailable'],
    hypotheses: [],
    recommendations: [],
    ideas: [],
    experiments: [],
  });
  expect(parseAndValidatePmBriefJson(raw, evidenceIds, codexIds).ok).toBe(true);
});

test('rejects unknown evidence ids before persistence', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    mode: 'coverage_only',
    executiveSummary: 'Bad.',
    article: 'Bad.',
    observations: [{ id: 'obs-1', text: 'Observed.', evidenceIds: ['missing'], codexEntityIds: ['screen:/home'], confidence: 0.7 }],
    risks: [],
    questionsForOwner: [],
    blindSpots: [],
    hypotheses: [],
    recommendations: [],
    ideas: [],
    experiments: [],
  });
  expect(parseAndValidatePmBriefJson(raw, evidenceIds, codexIds)).toMatchObject({ ok: false });
});

test('sanitizes executable HTML and unsafe URLs from model Markdown', () => {
  expect(sanitizePmMarkdown('<script>alert(1)</script> [x](javascript:alert(1)) <iframe src=x></iframe>')).toBe('alert(1) [x](#) ');
  expect(sanitizePmMarkdown('<b onclick="x()">ok</b> [safe](https://example.com)')).toBe('ok [safe](https://example.com)');
});
