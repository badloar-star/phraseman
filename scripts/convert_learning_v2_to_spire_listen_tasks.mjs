// зачем: PM-286 — Шпилю нужны задания 'listen'/'dictate' (T40: «берутся из
// Learning V2»). У V2 такие тексты и режимы уже есть (`listen_choose`,
// `listen_build_dictation`), но в формате courseSession learner.json, а не в
// формате пула Шпиля (TournamentTask, functions/src/tournament_core.ts).
// Этот скрипт конвертирует V2-взаимодействия в TournamentTask-совместимые
// заготовки (payload + kind), НЕ реализуя STT/голос (это T22, отдельно) и НЕ
// придумывая текст — только переносит уже написанные фразы/дистракторы.
//
// Честное ограничение (задокументировано, не решается этим скриптом):
// 1) Learning V2 контент есть ТОЛЬКО для en (английский изучаемый язык).
//    content/learning-v2-course/curriculum/{de,fr} — пустые заготовки
//    (только REQUIREMENT_MANIFEST_V1.json), реальных learner.json нет.
//    es вообще не встречается как курс — только es/de/fr как ЦЕЛЕВЫЕ Арены.
// 2) audioUri у TournamentTask (kind listen/dictate) ожидает готовую ссылку
//    на озвучку. По D47 скачивание V2-озвучки убрано; экран V2 звучит через
//    голос телефона за пределами стартового пакета. Этот скрипт НЕ решает,
//    откуда возьмётся audioUri в Шпиле — оставляет плейсхолдер
//    "device-tts:<lang>:<transcript-hash>" и помечает задачу как требующую
//    решения по озвучке (см. отчёт PM-286_listen_voice_from_v2.md).
//
// Запуск: node scripts/convert_learning_v2_to_spire_listen_tasks.mjs
// Только чтение источника, пишет ОДИН новый файл-черновик (не публикует и не
// трогает функции/пул Арены):
//   content/arena-multilingual/generated/en/spire_listen_dictate_draft.jsonl

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, globSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_GLOB = resolve(ROOT, 'content/learning-v2-course/release/en/**/learner.json');
const OUT_PATH = resolve(ROOT, 'content/arena-multilingual/generated/en/spire_listen_dictate_draft.jsonl');

function audioPlaceholder(lang, transcript) {
  const hash = createHash('sha256').update(transcript).digest('hex').slice(0, 16);
  return `device-tts:${lang}:${hash}`;
}

function shuffleDeterministic(items, seed) {
  // зачем: детерминированный порядок (без Math.random) — повторный запуск
  // скрипта даёт тот же файл, что важно для ревью диффов.
  const arr = [...items];
  let h = createHash('sha256').update(seed).digest();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const byte = h[i % h.length];
    const j = byte % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function convertListenChoose(interaction, sourceFile) {
  const opts = interaction.responseOptions || [];
  if (opts.length < 2) return { skip: 'too_few_options' };
  const mp = interaction.modePayload || {};
  const ref = mp.referenceAudio;
  if (!ref || !ref.transcript) return { skip: 'no_reference_audio' };

  const transcript = ref.transcript;
  const texts = opts.map((o) => o.text);
  let correctIndex = texts.indexOf(transcript);

  if (correctIndex === -1) {
    // Фолбэк: правильный — тот, что НЕ помечен неверным в choiceFeedback.
    const wrongIds = new Set((mp.choiceFeedback || [])
      .filter((fb) => fb.correct === false)
      .map((fb) => fb.responseId));
    const candidates = opts.filter((o) => !wrongIds.has(o.responseId));
    if (candidates.length !== 1) return { skip: 'ambiguous_correct_option' };
    correctIndex = opts.indexOf(candidates[0]);
  }

  const options = texts.slice(0, 4);
  if (options.length > 4) return { skip: 'too_many_options_for_tournament_task' };

  return {
    ok: true,
    task: {
      taskId: `spire-en-listen-${interaction.interactionId}`,
      studyTarget: 'en',
      mode: 'listen_choose',
      isVoice: false,
      difficulty: 1,
      payload: {
        audioUri: audioPlaceholder('en', transcript),
        phrase: transcript,
        options,
        correctIndex,
      },
      tags: ['pool:spire_listen_v2_draft', 'source:learning_v2'],
      provenanceKeys: [`learning-v2:1:${interaction.interactionId}`],
      verified: false,
      sourceInteractionId: interaction.interactionId,
      sourceFile,
      needsAudioResolution: true,
    },
  };
}

function convertDictation(interaction, sourceFile) {
  const mp = interaction.modePayload || {};
  const phrase = mp.hiddenTargetPhrase;
  const correctTokens = mp.orderedTokens;
  const distractorTokens = mp.authoredDistractorTokens || [];
  if (!phrase || !Array.isArray(correctTokens) || correctTokens.length === 0) {
    return { skip: 'missing_phrase_or_tokens' };
  }
  // TournamentTask contract требует ровно один "trap"-токен в wordBank сверх
  // correctTokens (hasStrictTranslateBuildFieldContract). V2 уже авторски
  // проставляет ровно authoredDistractorTokens — используем как есть, без
  // выдумывания, но проверяем контракт "1 trap" перед принятием.
  if (distractorTokens.length !== 1) {
    return { skip: `distractor_token_count_${distractorTokens.length}_expected_1` };
  }
  const wordBank = shuffleDeterministic([...correctTokens, ...distractorTokens], interaction.interactionId);

  return {
    ok: true,
    task: {
      taskId: `spire-en-dictate-${interaction.interactionId}`,
      studyTarget: 'en',
      mode: 'listen_build',
      isVoice: false,
      difficulty: 2,
      payload: {
        audioUri: audioPlaceholder('en', phrase),
        phrase,
        wordBank,
        correctTokens,
      },
      tags: ['pool:spire_listen_v2_draft', 'source:learning_v2'],
      provenanceKeys: [`learning-v2:1:${interaction.interactionId}`],
      verified: false,
      sourceInteractionId: interaction.interactionId,
      sourceFile,
      needsAudioResolution: true,
    },
  };
}

function main() {
  const files = globSync(SOURCE_GLOB);
  if (files.length === 0) {
    console.error('No learner.json files found under', SOURCE_GLOB);
    process.exitCode = 1;
    return;
  }

  const out = [];
  const skipReasons = {};
  let listenSeen = 0;
  let dictateSeen = 0;

  for (const file of files) {
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    const relFile = file.replace(ROOT, '').replace(/\\/g, '/');
    for (const interaction of doc.interactions || []) {
      if (interaction.family === 'listen_choose') {
        listenSeen += 1;
        const result = convertListenChoose(interaction, relFile);
        if (result.ok) out.push(result.task);
        else skipReasons[result.skip] = (skipReasons[result.skip] || 0) + 1;
      } else if (interaction.family === 'listen_build_dictation') {
        dictateSeen += 1;
        const result = convertDictation(interaction, relFile);
        if (result.ok) out.push(result.task);
        else skipReasons[result.skip] = (skipReasons[result.skip] || 0) + 1;
      }
    }
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, out.map((t) => JSON.stringify(t)).join('\n') + '\n', 'utf8');

  const listenOut = out.filter((t) => t.mode === 'listen_choose').length;
  const dictateOut = out.filter((t) => t.mode === 'listen_build').length;

  console.log('=== PM-286 Learning V2 -> Spire listen/dictate converter ===');
  console.log('source files:', files.length);
  console.log('listen_choose seen:', listenSeen, '-> converted:', listenOut);
  console.log('listen_build_dictation seen:', dictateSeen, '-> converted:', dictateOut);
  console.log('total draft tasks written:', out.length, '->', OUT_PATH.replace(ROOT, '').replace(/\\/g, '/'));
  console.log('skip reasons:', JSON.stringify(skipReasons, null, 2));
  console.log('\nNOTE: every task has needsAudioResolution=true and verified=false.');
  console.log('This is a DRAFT, not a publishable pool: audioUri is a placeholder,');
  console.log('and tasks are not run through the semantic review pipeline required');
  console.log('by validateTournamentTaskForNewRoom (V11 provenance/hash fields).');
}

main();
