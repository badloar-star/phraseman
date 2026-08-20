import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const DEFAULT_CANDIDATE = path.join(
  '.superpowers',
  'brainstorm',
  '871-1787210859',
  'content',
  'lesson1-first-ten-strict-gated-candidate-data-v2.js',
);
const candidatePath = path.resolve(process.cwd(), process.argv[2] ?? DEFAULT_CANDIDATE);
const source = fs.readFileSync(candidatePath, 'utf8');
const APPROVED_SHA = '746b30c49c9735cd57cde89cb4e488c40e6661b1be9ccba1ac7f202b09957f09';
const PRODUCTION_PROJECTION = path.resolve(
  process.cwd(),
  'modules',
  'learning-v2',
  'content',
  'source',
  'approved_first_ten_candidate_v2.json',
);
const context = { window: {} };
vm.runInNewContext(source, context);
const data = context.window.L1V2;
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

expect(
  createHash('sha256').update(source).digest('hex') === APPROVED_SHA,
  'approved_candidate_sha_mismatch',
);
if (!fs.existsSync(PRODUCTION_PROJECTION)) {
  errors.push('approved_first_ten_production_projection_missing');
} else {
  const productionProjection = JSON.parse(
    fs.readFileSync(PRODUCTION_PROJECTION, 'utf8'),
  );
  expect(
    JSON.stringify(productionProjection) === JSON.stringify(data),
    'approved_first_ten_projection_mismatch',
  );
}

const expectedLocales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
expect(Boolean(data), 'L1V2 payload is missing');
if (!data) process.exitCode = 1;

if (data) {
  expect(JSON.stringify(data.localeOrder) === JSON.stringify(expectedLocales), 'active locale order must be ru, uk, es, pt-BR, vi, id, tr, pl');
  expect(Object.keys(data.locales).length === 8, 'candidate must contain exactly 8 locale packs');
  expect(data.sessions.length === 10, 'candidate must contain exactly 10 content blocks');

  const forbiddenMeta = {
    ru: /\b(?:сесси\w*|урок\w*|предыдущ\w*|следующ\w*|прошл\w*|будущ\w*)\b/iu,
    uk: /\b(?:сесі\w*|урок\w*|попередн\w*|наступн\w*|минул\w*|майбутн\w*)\b/iu,
    es: /(?:\b(?:sesión\w*|lección\w*|futur\w*)\b|(?:parte|unidad|sesión|lección)\s+(?:anterior|siguiente))/iu,
    'pt-BR': /(?:\b(?:sessão\w*|lição\w*|futur\w*)\b|(?:parte|unidade|sessão|lição)\s+(?:anterior|próxim\w*))/iu,
    vi: /(?:buổi học|bài học|phần trước|phần sau|tương lai)/iu,
    id: /\b(?:sesi\w*|pelajaran\w*|sebelumnya|berikutnya|masa depan)\b/iu,
    tr: /\b(?:oturum\w*|ders\w*|önceki\w*|sonraki\w*|gelecek\w*)\b/iu,
    pl: /\b(?:sesj\w*|lekcj\w*|poprzedni\w*|następni\w*|przyszł\w*)\b/iu,
  };
  const expectedKinds = ['concept', 'formula', 'trap'];
  let introCount = 0;
  let practiceCount = 0;
  let wordDrillCount = 0;
  let minBodyLength = Number.POSITIVE_INFINITY;
  let maxBodyLength = 0;

  for (const locale of expectedLocales) {
    const pack = data.locales[locale];
    expect(Boolean(pack), `${locale}: locale pack missing`);
    if (!pack) continue;
    expect(pack.sessions.length === 10, `${locale}: expected 10 content blocks`);
    expect(data.practiceDetails[locale]?.length === 10, `${locale}: expected localized details for 10 content blocks`);
    for (let si = 0; si < pack.sessions.length; si += 1) {
      const authored = pack.sessions[si];
      const pages = authored[3];
      expect(pages.length === 3, `${locale}/${si + 1}: expected exactly 3 intro screens`);
      expect(JSON.stringify(pages.map(page => page[0])) === JSON.stringify(expectedKinds), `${locale}/${si + 1}: intro order must be concept → formula → trap`);
      for (let pi = 0; pi < pages.length; pi += 1) {
        introCount += 1;
        const [kind, title, body, prompt, choices, correct, feedback] = pages[pi];
        minBodyLength = Math.min(minBodyLength, body.length);
        maxBodyLength = Math.max(maxBodyLength, body.length);
        expect(title.trim().length >= 10, `${locale}/${si + 1}/${kind}: title is too short`);
        expect(body.length >= 300 && body.length <= 700, `${locale}/${si + 1}/${kind}: body length ${body.length} is outside 300..700`);
        expect((body.match(/[.!?。！？](?:\s|$)/gu) ?? []).length >= 4, `${locale}/${si + 1}/${kind}: body needs at least 4 complete sentences`);
        expect(prompt.trim().length >= 6, `${locale}/${si + 1}/${kind}: quiz prompt is too short`);
        expect(Array.isArray(choices) && choices.length >= 3, `${locale}/${si + 1}/${kind}: quiz needs at least 3 choices`);
        expect(Number.isInteger(correct) && correct >= 0 && correct < choices.length, `${locale}/${si + 1}/${kind}: invalid correct choice`);
        expect(feedback.trim().length >= 20, `${locale}/${si + 1}/${kind}: feedback is too short`);
        const introText = `${title} ${body} ${prompt} ${feedback}`;
        expect(!forbiddenMeta[locale].test(introText), `${locale}/${si + 1}/${kind}: forbidden learning-navigation meta language`);
      }

      const practice = data.sessions[si]?.practice ?? [];
      const details = data.practiceDetails[locale]?.[si] ?? [];
      expect(practice.length === 15, `${locale}/${si + 1}: expected exactly 15 practice items`);
      expect(details.length === 15, `${locale}/${si + 1}: expected 15 localized practice details`);
      practiceCount += practice.length;
      for (let ii = 0; ii < practice.length; ii += 1) {
        const [correctPhrase, distractors] = practice[ii];
        const detail = details[ii];
        expect(correctPhrase.trim().length > 0, `${locale}/${si + 1}/${ii + 1}: empty phrase`);
        expect(new Set(distractors).size === distractors.length, `${locale}/${si + 1}/${ii + 1}: duplicate distractor`);
        expect(distractors.length === 3, `${locale}/${si + 1}/${ii + 1}: expected exactly 3 phrase-level distractors`);
        expect(!distractors.includes(correctPhrase), `${locale}/${si + 1}/${ii + 1}: correct phrase appears among distractors`);
        expect(detail?.meaning?.trim().length >= 2, `${locale}/${si + 1}/${ii + 1}: localized meaning missing`);
        expect(detail?.explanation?.trim().length >= 80, `${locale}/${si + 1}/${ii + 1}: localized explanation is too short`);
        expect(detail?.distractors?.length === 3, `${locale}/${si + 1}/${ii + 1}: localized distractor reasons missing`);
        expect(detail?.words?.length === correctPhrase.split(' ').length, `${locale}/${si + 1}/${ii + 1}: every word must have an interactive drill`);
        for (let wi = 0; wi < (detail?.words?.length ?? 0); wi += 1) {
          const drill = detail.words[wi];
          wordDrillCount += 1;
          expect(drill.correct === correctPhrase.split(' ')[wi], `${locale}/${si + 1}/${ii + 1}/${wi + 1}: word drill targets the wrong token`);
          expect(drill.distractors.length === 5, `${locale}/${si + 1}/${ii + 1}/${wi + 1}: word drill needs exactly 5 distractors`);
          expect(new Set(drill.distractors.map(item => item.value)).size === 5, `${locale}/${si + 1}/${ii + 1}/${wi + 1}: duplicate word distractor`);
          expect(!drill.distractors.some(item => item.value === drill.correct), `${locale}/${si + 1}/${ii + 1}/${wi + 1}: correct word appears among distractors`);
          expect(drill.distractors.every(item => item.reason.trim().length >= 20), `${locale}/${si + 1}/${ii + 1}/${wi + 1}: localized word-distractor reason is too short`);
        }
      }
    }
  }

  const scopeChecks = [
    phrase => /^I am (?!not\b)/.test(phrase),
    phrase => /^I am not /.test(phrase),
    phrase => /^I am /.test(phrase),
    phrase => /^I’m /.test(phrase),
    phrase => Object.hasOwn({Hi:1,Hello:1,'Thank you':1,Thanks:1,Please:1,Sorry:1,'Excuse me':1,'Good morning':1,'Good afternoon':1,'Good evening':1,'Good night':1,'Nice to meet you':1,'See you later':1,'You’re welcome':1,'Take care':1}, phrase),
    phrase => /^I am an? /.test(phrase),
    phrase => /^(?:I am|I’m|Thank you|Nice to meet you|See you later|Good night)/.test(phrase),
    phrase => /^(?:I am|I’m|Thank you|Sorry|Nice to meet you|See you later|Good night)/.test(phrase),
    phrase => /^You are (?!not\b)/.test(phrase),
    phrase => /^You are not /.test(phrase),
  ];
  data.sessions.forEach((session, si) => session.practice.forEach(([phrase], ii) => {
    expect(scopeChecks[si](phrase), `scope/${si + 1}/${ii + 1}: phrase "${phrase}" exceeds the approved map`);
    expect(!/^(?:he|she|it|we|they)\b/i.test(phrase), `scope/${si + 1}/${ii + 1}: later subject introduced`);
    expect(!/[?]/.test(phrase), `scope/${si + 1}/${ii + 1}: questions are outside the first-ten map`);
  }));

  if (errors.length === 0) {
    console.log(`AUTO PASS: ${expectedLocales.length} locales, ${introCount} intro screens, ${practiceCount / expectedLocales.length} unique practice slots, ${practiceCount} localized practice presentations.`);
    console.log(`${wordDrillCount} localized word drills; every word has exactly 5 distractors.`);
    console.log(`Intro body range: ${minBodyLength}..${maxBodyLength} characters.`);
    console.log('MANUAL HOLD: owner/editor approval is still required before production import.');
  }
}

if (errors.length > 0) {
  console.error(`HOLD: ${errors.length} blocker(s).`);
  errors.slice(0, 80).forEach(error => console.error(`- ${error}`));
  if (errors.length > 80) console.error(`- ... ${errors.length - 80} more`);
  process.exitCode = 1;
}
