import {
  validateArenaTaskForNewRoom,
  type ArenaTargetNewRoomTask,
} from './arena_target_quality';
import { validateTournamentTask, type TournamentTask } from './tournament_core';

const FACT_PACK_HASH = 'a'.repeat(64);

function evidence(
  studyTarget: 'en' | 'es' | 'fr' | 'de',
  mode: 'guess_phrase' | 'fill_gap' | 'find_oddity' | 'translate_build' | 'speed_match',
  modeProof: Record<string, unknown>,
) {
  const profiles = {
    en: 'english_core',
    es: 'spanish_agreement',
    fr: 'french_agreement',
    de: 'german_case_order',
  } as const;
  return {
    schemaVersion: 'arena-target-evidence-v1' as const,
    profileId: profiles[studyTarget],
    factPack: {
      version: 'arena-target-fact-pack-v1',
      sha256: FACT_PACK_HASH,
    },
    familyCode: `${studyTarget}:${profiles[studyTarget]}:${mode}:v1`,
    modeProof,
  };
}

function choiceTask(studyTarget: 'en' | 'es' | 'fr' | 'de' = 'en'): ArenaTargetNewRoomTask {
  const options = ['I am home.', 'I is home.', 'I home.', 'Me am home.'];
  return {
    taskId: `arena-${studyTarget}-guess-001`,
    studyTarget,
    mode: 'guess_phrase',
    isVoice: false,
    difficulty: 1,
    payload: { phrase: 'Я дома.', options, correctIndex: 0 },
    explanation: {
      ruleNote: 'The subject and finite verb must agree.',
      example: 'I am home. — Я дома.',
      wrongOptionReasons: ['', 'agreement', 'missing_copula', 'subject_case'],
    },
    tags: [],
    verified: true,
    sourceFactIds: [`${studyTarget}-be-1sg`, `${studyTarget}-lex-home`],
    arenaEvidence: evidence(studyTarget, 'guess_phrase', {
      kind: 'choice',
      reasons: [
        { optionIndex: 1, reasonCode: 'agreement' },
        { optionIndex: 2, reasonCode: 'missing_copula' },
        { optionIndex: 3, reasonCode: 'subject_case' },
      ],
    }),
  };
}

function expected(studyTarget: 'en' | 'es' | 'fr' | 'de') {
  return {
    studyTarget,
    factPackVersion: 'arena-target-fact-pack-v1',
    factPackSha256: FACT_PACK_HASH,
  } as const;
}

describe('Arena target-aware new-room boundary', () => {
  it('keeps the legacy parser readable but rejects an untagged task for a new Arena room', () => {
    const { studyTarget: _studyTarget, sourceFactIds: _sourceFactIds, arenaEvidence: _arenaEvidence, ...legacy } = choiceTask();

    expect(validateTournamentTask(legacy as TournamentTask)).toEqual({ ok: true, kind: 'choice' });
    expect(validateArenaTaskForNewRoom(legacy as TournamentTask, expected('en'))).toEqual({
      ok: false,
      reason: 'arena_task_target_missing',
    });
  });

  it.each(['en', 'es', 'fr', 'de'] as const)(
    'rejects missing and unknown target identity for a requested %s room',
    (studyTarget) => {
      expect(validateArenaTaskForNewRoom({
        ...choiceTask(studyTarget),
        studyTarget: undefined,
      }, expected(studyTarget))).toEqual({ ok: false, reason: 'arena_task_target_missing' });
      expect(validateArenaTaskForNewRoom({
        ...choiceTask(studyTarget),
        studyTarget: 'it',
      }, expected(studyTarget))).toEqual({ ok: false, reason: 'arena_task_target_unknown' });
    },
  );

  it.each(['es', 'fr', 'de'] as const)(
    'rejects a valid English task when the requested target is %s',
    (studyTarget) => {
      expect(validateArenaTaskForNewRoom(choiceTask('en'), expected(studyTarget))).toEqual({
        ok: false,
        reason: 'arena_task_target_mismatch',
      });
    },
  );

  it('requires exact profile, fact-pack identity and target-prefixed source facts', () => {
    const task = choiceTask('es');
    expect(validateArenaTaskForNewRoom({
      ...task,
      arenaEvidence: { ...task.arenaEvidence, profileId: 'english_core' },
    }, expected('es'))).toEqual({ ok: false, reason: 'arena_task_profile_mismatch' });
    expect(validateArenaTaskForNewRoom(task, {
      ...expected('es'),
      factPackSha256: 'b'.repeat(64),
    })).toEqual({ ok: false, reason: 'arena_task_fact_pack_mismatch' });
    expect(validateArenaTaskForNewRoom({
      ...task,
      sourceFactIds: ['en-be-1sg'],
    }, expected('es'))).toEqual({ ok: false, reason: 'arena_task_source_facts_invalid' });
  });

  it('rejects an unknown target/mode family code', () => {
    const task = choiceTask('fr');
    expect(validateArenaTaskForNewRoom({
      ...task,
      arenaEvidence: { ...task.arenaEvidence, familyCode: 'fr:french_agreement:invented:v1' },
    }, expected('fr'))).toEqual({ ok: false, reason: 'arena_task_family_invalid' });
  });

  it('rejects non-canonical evidence fields and unbounded fact identifiers', () => {
    const task = choiceTask('en');
    expect(validateArenaTaskForNewRoom({
      ...task,
      arenaEvidence: { ...task.arenaEvidence, unsignedTail: 'not reviewed' } as typeof task.arenaEvidence,
    }, expected('en'))).toEqual({ ok: false, reason: 'arena_task_evidence_invalid' });
    expect(validateArenaTaskForNewRoom({
      ...task,
      sourceFactIds: [`en-${'x'.repeat(300)}`],
    }, expected('en'))).toEqual({ ok: false, reason: 'arena_task_source_facts_invalid' });
  });

  it('rejects normalized duplicate choices, an invalid index and misaligned reasons', () => {
    const task = choiceTask('de');
    expect(validateArenaTaskForNewRoom({
      ...task,
      payload: { ...task.payload, options: ['Ja.', ' ja. ', 'Nein.', 'Vielleicht.'] },
    }, expected('de'))).toEqual({ ok: false, reason: 'arena_task_options_duplicate' });
    expect(validateArenaTaskForNewRoom({
      ...task,
      payload: { ...task.payload, correctIndex: 4 },
    }, expected('de'))).toEqual({ ok: false, reason: 'choice_contract_invalid' });
    expect(validateArenaTaskForNewRoom({
      ...task,
      arenaEvidence: {
        ...task.arenaEvidence,
        modeProof: { kind: 'choice', reasons: [{ optionIndex: 1, reasonCode: 'agreement' }] },
      },
    }, expected('de'))).toEqual({ ok: false, reason: 'arena_task_distractor_reason_missing' });
    expect(validateArenaTaskForNewRoom({
      ...task,
      arenaEvidence: {
        ...task.arenaEvidence,
        modeProof: {
          kind: 'choice',
          reasons: [
            { optionIndex: 1, reasonCode: 'invented_reason' },
            { optionIndex: 2, reasonCode: 'missing_copula' },
            { optionIndex: 3, reasonCode: 'subject_case' },
          ],
        },
      },
    }, expected('de'))).toEqual({ ok: false, reason: 'arena_task_distractor_reason_mismatch' });
  });

  it('requires one aligned translate decoy and an exact target tokenization proof', () => {
    const task: ArenaTargetNewRoomTask = {
      taskId: 'arena-es-translate-001', studyTarget: 'es', mode: 'translate_build', isVoice: false,
      difficulty: 1, tags: [], verified: true,
      payload: {
        phrase: 'Я дома.',
        wordBank: ['Estoy', 'casa.', 'está', 'en'],
        correctTokens: ['Estoy', 'en', 'casa.'],
        correctTokenCount: 3,
      },
      explanation: { ruleNote: 'Use estar for location.', example: 'Estoy en casa. — Я дома.', wrongOptionReasons: [] },
      sourceFactIds: ['es-estar-estoy', 'es-lex-estar-locations', 'es-estar-esta'],
      arenaEvidence: evidence('es', 'translate_build', {
        kind: 'translate_build',
        decoyIndex: 2,
        decoyToken: 'está',
        decoyPartOfSpeech: 'verb',
        reasonCode: 'wrong_person',
        tokenizationPolicyId: 'es:arena-tokenization-v1',
        correctTokenCount: 3,
      }),
    };

    expect(validateArenaTaskForNewRoom(task, expected('es'))).toEqual({ ok: true, kind: 'translate' });
    expect(validateArenaTaskForNewRoom({
      ...task,
      arenaEvidence: { ...task.arenaEvidence, modeProof: { ...task.arenaEvidence.modeProof, decoyIndex: 1 } },
    }, expected('es'))).toEqual({ ok: false, reason: 'arena_task_translate_decoy_invalid' });
    expect(validateArenaTaskForNewRoom({
      ...task,
      arenaEvidence: {
        ...task.arenaEvidence,
        modeProof: { ...task.arenaEvidence.modeProof, tokenizationPolicyId: 'en:arena-tokenization-v1' },
      },
    }, expected('es'))).toEqual({ ok: false, reason: 'arena_task_translate_tokenization_invalid' });
  });

  it('requires speed_match to be an exact six-by-six bijection', () => {
    const rightOptions = ['I am home.', 'You are home.', 'He is home.', 'We are home.', 'They are home.', 'She is home.'];
    const prompts = ['Я дома.', 'Ты дома.', 'Он дома.', 'Мы дома.', 'Они дома.', 'Она дома.'];
    const task: ArenaTargetNewRoomTask = {
      taskId: 'arena-en-match-001', studyTarget: 'en', mode: 'speed_match', isVoice: false,
      difficulty: 1, tags: [], verified: true,
      payload: {
        prompt: 'Соедините пары.',
        rightOptions,
        items: prompts.map((prompt, correctIndex) => ({
          prompt,
          options: rightOptions,
          correctIndex,
          explanation: { ruleNote: 'Exact translation pair.', example: `${rightOptions[correctIndex]} — ${prompt}`, wrongOptionReasons: rightOptions.map((_, index) => index === correctIndex ? '' : 'meaning_mismatch') },
        })),
      },
      explanation: { ruleNote: 'Match exact translations.', example: 'I am home. — Я дома.', wrongOptionReasons: [] },
      sourceFactIds: ['en-be-1sg', 'en-be-2sg', 'en-be-3sg', 'en-be-1pl', 'en-be-3pl', 'en-be-3sg-f'],
      arenaEvidence: evidence('en', 'speed_match', {
        kind: 'speed_match', pairCount: 6, uniqueLeftCount: 6, uniqueRightCount: 6,
      }),
    };

    expect(validateArenaTaskForNewRoom(task, expected('en'))).toEqual({ ok: true, kind: 'match' });
    const items = task.payload.items as Array<Record<string, unknown>>;
    expect(validateArenaTaskForNewRoom({
      ...task,
      payload: { ...task.payload, items: items.map((item, index) => index === 5 ? { ...item, prompt: prompts[0] } : item) },
    }, expected('en'))).toEqual({ ok: false, reason: 'speed_match_field_contract_invalid' });
  });

  it.each(['en', 'es', 'fr', 'de'] as const)('accepts complete %s target evidence', (studyTarget) => {
    expect(validateArenaTaskForNewRoom(choiceTask(studyTarget), expected(studyTarget)))
      .toEqual({ ok: true, kind: 'choice' });
  });
});
