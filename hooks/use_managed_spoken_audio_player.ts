import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import type { AudioPlayer } from 'expo-audio';
import {
  claimSpokenAudio,
  type SpokenAudioClaim,
  whenSpokenAudioReady,
} from '../modules/audio/audio_runtime_arbiter';
import { noteSwallowed } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const SPOKEN_AUDIO_OPERATION_TIMEOUT_MS = 2_000;

type ManagedLocalAudioPlayback = Readonly<{
  requestId: number;
  state: 'loading' | 'playing' | 'idle' | 'error';
}>;

export function shouldStartManagedAudioRequest(input: Readonly<{
  requestId: number;
  startedRequestId: number | null;
  statusIsLoaded: boolean;
  playerIsLoaded: boolean;
}>): boolean {
  return input.startedRequestId !== input.requestId
    && input.statusIsLoaded
    && input.playerIsLoaded;
}

export function nextManagedLocalAudioPlaybackState(
  current: ManagedLocalAudioPlayback | null,
  status: Readonly<{
    requestId: number;
    startedRequestId: number | null;
    playing: boolean;
    didJustFinish: boolean;
  }>,
): ManagedLocalAudioPlayback | null {
  if (!current || current.requestId !== status.requestId) return current;
  const belongsToStartedRequest = status.startedRequestId === status.requestId;
  if (belongsToStartedRequest && status.playing) {
    return current.state === 'playing' ? current : { ...current, state: 'playing' };
  }
  if (belongsToStartedRequest && current.state === 'playing' && (!status.playing || status.didJustFinish)) {
    return { ...current, state: 'idle' };
  }
  return current;
}

export function useManagedAudioRequestStart(input: Readonly<{
  player: AudioPlayer;
  request: Readonly<{ requestId: number; rate: number }> | null;
  status: Readonly<{ isLoaded: boolean }>;
  managedAudio: Readonly<{ playFromStart(): Promise<boolean> }>;
  startedRequestIdRef: MutableRefObject<number | null>;
  onStartFailed(requestId: number): void;
}>): void {
  const {
    managedAudio,
    onStartFailed,
    player,
    request,
    startedRequestIdRef,
    status,
  } = input;

  useEffect(() => {
    // A replacement source can publish a new status object while isLoaded
    // remains true from the previous source. The event identity is therefore
    // part of this effect's trigger; requestId keeps repeated events idempotent.
    if (!request || !shouldStartManagedAudioRequest({
      requestId: request.requestId,
      startedRequestId: startedRequestIdRef.current,
      statusIsLoaded: status.isLoaded,
      playerIsLoaded: player.isLoaded,
    })) return;
    let cancelled = false;
    startedRequestIdRef.current = request.requestId;
    player.setPlaybackRate(request.rate, 'high');
    void managedAudio.playFromStart().then(
      (started) => {
        if (!cancelled && !started) onStartFailed(request.requestId);
      },
      (error: unknown) => {
        console.warn(`[V2-AUDIO] managed:start_rejected ${JSON.stringify({ requestId: request.requestId, error: error instanceof Error ? error.message : String(error) })}`); // guard-ok: defensive boundary prevents a permanently loading request
        if (!cancelled) onStartFailed(request.requestId);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [managedAudio, onStartFailed, player, request, startedRequestIdRef, status]);
}

async function settleSpokenAudioStep<T>(
  operation: Promise<T>,
  step: 'ready' | 'seek',
  seq: number,
): Promise<Readonly<{ settled: true; value: T }> | Readonly<{ settled: false }>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.warn(`[V2-AUDIO] managed:${step}_timeout ${JSON.stringify({ seq, afterMs: SPOKEN_AUDIO_OPERATION_TIMEOUT_MS })}`); // guard-ok: нативный promise завис; play после timeout запрещён
      resolve({ settled: false });
    }, SPOKEN_AUDIO_OPERATION_TIMEOUT_MS);
    (timeout as unknown as { unref?: () => void }).unref?.();
    operation.then(
      (value) => {
        clearTimeout(timeout);
        resolve({ settled: true, value });
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

/**
 * Gives an expo-audio hook player process-wide spoken-audio ownership.
 * useAudioPlayer owns native disposal; this hook owns only play/pause/session
 * lifetime and makes every delayed seek/play conditional on the same claim.
 */
export function useManagedSpokenAudioPlayer(
  player: AudioPlayer,
  didJustFinish = false,
): Readonly<{
  playFromStart(): Promise<boolean>;
  stop(reason?: unknown): void;
}> {
  const claimRef = useRef<SpokenAudioClaim | null>(null);
  const claimSeqRef = useRef(0);

  // зачем (владелец 19.10, КРИТИЧНО: «фраза звучит полсекунды и гаснет, „Звучит…“ висит»): СПЕРВА ЛОГИ.
  // Журнал показал, что аренда голоса снимается через ~1 с после старта, но не показал КТО. Каждое снятие
  // теперь пишет причину и стек вызова. Временная трассировка [V2-AUDIO-TRACE] — убрать после починки.
  const stop = useCallback((reasonArg?: unknown) => {
    // stop может прийти обработчиком нажатия (аргумент — событие): в журнал берём только строку.
    const reason = typeof reasonArg === 'string' ? reasonArg : 'external';
    const seq = ++claimSeqRef.current;
    console.warn(`[V2-AUDIO-TRACE] managed:stop ${JSON.stringify({ reason, hadClaim: claimRef.current !== null, seq, stack: new Error().stack?.split('\n').slice(2, 7).map((s) => s.trim()).join(' | ') })}`); // guard-ok: временная трассировка обрыва озвучки
    claimRef.current?.release();
    claimRef.current = null;
    try { player.pause(); } catch (swallowedError) { /* hook player may already be released */ noteSwallowed('use_managed_spoken_audio_player:catch_1', swallowedError); }
  }, [player]);

  const playFromStart = useCallback(async (): Promise<boolean> => {
    const seq = ++claimSeqRef.current;
    // зачем (владелец 19.10, КРИТИЧНО «фраза звучит полсекунды и гаснет»): журнал [V2-AUDIO-TRACE] показал двойной старт
    // одной фразы (эффект плеера срабатывает на устаревшем isLoaded и ещё раз после реальной загрузки). Второй старт
    // заново брал аренду — арбитр отзывал первую и звал её stop → player.pause(), и этот pause гасил уже идущую фразу
    // (1,488 с клип замолкал на 0,47 с). Если у плеера уже есть живая аренда — не перезахватываем, просто перематываем
    // и играем: владелец тот же, отзывать некого.
    const existing = claimRef.current;
    if (existing && existing.isCurrent()) {
      console.warn(`[V2-AUDIO-TRACE] managed:reuse_claim ${JSON.stringify({ seq })}`); // guard-ok: временная трассировка обрыва озвучки
      try {
        const seek = await settleSpokenAudioStep(player.seekTo(0), 'seek', seq);
        if (!seek.settled || !existing.isCurrent() || claimSeqRef.current !== seq) {
          if (claimSeqRef.current === seq) {
            existing.release();
            if (claimRef.current === existing) claimRef.current = null;
          }
          return false;
        }
        player.play();
        return true;
      } catch (error) {
        console.warn(`[V2-AUDIO-TRACE] managed:reuse_threw ${JSON.stringify({ seq, error: error instanceof Error ? error.message : String(error) })}`); // guard-ok: catch с причиной
        if (claimSeqRef.current === seq) {
          existing.release();
          if (claimRef.current === existing) claimRef.current = null;
        }
        return false;
      }
    }
    let claim: SpokenAudioClaim | null = null;
    claim = claimSpokenAudio(() => {
      console.warn(`[V2-AUDIO-TRACE] managed:revoked ${JSON.stringify({ seq, stack: new Error().stack?.split('\n').slice(2, 8).map((s) => s.trim()).join(' | ') })}`); // guard-ok: временная трассировка обрыва озвучки
      try { player.pause(); } catch (swallowedError) { /* hook player may already be released */ noteSwallowed('use_managed_spoken_audio_player:catch_2', swallowedError); }
      if (claimRef.current === claim) claimRef.current = null;
    }, 'managed-spoken-player');
    console.warn(`[V2-AUDIO-TRACE] managed:play_from_start ${JSON.stringify({ seq, claimed: claim !== null, playing: player.playing, isLoaded: player.isLoaded, currentTime: player.currentTime, duration: player.duration })}`); // guard-ok: временная трассировка обрыва озвучки
    if (!claim) return false;
    claimRef.current = claim;

    let ready: Awaited<ReturnType<typeof settleSpokenAudioStep<boolean>>>;
    try {
      ready = await settleSpokenAudioStep(whenSpokenAudioReady(claim), 'ready', seq);
    } catch (error: unknown) {
      console.warn(`[V2-AUDIO] managed:ready_rejected ${JSON.stringify({ seq, error: error instanceof Error ? error.message : String(error) })}`); // guard-ok: rejected native readiness must release ownership and unblock the caller
      if (claimSeqRef.current === seq) {
        claim.release();
        if (claimRef.current === claim) claimRef.current = null;
      }
      return false;
    }
    if (!ready.settled || !ready.value || !claim.isCurrent() || claimSeqRef.current !== seq) {
      console.warn(`[V2-AUDIO-TRACE] managed:not_ready ${JSON.stringify({ seq, ready: ready.settled ? ready.value : false, current: claim.isCurrent(), latest: claimSeqRef.current === seq })}`); // guard-ok: ранний выход
      if (claimSeqRef.current === seq) {
        claim.release();
        if (claimRef.current === claim) claimRef.current = null;
      }
      return false;
    }
    try {
      const seek = await settleSpokenAudioStep(player.seekTo(0), 'seek', seq);
      if (!seek.settled || !claim.isCurrent() || claimSeqRef.current !== seq) {
        console.warn(`[V2-AUDIO-TRACE] managed:superseded_after_seek ${JSON.stringify({ seq })}`); // guard-ok: ранний выход
        // зачем (аудит 2026-09-15): здесь был выход без release(). Если claim
        // потерял актуальность не через ревокацию арбитром (а, например, по
        // гонке с собственным stop()), аренда оставалась висеть и глушила звук
        // во всём приложении. release() идемпотентен — лишний вызов безвреден,
        // пропущенный стоит пользователю тишины до перезапуска.
        if (claimSeqRef.current === seq) {
          claim.release();
          if (claimRef.current === claim) claimRef.current = null;
        }
        return false;
      }
      player.play();
      console.warn(`[V2-AUDIO-TRACE] managed:played ${JSON.stringify({ seq, duration: player.duration })}`); // guard-ok: временная трассировка обрыва озвучки
      return true;
    } catch (error) {
      console.warn(`[V2-AUDIO-TRACE] managed:play_threw ${JSON.stringify({ seq, error: error instanceof Error ? error.message : String(error) })}`); // guard-ok: catch с причиной
      // A newer invocation may already be using the same live claim. A late
      // rejection from this operation must not revoke that newer playback.
      if (claimSeqRef.current === seq) {
        claim.release();
        if (claimRef.current === claim) claimRef.current = null;
      }
      return false;
    }
  }, [player]);

  useEffect(() => {
    console.warn(`[V2-AUDIO-TRACE] managed:did_just_finish ${JSON.stringify({ didJustFinish, hadClaim: claimRef.current !== null, seq: claimSeqRef.current, currentTime: player.currentTime, duration: player.duration })}`); // guard-ok: временная трассировка обрыва озвучки
    if (!didJustFinish) return;
    claimSeqRef.current += 1;
    claimRef.current?.release();
    claimRef.current = null;
  }, [didJustFinish, player]);

  useEffect(() => () => stop('unmount_or_player_change'), [stop]);

  return useMemo(() => ({ playFromStart, stop }), [playFromStart, stop]);
}
