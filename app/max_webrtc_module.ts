// Guarded-loader нативного стека MAX-звонка: react-native-webrtc +
// react-native-incall-manager (образец — personal_plan_speech_module.ts).
//
// Зачем guard: оба пакета — нативные модули, и в бинарнике без них (OTA-апдейт
// поверх старого билда, dev-клиент без prebuild, jest) require обязан не
// уронить приложение. Пакеты сейчас ОТСУТСТВУЮТ в package.json — поэтому
// require зовётся с ИМЕНЕМ В ПЕРЕМЕННОЙ: metro не может статически резолвить
// такой вызов и не пытается включить несуществующий пакет в бандл на этапе
// сборки; в рантайме отсутствие модуля даёт catch → null. После добавления
// зависимостей поведение не меняется — require просто начнёт их находить.
//
// Ноль React / нативных top-level импортов: `null` из loadMaxVoiceNative()
// означает «MAX-звонок на этом бинарнике невозможен» — вход скрывается
// (max_voice_flags.isMaxVoiceEntryVisible), остаётся текст/half-duplex.

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
  localDescription?: RtcSessionDescriptionLike | null;
  oniceconnectionstatechange?: (() => void) | null;
  ontrack?: ((event: { track: MediaStreamTrackLike; streams?: MediaStreamLike[] }) => void) | null;
}

/** react-native-incall-manager: владение аудиосессией на время «звонка». */
export interface InCallManagerLike {
  start(options?: Record<string, unknown>): void;
  stop(): void;
  setSpeakerphoneOn?(on: boolean): void;
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

// Имена пакетов держим в константах-строках и передаём в require через
// переменную — это и есть приём «metro не резолвит статически» (см. шапку).
const WEBRTC_PACKAGE = 'react-native-webrtc';
const INCALL_PACKAGE = 'react-native-incall-manager';

function guardedRequire(packageName: string): Record<string, unknown> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dynamicRequire = require as unknown as (name: string) => unknown;
    const mod = dynamicRequire(packageName);
    if (mod === null || typeof mod !== 'object') return null;
    return mod as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Вернуть нативный стек MAX-звонка или `null`, когда он недоступен на этом
 * бинарнике/устройстве. Вызывающие ОБЯЗАНЫ трактовать `null` как «звонок
 * невозможен» и прятать вход — никогда не предполагать наличие.
 */
export function loadMaxVoiceNative(): MaxVoiceNativeModule | null {
  const webrtc = guardedRequire(WEBRTC_PACKAGE);
  if (!webrtc) return null;
  const RTCPeerConnection = webrtc.RTCPeerConnection;
  const mediaDevices = webrtc.mediaDevices as
    | { getUserMedia?: unknown }
    | undefined;
  // Guard против стаба без нужных методов (пакет есть, нативной части нет).
  if (typeof RTCPeerConnection !== 'function') return null;
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') return null;

  const incall = guardedRequire(INCALL_PACKAGE);
  if (!incall) return null;
  // incall-manager экспортирует инстанс дефолтом; старые сборки — напрямую.
  const InCallManager = (incall.default ?? incall) as InCallManagerLike | null;
  if (!InCallManager || typeof InCallManager.start !== 'function') return null;

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
