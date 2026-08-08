#!/usr/bin/env node
/**
 * audit_phrase_audio_sync.mjs — deep text↔audio sync audit for phrase audio.
 *
 * WHY THIS EXISTS
 * ---------------
 * The shipped guard (check_all_audio_freshness.mjs) only scans the `english:`
 * field. But the text the user actually SEES and the text the mp3 was recorded
 * for can diverge across THREE independent fields on one phrase:
 *   - english:      the base sentence
 *   - alternatives: extra accepted answers ("Did somebody take my phone?")
 *   - wordsEn:      the token slots the lesson screen assembles for display
 * When someone edits one field and not the others (e.g. someone → somebody),
 * the card shows the new word but the mp3 still speaks the old one. The english-
 * only guard reports "OK" because english never changed. This audit closes that
 * blind spot and is DETECTION ONLY — it spends no money and writes no files.
 *
 * SOURCES OF TRUTH
 * ----------------
 *   app/phrase_audio_url_map.generated.ts — normalized TEXT -> Storage mp3 URL.
 *       This is what the app plays (hooks/use-audio.ts -> getPhraseAudioUrl).
 *   .codex-tmp/tts-voicing/audio_url_map.json (+ _gaps) — id -> {url, text}.
 *       Records the exact text each mp3 was VOICED for. Lets us catch the case
 *       "an mp3 exists and is mapped, but it speaks OLD text".
 *
 * WHAT IT REPORTS (per phrase, using the SAME display rule as the app)
 * -------------------------------------------------------------------
 *   SHOWN_NO_AUDIO  — the displayed line has no mp3 in the map at all.
 *   AUDIO_SAYS_OLD  — an mp3 IS mapped for this phrase id, but the text it was
 *                     voiced for differs from what the phrase now shows/accepts.
 *   ALT_NO_AUDIO    — an `alternatives` form that a user can be shown/graded on
 *                     has no mp3 (softer than SHOWN_NO_AUDIO; informational).
 *   FIELD_DRIFT     — english / wordsEn-surface / alternatives disagree on the
 *                     wording inside a single phrase (the root cause upstream).
 *   ORPHAN          — a map key that no current phrase/word text produces, i.e.
 *                     an mp3 nobody references anymore (accumulates on Storage).
 *
 *   node scripts/audit_phrase_audio_sync.mjs           # human report, exit 1 on gaps
 *   node scripts/audit_phrase_audio_sync.mjs --json     # machine-readable
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');

// ── normalize identically to the runtime lookup (use-audio.ts / build_map_ts) ─
const norm = (t) => String(t).trim().toLowerCase().replace(/\s+/g, ' ');

// Compare two lines by their WORDS only, ignoring punctuation/case/spacing — the
// TTS speaks "phone" and "phone?" identically, so a bare ?/./! delta is not a
// real audio mismatch. A changed word (near→next to) still differs here.
const coreWords = (t) => norm(t).replace(/[.,;:!?"'()]/g, '').replace(/\s+/g, ' ').trim();

// Strip the article/chunk markers the lesson builder strips before display,
// mirroring stripMarkers in app/phrase_target_utils.ts (kept intentionally in
// sync — if that file changes its cleaning, mirror it here).
function stripMarkers(word) {
  const s = word
    .replace(/^\/|\/$/g, '')
    .replace(/«-»/g, '')
    .replace(/[«»]/g, '')
    .replace(/[.!?,;]+$/, '')
    .trim();
  return s === '-' ? '' : s;
}
function cleanForDisplay(surface) {
  return String(surface).split(' ').map(stripMarkers).filter((w) => w.length > 0).join(' ');
}

// The app re-attaches the final ?/!/. from the translation prompt after cleaning
// (phraseAnswerDisplayLine, app/phrase_target_utils.ts lines ~135-150). The
// wordsEn slots often already carry it (e.g. "phone?"), but when the surface
// comes out bare we must restore it, or the lookup key won't match the mp3 key
// which WAS generated with punctuation. `translation` is russian (or ukrainian).
function restorePunct(clean, translation) {
  if (/[.?!]$/.test(clean)) return clean;
  const src = String(translation || '');
  if (src.endsWith('?')) return clean + '?';
  if (src.endsWith('!')) return clean + '!';
  if (src.endsWith('.')) return clean + '.';
  return clean;
}

// ── load the phrase-audio map: normalized text -> url, plus reverse url->text ─
function loadPhraseMap() {
  const f = path.join(ROOT, 'app', 'phrase_audio_url_map.generated.ts');
  const keyToUrl = new Map();
  if (!fs.existsSync(f)) return keyToUrl;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*"(https[^"]+)"/gm)) {
    keyToUrl.set(norm(JSON.parse(`"${m[1]}"`)), m[2]);
  }
  return keyToUrl;
}

// ── load id -> {url, text} so we know what text each mp3 was VOICED for ───────
function loadVoicedText() {
  const dir = path.join(ROOT, '.codex-tmp', 'tts-voicing');
  const urlToVoiced = new Map();     // storage url -> the text the mp3 speaks
  const lessonVoiced = [];           // {source,text,url} for lesson/idiom mp3s only
  const LESSON_SOURCES = new Set(['lesson', 'lesson_comma', 'idiom']);
  for (const name of ['audio_url_map.json', 'audio_url_map_gaps.json']) {
    const f = path.join(dir, name);
    if (!fs.existsSync(f)) continue;
    let obj;
    try { obj = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    for (const id of Object.keys(obj)) {
      const rec = obj[id];
      if (rec && rec.url && rec.text) {
        urlToVoiced.set(rec.url, String(rec.text));
        if (LESSON_SOURCES.has(rec.source)) lessonVoiced.push({ id, source: rec.source, text: String(rec.text), url: rec.url });
      }
    }
  }
  return { urlToVoiced, lessonVoiced };
}

// ── extract phrases from a lesson/idiom data file ─────────────────────────────
// We parse the raw source (no TS runtime) but structurally: each phrase object
// contributes id, english, alternatives[], and a wordsEn surface (joined slots).
function extractPhrases(absFile) {
  if (!fs.existsSync(absFile)) return [];
  const src = fs.readFileSync(absFile, 'utf8');
  const out = [];

  // Split on `id:` boundaries at object level; good enough for these flat
  // phrase records and far cheaper than a full TS parse.
  const idRe = /\bid:\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;
  const marks = [];
  let m;
  while ((m = idRe.exec(src))) marks.push({ id: m[2], start: m.index });
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].start;
    const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
    const block = src.slice(start, end);
    const english = firstField(block, 'english');
    if (!english) continue; // not a phrase record (e.g. teaching note)
    out.push({
      id: marks[i].id,
      english,
      russian: firstField(block, 'russian'),
      ukrainian: firstField(block, 'ukrainian'),
      alternatives: listField(block, 'alternatives'),
      wordsEnSurface: wordsSurface(block, 'wordsEn'),
    });
  }
  return out;
}

function firstField(block, field) {
  const re = new RegExp(`\\b${field}:\\s*(['"\`])((?:\\\\.|(?!\\1)[^\\n])*)\\1`);
  const mm = block.match(re);
  return mm ? mm[2].replace(/\\(['"`\\])/g, '$1').trim() : '';
}
function listField(block, field) {
  const re = new RegExp(`\\b${field}:\\s*\\[([^\\]]*)\\]`);
  const mm = block.match(re);
  if (!mm) return [];
  const out = [];
  for (const s of mm[1].matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)) {
    const t = s[2].replace(/\\(['"`\\])/g, '$1').trim();
    if (t) out.push(t);
  }
  return out;
}
// Join the `correct` (fallback `text`) of each slot in a wordsEn:[...] array
// into the surface the lesson screen shows, mirroring phraseCanonicalAnswer.
function wordsSurface(block, field) {
  const re = new RegExp(`\\b${field}:\\s*\\[`);
  const at = block.search(re);
  if (at < 0) return '';
  // capture the bracketed array (slots hold no nested arrays besides distractors,
  // so balance brackets to find the matching close)
  let depth = 0, i = block.indexOf('[', at), startArr = i;
  for (; i < block.length; i++) {
    if (block[i] === '[') depth++;
    else if (block[i] === ']') { depth--; if (depth === 0) break; }
  }
  const arr = block.slice(startArr, i + 1);
  const tokens = [];
  for (const slot of arr.matchAll(/\{([^}]*)\}/g)) {
    const body = slot[1];
    const correct = firstFieldInline(body, 'correct') ?? firstFieldInline(body, 'text');
    if (correct != null) {
      const cleaned = stripMarkers(correct);
      if (cleaned) tokens.push(cleaned);
    }
  }
  return tokens.join(' ');
}
function firstFieldInline(body, field) {
  const re = new RegExp(`\\b${field}:\\s*(['"\`])((?:\\\\.|(?!\\1).)*?)\\1`);
  const mm = body.match(re);
  return mm ? mm[2].replace(/\\(['"`\\])/g, '$1').trim() : null;
}

// The line the app DISPLAYS for the EN target: wordsEn surface if present,
// else the plain english — then final punctuation restored from the translation,
// exactly as phraseAnswerDisplayLine does before it hits the audio lookup.
function displayLine(p) {
  const raw = p.wordsEnSurface ? p.wordsEnSurface : p.english;
  const clean = cleanForDisplay(raw);
  return restorePunct(clean, p.ukrainian || p.russian);
}
// The english field cleaned + punctuated the same way (for stale-audio compare).
function englishLine(p) {
  return restorePunct(cleanForDisplay(p.english), p.ukrainian || p.russian);
}

// ── run ───────────────────────────────────────────────────────────────────────
// The files that actually CARRY phrase records. Lessons 1-16 live in generated
// *_phrases_es.gen.ts files; 17-32 are inline. (The lesson_data_1_8.ts wrapper
// only re-exports them and holds NO phrases — scanning it, as the shipped
// freshness guard does, silently misses lessons 1-16. That is a real gap in the
// existing guard, addressed by pointing this audit at the generated files.)
const PHRASE_FILES = [
  'app/lesson_data_1_8_phrases_es.gen.ts',
  'app/lesson_data_9_16_phrases_es.gen.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

const keyToUrl = loadPhraseMap();
const { urlToVoiced, lessonVoiced } = loadVoicedText();

const findings = { SHOWN_NO_AUDIO: [], AUDIO_SAYS_OLD: [], ALT_NO_AUDIO: [], FIELD_DRIFT: [], ORPHAN: [] };
const referencedKeys = new Set();  // normalized (punct-preserving) map lookup keys
const referencedCore = new Set();  // punct-stripped word forms, for orphan compare

const phrases = [];
for (const rel of PHRASE_FILES) {
  for (const p of extractPhrases(path.join(ROOT, rel))) phrases.push({ ...p, sourceFile: rel });
}

for (const p of phrases) {
  const shown = displayLine(p);
  const shownKey = norm(shown);
  const englishKey = norm(englishLine(p));
  const altKeys = p.alternatives.map((a) => norm(restorePunct(cleanForDisplay(a), p.ukrainian || p.russian)));

  // every text the content can surface (for orphan accounting)
  referencedKeys.add(shownKey);
  referencedKeys.add(englishKey);
  for (const k of altKeys) referencedKeys.add(k);
  referencedCore.add(coreWords(shown));
  referencedCore.add(coreWords(englishLine(p)));
  for (const a of p.alternatives) referencedCore.add(coreWords(a));

  // FIELD_DRIFT is the REAL internal rot: the wordsEn slots the user assembles
  // disagree with the english sentence the mp3 was generated from. This is the
  // exact "shows one word, graded/voiced on another" trap. `alternatives` are
  // legitimately different phrasings by design, so they are NOT counted here.
  if (p.wordsEnSurface && shownKey !== englishKey) {
    findings.FIELD_DRIFT.push({
      id: p.id, sourceFile: p.sourceFile,
      english: p.english, shown,
    });
  }

  // SHOWN_NO_AUDIO vs AUDIO_SAYS_OLD: judge against what the user hears.
  const shownUrl = keyToUrl.get(shownKey);
  if (!shownUrl) {
    // The displayed line has no mp3. But maybe an mp3 IS mapped for the english
    // form (old wording) — that's the classic "shows new, speaks old" case.
    const englishUrl = keyToUrl.get(englishKey);
    const anyAltUrl = altKeys.map((k) => keyToUrl.get(k)).find(Boolean);
    const idVoiced = lessonVoiced.find((candidate) => candidate.id === p.id);
    const staleIdUrl = idVoiced && coreWords(idVoiced.text) !== coreWords(shown)
      ? idVoiced.url
      : undefined;
    const staleUrl = englishUrl || anyAltUrl || staleIdUrl;
    if (staleUrl) {
      const voiced = urlToVoiced.get(staleUrl) || '(unknown)';
      findings.AUDIO_SAYS_OLD.push({
        id: p.id, sourceFile: p.sourceFile,
        shown, voiced, url: staleUrl,
      });
    } else {
      findings.SHOWN_NO_AUDIO.push({ id: p.id, sourceFile: p.sourceFile, shown });
    }
  } else {
    // An mp3 is mapped for exactly the shown text. Double-check the voiced text
    // recorded for that url actually matches. Compare on core WORDS only (strip
    // trailing .?! from both sides) so a punctuation-only difference — which the
    // TTS reads identically — is not flagged. A real word change (near vs next
    // to) still trips it.
    const voiced = urlToVoiced.get(shownUrl);
    if (voiced && coreWords(voiced) !== coreWords(shown)) {
      findings.AUDIO_SAYS_OLD.push({
        id: p.id, sourceFile: p.sourceFile,
        shown, voiced, url: shownUrl,
      });
    }
  }

  // ALT_NO_AUDIO: accepted alternative forms with no audio (informational).
  for (let i = 0; i < altKeys.length; i++) {
    if (!keyToUrl.get(altKeys[i])) {
      findings.ALT_NO_AUDIO.push({ id: p.id, sourceFile: p.sourceFile, alt: p.alternatives[i] });
    }
  }
}

// ORPHAN: an mp3 that was voiced for a LESSON/IDIOM text which no current phrase
// produces anymore — the text was edited and the old recording is now dangling
// on Storage. We restrict to lesson/idiom sources because our 5 scanned files
// are the COMPLETE corpus for those; word/quiz/flashcard/collectible/thematic
// mp3s are voiced from files we don't parse here, so flagging them would be a
// false positive. `referencedKeys` holds every normalized text these files can
// surface (shown + english + alternatives).
// Idioms use `english:` without an `id:` marker, so the block splitter skips
// them. Pull every english/idiom text straight from idioms_data.ts into the
// orphan corpus so idiom mp3s (source:idiom) aren't falsely flagged.
for (const rel of ['app/idioms_data.ts']) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  for (const m of src.matchAll(/\b(?:english|idiom|phrase):\s*(['"`])((?:\\.|(?!\1)[^\n])*)\1/g)) {
    referencedCore.add(coreWords(m[2].replace(/\\(['"`\\])/g, '$1')));
  }
}

for (const v of lessonVoiced) {
  if (!referencedCore.has(coreWords(v.text))) {
    findings.ORPHAN.push({ key: v.text, id: v.id, source: v.source, url: v.url });
  }
}

const counts = Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length]));
const totalActionable = counts.SHOWN_NO_AUDIO + counts.AUDIO_SAYS_OLD + counts.FIELD_DRIFT;

if (JSON_OUT) {
  console.log(JSON.stringify({ counts, totalActionable, findings }, null, 2));
} else {
  const line = '─'.repeat(60);
  console.log(line);
  console.log('PHRASE AUDIO SYNC AUDIT');
  console.log(line);
  console.log(`Phrases scanned:        ${phrases.length}`);
  console.log(`Map keys:               ${keyToUrl.size}`);
  console.log(`Voiced-text records:    ${urlToVoiced.size}`);
  console.log('');
  console.log(`AUDIO_SAYS_OLD (shows new word, speaks old): ${counts.AUDIO_SAYS_OLD}`);
  for (const f of findings.AUDIO_SAYS_OLD.slice(0, 30))
    console.log(`  • ${f.id}: shows "${f.shown}"  ← mp3 speaks "${f.voiced}"`);
  if (counts.AUDIO_SAYS_OLD > 30) console.log(`  …and ${counts.AUDIO_SAYS_OLD - 30} more`);
  console.log('');
  console.log(`SHOWN_NO_AUDIO (displayed line has no mp3):   ${counts.SHOWN_NO_AUDIO}`);
  for (const f of findings.SHOWN_NO_AUDIO.slice(0, 30))
    console.log(`  • ${f.id}: "${f.shown}"`);
  if (counts.SHOWN_NO_AUDIO > 30) console.log(`  …and ${counts.SHOWN_NO_AUDIO - 30} more`);
  console.log('');
  console.log(`FIELD_DRIFT (wordsEn slots ≠ english):         ${counts.FIELD_DRIFT}`);
  for (const f of findings.FIELD_DRIFT.slice(0, 30))
    console.log(`  • ${f.id}: english="${f.english}"  ← wordsEn shows "${f.shown}"`);
  if (counts.FIELD_DRIFT > 30) console.log(`  …and ${counts.FIELD_DRIFT - 30} more`);
  console.log('');
  console.log(`ALT_NO_AUDIO (accepted alt has no mp3, info):  ${counts.ALT_NO_AUDIO}`);
  console.log(`ORPHAN (map key no content references):        ${counts.ORPHAN}`);
  for (const f of findings.ORPHAN.slice(0, 20)) console.log(`  • "${f.key}"`);
  if (counts.ORPHAN > 20) console.log(`  …and ${counts.ORPHAN - 20} more`);
  console.log(line);
  console.log(totalActionable === 0
    ? 'OK — every displayed phrase line matches its audio.'
    : `${totalActionable} actionable text↔audio mismatch(es) found.`);
}

process.exit(totalActionable === 0 ? 0 : 1);
