import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

declare const require: any;

const core = require('../scripts/lib/heisenberg_translate_core.cjs');

const BASE_ROW = {
  id: 'block-1-row-1',
  file: 'app/idioms_data.ts',
  line: 10,
  keyPath: 'id:42.sourceLocales.pl.meaning',
  sourceLocale: 'ru',
  targetLocale: 'pl',
  targetSlot: 'daily-phrase-field-gap',
  sourceText: 'Идиома "break the ice" значит начать разговор в неловкой ситуации, например {name}.',
};

const GO_JUDGE = {
  accuracy: { verdict: 'GO', note: 'matches' },
  naturalness: { verdict: 'GO', note: 'natural' },
  integrity: { verdict: 'GO', note: 'intact' },
};

// Natural Polish with diacritics + stop words so the language signal passes.
const GOOD_POLISH =
  'Idiom "break the ice" znaczy zacząć rozmowę w niezręcznej sytuacji, ale nie jest to bardzo formalne wyrażenie, na przykład {name}.';

describe('heisenberg translation factory core', () => {
  it('extracts placeholders and quoted English snippets', () => {
    expect(core.extractPlaceholders('Привет {name}, введи %s или ${code}')).toEqual(
      ['${code}', '%s', '{name}'].sort(),
    );
    expect(core.quotedEnglishSnippets('Фраза "break the ice" и слово «awkward» и "Привет"')).toEqual([
      'awkward',
      'break the ice',
    ]);
  });

  it('passes a faithful natural translation through deterministic checks', () => {
    const result = core.runDeterministicChecks({
      sourceText: BASE_ROW.sourceText,
      targetLocale: 'pl',
      translation: GOOD_POLISH,
    });
    expect(result.reasons).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('hard-holds on placeholder loss, mojibake and Cyrillic leakage', () => {
    const noPlaceholder = core.runDeterministicChecks({
      sourceText: BASE_ROW.sourceText,
      targetLocale: 'pl',
      translation: GOOD_POLISH.replace('{name}', 'kolega'),
    });
    expect(noPlaceholder.ok).toBe(false);
    expect(noPlaceholder.hardReasons.map((r: any) => r.code)).toContain('placeholder-mismatch');

    const mojibake = core.runDeterministicChecks({
      sourceText: BASE_ROW.sourceText,
      targetLocale: 'pl',
      translation: `${GOOD_POLISH} ï¿½`,
    });
    expect(mojibake.ok).toBe(false);
    expect(mojibake.hardReasons.map((r: any) => r.code)).toContain('mojibake');

    const cyrillicLeak = core.runDeterministicChecks({
      sourceText: 'Plain source with "break the ice" and {name}.',
      targetLocale: 'pl',
      translation: 'To znaczy "break the ice" oraz {name}, но часть осталась по-русски.',
    });
    expect(cyrillicLeak.ok).toBe(false);
    expect(cyrillicLeak.hardReasons.map((r: any) => r.code)).toContain('unexpected-cyrillic');
  });

  it('soft-flags dropped quoted snippets, weak language signal and identical cognates for the judge', () => {
    const droppedEnglish = core.runDeterministicChecks({
      sourceText: BASE_ROW.sourceText,
      targetLocale: 'pl',
      translation: GOOD_POLISH.replace('break the ice', 'przełamać lody'),
    });
    expect(droppedEnglish.ok).toBe(true);
    expect(droppedEnglish.reasons.find((r: any) => r.code === 'protected-english-missing')?.severity).toBe('soft');

    const wrongLanguage = core.runDeterministicChecks({
      sourceText: BASE_ROW.sourceText,
      targetLocale: 'pl',
      translation: 'This is just English text that mentions "break the ice" together with {name} placeholder.',
    });
    expect(wrongLanguage.ok).toBe(true);
    expect(wrongLanguage.reasons.find((r: any) => r.code === 'weak-language-signal')?.severity).toBe('soft');

    const cognate = core.runDeterministicChecks({
      sourceText: 'restaurante',
      targetLocale: 'pt-BR',
      translation: 'restaurante',
    });
    expect(cognate.ok).toBe(true);
    expect(cognate.reasons.find((r: any) => r.code === 'identical-to-source')?.severity).toBe('soft');
  });

  it('treats malformed or HOLD judge output as HOLD, never GO', () => {
    expect(core.judgeOverall(GO_JUDGE)).toBe('GO');
    expect(core.judgeOverall(null)).toBe('HOLD');
    expect(core.judgeOverall({ accuracy: { verdict: 'YES', note: '' } })).toBe('HOLD');
    expect(
      core.judgeOverall({
        ...GO_JUDGE,
        naturalness: { verdict: 'HOLD', note: 'wrong plural form' },
      }),
    ).toBe('HOLD');
    expect(core.validateJudgeResult({ ...GO_JUDGE, integrity: { verdict: 'HOLD', note: '' } }).ok).toBe(false);
  });

  it('builds GO rows only when every layer agrees and never opens approvals', () => {
    const go = core.buildFilledRow({
      blockRow: BASE_ROW,
      translation: GOOD_POLISH,
      translatorNotes: 'kept idiom anchor',
      backTranslation: 'The idiom "break the ice" means to start a conversation in an awkward situation, for example {name}.',
      judge: GO_JUDGE,
      model: 'test-model',
      generatedAt: '2026-07-04T00:00:00.000Z',
    });
    expect(go.status).toBe('GO');
    expect(go.holdReasons).toEqual([]);
    expect(go.machineGenerated).toBe(true);
    expect(go.reviewerImportAllowed).toBe(false);
    expect(go.productionApplyAllowed).toBe(false);
    expect(go.activationApproved).toBe(false);

    const hold = core.buildFilledRow({
      blockRow: BASE_ROW,
      translation: GOOD_POLISH,
      translatorNotes: '',
      backTranslation: '',
      judge: { ...GO_JUDGE, accuracy: { verdict: 'HOLD', note: 'added a claim' } },
      model: 'test-model',
      generatedAt: '2026-07-04T00:00:00.000Z',
    });
    expect(hold.status).toBe('HOLD');
    expect(hold.holdReasons.map((r: any) => r.code)).toContain('judge-hold:accuracy');

    const pending = core.buildFilledRow({
      blockRow: BASE_ROW,
      translation: GOOD_POLISH,
      translatorNotes: '',
      backTranslation: null,
      judge: null,
      model: 'claude-agent',
      generatedAt: '2026-07-04T00:00:00.000Z',
    });
    expect(pending.status).toBe('PENDING_JUDGE');
    expect(pending.holdReasons).toEqual([]);
    expect(pending.reviewerImportAllowed).toBe(false);
  });

  it('validates block rows and summarizes results', () => {
    expect(core.validateBlockRow(BASE_ROW)).toEqual([]);
    expect(core.validateBlockRow({ id: 'x' })).toContain('row-missing-sourceText');
    const summary = core.summarizeFilledRows([
      { status: 'GO', holdReasons: [] },
      { status: 'HOLD', holdReasons: [{ code: 'mojibake' }, { code: 'mojibake' }] },
    ]);
    expect(summary).toEqual({
      total: 2,
      byStatus: { GO: 1, HOLD: 1 },
      holdReasonCounts: { mojibake: 2 },
    });
  });
});

describe('heisenberg translation factory CLI (dry run)', () => {
  it('writes a spend plan without calling any API and without touching sources', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heis-translate-'));
    const blocksPath = path.join(dir, 'block_001.jsonl');
    fs.writeFileSync(
      blocksPath,
      `${JSON.stringify(BASE_ROW)}\n${JSON.stringify({ ...BASE_ROW, id: 'block-1-row-2', targetLocale: 'tr' })}\n`,
      'utf8',
    );
    const outDir = path.join(dir, 'out');
    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, '..', 'scripts', 'heisenberg_translate_blocks.mjs'),
        '--blocks',
        blocksPath,
        '--locale',
        'pl',
        '--out-dir',
        outDir,
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    expect(result.status).toBe(0);
    const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'translation_run_plan.json'), 'utf8'));
    expect(plan.schema).toBe('heisenberg-translation-run-plan-v1');
    expect(plan.status).toBe('DRY_RUN');
    expect(plan.summary.rowsInScope).toBe(1); // only the pl row
    expect(plan.summary.callsPlanned).toBe(3);
    expect(plan.summary.estimatedCostUsd).toBeGreaterThan(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('refuses unregistered locales', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heis-translate-bad-'));
    const blocksPath = path.join(dir, 'block_001.jsonl');
    fs.writeFileSync(blocksPath, `${JSON.stringify({ ...BASE_ROW, targetLocale: 'xx' })}\n`, 'utf8');
    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, '..', 'scripts', 'heisenberg_translate_blocks.mjs'),
        '--blocks',
        blocksPath,
        '--locale',
        'xx',
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    expect(result.status).toBe(1);
    expect(`${result.stderr}${result.stdout}`).toContain('not in the Heisenberg locale registry');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
