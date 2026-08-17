import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { getScenarioById, dialogScenarioTitle } from './ai_dialog_scenarios';
import { loadMaxVoiceNative } from './max_webrtc_module';
import {
  createMaxCallClient,
  sessionEndEnrichment,
  type MaxCallClient,
  type MaxVoiceMintRequest,
  type MaxVoiceMintResponse,
} from './max_call_client';
import {
  extractPersonaName,
  guessLearnerCefr,
  maxVoiceCallable,
  performMaxVoiceMint,
  releaseUnusedMint,
  tutorSceneBlock,
  tutorSceneItems,
  type MaxCallParams,
} from './max_call_mint_request';
import { createTutorToolRunner, type TutorToolRunner } from './max_call_tutor_tools';
import {
  abandonPremint,
  claimPremint,
  enqueueRelease,
  isPremintUsable,
  mintAfterRelease,
  premintKey,
} from './max_call_premint';
import { createHintTimer, type HintTimer } from './max_call_hint_timer';
import { createDefaultMaxCallSfx, type MaxCallSfx } from './max_call_sfx';
import { UI_SFX_AUDIO_MODE } from './audio_playback_mode';
import { setManagedAudioMode } from './audio_session_coordinator';
import {
  MAX_CALL_UI_INITIAL,
  reduceMaxCallUi,
  type MaxCallUiEvent,
  type MaxCallUiPhase,
  type MaxCallUiState,
} from './max_call_ui_state';
import { createTranscriptBuffer, TRANSCRIPT_FLUSH_MS, type TranscriptTurn } from './max_call_transcript';
import {
  computeCallDeadlines,
  formatMinutesPill,
  pillGranularity,
  pillTone,
} from './max_call_quota_view';
import { MaxCallHalo, type MaxCallHaloRef } from './max_call_halo';
import { setLastMaxCallResult } from './max_voice_review';
import { maxVoiceFailureMessage } from './max_voice_error';

/**
 * Экран MAX-звонка (спека, раздел 6). Экран ТОНКИЙ: вся хореография транспорта
 * (минт ∥ offer, data channel, heartbeat, teardown) — в max_call_client;
 * turn-taking — в max_call_ui_state; транскрипт — в max_call_transcript.
 * Здесь только композиция (шапка / сцена / каптионы / панель) и подписки:
 * транскрипт приходит одним setState раз в 250мс, уровни звука — императивно
 * в ореол/эквалайзер мимо React, пилюля минут — отдельный memo-компонент со
 * СВОИМ интервалом, чтобы её секундный тик не ре-рендерил сцену.
 */

/** SDP-обмен идёт напрямую в OpenAI с ephemeral-токеном минта (спека §4). */
const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
/** Прямой SDP POST не может оставлять экран в вечном connecting. */
const SDP_HTTP_TIMEOUT_MS = 20_000;
/** Confirm на «завершить» — только в первые 30с (случайный тап при старте). */
/** Blur/шторка: grace 12с с мьютом, потом честное завершение с сеттлментом. */
const BLUR_GRACE_MS = 12_000;
/** Баннер обрыва — только если реконнект длится дольше этого (секундные блики молчат). */
const RECONNECT_BANNER_DELAY_MS = 1_500;
/** Серверные константы дедлайнов (спека §3): [WRAP_UP] за 75с, teardown +20с. */
const WRAP_UP_LEAD_SEC = 75;
const GRACE_TAIL_SEC = 20;
/**
 * Учитель (format 'tutor'): вместо [WRAP_UP] — trusted-заметки времени. Учитель
 * сам предупреждает ученика и сам прощается (владелец 2026-08-16: «знает лимит,
 * предупреждает и заканчивает сессию сам — не обрывая, а прощаясь»). Префикс
 * совпадает с TUTOR_TIME_NOTE_PREFIX в functions/src/max_voice_prompt.ts.
 */
const TUTOR_TIME_NOTE_PREFIX = 'TIME NOTE:';
const TUTOR_TWO_MIN_LEAD_SEC = 120;
const TUTOR_GOODBYE_LEAD_SEC = 45;
/** Заметка ждёт паузы учителя не дольше этого — иначе уходит как есть. */
const TUTOR_NOTE_DEFER_MAX_MS = 15_000;
/** Тёплый тон голоса ИИ — един для ореола и баров эквалайзера. */
const AI_WARM_COLOR = '#F2A45C';

// Callable-обвязка и сборка промпт-полей минта — в max_call_mint_request
// (общие с пре-экраном: заготовка минта собирается ТЕМ ЖЕ кодом).

/** Остаток дневных секунд из limits минта (сервер — единственный источник). */
function dayRemainingFromLimits(limits: Record<string, unknown> | undefined): number | null {
  if (!limits) return null;
  const v = limits.dayRemainingSec ?? limits.day_remaining_sec;
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : null;
}

async function exchangeSdp(offerSdp: string, clientSecret: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SDP_HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(REALTIME_CALLS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offerSdp,
      signal: controller.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      if (__DEV__) console.warn('[MAX Voice] SDP exchange failed', res.status, body.slice(0, 300));
      throw new Error(`sdp_exchange_http_${res.status}`);
    }
    return body;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('server_timeout');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Подсказки при тишине (спека §1 max_call_hint_timer): инструкции — по формату
// HINTS раздела 7 (сервер обещает модели «system note asking to help»).

const HINT_FIRST_INSTRUCTIONS =
  'System note: the learner has been silent for a while. Offer a gentle in-character hint that ' +
  "models a possible answer (for example: \"You could say: I'd like a large one.\"). One short, " +
  'complete sentence, then hand the turn back.';
const HINT_SECOND_INSTRUCTIONS =
  'System note: the learner is still silent. Ask a simple either-or question with two short ' +
  'options, warmly and in character. Keep it complete and short.';
/** Вторая подсказка — через +10с после первой (спека §1). */
const HINT_SECOND_DELAY_SEC = 10;

/** Порог тишины из limits минта: скаляр или per-CEFR объект; дефолт — по CEFR. */
function hintDelayFromLimits(limits: Record<string, unknown> | undefined, cefr?: string): number {
  const fallback = cefr === 'B1' || cefr === 'B2' ? 9 : 8;
  const raw = limits?.hintDelaySec;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (raw !== null && typeof raw === 'object' && typeof cefr === 'string') {
    const v = (raw as Record<string, unknown>)[cefr];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }
  return fallback;
}

function hintMaxFromLimits(limits: Record<string, unknown> | undefined): number {
  const raw = limits?.hintMaxPerSession;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 4;
}

// ---------------------------------------------------------------------------
// Пилюля минут: отдельный memo-компонент с СОБСТВЕННЫМ интервалом. Секундный
// тик остатка не должен ре-рендерить сцену звонка — setState здесь происходит
// только когда видимый текст/тон реально меняются (минутная гранулярность
// почти весь звонок, посекундная — последние 60с; см. max_call_quota_view).

const MinutesPill = memo(function MinutesPill({
  hardAtMs,
  minutesWord,
  colors,
  fontSize,
  onLowMinutes,
}: {
  hardAtMs: number | null;
  minutesWord: string;
  colors: { normal: string; amber: string; red: string };
  fontSize: number;
  /** Однократный колбэк перехода в red-зону (≤60с): haptic low-minutes. */
  onLowMinutes?: () => void;
}) {
  const [label, setLabel] = useState('');
  const [tone, setTone] = useState<'normal' | 'amber' | 'red'>('normal');
  const lowFiredRef = useRef(false);
  const onLowMinutesRef = useRef(onLowMinutes);
  onLowMinutesRef.current = onLowMinutes;

  useEffect(() => {
    if (hardAtMs === null) {
      setLabel('');
      return;
    }
    const tick = () => {
      const remainingSec = Math.max(0, Math.round((hardAtMs - Date.now()) / 1000));
      // Формула счёта минут — ТОЛЬКО в formatMinutesPill (каноника модуля);
      // пилюля передаёт локализованное слово, а не дублирует Math.ceil.
      const next = formatMinutesPill(remainingSec, pillGranularity(remainingSec), minutesWord);
      setLabel((prev) => (prev === next ? prev : next));
      const nextTone = pillTone(remainingSec);
      if (nextTone === 'red' && !lowFiredRef.current) {
        lowFiredRef.current = true;
        onLowMinutesRef.current?.();
      }
      setTone((prev) => (prev === nextTone ? prev : nextTone));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hardAtMs, minutesWord]);

  if (label === '') return null;
  const color = tone === 'red' ? colors.red : tone === 'amber' ? colors.amber : colors.normal;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.18)',
      }}
    >
      <Text style={{ color, fontSize, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </View>
  );
});

// ---------------------------------------------------------------------------

function haloColorFor(phase: MaxCallUiPhase, t: { accent: string; textMuted: string; textGhost: string; gold: string }): string {
  switch (phase) {
    case 'connected_greeting':
    case 'ai_speaking':
      return AI_WARM_COLOR;
    case 'listening':
    case 'barge_in':
      return t.accent;
    case 'wrapping_up':
      return t.gold;
    case 'reconnecting':
    case 'ended':
    case 'failed':
      return t.textGhost;
    case 'connecting':
    case 'thinking':
    default:
      return t.textMuted;
  }
}

function phaseHint(phase: MaxCallUiPhase, lang: Lang): string {
  switch (phase) {
    case 'connecting':
      // Экран уже живой и микрофон захватывается немедленно; техническую
      // установку WebRTC не выдаём за отдельный пользовательский этап.
      return '';
    case 'listening':
      return triLang(lang, {
        ru: 'Слушаю…',
        uk: 'Слухаю…',
        es: 'Te escucho…',
        'pt-BR': 'Estou ouvindo…',
        vi: 'Đang nghe…',
        id: 'Mendengarkan…',
        tr: 'Dinliyorum…',
        pl: 'Słucham…',
      });
    case 'thinking':
      return triLang(lang, {
        ru: 'Собеседник думает…',
        uk: 'Співрозмовник думає…',
        es: 'Está pensando…',
        'pt-BR': 'Está pensando…',
        vi: 'Đang suy nghĩ…',
        id: 'Sedang berpikir…',
        tr: 'Düşünüyor…',
        pl: 'Zastanawia się…',
      });
    case 'reconnecting':
      return triLang(lang, {
        ru: 'Восстанавливаем связь…',
        uk: 'Відновлюємо зв’язок…',
        es: 'Recuperando la conexión…',
        'pt-BR': 'Restaurando a conexão…',
        vi: 'Đang khôi phục kết nối…',
        id: 'Memulihkan koneksi…',
        tr: 'Bağlantı yeniden kuruluyor…',
        pl: 'Przywracanie połączenia…',
      });
    case 'wrapping_up':
      return triLang(lang, {
        ru: 'Завершаем разговор',
        uk: 'Завершуємо розмову',
        es: 'Terminando la conversación',
        'pt-BR': 'Encerrando a conversa',
        vi: 'Đang kết thúc cuộc trò chuyện',
        id: 'Mengakhiri percakapan',
        tr: 'Konuşma bitiriliyor',
        pl: 'Kończymy rozmowę',
      });
    default:
      return '';
  }
}

export default function MaxCallSession() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const params = useLocalSearchParams<{ format?: string; scenarioId?: string; cefr?: string; devMode?: string }>();

  const format: MaxVoiceMintRequest['format'] =
    params.format === 'companion' || params.format === 'trial' || params.format === 'tutor'
      ? params.format
      : 'scenario';
  const isTutor = format === 'tutor';
  const scenarioId = String(params.scenarioId ?? 'coffee');
  const cefr = typeof params.cefr === 'string' && params.cefr !== '' ? params.cefr : undefined;
  const devMode = params.devMode === '1';

  const scenario = useMemo(
    () => (format === 'companion' || format === 'tutor' ? undefined : getScenarioById(scenarioId)),
    [format, scenarioId],
  );
  // Учитель: имя приходит из минта (конфиг админки); до него — дефолт сервера.
  const [tutorName, setTutorName] = useState('Max');
  // Активная сцена урока (учитель вызвал start_scene) — подпись в шапке.
  const [tutorSceneLabel, setTutorSceneLabel] = useState('');
  const personaName = useMemo(() => {
    if (isTutor) return tutorName;
    const fromScenario = extractPersonaName(scenario?.persona);
    if (fromScenario !== '') return fromScenario;
    // Companion-режим: постоянный собеседник (имя совпадает с ai_companion).
    return 'Alex';
  }, [isTutor, tutorName, scenario?.persona]);
  const scenarioChip = useMemo(() => {
    if (isTutor) {
      return tutorSceneLabel !== ''
        ? tutorSceneLabel
        : triLang(lang, {
            ru: 'Учитель', uk: 'Вчитель', es: 'Profesor', 'pt-BR': 'Professor',
            vi: 'Giáo viên', id: 'Guru', tr: 'Öğretmen', pl: 'Nauczyciel',
          });
    }
    return scenario ? dialogScenarioTitle(scenario, lang) : '';
  }, [isTutor, tutorSceneLabel, scenario, lang]);

  const [uiState, setUiState] = useState<MaxCallUiState>(MAX_CALL_UI_INITIAL);
  const uiPhaseRef = useRef<MaxCallUiPhase>('connecting');
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [ccEnabled, setCcEnabled] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hardAtMs, setHardAtMs] = useState<number | null>(null);
  // зачем: владелец 2026-08-16 — «посреди разговора появилось "обрыв", потом
  // продолжилось». ICE на мобильной сети роняет 'disconnected' и на секундные
  // провалы, которые тут же проходят; баннер «Восстанавливаем связь…» на такой
  // блик — лишняя тревога (FaceTime молчит про короткие провалы). Показываем
  // его, только если реконнект длится дольше RECONNECT_BANNER_DELAY_MS.
  const [reconnectShown, setReconnectShown] = useState(false);

  const clientRef = useRef<MaxCallClient | null>(null);
  const bufferRef = useRef(createTranscriptBuffer(() => Date.now()));
  const haloRef = useRef<MaxCallHaloRef>(null);
  // Таймер подсказок создаётся в onCallActivated из limits минта (per-CEFR
  // порог, кэп на сессию); до active — null, подсказки невозможны.
  const hintTimerRef = useRef<HintTimer | null>(null);
  // Инструменты учителя (сцены/домашка/тема/end_call) — исполняются локально.
  const tutorRunnerRef = useRef<TutorToolRunner | null>(null);
  const tutorNoteTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Заметка времени, отложенная до паузы учителя (см. sendTutorNoteWhenQuiet).
  const pendingTutorNoteRef = useRef<{ text: string; deadlineMs: number } | null>(null);
  // Сигналы границ звонка: живут в ref, чтобы пилюля/эффекты могли дёргать
  // haptics без пересоздания клиента.
  const sfxRef = useRef<MaxCallSfx | null>(null);
  if (sfxRef.current === null) sfxRef.current = createDefaultMaxCallSfx();
  const lastAssistantItemRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  // Секунды речи юзера по серверным speech_started/stopped — вход метрик разбора.
  const speechStartedAtRef = useRef<number | null>(null);
  const speechAccumSecRef = useRef(0);
  const wrapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  // Владелец живой ауры читается из ref в 250мс-поллинге уровней — колбэк
  // onLevels создаётся один раз и не должен зависеть от React-стейта.
  const haloOwnerRef = useRef(uiState.eqOwner);
  haloOwnerRef.current = uiState.eqOwner;

  // Причина завершения для разбора (устанавливается до end()).
  const endReasonRef = useRef<'completed' | 'capped' | 'dropped' | 'background' | 'failed'>('completed');

  // -------------------------------------------------------------------------
  // Жизненный цикл клиента: собрать deps → start; teardown идемпотентен.
  useEffect(() => {
    const native = loadMaxVoiceNative();
    if (!native) {
      // OTA поверх бинарника без webrtc: вход должен был быть скрыт гейтом, но
      // прямой deeplink обязан деградировать честно, без краша.
      if (__DEV__) console.warn('[MAX Voice] native_unavailable: rebuild the iOS development client');
      // Заготовку пре-экрана никто не заберёт — вернуть резерв серверу.
      abandonPremint(premintKey({ format, scenarioId, cefr, devMode }), releaseUnusedMint);
      setUiState((prev) => reduceMaxCallUi(prev, { type: 'fail', reason: 'native_unavailable' }));
      return;
    }

    const heartbeatCallable = maxVoiceCallable<unknown>('maxVoiceHeartbeat');
    const endCallable = maxVoiceCallable<unknown>('maxVoiceSessionEnd');
    const callParams: MaxCallParams = { format, scenarioId, cefr, devMode, interfaceLang: lang };
    const key = premintKey(callParams);
    if (isTutor) {
      // Тот же каталог, что ушёл в промпт (уровень + день): id совпадают.
      const tutorCefr = cefr ?? guessLearnerCefr();
      tutorRunnerRef.current = createTutorToolRunner({
        scenes: tutorSceneItems(tutorCefr, Math.floor(Date.now() / 86_400_000)),
        sceneBlock: tutorSceneBlock,
        onSceneChange: (scene) => {
          const sc = scene ? getScenarioById(scene.id) : undefined;
          setTutorSceneLabel(sc ? dialogScenarioTitle(sc, lang) : '');
        },
        onEndCall: () => {
          // Учитель попрощался: даём аудио доиграть и завершаем сами — ученику
          // не нужно вешать трубку.
          endReasonRef.current = 'completed';
          clientRef.current?.endAfterAudio('completed');
        },
      });
    }

    // зачем: владелец 2026-08-16 — соединение должно быть мгновенным. Пре-экран
    // уже запустил минт (max_call_premint); здесь мы его ЗАБИРАЕМ, а свежий
    // минт делаем только если заготовки нет (deeplink, ретрай), она протухла
    // (токен на исходе) или упала. Протухшую сначала отпускаем на сервере,
    // иначе свежий резерв упрётся в voice_session_active.
    const mintFirst = async (req: MaxVoiceMintRequest): Promise<MaxVoiceMintResponse> => {
      const entry = claimPremint(key);
      if (entry) {
        try {
          const ready = await entry.promise;
          if (isPremintUsable(ready, entry.createdAtMs, Date.now())) return ready;
          enqueueRelease(() => releaseUnusedMint(ready));
        } catch {
          // Заготовка упала — одна честная попытка свежего минта ниже.
        }
      }
      return mintAfterRelease(() => performMaxVoiceMint(callParams, req));
    };

    // Секунды речи с учётом незакрытого сегмента: end может прилететь прямо
    // во время реплики юзера, и её хвост не должен теряться из XP-заявки.
    const speechSecNow = (): number =>
      speechAccumSecRef.current +
      (speechStartedAtRef.current !== null ? (Date.now() - speechStartedAtRef.current) / 1000 : 0);

    const client = createMaxCallClient({
      native,
      // Промпт-поля (personaName/personaRole/scenarioBlock/memoryBlock/srsCount)
      // добавляются к КАЖДОМУ минту, включая reconnect-ре-минты: сервер строит
      // instructions заново и на переносе резерва.
      mint: (req) => (req.reconnectOf ? performMaxVoiceMint(callParams, req) : mintFirst(req)),
      heartbeat: (req) => heartbeatCallable(req as unknown as Record<string, unknown>),
      // Обогащение сеттлмента (спека §2 maxVoiceSessionEnd): секунды речи,
      // реплики/слова из истории транскрипта, cefr/scenarioId/канал — всё это
      // знает только слой сессии, транспорт шлёт базу.
      end: (req) =>
        endCallable({
          ...req,
          ...sessionEndEnrichment(bufferRef.current.history()),
          clientSpeechSec: Math.round(speechSecNow()),
          ...(cefr !== undefined ? { cefr } : {}),
          ...(format === 'companion' ? {} : { scenarioId }),
          channel: 'realtime',
        } as unknown as Record<string, unknown>),
      exchangeSdp,
      // InCallManager.stop() освобождает native voiceChat session, после чего
      // возвращаем общий expo-audio coordinator в обычный UI-режим.
      restoreAudioSession: () => setManagedAudioMode(UI_SFX_AUDIO_MODE),
      reconnectHistory: () => bufferRef.current.history(),
      sfx: sfxRef.current ?? undefined,
      now: () => Date.now(),
      onToolCall: (call) => {
        const runner = tutorRunnerRef.current;
        if (!runner) return;
        const result = runner.handle(call.name, call.args);
        clientRef.current?.sendToolResult(call.callId, result.output, { respond: result.respond });
      },
      onUiEvent: handleUiEvent,
      onTranscriptDelta: (event) => {
        const buffer = bufferRef.current;
        if (event.kind === 'assistant_delta') {
          lastAssistantItemRef.current = event.itemId;
          buffer.pushAssistantDelta(event.itemId, event.delta);
        } else if (event.kind === 'assistant_done') {
          buffer.completeAssistantItem(event.itemId);
        } else {
          buffer.pushUserFinal(event.text);
        }
      },
      onLevels: (sample) => {
        // Императивный путь мимо React: единая аура реагирует на того, кто
        // говорит сейчас — микрофон пользователя или remote-аудио MAX.
        const owner = haloOwnerRef.current;
        const level = owner === 'ai' ? sample.remote : owner === 'user' ? sample.mic : null;
        haloRef.current?.setMicLevel(level);
      },
      onPhase: (phase) => {
        if (phase === 'active' && startedAtRef.current === null) {
          onCallActivated();
        }
      },
    });
    clientRef.current = client;
    void client.start({
      format,
      scenarioId: format === 'companion' ? undefined : scenarioId,
      cefr,
      ...(devMode ? { devMode: true } : {}),
    });

    // Один setState раз в 250мс: дельты копятся в буфере, наружу — снапшот.
    const flushId = setInterval(() => {
      const snapshot = bufferRef.current.flushIfDue();
      if (snapshot) setTurns(snapshot);
    }, TRANSCRIPT_FLUSH_MS);

    return () => {
      clearInterval(flushId);
      if (wrapTimerRef.current !== null) clearTimeout(wrapTimerRef.current);
      if (teardownTimerRef.current !== null) clearTimeout(teardownTimerRef.current);
      if (graceTimerRef.current !== null) clearTimeout(graceTimerRef.current);
      for (const id of tutorNoteTimersRef.current) clearTimeout(id);
      tutorNoteTimersRef.current = [];
      // Уход с экрана = завершение звонка (идемпотентно, сеттлмент — внутри).
      void client.end(endReasonRef.current);
    };
    // Экран живёт одним звонком: пересоздание клиента на смену параметров не нужно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUiEvent(event: MaxCallUiEvent): void {
    // Побочные заметки до автомата: оборванная реплика ИИ и секунды речи юзера.
    if (event.type === 'audio_out_cleared' && lastAssistantItemRef.current !== null) {
      bufferRef.current.markInterrupted(lastAssistantItemRef.current);
    }
    if (event.type === 'speech_started') {
      // Любая речь юзера сбрасывает отсчёт подсказки: тишины больше нет.
      hintTimerRef.current?.onSpeechStarted();
      if (speechStartedAtRef.current === null) {
        speechStartedAtRef.current = Date.now();
      }
    }
    if (
      (event.type === 'speech_stopped' || event.type === 'end' || event.type === 'fail') &&
      speechStartedAtRef.current !== null
    ) {
      speechAccumSecRef.current += (Date.now() - speechStartedAtRef.current) / 1000;
      speechStartedAtRef.current = null;
    }
    // Автомат no-op'ит недопустимые события той же ссылкой — лишнего рендера нет.
    setUiState((prev) => reduceMaxCallUi(prev, event));
  }

  /** Первый переход в active: часы и дедлайны (wrap/teardown) от серверного минта. */
  function onCallActivated(): void {
    const startedAt = Date.now();
    startedAtRef.current = startedAt;
    const mint = clientRef.current?.mintResult();
    if (!mint) return;
    // Таймер подсказок: пороги из limits минта (hintDelaySec per-CEFR,
    // hintMaxPerSession), вторая подсказка через +10с (спека §1).
    hintTimerRef.current = createHintTimer({
      delaySec: hintDelayFromLimits(mint.limits, cefr),
      secondHintDelaySec: HINT_SECOND_DELAY_SEC,
      maxPerSession: hintMaxFromLimits(mint.limits),
    });
    const deadlines = computeCallDeadlines({
      maxSeconds: mint.max_seconds,
      startedAtMs: startedAt,
      wrapUpLeadSec: WRAP_UP_LEAD_SEC,
      graceTailSec: GRACE_TAIL_SEC,
    });
    setHardAtMs(deadlines.hardAtMs);
    if (isTutor) {
      if (mint.tutor?.name) setTutorName(mint.tutor.name);
      // Учитель знает длину урока и сам ведёт к концу: заметки времени вместо [WRAP_UP].
      const lessonMin = Math.max(1, Math.round(mint.max_seconds / 60));
      clientRef.current?.sendSystemNote(`${TUTOR_TIME_NOTE_PREFIX} lesson length ${lessonMin} minutes`, { respond: false });
      const at = (leadSec: number, text: string) => {
        const delay = Math.max(0, deadlines.hardAtMs - leadSec * 1000 - startedAt);
        tutorNoteTimersRef.current.push(setTimeout(() => sendTutorNoteWhenQuiet(text), delay));
      };
      at(TUTOR_TWO_MIN_LEAD_SEC, `${TUTOR_TIME_NOTE_PREFIX} about 2 minutes left — finish the current activity and start the wrap-up (praise, homework, next topic, goodbye).`);
      at(TUTOR_GOODBYE_LEAD_SEC, `${TUTOR_TIME_NOTE_PREFIX} 45 seconds left — say goodbye now in one or two short turns, then call end_call.`);
    } else {
      wrapTimerRef.current = setTimeout(() => {
        clientRef.current?.sendWrapUp();
      }, Math.max(0, deadlines.wrapAtMs - startedAt));
    }
    // Жёсткий дедлайн — страховка и для учителя: не попрощался сам — завершим.
    teardownTimerRef.current = setTimeout(() => {
      endReasonRef.current = 'capped';
      void clientRef.current?.end('capped');
    }, Math.max(0, deadlines.teardownAtMs - startedAt));
  }

  /**
   * Заметка учителю уходит в паузу (не поверх его речи: response.create во время
   * активного ответа отклоняется). Если учитель говорит — ждём фазы
   * listening/thinking, но не дольше TUTOR_NOTE_DEFER_MAX_MS.
   */
  function sendTutorNoteWhenQuiet(text: string): void {
    const phaseNow = uiPhaseRef.current;
    const quiet = phaseNow === 'listening' || phaseNow === 'thinking' || phaseNow === 'connected_greeting';
    if (quiet) {
      clientRef.current?.sendSystemNote(text);
      return;
    }
    pendingTutorNoteRef.current = { text, deadlineMs: Date.now() + TUTOR_NOTE_DEFER_MAX_MS };
    tutorNoteTimersRef.current.push(setTimeout(flushPendingTutorNote, TUTOR_NOTE_DEFER_MAX_MS));
  }

  function flushPendingTutorNote(): void {
    const pending = pendingTutorNoteRef.current;
    if (!pending) return;
    pendingTutorNoteRef.current = null;
    clientRef.current?.sendSystemNote(pending.text);
  }

  // -------------------------------------------------------------------------
  // AppState: blur/шторка → мьют + grace 12с; возврат в окно — снимаем grace.
  // После grace — честное завершение с сеттлментом фактических секунд; разбор
  // юзер увидит при возврате (v1 без background-audio, спека §5).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (graceTimerRef.current !== null) {
          clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
        }
        clientRef.current?.setMuted(mutedRef.current);
        return;
      }
      clientRef.current?.setMuted(true);
      if (graceTimerRef.current === null) {
        graceTimerRef.current = setTimeout(() => {
          graceTimerRef.current = null;
          endReasonRef.current = 'background';
          void clientRef.current?.end('background');
        }, BLUR_GRACE_MS);
      }
    });
    return () => sub.remove();
  }, []);

  // -------------------------------------------------------------------------
  // Подсказки при тишине: фазы UI-автомата кормят таймер (взводится только в
  // listening, любая другая фаза разоружает), а поллинг due() раз в ~1с живёт
  // ТОЛЬКО пока фаза listening — в остальное время интервала просто нет,
  // лишней работы на слабом Android ноль. Выдача — одноразовый response.create
  // с инструкцией подсказки (гонку с активным response сервер вернёт
  // error-событием, оно no-op).
  useEffect(() => {
    hintTimerRef.current?.onPhase(uiState.phase, Date.now());
    if (uiState.phase !== 'listening') return;
    const id = setInterval(() => {
      const timer = hintTimerRef.current;
      if (!timer) return;
      const kind = timer.due(Date.now());
      if (kind === 'first') {
        clientRef.current?.sendHintResponse(HINT_FIRST_INSTRUCTIONS);
      } else if (kind === 'second') {
        clientRef.current?.sendHintResponse(HINT_SECOND_INSTRUCTIONS);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [uiState.phase]);

  // -------------------------------------------------------------------------
  // Завершение: локальный teardown не ждёт сеть, поэтому разбор открывается
  // сразу; settlement maxVoiceSessionEnd продолжает работу в фоне.
  useEffect(() => {
    if (uiState.phase !== 'ended' || finishedRef.current) return;
    finishedRef.current = true;
    const durationSec =
      startedAtRef.current !== null ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)) : 0;
    const mint = clientRef.current?.mintResult() ?? null;
    const dayRemainingBefore = dayRemainingFromLimits(mint?.limits);
    setLastMaxCallResult({
      history: bufferRef.current.history(),
      durationSec,
      speechSec: Math.round(speechAccumSecRef.current),
      format,
      scenarioId: format === 'companion' ? undefined : scenarioId,
      cefr,
      devMode,
      personaName,
      endReason: endReasonRef.current,
      dayRemainingSec:
        dayRemainingBefore === null ? null : Math.max(0, dayRemainingBefore - durationSec),
      ...(isTutor
        ? {
            tutor: {
              name: personaName,
              homework: tutorRunnerRef.current?.homework() ?? [],
              nextTopic: tutorRunnerRef.current?.nextTopic() ?? '',
              languagePreference: tutorRunnerRef.current?.languagePreference() ?? '',
              lessonsSoFar: mint?.tutor?.lessonsSoFar ?? 0,
            },
          }
        : {}),
    });
    router.replace('/max_voice_review' as any);
  }, [uiState.phase, format, scenarioId, cefr, devMode, personaName, isTutor, router]);

  // -------------------------------------------------------------------------
  const onEndPress = () => {
    hapticTap();
    endReasonRef.current = 'completed';
    void clientRef.current?.end('completed');
  };

  const onMutePress = () => {
    hapticTap();
    setMuted((prev) => {
      const next = !prev;
      clientRef.current?.setMuted(next);
      return next;
    });
  };

  const phase = uiState.phase;
  uiPhaseRef.current = phase;
  useEffect(() => {
    // Отложенная заметка учителю уходит, как только он замолчал.
    if ((phase === 'listening' || phase === 'thinking') && pendingTutorNoteRef.current) flushPendingTutorNote();
  }, [phase]);
  useEffect(() => {
    if (phase !== 'reconnecting') {
      setReconnectShown(false);
      return;
    }
    const id = setTimeout(() => setReconnectShown(true), RECONNECT_BANNER_DELAY_MS);
    return () => clearTimeout(id);
  }, [phase]);
  // Секундный блик сети внешне ничем не отличается от «думает»: сцена не
  // сереет, подпись под ореолом не меняется; баннер — только затянувшийся обрыв.
  const visiblePhase: MaxCallUiPhase =
    phase === 'reconnecting' && !reconnectShown ? 'thinking' : phase;
  const haloColor = haloColorFor(visiblePhase, t);
  const breathing = visiblePhase === 'connecting' || visiblePhase === 'thinking';
  // В reconnecting подпись под ореолом не дублирует баннер сверху.
  const hint = visiblePhase === 'reconnecting' ? '' : phaseHint(visiblePhase, lang);
  const lastTwo = turns.slice(-2);
  const minutesWord = triLang(lang, {
    ru: 'мин',
    uk: 'хв',
    es: 'min',
    'pt-BR': 'min',
    vi: 'phút',
    id: 'mnt',
    tr: 'dk',
    pl: 'min',
  });

  // Провал соединения: честная плашка вместо мёртвой сцены.
  if (phase === 'failed') {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="cloud-offline-outline" size={34} color={t.textMuted} />
          <Text
            style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center', marginTop: 12 }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: 'Не получилось дозвониться',
              uk: 'Не вдалося додзвонитися',
              es: 'No se pudo conectar la llamada',
              'pt-BR': 'Não foi possível conectar a ligação',
              vi: 'Không thể kết nối cuộc gọi',
              id: 'Panggilan tidak tersambung',
              tr: 'Arama bağlanamadı',
              pl: 'Nie udało się połączyć',
            })}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', marginTop: 6 }}>
            {maxVoiceFailureMessage(uiState.failReason, lang)}
          </Text>
          {__DEV__ && uiState.failReason ? (
            <Text style={{ color: t.textMuted, fontSize: f.label, textAlign: 'center', marginTop: 8 }}>
              {`MAX: ${uiState.failReason}`}
            </Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              hapticTap();
              // Ретрай с ТЕМИ ЖЕ параметрами звонка: без них prestart свалился
              // бы на дефолтные format='scenario'/scenarioId='coffee'.
              router.replace({
                pathname: '/max_call_prestart',
                params: {
                  format,
                  ...(format === 'companion' ? {} : { scenarioId }),
                  ...(cefr !== undefined ? { cefr } : {}),
                  ...(devMode ? { devMode: '1' } : {}),
                },
              } as any);
            }}
            style={{
              marginTop: 18,
              backgroundColor: t.accent,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 22,
            }}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Попробовать снова',
                uk: 'Спробувати знову',
                es: 'Intentar de nuevo',
                'pt-BR': 'Tentar de novo',
                vi: 'Thử lại',
                id: 'Coba lagi',
                tr: 'Tekrar dene',
                pl: 'Spróbuj ponownie',
              })}
            </Text>
          </TouchableOpacity>
          {format !== 'companion' ? (
            <TouchableOpacity
              testID="max-call-fallback-button"
              accessibilityRole="button"
              onPress={() => {
                hapticTap();
                router.replace({
                  pathname: '/ai_dialog_session',
                  params: { scenarioId, maxFallback: '1' },
                } as any);
              }}
              style={{
                marginTop: 10,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 18,
                backgroundColor: t.bgSurface,
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Продолжить в режиме рации',
                  uk: 'Продовжити в режимі рації',
                  es: 'Continuar en modo walkie-talkie',
                  'pt-BR': 'Continuar no modo rádio',
                  vi: 'Tiếp tục ở chế độ bộ đàm',
                  id: 'Lanjut dalam mode walkie-talkie',
                  tr: 'Telsiz modunda devam et',
                  pl: 'Kontynuuj w trybie krótkofalówki',
                })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView testID="max-call-session-screen" style={{ flex: 1 }}>
        {/* Шапка: аватар + имя + чип сценария + пилюля минут */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 10,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: t.accentBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={(isTutor ? 'school-outline' : (scenario?.icon ?? 'chatbubbles-outline')) as any} size={19} color={t.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800' }}>
              {personaName}
            </Text>
            {scenarioChip !== '' && (
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }}>
                {scenarioChip}
              </Text>
            )}
          </View>
          <MinutesPill
            hardAtMs={hardAtMs}
            minutesWord={minutesWord}
            colors={{ normal: t.textMuted, amber: t.gold, red: t.wrong }}
            fontSize={f.caption}
            // Low-minutes (последние 60с) — mid-call событие: haptic, не звук.
            onLowMinutes={() => sfxRef.current?.midCall('low_minutes')}
          />
        </View>

        {/* Reconnect-баннер: только затянувшийся обрыв (см. reconnectShown) */}
        {phase === 'reconnecting' && reconnectShown && (
          <View
            style={{
              marginHorizontal: 14,
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="wifi-outline" size={15} color={t.textMuted} />
            <Text style={{ color: t.textMuted, fontSize: f.caption, flex: 1 }}>
              {phaseHint('reconnecting', lang)}
            </Text>
          </View>
        )}

        {/* Сцена: один живой голосовой круг с многослойной feather-аурой. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <MaxCallHalo ref={haloRef} color={haloColor} breathing={breathing} size={104}>
            <View
              style={{
                width: 104,
                height: 104,
                borderRadius: 52,
                backgroundColor: t.accentBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={(isTutor ? 'school-outline' : (scenario?.icon ?? 'chatbubbles-outline')) as any} size={44} color={t.accent} />
            </View>
          </MaxCallHalo>
          {hint !== '' && (
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 14 }} maxFontSizeMultiplier={1.2}>
              {hint}
            </Text>
          )}
        </View>

        {/* Каптионы: последние 2 реплики, тап — шит с полной историей */}
        {ccEnabled && lastTwo.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            onPress={() => {
              hapticTap();
              setSheetOpen(true);
            }}
            style={{
              marginHorizontal: 14,
              marginBottom: 10,
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 14,
              padding: 12,
            }}
          >
            {lastTwo.map((turn, i) => (
              <Text
                key={`cc-${i}`}
                style={{
                  color: turn.role === 'user' ? t.textSecond : t.textPrimary,
                  fontSize: f.sub,
                  marginTop: i === 0 ? 0 : 6,
                  lineHeight: Math.round(f.sub * 1.35),
                }}
                maxFontSizeMultiplier={1.2}
              >
                {turn.text}
              </Text>
            ))}
          </TouchableOpacity>
        )}

        {/* Панель управления: mute / завершить (56px) / субтитры */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            paddingBottom: 18,
            paddingTop: 4,
          }}
        >
          <TouchableOpacity
            testID="max-call-mute-button"
            accessibilityRole="button"
            accessibilityLabel="Mute"
            onPress={onMutePress}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: muted ? t.wrongBg : t.bgCard,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={20} color={muted ? t.wrong : t.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="max-call-end-button"
            accessibilityRole="button"
            accessibilityLabel="End call"
            onPress={onEndPress}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: t.wrong,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="call" size={24} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="max-call-captions-button"
            accessibilityRole="button"
            accessibilityLabel="Captions"
            onPress={() => {
              hapticTap();
              setCcEnabled((v) => !v);
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: ccEnabled ? t.accentBg : t.bgCard,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="text-outline" size={20} color={ccEnabled ? t.accent : t.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Шит с полной историей транскрипта */}
        <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <View
              style={{
                maxHeight: '70%',
                backgroundColor: t.bgCard,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '800', flex: 1 }}>
                  {triLang(lang, {
                    ru: 'Транскрипт',
                    uk: 'Транскрипт',
                    es: 'Transcripción',
                    'pt-BR': 'Transcrição',
                    vi: 'Bản ghi',
                    id: 'Transkrip',
                    tr: 'Transkript',
                    pl: 'Zapis rozmowy',
                  })}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => {
                    hapticTap();
                    setSheetOpen(false);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: t.bgSurface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={18} color={t.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {turns.map((turn, i) => (
                  <Text
                    key={`sheet-${i}`}
                    style={{
                      color: turn.role === 'user' ? t.textSecond : t.textPrimary,
                      fontSize: f.sub,
                      marginTop: i === 0 ? 0 : 8,
                      lineHeight: Math.round(f.sub * 1.4),
                    }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {turn.text}
                  </Text>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenGradient>
  );
}
