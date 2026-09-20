import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const script = join(root, 'scripts', 'build_arena_multilingual_pools.mjs');

function learnerVisibleSurface(task) {
  const payload = task.payload;
  if (task.mode === 'guess_phrase' || task.mode === 'fill_gap') {
    return { mode: task.mode, promptRu: payload.promptRu, stem: payload.stem, options: payload.options };
  }
  if (task.mode === 'find_oddity') return { mode: task.mode, promptRu: payload.promptRu, options: payload.options };
  if (task.mode === 'translate_build') return { mode: task.mode, promptRu: payload.promptRu, tokenBank: payload.tokenBank };
  return { mode: task.mode, promptRu: payload.promptRu, pairs: payload.pairs.map(({ left, right }) => ({ left, right })) };
}

test('builds 4k evidence-bound tasks per target but remains HOLD without independent release proof', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    for (const target of ['es', 'fr', 'de']) {
      const factPack = JSON.parse(readFileSync(join(root, 'content', 'arena-multilingual', target, 'facts.json'), 'utf8'));
      const factIds = new Set([...factPack.facts, ...factPack.lexicalFacts].map((fact) => fact.id));
      assert.ok(factPack.familyDefinitions.speed_match.requires.includes('pairs:6'));
      assert.equal(factPack.familyDefinitions.speed_match.requires.includes('pairs:4'), false);
      const manifestPath = join(output, target, 'manifest.json');
      assert.equal(existsSync(manifestPath), true, target);
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      assert.equal(manifest.verdict, 'BLOCK');
      assert.equal(manifest.requiredTaskCount, 4000);
      assert.equal(manifest.generatedTaskCount, 4000);
      assert.equal(manifest.releaseEligible, false);
      assert.match(manifest.blockReason, /independent_review_and_admin_publication_required/u);
      const tasks = readFileSync(join(output, target, 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      assert.equal(tasks.length, 4000);
      assert.equal(new Set(tasks.map((task) => task.taskId)).size, 4000);
      assert.equal(new Set(tasks.map((task) => task.semanticSignature)).size, 4000);
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

test('renders natural target sentences and complete Russian learner prompts for every generated task', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-naturalness-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const forbiddenRussian = /(?:Я находится|Мы находится|Мы идёт|Я велосипед|Я тетрадь|Я машина|Я сегодня нервничает|Ты сегодня нервничает|Он сегодня нервничаю|Мы сегодня нервничаю|Я сегодня горжусь|Мы сегодня горжусь)/u;
    for (const target of ['es', 'fr', 'de']) {
      const tasks = readFileSync(join(output, target, 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      for (const task of tasks) {
        const prompts = task.mode === 'speed_match'
          ? task.payload.pairs.map((pair) => pair.left)
          : task.mode === 'find_oddity' ? [] : [task.payload.promptRu];
        for (const prompt of prompts) {
          assert.match(prompt, /[.!?]$/u, `${target} prompt is not a full sentence: ${prompt}`);
          assert.equal(forbiddenRussian.test(prompt), false, `${target} malformed Russian: ${prompt}`);
          assert.match(prompt, /(?:Я|Ты|Он|Мы|У меня|У тебя|У него|У нас)/u, `${target} prompt lacks subject: ${prompt}`);
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
        }
        if (target === 'de') assert.equal(/\b(?:bin|bist|ist|sind)\s+\S+\s+(?:heute|jetzt|morgen|früh|spät)\b/u.test(surface), false, `German copular time order: ${task.taskId}`);
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('keeps the full 12k corpus natural under substitution and does not leak translate-build answers', () => {
  const output = mkdtempSync(join(tmpdir(), 'arena-multilingual-p1-'));
  try {
    const run = spawnSync(process.execPath, [script, '--output', output], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const frenchStateAdjectives = /\b(?:cansado|ocupado|contento|enfermo|solo)\b/u;
    const decoyPositions = new Set();
    const decoyPositionsByLength = new Map();
    for (const target of ['es', 'fr', 'de']) {
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
    for (const target of ['es', 'fr', 'de']) {
      const pack = JSON.parse(readFileSync(join(root, 'content', 'arena-multilingual', target, 'facts.json'), 'utf8'));
      assert.ok(Array.isArray(pack.lexicalFacts) && pack.lexicalFacts.length > 0, `${target} lexical fact inventory`);
      assert.equal(pack.lexicalFacts.every((fact) => fact.kind === 'umbrella_lexical_fact' && fact.lemma && fact.values?.length === 20), true, `${target} real umbrella lexical facts`);
      const verbFactIds = new Set(pack.facts.map((fact) => fact.id));
      const lexicalFactIds = new Set(pack.lexicalFacts.map((fact) => fact.id));
      const manifest = JSON.parse(readFileSync(join(output, target, 'manifest.json'), 'utf8'));
      const tasks = readFileSync(join(output, target, 'tasks.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
      for (const task of tasks) {
        assert.equal(task.cefrBand, ({ 1: 'A1', 2: 'A2', 3: 'A2' })[task.difficulty], `${task.taskId} CEFR band`);
        assert.equal(JSON.stringify(task).includes('B1'), false, `${task.taskId} falsely claims B1`);
        assert.ok(task.sourceFactIds.length > 1, `${task.taskId} binds lexical facts`);
        assert.ok(task.sourceFactIds.some((id) => verbFactIds.has(id)), `${task.taskId} binds a real verb fact`);
        assert.ok(task.sourceFactIds.some((id) => lexicalFactIds.has(id)), `${task.taskId} binds an umbrella lexical fact`);
        if (task.mode === 'find_oddity') {
          assert.equal(task.payload.inverseProof.options.length, 4);
          assert.ok(task.payload.inverseProof.options.every((option) => option.reason));
        }
        if (task.mode === 'speed_match') {
          assert.equal(new Set(task.payload.pairs.map((pair) => pair.factId)).size, 6, `${task.taskId} independent facts`);
          assert.ok(task.payload.pairs.every((pair) => pair.senseEvidence.sourceFactIds.length > 1));
        }
      }
      const speedPairCounts = new Map();
      for (const task of tasks.filter((item) => item.mode === 'speed_match')) for (const pair of task.payload.pairs) {
        const key = `${pair.factId}\u0000${pair.right}`;
        speedPairCounts.set(key, (speedPairCounts.get(key) ?? 0) + 1);
      }
      assert.equal(Math.max(...speedPairCounts.values()) <= manifest.structuralRequirements.maxSpeedMatchPairSurfaceReuse, true, `${target} speed-match source cap`);
      if (target === 'de') {
        const corpus = JSON.stringify(tasks);
        assert.equal(/\b(?:habe|hast|hat|haben)\s+(?:ein Freund|ein Hund|ein Bleistift|ein Mantel|ein Plan|ein Traum)\b/u.test(corpus), false, 'haben takes accusative articles');
      }
      if (target === 'fr') {
        for (const task of tasks.filter((item) => item.mode === 'translate_build' && item.payload.correctAnswer.startsWith("J'ai "))) {
          assert.ok(task.payload.correctTokens.includes("J'"), `${task.taskId} splits elision`);
          assert.equal(task.payload.samePosDecoy.token, 'as', `${task.taskId} keeps a substitutable verb decoy`);
        }
      }
      if (target === 'es') {
        assert.equal(JSON.stringify(tasks).includes('esta tarde') && JSON.stringify(tasks).includes('днём'), true, 'esta tarde RU parity');
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
