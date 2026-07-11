// Бит 3 АХ-сцены: «скажи вслух». Тонкий слой над pure-модулями «Устно»
// (жизненный цикл распознавания — паттерн SpeakingPanel, UI свой).
// Контракт: components/onboarding_aha/aha_types.ts

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';

import { LOUD_PLAYBACK_AUDIO_MODE } from '../../app/audio_playback_mode';
import { setManagedAudioMode } from '../../app/audio_session_coordinator';
import {
  isSpeechRecognitionAvailable,
  loadPlanSpeechModule,
  requestSpeechPermissionForHold,
  type PlanSpeechModule,
} from '../../app/personal_plan_speech_module';
import { buildSpeakingStartOptions } from '../../app/speaking_recognition_options';
import { isSpeakingEnabled } from '../../app/remote_flags';
import { speakingMatchedFlags, speakingTargetTokens } from '../../app/speaking_word_match';
import { buildSpokenWordReport, type SpokenWordEntry } from '../../app/speaking_word_report';
import { hapticSuccess, hapticTap, hapticWarning } from '../../hooks/use-haptics';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { useRecordStartCue } from '../../hooks/use-record-start-cue';

import { trackAhaEvent } from './aha_events';
import { AHA_STRINGS, pickTri } from './aha_scenes';
import { pickBetterTranscript, softSpeechOutcome, type SoftSpeechOutcome } from './aha_speech_logic';
import { AHA_THEME } from './aha_theme';
import type { AhaSpeechStatus, SpeechBeatProps, TriText } from './aha_types';

// Android-движок может принять start() и молчать вечно — 7с и выходим в shadow.
const WATCHDOG_MS = 7000;

// Градиент кнопки, пока она зажата (идёт запись) — «микрофонный» красный, как в
// уроках/плане. Локальная константа: в теме АХ-сцены отдельного ключа нет.
const HOLD_ACTIVE_GRADIENT = ['#FF6E78', '#FF4A55', '#E5484D'] as const;

type Sub = { remove?: () => void } | undefined;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Аудио/нативные объекты могут быть уже разрушены — глотаем не критичное.
function safeCall(fn: () => void): void {
  try {
    fn();
  } catch {
    /* no-op */
  }
}

// Распознавание переводит аудио-сессию в запись (playAndRecord) — без сброса
// всё, что играет дальше, звучит тихо. Вызываем после КАЖДОГО исхода.
function restoreLoudPlayback(): void {
  void setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE).catch(() => undefined);
}

// Запись попытки живёт до ретрая/анмаунта — дальше это мусор в кэше (wav).
function deleteRecordingFile(uri: string | null): void {
  if (!uri) return;
  safeCall(() => {
    const file = new File(uri);
    if (file.exists) file.delete();
  });
}

function pressTap(): void {
  void hapticTap();
}

export default function SpeechBeat({ scenario, lang, onDone, playSay }: SpeechBeatProps) {
  const { playRecordStart } = useRecordStartCue();
  const [status, setStatus] = useState<AhaSpeechStatus>('preprompt');
  const statusRef = useRef<AhaSpeechStatus>('preprompt');
  statusRef.current = status;
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState<readonly SpokenWordEntry[] | null>(null);
  const [outcome, setOutcome] = useState<SoftSpeechOutcome | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'ref' | null>(null);
  const [shadowPlayed, setShadowPlayed] = useState(false);

  const speechRef = useRef<PlanSpeechModule | null>(null);
  const sessionSubsRef = useRef<Sub[]>([]);
  // audioend может прийти позже end — подписка живёт до ретрая/анмаунта.
  const audioEndSubRef = useRef<Sub>(undefined);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishingRef = useRef(false);
  const pressActiveRef = useRef(false);
  const bestRef = useRef('');
  const recordingUriRef = useRef<string | null>(null);
  const replayPlayerRef = useRef<AudioPlayer | null>(null);
  const recordCuePlayedRef = useRef(false);
  const mountedRef = useRef(true);

  const targetText = scenario.say.text;
  const t = useCallback((tri: TriText) => pickTri(lang, tri), [lang]);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current != null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const removeSessionListeners = useCallback(() => {
    sessionSubsRef.current.forEach((sub) => sub?.remove?.());
    sessionSubsRef.current = [];
  }, []);

  const removeAudioEndListener = useCallback(() => {
    audioEndSubRef.current?.remove?.();
    audioEndSubRef.current = undefined;
  }, []);

  // Любой путь в shadow-режим: снять слушателей/watchdog, вернуть громкий звук.
  const goFallback = useCallback(
    (reason: string) => {
      pressActiveRef.current = false;
      clearWatchdog();
      removeSessionListeners();
      removeAudioEndListener();
      safeCall(() => speechRef.current?.abort());
      restoreLoudPlayback();
      trackAhaEvent('onboarding_aha_speech_fallback', { reason });
      if (mountedRef.current) setStatus('fallback');
    },
    [clearWatchdog, removeSessionListeners, removeAudioEndListener],
  );

  // end/error/nomatch → скоринг лучшей гипотезы. Всегда к тёплому исходу.
  const finishAttempt = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    pressActiveRef.current = false;
    clearWatchdog();
    removeSessionListeners();
    restoreLoudPlayback();
    if (!mountedRef.current) return;
    setStatus('scoring');
    const attemptReport = buildSpokenWordReport({ targetText, transcript: bestRef.current });
    const result = softSpeechOutcome(attemptReport);
    setReport(attemptReport);
    setOutcome(result);
    setStatus('done');
    if (result.success) void hapticSuccess();
    else void hapticWarning();
    trackAhaEvent('onboarding_aha_speech_result', { pct: result.pct, success: result.success });
  }, [clearWatchdog, removeSessionListeners, targetText]);

  const subscribeSession = useCallback(
    (speech: PlanSpeechModule) => {
      const playCueOnce = () => {
        if (recordCuePlayedRef.current) return;
        recordCuePlayedRef.current = true;
        playRecordStart();
      };
      const startSub = speech.addListener('start', () => {
        clearWatchdog();
        if (!pressActiveRef.current) {
          safeCall(() => speech.abort());
          return;
        }
        if (mountedRef.current) setStatus('listening');
        playCueOnce();
      });
      const resultSub = speech.addListener('result', (event: any) => {
        // Первый result = движок жив (на редких OEM 'start' не эмитится).
        clearWatchdog();
        if (pressActiveRef.current && mountedRef.current) setStatus('listening');
        if (!pressActiveRef.current) return;
        playCueOnce();
        const alternatives: Array<{ transcript?: string }> = Array.isArray(event?.results)
          ? event.results
          : [];
        for (const alt of alternatives) {
          const candidate = String(alt?.transcript ?? '').trim();
          if (candidate) bestRef.current = pickBetterTranscript(targetText, bestRef.current, candidate);
        }
        // Живая подсветка по лучшей гипотезе: слово, загоревшись, не гаснет.
        if (bestRef.current && mountedRef.current) setTranscript(bestRef.current);
      });
      const endSub = speech.addListener('end', () => finishAttempt());
      const errorSub = speech.addListener('error', () => finishAttempt());
      const noMatchSub = speech.addListener('nomatch', () => finishAttempt());
      sessionSubsRef.current = [startSub, resultSub, endSub, errorSub, noMatchSub];
      audioEndSubRef.current = speech.addListener('audioend', (event: any) => {
        const uri = typeof event?.uri === 'string' && event.uri.length > 0 ? event.uri : null;
        recordingUriRef.current = uri;
        if (mountedRef.current) setRecordingUri(uri);
      });
    },
    [clearWatchdog, finishAttempt, playRecordStart, targetText],
  );

  const beginAttempt = useCallback(
    (speech: PlanSpeechModule) => {
      // Сброс прошлой попытки: гипотезы, карта, запись, реплей-плеер.
      finishingRef.current = false;
      recordCuePlayedRef.current = false;
      bestRef.current = '';
      setTranscript('');
      setReport(null);
      setOutcome(null);
      setActiveTab(null);
      safeCall(() => replayPlayerRef.current?.remove());
      replayPlayerRef.current = null;
      removeSessionListeners();
      removeAudioEndListener();
      deleteRecordingFile(recordingUriRef.current);
      recordingUriRef.current = null;
      setRecordingUri(null);

      subscribeSession(speech);
      setStatus('requesting');
      // Watchdog ставим ДО start(); снимается любым признаком жизни движка.
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null;
        goFallback('stalled');
      }, WATCHDOG_MS);
      try {
        speech.start(
          buildSpeakingStartOptions({
            lang: 'en-US',
            targetText,
            // Эквалайзера в сцене нет — не гоняем volumechange через мост.
            volumeMeter: false,
            // Файл записи нужен: питает «Мою запись» на карте слов.
            persistRecording: true,
            // «Зажми и говори»: конец речи задаёт палец (onPressOut → stop()), а не
            // агрессивный OEM-endpointer Android, который иначе рвёт реплику на
            // паузе / закрывает микрофон сразу. Держит сессию открытой, пока зажато.
            holdToTalk: true,
          }),
        );
      } catch {
        goFallback('unavailable');
      }
    },
    [
      targetText,
      subscribeSession,
      clearWatchdog,
      removeSessionListeners,
      removeAudioEndListener,
      goFallback,
    ],
  );

  // «Говорить»: guarded-загрузка нативного модуля → разрешение → слушаем.
  const startListening = useCallback(async () => {
    if (statusRef.current !== 'preprompt') return;
    pressActiveRef.current = true;
    setStatus('requesting');
    if (!isSpeakingEnabled()) {
      goFallback('disabled');
      return;
    }
    const speech = speechRef.current ?? loadPlanSpeechModule();
    speechRef.current = speech;
    if (!speech || !isSpeechRecognitionAvailable(speech)) {
      goFallback('unavailable');
      return;
    }
    const permission = await requestSpeechPermissionForHold(speech);
    if (!mountedRef.current) return;
    if (permission === 'denied') {
      goFallback('denied');
      return;
    }
    if (permission === 'granted_after_prompt') {
      pressActiveRef.current = false;
      setStatus('preprompt');
      return;
    }
    if (!pressActiveRef.current) return;
    beginAttempt(speech);
  }, [beginAttempt, goFallback]);

  const retryAttempt = useCallback(() => {
    pressActiveRef.current = false;
    clearWatchdog();
    removeSessionListeners();
    removeAudioEndListener();
    safeCall(() => speechRef.current?.abort());
    setStatus('preprompt');
  }, [clearWatchdog, removeAudioEndListener, removeSessionListeners]);

  // «Зажми и говори»: отпускание пальца завершает реплику. stop() досылает
  // финальный результат — end-слушатель дальше сам скорит лучшую гипотезу.
  // Ничего не делаем, если мы ещё не в фазе прослушивания (палец отпустили до
  // того, как микрофон реально стартовал — частый кейс на первом запросе прав).
  const stopListening = useCallback(() => {
    pressActiveRef.current = false;
    if (statusRef.current === 'requesting') {
      clearWatchdog();
      removeSessionListeners();
      removeAudioEndListener();
      safeCall(() => speechRef.current?.abort());
      if (mountedRef.current) setStatus('preprompt');
      return;
    }
    if (statusRef.current !== 'listening') return;
    safeCall(() => speechRef.current?.stop());
  }, [clearWatchdog, removeAudioEndListener, removeSessionListeners]);

  // «Моя запись»: сначала громкая сессия, иначе wav играет еле слышно.
  const playMyRecording = useCallback(() => {
    if (!recordingUri) return;
    setActiveTab('mine');
    safeCall(() => replayPlayerRef.current?.remove());
    replayPlayerRef.current = null;
    void setManagedAudioMode(LOUD_PLAYBACK_AUDIO_MODE)
      .catch(() => undefined)
      .finally(() => {
        safeCall(() => {
          const player = createAudioPlayer(recordingUri);
          replayPlayerRef.current = player;
          safeCall(() => {
            player.volume = 1;
          });
          player.play();
        });
      });
  }, [recordingUri]);

  const playReferenceTab = useCallback(() => {
    setActiveTab('ref');
    safeCall(() => replayPlayerRef.current?.pause());
    playSay();
  }, [playSay]);

  const playShadowReference = useCallback(() => {
    playSay();
    setShadowPlayed(true);
  }, [playSay]);

  const completeSpoken = useCallback(() => {
    onDone({ mode: 'spoken', speechPct: outcome?.pct });
  }, [onDone, outcome]);

  const completeShadow = useCallback(() => {
    onDone({ mode: 'shadow' });
  }, [onDone]);

  useEffect(() => {
    mountedRef.current = true;
    trackAhaEvent('onboarding_aha_speech_prompt');
    return () => {
      mountedRef.current = false;
      if (watchdogRef.current != null) clearTimeout(watchdogRef.current);
      sessionSubsRef.current.forEach((sub) => sub?.remove?.());
      sessionSubsRef.current = [];
      audioEndSubRef.current?.remove?.();
      safeCall(() => speechRef.current?.abort());
      safeCall(() => replayPlayerRef.current?.remove());
      deleteRecordingFile(recordingUriRef.current);
      restoreLoudPlayback();
    };
  }, []);

  const isListeningPhase =
    status === 'requesting' || status === 'listening' || status === 'scoring';

  return (
    <View style={styles.root}>
      {/* Preprompt + фаза прослушивания — ОДИН блок с ОДНОЙ hold-кнопкой, которая
          НЕ размонтируется между «до начала» и «слушаю». Иначе палец, начавший
          удержание на preprompt-кнопке, не получил бы событие отпускания после
          того, как та исчезла со сменой статуса — и запись бы не остановилась. */}
      {(status === 'preprompt' || isListeningPhase) && (
        <View style={styles.centerBlock}>
          {status === 'preprompt' ? (
            <View style={styles.bubble}>
              <Text style={styles.bubbleTitle}>{t(AHA_STRINGS.speakTitle)}</Text>
              <Text style={styles.bubbleBody}>{t(AHA_STRINGS.speakBody)}</Text>
            </View>
          ) : (
            <>
              <LiveTargetLine target={targetText} transcript={transcript} />
              <MicPulseRing active={status === 'listening'} />
            </>
          )}
          {/* «Зажми и говори»: press-in начинает слушать, press-out завершает.
              Конец речи задаёт палец, а не капризный OEM-endpointer Android. */}
          <HoldCta
            label={
              status === 'listening'
                ? t(AHA_STRINGS.speakHoldListening)
                : status === 'requesting'
                ? t(AHA_STRINGS.speakPreparing)
                : status === 'scoring'
                ? t(AHA_STRINGS.listening)
                : t(AHA_STRINGS.speakHoldIdle)
            }
            active={status === 'listening'}
            onPressIn={() => void startListening()}
            onPressOut={stopListening}
          />
          {status === 'preprompt' && (
            <Pressable onPressIn={pressTap} onPress={() => goFallback('not_now')} hitSlop={10}>
              <Text style={styles.linkText}>{t(AHA_STRINGS.speakNotNow)}</Text>
            </Pressable>
          )}
        </View>
      )}

      {status === 'done' && report != null && outcome != null && (
        <View style={styles.centerBlock}>
          <WordMap target={targetText} report={report} />
          <Text style={styles.resultText}>
            {outcome.success ? t(AHA_STRINGS.speakSuccess) : t(AHA_STRINGS.speakSoft)}
          </Text>
          <View style={styles.tabsRow}>
            {recordingUri != null && (
              <TabButton
                label={t(AHA_STRINGS.myRecording)}
                icon="play"
                selected={activeTab === 'mine'}
                onPress={playMyRecording}
              />
            )}
            <TabButton
              label={t(AHA_STRINGS.reference)}
              icon="volume-high"
              selected={activeTab === 'ref'}
              onPress={playReferenceTab}
            />
          </View>
          <Pressable onPressIn={pressTap} onPress={retryAttempt} hitSlop={10} style={styles.retryBtn}>
            <Ionicons name="refresh" size={14} color={AHA_THEME.textMuted} />
            <Text style={styles.retryText}>{t(AHA_STRINGS.retry)}</Text>
          </Pressable>
          <PrimaryCta label={t(AHA_STRINGS.continueCta)} onPress={completeSpoken} />
        </View>
      )}

      {status === 'fallback' && (
        <View style={styles.centerBlock}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleBody}>{t(AHA_STRINGS.shadowPrompt)}</Text>
          </View>
          <TabButton
            label={t(AHA_STRINGS.reference)}
            icon="volume-high"
            selected={false}
            onPress={playShadowReference}
          />
          {shadowPlayed && (
            <PrimaryCta label={t(AHA_STRINGS.continueCta)} onPress={completeShadow} />
          )}
        </View>
      )}
    </View>
  );
}

/** Живая подсветка слов цели по ходу распознавания (interim results). */
function LiveTargetLine({ target, transcript }: { target: string; transcript: string }) {
  const tokens = speakingTargetTokens(target);
  const flags = speakingMatchedFlags(target, transcript);
  return (
    <View style={styles.wordsRow}>
      {tokens.map((word, i) => (
        <Text
          key={`${word}_${i}`}
          style={[styles.wordText, { color: flags[i] ? AHA_THEME.karaokeLit : AHA_THEME.karaokeIdle }]}
        >
          {word}
        </Text>
      ))}
    </View>
  );
}

function wordStatusColor(status: SpokenWordEntry['status']): string {
  if (status === 'clean') return AHA_THEME.wordClean;
  if (status === 'fuzzy') return AHA_THEME.wordFuzzy;
  return AHA_THEME.wordMissed;
}

/** Пословная карта попытки: чисто/нечётко/пропущено. */
function WordMap({ target, report }: { target: string; report: readonly SpokenWordEntry[] }) {
  const tokens = speakingTargetTokens(target);
  return (
    <View style={styles.wordsRow}>
      {tokens.map((word, i) => (
        <Text
          key={`${word}_${i}`}
          style={[styles.wordText, { color: wordStatusColor(report[i]?.status ?? 'missed') }]}
        >
          {word}
        </Text>
      ))}
    </View>
  );
}

/** Кольцо микрофона: пульс только на фокусе и активном AppState (паттерн AvatarAura). */
function MicPulseRing({ active }: { active: boolean }) {
  const phase = useRef(new Animated.Value(0)).current;
  const isFocused = useIsScreenFocused();
  const shouldAnimate = active && isFocused;

  useEffect(() => {
    if (!shouldAnimate) {
      phase.setValue(0);
      return undefined;
    }
    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      phase.setValue(0);
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(phase, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(phase, {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [phase, shouldAnimate]);

  const scale = phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <View style={styles.micWrap}>
      <Animated.View
        style={[
          styles.micRing,
          {
            borderColor: active ? AHA_THEME.micRingActive : AHA_THEME.micRing,
            transform: [{ scale }],
          },
        ]}
      />
      <View style={styles.micInner}>
        <Ionicons name="mic" size={30} color={AHA_THEME.textPrimary} />
      </View>
    </View>
  );
}

function PrimaryCta({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPressIn={pressTap} onPress={onPress} style={styles.ctaWrap}>
      <LinearGradient
        colors={AHA_THEME.ctaGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaGradient}
      >
        <Text style={styles.ctaText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Кнопка «зажми и говори»: press-in начинает, press-out завершает. Пока зажата
 * (`active`), подсвечена красным как «идёт запись». Гаптик на нажатии.
 */
function HoldCta({
  label,
  active,
  onPressIn,
  onPressOut,
}: {
  label: string;
  active: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  return (
    <Pressable
      onPressIn={() => {
        pressTap();
        onPressIn();
      }}
      onPressOut={onPressOut}
      style={styles.ctaWrap}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={active ? HOLD_ACTIVE_GRADIENT : AHA_THEME.ctaGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaGradient}
      >
        <Text style={styles.ctaText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function TabButton({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: IoniconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPressIn={pressTap}
      onPress={onPress}
      style={[styles.tabBtn, selected && styles.tabBtnSelected]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selected ? AHA_THEME.chipSelectedBorder : AHA_THEME.textSecondary}
      />
      <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  centerBlock: { width: '100%', alignItems: 'center', gap: 14 },
  bubble: {
    width: '100%',
    backgroundColor: AHA_THEME.bubbleBg,
    borderColor: AHA_THEME.bubbleBorder,
    borderWidth: 0,
    borderRadius: AHA_THEME.radiusBubble,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  bubbleTitle: { color: AHA_THEME.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  bubbleBody: { color: AHA_THEME.textSecondary, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  linkText: { color: AHA_THEME.textMuted, fontSize: 14, padding: 6 },
  statusText: { color: AHA_THEME.textSecondary, fontSize: 14 },
  wordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 4,
    paddingHorizontal: 8,
  },
  wordText: { fontSize: 22, fontWeight: '700' },
  resultText: { color: AHA_THEME.textPrimary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  micWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 0},
  micInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AHA_THEME.cardBg,
    borderColor: AHA_THEME.cardBorder,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: { flexDirection: 'row', gap: 10 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: AHA_THEME.radiusChip,
    backgroundColor: AHA_THEME.chipBg,
    borderColor: AHA_THEME.chipBorder,
    borderWidth: 0,
  },
  tabBtnSelected: { backgroundColor: AHA_THEME.chipSelectedBg, borderColor: AHA_THEME.chipSelectedBorder },
  tabText: { color: AHA_THEME.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextSelected: { color: AHA_THEME.textPrimary },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6 },
  retryText: { color: AHA_THEME.textMuted, fontSize: 13 },
  ctaWrap: {
    width: '100%',
    borderRadius: AHA_THEME.radiusCard,
    shadowColor: AHA_THEME.ctaShadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaGradient: { borderRadius: AHA_THEME.radiusCard, paddingVertical: 15, alignItems: 'center' },
  ctaText: { color: AHA_THEME.ctaTextColor, fontSize: 16, fontWeight: '800' },
});
