/**
 * Victoria QA — профіль `marketplace_phrase_v1` (картки маркету: фраза + дослівно + explanation + IPA).
 * Док: docs/pipelines/victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md
 *
 * Usage: node tools/victoria_marketplace_phrase_qa.mjs [path/to/pack.json]
 * Default: app/flashcards/bundles/official_peaky_blinders_en.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const defaultPack = join(root, 'app/flashcards/bundles/official_peaky_blinders_en.json');

/** Мін. довжина explanation* для контексту (символи), не враховуючи лише пробіли. */
const MIN_EXPLANATION_LEN = 50;

const GB_PATTERNS = [
  /\bcolou?r\b/i,
  /\bcentre\b/i,
  /\bdefence\b/i,
  /\borganise\b/i,
  /\brecognise\b/i,
  /\bbehaviou?r\b/i,
  /\bfavou?r\b/i,
  /\bneighbou?r\b/i,
  /\btravelled\b/i,
  /\bmodelling\b/i,
  /\bprogramme\b/i,
];

function norm(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function gitShort() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function load(packPath) {
  const raw = readFileSync(packPath, 'utf8');
  return JSON.parse(raw);
}

function scanGb(text) {
  const hits = [];
  const t = String(text || '');
  for (const p of GB_PATTERNS) {
    if (p.test(t)) {
      const m = t.match(p);
      if (m) hits.push(m[0]);
    }
  }
  return [...new Set(hits)];
}

function jaccardBigrams(a, b) {
  const A = a.replace(/\s+/g, ' ').trim();
  const B = b.replace(/\s+/g, ' ').trim();
  if (A.length < 4 || B.length < 4) return 0;
  const big = (s) => {
    const out = new Set();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2).toLowerCase());
    return out;
  };
  const ba = big(A);
  const bb = big(B);
  let inter = 0;
  for (const x of ba) if (bb.has(x)) inter++;
  return inter / (ba.size + bb.size - inter + 0.0001);
}

function ymd() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function outPathsFor(packId, baseDir) {
  const slug = String(packId || 'pack')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const date = ymd();
  const name = `victoria-marketplace-phrase-${slug}-${date}`;
  return {
    json: join(baseDir, `${name}.json`),
    md: join(baseDir, `${name}.md`),
    baseName: name,
  };
}

/**
 * @param {string} [packPath]
 * @param {{ outDir?: string }} [opts]
 */
export function runMarketplacePhraseQa(packPath = resolve(process.argv[2] || defaultPack), opts = {}) {
  const data = load(packPath);
  const file = packPath.replace(/\\/g, '/').split('/').pop();
  const pack = data.pack;
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const packId = pack?.id || 'unknown';

  const outDir = opts.outDir || join(root, 'docs', 'reports');
  const { json: outJson, md: outMd, baseName: reportBaseName } = outPathsFor(packId, outDir);

  // --- MP0: integrity ---
  const idSet = new Set();
  const duplicateIds = [];
  for (const c of cards) {
    if (idSet.has(c.id)) duplicateIds.push(c.id);
    idSet.add(c.id);
  }

  const declared = Number(pack?.cardCount ?? 0);
  const countMismatch = declared !== cards.length;
  const emptyEn = cards.filter((c) => !String(c.en || '').trim()).map((c) => c.id);
  const emptyRu = cards.filter((c) => !String(c.ru || '').trim()).map((c) => c.id);
  const emptyUk = cards.filter((c) => !String(c.uk || '').trim()).map((c) => c.id);
  const missTr = cards.filter((c) => !String(c.transcription || '').trim()).map((c) => c.id);
  const emptyExpRu = cards.filter((c) => !String(c.explanationRu || '').trim()).map((c) => c.id);
  const emptyExpUk = cards.filter((c) => !String(c.explanationUk || '').trim()).map((c) => c.id);
  const emptyLitRu = cards.filter((c) => !String(c.literalRu || '').trim()).map((c) => c.id);
  const emptyLitUk = cards.filter((c) => !String(c.literalUk || '').trim()).map((c) => c.id);

  const mp0Blockers = {
    duplicateIds: duplicateIds.length,
    countMismatch,
    emptyEn: emptyEn.length,
    emptyRu: emptyRu.length,
    emptyUk: emptyUk.length,
    missingTranscription: missTr.length,
    emptyExplanations: { ru: emptyExpRu.length, uk: emptyExpUk.length },
    emptyLiteral: { ru: emptyLitRu.length, uk: emptyLitUk.length },
  };

  const allPass_integrity =
    duplicateIds.length === 0 &&
    !countMismatch &&
    emptyEn.length === 0 &&
    emptyRu.length === 0 &&
    emptyUk.length === 0 &&
    missTr.length === 0 &&
    emptyExpRu.length === 0 &&
    emptyExpUk.length === 0 &&
    emptyLitRu.length === 0 &&
    emptyLitUk.length === 0;

  // --- MP1: en-US skim (en + optional expansion/abbrev) ---
  const enGbHits = [];
  for (const c of cards) {
    const block = [c.en, c.expansionEn, c.abbrev, c.exampleEn].filter(Boolean).join(' ');
    const h = scanGb(block);
    if (h.length) enGbHits.push({ id: c.id, samples: h });
  }
  const allPass_enUsSkim = enGbHits.length === 0;

  // --- MP2: literal* must not copy main ru/uk gloss ---
  const literalEqualsGloss = [];
  for (const c of cards) {
    if (norm(c.literalRu) && norm(c.ru) && norm(c.literalRu) === norm(c.ru) && String(c.ru).trim().length > 2) {
      literalEqualsGloss.push({ id: c.id, field: 'literalRu===ru' });
    }
    if (norm(c.literalUk) && norm(c.uk) && norm(c.literalUk) === norm(c.uk) && String(c.uk).trim().length > 2) {
      literalEqualsGloss.push({ id: c.id, field: 'literalUk===uk' });
    }
  }
  const mp2_ok = literalEqualsGloss.length === 0;

  // --- MP3: explanation length + literal === explanation (exact) ---
  const shortExpRu = cards
    .filter((c) => String(c.explanationRu || '').replace(/\s/g, '').length < MIN_EXPLANATION_LEN)
    .map((c) => c.id);
  const shortExpUk = cards
    .filter((c) => String(c.explanationUk || '').replace(/\s/g, '').length < MIN_EXPLANATION_LEN)
    .map((c) => c.id);
  const exactLiteralExpl = [];
  for (const c of cards) {
    if (norm(c.literalRu) && norm(c.literalRu) === norm(c.explanationRu)) exactLiteralExpl.push({ packId, id: c.id, field: 'literalRu===explanationRu' });
    if (norm(c.literalUk) && norm(c.literalUk) === norm(c.explanationUk)) exactLiteralExpl.push({ packId, id: c.id, field: 'literalUk===explanationUk' });
  }
  const mp3_ok = exactLiteralExpl.length === 0 && shortExpRu.length === 0 && shortExpUk.length === 0;

  // --- MP4: transcription looks like IPA line ---
  const badIpaShape = cards.filter((c) => {
    const t = String(c.transcription || '').trim();
    if (!t) return true;
    return !t.startsWith('/');
  });

  // --- MP5: RU/UK explanation length balance (suspect) ---
  const imbalancedExpl = [];
  for (const c of cards) {
    const a = String(c.explanationRu || '').length;
    const b = String(c.explanationUk || '').length;
    if (a < 20 || b < 20) continue;
    const ratio = a / b;
    if (ratio < 0.35 || ratio > 2.8) imbalancedExpl.push(c.id);
  }
  const mp5_ok = imbalancedExpl.length === 0;

  // --- MP6: pack meta (reuse vq7) ---
  const titleRuEmpty = !String(pack?.titleRu || '').trim();
  const titleUkEmpty = !String(pack?.titleUk || '').trim();
  const descRuEmpty = !String(pack?.descriptionRu || '').trim();
  const descUkEmpty = !String(pack?.descriptionUk || '').trim();
  const mp6 = {
    packId,
    titleRuEmpty,
    titleUkEmpty,
    descRuEmpty,
    descUkEmpty,
    category: String(pack?.category || ''),
    countMismatch: declared !== cards.length,
    cardCountDeclared: declared,
    cardCountActual: cards.length,
  };
  const mp6_ok =
    !titleRuEmpty && !titleUkEmpty && !descRuEmpty && !descUkEmpty && !mp6.countMismatch;

  // --- MP7: duplicate en within pack ---
  const enDuplicateWithinPack = [];
  const seen = new Map();
  for (const c of cards) {
    const e = norm(c.en);
    if (!e) continue;
    if (seen.has(e)) enDuplicateWithinPack.push({ a: seen.get(e), b: c.id, en: c.en });
    else seen.set(e, c.id);
  }
  const mp7_ok = enDuplicateWithinPack.length === 0;

  // --- MP8: abbrev pack: if abbrev set, want expansionEn ---
  const abbrevWithoutExpansion = cards.filter(
    (c) => String(c.abbrev || '').trim() && !String(c.expansionEn || '').trim()
  );
  const mp8_ok = abbrevWithoutExpansion.length === 0;

  // Optional columns (if present anywhere, all filled) — for mixed packs
  const hasRegisterColumn = cards.some((c) => c.register != null && String(c.register).trim() !== '');
  const hasLevelColumn = cards.some((c) => c.level != null && String(c.level).trim() !== '');
  const missingRegister = hasRegisterColumn
    ? cards.filter((c) => c.register == null || String(c.register).trim() === '')
    : [];
  const missingLevel = hasLevelColumn
    ? cards.filter((c) => c.level == null || String(c.level).trim() === '')
    : [];
  const optionalRegLevel_ok =
    (!hasRegisterColumn || missingRegister.length === 0) && (!hasLevelColumn || missingLevel.length === 0);

  // Examples: only fail if key exists but empty
  const emptyExEn = cards.filter((c) => c.exampleEn != null && !String(c.exampleEn).trim());
  const emptyExRu = cards.filter((c) => c.exampleRu != null && !String(c.exampleRu).trim());
  const emptyExUk = cards.filter((c) => c.exampleUk != null && !String(c.exampleUk).trim());
  let optional_examples_ok = emptyExEn.length === 0 && emptyExRu.length === 0 && emptyExUk.length === 0;
  if (emptyExEn.length + emptyExRu.length + emptyExUk.length === 0 && !cards.some((c) => c.exampleEn != null)) {
    optional_examples_ok = true;
  }

  // usage vs explanation overlap — only if usage fields used
  const highOverlap = { ru: [], uk: [] };
  for (const c of cards) {
    const ur = String(c.usageNoteRu || '');
    const uuk = String(c.usageNoteUk || '');
    const er = String(c.explanationRu || '');
    const eu = String(c.explanationUk || '');
    if (ur && er && jaccardBigrams(ur, er) > 0.55) highOverlap.ru.push(c.id);
    if (uuk && eu && jaccardBigrams(uuk, eu) > 0.55) highOverlap.uk.push(c.id);
  }
  const hasAnyUsage = cards.some((c) => String(c.usageNoteRu || c.usageNoteUk || '').trim());
  const optional_usage_ok = !hasAnyUsage || (highOverlap.ru.length === 0 && highOverlap.uk.length === 0);

  const passSummary = {
    cardProfile: 'marketplace_phrase_v1',
    mp0_ok: allPass_integrity,
    mp1_ok: allPass_enUsSkim,
    mp2_ok: mp2_ok,
    mp3_ok: mp3_ok,
    mp4_ok: missTr.length === 0 && badIpaShape.length === 0,
    mp5_ok: mp5_ok,
    mp6_ok: mp6_ok,
    mp7_ok: mp7_ok,
    mp8_ok: mp8_ok,
    /** Додаткові гейти, якщо в паку з’являються example/usage/reg */
    optional_reglevel_ok: optionalRegLevel_ok,
    optional_examples_ok: optional_examples_ok,
    optional_usage_ok: optional_usage_ok,
    all_machine_ok:
      allPass_integrity &&
      allPass_enUsSkim &&
      mp2_ok &&
      mp3_ok &&
      missTr.length === 0 &&
      badIpaShape.length === 0 &&
      mp5_ok &&
      mp6_ok &&
      mp7_ok &&
      mp8_ok &&
      optionalRegLevel_ok &&
      optional_examples_ok &&
      optional_usage_ok,
  };

  const report = {
    agent: 'victoria-marketplace-phrase-qa',
    cardProfile: 'marketplace_phrase_v1',
    pipelineDoc: 'docs/pipelines/victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md',
    packFilter: packId,
    generatedAt: new Date().toISOString(),
    reportBaseName,
    sourceFile: file,
    sourcePath: packPath.replace(/\\/g, '/'),
    gitShort: gitShort(),

    mp0_integrity: {
      allPass: allPass_integrity,
      blockers: mp0Blockers,
      duplicateIds,
      perPack: [{ packId, file }],
    },
    mp1_enUs_orthography: {
      allPass: allPass_enUsSkim,
      gEnVariantScan: enGbHits.length === 0 ? 'PASS' : `REVIEW (${enGbHits.length} card(s))`,
      enGbDetails: enGbHits.slice(0, 30),
    },
    mp2_literal_vs_gloss: {
      literalEqualsMainTranslation: literalEqualsGloss,
      count: literalEqualsGloss.length,
    },
    mp3_explanation_and_literal_dup: {
      minLenThreshold: MIN_EXPLANATION_LEN,
      tooShort: { ru: shortExpRu, uk: shortExpUk },
      exactLiteralEqualsExplanation: exactLiteralExpl,
    },
    mp4_transcription: {
      missing: missTr,
      notStartingWithSlash: badIpaShape.map((c) => c.id),
      note: 'Marketplace profile expects IPA in slashes, e.g. /ˈpɪkɪ/',
    },
    mp5_ru_uk_explanation_balance: { imbalanced: imbalancedExpl },
    mp6_pack_meta: [mp6],
    mp7_duplicate_en: { withinPack: enDuplicateWithinPack },
    mp8_abbrev: {
      abbrevWithoutExpansionEn: abbrevWithoutExpansion.map((c) => c.id),
    },
    optional_columns: {
      registerLevel: { hasRegisterColumn, hasLevelColumn, missingRegister: missingRegister.map((c) => c.id), missingLevel: missingLevel.map((c) => c.id) },
      examples: { emptyExEn, emptyExRu, emptyExUk },
      usageVsExplanation: highOverlap,
    },

    vq1_semantic_ru_uk: {
      status: 'SKIPPED — LLM: docs/pipelines/victoria-qa/vq1-semantic-en-ru-uk.md (use as LP1 for phrase profile)',
    },
    vq9_arbiter_ru_uk: {
      status: 'SKIPPED — LLM: docs/pipelines/victoria-qa/vq9-arbiter-ru-uk.md (use as LP5 for phrase profile)',
    },
    llm_recommended: {
      lp1_semantic: 'docs/pipelines/victoria-qa/vq1-semantic-en-ru-uk.md',
      lp2_literal_explanation: 'docs/pipelines/victoria-qa/vq4-literal-explanation.md',
      lp3_ipa: 'docs/pipelines/victoria-qa/vq5-transcription-ipa.md',
      lp4_pack: 'docs/pipelines/victoria-qa/vq7-pack-integrity.md',
      lp5_arbiter: 'docs/pipelines/victoria-qa/vq9-arbiter-ru-uk.md',
    },
    passSummary,
  };

  const dir = dirname(outJson);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const md = buildMd(report, passSummary, cards.length, outJson, outMd);
  writeFileSync(outMd, md, 'utf8');

  console.log('Wrote:', outJson);
  console.log('Wrote:', outMd);
  return { report, outJson, outMd };
}

function buildMd(rep, pass, nCards, outJson, outMd) {
  const s = (x) => (x ? 'OK' : 'FAIL');
  const sAll = (x) => (x ? '**PASS**' : '**FAIL**');
  return `# Victoria — marketplace phrase (${rep.cardProfile})

**UTC:** ${rep.generatedAt}  
**Файл:** \`${rep.sourceFile}\`  
**pack.id:** \`${rep.packFilter}\`  
**Git:** \`${rep.gitShort}\`  
**Карток:** ${nCards}

Пайплайн: [MARKETPLACE_PHRASE_PIPELINE.md](../pipelines/victoria-qa/MARKETPLACE_PHRASE_PIPELINE.md)

## Машинні кроки (MP)

| ID | Що перевіряє | Статус |
|----|----------------|--------|
| MP0 | Унікальні id, count, en/ru/uk, literal*, explanation*, transcription | **${s(pass.mp0_ok)}** |
| MP1 | en-US скім (en + expansionEn + abbrev; без поширеного BrE) | **${s(pass.mp1_ok)}** |
| MP2 | literal* ≠ main ru/uk | **${s(pass.mp2_ok)}** |
| MP3 | Довжина explanation*; literal* ≠ explanation* | **${s(pass.mp3_ok)}** |
| MP4 | transcription (IPA, \`/…/\`) | **${s(pass.mp4_ok)}** |
| MP5 | Баланс довжин RU/UK пояснень | **${s(pass.mp5_ok)}** |
| MP6 | Мета pack | **${s(pass.mp6_ok)}** |
| MP7 | Дублікати \`en\` | **${s(pass.mp7_ok)}** |
| MP8 | abbrev → \`expansionEn\` | **${s(pass.mp8_ok)}** |
| (opt) | register/level, example*, usage* якщо задані | — |

**Усі обов’язкові MP:** ${sAll(pass.all_machine_ok)}

## LLM (не з коду)

LP1…LP5 — див. \`${rep.pipelineDoc}\`

## JSON

\`${outJson.replace(/\\/g, '/')}\`  
*Markdown:* \`${outMd.replace(/\\/g, '/')}\`

*Згенеровано \`victoria_marketplace_phrase_qa.mjs\`*
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runMarketplacePhraseQa();
}
