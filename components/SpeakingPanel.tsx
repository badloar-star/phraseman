import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VoiceWaveform } from '../app/personal_plan_voice_waveform';
import {
  PLAN_PRONUNCIATION_PASS_THRESHOLD,
  scorePlanPronunciationTranscript,
} from '../app/personal_plan_pronunciation_scoring_client';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';

/**
 * SpeakingPanel — premium "say it out loud" practice surface.
 *
 * Self-contained: owns mic permission, on-device speech recognition, the live
 * waveform, word-by-word highlighting and pass/fail scoring (reuses the plan's
 * 90% threshold). Drop it anywhere (lesson / quiz / trainer / personal plan)
 * and it manages its own lifecycle. The host only supplies the target phrase
 * and is told when the attempt passes.
 *
 * Premium gating is the host's job: only render this when the user tapped the
 * "Устно" button AND has premium. Free users get routed to the paywall by the
 * host before this ever mounts.
 */

export type SpeakingPanelStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'scoring'
  | 'passed'
  | 'failed'
  | 'denied'
  | 'unavailable';

export interface SpeakingPanelTheme {
  bg: string;
  card: string;
  textPrimary: string;
  textSecond: string;
  textMuted: string;
  accent: string;
  correct: string;
  wrong: string;
  border: string;
}

export interface SpeakingPanelProps {
  /** Canonical target phrase the user must say (English). */
  targetText: string;
  /** UI language for the labels. */
  lang: string;
  theme: SpeakingPanelTheme;
  /** BCP-47 recognition locale. Defaults to en-US (study target is English). */
  recognitionLocale?: string;
  /** Called when the spoken attempt reaches the pass threshold. */
  onPass?: (result: { score: number; transcript: string }) => void;
  /** Called when the user closes the panel. */
  onClose: () => void;
}

type SpeechModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, cb: (payload: any) => void) => { remove?: () => void } | undefined;
};

// expo-speech-recognition is a native module; require lazily so the panel can
// degrade gracefully (status 'unavailable') if the dev build lacks it.
function loadSpeechModule(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-speech-recognition');
    return (mod?.ExpoSpeechRecognitionModule ?? null) as SpeechModule | null;
  } catch {
    return null;
  }
}

const L = (lang: string, map: Record<string, string>): string =>
  map[lang] ?? map.ru ?? Object.values(map)[0] ?? '';

function normalizeWord(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9']+/g, '')
    .trim();
}

/** Split the target into display tokens (keeps punctuation for display). */
function targetTokens(target: string): string[] {
  return target.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Mark which target words have been "heard" so far. A target word counts as
 * matched once it appears anywhere in the transcript word set — order-tolerant
 * so partial / out-of-order recognition still lights words up progressively.
 */
function matchedFlags(target: string, transcript: string): boolean[] {
  const heard = new Set(
    transcript.split(/\s+/).map(normalizeWord).filter((w) => w.length > 0),
  );
  return targetTokens(target).map((tok) => {
    const n = normalizeWord(tok);
    return n.length === 0 ? true : heard.has(n);
  });
}

export function SpeakingPanel({
  targetText,
  lang,
  theme,
  recognitionLocale = 'en-US',
  onPass,
  onClose,
}: SpeakingPanelProps) {
  const speech = useMemo(loadSpeechModule, []);
  const [status, setStatus] = useState<SpeakingPanelStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const listenersRef = useRef<Array<{ remove?: () => void }>>([]);
  const mountedRef = useRef(true);

  const tokens = useMemo(() => targetTokens(targetText), [targetText]);
  const matched = useMemo(
    () => matchedFlags(targetText, transcript),
    [targetText, transcript],
  );

  const cleanupListeners = useCallback(() => {
    listenersRef.current.forEach((sub) => sub?.remove?.());
    listenersRef.current = [];
  }, []);

  const finishAttempt = useCallback(
    (finalTranscript: string) => {
      if (!mountedRef.current) return;
      const text = finalTranscript.trim();
      setStatus('scoring');
      if (!text) {
        setStatus('failed');
        hapticError();
        return;
      }
      const result = scorePlanPronunciationTranscript({
        targetText,
        transcript: text,
      });
      setScore(result.score);
      if (result.passed) {
        setStatus('passed');
        hapticSuccess();
        onPass?.({ score: result.score, transcript: text });
      } else {
        setStatus('failed');
        hapticError();
      }
    },
    [targetText, onPass],
  );

  const stopListening = useCallback(() => {
    try {
      speech?.stop();
    } catch {
      /* no-op */
    }
  }, [speech]);

  const startListening = useCallback(async () => {
    if (!speech) {
      setStatus('unavailable');
      return;
    }
    hapticTap();
    setTranscript('');
    setScore(null);
    setStatus('requesting');
    try {
      const permission = await speech.requestPermissionsAsync();
      if (!mountedRef.current) return;
      if (!permission?.granted) {
        setStatus('denied');
        return;
      }
    } catch {
      if (mountedRef.current) setStatus('denied');
      return;
    }

    cleanupListeners();
    let latest = '';

    const resultSub = speech.addListener('result', (event: any) => {
      const best = event?.results?.[0];
      const next = String(best?.transcript ?? '').trim();
      if (next) {
        latest = next;
        if (mountedRef.current) setTranscript(next);
      }
    });
    const endSub = speech.addListener('end', () => {
      finishAttempt(latest);
    });
    const errorSub = speech.addListener('error', () => {
      if (mountedRef.current) {
        if (latest) finishAttempt(latest);
        else setStatus('failed');
      }
    });
    const noMatchSub = speech.addListener('nomatch', () => {
      if (mountedRef.current) setStatus('failed');
    });

    listenersRef.current = [resultSub, endSub, errorSub, noMatchSub].filter(
      Boolean,
    ) as Array<{ remove?: () => void }>;

    try {
      setStatus('listening');
      speech.start({
        lang: recognitionLocale,
        interimResults: true,
        continuous: false,
        ...(Platform.OS === 'ios' ? { recordingOptions: { persist: true } } : {}),
      });
    } catch {
      if (mountedRef.current) setStatus('unavailable');
    }
  }, [speech, recognitionLocale, cleanupListeners, finishAttempt]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupListeners();
      try {
        speech?.abort();
      } catch {
        /* no-op */
      }
    };
  }, [speech, cleanupListeners]);

  const handleClose = useCallback(() => {
    stopListening();
    try {
      speech?.abort();
    } catch {
      /* no-op */
    }
    onClose();
  }, [stopListening, speech, onClose]);

  const listening = status === 'listening';
  const passThreshold = PLAN_PRONUNCIATION_PASS_THRESHOLD;

  const statusLine = (() => {
    switch (status) {
      case 'idle':
        return L(lang, {
          ru: 'Нажми на микрофон и произнеси фразу',
          uk: 'Натисни на мікрофон і вимов фразу',
          es: 'Toca el micrófono y di la frase',
        });
      case 'requesting':
        return L(lang, { ru: 'Готовимся слушать…', uk: 'Готуємось слухати…', es: 'Preparando…' });
      case 'listening':
        return L(lang, { ru: 'Слушаю… говори', uk: 'Слухаю… говори', es: 'Escuchando… habla' });
      case 'scoring':
        return L(lang, { ru: 'Проверяю…', uk: 'Перевіряю…', es: 'Comprobando…' });
      case 'passed':
        return L(lang, { ru: 'Отлично! Чисто сказано', uk: 'Чудово! Чітко сказано', es: '¡Genial! Bien dicho' });
      case 'failed':
        return L(lang, { ru: 'Почти. Попробуй ещё раз', uk: 'Майже. Спробуй ще раз', es: 'Casi. Inténtalo otra vez' });
      case 'denied':
        return L(lang, {
          ru: 'Нужен доступ к микрофону. Включи в настройках',
          uk: 'Потрібен доступ до мікрофона. Увімкни в налаштуваннях',
          es: 'Se necesita el micrófono. Actívalo en ajustes',
        });
      case 'unavailable':
        return L(lang, {
          ru: 'Режим говорения недоступен на этом устройстве',
          uk: 'Режим говоріння недоступний на цьому пристрої',
          es: 'El modo de voz no está disponible en este dispositivo',
        });
      default:
        return '';
    }
  })();

  const micDisabled = status === 'requesting' || status === 'scoring' || status === 'unavailable';

  return (
    <Modal transparent animationType="fade" onRequestClose={handleClose} visible>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {L(lang, { ru: 'Скажи вслух', uk: 'Скажи вголос', es: 'Dilo en voz alta' })}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={L(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' })}
            >
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          {/* Target phrase with per-word highlight */}
          <View style={styles.phraseWrap} accessibilityRole="text">
            {tokens.map((tok, i) => (
              <Text
                key={`spk-tok-${i}`}
                style={[
                  styles.phraseWord,
                  {
                    color: matched[i] ? theme.correct : theme.textSecond,
                    opacity: matched[i] ? 1 : 0.75,
                  },
                ]}
              >
                {tok}
                {i < tokens.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </View>

          {/* Equalizer */}
          <View style={styles.waveWrap}>
            <VoiceWaveform active={listening} color={theme.accent} idleColor={theme.border} />
          </View>

          {/* Status line / score */}
          <Text
            style={[
              styles.status,
              {
                color:
                  status === 'passed'
                    ? theme.correct
                    : status === 'failed' || status === 'denied' || status === 'unavailable'
                    ? theme.wrong
                    : theme.textMuted,
              },
            ]}
          >
            {statusLine}
            {score != null && (status === 'passed' || status === 'failed')
              ? `  ·  ${score}% / ${passThreshold}%`
              : ''}
          </Text>

          {/* Mic / action button */}
          <Pressable
            onPress={listening ? stopListening : startListening}
            disabled={micDisabled}
            accessibilityRole="button"
            accessibilityLabel={
              listening
                ? L(lang, { ru: 'Остановить запись', uk: 'Зупинити запис', es: 'Detener' })
                : L(lang, { ru: 'Начать говорить', uk: 'Почати говорити', es: 'Empezar a hablar' })
            }
            accessibilityState={{ disabled: micDisabled, busy: status === 'requesting' || status === 'scoring' }}
            style={[
              styles.micBtn,
              {
                backgroundColor: listening ? theme.wrong : theme.accent,
                opacity: micDisabled ? 0.5 : 1,
              },
            ]}
          >
            {status === 'requesting' || status === 'scoring' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name={listening ? 'stop' : 'mic'} size={28} color="#fff" />
            )}
          </Pressable>

          {(status === 'failed' || status === 'passed') && (
            <Pressable onPress={startListening} hitSlop={8} style={styles.retry}>
              <Text style={[styles.retryText, { color: theme.accent }]}>
                {L(lang, { ru: 'Сказать ещё раз', uk: 'Сказати ще раз', es: 'Decir de nuevo' })}
              </Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  phraseWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  phraseWord: { fontSize: 22, fontWeight: '600', lineHeight: 30 },
  waveWrap: { height: 48, justifyContent: 'center', marginBottom: 12 },
  status: { fontSize: 14, textAlign: 'center', marginBottom: 20, minHeight: 20 },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: { marginTop: 16 },
  retryText: { fontSize: 15, fontWeight: '600' },
});

export default SpeakingPanel;
