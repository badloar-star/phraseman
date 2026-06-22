export const meta = {
  name: 'full-content-audit',
  description: 'Comprehensive audit of ALL Phraseman learning content (quizzes, phrases deep, vocab, intro examples, theory) for defects that confuse or mislead users, each finding adversarially verified',
  phases: [
    { title: 'Scan', detail: 'agents scan quiz/phrase/word/intro chunks + theory sections in parallel' },
    { title: 'Verify', detail: 'adversarial skeptic re-checks every flagged item' },
    { title: 'Synthesize', detail: 'dedup + severity-rank confirmed defects into one report' },
  ],
}

const DIR = 'C:/appsprojects/phraseman/tools/audit'
const CH = DIR + '/chunks'
const THEORY_PATH = 'C:/appsprojects/phraseman/app/lesson_help.tsx'

// Manifest generated from known chunk counts (strict naming: <track>_NNN.json).
function buildManifest() {
  const counts = { quiz: 33, phrase: 64, word: 27, intro: 8 }
  const out = []
  for (const [track, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      out.push({ track, file: `${track}_${String(i).padStart(3, '0')}.json` })
    }
  }
  return out
}
const MANIFEST = buildManifest()

// Theory line ranges: 1..20356 in 700-line windows.
function buildTheoryRanges() {
  const total = 20356, step = 700, r = []
  for (let s = 1; s <= total; s += step) r.push([s, Math.min(s + step - 1, total)])
  return r
}
const THEORY_RANGES = buildTheoryRanges()

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          defectType: { type: 'string' },
          severity: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
          quote: { type: 'string' },
          explanation: { type: 'string' },
          suggestedFix: { type: 'string' },
        },
        required: ['ref', 'defectType', 'severity', 'quote', 'explanation', 'suggestedFix'],
      },
    },
  },
  required: ['findings'],
}
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    ref: { type: 'string' },
    isRealDefect: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string' },
    correctedSeverity: { type: 'string', enum: ['HIGH', 'MED', 'LOW', 'NOT_A_BUG'] },
    bestFix: { type: 'string' },
  },
  required: ['ref', 'isRealDefect', 'confidence', 'reasoning', 'correctedSeverity', 'bestFix'],
}

const RULES = `Exercises for native Russian/Ukrainian speakers learning English. Be STRICT — precision over recall. Only flag genuine defects that trap a user (correct answer marked wrong), teach something FALSE, or are unreadable. Do NOT flag: stylistic synonyms preserving meaning; "have to"/"has to"="нужно/должен"; contractions; harmless article/word-order; valid regional variants.`

function trackInstructions(track) {
  if (track === 'quiz') return `Multiple-choice quiz items. RU/UK prompt; user picks English. "correct"=accepted index(es) into "choices"; "correctText"=that choice; explanations[i] explains choices[i]. Flag ONLY if: (a) accepted correctText is ungrammatical/wrong English; (b) correct index points to a wrong choice while another is the real answer; (c) more than one choice is a valid translation but only one accepted; (d) RU/UK prompt mismatches the accepted answer in meaning; (e) an explanation contradicts the answer / teaches something false. ref="pool#idx".`
  if (track === 'phrase') return `Phrase-build exercises. Audit THREE axes only (meaning-drift already done, do NOT re-flag it): EN_GRAMMAR (builtEn grammatically wrong), TYPO (spelling/punctuation in builtEn/russian/ukrainian), DIDACTIC_MISMATCH (phrase blatantly doesn't fit its lesson number's grammar topic — only obvious cases). ref=the phrase id.`
  if (track === 'word') return `Vocabulary cards: {en}=English word; {ru}/{uk}=gloss shown to learner. Flag ONLY if ru/uk gloss is WRONG for the English word (mistranslation), a typo, or describes a different word. Accept correct synonyms/brief glosses. ref=the en value.`
  if (track === 'intro') return `Theory intro examples: {en}=English example; {ru}/{uk}=translations. Flag ONLY if en is ungrammatical, ru/uk mismatches en in meaning, or a typo. ref="file :: en".`
  return ''
}

function scanPrompt(track, file) {
  return `Read the JSON file at "${CH}/${file}" (use the Read tool). It is an array of content items. ${trackInstructions(track)}
${RULES}
Return findings (empty array if none). For each: ref, defectType, severity, quote (exact problematic text), explanation (why it confuses/misleads — concrete), suggestedFix.`
}

function theoryPrompt(start, end) {
  return `Read lines ${start}-${end} of the English-grammar theory file "${THEORY_PATH}" (use Read with offset/limit). This is theory shown to Russian/Ukrainian learners (rules, tables, examples, RU/UK text).
Flag ONLY: (a) a FALSE grammar claim (states an English rule incorrectly); (b) an example sentence that is itself ungrammatical or contradicts the rule it illustrates; (c) a RU/UK explanation that mistranslates or misstates the rule; (d) a clear typo in an example. ${RULES}
Use ref = a short unique quoted snippet of the offending text (so it can be located). Return findings (empty array if none).`
}

function verifyPrompt(f, track) {
  return `STRICT skeptic verifying a reported defect in an English-learning app for Russian/Ukrainian speakers (content type: ${track}). Default to NOT_A_BUG unless it genuinely traps a user, teaches something false, or is unreadable.
Reported finding:
${JSON.stringify(f, null, 0)}
Reason from first principles (translate/parse it yourself). ${RULES}
Decide isRealDefect, correctedSeverity (NOT_A_BUG if false alarm), confidence, single best minimal fix.`
}

// ---------------- SCAN (all tracks + theory in one parallel pool) ----------------
phase('Scan')
const scanJobs = []
for (const m of MANIFEST) scanJobs.push({ kind: m.track, label: `scan:${m.track}:${m.file}`, prompt: scanPrompt(m.track, m.file) })
for (const [s, e] of THEORY_RANGES) scanJobs.push({ kind: 'theory', label: `scan:theory:${s}-${e}`, prompt: theoryPrompt(s, e) })
log(`Scan jobs: ${scanJobs.length} (${MANIFEST.length} content chunks + ${THEORY_RANGES.length} theory ranges)`)

const scanResults = await pipeline(
  scanJobs,
  (job) => agent(job.prompt, { label: job.label, phase: 'Scan', schema: FINDING_SCHEMA })
    .then(r => ({ kind: job.kind, findings: (r && r.findings) || [] }))
    .catch(() => ({ kind: job.kind, findings: [] })),
  (res) => {
    if (!res || !res.findings.length) return { kind: res ? res.kind : null, verified: [] }
    return parallel(res.findings.map(f => () =>
      agent(verifyPrompt(f, res.kind), { label: `verify:${res.kind}:${String(f.ref).slice(0, 24)}`, phase: 'Verify', schema: VERDICT_SCHEMA })
        .then(v => ({ ...f, kind: res.kind, verdict: v })).catch(() => null)
    )).then(arr => ({ kind: res.kind, verified: arr.filter(Boolean) }))
  }
)

const allVerified = scanResults.filter(Boolean).flatMap(r => r.verified)
const rawCount = allVerified.length
const confirmed = allVerified.filter(x => x && x.verdict && x.verdict.isRealDefect && x.verdict.correctedSeverity !== 'NOT_A_BUG')
log(`Raw verified findings: ${rawCount}; confirmed real defects: ${confirmed.length}`)

// ---------------- SYNTHESIZE ----------------
phase('Synthesize')
if (!confirmed.length) {
  return { confirmedCount: 0, rawCount, byTrack: {}, findings: [], report: 'No content defects survived adversarial verification.' }
}
const byTrack = {}
for (const c of confirmed) byTrack[c.kind] = (byTrack[c.kind] || 0) + 1

const synthInput = confirmed.map(c => ({
  track: c.kind, ref: c.ref, defectType: c.defectType,
  severity: c.verdict.correctedSeverity, quote: c.quote,
  explanation: c.explanation, fix: c.verdict.bestFix || c.suggestedFix,
  confidence: c.verdict.confidence,
}))

const report = await agent(`Write the final audit report as clean markdown (in Russian). Below are confirmed content defects in an English-learning app (each survived adversarial verification). Group by track (quiz/phrase/word/intro/theory), then by severity HIGH->LOW. For each: ref, the problem in one line, the concrete fix. End with a short executive summary of the patterns. Be concise and precise.

Confirmed defects (${synthInput.length}), counts by track: ${JSON.stringify(byTrack)}:
${JSON.stringify(synthInput, null, 2)}`, { label: 'synthesize', phase: 'Synthesize' })

return { confirmedCount: synthInput.length, rawCount, byTrack, findings: synthInput, report }
