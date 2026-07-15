/**
 * «Разговорный клуб» — экран голосовой миссии (specs/speaking-club.md, волна 1).
 * Voice-first: зажми-и-говори (holdToTalk, паттерн ai_dialog_session
 * conversationMode) + клавиатура как запасной ввод. Ученик открывает сцену сам
 * (бриф миссии вместо ИИ-приветствия). Итог — разбор speakingClubReview +
 * чек фраз урока + звёзды.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import AiTypingBubble from '../components/AiTypingBubble';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { useRecordStartCue } from '../hooks/use-record-start-cue';
import { LOUD_PLAYBACK_AUDIO_MODE } from './audio_playback_mode';
import { setManagedAudioMode } from './audio_session_coordinator';
import { triLang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { aiOffline, aiOfflineDialogScreen } from './ai_kill_switch_copy';
import { trackEvent, type AnalyticsEvent } from './analytics';
import { registerXP } from './xp_manager';
import { stripMarkers } from './ai_dialog_markup';
import { parseTurnState, isTerminalOutcome, objectiveLabel } from './dialog_outcome';
import type { DialogChatTurn } from './ai_dialog_client';
import { isSpeakingEnabled } from './remote_flags';
import { isSpeechRecognitionAvailable, loadPlanSpeechModule } from './personal_plan_speech_module';
import { buildSpeakingStartOptions } from './speaking_recognition_options';
import { TranscriptAccumulator } from './speaking_transcript_accumulator';
import {
  buildMissionObjectives,
  computeMissionStars,
  didLearnerSayPhrase,
  getClubMissionById,
  missionCefr,
  missionTargetPhrases,
  type ClubMission,
} from './speaking_club_missions';
import {
  callSpeakingClubReview,
  callSpeakingClubSend,
  classifySpeakingClubError,
  getSpeakingClubErrorMessage,
  markClubMissionStartedToday,
  saveClubMissionStars,
  type SpeakingClubReviewResponse,
} from './speaking_club_client';

type VoiceInputStatus = 'idle' | 'requesting' | 'listening' | 'unavailable' | 'denied' | 'stalled';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// После отпускания пальца ждём финальный result распознавателя (он часто
// прилетает уже после stop()) — как CONVERSATION_SEND_GRACE_MS в диалогах.
const SEND_GRACE_MS = 450;
// Watchdog Android: движок принял start(), но молчит — гасим через 7с.
const RECOGNIZER_WATCHDOG_MS = 7000;
// «Завершить» доступно после стольких реплик ученика (миссия ~10–14 обменов).
const MIN_TURNS_TO_FINISH = 2;
// XP за первое прохождение миссии (один раз на миссию, как dialog_complete).
const CLUB_MISSION_XP = 30;

function restoreLoudPlaybackMode(): void {
  void setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE).catch(() => undefined);
}

export default function SpeakingClubSession() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();
  const { studyTarget } = useStudyTarget();
  const { speak } = useAudio();
  const { playRecordStart } = useRecordStartCue();
  const params = useLocalSearchParams<{ mission?: string }>();

  const mission: ClubMission | null = useMemo(
    () => getClubMissionById(String(params.mission ?? '')),
    [params.mission],
  );

  const targetPhrases = useMemo(
    () => (mission ? missionTargetPhrases(mission.lessonId, studyTarget) : []),
    [mission, studyTarget],
  );
  const allObjectives = useMemo(
    () => (mission ? buildMissionObjectives(mission, targetPhrases) : []),
    [mission, targetPhrases],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceInputStatus>('idle');
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [input, setInput] = useState('');
  const [objectivesMet, setObjectivesMet] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [review, setReview] = useState<SpeakingClubReviewResponse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [stars, setStars] = useState(0);

  const speechModule = useMemo(() => (isSpeakingEnabled() ? loadPlanSpeechModule() : null), []);
  const speechLocale = studyTarget === 'fr' ? 'fr-FR' : 'en-US';

  const mountedRef = useRef(true);
  const listenersRef = useRef<Array<{ remove?: () => void }>>([]);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscriptRef = useRef('');
  const missionStartMarkedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current != null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const clearSendTimer = useCallback(() => {
    if (sendTimerRef.current != null) {
      clearTimeout(sendTimerRef.current);
      sendTimerRef.current = null;
    }
  }, []);

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((sub) => sub?.remove?.());
    listenersRef.current = [];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearWatchdog();
      clearSendTimer();
      cleanupListeners();
      try {
        speechModule?.abort();
      } catch {
        /* сервис мог умереть — не мешаем */
      }
      restoreLoudPlaybackMode();
    };
  }, [cleanupListeners, clearSendTimer, clearWatchdog, speechModule]);

  const userTurns = useMemo(() => messages.filter((m) => m.role === 'user').map((m) => m.text), [messages]);

  // Фраза защитана, если сработал ЛЮБОЙ сигнал: серверный objectivesMet
  // (phrase_N) или локальная проверка транскрипта (страховка конверта).
  const phraseChecks = useMemo(
    () =>
      targetPhrases.map((phrase, i) => objectivesMet.has(`phrase_${i + 1}`) || didLearnerSayPhrase(userTurns, phrase)),
    [targetPhrases, objectivesMet, userTurns],
  );

  const speakAiReply = useCallback(
    (rawText: string, rate?: number) => {
      const clean = stripMarkers(rawText).trim();
      if (!clean) return;
      setAiSpeaking(true);
      const done = () => {
        if (mountedRef.current) setAiSpeaking(false);
      };
      speak(clean, rate, {
        language: speechLocale,
        voice: '',
        onDone: done,
        onStopped: done,
        onError: done,
      });
    },
    [speak, speechLocale],
  );

  const finishMission = useCallback(
    async (completed: boolean) => {
      if (!mission || ended) return;
      setEnded(true);
      clearWatchdog();
      clearSendTimer();
      cleanupListeners();
      try {
        speechModule?.abort();
      } catch {
        /* no-op */
      }
      restoreLoudPlaybackMode();

      const scenarioMet = mission.objectives.filter((o) => objectivesMet.has(o.id)).length;
      const phrasesUsed = phraseChecks.filter(Boolean).length;
      const earnedStars = computeMissionStars({
        completed,
        phrasesUsed,
        phrasesTotal: targetPhrases.length,
        scenarioObjectivesMet: scenarioMet,
        scenarioObjectivesTotal: mission.objectives.length,
      });
      setStars(earnedStars);
      // 'as AnalyticsEvent': analytics.ts занят другой сессией — литералы событий
      // зарегистрируем в союзе отдельным коммитом (хвост волны 1).
      void trackEvent('speaking_club_mission_finished' as AnalyticsEvent, {
        missionId: mission.id,
        lessonId: mission.lessonId,
        completed,
        stars: earnedStars,
        userTurns: userTurns.length,
      });
      if (earnedStars > 0) {
        void saveClubMissionStars(mission.id, earnedStars, studyTarget);
        // XP один раз за миссию (анти-фарм, как dialog_complete).
        void (async () => {
          const dedupeKey = `club_xp_awarded_${mission.id}`;
          try {
            if (await AsyncStorage.getItem(dedupeKey)) return;
            const userName = (await AsyncStorage.getItem('user_name')) || '';
            await registerXP(CLUB_MISSION_XP, 'club_mission_complete', userName, lang, undefined, {
              eventId: `club_mission_complete:${mission.id}`,
              payload: { missionId: mission.id, lessonId: mission.lessonId, stars: earnedStars },
            });
            await AsyncStorage.setItem(dedupeKey, '1');
          } catch {
            // best-effort: сбой XP не ломает показ итога
          }
        })();
      }

      // Финальный разбор — не критичен: при сбое просто нет секции разбора.
      if (userTurns.length > 0) {
        setReviewLoading(true);
        try {
          const res = await callSpeakingClubReview({
            history: messages.map((m): DialogChatTurn => ({ role: m.role, content: m.text })),
            cefr: missionCefr(mission),
            interfaceLang: lang,
            missionId: mission.id,
            goalEn: mission.goalEn,
            studyTarget,
            targetPhrases,
          });
          if (mountedRef.current) setReview(res);
        } catch {
          // секция разбора просто не показывается
        } finally {
          if (mountedRef.current) setReviewLoading(false);
        }
      }
    },
    [mission, ended, clearWatchdog, clearSendTimer, cleanupListeners, speechModule, objectivesMet, phraseChecks, targetPhrases, userTurns.length, studyTarget, lang, messages],
  );

  const applyTurnState = useCallback(
    (raw: unknown) => {
      const ts = parseTurnState(raw);
      if (ts.objectivesMet.length > 0) {
        setObjectivesMet((prev) => {
          const next = new Set(prev);
          ts.objectivesMet.forEach((id) => next.add(id));
          return next;
        });
      }
      if (isTerminalOutcome(ts.outcome)) {
        void finishMission(true);
      }
    },
    [finishMission],
  );

  const send = useCallback(
    async (text: string) => {
      if (!mission) return;
      const trimmed = text.trim();
      if (!trimmed || sending || ended) return;
      hapticTap();
      const history = messages.map((m): DialogChatTurn => ({ role: m.role, content: m.text }));
      setErrorMessage('');
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setSending(true);
      try {
        const res = await callSpeakingClubSend({
          userText: trimmed,
          cefr: missionCefr(mission),
          history,
          role: mission.role,
          setting: mission.setting,
          goalEn: mission.goalEn,
          persona: mission.persona,
          missionId: mission.id,
          lessonId: mission.lessonId,
          interfaceLang: lang,
          studyTarget,
          objectives: allObjectives.map((o) => ({ id: o.id, en: o.en || o.id })),
          temperament: mission.temperament,
          targetPhrases,
        });
        setMessages((prev) => [...prev, { role: 'assistant', text: res.assistantMessage }]);
        speakAiReply(res.assistantMessage);
        applyTurnState(res.turnState);
        // Зеркальный клиентский счётчик «миссия дня» — после ПЕРВОГО успешного
        // ответа (сбой сети не сжигает миссию, серверный откат — источник правды).
        if (history.length === 0 && !missionStartMarkedRef.current) {
          missionStartMarkedRef.current = true;
          void markClubMissionStartedToday(studyTarget);
        }
      } catch (error) {
        void trackEvent('speaking_club_send_error' as AnalyticsEvent, { missionId: mission.id });
        const kind = classifySpeakingClubError(error);
        if (kind === 'mission_limit') {
          void trackEvent('paywall_shown', { context: 'speaking_club', source: 'club_session_mission_limit' });
          router.push({ pathname: '/premium_modal', params: { context: 'speaking_club' } } as never);
        }
        setErrorMessage(getSpeakingClubErrorMessage(error, lang));
        // Реплику юзера оставляем в чате: «Повторить» дошлёт её же.
      } finally {
        setSending(false);
      }
    },
    [mission, sending, ended, messages, lang, studyTarget, allObjectives, targetPhrases, speakAiReply, applyTurnState, router],
  );

  const retryLastTurn = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    // Убираем последнюю реплику юзера и шлём заново (send добавит её обратно).
    setMessages((prev) => {
      const idx = prev.map((m) => m.role).lastIndexOf('user');
      if (idx < 0) return prev;
      return prev.filter((_, i) => i !== idx);
    });
    setErrorMessage('');
    setTimeout(() => void send(lastUser.text), 0);
  }, [messages, send]);

  // ── Голосовой ввод: зажми-и-говори ─────────────────────────────────────────
  const startVoiceInput = useCallback(async () => {
    if (!mission || sending || ended || voiceStatus === 'requesting') return;
    if (!speechModule || !isSpeechRecognitionAvailable(speechModule)) {
      setVoiceStatus('unavailable');
      return;
    }
    setVoiceStatus('requesting');
    try {
      const permission = await speechModule.requestPermissionsAsync();
      if (!permission?.granted) {
        setVoiceStatus('denied');
        return;
      }
    } catch {
      setVoiceStatus('denied');
      return;
    }

    cleanupListeners();
    const acc = new TranscriptAccumulator();
    let latest = '';
    const applyTranscript = (value: string) => {
      const next = value.trim();
      if (!next) return;
      latest = next;
      latestTranscriptRef.current = next;
      if (!mountedRef.current) return;
      setInput(next);
      setErrorMessage('');
    };

    // cue играем один раз по первому признаку жизни движка ('start' ИЛИ 'result'
    // — на редких OEM 'start' не эмитится), а не сразу после start() (прогрев
    // ~100-300мс терял начало речи). На Android звук молчит, играет вибро.
    let cuePlayed = false;
    const playCueOnce = () => {
      if (cuePlayed) return;
      cuePlayed = true;
      playRecordStart();
    };
    const startSub = speechModule.addListener('start', () => {
      clearWatchdog();
      playCueOnce();
    });
    const resultSub = speechModule.addListener('result', (event: { results?: Array<{ transcript?: string }> }) => {
      clearWatchdog();
      playCueOnce();
      const alternatives = Array.isArray(event?.results) ? event.results : [];
      const top = String(alternatives[0]?.transcript ?? '').trim();
      if (top) {
        acc.add(top);
        applyTranscript(acc.union() || top);
        return;
      }
      for (const alt of alternatives) {
        const candidate = String(alt?.transcript ?? '').trim();
        if (candidate) {
          applyTranscript(candidate);
          return;
        }
      }
    });
    const endSub = speechModule.addListener('end', () => {
      clearWatchdog();
      restoreLoudPlaybackMode();
      cleanupListeners();
      if (mountedRef.current) setVoiceStatus('idle');
    });
    const errorSub = speechModule.addListener('error', () => {
      clearWatchdog();
      restoreLoudPlaybackMode();
      cleanupListeners();
      if (mountedRef.current) setVoiceStatus(latest ? 'idle' : 'unavailable');
    });
    const noMatchSub = speechModule.addListener('nomatch', () => {
      clearWatchdog();
      restoreLoudPlaybackMode();
      cleanupListeners();
      if (mountedRef.current) setVoiceStatus('idle');
    });
    listenersRef.current = [startSub, resultSub, endSub, errorSub, noMatchSub].filter(Boolean) as Array<{
      remove?: () => void;
    }>;

    let onDevice = false;
    try {
      onDevice = (await speechModule.supportsOnDeviceRecognition?.()) === true;
    } catch {
      onDevice = false;
    }
    if (!mountedRef.current) return;

    try {
      setVoiceStatus('listening');
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null;
        try {
          speechModule.abort();
        } catch {
          /* сервис мог умереть — не мешаем */
        }
        cleanupListeners();
        if (mountedRef.current) {
          setVoiceStatus('stalled');
          hapticError();
        }
        restoreLoudPlaybackMode();
      }, RECOGNIZER_WATCHDOG_MS);
      speechModule.start(
        buildSpeakingStartOptions({
          lang: speechLocale,
          // Биас на цели миссии: фразы урока — то, что ученик скорее всего скажет.
          targetText: targetPhrases.join('. ') || mission.goalEn,
          interimResults: true,
          volumeMeter: false,
          onDevice,
          // Голосовой ввод не переслушивают — файл записи не нужен.
          persistRecording: false,
          // Конец речи задаёт палец (onPressOut → stop()), не endpointer движка.
          holdToTalk: true,
          // Свободный ответ ученика, не заранее известная фраза — targetPhrases
          // тут только biasing, НЕ должен управлять iOS task hint.
          freeSpeech: true,
        }),
      );
      // cue теперь в playCueOnce (слушатели 'start'/'result').
    } catch {
      clearWatchdog();
      cleanupListeners();
      if (mountedRef.current) setVoiceStatus('unavailable');
    }
  }, [mission, sending, ended, voiceStatus, speechModule, cleanupListeners, clearWatchdog, speechLocale, targetPhrases, playRecordStart]);

  const handleMicPressIn = useCallback(() => {
    if (sending || ended || aiSpeaking) return;
    clearSendTimer();
    latestTranscriptRef.current = '';
    void startVoiceInput();
  }, [sending, ended, aiSpeaking, clearSendTimer, startVoiceInput]);

  const handleMicPressOut = useCallback(() => {
    clearWatchdog();
    try {
      speechModule?.stop();
    } catch {
      /* сервис мог умереть — не мешаем */
    }
    clearSendTimer();
    sendTimerRef.current = setTimeout(() => {
      sendTimerRef.current = null;
      if (!mountedRef.current) return;
      const text = latestTranscriptRef.current.trim();
      cleanupListeners();
      restoreLoudPlaybackMode();
      setVoiceStatus('idle');
      if (text) void send(text);
    }, SEND_GRACE_MS);
  }, [clearWatchdog, speechModule, clearSendTimer, cleanupListeners, send]);

  useEffect(() => {
    // Автоскролл к последней реплике.
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages.length, ended, review]);

  if (!mission) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.textPrimary, fontSize: f.body }}>
            {triLang(lang, {
              ru: 'Миссия не найдена',
              uk: 'Місію не знайдено',
              es: 'Misión no encontrada',
              'pt-BR': 'Missão não encontrada',
              vi: 'Không tìm thấy nhiệm vụ',
              id: 'Misi tidak ditemukan',
              tr: 'Görev bulunamadı',
              pl: 'Nie znaleziono misji',
            })}
          </Text>
          <TouchableOpacity onPress={() => safeRouterBack(router, '/speaking_club_home' as never)} style={{ marginTop: 12 }}>
            <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '700' }}>← OK</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // Глобальный рубильник ИИ: миссия голосовая (нужен ИИ-собеседник) — не пускаем
  // внутрь, показываем забавную заглушку. Миссии разговорные → категория social.
  if (aiOffline()) {
    const offline = aiOfflineDialogScreen(lang, 'social', mission.id);
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 40 }}>{mission.icon}</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {offline.title}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {offline.message}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => { hapticTap(); safeRouterBack(router, '/speaking_club_home' as never); }}
            style={{ marginTop: 22, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#07110A', fontSize: f.sub, fontWeight: '900' }}>
              {triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wróć' })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const micDisabled = sending || ended || aiSpeaking;
  const canFinish = !ended && userTurns.length >= MIN_TURNS_TO_FINISH;
  const missionTitleText = lang === 'uk' ? mission.titleUk : mission.titleRu;

  const voiceHint =
    voiceStatus === 'listening'
      ? triLang(lang, {
          ru: 'Слушаю… Говори и держи кнопку',
          uk: 'Слухаю… Говори і тримай кнопку',
          es: 'Escuchando… habla sin soltar el botón',
          'pt-BR': 'Ouvindo… fale segurando o botão',
          vi: 'Đang nghe… hãy nói và giữ nút',
          id: 'Mendengarkan… bicaralah sambil menahan tombol',
          tr: 'Dinliyorum… düğmeyi basılı tutup konuş',
          pl: 'Słucham… mów, trzymając przycisk',
        })
      : voiceStatus === 'stalled' || voiceStatus === 'unavailable'
        ? triLang(lang, {
            ru: 'Микрофон не завёлся. Попробуй ещё раз или включи клавиатуру ⌨️',
            uk: 'Мікрофон не запустився. Спробуй ще раз або ввімкни клавіатуру ⌨️',
            es: 'El micrófono no arrancó. Inténtalo otra vez o usa el teclado ⌨️',
            'pt-BR': 'O microfone não iniciou. Tente de novo ou use o teclado ⌨️',
            vi: 'Micro không khởi động. Thử lại hoặc dùng bàn phím ⌨️',
            id: 'Mikrofon tidak menyala. Coba lagi atau pakai keyboard ⌨️',
            tr: 'Mikrofon başlamadı. Tekrar dene ya da klavyeyi kullan ⌨️',
            pl: 'Mikrofon nie wystartował. Spróbuj ponownie albo użyj klawiatury ⌨️',
          })
        : voiceStatus === 'denied'
          ? triLang(lang, {
              ru: 'Нет доступа к микрофону. Разреши его в настройках телефона',
              uk: 'Немає доступу до мікрофона. Дозволь його в налаштуваннях телефону',
              es: 'Sin acceso al micrófono. Actívalo en los ajustes del teléfono',
              'pt-BR': 'Sem acesso ao microfone. Ative nas configurações do telefone',
              vi: 'Không có quyền micro. Hãy cấp quyền trong cài đặt điện thoại',
              id: 'Tidak ada akses mikrofon. Izinkan di pengaturan ponsel',
              tr: 'Mikrofon erişimi yok. Telefon ayarlarından izin ver',
              pl: 'Brak dostępu do mikrofonu. Włącz go w ustawieniach telefonu',
            })
          : triLang(lang, {
              ru: 'Зажми и говори',
              uk: 'Затисни і говори',
              es: 'Mantén pulsado y habla',
              'pt-BR': 'Segure e fale',
              vi: 'Giữ nút và nói',
              id: 'Tahan dan bicara',
              tr: 'Basılı tut ve konuş',
              pl: 'Przytrzymaj i mów',
            });

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Шапка */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => {
                hapticTap();
                safeRouterBack(router, '/speaking_club_home' as never);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: t.bgCard,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}
            >
              <Ionicons name="close" size={20} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                {mission.icon} {missionTitleText}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }} numberOfLines={1}>
                {triLang(lang, {
                  ru: `Урок ${mission.lessonId} · реплик: ${userTurns.length}`,
                  uk: `Урок ${mission.lessonId} · реплік: ${userTurns.length}`,
                  es: `Lección ${mission.lessonId} · turnos: ${userTurns.length}`,
                  'pt-BR': `Lição ${mission.lessonId} · falas: ${userTurns.length}`,
                  vi: `Bài ${mission.lessonId} · lượt nói: ${userTurns.length}`,
                  id: `Pelajaran ${mission.lessonId} · giliran: ${userTurns.length}`,
                  tr: `Ders ${mission.lessonId} · konuşma: ${userTurns.length}`,
                  pl: `Lekcja ${mission.lessonId} · wypowiedzi: ${userTurns.length}`,
                })}
              </Text>
            </View>
            {canFinish && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  hapticTap();
                  void finishMission(true);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: t.bgCard,
                }}
              >
                <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }}>
                  {triLang(lang, {
                    ru: 'Завершить',
                    uk: 'Завершити',
                    es: 'Terminar',
                    'pt-BR': 'Concluir',
                    vi: 'Kết thúc',
                    id: 'Selesai',
                    tr: 'Bitir',
                    pl: 'Zakończ',
                  })}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Цели миссии */}
          <View
            style={{
              marginHorizontal: 14,
              marginBottom: 8,
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 14,
              padding: 10,
            }}
          >
            {mission.objectives.map((o) => (
              <Text key={o.id} style={{ color: objectivesMet.has(o.id) ? t.correct : t.textMuted, fontSize: f.sub, marginVertical: 1 }} numberOfLines={1}>
                {objectivesMet.has(o.id) ? '✅' : '⬜'} {objectiveLabel(o, lang)}
              </Text>
            ))}
            {targetPhrases.map((phrase, i) => (
              <Text key={`phrase_${i}`} style={{ color: phraseChecks[i] ? t.correct : t.textMuted, fontSize: f.sub, marginVertical: 1 }} numberOfLines={1}>
                {phraseChecks[i] ? '✅' : '⬜'} «{phrase}»
              </Text>
            ))}
          </View>

          {/* Чат */}
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>
            {messages.length === 0 && !ended && (
              <View
                style={{
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                  {lang === 'uk' ? mission.goalUk : mission.goalRu}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
                  {triLang(lang, {
                    ru: 'Начни первым: зажми микрофон и поздоровайся. Собеседник подхватит.',
                    uk: 'Почни першим: затисни мікрофон і привітайся. Співрозмовник підхопить.',
                    es: 'Empieza tú: mantén pulsado el micrófono y saluda. Tu interlocutor seguirá.',
                    'pt-BR': 'Comece você: segure o microfone e cumprimente. O parceiro continua.',
                    vi: 'Bạn bắt đầu trước: giữ micro và chào hỏi. Người đối thoại sẽ tiếp lời.',
                    id: 'Mulailah lebih dulu: tahan mikrofon dan beri salam. Lawan bicara akan menyambut.',
                    tr: 'İlk sen başla: mikrofonu basılı tutup selam ver. Partnerin devam ettirir.',
                    pl: 'Zacznij pierwszy: przytrzymaj mikrofon i przywitaj się. Rozmówca podchwyci.',
                  })}
                </Text>
              </View>
            )}

            {messages.map((m, i) => {
              const isAi = m.role === 'assistant';
              const clean = stripMarkers(m.text);
              return (
                <View
                  key={i}
                  style={{
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '86%',
                    backgroundColor: isAi ? glassFill(t.bgCard, 0.46) : t.accent + '26',
                    borderRadius: 14,
                    borderBottomLeftRadius: isAi ? 4 : 14,
                    borderBottomRightRadius: isAi ? 14 : 4,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body }}>{clean}</Text>
                  {isAi && (
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <TouchableOpacity accessibilityRole="button" onPress={() => speakAiReply(m.text)}>
                        <Text style={{ color: t.textMuted, fontSize: f.sub }}>🔁</Text>
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button" onPress={() => speakAiReply(m.text, 0.6)}>
                        <Text style={{ color: t.textMuted, fontSize: f.sub }}>🐌</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {sending && (
              <AiTypingBubble bubbleColor={t.bgCard} borderColor={'transparent'} dotColor={t.textMuted} glowColor={t.accent} />
            )}

            {!!errorMessage && (
              <View
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: 14,
                  borderWidth: 0,
                  borderColor: t.wrong,
                  padding: 12,
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.sub }}>{errorMessage}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={retryLastTurn} style={{ marginTop: 8 }}>
                  <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: '↻ Повторить',
                      uk: '↻ Повторити',
                      es: '↻ Reintentar',
                      'pt-BR': '↻ Tentar de novo',
                      vi: '↻ Thử lại',
                      id: '↻ Coba lagi',
                      tr: '↻ Tekrar dene',
                      pl: '↻ Spróbuj ponownie',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Итог миссии */}
            {ended && (
              <View
                style={{
                  backgroundColor: glassFill(t.bgSurface, 0.46),
                  borderRadius: 16,
                  padding: 14,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'center' }}>
                  {'★'.repeat(stars)}{'☆'.repeat(Math.max(0, 3 - stars))}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', marginTop: 2 }}>
                  {triLang(lang, {
                    ru: 'Миссия завершена',
                    uk: 'Місію завершено',
                    es: 'Misión terminada',
                    'pt-BR': 'Missão concluída',
                    vi: 'Đã hoàn thành nhiệm vụ',
                    id: 'Misi selesai',
                    tr: 'Görev tamamlandı',
                    pl: 'Misja zakończona',
                  })}
                </Text>

                {reviewLoading && (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', marginTop: 10 }}>
                    {triLang(lang, {
                      ru: 'Готовлю разбор…',
                      uk: 'Готую розбір…',
                      es: 'Preparando el análisis…',
                      'pt-BR': 'Preparando a análise…',
                      vi: 'Đang chuẩn bị phần nhận xét…',
                      id: 'Menyiapkan ulasan…',
                      tr: 'Değerlendirme hazırlanıyor…',
                      pl: 'Przygotowuję omówienie…',
                    })}
                  </Text>
                )}

                {review && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {!!review.praise && (
                      <Text style={{ color: t.textPrimary, fontSize: f.sub }}>💛 {review.praise}</Text>
                    )}
                    {review.corrections.map((c, i) => (
                      <View key={i} style={{ backgroundColor: glassFill(t.bgCard, 0.32), borderRadius: 10, padding: 8 }}>
                        <Text style={{ color: t.wrong, fontSize: f.sub }}>{c.original}</Text>
                        <Text style={{ color: t.correct, fontSize: f.sub, fontWeight: '700' }}>→ {c.corrected}</Text>
                        {!!c.note && <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>{c.note}</Text>}
                      </View>
                    ))}
                    {!!review.tip && (
                      <Text style={{ color: t.textPrimary, fontSize: f.sub }}>💡 {review.tip}</Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    hapticTap();
                    safeRouterBack(router, '/speaking_club_home' as never);
                  }}
                  style={{
                    marginTop: 12,
                    borderRadius: 12,
                    backgroundColor: t.accent,
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                    {triLang(lang, {
                      ru: 'В клуб',
                      uk: 'До клубу',
                      es: 'Al club',
                      'pt-BR': 'Para o clube',
                      vi: 'Về câu lạc bộ',
                      id: 'Ke klub',
                      tr: 'Kulübe dön',
                      pl: 'Do klubu',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Ввод */}
          {!ended && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              {keyboardMode ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => {
                      hapticTap();
                      setKeyboardMode(false);
                    }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.bgCard, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="mic" size={20} color={t.textPrimary} />
                  </TouchableOpacity>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="…"
                    placeholderTextColor={t.textMuted}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 14,
                      backgroundColor: t.bgCard,
                      color: t.textPrimary,
                      paddingHorizontal: 12,
                      fontSize: f.body,
                    }}
                    editable={!sending}
                    onSubmitEditing={() => void send(input)}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={sending || !input.trim()}
                    onPress={() => void send(input)}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', opacity: sending || !input.trim() ? 0.5 : 1 }}
                  >
                    <Ionicons name="arrow-up" size={20} color={t.correctText} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Keyboard"
                      onPress={() => {
                        hapticTap();
                        setKeyboardMode(true);
                      }}
                      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.bgCard, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="chatbox-ellipses-outline" size={20} color={t.textSecond} />
                    </TouchableOpacity>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Hold to talk"
                      disabled={micDisabled}
                      onPressIn={handleMicPressIn}
                      onPressOut={handleMicPressOut}
                      style={{
                        width: 76,
                        height: 76,
                        borderRadius: 38,
                        backgroundColor: voiceStatus === 'listening' ? t.accent : t.bgCard,
                        borderWidth: 0,
                        borderColor: t.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: micDisabled ? 0.5 : 1,
                      }}
                    >
                      <Ionicons
                        name="mic"
                        size={32}
                        color={voiceStatus === 'listening' ? t.correctText : t.accent}
                      />
                    </Pressable>
                    <View style={{ width: 44, height: 44 }} />
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 8 }} numberOfLines={2}>
                    {aiSpeaking
                      ? triLang(lang, {
                          ru: 'Собеседник говорит…',
                          uk: 'Співрозмовник говорить…',
                          es: 'Tu interlocutor habla…',
                          'pt-BR': 'O parceiro está falando…',
                          vi: 'Người đối thoại đang nói…',
                          id: 'Lawan bicara sedang berbicara…',
                          tr: 'Partnerin konuşuyor…',
                          pl: 'Rozmówca mówi…',
                        })
                      : voiceHint}
                  </Text>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
