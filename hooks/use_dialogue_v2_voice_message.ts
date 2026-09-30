import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  buildDialogueVoiceAttachment,
  type DialogueVoiceAttachment,
  type DialogueVoiceDraft,
} from '../app/dialogue_voice_message';
import { dialogueLanguageMeta, type DialogueStudyTarget } from '../app/dialogue_language_registry';
import { resolveDialogueAsrCapability } from '../app/dialogue_voice_capability';
import {
  isSpeechRecognitionAvailable,
  loadSpeechRecognitionModule,
  readSpeechRecognitionLocaleInventory,
  requestSpeechPermissionForHold,
} from '../app/speech_recognition_module';
import { buildSpeakingStartOptions } from '../app/speaking_recognition_options';
import {
  claimRecordingAudio,
  claimSpokenAudio,
  whenRecordingAudioReady,
  whenSpokenAudioReady,
  type RecordingAudioClaim,
  type SpokenAudioClaim,
} from '../modules/audio/audio_runtime_arbiter';
import { useRuntimeActive } from './use_runtime_active';

export type DialogueV2VoiceStatus = 'idle' | 'starting' | 'recording';

/**
 * зачем (макет dialogs.html C14/C15): почему голос не дал текста — видимая причина под
 * строкой ввода вместо молчаливого возврата в покой. null — последняя попытка без сбоя.
 */
export type DialogueV2VoiceFailure = 'not_heard' | 'permission_denied' | 'unavailable' | null;

export type UseDialogueV2VoiceMessageInput = Readonly<{
  studyTarget: DialogueStudyTarget;
  promptText: string;
  disabled?: boolean;
  onTranscript: (transcript: string) => void;
}>;

export type DialogueV2VoiceMessageController = Readonly<{
  status: DialogueV2VoiceStatus;
  failure: DialogueV2VoiceFailure;
  clearFailure: () => void;
  voiceDraft: DialogueVoiceDraft | null;
  playingVoiceUri: string | null;
  start: () => Promise<void>;
  stop: () => void;
  discard: () => void;
  play: (uri: string) => void;
  takeVoiceAttachment: (submittedText: string) => DialogueVoiceAttachment | null;
}>;

type Removable = Readonly<{ remove?: () => void }>;

function isLocalRecordingUri(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('file://');
}

function deleteLocalVoiceRecording(uri: string): void {
  if (!isLocalRecordingUri(uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cache hygiene: local cleanup must not block a text turn.
  }
}

/**
 * Owns the complete lifetime of V2 learner audio. Audio never crosses this
 * hook's boundary: only the recognizer transcript is returned to the route.
 * `buildDialogueVoiceAttachment` applies its documented canonical whitespace
 * comparison before the local replay URI may be attached to a rendered bubble.
 */
export function useDialogueV2VoiceMessage({
  studyTarget,
  promptText,
  disabled = false,
  onTranscript,
}: UseDialogueV2VoiceMessageInput): DialogueV2VoiceMessageController {
  const runtimeActive = useRuntimeActive();
  const runtimeActiveRef = useRef(runtimeActive);
  runtimeActiveRef.current = runtimeActive;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const speechModule = useMemo(() => loadSpeechRecognitionModule(), []);

  const mountedRef = useRef(true);
  const voiceInputSessionRef = useRef(0);
  const voiceStartGenerationRef = useRef(0);
  const voiceHoldActiveRef = useRef(false);
  const voiceCaptureTokenRef = useRef(0);
  const voiceCaptureUriRef = useRef<string | null>(null);
  const voiceCaptureTranscriptRef = useRef('');
  const voiceDraftRef = useRef<DialogueVoiceDraft | null>(null);
  const captureVoiceUrisRef = useRef(new Set<string>());
  const ownedVoiceUrisRef = useRef(new Set<string>());
  const sentVoiceUrisRef = useRef(new Set<string>());
  const voiceListenersRef = useRef<Removable[]>([]);
  const voiceRecordingClaimRef = useRef<RecordingAudioClaim | null>(null);
  const voiceMessageClaimRef = useRef<SpokenAudioClaim | null>(null);
  const voiceMessagePlayerRef = useRef<AudioPlayer | null>(null);
  const voiceMessagePlaybackSubRef = useRef<Removable | null>(null);
  const voiceMessagePlaybackGenerationRef = useRef(0);
  const statusRef = useRef<DialogueV2VoiceStatus>('idle');

  const [status, setStatus] = useState<DialogueV2VoiceStatus>('idle');
  const [failure, setFailure] = useState<DialogueV2VoiceFailure>(null);
  const reportFailure = useCallback((next: Exclude<DialogueV2VoiceFailure, null>, detail: string) => {
    console.warn('[DIALOGUE-V2] voice:failure', { failure: next, detail });
    if (mountedRef.current) setFailure(next);
  }, []);
  const clearFailure = useCallback(() => {
    if (mountedRef.current) setFailure(null);
  }, []);
  const [voiceDraft, setVoiceDraft] = useState<DialogueVoiceDraft | null>(null);
  const [playingVoiceUri, setPlayingVoiceUri] = useState<string | null>(null);

  const updateStatus = useCallback((next: DialogueV2VoiceStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const updateVoiceDraft = useCallback((next: DialogueVoiceDraft | null) => {
    voiceDraftRef.current = next;
    if (mountedRef.current) setVoiceDraft(next);
  }, []);

  const cleanupVoiceListeners = useCallback(() => {
    for (const listener of voiceListenersRef.current) listener.remove?.();
    voiceListenersRef.current = [];
  }, []);

  const releaseVoiceRecording = useCallback(() => {
    voiceRecordingClaimRef.current?.release();
    voiceRecordingClaimRef.current = null;
    updateStatus('idle');
  }, [updateStatus]);

  const stopVoiceMessagePlayback = useCallback(() => {
    voiceMessagePlaybackGenerationRef.current += 1;
    voiceMessagePlaybackSubRef.current?.remove?.();
    voiceMessagePlaybackSubRef.current = null;
    voiceMessageClaimRef.current?.release();
    voiceMessageClaimRef.current = null;
    const player = voiceMessagePlayerRef.current;
    voiceMessagePlayerRef.current = null;
    try { player?.pause(); } catch { /* native player is already stopped */ }
    try { player?.release(); } catch { /* native player is already released */ }
    if (mountedRef.current) setPlayingVoiceUri(null);
  }, []);

  const deleteIfUnowned = useCallback((uri: string) => {
    if (sentVoiceUrisRef.current.has(uri)) return;
    ownedVoiceUrisRef.current.delete(uri);
    captureVoiceUrisRef.current.delete(uri);
    deleteLocalVoiceRecording(uri);
  }, []);

  const cleanupPendingVoiceRecordings = useCallback(() => {
    for (const uri of captureVoiceUrisRef.current) deleteIfUnowned(uri);
    captureVoiceUrisRef.current.clear();
    voiceCaptureUriRef.current = null;
    voiceCaptureTranscriptRef.current = '';
    updateVoiceDraft(null);
  }, [deleteIfUnowned, updateVoiceDraft]);

  const invalidateCapture = useCallback(() => {
    voiceInputSessionRef.current += 1;
    voiceStartGenerationRef.current += 1;
    voiceHoldActiveRef.current = false;
    voiceCaptureTokenRef.current += 1;
    cleanupVoiceListeners();
    try { speechModule?.abort(); } catch { /* recognizer is already stopped */ }
    releaseVoiceRecording();
  }, [cleanupVoiceListeners, releaseVoiceRecording, speechModule]);

  const cleanupAllLocalAudio = useCallback(() => {
    invalidateCapture();
    stopVoiceMessagePlayback();
    const draftUri = voiceDraftRef.current?.uri;
    if (draftUri) ownedVoiceUrisRef.current.add(draftUri);
    for (const uri of ownedVoiceUrisRef.current) deleteLocalVoiceRecording(uri);
    ownedVoiceUrisRef.current.clear();
    captureVoiceUrisRef.current.clear();
    sentVoiceUrisRef.current.clear();
    voiceCaptureUriRef.current = null;
    voiceCaptureTranscriptRef.current = '';
    updateVoiceDraft(null);
  }, [invalidateCapture, stopVoiceMessagePlayback, updateVoiceDraft]);

  const discard = useCallback(() => {
    invalidateCapture();
    cleanupPendingVoiceRecordings();
  }, [cleanupPendingVoiceRecordings, invalidateCapture]);

  const stop = useCallback(() => {
    voiceHoldActiveRef.current = false;
    voiceStartGenerationRef.current += 1;
    try { speechModule?.stop(); } catch { /* recognizer did not start */ }
    releaseVoiceRecording();
  }, [releaseVoiceRecording, speechModule]);

  const start = useCallback(async () => {
    if (disabledRef.current || !runtimeActiveRef.current || !speechModule) return;
    invalidateCapture();
    cleanupPendingVoiceRecordings();
    clearFailure();
    if (!isSpeechRecognitionAvailable(speechModule)) {
      reportFailure('unavailable', 'recognition_unavailable');
      return;
    }

    const session = voiceInputSessionRef.current + 1;
    const startGeneration = voiceStartGenerationRef.current + 1;
    const captureToken = voiceCaptureTokenRef.current + 1;
    voiceInputSessionRef.current = session;
    voiceStartGenerationRef.current = startGeneration;
    voiceCaptureTokenRef.current = captureToken;
    voiceHoldActiveRef.current = true;
    updateStatus('starting');

    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const inventory = await readSpeechRecognitionLocaleInventory(speechModule, platform);
    const capability = resolveDialogueAsrCapability({
      target: studyTarget,
      platform,
      androidApiLevel: Platform.OS === 'android' ? Number(Platform.Version) : undefined,
      locales: inventory?.locales,
      inventoryServiceId: inventory?.serviceId,
      startServiceId: inventory?.serviceId,
    });
    const startIsCurrent = () => mountedRef.current
      && runtimeActiveRef.current
      && !disabledRef.current
      && session === voiceInputSessionRef.current
      && startGeneration === voiceStartGenerationRef.current
      && voiceHoldActiveRef.current;
    if (!startIsCurrent() || !capability.available) {
      if (startIsCurrent() && !capability.available) reportFailure('unavailable', 'asr_locale_unavailable');
      invalidateCapture();
      return;
    }

    const permission = await requestSpeechPermissionForHold(speechModule);
    if (!startIsCurrent() || permission !== 'granted') {
      // 'granted_after_prompt' — не сбой: после системного окна нужно новое удержание.
      if (permission === 'denied') reportFailure('permission_denied', 'speech_permission_denied');
      invalidateCapture();
      return;
    }

    const captureIsCurrent = () => mountedRef.current
      && runtimeActiveRef.current
      && session === voiceInputSessionRef.current;
    const applyTranscript = (value: string) => {
      const transcript = value.trim();
      if (!captureIsCurrent() || !transcript) return;
      voiceCaptureTranscriptRef.current = transcript;
      onTranscriptRef.current(transcript);
      const uri = voiceCaptureUriRef.current;
      if (uri) updateVoiceDraft(Object.freeze({ uri, transcript }));
    };
    const trackRecordingUri = (value: unknown): string | null => {
      if (!isLocalRecordingUri(value)) return null;
      ownedVoiceUrisRef.current.add(value);
      captureVoiceUrisRef.current.add(value);
      return value;
    };

    const startSub = speechModule.addListener('start', () => {
      if (captureIsCurrent()) updateStatus('recording');
    });
    const resultSub = speechModule.addListener('result', (event: unknown) => {
      if (!captureIsCurrent()) return;
      const payload = event as Readonly<{ results?: readonly Readonly<{ transcript?: unknown }>[] }>;
      applyTranscript(typeof payload.results?.[0]?.transcript === 'string' ? payload.results[0].transcript : '');
    });
    const endSub = speechModule.addListener('end', () => {
      if (!captureIsCurrent()) return;
      releaseVoiceRecording();
      const uri = voiceCaptureUriRef.current;
      const transcript = voiceCaptureTranscriptRef.current;
      if (uri && transcript) updateVoiceDraft(Object.freeze({ uri, transcript }));
      if (!transcript) reportFailure('not_heard', 'end_without_transcript');
    });
    const errorSub = speechModule.addListener('error', (event: unknown) => {
      if (!captureIsCurrent()) return;
      releaseVoiceRecording();
      const code = String((event as { error?: unknown } | null)?.error ?? 'unknown').slice(0, 40);
      if (code === 'not-allowed') reportFailure('permission_denied', code);
      else if (!voiceCaptureTranscriptRef.current) reportFailure('not_heard', code);
    });
    const audioStartSub = speechModule.addListener('audiostart', (event: { uri?: unknown }) => {
      const uri = trackRecordingUri(event.uri);
      if (!uri) return;
      if (!captureIsCurrent() || captureToken !== voiceCaptureTokenRef.current) {
        deleteIfUnowned(uri);
        return;
      }
      voiceCaptureUriRef.current = uri;
    });
    const audioEndSub = speechModule.addListener('audioend', (event: { uri?: unknown }) => {
      const uri = trackRecordingUri(event.uri);
      if (!uri) return;
      if (!captureIsCurrent() || captureToken !== voiceCaptureTokenRef.current) {
        deleteIfUnowned(uri);
        return;
      }
      voiceCaptureUriRef.current = uri;
      const transcript = voiceCaptureTranscriptRef.current;
      if (transcript) updateVoiceDraft(Object.freeze({ uri, transcript }));
    });
    voiceListenersRef.current = [startSub, resultSub, endSub, errorSub, audioStartSub, audioEndSub]
      .filter(Boolean) as Removable[];

    const recordingClaim = claimRecordingAudio(() => {
      try { speechModule.abort(); } catch { /* recognizer is already stopped */ }
    }, 'dialogue-v2:voice-capture');
    voiceRecordingClaimRef.current = recordingClaim;
    const audioReady = await whenRecordingAudioReady(recordingClaim);
    if (!audioReady || !startIsCurrent() || voiceRecordingClaimRef.current !== recordingClaim) {
      if (voiceRecordingClaimRef.current === recordingClaim) invalidateCapture();
      return;
    }
    try {
      speechModule.start(buildSpeakingStartOptions({
        lang: dialogueLanguageMeta(studyTarget).speechLocale,
        targetText: promptText,
        interimResults: true,
        volumeMeter: false,
        persistRecording: true,
        holdToTalk: true,
        freeSpeech: true,
        serviceId: inventory?.serviceId,
      }));
    } catch (error: unknown) {
      reportFailure('unavailable', error instanceof Error ? error.message.slice(0, 80) : 'start_threw');
      invalidateCapture();
    }
  }, [
    clearFailure,
    reportFailure,
    cleanupPendingVoiceRecordings,
    deleteIfUnowned,
    invalidateCapture,
    promptText,
    releaseVoiceRecording,
    speechModule,
    studyTarget,
    updateStatus,
    updateVoiceDraft,
  ]);

  const play = useCallback((uri: string) => {
    if (!isLocalRecordingUri(uri) || !ownedVoiceUrisRef.current.has(uri) || !runtimeActiveRef.current) return;
    if (playingVoiceUri === uri) {
      stopVoiceMessagePlayback();
      return;
    }
    stopVoiceMessagePlayback();
    const playbackGeneration = voiceMessagePlaybackGenerationRef.current;
    let claim: SpokenAudioClaim | null = null;
    claim = claimSpokenAudio(() => {
      if (voiceMessageClaimRef.current === claim) stopVoiceMessagePlayback();
    }, 'dialogue-v2:voice-message-replay');
    if (!claim) return;
    voiceMessageClaimRef.current = claim;
    void whenSpokenAudioReady(claim).then((ready) => {
      if (!ready || !claim?.isCurrent() || !mountedRef.current || !runtimeActiveRef.current
        || playbackGeneration !== voiceMessagePlaybackGenerationRef.current) {
        claim?.release();
        if (voiceMessageClaimRef.current === claim) voiceMessageClaimRef.current = null;
        return;
      }
      let player: AudioPlayer;
      try {
        player = createAudioPlayer(uri);
      } catch {
        stopVoiceMessagePlayback();
        return;
      }
      if (!claim.isCurrent() || playbackGeneration !== voiceMessagePlaybackGenerationRef.current) {
        try { player.release(); } catch { /* player never became active */ }
        return;
      }
      voiceMessagePlayerRef.current = player;
      if (mountedRef.current) setPlayingVoiceUri(uri);
      voiceMessagePlaybackSubRef.current = player.addListener('playbackStatusUpdate', (event) => {
        if (voiceMessagePlayerRef.current !== player
          || playbackGeneration !== voiceMessagePlaybackGenerationRef.current) return;
        if (event.didJustFinish) stopVoiceMessagePlayback();
      });
      try { player.play(); } catch { stopVoiceMessagePlayback(); }
    });
  }, [playingVoiceUri, stopVoiceMessagePlayback]);

  const takeVoiceAttachment = useCallback((submittedText: string): DialogueVoiceAttachment | null => {
    const captureWasBusy = statusRef.current !== 'idle';
    invalidateCapture();
    if (captureWasBusy) {
      cleanupPendingVoiceRecordings();
      return null;
    }
    const attachment = buildDialogueVoiceAttachment(voiceDraftRef.current, submittedText);
    if (attachment) {
      sentVoiceUrisRef.current.add(attachment.uri);
      ownedVoiceUrisRef.current.add(attachment.uri);
      for (const uri of captureVoiceUrisRef.current) {
        if (uri !== attachment.uri) deleteIfUnowned(uri);
      }
      captureVoiceUrisRef.current.clear();
    } else {
      cleanupPendingVoiceRecordings();
    }
    voiceCaptureUriRef.current = null;
    voiceCaptureTranscriptRef.current = '';
    updateVoiceDraft(null);
    return attachment;
  }, [cleanupPendingVoiceRecordings, deleteIfUnowned, invalidateCapture, updateVoiceDraft]);

  useEffect(() => {
    if (!disabled) return;
    discard();
  }, [disabled, discard]);

  useEffect(() => {
    if (!runtimeActive) cleanupAllLocalAudio();
  }, [cleanupAllLocalAudio, runtimeActive]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupAllLocalAudio();
    };
  }, [cleanupAllLocalAudio]);

  return Object.freeze({
    status,
    failure,
    clearFailure,
    voiceDraft,
    playingVoiceUri,
    start,
    stop,
    discard,
    play,
    takeVoiceAttachment,
  });
}

export default useDialogueV2VoiceMessage;
