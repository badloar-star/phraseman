declare const require: any;

import {
  findPayloadMatchingQuizEntries,
  findPayloadMatchingQuizEntry,
} from '../scripts/heisenberg_semantic_audit';
import { buildQuizPayloadOrdinalRepairPlan } from '../scripts/heisenberg_quiz_payload_ordinal_repair_plan';

const semantic = require('../scripts/lib/heisenberg_semantic_core.cjs');

describe('heisenberg semantic audit helpers', () => {
  it('detects common mojibake patterns', () => {
    expect(semantic.hasMojibake('aÃ§Ã£o')).toBe(true);
    expect(semantic.hasMojibake('Äá»c sÃ¡ch')).toBe(true);
    expect(semantic.hasMojibake('Termo-chave em ingl?s')).toBe(true);
    expect(semantic.hasMojibake('Thu?t ng? ti?ng Anh c?n gi?')).toBe(true);
    expect(semantic.hasMojibake('Korunmas? gereken ?ngilizce terim')).toBe(true);
    expect(semantic.hasMojibake('acción correcta')).toBe(false);
    expect(semantic.hasMojibake('Did you use to live here?')).toBe(false);
    expect(semantic.hasMojibake('Did you use to live here? pergunta sobre uma situação habitual')).toBe(false);
  });

  it('extracts protected English terms from answer choices and base explanations', () => {
    const choices = ['Reading books helps me relax', 'Reading books help me relax', 'Redding books helps me relax'];
    const base = 'Reading books works as a singular subject, so use helps. Redding is misspelled.';

    expect(semantic.expectedProtectedTerms(choices, base)).toEqual(
      expect.arrayContaining(['Reading books', 'helps', 'Redding']),
    );
  });

  it('reports missing protected terms in localized explanations', () => {
    const choices = ['Reading books helps me relax', 'Reading books help me relax'];
    const base = 'Use Reading books with helps here.';
    const localized = 'Correcto. La idea funciona como sujeto singular.';

    expect(semantic.missingProtectedTerms(choices, base, localized, choices)).toEqual(
      expect.arrayContaining(['helps']),
    );
    expect(semantic.missingProtectedTerms(choices, base, localized, choices)).not.toContain('Reading books');
  });

  it('treats multi-word protected terms as covered when their discriminative content words are present', () => {
    const choices = ['She reads books every day.', 'She read books every day.'];
    const base = 'Correct. She reads books every day uses reads with she.';
    const localized = 'Correcto. Con she en present simple usamos reads.';

    expect(semantic.missingProtectedTerms(choices.slice(0, 1), base, localized, choices)).toEqual([]);
  });

  it('reports missing required locale fields', () => {
    expect(semantic.missingRequiredFields(null, ['literal', 'meaning', 'text'])).toEqual([
      'literal',
      'meaning',
      'text',
    ]);
    expect(semantic.missingRequiredFields({ literal: 'Literal', meaning: ' ', text: 'Explanation' }, [
      'literal',
      'meaning',
      'text',
    ])).toEqual(['meaning']);
  });

  it('reports exact seed/runtime copy differences', () => {
    expect(
      semantic.localeCopyDifferences(
        { literal: 'PT literal', meaning: 'PT meaning', text: 'PT text' },
        { literal: 'PT literal', meaning: 'Different meaning', text: 'PT text' },
        ['literal', 'meaning', 'text'],
      ),
    ).toEqual([
      {
        field: 'meaning',
        expected: 'PT meaning',
        actual: 'Different meaning',
      },
    ]);
  });

  it('detects suspicious cross-locale duplicate copy', () => {
    expect(
      semantic.duplicateLocaleFieldValues(
        {
          'pt-BR': { literal: 'PT literal', meaning: 'Same copied meaning text', text: 'PT text' },
          vi: { literal: 'VI literal', meaning: 'Same copied meaning text', text: 'VI text' },
          id: { literal: 'ID literal', meaning: 'Different meaning text', text: 'ID text' },
        },
        ['literal', 'meaning', 'text'],
        { minLength: 12 },
      ),
    ).toEqual([
      {
        field: 'meaning',
        value: 'Same copied meaning text',
        locales: ['pt-BR', 'vi'],
      },
    ]);
  });

  it('detects target-language signal in Daily Phrase explanations', () => {
    expect(semantic.localeLanguageSignal('pt-BR', 'Plain sailing é usado quando uma tarefa segue sem grandes problemas.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('vi', 'Plain sailing dùng khi một việc diễn ra dễ dàng, không có trở ngại lớn.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('id', 'Plain sailing dipakai ketika tugas berjalan mudah tanpa masalah besar.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('tr', 'Plain sailing, bir iş büyük sorunlar olmadan ilerlediğinde kullanılır.').ok).toBe(true);
    expect(semantic.localeLanguageSignal('pl', 'Plain sailing używa się, gdy zadanie idzie łatwo i bez większych problemów.').ok).toBe(true);
  });

  it('flags English-only copy as weak source-locale signal', () => {
    const englishOnly = 'Plain sailing is used when a task or situation is easy and has no major problems.';

    for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(semantic.localeLanguageSignal(locale, englishOnly).ok).toBe(false);
    }
  });

  it('matches structured quiz payloads to a unique source ordinal by English target evidence', () => {
    const entries = [
      { ordinal: 1, choices: ['I walk home.', 'I work home.'], correct: 0 },
      { ordinal: 2, choices: ['I work here.', 'I walk here.'], correct: 0 },
    ] as any;

    const match = findPayloadMatchingQuizEntry(entries, {
      'pt-BR': {
        prompt: 'Eu trabalho aqui.',
        explanations: [
          'Correto. I work here. preserva a ideia.',
          'I walk here. fala de andar, não trabalhar.',
          'Outra opção não serve.',
          'Compare com I work here.',
        ],
      },
    } as any);

    expect(match?.ordinal).toBe(2);
  });

  it('does not guess a structured quiz ordinal when English target evidence is ambiguous', () => {
    const entries = [
      { ordinal: 1, choices: ['I am ready.', 'I was ready.'], correct: 0 },
      { ordinal: 2, choices: ['I am ready.', 'I get ready.'], correct: 0 },
    ] as any;

    const match = findPayloadMatchingQuizEntry(entries, {
      'pt-BR': {
        prompt: 'Estou pronto.',
        explanations: [
          'Correto. I am ready. preserva a ideia.',
          'I was ready. muda o tempo.',
          'I get ready. muda o sentido.',
          'Compare com I am ready.',
        ],
      },
    } as any);

    expect(match).toBeNull();
  });

  it('returns all candidate quiz ordinals when structured payload evidence is ambiguous', () => {
    const entries = [
      { ordinal: 1, choices: ['I am ready.', 'I was ready.'], correct: 0 },
      { ordinal: 2, choices: ['I am ready.', 'I get ready.'], correct: 0 },
    ] as any;

    const matches = findPayloadMatchingQuizEntries(entries, {
      'pt-BR': {
        prompt: 'Estou pronto.',
        explanations: [
          'Correto. I am ready. preserva a ideia.',
          'I was ready. muda o tempo.',
          'I get ready. muda o sentido.',
          'Compare com I am ready.',
        ],
      },
    } as any);

    expect(matches.map((entry) => entry.ordinal)).toEqual([1, 2]);
  });

  it('builds a guarded dry-run plan for quiz payload ordinal repair', () => {
    const report = buildQuizPayloadOrdinalRepairPlan();
    const easy102 = report.items.find((item) => item.difficulty === 'easy' && item.key === 102);
    const easy277 = report.items.find((item) => item.difficulty === 'easy' && item.key === 277);
    const easy298 = report.items.find((item) => item.difficulty === 'easy' && item.key === 298);

    expect(report.dryRun).toBe(true);
    expect(report.summary.moveCandidates).toBeGreaterThan(0);
    expect(report.summary.blockedMoves).toBeGreaterThan(report.summary.autoSafeMoves);
    expect(report.summary.withoutSourceWithUniqueTarget).toBeGreaterThan(0);
    expect(report.summary.componentGraph.componentCount).toBeGreaterThan(0);
    expect(report.summary.componentGraph.byDifficulty.easy.components).toBeGreaterThan(0);
    expect(report.summary.componentGraph.moveSafetyCounts['blocked-target-chain-blocked']).toBeGreaterThan(0);
    expect(report.candidate.sourceApplyReady).toBe(false);
    expect(report.candidate.summary.acceptedRemaps).toBeGreaterThan(100);
    expect(report.candidate.summary.residualOrdinalBlockers).toBeLessThan(report.summary.blockedMoves);
    expect(report.candidate.summary.sourceEntryCoverageDrops).toBeGreaterThan(0);
    expect(report.candidate.summary.unresolvedMultipleTargets).toBe(2);
    expect(report.candidate.summary.residualByCode['quiz-payload-ordinal-mismatch']).toBe(2);
    expect(report.candidate.summary.residualByCode['quiz-payload-ordinal-ambiguous']).toBe(1);
    expect(report.candidate.workOrder.generatedFilledArtifact).toBe(false);
    expect(report.candidate.workOrder.status).toBe('READY_FOR_REVIEW');
    expect(report.candidate.workOrder.summary).toMatchObject({
      replacementPayloadTasks: 40,
      collisionDecisionTasks: 2,
      residualValidationTasks: 3,
      localesPerReplacementTask: ['pt-BR', 'vi', 'id', 'tr', 'pl'],
    });
    expect(report.candidate.workOrder.replacementPayloadTasks[0]).toMatchObject({
      taskId: 'replacement:easy:105',
      difficulty: 'easy',
      ordinal: 105,
      sourceEntry: expect.objectContaining({
        correctChoice: 'I work on Monday.',
      }),
    });
    expect(report.candidate.workOrder.collisionDecisionTasks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        taskId: 'collision:easy:103',
        incomingSourceKeys: [104, 221, 287],
      }),
      expect.objectContaining({
        taskId: 'collision:easy:266',
        incomingSourceKeys: [192, 270],
      }),
    ]));
    expect(easy102).toMatchObject({
      status: 'move-candidate',
      targetOrdinal: 58,
      moveSafety: 'blocked-target-has-current-payload',
    });
    expect(easy277).toMatchObject({
      status: 'move-candidate',
      targetOrdinal: 273,
      moveSafety: 'blocked-target-chain-blocked',
    });
    expect(easy298).toMatchObject({
      status: 'without-source-entry',
      targetOrdinal: 294,
    });

    const easy277Component = report.summary.componentGraph.topComponents.find((component) =>
      component.samplePayloads.some((item) => item.key === 277),
    );
    expect(easy277Component).toMatchObject({
      difficulty: 'easy',
      withoutSourceEntry: 1,
    });
    expect(easy277Component?.samplePayloads.find((item) => item.key === 277)).toMatchObject({
      status: 'move-candidate',
      targetOrdinal: 273,
      moveSafety: 'blocked-target-chain-blocked',
    });
    expect(report.candidate.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: 'remap-incoming',
        difficulty: 'easy',
        key: 102,
        sourceKey: 103,
      }),
      expect.objectContaining({
        action: 'coverage-drop-needs-new-payload',
        difficulty: 'medium',
        key: 128,
      }),
    ]));
  });
});
