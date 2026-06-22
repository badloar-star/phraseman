import * as fs from 'node:fs';
import * as path from 'node:path';

type Severity = 'blocker' | 'warning';
type Finding = {
  severity: Severity;
  code: string;
  message: string;
  file?: string;
  rowId?: string;
  field?: string;
};

type TargetField = {
  path: string;
  value: string;
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function hasCyrillic(value: string): boolean {
  return /[\u0400-\u04FF]/.test(value);
}

function hasMojibake(value: string): boolean {
  return /(?:\u00c2|\u00c3|\u00d0|\u00d1|\ufffd|\?{3,})/.test(value);
}

function hasSourceLanguageLeak(value: string): boolean {
  const text = value.toLowerCase();
  const sourceMarkers = [
    /[¿¡]/u,
    /\b(?:dónde|quién|qué|cómo|estás|está|puedo|puedes|quiero|tengo|perdón|perdone|ayudarme|izquierda|derecha|camino|lejos|estoy buscando|gira|tienda|oficina|mercado|estación|autobús)\b/iu,
    /\b(?:você|vocês|não|está|estão|obrigado|obrigada|onde fica|posso|preciso|tenho|farmácia|ônibus|cartão)\b/iu,
    /[ăđơưĂĐƠƯ]/u,
    /[ğĞıİşŞ]/u,
    /[ąĄęĘłŁńŃśŚźŹżŻ]/u,
    /\b(?:anda|kamu|tidak|dengan|yang|apakah)\b/iu,
  ];
  return sourceMarkers.some((pattern) => pattern.test(text));
}

function hasFrenchLanguageSignal(value: string): boolean {
  const text = value.normalize('NFC');
  return /[àâæçéèêëîïôœùûüÿ]/iu.test(text)
    || /\b(?:je|tu|il|elle|nous|vous|ils|elles|le|la|les|un|une|des|du|de|dès|au|aux|en|dans|sur|pour|avec|sans|chez|par|ce|cet|cette|ces|cela|ça|est|sont|être|avoir|fait|faire|fais|font|vais|aller|venir|chercher|prendre|prend|mettre|voir|savoir|dire|dis|parler|travailler|très|plus|moins|comme|tout|tous|toute|toutes|ne|pas|seulement|utilise|utilisent|deux|trois|chaque|quelque|quelqu'un|personne|problème|vraiment|pendant|après|avant|maintenant|hier|aujourd'hui|demain|ici|là|où|qui|que|quoi|quand|comment|peux|peut|faut|signifie|sert|demander|demande|polie|question|phrase|mot|lieu|temps|heure|enseignant|enseignante|équivalent|français|courant)\b|(?:[cdjlmnst]|qu)[’']/iu.test(text);
}

function normalizeComparable(value: unknown): string {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[“”«»"'.!?¿¡:;,()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function flattenStrings(value: unknown, prefix: string, out: TargetField[]): void {
  if (typeof value === 'string') {
    const key = prefix.split('.').pop() ?? prefix;
    if (key === 'fr' || key === 'frenchText' || key.endsWith('Fr')) {
      out.push({ path: prefix, value });
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenStrings(item, `${prefix}[${index}]`, out));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'sourcePreview' || key === 'sourceLocales') continue;
    flattenStrings(child, prefix ? `${prefix}.${key}` : key, out);
  }
}

function collectTargetFields(row: Record<string, unknown>): TargetField[] {
  const fields: TargetField[] = [];
  flattenStrings(row, '', fields);
  return fields.filter((field) => field.value.trim().length > 0);
}

function sourceStrings(row: Record<string, unknown>): string[] {
  const out: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      out.push(value);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    Object.values(value as Record<string, unknown>).forEach(visit);
  };
  visit(row.sourcePreview);
  visit(row.sourceLocales);
  return out;
}

function targetEqualsLongSource(field: TargetField, row: Record<string, unknown>): boolean {
  const target = normalizeComparable(field.value);
  if (target.length < 16 || target.split(' ').length < 3) return false;
  return sourceStrings(row).map(normalizeComparable).some((source) => source === target);
}

function findJsonlFiles(root: string): string[] {
  const files: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(full);
    }
  }
  return files.sort();
}

function renderMarkdown(report: any): string {
  return [
    '# GUSTAV French Language Isolation Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    ...Object.entries(report.summary).map(([key, value]) => `- ${key}: \`${value}\``),
    '',
    '## Findings',
    '',
    ...(report.findings.length
      ? report.findings.slice(0, 80).map((finding: Finding) => `- \`${finding.severity}\` \`${finding.code}\`${finding.rowId ? ` row \`${finding.rowId}\`` : ''}${finding.field ? ` field \`${finding.field}\`` : ''}: ${finding.message}${finding.file ? ` (${finding.file})` : ''}`)
      : ['- None.']),
    report.findings.length > 80 ? `- ... ${report.findings.length - 80} more findings omitted from markdown; see JSON.` : '',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_french_language_isolation_audit.ts --run <run-dir>');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const appDomainsDir = path.join(runDir, 'generated', 'fr', 'app_domains');
  const auditsDir = path.join(runDir, 'audits');
  fs.mkdirSync(auditsDir, { recursive: true });

  const findings: Finding[] = [];
  const files = findJsonlFiles(appDomainsDir);
  let scannedRows = 0;
  let scannedTargetFields = 0;
  let cyrillicTargetFields = 0;
  let mojibakeTargetFields = 0;
  let sourceLanguageLeakFields = 0;
  let targetEqualsSourceFields = 0;
  let frenchSignalMissingFields = 0;
  let rowsMissingTargetLocale = 0;

  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      scannedRows += 1;
      let row: Record<string, unknown>;
      try {
        row = JSON.parse(line) as Record<string, unknown>;
      } catch {
        findings.push({ severity: 'blocker', code: 'jsonl_parse_error', message: 'Cannot parse JSONL row.', file: rel(repoRoot, file) });
        continue;
      }
      const rowId = String(row.rowId ?? row.id ?? '');
      if (row.targetLocale !== undefined && row.targetLocale !== 'fr') {
        findings.push({ severity: 'blocker', code: 'wrong_target_locale_metadata', message: `Expected targetLocale=fr but got ${String(row.targetLocale)}.`, file: rel(repoRoot, file), rowId });
      }
      if (row.targetLocale === undefined) rowsMissingTargetLocale += 1;

      for (const field of collectTargetFields(row)) {
        scannedTargetFields += 1;
        if (hasCyrillic(field.value)) {
          cyrillicTargetFields += 1;
          findings.push({ severity: 'blocker', code: 'cyrillic_in_french_target', message: 'French target field contains Cyrillic characters.', file: rel(repoRoot, file), rowId, field: field.path });
        }
        if (hasMojibake(field.value)) {
          mojibakeTargetFields += 1;
          findings.push({ severity: 'blocker', code: 'mojibake_in_french_target', message: 'French target field contains mojibake markers.', file: rel(repoRoot, file), rowId, field: field.path });
        }
        if (hasSourceLanguageLeak(field.value)) {
          sourceLanguageLeakFields += 1;
          findings.push({ severity: 'blocker', code: 'source_language_marker_in_french_target', message: 'French target field contains likely non-French source-language markers.', file: rel(repoRoot, file), rowId, field: field.path });
        }
        if (targetEqualsLongSource(field, row)) {
          targetEqualsSourceFields += 1;
          findings.push({ severity: 'blocker', code: 'target_equals_long_source', message: 'French target field exactly equals a long source field.', file: rel(repoRoot, file), rowId, field: field.path });
        }
        if (field.path !== 'translationFr' && !field.path.endsWith('.translationFr') && field.value.length >= 24 && !hasFrenchLanguageSignal(field.value)) {
          frenchSignalMissingFields += 1;
          findings.push({ severity: 'warning', code: 'weak_french_signal', message: 'Long French target field has no strong French language signal; reviewer should inspect.', file: rel(repoRoot, file), rowId, field: field.path });
        }
      }
    }
  }

  if (rowsMissingTargetLocale > 0) {
    findings.push({
      severity: 'warning',
      code: 'legacy_rows_missing_target_locale',
      message: `${rowsMissingTargetLocale} existing rows have no targetLocale metadata. New Echo full-day batches now write targetLocale=fr.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report = {
    schemaVersion: 'gustav-french-language-isolation-audit-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    summary: {
      scannedJsonlFiles: files.length,
      scannedRows,
      scannedTargetFields,
      cyrillicTargetFields,
      mojibakeTargetFields,
      sourceLanguageLeakFields,
      targetEqualsSourceFields,
      frenchSignalMissingFields,
      rowsMissingTargetLocale,
      blockers,
      warnings,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    findings,
    policy: [
      'This audit scans generated French app-domain target fields only.',
      'Source previews and source locale fields are excluded from target-language checks.',
      'English grammar snippets inside French explanations are allowed by design.',
      'Production app files are not modified by this audit.',
      'Production app apply remains blocked.',
    ],
  };

  const jsonPath = path.join(auditsDir, 'french_language_isolation_audit.json');
  const mdPath = path.join(auditsDir, 'french_language_isolation_audit.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, `${renderMarkdown(report)}\n`, 'utf8');

  console.log(`GUSTAV French language isolation audit: ${report.status}`);
  console.log(`Scanned rows: ${scannedRows}`);
  console.log(`Scanned target fields: ${scannedTargetFields}`);
  console.log(`Blockers: ${blockers}`);
  console.log(`Warnings: ${warnings}`);
  console.log(`Report: ${rel(repoRoot, jsonPath)}`);
  if (report.status !== 'PASS') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
