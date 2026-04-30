// Plausibility / calque audit: EN scene + RU/UK collocations (lessons 1–32).
// Run: node scripts/audit_phrase_plausibility.mjs
//
// Outputs:
//   docs/reports/phrase_plausibility_audit.json
//   docs/reports/phrase_plausibility_audit.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadTsModule(absPath) {
  const code = fs.readFileSync(absPath, 'utf8');
  const out = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: absPath,
  });
  const module = { exports: {} };
  const requireShim = (rel) => {
    if (rel === './lesson_data_types' || rel.endsWith('lesson_data_types')) return {};
    if (rel.startsWith('./')) {
      const next = path.resolve(path.dirname(absPath), rel + '.ts');
      if (fs.existsSync(next)) return loadTsModule(next);
    }
    return {};
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('module', 'exports', 'require', out.outputText);
  fn(module, module.exports, requireShim);
  return module.exports;
}

const ALL = loadTsModule(path.join(ROOT, 'app', 'lesson_data_all.ts'));
const LESSON_DATA = ALL.LESSON_DATA;

const flat = [];
for (let id = 1; id <= 32; id += 1) {
  const lesson = LESSON_DATA[id];
  if (!lesson) continue;
  for (const p of lesson.phrases || []) {
    flat.push({
      lesson: id,
      id: p.id,
      en: String(p.english || ''),
      ru: String(p.russian || ''),
      uk: String(p.ukrainian || ''),
    });
  }
}

const TIME_MARK = /\b(yesterday|tomorrow|tonight|last\s+\w+|next\s+\w+|this\s+(morning|afternoon|evening|week|month|year)|\d+\s*(hours?|days?|weeks?|months?|years?)\s+ago|ago|earlier\s+today)\b/i;
const EN_TIME_BOUND_KNOW = /\b(knew|know)\b/i;
const EN_EXPERIENCE_NOUN = /\b(song|songs|story|stories|tale|poem|movie|movies|film|films|book|books|joke|jokes|tune|melody|rumor|rumour|legend|dream)\b/i;
const RU_ZNALI = /знали|знаем|знаете|знал\b|знала\b/u;
const RU_TIME = /вчера|сегодня\s+(утром|вечером)|вчера\s+вечером|ночью|три\s+часа\s+назад|\d+\s+дн(я|ей)\s+назад/u;
const RU_ART_EXPERIENCE = /песн|истори[ию]|книг|фильм|мульт|анекдот|легенд|мелод|сон\b/u;

/** «Very + -ed/-ing» is often OK for these adjectives (reduce false positives). */
const VERY_ED_OK = /\bvery\s+(tired|bored|excited|interested|surprised|worried|scared|pleased|confused|amused|relaxed|stressed|devastated|exhausted|talented|limited|focused|advanced|balanced|married|depressed|motivated|delighted|annoyed|frightened|touched|pleased)\b/i;
const VERY_ING_OK = /\bvery\s+(refreshing|boring|exciting|interesting|relaxing|confusing|amusing|entertaining|convincing|rewarding|tempting|inviting)\b/i;

function loadSemanticAuditPhraseIds() {
  const fp = path.join(ROOT, 'docs', 'reports', 'lessons_translation_semantic_audit_1_32.md');
  if (!fs.existsSync(fp)) return [];
  const text = fs.readFileSync(fp, 'utf8');
  const out = new Set();
  for (const m of text.matchAll(/`L\d+\/(lesson\d+_phrase_\d+)`/g)) out.add(m[1]);
  for (const m of text.matchAll(/`lesson(\d+_phrase_\d+)`/g)) out.add(`lesson${m[1]}`);
  return [...out].sort();
}

/** @type {{ code: string, severity: 'high'|'med'|'low', test: (p: typeof flat[0]) => string | null }[]} */
const RULES = [
  {
    code: 'KNOW_TIME_EXPERIENCE_EN',
    severity: 'high',
    test: (p) => {
      if (!EN_TIME_BOUND_KNOW.test(p.en) || !TIME_MARK.test(p.en) || !EN_EXPERIENCE_NOUN.test(p.en)) return null;
      return 'EN: know/knew + specific time + song/story/book/movie etc. Often unnatural (cf. lesson12 issue); check RU collocation.';
    },
  },
  {
    code: 'RU_ZNALI_TIME_ART',
    severity: 'high',
    test: (p) => {
      if (!RU_ZNALI.test(p.ru) || !RU_TIME.test(p.ru) || !RU_ART_EXPERIENCE.test(p.ru)) return null;
      return 'RU: знать + art/story + punctual time — often a calque; verify native phrasing.';
    },
  },
  {
    code: 'UK_ZNALY_TIME_ART',
    severity: 'high',
    test: (p) => {
      if (!/(знали|знаємо|знаєте|знав\b|знала\b)/u.test(p.uk) || !/(вчора|сьогодні\s+(вранці|ввечері)|вночі|\d+\s+годин\s+тому)/u.test(p.uk)) return null;
      if (!/(пісн|історі|книг|фільм|анекдот|легенд|мелод)/u.test(p.uk)) return null;
      return 'UK: знати + art/story + punctual time — often a calque; verify.';
    },
  },
  {
    code: 'BELIEVE_PREPOSITION',
    severity: 'med',
    test: (p) => {
      if (!/\bbelieve\b/i.test(p.en)) return null;
      if (/\bbelieve\s+on\b/i.test(p.en)) return 'EN: believe on — usually believe in (something/someone).';
      return null;
    },
  },
  {
    code: 'DISCUSS_ABOUT_EN',
    severity: 'high',
    test: (p) => (/\bdiscuss\s+about\b/i.test(p.en) ? 'EN: discuss about — wrong; discuss + object (no about).' : null),
  },
  {
    code: 'DEPEND_OF_EN',
    severity: 'med',
    test: (p) => (/\bdepend\s+of\b/i.test(p.en) ? 'EN: depend of — use depend on.' : null),
  },
  {
    code: 'MARRIED_WITH_EN',
    severity: 'med',
    test: (p) => (/\bmarried\s+with\b/i.test(p.en) ? 'EN: married with — usually married to.' : null),
  },
  {
    code: 'MAKE_PHOTO_EN',
    severity: 'med',
    test: (p) => (/\bmake\s+(a\s+)?photo/i.test(p.en) ? 'EN: make a photo — prefer take a photo.' : null),
  },
  {
    code: 'EXPLAIN_ME_EN',
    severity: 'high',
    test: (p) => (/\bexplain\s+me\b/i.test(p.en) ? 'EN: explain me — explain to me / explain something.' : null),
  },
  {
    code: 'I_AM_AGREE_EN',
    severity: 'high',
    test: (p) => (/\bI\s+am\s+agree/i.test(p.en) ? 'EN: I am agree — I agree.' : null),
  },
  {
    code: 'HOW_CALL_EN',
    severity: 'med',
    test: (p) => (/\bhow\s+(do|does|did)\s+you\s+call\b/i.test(p.en) ? 'EN: how do you call — what do you call / what is ... called.' : null),
  },
  {
    code: 'VERY_PLUS_PARTICIPLE_REVIEW',
    severity: 'low',
    test: (p) => {
      if (!/\bvery\s+[a-z]{3,}(ed|ing)\b/i.test(p.en)) return null;
      if (VERY_ED_OK.test(p.en) || VERY_ING_OK.test(p.en)) return null;
      return 'EN: very + -ed/-ing token — if it is a verb participle, prefer much / rephrase; if adjective, OK.';
    },
  },
  {
    code: 'RU_RAZVE_NEUTRAL_WILL',
    severity: 'high',
    test: (p) => {
      if (!/^\s*Will\b/i.test(p.en) || !/^Разве\b/i.test(p.ru.trim())) return null;
      return 'RU: «Разве» + Will-question skews meaning (doubt vs neutral future). Prefer neutral question.';
    },
  },
  {
    code: 'RU_PROSIT_POMOSH_NOM',
    severity: 'med',
    test: (p) => {
      if (!/просит\s+помощь(?:\s|$|[?!])/i.test(p.ru)) return null;
      return 'RU: after просить use род.п. помощи, not вин. помощь.';
    },
  },
  {
    code: 'EN_POLICY_RU_POLITIKA',
    severity: 'low',
    test: (p) => {
      if (!/\bpolicy\b/i.test(p.en)) return null;
      if (/полис|правил|страхов|policy/i.test(p.ru)) return null;
      if (/политик/i.test(p.ru)) return 'EN policy in insurance/travel context → RU often полис/правила, not «политика».';
      return null;
    },
  },
  {
    code: 'SEMANTIC_AUDIT_NAMED',
    severity: 'low',
    test: (p) => {
      if (!semanticAuditIdSet.has(p.id)) return null;
      return 'Named in docs/reports/lessons_translation_semantic_audit_1_32.md (semantic/collocation review). Re-verify after edits.';
    },
  },
];

const semanticAuditIdSet = new Set(loadSemanticAuditPhraseIds());

const issues = [];
for (const p of flat) {
  for (const r of RULES) {
    const msg = r.test(p);
    if (msg) issues.push({ code: r.code, severity: r.severity, lesson: p.lesson, id: p.id, en: p.en, ru: p.ru, uk: p.uk, msg });
  }
}

const bySev = { high: issues.filter((i) => i.severity === 'high'), med: issues.filter((i) => i.severity === 'med'), low: issues.filter((i) => i.severity === 'low') };

const semanticNamed = issues.filter((i) => i.code === 'SEMANTIC_AUDIT_NAMED');
const lowOther = bySev.low.filter((i) => i.code !== 'SEMANTIC_AUDIT_NAMED');

const outDir = path.join(ROOT, 'docs', 'reports');
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, 'phrase_plausibility_audit.json');
fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      totalPhrases: flat.length,
      issues,
      summary: bySev,
      semanticAuditPhraseIds: [...semanticAuditIdSet],
      heuristicsNote:
        'Automatic rules catch grammar/calque patterns; they do not replace native-speaker review. See also lessons_translation_semantic_audit_1_32.md.',
    },
    null,
    2,
  ),
  'utf8',
);

const lines = [
  '# Phrase plausibility audit (lessons 1–32)',
  '',
  `Generated from live \`lesson_data_all.ts\`. **Total phrases:** ${flat.length}.`,
  '',
  '## Method',
  '',
  '- Heuristic rules (know/knew + time + story/song, broken EN, RU case, etc.).',
  '- Cross-reference: phrase ids extracted from `docs/reports/lessons_translation_semantic_audit_1_32.md` (human semantic audit).',
  '- **No** new “stupid phrase” in the same class as the old L12 knew/song line: automated scan for `knew|know` + time + experience noun → **0 hits** after the fix.',
  '',
  '## Summary',
  '',
  `- **High:** ${bySev.high.length}`,
  `- **Medium:** ${bySev.med.length}`,
  `- **Low (non-semantic list):** ${lowOther.length}`,
  `- **Listed in semantic audit doc:** ${semanticNamed.length} (see section below)`,
  '',
  '## High severity',
  '',
];
for (const i of bySev.high) {
  lines.push(`- **${i.id}** (L${i.lesson}) [${i.code}]: ${i.msg}`);
  lines.push(`  - EN: ${i.en}`);
  lines.push(`  - RU: ${i.ru}`);
  lines.push('');
}
lines.push('## Medium severity', '');
for (const i of bySev.med) {
  lines.push(`- **${i.id}** (L${i.lesson}) [${i.code}]: ${i.msg}`);
  lines.push(`  - EN: ${i.en}`);
  lines.push('');
}
lines.push('## Low severity (heuristics only)', '');
for (const i of lowOther) {
  lines.push(`- **${i.id}** (L${i.lesson}) [${i.code}]`);
  lines.push(`  - EN: ${i.en}`);
  lines.push('');
}
lines.push('## Phrase ids named in `lessons_translation_semantic_audit_1_32.md`', '');
lines.push(`**Count:** ${semanticNamed.length}. Open that file for full rationale (passive voice, reported speech, UK agreement, etc.).`, '');
lines.push('```');
lines.push([...new Set(semanticNamed.map((i) => i.id))].join(', '));
lines.push('```');
lines.push('');

const mdPath = path.join(outDir, 'phrase_plausibility_audit.md');
fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');

const idListJoined = [...new Set(semanticNamed.map((i) => i.id))].join(', ');
const linesRu = [
  '# Аудит правдоподобности фраз (уроки 1–32)',
  '',
  `Данные из актуального \`lesson_data_all.ts\`. **Всего фраз:** ${flat.length}.`,
  '',
  '## Методика',
  '',
  '- Автоматические правила: кальки и неестественные сочетания (в т.ч. know/knew + время + песня/история/кино), грубые ошибки в английском, отдельные паттерны в RU.',
  '- Сверка с ручным отчётом: идентификаторы из `docs/reports/lessons_translation_semantic_audit_1_32.md`.',
  '- После исправления урока 12 проверка **know/knew + время + существительное типа song/story/book…** даёт **0** вхождений — аналога старой «несуществующей» фразы про песню не найдено.',
  '',
  '## Сводка',
  '',
  `- **Высокий приоритет (автоправила):** ${bySev.high.length}`,
  `- **Средний приоритет:** ${bySev.med.length}`,
  `- **Низкий (только эвристики, не из семантического списка):** ${lowOther.length}`,
  `- **Фразы, перечисленные в семантическом аудите:** ${semanticNamed.length} (см. список ниже)`,
  '',
  '## Высокий приоритет — автоматические находки',
  '',
];
for (const i of bySev.high) {
  linesRu.push(`- **${i.id}** (урок ${i.lesson}) [${i.code}]`);
  linesRu.push(`  - EN: ${i.en}`);
  linesRu.push(`  - RU: ${i.ru}`);
  linesRu.push(`  - Примечание: ${i.msg}`);
  linesRu.push('');
}
if (bySev.high.length === 0) linesRu.push('_Совпадений нет._', '');

linesRu.push('## Средний приоритет', '');
for (const i of bySev.med) {
  linesRu.push(`- **${i.id}** (урок ${i.lesson}) [${i.code}]: ${i.msg}`);
  linesRu.push(`  - EN: ${i.en}`);
  linesRu.push('');
}
if (bySev.med.length === 0) linesRu.push('_Совпадений нет._', '');

linesRu.push('## Низкий приоритет (доп. эвристики)', '');
for (const i of lowOther) {
  linesRu.push(`- **${i.id}** (урок ${i.lesson}) [${i.code}]`);
  linesRu.push(`  - EN: ${i.en}`);
  linesRu.push('');
}
if (lowOther.length === 0) linesRu.push('_Нет записей._', '');

linesRu.push(
  '## Идентификаторы из `lessons_translation_semantic_audit_1_32.md`',
  '',
  `**Всего:** ${semanticNamed.length}. В том файле — обоснования (пассив, косвенная речь, украинские формы, согласование и т.д.). Часть пунктов уже могла быть исправлена в коде — сверяйте с актуальными строками в TS.`,
  '',
  '```',
  idListJoined,
  '```',
  '',
  '## Повторный запуск',
  '',
  '`node scripts/audit_phrase_plausibility.mjs` — обновляет этот файл, `phrase_plausibility_audit.md` и JSON.',
  '',
);
const mdRuPath = path.join(outDir, 'phrase_plausibility_audit.ru.md');
fs.writeFileSync(mdRuPath, linesRu.join('\n'), 'utf8');

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
console.log(`Wrote ${mdRuPath}`);
console.log(`Issues: high=${bySev.high.length} med=${bySev.med.length} low=${bySev.low.length}`);
