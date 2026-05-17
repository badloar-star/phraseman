import { getAllDiagnosisTrainings } from '../app/diagnosis_trainings';
import { getVisibleIntroLearningBlocks } from '../app/personal_training_intro_blocks';

type Lang = 'ru' | 'uk' | 'es';
type Tri = Record<Lang, string>;
type Severity = 'error' | 'warn';

interface Finding {
  severity: Severity;
  trainingId: string;
  path: string;
  lang?: Lang;
  code: string;
  message: string;
  sample?: string;
}

const STRUCTURAL_SKIP_KEYS = new Set([
  'sentence',
  'options',
  'answerOptions',
  'correctAnswer',
  'correctAnswerId',
  'correctIndex',
  'focusWords',
  'contrastSet',
  'smartTrainerConfig',
  'analyticsEvents',
  'routing',
  'qualityChecklist',
]);

const TRANSLIT_RE = /\b(?:Ty|ty|Eto|Zdes|Tut|Nuzhno|Nuzhen|Nuzhna|Snachala|Spochatku|Vyberi|Vybery|Oshibka|Pomylka|Kogda|Koly|angliiskii|anhliiska|obychno|zazvychai|stavish|stavysz|smeshivaesh|zmishuesh|hotya|khocha|realnyi|uiavnyi|voobrazhaem\w*|situats\w*|sytuatsi\w*|rezultat|budushch\w*|maibutn\w*|privychka|zvychka|perevodish|perekladaiesh|vidish|bachysh|vybiraesh|obyraiesh|podskazka|pidkazka)\b/i;
const MOJIBAKE_RE = /(?:Ð|Ã|â€|â€™|â€œ|â€|�)/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;
const PLACEHOLDER_RE = /\b(?:TODO|FIXME|PLACEHOLDER|DRAFT|LOREM_IPSUM)\b|lorem ipsum/;
const ENGLISH_GRAMMAR_JARGON_RE = /\b(?:auxiliary|subject|object|main verb|base verb|modal verb|frequency adverb|determiner|quantifier|relative clause|reported speech)\b/i;

function isTri(value: unknown): value is Tri {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Tri).ru === 'string' &&
      typeof (value as Tri).uk === 'string' &&
      typeof (value as Tri).es === 'string',
  );
}

function collectTriText(
  value: unknown,
  out: Array<{ path: string; text: Tri }>,
  path = 'training',
): void {
  if (!value || typeof value !== 'object') return;
  if (isTri(value)) {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectTriText(entry, out, `${path}[${index}]`));
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (STRUCTURAL_SKIP_KEYS.has(key)) continue;
    collectTriText(entry, out, `${path}.${key}`);
  }
}

function compactSample(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function latinRatio(value: string): number {
  const letters = Array.from(value).filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return 0;
  const latinLetters = letters.filter((char) => /\p{Script=Latin}/u.test(char));
  return latinLetters.length / letters.length;
}

function isEnglishPhrase(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Z0-9"'.,!?;:()\- /]+$/i.test(trimmed) && /\b(?:if|will|would|should|could|have|has|had|the|a|an|is|are|was|were|you|I|he|she|we|they)\b/i.test(trimmed);
}

function pushFinding(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function auditLocalizedText(
  trainingId: string,
  path: string,
  lang: Lang,
  text: string,
  findings: Finding[],
): void {
  const sample = compactSample(text);
  if (!sample) {
    pushFinding(findings, {
      severity: 'error',
      trainingId,
      path,
      lang,
      code: 'empty-copy',
      message: 'Localized learner-facing copy is empty.',
    });
    return;
  }

  if (MOJIBAKE_RE.test(text)) {
    pushFinding(findings, {
      severity: 'error',
      trainingId,
      path,
      lang,
      code: 'mojibake',
      message: 'Text contains likely encoding damage.',
      sample,
    });
  }

  if (PLACEHOLDER_RE.test(text)) {
    pushFinding(findings, {
      severity: 'error',
      trainingId,
      path,
      lang,
      code: 'placeholder',
      message: 'Text contains placeholder/draft marker.',
      sample,
    });
  }

  if (lang === 'es' && CYRILLIC_RE.test(text)) {
    pushFinding(findings, {
      severity: 'error',
      trainingId,
      path,
      lang,
      code: 'spanish-cyrillic',
      message: 'Spanish copy contains Cyrillic text.',
      sample,
    });
  }

  if ((lang === 'ru' || lang === 'uk') && TRANSLIT_RE.test(text)) {
    pushFinding(findings, {
      severity: 'error',
      trainingId,
      path,
      lang,
      code: 'ru-uk-translit',
      message: 'Russian/Ukrainian copy looks transliterated instead of localized.',
      sample,
    });
  }

  if ((lang === 'ru' || lang === 'uk') && text.length >= 45 && latinRatio(text) > 0.7 && !isEnglishPhrase(text)) {
    pushFinding(findings, {
      severity: 'warn',
      trainingId,
      path,
      lang,
      code: 'latin-heavy-ru-uk',
      message: 'Russian/Ukrainian copy is mostly Latin letters.',
      sample,
    });
  }

  if ((lang === 'ru' || lang === 'uk') && ENGLISH_GRAMMAR_JARGON_RE.test(text)) {
    pushFinding(findings, {
      severity: 'warn',
      trainingId,
      path,
      lang,
      code: 'english-grammar-jargon',
      message: 'Learner-facing RU/UK copy keeps internal English grammar jargon.',
      sample,
    });
  }
}

function auditTrainingShape(training: ReturnType<typeof getAllDiagnosisTrainings>[number], findings: Finding[]): void {
  if (!training.mentalModel?.ru || training.mentalModel.ru.length < 80) {
    pushFinding(findings, {
      severity: 'warn',
      trainingId: training.id,
      path: `${training.id}.mentalModel.ru`,
      code: 'thin-mental-model',
      message: 'Mental model may be too thin to explain the rule in human language.',
      sample: compactSample(training.mentalModel?.ru ?? ''),
    });
  }

  if (!training.coreRule) {
    pushFinding(findings, {
      severity: 'warn',
      trainingId: training.id,
      path: `${training.id}.coreRule`,
      code: 'missing-core-rule',
      message: 'Training has no explicit coreRule for audit/admin review.',
    });
  }

  const visibleIntroBlocks = getVisibleIntroLearningBlocks(training);
  if (!Array.isArray(visibleIntroBlocks) || visibleIntroBlocks.length < 1) {
    pushFinding(findings, {
      severity: 'warn',
      trainingId: training.id,
      path: `${training.id}.visibleIntroBlocks`,
      code: 'thin-intro',
      message: 'Visible intro guide has no teaching blocks after duplicate diagnosis copy is filtered out.',
    });
  }

  if (visibleIntroBlocks.length > 3) {
    pushFinding(findings, {
      severity: 'warn',
      trainingId: training.id,
      path: `${training.id}.visibleIntroBlocks`,
      code: 'bloated-intro',
      message: 'Visible intro guide has more than three blocks and may feel like step-by-step overload.',
    });
  }

  if (!Array.isArray(training.steps) || training.steps.length < 12) {
    pushFinding(findings, {
      severity: 'warn',
      trainingId: training.id,
      path: `${training.id}.steps`,
      code: 'thin-practice',
      message: 'Training has fewer than twelve practice steps.',
    });
  }

  for (const step of training.steps ?? []) {
    const wrongOptions = Object.keys(step.wrongFeedbackByOption ?? {});
    const answerOptions = step.answerOptions.map((option) => option.id).filter((id) => id !== step.correctAnswerId);
    const missingWrongFeedback = answerOptions.filter((id) => !wrongOptions.includes(id));

    if (missingWrongFeedback.length > 0) {
      pushFinding(findings, {
        severity: 'error',
        trainingId: training.id,
        path: `${training.id}.steps.${step.id}.wrongFeedbackByOption`,
        code: 'missing-wrong-feedback',
        message: `Missing wrong feedback for: ${missingWrongFeedback.join(', ')}`,
      });
    }

    if ((step.retryFeedback?.length ?? 0) < 4) {
      pushFinding(findings, {
        severity: 'error',
        trainingId: training.id,
        path: `${training.id}.steps.${step.id}.retryFeedback`,
        code: 'thin-retry-feedback',
        message: 'Retry feedback must have four levels.',
      });
    }
  }
}

function audit(): Finding[] {
  const findings: Finding[] = [];

  for (const training of getAllDiagnosisTrainings()) {
    const localizedItems: Array<{ path: string; text: Tri }> = [];
    collectTriText(training, localizedItems, training.id);
    auditTrainingShape(training, findings);

    for (const item of localizedItems) {
      for (const lang of ['ru', 'uk', 'es'] as const) {
        auditLocalizedText(training.id, item.path, lang, item.text[lang], findings);
      }
    }
  }

  return findings;
}

function summarize(findings: Finding[]): void {
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warn');
  const byCode = findings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.code] = (acc[finding.code] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Personal training copy quality audit: ${errors.length} errors, ${warnings.length} warnings`);
  console.log(
    Object.entries(byCode)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => `${code}: ${count}`)
      .join(' | ') || 'No findings',
  );

  for (const finding of findings.slice(0, 120)) {
    const lang = finding.lang ? `.${finding.lang}` : '';
    console.log(`[${finding.severity}] ${finding.code} ${finding.path}${lang}: ${finding.message}`);
    if (finding.sample) console.log(`  ${finding.sample}`);
  }

  if (findings.length > 120) {
    console.log(`...and ${findings.length - 120} more findings`);
  }
}

const strict = process.argv.includes('--strict');
const findings = audit();
summarize(findings);

if (strict && findings.some((finding) => finding.severity === 'error')) {
  process.exit(1);
}
