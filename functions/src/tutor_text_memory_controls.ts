import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveDialogueStudyTarget } from './dialogue_ai_language_contract';
import {
  clearMaxVoiceMemory,
  deleteMaxVoiceMemoryItem,
  getMaxVoiceMemory,
  productionMaxVoiceMemoryControlDependencies,
  updateMaxVoiceMemory,
  type MaxVoiceMemoryControlInput,
} from './max_voice_memory_controls';

const callableOptions = {
  region: 'us-central1',
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
  maxInstances: 20,
};

function explicitTargetInput(request: { auth?: { uid?: string }; data?: unknown }): MaxVoiceMemoryControlInput {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  if (!request.data || typeof request.data !== 'object' || Array.isArray(request.data)) {
    throw new HttpsError('invalid-argument', 'tutor_text_study_target_required');
  }
  const data = request.data as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(data, 'studyTarget')) {
    throw new HttpsError('invalid-argument', 'tutor_text_study_target_required');
  }
  const studyTarget = resolveDialogueStudyTarget(data.studyTarget);
  return { authUid: request.auth.uid, data: { ...data, studyTarget } };
}

export const tutorTextGetMemory = onCall(callableOptions, async (request) => {
  const input = explicitTargetInput(request);
  return getMaxVoiceMemory(input, productionMaxVoiceMemoryControlDependencies());
});

export const tutorTextUpdateMemory = onCall(callableOptions, async (request) => {
  const input = explicitTargetInput(request);
  return updateMaxVoiceMemory(input, productionMaxVoiceMemoryControlDependencies());
});

export const tutorTextDeleteMemoryItem = onCall(callableOptions, async (request) => {
  const input = explicitTargetInput(request);
  return deleteMaxVoiceMemoryItem(input, productionMaxVoiceMemoryControlDependencies());
});

export const tutorTextClearMemory = onCall(callableOptions, async (request) => {
  const input = explicitTargetInput(request);
  return clearMaxVoiceMemory(input, productionMaxVoiceMemoryControlDependencies());
});
