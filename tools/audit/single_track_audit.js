export const meta = {
  name: 'single-track-content-audit',
  description: 'Audit ONE content track (quiz/word/intro/phrase) with adversarial verification, smaller fan-out to avoid rate limits',
  phases: [
    { title: 'Scan', detail: 'scan this track\'s chunks for defects' },
    { title: 'Verify', detail: 'adversarial skeptic re-checks each flagged item' },
    { title: 'Synthesize', detail: 'rank confirmed defects' },
  ],
}

const CH = 'C:/appsprojects/phraseman/tools/audit/chunks'
const TRACK = (args && args.track) || 'quiz'
const COUNT = (args && args.count) || 33

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      ref: { type: 'string' }, defectType: { type: 'string' },
      severity: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
      quote: { type: 'string' }, explanation: { type: 'string' }, suggestedFix: { type: 'string' },
    }, required: ['ref', 'defectType', 'severity', 'quote', 'explanation', 'suggestedFix'] } },
  }, required: ['findings'],
}
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    ref: { type: 'string' }, isRealDefect: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, reasoning: { type: 'string' },
    correctedSeverity: { type: 'string', enum: ['HIGH', 'MED', 'LOW', 'NOT_A_BUG'] }, bestFix: { type: 'string' },
  }, required: ['ref', 'isRealDefect', 'confidence', 'reasoning', 'correctedSeverity', 'bestFix'],
}

const RULES = `Exercises for native Russian/Ukrainian speakers learning English. Be STRICT — precision over recall. Only flag genuine defects that trap a user (correct answer marked wrong), teach something FALSE, or are unreadable. Do NOT flag: stylistic synonyms preserving meaning; "have to"/"has to"="нужно/должен" and the fact that "need to"/"must"/"cannot" are synonyms; contractions; harmless article/word-order; valid regional variants.`

function instr(track) {
  if (track === 'quiz') return `Multiple-choice quiz items. RU/UK prompt; user picks English. "correct"=accepted index(es) into "choices"; "correctText"=that choice; explanations[i] explains choices[i]. Flag ONLY if: (a) accepted correctText is ungrammatical/wrong English; (b) correct index points to a wrong choice while another is the real answer; (c) MORE THAN ONE choice is a valid translation but only one accepted; (d) RU/UK prompt mismatches the accepted answer in meaning; (e) an explanation contradicts the answer / teaches something false. ref="pool#idx".`
  if (track === 'word') return `Vocabulary cards: {en}=English word; {ru}/{uk}=gloss shown to learner. Flag ONLY if ru/uk gloss is WRONG for the English word (mistranslation), a typo, or describes a different word. Accept correct synonyms/brief glosses. ref=the en value.`
  if (track === 'intro') return `Theory intro examples: {en}=English example; {ru}/{uk}=translations. Flag ONLY if en is ungrammatical, ru/uk mismatches en in meaning, or a typo. ref="file :: en".`
  if (track === 'phrase') return `Phrase-build exercises. Audit only: EN_GRAMMAR (builtEn grammatically wrong), TYPO (spelling/punctuation in builtEn/russian/ukrainian). Do NOT re-flag meaning drift or modal synonyms. ref=the phrase id.`
  return ''
}

function pad(i) { return String(i).padStart(3, '0') }

phase('Scan')
const files = Array.from({ length: COUNT }, (_, i) => `${TRACK}_${pad(i)}.json`)
log(`${TRACK}: ${files.length} chunks (SEQUENTIAL — one agent at a time to dodge rate limits)`)

// Strictly sequential: one scan agent at a time. Verify each chunk's findings
// (small parallel burst) before moving on. Slower but rate-limit-safe.
const collected = []
for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const r = await agent(`Read the JSON file at "${CH}/${file}" (Read tool). It is an array of content items. ${instr(TRACK)}
${RULES}
Return findings (empty array if none): ref, defectType, severity, quote, explanation, suggestedFix.`,
    { label: `scan:${TRACK}:${file}`, phase: 'Scan', schema: FINDING_SCHEMA }).catch(() => null)
  const findings = (r && r.findings) || []
  if (!findings.length) continue
  for (const f of findings) {
    const v = await agent(`STRICT skeptic verifying a reported ${TRACK} defect in an English-learning app for Russian/Ukrainian speakers. Default to NOT_A_BUG unless it genuinely traps a user, teaches something false, or is unreadable.
Reported finding:
${JSON.stringify(f, null, 0)}
Reason from first principles (translate/parse yourself). ${RULES}
Decide isRealDefect, correctedSeverity (NOT_A_BUG if false alarm), confidence, single best minimal fix.`,
      { label: `verify:${TRACK}:${String(f.ref).slice(0, 24)}`, phase: 'Verify', schema: VERDICT_SCHEMA }).catch(() => null)
    if (v) collected.push({ ...f, verdict: v })
  }
  log(`${file}: ${findings.length} raw, running total verified ${collected.length}`)
}

const all = collected
const confirmed = all.filter(x => x && x.verdict && x.verdict.isRealDefect && x.verdict.correctedSeverity !== 'NOT_A_BUG')
log(`${TRACK}: raw ${all.length}, confirmed ${confirmed.length}`)

phase('Synthesize')
const out = confirmed.map(c => ({
  track: TRACK, ref: c.ref, defectType: c.defectType,
  severity: c.verdict.correctedSeverity, quote: c.quote,
  explanation: c.explanation, fix: c.verdict.bestFix || c.suggestedFix, confidence: c.verdict.confidence,
}))
return { track: TRACK, confirmedCount: out.length, rawCount: all.length, findings: out }
