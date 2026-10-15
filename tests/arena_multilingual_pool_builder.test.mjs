import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'build_arena_multilingual_pools.mjs');
const DIFFICULTY_PROFILE_FOR_TEST = Object.freeze({
  1: 'core_single_clause_no_adjunct',
  2: 'single_clause_with_one_adjunct',
  3: 'longer_clause_with_two_adjuncts',
});
const IT_DIFFICULTY_PROFILE_FOR_TEST = Object.freeze({ ...DIFFICULTY_PROFILE_FOR_TEST, 1: 'core_single_clause_short_context' });
const SHORT_CONTEXT_DIFFICULTY_PROFILE_FOR_TEST = Object.freeze({ ...DIFFICULTY_PROFILE_FOR_TEST, 1: 'core_single_clause_short_context' });

function canonical(value) {
  if (value === null || ['boolean', 'number', 'string'].includes(typeof value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}
const sha = (value) => createHash('sha256').update(canonical(value), 'utf8').digest('hex');
const normalizeSemanticValue = (value) => typeof value === 'string'
  ? value.normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase()
  : Array.isArray(value)
    ? value.map(normalizeSemanticValue)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeSemanticValue(item)]))
      : value;

function learnerVisibleSurface(task) {
  const payload = task.payload;
  if (task.mode === 'guess_phrase' || task.mode === 'fill_gap') {
    return { mode: task.mode, promptRu: payload.promptRu, stem: payload.stem, options: payload.options };
  }
  if (task.mode === 'find_oddity') return { mode: task.mode, promptRu: payload.promptRu, options: payload.options };
  if (task.mode === 'translate_build') return { mode: task.mode, promptRu: payload.promptRu, tokenBank: payload.tokenBank };
  return { mode: task.mode, promptRu: payload.promptRu, pairs: payload.pairs.map(({ tileLeft, tileRight }) => ({ tileLeft, tileRight })) };
}

function semanticLearnerCore(task) {
  const payload = task.payload;
  if (task.mode === 'guess_phrase' || task.mode === 'fill_gap') {
    const correct = payload.options[payload.correctIndex];
    return {
      mode: task.mode,
      promptRu: payload.promptRu,
      correctSentence: `${payload.stem.prefix}${correct}${payload.stem.suffix}`,
      distractors: payload.options.filter((_, index) => index !== payload.correctIndex).sort(),
    };
  }
  if (task.mode === 'find_oddity') {
    return {
      mode: task.mode,
      promptRu: payload.promptRu,
      oddity: payload.options[payload.oddityIndex],
      grammatical: payload.options.filter((_, index) => index !== payload.oddityIndex).sort(),
    };
  }
  if (task.mode === 'translate_build') {
    return {
      mode: task.mode,
      promptRu: payload.promptRu,
      correctAnswer: payload.correctAnswer,
      decoy: payload.samePosDecoy.token,
    };
  }
  return {
    mode: task.mode,
    promptRu: payload.promptRu,
    pairs: payload.pairs
      .map(({ tileLeft, tileRight }) => ({ tileLeft, tileRight }))
      .sort((left, right) => `${left.tileLeft}\u0000${left.tileRight}`.localeCompare(`${right.tileLeft}\u0000${right.tileRight}`)),
  };
}

test('builds 4k evidence-bound tasks per target and releases only independently reviewed, owner-approved pools', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    for (const target of ['es', 'fr', 'de', 'it']) {
      const factPack = JSON.parse(readFileSync(join(root, 'content', 'arena-multilingual', target, 'facts.json'), 'utf8'));
      const factIds = new Set([...factPack.facts, ...factPack.lexicalFacts].map((fact) => fact.id));
      assert.ok(factPack.familyDefinitions.speed_match.requires.includes('pairs:6'));
      assert.equal(factPack.familyDefinitions.speed_match.requires.includes('pairs:4'), false);
      const manifestPath = join(output, target, 'manifest.json');
      assert.equal(existsSync(manifestPath), true, target);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      assert.equal(manifest.requiredTaskCount, 4000);
      assert.equal(manifest.generatedTaskCount, 4000);
      const approvedOwnerDecision = Object.freeze({ es: 'D155', fr: 'D156', de: 'D157', it: 'D154' })[target];
      if (approvedOwnerDecision) {
        assert.equal(manifest.verdict, 'PASS');
        assert.equal(manifest.releaseEligible, true);
        assert.equal(manifest.blockReason, undefined);
        assert.equal(manifest.linguisticReviewReceipt?.verdict, 'PASS');
        assert.equal(manifest.linguisticReviewReceipt?.reviewerIndependence, 'independent_read_only');
        assert.equal(manifest.adminPublicationReceipt?.publicationStatus, 'approved');
        assert.equal(manifest.adminPublicationReceipt?.ownerDecision, approvedOwnerDecision);
      } else {
        assert.equal(manifest.verdict, 'BLOCK');
        assert.equal(manifest.releaseEligible, false);
        assert.match(manifest.blockReason, /independent_review_and_admin_publication_required/u);
        assert.equal(manifest.blockReason.includes('cefr_not_claimed'), false, `${target} correctly treats an absent CEFR claim as non-blocking`);
      }
      assert.equal(manifest.coverage.cefrEvidenceStatus, 'not_claimed');
      const tasks = readFileSync(join(output, target, 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(tasks.length, 4000);
      assert.equal(manifest.tasksSha256, sha(tasks), `${target} tasks hash`);
      const { manifestSha256, ...manifestBody } = manifest;
      assert.equal(manifestSha256, sha(manifestBody), `${target} manifest self hash`);
      assert.equal(new Set(tasks.map((task) => task.taskId)).size, 4000);
      assert.equal(new Set(tasks.map((task) => task.semanticSignature)).size, 4000);
      const recomputedSemanticSignatures = tasks.map((task) => sha(normalizeSemanticValue(semanticLearnerCore(task))));
      assert.deepEqual(
        tasks.map((task) => task.semanticSignature),
        recomputedSemanticSignatures,
        `${target} stores the hash of the actual semantic learner core`,
      );
      assert.equal(
        new Set(recomputedSemanticSignatures).size,
        4000,
        `${target} has 4,000 genuinely distinct semantic learner cores`,
      );
      const quotas = Object.fromEntries(Object.entries(manifest.quotas).map(([key]) => [key, 0]));
      for (const task of tasks) {
        assert.equal(task.studyTarget, target);
        assert.ok(task.sourceFactIds.length > 0);
        assert.ok(task.sourceFactIds.every((id) => factIds.has(id)), `${task.taskId} has an unresolved fact ID`);
        assert.equal(/\b(the|and|with|is|are)\b/iu.test(JSON.stringify(task)), false, `English leak: ${task.taskId}`);
        quotas[`${task.mode}:${task.difficulty}`] += 1;
        if (task.mode === 'guess_phrase' || task.mode === 'fill_gap') {
          assert.equal(task.payload.options.length, 4);
          assert.equal(new Set(task.payload.options).size, 4);
          assert.ok(task.payload.stem.prefix);
          assert.ok(task.payload.stem.suffix);
          assert.equal(task.payload.grammarMatrix.options.length, 4);
          assert.equal(task.payload.grammarMatrix.options.filter((option) => option.grammatical).length, 1);
          assert.equal(task.payload.grammarMatrix.options.filter((option) => !option.grammatical).length, 3);
          assert.ok(task.payload.grammarMatrix.options.every((option) => option.reason));
          if (target === 'es' && task.payload.grammarMatrix.lemma === 'ser' && task.sourceFactIds[0] === 'es-ser-somos') {
            assert.equal(task.payload.grammarMatrix.subjectGrammar, 'presente_1pl');
            assert.match(task.payload.stem.suffix, /fuertes|jóvenes|serios|amables|sinceros|activos|curiosos|pacientes|atentos|inteligentes|trabajadores|creativos|honestos|generosos|valientes|responsables|prudentes|optimistas|realistas|sociables/u);
          }
          if (task.mode === 'fill_gap') assert.equal(task.payload.options.every((option) => !/\s/u.test(option)), true);
          assert.equal(task.distractorReasons.length, 3);
        } else if (task.mode === 'find_oddity') {
          assert.ok(Number.isInteger(task.payload.oddityIndex));
          assert.equal(task.payload.inverseProof.options.filter((option) => option.grammatical).length, 3);
          assert.equal(task.payload.inverseProof.options.filter((option) => !option.grammatical).length, 1);
          assert.equal(task.payload.inverseProof.options[task.payload.oddityIndex].grammatical, false);
          assert.equal(task.distractorReasons.length, 1);
        } else if (task.mode === 'translate_build') {
          const reconstructed = task.payload.correctTokens[0] === "J'"
            ? `${task.payload.correctTokens[0]}${task.payload.correctTokens.slice(1).join(' ')}`
            : task.payload.correctTokens.join(' ');
          assert.equal(reconstructed, task.payload.correctAnswer);
          assert.equal(task.payload.promptRu.split(' ').length >= 2, true);
          assert.ok(task.payload.samePosDecoy);
          assert.ok(task.payload.tokenizationProof);
          assert.equal(task.payload.tokenBank.length, task.payload.correctTokens.length + 1);
          assert.equal(task.payload.tokenBank[task.payload.decoyIndex], task.payload.samePosDecoy.token, task.taskId);
          assert.equal(task.distractorReasons.length, 1);
        } else {
          assert.equal(task.payload.pairs.length, 6);
          assert.equal(new Set(task.payload.pairs.map((pair) => pair.left)).size, 6);
          assert.equal(new Set(task.payload.pairs.map((pair) => pair.right)).size, 6);
          assert.equal(new Set(task.payload.pairs.map((pair) => pair.tileLeft.toLocaleLowerCase())).size, 6);
          assert.equal(new Set(task.payload.pairs.map((pair) => pair.tileRight.toLocaleLowerCase())).size, 6);
          assert.ok(task.payload.pairs.every((pair) => pair.tileLeft.trim().split(/\s+/u).length <= 3));
          assert.ok(task.payload.pairs.every((pair) => pair.tileRight.trim().split(/\s+/u).length <= 3));
          assert.ok(task.payload.pairs.every((pair) => pair.tileEvidence?.lexicalFactId));
          assert.ok(task.payload.pairs.every((pair) => pair.tileEvidence?.sourceIds?.length));
          assert.ok(task.payload.pairs.every((pair) => pair.senseEvidence?.sourceFactIds?.length));
          assert.ok(task.payload.bijectionProof);
        }
      }
      assert.deepEqual(quotas, manifest.quotas);
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('committed multilingual artifacts are byte-for-byte reproducible from the current generator', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-parity-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    for (const target of ['es', 'fr', 'de', 'it']) {
      for (const file of ['tasks.jsonl', 'manifest.json']) {
        // зачем (сухой прогон выкладки 15.10): в HEAD эти файлы лежат с CRLF, генератор пишет LF; рабочее дерево (autocrlf) — LF,
        // а чистая выгрузка HEAD — CRLF, и сборка functions из чистой копии падала. Содержимое сверяем точно, вид перевода строки — нет.
        const eol = (text) => text.replace(/\r\n/g, '\n');
        assert.equal(
          eol(readFileSync(join(root, 'content', 'arena-multilingual', 'generated', target, file), 'utf8')),
          eol(readFileSync(join(output, target, file), 'utf8')),
          `${target}/${file} is stale`,
        );
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('renders natural target sentences and complete Russian learner prompts for every generated task', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-naturalness-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const forbiddenRussian = /(?:Я находится|Мы находится|Мы идёт|Я велосипед|Я тетрадь|Я машина|Я сегодня нервничает|Ты сегодня нервничает|Он сегодня нервничаю|Мы сегодня нервничаю|Я сегодня горжусь|Мы сегодня горжусь|Я(?: [^".]+){0,3} творческий\.|Я(?: [^".]+){0,3} реалистичен\.|Мы(?: [^".]+){0,3} дружелюбен\.|Мы(?: [^".]+){0,3} один, без компании\.|рано ещё есть|поздно ещё есть|рано тоже есть|поздно тоже есть)/u;
    for (const target of ['es', 'fr', 'de', 'it']) {
      const tasks = readFileSync(join(output, target, 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      const serializedTasks = JSON.stringify(tasks);
      assert.equal(/en mi contexto diario|dans mon contexte quotidien|in meinem Alltag/u.test(serializedTasks), false, `${target} personal context leak`);
      const afternoon = ({ es: ['esta tarde', 'сегодня днём'], fr: ["cet après-midi", 'сегодня днём'], de: ['heute Nachmittag', 'сегодня днём'], it: ['questo pomeriggio', 'сегодня днём'] })[target];
      for (const task of tasks.filter((item) => ['guess_phrase', 'fill_gap', 'translate_build'].includes(item.mode))) {
        if (JSON.stringify(task.payload).includes(afternoon[0])) assert.match(task.payload.promptRu, new RegExp(afternoon[1], 'u'), `${task.taskId} afternoon parity`);
      }
      for (const task of tasks) {
        const prompts = task.mode === 'speed_match' || task.mode === 'find_oddity'
          ? [] : [task.payload.promptRu];
        for (const prompt of prompts) {
          assert.match(prompt, /[.!?]$/u, `${target} prompt is not a full sentence: ${prompt}`);
          assert.equal(forbiddenRussian.test(prompt), false, `${target} malformed Russian: ${prompt}`);
          assert.match(prompt, /(?:Я|Ты|Он|Мы|У меня|У тебя|У него|У нас)/iu, `${target} prompt lacks subject: ${prompt}`);
          if (/^(?:Я|Ты|Он|Мы) (?:по \S+|летом|зимой|весной|осенью|каждый день)/u.test(prompt)
            && task.sourceFactIds.some((id) => /-(?:ir|aller|gehen|andare)-/u.test(id))) {
            assert.match(prompt, /(?:хожу|ходишь|ходит|ходим)/u, `${task.taskId} habitual movement aspect`);
          }
        }
        const targetSentences = [];
        if (task.mode === 'guess_phrase' || task.mode === 'fill_gap') {
          const correct = task.payload.options[task.payload.correctIndex];
          assert.ok(correct, `${target} missing correct option`);
          const sentence = `${task.payload.stem.prefix}${correct}${task.payload.stem.suffix}`;
          assert.match(sentence, /\S/u);
          targetSentences.push(sentence);
        } else if (task.mode === 'find_oddity') {
          targetSentences.push(...task.payload.options);
        } else if (task.mode === 'translate_build') {
          targetSentences.push(task.payload.correctAnswer);
        } else {
          targetSentences.push(...task.payload.pairs.map((pair) => pair.right));
        }
        const surface = `${JSON.stringify(task.payload)}\n${targetSentences.join('\n')}`;
        if (target === 'fr') {
          assert.equal(/J'(?:vais|suis)\b/u.test(surface), false, `French consonant elision: ${task.taskId}`);
          if (task.sourceFactIds[0] === 'fr-avoir-ai') assert.match(surface, /J'ai\b/u);
          assert.equal(
            /\bjeunes?\b.*\b(?:aujourd'hui|maintenant|ce matin|cet après-midi|ce soir|en été|en hiver|au printemps|en automne|ce mois-ci|cette semaine|demain|tôt|tard)\b/u.test(targetSentences.join('\n')),
            false,
            `French age adjective cannot use a transient time frame: ${task.taskId}`,
          );
        }
        if (target === 'de') assert.equal(/\b(?:bin|bist|ist|sind)\s+\S+\s+(?:heute|jetzt|morgen|früh|spät)\b/u.test(surface), false, `German copular time order: ${task.taskId}`);
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('keeps the full 16k corpus natural under substitution and does not leak translate-build answers', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-p1-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const frenchStateAdjectives = /\b(?:cansado|ocupado|contento|enfermo|solo)\b/u;
    const decoyPositions = new Set();
    const decoyPositionsByLength = new Map();
    for (const target of ['es', 'fr', 'de', 'it']) {
      const tasks = readFileSync(join(output, target, 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      for (const task of tasks) {
        const sentences = task.mode === 'guess_phrase' || task.mode === 'fill_gap'
          ? [`${task.payload.stem.prefix}${task.payload.options[task.payload.correctIndex]}${task.payload.stem.suffix}`]
          : task.mode === 'find_oddity' ? task.payload.options
            : task.mode === 'translate_build' ? [task.payload.correctAnswer]
              : task.payload.pairs.map((pair) => pair.right);
        if (target === 'fr') {
          assert.equal(sentences.some((sentence) => /\bJ'(?!ai\b)/u.test(sentence)), false, `French elision must match the rendered subject+verb: ${task.taskId}`);
          assert.equal(sentences.some((sentence) => /\bNous sommes (?:fatigué|prêt|calme|occupé|content|malade|libre|fort|jeune|gentil|seul|sûr|fier|actif|patient|attentif)(?:\s|\.)/u.test(sentence)), false, `French plural adjective agreement: ${task.taskId}`);
          if (task.mode === 'find_oddity') {
            const ungrammatical = task.payload.options[task.payload.oddityIndex];
            assert.equal(/^(?:Je|Tu|Il|Nous)\s/u.test(ungrammatical), true, `French oddity substituted subject leaked elision: ${task.taskId}`);
          }
        }
        if (target === 'es' && task.sourceFactIds[0]?.startsWith('es-ser-')) {
          assert.equal(sentences.some((sentence) => frenchStateAdjectives.test(sentence)), false, `Spanish ser state adjective: ${task.taskId}`);
        }
        if (target === 'es') {
          assert.equal(sentences.some((sentence) => /\bYo soy seguro(?:\s|\.)/u.test(sentence)), false, `Spanish ambiguous ser adjective: ${task.taskId}`);
          if (task.mode === 'find_oddity') {
            assert.equal(task.payload.options.some((sentence) => /\bNosotros (?:soy|eres|es|somos) (?:fuerte|joven|serio|amable|seguro|activo|curioso|paciente|atento|inteligente|trabajador|creativo|honesto|generoso|valiente|responsable|prudente|optimista|realista|sociable)(?:\s|\.)/u.test(sentence)), false, `Spanish oddity adjective must agree with displayed Nosotros: ${task.taskId}`);
          }
        }
        if (target === 'de') assert.equal(sentences.some((sentence) => /\bam (?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag)\b/u.test(sentence)), false, `German recurring weekday parity: ${task.taskId}`);
        if (target === 'it') {
          assert.equal(sentences.some((sentence) => /\bNoi siamo (?:forte|affidabile|serio|gentile|sincero|attivo|curioso|paziente|attento|intelligente|laborioso|creativo|onesto|generoso|coraggioso|responsabile|prudente|ottimista|realista|socievole)(?:\s|\.)/u.test(sentence)), false, `Italian plural adjective agreement: ${task.taskId}`);
          assert.equal(sentences.some((sentence) => /\bNoi siamo serii\b/u.test(sentence)), false, `Italian serio plural must be seri: ${task.taskId}`);
          const italianAdverb = /\b(?:sempre|spesso|generalmente|normalmente|quasi sempre|di solito|in genere|per natura|molto|piuttosto|abbastanza|particolarmente|decisamente|insolitamente|sorprendentemente|estremamente)\b/u;
          for (const sentence of task.sourceFactIds[0]?.startsWith('it-essere-')
            ? sentences.filter((value) => italianAdverb.test(value)) : []) {
            assert.match(sentence, /^(?:Io|Tu|Lui|Noi)\s+(?:sono|sei|è|siamo)\s+(?:sempre|spesso|generalmente|normalmente|quasi sempre|di solito|in genere|per natura|molto|piuttosto|abbastanza|particolarmente|decisamente|insolitamente|sorprendentemente|estremamente)\s+/u, `Italian adverb belongs before the adjective: ${task.taskId}`);
          }
          if (task.payload.promptRu) {
            assert.equal(/\bкак правило\b/u.test(task.payload.promptRu) && !/, как правило,/u.test(task.payload.promptRu), false, `Russian parenthetical punctuation: ${task.taskId}`);
            assert.equal(/^(?:Я|Ты|Он|Мы) когда это нужно\b/u.test(task.payload.promptRu), false, `Russian subordinate-clause punctuation: ${task.taskId}`);
            assert.equal(/\bесть (?:бронирование|срок)\b/u.test(task.payload.promptRu), false, `Natural Russian event name: ${task.taskId}`);
            assert.equal(/\bскоро есть\b/u.test(task.payload.promptRu), false, `Natural Russian future event syntax: ${task.taskId}`);
            assert.equal(/\b(?:часто|регулярно|обычно) ид(?:у|ёшь|ёт|ём)\b/u.test(task.payload.promptRu), false, `Russian habitual movement aspect: ${task.taskId}`);
          }
          assert.equal(sentences.some((sentence) => /\b(?:Yo|Je|Ich|Nosotros|Nous|Wir)\b/u.test(sentence)), false, `Italian cross-language subject leak: ${task.taskId}`);
        }
        if (task.mode === 'translate_build') {
          assert.notDeepEqual(task.payload.tokenBank.slice(0, task.payload.correctTokens.length), task.payload.correctTokens, `Translate-build answer order leaked: ${task.taskId}`);
          assert.notDeepEqual(task.payload.tokenBank.filter((token) => token !== task.payload.samePosDecoy.token), task.payload.correctTokens, `Translate-build order leaked after decoy removal: ${task.taskId}`);
          decoyPositions.add(task.payload.decoyIndex);
          const bankLength = task.payload.tokenBank.length;
          if (!decoyPositionsByLength.has(bankLength)) decoyPositionsByLength.set(bankLength, new Set());
          decoyPositionsByLength.get(bankLength).add(task.payload.decoyIndex);
        }
      }
    }
    assert.ok(decoyPositions.size > 1, `Translate-build decoy position is fixed: ${[...decoyPositions]}`);
    for (const [bankLength, positions] of decoyPositionsByLength) assert.equal(positions.size, bankLength, `Translate-build decoy positions do not cover every index for ${bankLength} tokens`);
    const frTasks = readFileSync(join(output, 'fr', 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const oddity0511 = frTasks.find((task) => task.taskId === 'arena-fr-find_oddity-1-0511');
    assert.equal(/^Je\s+ai\b/u.test(oddity0511.payload.options[oddity0511.payload.oddityIndex]), false);
    const deTasks = readFileSync(join(output, 'de', 'tasks.jsonl'), 'utf8');
    for (const recurring of ['montags', 'dienstags', 'mittwochs', 'donnerstags', 'freitags']) assert.match(deTasks, new RegExp(`\\b${recurring}\\b`, 'u'));
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('keeps audited language invariants, independent speed-match groups, and fact bindings', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-audit-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    for (const target of ['es', 'fr', 'de', 'it']) {
      const pack = JSON.parse(readFileSync(join(root, 'content', 'arena-multilingual', target, 'facts.json'), 'utf8'));
      const sourceIds = new Set(pack.sources.map((source) => source.id));
      assert.ok(Array.isArray(pack.lexicalFacts) && pack.lexicalFacts.length > 0, `${target} lexical fact inventory`);
      assert.equal(pack.lexicalFacts.every((fact) => fact.kind === 'umbrella_lexical_fact' && fact.lemma && fact.values?.length === 20), true, `${target} real umbrella lexical facts`);
      if (['es', 'fr', 'de'].includes(target)) {
        const lexicalUrl = {
          es: /^https:\/\/dle\.rae\.es\//u,
          fr: /^https:\/\/www\.cnrtl\.fr\/definition\//u,
          de: /^https:\/\/(?:www\.duden\.de\/rechtschreibung\/|www\.dwds\.de\/wb\/)/u,
        }[target];
        for (const fact of pack.lexicalFacts) {
          assert.equal(fact.valueEvidence?.length, fact.values.length, `${fact.id} value-level lexical evidence`);
          for (const [index, evidence] of fact.valueEvidence.entries()) {
            assert.equal(evidence.value, fact.values[index], `${fact.id}:${index} exact value evidence binding`);
            assert.ok(typeof evidence.glossRu === 'string' && evidence.glossRu.trim(), `${fact.id}:${index} Russian gloss`);
            assert.ok(evidence.sourceIds?.length > 0, `${fact.id}:${index} source IDs`);
            assert.ok(evidence.sourceIds.every((sourceId) => sourceIds.has(sourceId)), `${fact.id}:${index} resolved source IDs`);
            assert.match(evidence.sourceUrl, lexicalUrl, `${fact.id}:${index} exact lexical entry URL`);
            assert.ok(['lexical_entry', 'lexical_entry_plus_preposition_rule'].includes(evidence.evidenceKind), `${fact.id}:${index} evidence kind`);
          }
        }
      }
      const verbFactIds = new Set(pack.facts.map((fact) => fact.id));
      const lexicalFactIds = new Set(pack.lexicalFacts.map((fact) => fact.id));
      const manifest = JSON.parse(readFileSync(join(output, target, 'manifest.json'), 'utf8'));
      const tasks = readFileSync(join(output, target, 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      for (const task of tasks) {
        assert.equal(Object.hasOwn(task, 'cefrBand'), false, `${task.taskId} must not claim unsupported CEFR`);
        assert.equal(Object.hasOwn(task, 'cefrProfile'), false, `${task.taskId} must not expose a fake CEFR profile`);
        assert.equal(Object.hasOwn(task.payload, 'cefrBand'), false, `${task.taskId} payload must not claim unsupported CEFR`);
        const expectedProfile = target === 'it'
          ? IT_DIFFICULTY_PROFILE_FOR_TEST
          : ['es', 'fr', 'de'].includes(target)
            ? SHORT_CONTEXT_DIFFICULTY_PROFILE_FOR_TEST
            : DIFFICULTY_PROFILE_FOR_TEST;
        assert.equal(task.difficultyProfile.frameComplexity, expectedProfile[task.difficulty], `${task.taskId} difficulty profile`);
        assert.equal(JSON.stringify(task).includes('B1'), false, `${task.taskId} falsely claims B1`);
        assert.ok(task.sourceFactIds.length >= (task.mode === 'speed_match' ? 1 : 2), `${task.taskId} binds lexical facts`);
        if (task.mode !== 'speed_match') assert.ok(task.sourceFactIds.some((id) => verbFactIds.has(id)), `${task.taskId} binds a real verb fact`);
        assert.ok(task.sourceFactIds.some((id) => lexicalFactIds.has(id)), `${task.taskId} binds an umbrella lexical fact`);
        if (task.mode === 'find_oddity') {
          assert.equal(task.payload.inverseProof.options.length, 4);
          assert.ok(task.payload.inverseProof.options.every((option) => option.reason));
        }
        if (task.mode === 'speed_match') {
          assert.equal(new Set(task.payload.pairs.map((pair) => pair.factId)).size, 6, `${task.taskId} independent facts`);
          assert.ok(task.payload.pairs.every((pair) => pair.senseEvidence.sourceFactIds.length === 1));
          for (const pair of task.payload.pairs) {
            const lexicalFact = pack.lexicalFacts.find((fact) => fact.id === pair.tileEvidence.lexicalFactId);
            assert.ok(lexicalFact, `${task.taskId} tile lexical fact`);
            assert.equal(pair.tileRight, lexicalFact.values[pair.tileEvidence.valueIndex], `${task.taskId} tile target binding`);
            const expectedSourceIds = lexicalFact.valueEvidence?.[pair.tileEvidence.valueIndex]?.sourceIds ?? lexicalFact.sourceIds;
            assert.deepEqual(pair.tileEvidence.sourceIds, expectedSourceIds, `${task.taskId} tile source binding`);
          }
        }
      }
      const speedPairCounts = new Map();
      const speedVisibleSurfaces = new Set();
      for (const task of tasks.filter((item) => item.mode === 'speed_match')) for (const pair of task.payload.pairs) {
        const key = `${pair.tileLeft}\u0000${pair.tileRight}`;
        speedPairCounts.set(key, (speedPairCounts.get(key) ?? 0) + 1);
      }
      for (const task of tasks.filter((item) => item.mode === 'speed_match')) {
        speedVisibleSurfaces.add(JSON.stringify(task.payload.pairs.map((pair) => [pair.tileLeft, pair.tileRight])));
      }
      assert.equal(speedPairCounts.size, 60, `${target} lexical speed-match inventory`);
      assert.equal(speedVisibleSurfaces.size, 192, `${target} unique visible speed-match tasks`);
      assert.equal(Math.max(...speedPairCounts.values()) <= manifest.structuralRequirements.maxSpeedMatchPairSurfaceReuse, true, `${target} speed-match source cap`);
      if (target === 'de') {
        const corpus = JSON.stringify(tasks);
        assert.equal(/\b(?:habe|hast|hat|haben)\s+(?:ein Freund|ein Hund|ein Bleistift|ein Mantel|ein Plan|ein Traum)\b/u.test(corpus), false, 'haben takes accusative articles');
        assert.equal(/\b(?:sehr|ziemlich) allein\b/u.test(corpus), false, 'allein must not use a literal degree modifier in this beginner frame');
        assert.equal(/\b(?:очень|довольно) (?:один|одни), без компании\b/u.test(corpus), false, 'Russian allein prompts must stay idiomatic under modification');
        assert.equal(/\b(?:habe|hast|hat|haben)\s+(?:hier|dort|jetzt)\s+einen Termin\b/u.test(corpus), false, 'Termin requires a temporal appointment context, not generic possession here/now');
        assert.equal(/\bесть приём\b/u.test(corpus), false, 'Russian Termin prompts require idiomatic appointment phrasing');
        const correctSentences = tasks.flatMap((task) => {
          if (task.mode === 'guess_phrase' || task.mode === 'fill_gap') {
            return [`${task.payload.stem.prefix}${task.payload.options[task.payload.correctIndex]}${task.payload.stem.suffix}`];
          }
          if (task.mode === 'translate_build') return [task.payload.correctAnswer];
          return [];
        });
        assert.equal(correctSentences.some((sentence) => /\bjung\b.*\b(?:heute|jetzt|Morgen|Nachmittag|Abend|Sommer|Winter|Frühling|Herbst|Monat|Woche|morgen|früh|spät)\b/u.test(sentence)), false, 'jung cannot use transient-time frames');
        const habenValues = pack.lexicalFacts.find((fact) => fact.lemma === 'haben')?.values ?? [];
        assert.equal(habenValues.includes('ein Museum'), false, 'haben inventory excludes unnatural museum possession');
        assert.equal(habenValues.includes('eine Arbeit'), false, 'Aufgabe is the correct assignment noun');
        assert.ok(habenValues.includes('ein Termin'));
        assert.ok(habenValues.includes('eine Aufgabe'));
        const speedPairs = tasks.filter((task) => task.mode === 'speed_match').flatMap((task) => task.payload.pairs);
        const glosses = new Map(speedPairs.map((pair) => [pair.tileRight, pair.tileLeft]));
        assert.equal(glosses.get('freundlich'), 'дружелюбен');
        assert.equal(glosses.get('allein'), 'один, без компании');
        assert.equal(glosses.get('eine Aufgabe'), 'задание');
      }
      if (target === 'fr') {
        const frenchCorpus = JSON.stringify(tasks);
        assert.equal(/\b(?:très|assez) seul\b/u.test(frenchCorpus), false, 'seul cannot take a literal degree modifier in this beginner frame');
        assert.equal(/\b(?:très|assez) (?:один|одна), без компании\b/u.test(frenchCorpus), false, 'Russian seul prompt must stay idiomatic under modification');
        assert.equal(/\b(?:un rêve|un ami) (?:aujourd'hui|maintenant)\b/u.test(frenchCorpus), false, 'avoir inventory must not create contextless possession-time frames');
        assert.equal(/\bun engagement\b/u.test(frenchCorpus), false, 'French event inventory must not teach engagement as a generic important task');
        const frenchEtreCorpus = JSON.stringify(tasks.filter((task) => task.sourceFactIds.some((id) => id.startsWith('fr-etre-'))));
        assert.equal(/\b(?:en été|en hiver|au printemps|en automne|demain|tôt|tard)\b/u.test(frenchEtreCorpus), false, 'French être adjective frames must not use contrived seasonal or future/time-of-day contexts');
        const speedPairs = tasks.filter((task) => task.mode === 'speed_match').flatMap((task) => task.payload.pairs);
        const glosses = new Map(speedPairs.map((pair) => [pair.tileRight, pair.tileLeft]));
        assert.equal(glosses.get('seul'), 'один, без компании');
        assert.equal(glosses.get('un rendez-vous'), 'приём');
        assert.equal(glosses.has('une obligation'), false, 'generic obligation is not treated as a scheduled event');
        assert.equal(glosses.get('une consultation'), 'консультация');
        assert.equal(pack.facts.some((fact) => /(?:\b(?:я|ты|он|мы) (?:есть|имею|имеешь|имеет|имеем))\b/iu.test(fact.sourceRu)), false, 'French source glosses are natural Russian');
        for (const task of tasks.filter((item) => item.mode === 'translate_build' && item.payload.correctAnswer.startsWith("J'ai "))) {
          assert.ok(task.payload.correctTokens.includes("J'"), `${task.taskId} splits elision`);
          assert.equal(task.payload.samePosDecoy.token, 'as', `${task.taskId} keeps a substitutable verb decoy`);
        }
      }
      if (target === 'es') {
        const spanishCorpus = JSON.stringify(tasks);
        const spanishSentences = tasks.flatMap((task) => task.mode === 'guess_phrase' || task.mode === 'fill_gap'
          ? [`${task.payload.stem.prefix}${task.payload.options[task.payload.correctIndex]}${task.payload.stem.suffix}`]
          : task.mode === 'find_oddity' ? task.payload.options
            : task.mode === 'translate_build' ? [task.payload.correctAnswer] : []);
        assert.equal(spanishSentences.some((sentence) => /\b(?:tengo|tienes|tiene|tenemos)\b[^.]*\baquí/u.test(sentence)), false, 'tener event frames require temporal, not deictic-location, context');
        assert.equal(/\b(?:muy|bastante)\b[^".]*\b(?:en casa|en la escuela|en la tienda|en la oficina|en el restaurante|en el museo|en el cine|en el mercado|en el banco|en el hospital|en la estación|en la biblioteca|en la playa|en el centro|en el aeropuerto|en el hotel|en el gimnasio|en el teatro|en el jardín|en la universidad)\b/u.test(spanishCorpus), false, 'estar D1 cannot reuse adjective intensity as a location context');
        assert.equal(/\b(?:estoy|estás|está|estamos)\s+(?:en casa|en la escuela|en la tienda|en la oficina|en el restaurante|en el museo|en el cine|en el mercado|en el banco|en el hospital|en la estación|en la biblioteca|en la playa|en el centro|en el aeropuerto|en el hotel|en el gimnasio|en el teatro|en el jardín|en la universidad)\s+(?:muy|bastante)\b/u.test(spanishCorpus), false, 'estar D1 context cannot be appended as an intensity');
        assert.equal(/\brealmente\b[^".]*\b(?:en general|normalmente)\b/u.test(spanishCorpus), false, 'Spanish D3 avoids redundant realmente + generic-frequency phrasing');
        assert.equal(/en mi vida diaria/u.test(spanishCorpus), false, 'Spanish frames must not attach first-person possession to Él/Nosotros');
        assert.equal(/\b(?:tengo|tienes|tiene|tenemos) también\b/u.test(spanishCorpus), false, 'también precedes tener in natural D3 word order');
        assert.deepEqual(
          pack.lexicalFacts.find((fact) => fact.lemma === 'tener')?.values,
          ['una cita', 'una reunión', 'una clase', 'un examen', 'una visita', 'una llamada', 'una entrevista', 'una reserva', 'un viaje', 'un turno', 'un encuentro', 'una fecha límite', 'una entrega', 'una presentación', 'un entrenamiento', 'una prueba', 'un curso', 'un concierto', 'una cena', 'un compromiso'],
          'tener uses time-compatible real event nouns instead of arbitrary possessions',
        );
        assert.equal(/\bjoven normalmente\b/u.test(spanishCorpus), false, 'joven cannot use normalmente');
        assert.equal(/\btodavía\b[^".]*\bahora\b/u.test(spanishCorpus), false, 'ahora precedes todavía in natural Spanish');
        assert.equal(/\bun sueño esta noche\b/u.test(spanishCorpus), false, 'sueño must keep the dream sense');
        assert.equal(/en esta clase/u.test(spanishCorpus), false, 'class/group context must stay bilingual');
        assert.equal(pack.facts.some((fact) => /(?:\b(?:yo|tú|él|nosotros) (?:hay|tiene)|\b(?:я|ты|он|мы) (?:есть|имею|имеешь|имеет|имеем))\b/iu.test(fact.sourceRu)), false, 'Spanish source glosses are natural Russian');
        const serPayloads = tasks.flatMap((task) => task.mode === 'speed_match'
          ? task.payload.pairs.filter((pair) => pair.factId === 'es-ser-soy').map((pair) => pair.right)
          : task.sourceFactIds[0] === 'es-ser-soy' ? [JSON.stringify(task.payload)] : []);
        assert.equal(serPayloads.some((payload) => /\b(?:hoy|ahora|esta mañana|esta tarde|esta noche|mañana)\b/u.test(payload)), false, 'ser cannot use bounded-time contexts');
        const serCorpus = serPayloads.join('\n');
        assert.equal(/\b(?:feliz|cansado|listo|tranquilo|ocupado|contento|enfermo|libre|nervioso|solo|orgulloso|preocupado|aburrido|sorprendido|interesado|despierto|perdido|relajado|confundido|enfadado)\b/u.test(serCorpus), false, 'ser only uses trait-compatible adjectives');
      }
      const visibleSurface = tasks.map((task) => JSON.stringify(learnerVisibleSurface(task)));
      assert.equal(new Set(visibleSurface).size, 4000, `${target} unique visible learner payloads`);
      const answerLength = (task) => task.payload.correctAnswer.split(' ').length;
      const averageLength = (difficulty) => {
        const matching = tasks.filter((task) => task.mode === 'translate_build' && task.difficulty === difficulty);
        return matching.reduce((sum, task) => sum + answerLength(task), 0) / matching.length;
      };
      assert.equal(averageLength(1) < averageLength(2) && averageLength(2) < averageLength(3), true, `${target} difficulty changes visible frame complexity`);
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
