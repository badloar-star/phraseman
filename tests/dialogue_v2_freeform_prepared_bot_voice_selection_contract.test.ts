import {
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
  encodeDialogueV2FreeformPreparedBotVoiceSelection,
  parseDialogueV2FreeformPreparedBotVoiceSelection,
} from '../shared/dialogue_v2_freeform_prepared_bot_voice_selection_contract';
import { DIALOGUE_V2_STUDY_TARGETS } from '../shared/dialogue_v2_language_pack_contract';

function validSelection() {
  return {
    contractVersion: DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_SELECTION_CONTRACT,
    sessionId: `d2fs_${'S'.repeat(32)}`,
    turnId: `d2ft_${'T'.repeat(16)}`,
    studyTarget: 'en',
    voiceCatalogReleaseId: 'freeform_voice_2026_09_27_01',
    voiceCatalogReleaseSha256: 'a'.repeat(64),
    voiceStyleId: 'warm_tutor_en',
    preparedResponseId: 'milestone_en_01',
    replyTextSha256: 'b'.repeat(64),
    responseKind: 'milestone',
    dayKey: '2026-09-27',
    operationFingerprint: 'c'.repeat(64),
  };
}

describe('Dialogue V2 Freeform prepared bot voice selection contract', () => {
  it('parses a no-scenario selection and freezes a defensive copy', () => {
    const input = validSelection();
    const parsed = parseDialogueV2FreeformPreparedBotVoiceSelection(input);

    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(JSON.stringify(parsed)).not.toMatch(/scenario|persona|rank|task|model|uri|path/i);
  });

  it('encodes only the canonical ordered contract fields', () => {
    const encoded = encodeDialogueV2FreeformPreparedBotVoiceSelection(validSelection());
    expect(JSON.parse(encoded)).toEqual(validSelection());
    expect(encoded).toBe(JSON.stringify(validSelection()));
  });

  it.each([
    ['scenario session prefix', (value: any) => { value.sessionId = `d2s_${'S'.repeat(32)}`; }],
    ['scenario turn prefix', (value: any) => { value.turnId = `d2t_${'T'.repeat(16)}`; }],
    ['wrong target', (value: any) => { value.studyTarget = 'it'; }],
    ['extra scenario field', (value: any) => { value.scenarioId = 'social_01'; }],
    ['extra model field', (value: any) => { value.model = 'forbidden'; }],
    ['bad catalog release id', (value: any) => { value.voiceCatalogReleaseId = '../release'; }],
    ['bad release hash', (value: any) => { value.voiceCatalogReleaseSha256 = 'a'.repeat(63); }],
    ['bad style id', (value: any) => { value.voiceStyleId = 'warm/tutor'; }],
    ['bad prepared id', (value: any) => { value.preparedResponseId = 'reply.mp3'; }],
    ['bad reply hash', (value: any) => { value.replyTextSha256 = 'B'.repeat(64); }],
    ['ordinary reply kind', (value: any) => { value.responseKind = 'answer'; }],
    ['impossible day', (value: any) => { value.dayKey = '2026-02-31'; }],
    ['bad fingerprint', (value: any) => { value.operationFingerprint = 'c'.repeat(65); }],
  ])('rejects %s', (_name, mutate) => {
    const selection = validSelection();
    mutate(selection);
    expect(parseDialogueV2FreeformPreparedBotVoiceSelection(selection)).toBeNull();
    expect(() => encodeDialogueV2FreeformPreparedBotVoiceSelection(selection))
      .toThrow('invalid_dialogue_v2_freeform_prepared_bot_voice_selection');
  });

  it('rejects accessors and hostile proxies without leaking exceptions', () => {
    let getterCalls = 0;
    const accessor = validSelection();
    Object.defineProperty(accessor, 'studyTarget', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'en';
      },
    });
    expect(parseDialogueV2FreeformPreparedBotVoiceSelection(accessor)).toBeNull();
    expect(getterCalls).toBe(0);

    const hostileProxy = new Proxy(validSelection(), {
      getOwnPropertyDescriptor() {
        throw new Error('proxy_trap_must_not_escape');
      },
    });
    expect(() => parseDialogueV2FreeformPreparedBotVoiceSelection(hostileProxy)).not.toThrow();
    expect(parseDialogueV2FreeformPreparedBotVoiceSelection(hostileProxy)).toBeNull();
  });

  it('rejects an injected target after the mutable language export is changed post-load', () => {
    const mutableTargets = DIALOGUE_V2_STUDY_TARGETS as unknown as string[];
    mutableTargets.push('it');
    try {
      expect(parseDialogueV2FreeformPreparedBotVoiceSelection({
        ...validSelection(),
        studyTarget: 'it',
      })).toBeNull();
    } finally {
      mutableTargets.splice(mutableTargets.lastIndexOf('it'), 1);
    }
  });

  it('rejects an injected target even when the mutable language export changes before import', async () => {
    await jest.isolateModulesAsync(async () => {
      const languageModule = await import('../shared/dialogue_v2_language_pack_contract');
      const mutableTargets = languageModule.DIALOGUE_V2_STUDY_TARGETS as unknown as string[];
      mutableTargets.push('it');
      const selectionModule = await import(
        '../shared/dialogue_v2_freeform_prepared_bot_voice_selection_contract'
      );

      expect(selectionModule.parseDialogueV2FreeformPreparedBotVoiceSelection({
        ...validSelection(),
        studyTarget: 'it',
      })).toBeNull();
    });
  });
});
