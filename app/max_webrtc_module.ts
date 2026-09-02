// Guarded-loader нативного стека MAX-звонка: react-native-webrtc +
// react-native-incall-manager.
//
// Зачем guard: оба пакета — нативные модули, и в бинарнике без них (OTA-апдейт
// поверх старого билда, dev-клиент без prebuild, jest) require обязан не
// уронить приложение. Пакеты сейчас ОТСУТСТВУЮТ в package.json — поэтому
// Оба пакета теперь входят в package.json и нативную сборку. Metro обязан
// видеть строковые литералы: dynamic require(packageName) падает в рантайме
// как «unknown module», даже когда pod уже встроен в приложение. try/catch
// остаётся защитой для Jest и старого OTA-бинарника.
//
// Ноль React / нативных top-level импортов: `null` из loadMaxVoiceNative()
// означает «MAX-звонок на этом бинарнике невозможен» — вход скрывается
// (max_voice_flags.isMaxVoiceEntryVisible), остаётся текст/half-duplex.

import { maxConnectTrace } from './max_call_connect_trace';

/** Аудио-трек (локальный микрофон или remote-голос ИИ). */
export interface MediaStreamTrackLike {
  /** Мьют без остановки трека: enabled=false шлёт тишину (barge-in, grace). */
  enabled: boolean;
  stop(): void;
  kind?: string;
}

export interface MediaStreamLike {
  getTracks(): MediaStreamTrackLike[];
  getAudioTracks?(): MediaStreamTrackLike[];
}

export interface RtcSessionDescriptionLike {
  type: string;
  sdp: string;
}

/** Data channel (события Realtime API ходят JSON-строками). */
export interface RtcDataChannelLike {
  readyState?: string;
  send(data: string): void;
  close(): void;
  onopen?: (() => void) | null;
  onmessage?: ((event: { data: unknown }) => void) | null;
  onclose?: (() => void) | null;
}

/** Структурный минимум RTCPeerConnection, который использует max_call_client. */
export interface RtcPeerConnectionLike {
  createOffer(options?: Record<string, unknown>): Promise<RtcSessionDescriptionLike>;
  setLocalDescription(desc: RtcSessionDescriptionLike): Promise<unknown>;
  setRemoteDescription(desc: RtcSessionDescriptionLike): Promise<unknown>;
  addTrack(track: MediaStreamTrackLike, stream?: MediaStreamLike): unknown;
  createDataChannel(label: string, options?: Record<string, unknown>): RtcDataChannelLike;
  getStats(): Promise<unknown>;
  close(): void;
  iceConnectionState?: string;
  iceGatheringState?: string;
  localDescription?: RtcSessionDescriptionLike | null;
  oniceconnectionstatechange?: (() => void) | null;
  onicegatheringstatechange?: (() => void) | null;
  ontrack?: ((event: { track: MediaStreamTrackLike; streams?: MediaStreamLike[] }) => void) | null;
}

/** react-native-incall-manager: владение аудиосессией на время «звонка». */
export interface InCallManagerLike {
  start(options?: Record<string, unknown>): void;
  stop(): void;
  setSpeakerphoneOn?(on: boolean): void;
  /** iOS: удерживать громкий динамик после последующих смен AVAudioSession. */
  setForceSpeakerphoneOn?(on: boolean | null): void;
  setKeepScreenOn?(on: boolean): void;
}

/** Всё нативное, что нужно MAX-звонку, одним объектом (инжектится в client). */
export interface MaxVoiceNativeModule {
  RTCPeerConnection: new (config?: Record<string, unknown>) => RtcPeerConnectionLike;
  mediaDevices: {
    getUserMedia(constraints: Record<string, unknown>): Promise<MediaStreamLike>;
  };
  InCallManager: InCallManagerLike;
}

function guardedRequireWebRtc(): Record<string, unknown> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: unknown = require('react-native-webrtc');
    if (mod === null || typeof mod !== 'object') {
      // зачем: без этой строки «нет нативного WebRTC» было неотличимо от
      // «пакет есть, но отдал не объект» — оба выхода молчали одинаково.
      maxConnectTrace('native.webrtc.bad_export', { typeofMod: typeof mod });
      return null;
    }
    return mod as Record<string, unknown>;
  } catch (e) {
    // ЗАПРЕТ немого catch: именно пустой catch месяцами прятал причину.
    maxConnectTrace('native.webrtc.require_threw', {
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

function guardedRequireInCall(): Record<string, unknown> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: unknown = require('react-native-incall-manager');
    if (mod === null || typeof mod !== 'object') {
      maxConnectTrace('native.incall.bad_export', { typeofMod: typeof mod });
      return null;
    }
    return mod as Record<string, unknown>;
  } catch (e) {
    maxConnectTrace('native.incall.require_threw', {
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/**
 * Вернуть нативный стек MAX-звонка или `null`, когда он недоступен на этом
 * бинарнике/устройстве. Вызывающие ОБЯЗАНЫ трактовать `null` как «звонок
 * невозможен» и прятать вход — никогда не предполагать наличие.
 */
export function loadMaxVoiceNative(): MaxVoiceNativeModule | null {
  const webrtc = guardedRequireWebRtc();
  if (!webrtc) return null; // причина уже записана внутри guardedRequireWebRtc
  const RTCPeerConnection = webrtc.RTCPeerConnection;
  const mediaDevices = webrtc.mediaDevices as
    | { getUserMedia?: unknown }
    | undefined;
  // Guard против стаба без нужных методов (пакет есть, нативной части нет).
  // зачем: раньше эти три выхода были немыми и неразличимыми — «звонок
  // невозможен» приходило без ответа на вопрос ПОЧЕМУ именно.
  if (typeof RTCPeerConnection !== 'function') {
    maxConnectTrace('native.webrtc.no_peer_connection', {
      typeofRTCPeerConnection: typeof RTCPeerConnection,
      exportKeys: Object.keys(webrtc).slice(0, 20).join(','),
    });
    return null;
  }
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    maxConnectTrace('native.webrtc.no_get_user_media', {
      hasMediaDevices: Boolean(mediaDevices),
      typeofGetUserMedia: typeof mediaDevices?.getUserMedia,
    });
    return null;
  }

  const incall = guardedRequireInCall();
  if (!incall) return null; // причина уже записана внутри guardedRequireInCall
  // incall-manager экспортирует инстанс дефолтом; старые сборки — напрямую.
  const InCallManager = (incall.default ?? incall) as InCallManagerLike | null;
  if (!InCallManager || typeof InCallManager.start !== 'function') {
    maxConnectTrace('native.incall.no_start', {
      hasInstance: Boolean(InCallManager),
      typeofStart: typeof InCallManager?.start,
    });
    return null;
  }

  return {
    RTCPeerConnection: RTCPeerConnection as MaxVoiceNativeModule['RTCPeerConnection'],
    mediaDevices: mediaDevices as MaxVoiceNativeModule['mediaDevices'],
    InCallManager,
  };
}

/** Быстрый предикат для гейтов видимости входа (max_voice_flags). */
export function isMaxVoiceNativeAvailable(): boolean {
  return loadMaxVoiceNative() !== null;
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
