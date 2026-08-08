import fs from 'node:fs';
import path from 'node:path';

import {
  buildHeisenbergPromptLanguageContractAudit,
  writeHeisenbergPromptLanguageContractAudit,
} from '../scripts/heisenberg_prompt_language_contract_audit';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/prompt-language-contract-audit';
const GENERATED_AT = '2026-07-04T10:00:00.000Z';

function rel(file: string): string {
  return `${RUN_ROOT_RELATIVE}/${file}`;
}

function abs(file: string): string {
  return path.join(ROOT, rel(file));
}

function writeFixture(file: string, content: string): void {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), content, 'utf8');
}

function cleanRunRoot(): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
}

/** Fixture repo root for a single scenario: a fake `functions/src/...` tree under
 *  .codex-tmp/heisenberg/tests/prompt-language-contract-audit/<scenario>/. */
function fixtureRoot(scenario: string): string {
  return abs(scenario);
}

const FULL_PROMPT_LANGUAGES = `
export const PROMPT_LANGUAGES: Record<string, { name: string; writeIn: string }> = {
  ru: { name: 'Russian', writeIn: 'ru' },
  uk: { name: 'Ukrainian', writeIn: 'uk' },
  es: { name: 'Spanish', writeIn: 'es' },
  'pt-BR': { name: 'Brazilian Portuguese', writeIn: 'pt-BR' },
  vi: { name: 'Vietnamese', writeIn: 'vi' },
  id: { name: 'Indonesian', writeIn: 'id' },
  tr: { name: 'Turkish', writeIn: 'tr' },
  pl: { name: 'Polish', writeIn: 'pl' },
  en: { name: 'English', writeIn: 'en' },
};
`;

const PROMPT_LANGUAGES_MISSING_PL = `
export const PROMPT_LANGUAGES: Record<string, { name: string; writeIn: string }> = {
  ru: { name: 'Russian', writeIn: 'ru' },
  uk: { name: 'Ukrainian', writeIn: 'uk' },
  es: { name: 'Spanish', writeIn: 'es' },
  'pt-BR': { name: 'Brazilian Portuguese', writeIn: 'pt-BR' },
  vi: { name: 'Vietnamese', writeIn: 'vi' },
  id: { name: 'Indonesian', writeIn: 'id' },
  tr: { name: 'Turkish', writeIn: 'tr' },
  en: { name: 'English', writeIn: 'en' },
};
`;

const FULL_AI_OUTPUT_LANG = `
export type AiOutputLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl' | 'en';
`;

const AI_OUTPUT_LANG_MISSING_TR = `
export type AiOutputLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'pl' | 'en';
`;

const FULL_SERVER_COPY = `
type Copy = { title: string; body: string };
const SUPPORTED_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type CopyLang = (typeof SUPPORTED_LANGS)[number];

const SOME_COPY: Record<CopyLang, Copy> = {
  ru: { title: 'ru', body: 'ru' },
  uk: { title: 'uk', body: 'uk' },
  es: { title: 'es', body: 'es' },
  'pt-BR': { title: 'pt-BR', body: 'pt-BR' },
  vi: { title: 'vi', body: 'vi' },
  id: { title: 'id', body: 'id' },
  tr: { title: 'tr', body: 'tr' },
  pl: { title: 'pl', body: 'pl' },
};
`;

function writeFullFixtureRepo(scenario: string): void {
  writeFixture(`${scenario}/functions/src/explain/explain_prompts.ts`, FULL_PROMPT_LANGUAGES);
  writeFixture(`${scenario}/functions/src/ai_language_contract.ts`, FULL_AI_OUTPUT_LANG);
  writeFixture(`${scenario}/functions/src/re_engage_push.ts`, FULL_SERVER_COPY);
  writeFixture(`${scenario}/functions/src/premium_expiry_reminder.ts`, FULL_SERVER_COPY);
}

describe('heisenberg prompt language contract audit', () => {
  beforeEach(() => {
    cleanRunRoot();
  });

  it('PASSes when every contract covers all active locales', () => {
    const scenario = 'pass-scenario';
    writeFullFixtureRepo(scenario);

    const report = buildHeisenbergPromptLanguageContractAudit(fixtureRoot(scenario), {
      generatedAt: GENERATED_AT,
    });

    expect(report).toMatchObject({
      schemaVersion: 'heisenberg-prompt-language-contract-audit-v1',
      status: 'PASS',
      activeLocales: ['es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi'],
      summary: { findings: 0, missingLocaleInstances: 0 },
    });
    expect(report.sections.explainPrompts.status).toBe('PASS');
    expect(report.sections.aiLanguageContract.status).toBe('PASS');
    expect(report.sections.serverCopyMaps.status).toBe('PASS');
    expect(report.findings).toEqual([]);
  });

  it('HOLDs with a missing-locale finding when PROMPT_LANGUAGES is missing pl', () => {
    const scenario = 'missing-pl-scenario';
    writeFixture(`${scenario}/functions/src/explain/explain_prompts.ts`, PROMPT_LANGUAGES_MISSING_PL);
    writeFixture(`${scenario}/functions/src/ai_language_contract.ts`, FULL_AI_OUTPUT_LANG);
    writeFixture(`${scenario}/functions/src/re_engage_push.ts`, FULL_SERVER_COPY);
    writeFixture(`${scenario}/functions/src/premium_expiry_reminder.ts`, FULL_SERVER_COPY);

    const report = buildHeisenbergPromptLanguageContractAudit(fixtureRoot(scenario), {
      generatedAt: GENERATED_AT,
    });

    expect(report.status).toBe('HOLD');
    expect(report.sections.explainPrompts.status).toBe('HOLD');
    expect(report.sections.explainPrompts.findings).toEqual([
      expect.objectContaining({
        kind: 'object-map',
        context: 'PROMPT_LANGUAGES',
        missingLocales: ['pl'],
      }),
    ]);
    // Other sections stay clean.
    expect(report.sections.aiLanguageContract.status).toBe('PASS');
    expect(report.sections.serverCopyMaps.status).toBe('PASS');
  });

  it('reports a finding when AiOutputLang union type is missing tr', () => {
    const scenario = 'missing-tr-scenario';
    writeFixture(`${scenario}/functions/src/explain/explain_prompts.ts`, FULL_PROMPT_LANGUAGES);
    writeFixture(`${scenario}/functions/src/ai_language_contract.ts`, AI_OUTPUT_LANG_MISSING_TR);
    writeFixture(`${scenario}/functions/src/re_engage_push.ts`, FULL_SERVER_COPY);
    writeFixture(`${scenario}/functions/src/premium_expiry_reminder.ts`, FULL_SERVER_COPY);

    const report = buildHeisenbergPromptLanguageContractAudit(fixtureRoot(scenario), {
      generatedAt: GENERATED_AT,
    });

    expect(report.status).toBe('HOLD');
    expect(report.sections.aiLanguageContract.status).toBe('HOLD');
    expect(report.sections.aiLanguageContract.findings).toEqual([
      expect.objectContaining({
        kind: 'union-type',
        context: 'AiOutputLang',
        missingLocales: ['tr'],
      }),
    ]);
  });

  it('reports a finding for a server copy map missing a locale (heuristic: >=3 active-locale keys)', () => {
    const scenario = 'missing-server-copy-scenario';
    const copyMissingVi = FULL_SERVER_COPY.replace(/\s*vi: \{ title: 'vi', body: 'vi' \},\n/, '\n');
    writeFixture(`${scenario}/functions/src/explain/explain_prompts.ts`, FULL_PROMPT_LANGUAGES);
    writeFixture(`${scenario}/functions/src/ai_language_contract.ts`, FULL_AI_OUTPUT_LANG);
    writeFixture(`${scenario}/functions/src/re_engage_push.ts`, copyMissingVi);
    writeFixture(`${scenario}/functions/src/premium_expiry_reminder.ts`, FULL_SERVER_COPY);

    const report = buildHeisenbergPromptLanguageContractAudit(fixtureRoot(scenario), {
      generatedAt: GENERATED_AT,
    });

    expect(report.status).toBe('HOLD');
    expect(report.sections.serverCopyMaps.status).toBe('HOLD');
    expect(report.sections.serverCopyMaps.findings).toEqual([
      expect.objectContaining({
        file: 'functions/src/re_engage_push.ts',
        kind: 'object-map',
        context: 'SOME_COPY',
        missingLocales: ['vi'],
      }),
    ]);
  });

  it('HOLDs when a required source file is missing entirely', () => {
    const scenario = 'missing-file-scenario';
    // Only write two of the three required files; explain_prompts.ts is absent.
    writeFixture(`${scenario}/functions/src/ai_language_contract.ts`, FULL_AI_OUTPUT_LANG);
    writeFixture(`${scenario}/functions/src/re_engage_push.ts`, FULL_SERVER_COPY);
    writeFixture(`${scenario}/functions/src/premium_expiry_reminder.ts`, FULL_SERVER_COPY);

    const report = buildHeisenbergPromptLanguageContractAudit(fixtureRoot(scenario), {
      generatedAt: GENERATED_AT,
    });

    expect(report.status).toBe('HOLD');
    expect(report.sections.explainPrompts.status).toBe('HOLD');
    expect(report.sections.explainPrompts.findings[0]).toMatchObject({
      file: 'functions/src/explain/explain_prompts.ts',
      context: 'PROMPT_LANGUAGES',
    });
  });

  it('writes JSON and Markdown reports under docs/heisenberg or .codex-tmp and never touches source', () => {
    const scenario = 'write-scenario';
    writeFullFixtureRepo(scenario);

    const result = writeHeisenbergPromptLanguageContractAudit(fixtureRoot(scenario), {
      outputDir: rel('write-scenario/out'),
      generatedAt: GENERATED_AT,
    });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(result.report.status).toBe('PASS');

    // Source fixtures are unchanged (read-only guarantee).
    const explainPromptsAfter = fs.readFileSync(
      abs(`${scenario}/functions/src/explain/explain_prompts.ts`),
      'utf8',
    );
    expect(explainPromptsAfter).toBe(FULL_PROMPT_LANGUAGES);
  });

  it('rejects an output directory outside docs/heisenberg or .codex-tmp', () => {
    const scenario = 'reject-outdir-scenario';
    writeFullFixtureRepo(scenario);

    expect(() =>
      writeHeisenbergPromptLanguageContractAudit(fixtureRoot(scenario), {
        outputDir: 'outside-heisenberg',
        generatedAt: GENERATED_AT,
      }),
    ).toThrow('Heisenberg prompt language contract audit output must stay under .codex-tmp or docs/heisenberg');
  });

  it('integration: running against the real repo fills in all report sections', () => {
    const report = buildHeisenbergPromptLanguageContractAudit(ROOT, { generatedAt: GENERATED_AT });

    // Do not assert PASS/HOLD here — the real files may legitimately change over time.
    // Assert instead that the audit actually found and inspected the real contracts.
    expect(['PASS', 'HOLD']).toContain(report.status);
    expect(report.activeLocales.length).toBeGreaterThan(0);
    expect(report.sections.explainPrompts.file).toBe('functions/src/explain/explain_prompts.ts');
    expect(report.sections.explainPrompts.checked).toBeGreaterThan(0);
    expect(report.sections.aiLanguageContract.file).toBe('functions/src/ai_language_contract.ts');
    expect(report.sections.aiLanguageContract.checked).toBeGreaterThan(0);
    expect(report.sections.serverCopyMaps.checked).toBeGreaterThan(0);
    expect(report.summary.filesScanned).toBeGreaterThanOrEqual(4);
  });

  it('exposes the prompt language contract audit as a runnable CLI file', () => {
    expect(fs.existsSync(path.join(ROOT, 'scripts', 'heisenberg_prompt_language_contract_audit.ts'))).toBe(true);
  });
});
