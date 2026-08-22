export type MaxVoiceFormat = 'scenario' | 'companion' | 'trial' | 'tutor';
export type MaxVoiceCefr = 'A1' | 'A2' | 'B1' | 'B2';
export type MaxVoiceInterfaceLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
export type MaxVoiceEndReason = 'completed' | 'capped' | 'dropped' | 'background' | 'failed';
export type MaxVoicePhraseResult = 'pass' | 'needs_work' | 'uncertain' | 'invalid';

export interface MaxVoiceFinalizeRequestV1 {
  readonly history: readonly { readonly role: 'user' | 'assistant'; readonly text: string }[];
  readonly durationSec: number;
  readonly speechSec: number;
  readonly format: MaxVoiceFormat;
  readonly scenarioId?: string;
  readonly cefr: MaxVoiceCefr;
  readonly interfaceLang: MaxVoiceInterfaceLang;
  readonly endReason: MaxVoiceEndReason;
  readonly goalId?: string;
  // зачем: аудит 2026-08-22 — сервер двигает goalMastery/сцены и заполняет
  // receipt.goal только когда клиент передал итог инструментов урока.
  readonly sceneOutcome?: 'done' | 'partial' | 'skipped';
  readonly goalProgress?: {
    readonly goalId: string;
    readonly mastery: number;
    readonly evidence?: 'scene' | 'novel_context';
    readonly sceneId?: string;
  };
  readonly phraseResults: readonly {
    readonly text: string;
    readonly result: MaxVoicePhraseResult;
  }[];
  readonly tutorEvidence: {
    readonly nextTopic?: string;
    readonly homeworkItems: readonly { readonly text: string; readonly meaning: string }[];
    readonly languagePreference?: string;
    readonly safetyFlags: readonly { readonly kind: string; readonly note: string }[];
  };
}

export interface MaxVoiceFinalizeDraftV1 {
  readonly version: 1;
  readonly sessionId: string;
  readonly request: MaxVoiceFinalizeRequestV1;
}

export interface MaxVoiceFinalizeEnvelopeV1 extends MaxVoiceFinalizeDraftV1 {
  readonly accountKey: string;
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
  readonly attempts: number;
  readonly nextAttemptAtMs: number;
}

export interface MaxVoiceReviewReceiptV1 {
  readonly schemaVersion: 'max-voice-review.v1';
  readonly sessionId: string;
  readonly stableUid: string;
  readonly completedAtMs: number;
  readonly durationSec: number;
  readonly speechSec?: number;
  readonly endReason: MaxVoiceEndReason;
  readonly status: 'ready' | 'limited';
  readonly worked: readonly string[];
  readonly correction: {
    readonly said: string;
    readonly target: string;
    readonly explanation: string;
  } | null;
  readonly tomorrowActions: readonly [string] | readonly [string, string] | readonly [string, string, string];
  readonly targetPhrase: string | null;
  readonly nextTopic: string | null;
  readonly goal: {
    readonly id: string;
    readonly masteryBefore: 0 | 1 | 2 | 3;
    readonly masteryAfter: 0 | 1 | 2 | 3;
  } | null;
  readonly phraseEvidence: readonly {
    readonly phraseId: string;
    readonly result: 'pass' | 'retry' | 'uncertain';
  }[];
}
