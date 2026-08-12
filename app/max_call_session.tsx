import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  getScenarioById,
  dialogScenarioTitle,
  scenarioObjectives,
  scenarioTemperament,
  type DialogScenario,
} from './ai_dialog_scenarios';
import { buildCompanionMemory } from './ai_companion_memory';
import type { DialogMemory } from './ai_dialog_client';
import { getTrainerCounts } from './trainer_store';
import { loadMaxVoiceNative } from './max_webrtc_module';
import {
  createMaxCallClient,
  parseMintResponse,
  sessionEndEnrichment,
  type MaxCallClient,
  type MaxVoiceMintRequest,
} from './max_call_client';
import { createHintTimer, type HintTimer } from './max_call_hint_timer';
import { createDefaultMaxCallSfx, type MaxCallSfx } from './max_call_sfx';
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
import { VoiceEqualizer, type VoiceEqualizerRef } from './voice_equalizer';
import { setLastMaxCallResult } from './max_voice_review';

/**
 * Экран MAX-звонка (спека, раздел 6). Экран ТОНКИЙ: вся хореография транспорта
 * (минт ∥ offer, data channel, heartbeat, teardown) — в max_call_client;
 * turn-taking — в max_call_ui_state; транскрипт — в max_call_transcript.
 * Здесь только композиция (шапка / сцена / каптионы / панель) и подписки:
 * транскрипт приходит одним setState раз в 250мс, уровни звука — императивно
 * в ореол/эквалайзер мимо React, пилюля минут — отдельный memo-компонент со
 * СВОИМ интервалом, чтобы её секундный тик не ре-рендерил сцену.
 */

const FUNCTIONS_REGION = 'us-central1';
/** SDP-обмен идёт напрямую в OpenAI с ephemeral-токеном минта (спека §4). */
const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
/** Confirm на «завершить» — только в первые 30с (случайный тап при старте). */
const END_CONFIRM_WINDOW_MS = 30_000;
/** Blur/шторка: grace 12с с мьютом, потом честное завершение с сеттлментом. */
const BLUR_GRACE_MS = 12_000;
/** Серверные константы дедлайнов (спека §3): [WRAP_UP] за 75с, teardown +20с. */
const WRAP_UP_LEAD_SEC = 75;
const GRACE_TAIL_SEC = 20;
/** Тёплый тон голоса ИИ — един для ореола и баров эквалайзера. */
const AI_WARM_COLOR = '#F2A45C';

// ---------------------------------------------------------------------------
// Callable-обвязка. Живёт в файле экрана, а не в client: транспортная машина
// получает эти функции инжекцией (deps) и остаётся тестируемой без firebase.

function maxVoiceCallable<TRes>(name: string): (req: Record<string, unknown>) => Promise<TRes> {
  return async (req) => {
    await initFirebaseAppCheckIfAvailable();
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name);
    const res = await fn(req);
    return res.data as TRes;
  };
}

// Разбор ответа минта живёт в max_call_client (чистый модуль, jest-контракт):
// принимает оба написания ключей (session_id|sessionId и т.д.), см. C-контракт.

/** Остаток дневных секунд из limits минта (сервер — единственный источник). */
function dayRemainingFromLimits(limits: Record<string, unknown> | undefined): number | null {
  if (!limits) return null;
  const v = limits.dayRemainingSec ?? limits.day_remaining_sec;
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : null;
}

async function exchangeSdp(offerSdp: string, clientSecret: string): Promise<string> {
  const res = await fetch(REALTIME_CALLS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      'Content-Type': 'application/sdp',
    },
    body: offerSdp,
  });
  if (!res.ok) throw new Error(`sdp_exchange_http_${res.status}`);
  return await res.text();
}

/**
 * Имя персонажа из persona-строки (копия приёма ai_dialog_session: там функция
 * не экспортируется, а тянуть 2800-строчный экран ради регэкспа — дороже).
 */
function extractPersonaName(persona?: string): string {
  if (!persona) return '';
  const match = persona.match(/your name is\s+((?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?[^.,]+)/i);
  return match ? match[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Сборка промпт-полей запроса минта (спека §7): сервер строит instructions из
// personaName/personaRole/scenarioBlock/memoryBlock, которые обязан прислать
// клиент — контент сценариев живёт в бандле (ai_dialog_scenarios), сервер по
// scenarioId ничего не резолвит. Формат блока — как ai_dialog_session собирает
// для premiumDialogSend (role/setting/persona/goalEn/objectives/temperament),
// только связным текстом: без [[...]]-маркеров и JSON-конверта mood.

/** Текстовый SCENARIO_BLOCK по формату раздела 7 спеки. */
function buildScenarioBlock(scenario: DialogScenario): string {
  const lines: string[] = ['SCENARIO'];
  lines.push(`You are ${scenario.role}.`);
  lines.push(`Setting: ${scenario.setting}.`);
  if (scenario.persona) lines.push(`Persona: ${scenario.persona}`);
  const temperament = scenarioTemperament(scenario);
  lines.push(`Temperament: ${temperament.patience} patience, ${temperament.warmth} warmth.`);
  lines.push(`Goal of the conversation: ${scenario.goalEn}.`);
  const objectives = scenarioObjectives(scenario);
  if (objectives.length > 0) {
    lines.push(
      `The learner should accomplish: ${objectives.map((o) => o.en || o.id).join('; ')}.`,
    );
  }
  lines.push('Drive toward the goal in 5-8 exchanges.');
  return lines.join('\n');
}

/** COMPANION-память → текстовый блок «WHAT YOU REMEMBER ABOUT THIS LEARNER». */
function formatMemoryBlock(memory: DialogMemory): string {
  const lines: string[] = ['WHAT YOU REMEMBER ABOUT THIS LEARNER'];
  if (memory.profile) lines.push(memory.profile);
  if (memory.weakWords && memory.weakWords.length > 0) {
    // Слабые слова вплетаются в вопросы (замкнутый SRS-цикл, спека §8).
    lines.push(`Words to weave naturally into your questions: ${memory.weakWords.join(', ')}.`);
  }
  if (memory.summary) lines.push(memory.summary);
  return lines.join('\n');
}

/**
 * Промпт-поля минта по формату звонка. Никогда не бросает: минт без памяти /
 * без srsCount хуже минта без звонка — сервер деградирует к дефолтам сам.
 */
async function buildMintExtras(
  format: MaxVoiceMintRequest['format'],
  scenario: DialogScenario | undefined,
  cefr: string | undefined,
): Promise<Partial<MaxVoiceMintRequest>> {
  const extras: Partial<MaxVoiceMintRequest> = {};
  if (scenario) {
    extras.scenarioBlock = buildScenarioBlock(scenario);
    const name = extractPersonaName(scenario.persona);
    if (name !== '') extras.personaName = name;
    extras.personaRole = scenario.role;
  }
  if (format === 'companion') {
    extras.personaName = 'Alex';
    extras.personaRole = 'a friendly conversation partner who knows the learner';
    try {
      extras.memoryBlock = formatMemoryBlock(await buildCompanionMemory(cefr ?? 'A2'));
    } catch {
      // Память недоступна (чистый профиль/сбой стора) — компаньон без памяти.
    }
  }
  if (format === 'trial') {
    // Ветвление пробника companion/scenario делает сервер по SRS≥порога:
    // шлём дешёвый локальный счётчик SRS-элементов (getTrainerCounts — кэш).
    try {
      const counts = await getTrainerCounts();
      extras.srsCount = Object.values(counts).reduce((sum, n) => sum + Math.max(0, n), 0);
    } catch {
      // Счётчик не доехал — сервер применит scenario-ветку по умолчанию.
    }
  }
  return extras;
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
      return triLang(lang, {
        ru: 'Соединяем…',
        uk: 'З’єднуємо…',
        es: 'Conectando…',
        'pt-BR': 'Conectando…',
        vi: 'Đang kết nối…',
        id: 'Menghubungkan…',
        tr: 'Bağlanıyor…',
        pl: 'Łączenie…',
      });
    case 'listening':
      return triLang(lang, {
        ru: 'Твой ход — говори',
        uk: 'Твій хід — говори',
        es: 'Tu turno: habla',
        'pt-BR': 'Sua vez: fale',
        vi: 'Đến lượt bạn — hãy nói',
        id: 'Giliranmu — bicaralah',
        tr: 'Sıra sende — konuş',
        pl: 'Twoja kolej — mów',
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
  const params = useLocalSearchParams<{ format?: string; scenarioId?: string; cefr?: string }>();

  const format: MaxVoiceMintRequest['format'] =
    params.format === 'companion' || params.format === 'trial' ? params.format : 'scenario';
  const scenarioId = String(params.scenarioId ?? 'coffee');
  const cefr = typeof params.cefr === 'string' && params.cefr !== '' ? params.cefr : undefined;

  const scenario = useMemo(
    () => (format === 'companion' ? undefined : getScenarioById(scenarioId)),
    [format, scenarioId],
  );
  const personaName = useMemo(() => {
    const fromScenario = extractPersonaName(scenario?.persona);
    if (fromScenario !== '') return fromScenario;
    // Companion-режим: постоянный собеседник (имя совпадает с ai_companion).
    return 'Alex';
  }, [scenario?.persona]);
  const scenarioChip = useMemo(
    () => (scenario ? dialogScenarioTitle(scenario, lang) : ''),
    [scenario, lang],
  );

  const [uiState, setUiState] = useState<MaxCallUiState>(MAX_CALL_UI_INITIAL);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [ccEnabled, setCcEnabled] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hardAtMs, setHardAtMs] = useState<number | null>(null);

  const clientRef = useRef<MaxCallClient | null>(null);
  const bufferRef = useRef(createTranscriptBuffer(() => Date.now()));
  const haloRef = useRef<MaxCallHaloRef>(null);
  const eqRef = useRef<VoiceEqualizerRef>(null);
  // Таймер подсказок создаётся в onCallActivated из limits минта (per-CEFR
  // порог, кэп на сессию); до active — null, подсказки невозможны.
  const hintTimerRef = useRef<HintTimer | null>(null);
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
  // Владелец эквалайзера читается из ref в 100мс-поллинге уровней — колбэк
  // onLevels создаётся один раз и не должен зависеть от React-стейта.
  const eqOwnerRef = useRef(uiState.eqOwner);
  eqOwnerRef.current = uiState.eqOwner;

  // Причина завершения для разбора (устанавливается до end()).
  const endReasonRef = useRef<'completed' | 'capped' | 'dropped' | 'background' | 'failed'>('completed');

  // -------------------------------------------------------------------------
  // Жизненный цикл клиента: собрать deps → start; teardown идемпотентен.
  useEffect(() => {
    const native = loadMaxVoiceNative();
    if (!native) {
      // OTA поверх бинарника без webrtc: вход должен был быть скрыт гейтом, но
      // прямой deeplink обязан деградировать честно, без краша.
      setUiState((prev) => reduceMaxCallUi(prev, { type: 'fail', reason: 'native_unavailable' }));
      return;
    }

    const mintCallable = maxVoiceCallable<unknown>('maxVoiceMint');
    const heartbeatCallable = maxVoiceCallable<unknown>('maxVoiceHeartbeat');
    const endCallable = maxVoiceCallable<unknown>('maxVoiceSessionEnd');

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
      mint: async (req) => {
        const extras = await buildMintExtras(format, scenario, cefr);
        return parseMintResponse(
          await mintCallable({ ...extras, ...req } as unknown as Record<string, unknown>),
        );
      },
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
      reconnectHistory: () => bufferRef.current.history(),
      sfx: sfxRef.current ?? undefined,
      now: () => Date.now(),
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
        // Императивный путь мимо React: ореол кивает на голос юзера, эквалайзер
        // питается голосом владельца хода. Нет данных → организм idle pulse.
        haloRef.current?.setMicLevel(sample.mic);
        const owner = eqOwnerRef.current;
        const level = owner === 'ai' ? sample.remote : owner === 'user' ? sample.mic : null;
        // Уровень статов 0..1 → шкала volumechange (~0..10) модели эквалайзера.
        if (level !== null) eqRef.current?.setSample(level * 10);
      },
      onPhase: (phase) => {
        if (phase === 'active' && startedAtRef.current === null) {
          onCallActivated();
        }
      },
    });
    clientRef.current = client;
    void client.start({ format, scenarioId: format === 'companion' ? undefined : scenarioId, cefr });

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
    wrapTimerRef.current = setTimeout(() => {
      clientRef.current?.sendWrapUp();
    }, Math.max(0, deadlines.wrapAtMs - startedAt));
    teardownTimerRef.current = setTimeout(() => {
      endReasonRef.current = 'capped';
      void clientRef.current?.end('capped');
    }, Math.max(0, deadlines.teardownAtMs - startedAt));
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
  // Завершение: собрать локальный итог и уйти на разбор (fade — навигацией).
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
      personaName,
      endReason: endReasonRef.current,
      dayRemainingSec:
        dayRemainingBefore === null ? null : Math.max(0, dayRemainingBefore - durationSec),
    });
    router.replace('/max_voice_review' as any);
  }, [uiState.phase, format, scenarioId, personaName, router]);

  // -------------------------------------------------------------------------
  const onEndPress = () => {
    hapticTap();
    const startedAt = startedAtRef.current;
    const withinConfirmWindow = startedAt === null || Date.now() - startedAt < END_CONFIRM_WINDOW_MS;
    const doEnd = () => {
      endReasonRef.current = 'completed';
      void clientRef.current?.end('completed');
    };
    if (!withinConfirmWindow) {
      doEnd();
      return;
    }
    Alert.alert(
      triLang(lang, {
        ru: 'Завершить звонок?',
        uk: 'Завершити дзвінок?',
        es: '¿Terminar la llamada?',
        'pt-BR': 'Encerrar a ligação?',
        vi: 'Kết thúc cuộc gọi?',
        id: 'Akhiri panggilan?',
        tr: 'Arama sonlandırılsın mı?',
        pl: 'Zakończyć rozmowę?',
      }),
      triLang(lang, {
        ru: 'Разговор только начался',
        uk: 'Розмова щойно почалася',
        es: 'La conversación acaba de empezar',
        'pt-BR': 'A conversa acabou de começar',
        vi: 'Cuộc trò chuyện vừa mới bắt đầu',
        id: 'Percakapan baru saja dimulai',
        tr: 'Konuşma daha yeni başladı',
        pl: 'Rozmowa dopiero się zaczęła',
      }),
      [
        {
          text: triLang(lang, {
            ru: 'Продолжить',
            uk: 'Продовжити',
            es: 'Seguir',
            'pt-BR': 'Continuar',
            vi: 'Tiếp tục',
            id: 'Lanjutkan',
            tr: 'Devam et',
            pl: 'Kontynuuj',
          }),
          style: 'cancel',
        },
        {
          text: triLang(lang, {
            ru: 'Завершить',
            uk: 'Завершити',
            es: 'Terminar',
            'pt-BR': 'Encerrar',
            vi: 'Kết thúc',
            id: 'Akhiri',
            tr: 'Bitir',
            pl: 'Zakończ',
          }),
          style: 'destructive',
          onPress: doEnd,
        },
      ],
    );
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
  const haloColor = haloColorFor(phase, t);
  const breathing = phase === 'connecting' || phase === 'thinking';
  const hint = phaseHint(phase, lang);
  const eqActive = phase !== 'ended' && phase !== 'failed' && phase !== 'connecting';
  const eqColor = uiState.eqOwner === 'ai' ? AI_WARM_COLOR : t.accent;
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
            {triLang(lang, {
              ru: 'Проверь сеть и попробуй ещё раз',
              uk: 'Перевір мережу і спробуй ще раз',
              es: 'Revisa tu conexión e inténtalo de nuevo',
              'pt-BR': 'Verifique a conexão e tente de novo',
              vi: 'Kiểm tra mạng và thử lại',
              id: 'Periksa jaringan dan coba lagi',
              tr: 'Bağlantını kontrol edip tekrar dene',
              pl: 'Sprawdź sieć i spróbuj ponownie',
            })}
          </Text>
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
            <Ionicons name={(scenario?.icon ?? 'chatbubbles-outline') as any} size={19} color={t.accent} />
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

        {/* Reconnect-баннер */}
        {phase === 'reconnecting' && (
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

        {/* Сцена: ореол + аватар, эквалайзер под ним. Поверх — ничего. */}
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
              <Ionicons name={(scenario?.icon ?? 'chatbubbles-outline') as any} size={44} color={t.accent} />
            </View>
          </MaxCallHalo>
          <View style={{ marginTop: 22, alignSelf: 'stretch' }}>
            <VoiceEqualizer
              ref={eqRef}
              active={eqActive}
              color={eqColor}
              idleColor={t.textGhost}
              owner={uiState.eqOwner}
            />
          </View>
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
