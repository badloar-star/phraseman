import fs from 'fs';
import path from 'path';

import { getDiagnosisTraining } from '../app/diagnosis_trainings';
import {
  ACTIVE_PERSONAL_TRAINING_IDS,
  choosePersonalTrainingCandidate,
  getFirstUnmetPersonalTrainingPrerequisite,
  JESSE_REWORKED_MARKER,
  PERSONAL_TRAINING_CEFR_ORDER,
  PERSONAL_TRAINING_TAXONOMY,
} from '../app/personal_training_taxonomy';

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'tools', 'personal_training_agent_room', 'reports');

const PASS_VERDICT_PATTERNS = [
  /manual qa result:\s*pass/i,
  /report status:\s*pass/i,
  /status:\s*pass(?:[\s.]|for)/i,
  /## qa verdict[\s\S]{0,200}\bpass\b/i,
  /## verdict[\s\S]{0,120}\bpass\b/i,
];

function hasExplicitPass(content: string): boolean {
  return PASS_VERDICT_PATTERNS.some((pattern) => pattern.test(content));
}

function getPassIdsFromReports(): string[] {
  return fs
    .readdirSync(REPORTS_DIR)
    .filter((file) => file.endsWith('-qa.md'))
    .filter((file) => hasExplicitPass(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf8')))
    .map((file) => file.replace(/-qa\.md$/, ''))
    .sort();
}

describe('personal training taxonomy', () => {
  it('marks only explicit QA PASS room reports as active', () => {
    const activeIds = [...ACTIVE_PERSONAL_TRAINING_IDS].sort();

    expect(activeIds).toEqual(getPassIdsFromReports());
  });

  it('keeps active taxonomy entries connected to active app trainings', () => {
    for (const entry of PERSONAL_TRAINING_TAXONOMY.filter((item) => item.status === 'active')) {
      const training = getDiagnosisTraining(entry.id);

      expect(training).toBeTruthy();
      expect(training?.status).toBe('active');
      expect(entry.qaStatus).toBe('PASS');
      expect(entry.jesseStatus).toBe('reworked');
      expect(entry.jesseMarker).toBe(JESSE_REWORKED_MARKER);
      expect(fs.existsSync(path.join(ROOT, entry.appPath))).toBe(true);
      expect(fs.existsSync(path.join(ROOT, entry.sourceDraft))).toBe(true);
      expect(fs.existsSync(path.join(ROOT, entry.qaReport))).toBe(true);
    }
  });

  it('requires the Jesse marker inside every reworked app file', () => {
    for (const entry of PERSONAL_TRAINING_TAXONOMY.filter((item) => item.jesseStatus === 'reworked')) {
      const appFile = fs.readFileSync(path.join(ROOT, entry.appPath), 'utf8');

      expect(appFile).toContain(JESSE_REWORKED_MARKER);
    }
  });

  it('does not let unmarked app trainings count as Jesse-reworked', () => {
    const markedIds = new Set<string>(
      PERSONAL_TRAINING_TAXONOMY
        .filter((item) => item.jesseStatus === 'reworked')
        .map((item) => item.id),
    );
    const markedFilesOutsideTaxonomy = fs
      .readdirSync(path.join(ROOT, 'app'))
      .filter((file) => /^diagnosis_training_.+\.ts$/.test(file))
      .filter((file) => fs.readFileSync(path.join(ROOT, 'app', file), 'utf8').includes(JESSE_REWORKED_MARKER))
      .map((file) => file.replace(/^diagnosis_training_/, '').replace(/\.ts$/, ''))
      .filter((id) => !markedIds.has(id));

    expect(markedFilesOutsideTaxonomy).toEqual([]);
  });

  it('keeps Cambridge/CEFR placement metadata complete and connected', () => {
    const activeIds = new Set(ACTIVE_PERSONAL_TRAINING_IDS);
    const byId = new Map<string, (typeof PERSONAL_TRAINING_TAXONOMY)[number]>(
      PERSONAL_TRAINING_TAXONOMY.map((item) => [item.id, item]),
    );

    for (const entry of PERSONAL_TRAINING_TAXONOMY.filter((item) => item.status === 'active')) {
      expect(entry.cefrLevel).toMatch(/^(A1|A2|A2\+|B1|B1\+)$/);
      expect(entry.placementRisk).toMatch(/^(low|medium|high)$/);

      for (const prerequisite of entry.prerequisites) {
        const prerequisiteEntry = byId.get(prerequisite);

        expect(activeIds.has(prerequisite)).toBe(true);
        expect(prerequisiteEntry).toBeTruthy();
        expect(PERSONAL_TRAINING_CEFR_ORDER[prerequisiteEntry!.cefrLevel]).toBeLessThanOrEqual(
          PERSONAL_TRAINING_CEFR_ORDER[entry.cefrLevel],
        );
      }
    }
  });

  it('keeps Cambridge/CEFR prerequisites acyclic', () => {
    const byId = new Map<string, (typeof PERSONAL_TRAINING_TAXONOMY)[number]>(
      PERSONAL_TRAINING_TAXONOMY.map((item) => [item.id, item]),
    );
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) {
        return;
      }
      expect(visiting.has(id)).toBe(false);
      visiting.add(id);

      for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
        visit(prerequisite);
      }

      visiting.delete(id);
      visited.add(id);
    };

    for (const entry of PERSONAL_TRAINING_TAXONOMY) {
      visit(entry.id);
    }
  });

  it('routes high-risk Cambridge/CEFR topics through unmet prerequisites first', () => {
    expect(
      getFirstUnmetPersonalTrainingPrerequisite('present_perfect_vs_past_simple', new Set()),
    ).toBe('verb_past_simple_regular_irregular');
    expect(
      choosePersonalTrainingCandidate(['present_perfect_vs_past_simple'], new Set()),
    ).toBe('verb_past_simple_regular_irregular');
    expect(
      choosePersonalTrainingCandidate(
        ['present_perfect_vs_past_simple'],
        new Set(['verb_present_simple_statement', 'verb_past_simple_regular_irregular']),
      ),
    ).toBe('verb_present_perfect_basic');
    expect(
      choosePersonalTrainingCandidate(
        ['present_perfect_vs_past_simple'],
        new Set([
          'verb_present_simple_statement',
          'verb_past_simple_regular_irregular',
          'verb_present_perfect_basic',
        ]),
      ),
    ).toBe('present_perfect_vs_past_simple');
  });

  it('does not over-gate lower-risk A1/A2 topics', () => {
    expect(choosePersonalTrainingCandidate(['article_the_specific'], new Set())).toBe('article_the_specific');
    expect(choosePersonalTrainingCandidate(['modal_base_form'], new Set())).toBe('modal_base_form');
  });
});
