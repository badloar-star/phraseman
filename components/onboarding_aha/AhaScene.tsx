// Оркестратор АХ-сцены онбординга: стейт-машина битов
// enter → listen → assemble → speak → payoff (дизайн: docs/ONBOARDING_AHA_DESIGN_2026-07-02.md).
// Анимации — только transform/opacity, useNativeDriver:true (Performance Bible).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { hapticCelebrate } from '../../hooks/use-haptics';
import { useOnboardingSounds } from '../../hooks/use-onboarding-sounds';
import { useAhaSceneAudio } from './aha_audio';
import AhaConfetti from './AhaConfetti';
import ChipsAssembly from './ChipsAssembly';
import { trackAhaEvent } from './aha_events';
import KaraokeLine from './KaraokeLine';
import { AHA_STRINGS, pickTri, resolveAhaScenario } from './aha_scenes';
import SceneBackdrop from './SceneBackdrop';
import SpeechBeat from './SpeechBeat';
import { AHA_THEME } from './aha_theme';
import type {
  AhaBeat,
  AhaBeat3Mode,
  AhaLang,
  AhaScenario,
  AhaSceneProps,
} from './aha_types';
import {
  AhaCompassBubble,
  AhaFadeIn,
  AhaPrimaryButton,
  AhaSecondaryLink,
  useBeatTransition,
  useSceneTimers,
} from './aha_ui';
import TypewriterText from './TypewriterText';

type PlayHear = (onEnd?: () => void) => void;

interface SpeechOutcome {
  mode: AhaBeat3Mode;
  speechPct?: number;
}

function EnterBeat({
  scenario,
  lang,
  onTyped,
}: {
  scenario: AhaScenario;
  lang: AhaLang;
  onTyped: () => void;
}) {
  return (
    <View style={styles.enterCenter}>
      <AhaCompassBubble>
        <TypewriterText text={pickTri(lang, scenario.setting)} skipOnPress onDone={onTyped} />
      </AhaCompassBubble>
    </View>
  );
}

function ListenBeat({
  scenario,
  lang,
  playHear,
  onContinue,
}: {
  scenario: AhaScenario;
  lang: AhaLang;
  playHear: PlayHear;
  onContinue: () => void;
}) {
  const [playToken, setPlayToken] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const playHearRef = useRef(playHear);
  playHearRef.current = playHear;

  // Первое проигрывание — через 300мс после входа в бит.
  useEffect(() => {
    const id = setTimeout(() => {
      playHearRef.current(() => setRevealed(true));
    }, 300);
    return () => clearTimeout(id);
  }, []);

  const handleReplay = useCallback(() => {
    setPlayToken((t) => t + 1);
    // onEnd повторно — идемпотентно: если первый клип оборвали повтором,
    // перевод и CTA всё равно появятся по концу повтора.
    playHearRef.current(() => setRevealed(true));
    trackAhaEvent('onboarding_aha_hear_replayed');
  }, []);

  return (
    <View style={styles.beatBody}>
      <AhaCompassBubble>
        <Text style={styles.bubbleText}>{pickTri(lang, scenario.setting)}</Text>
      </AhaCompassBubble>
      <View style={styles.centerZone}>
        <View style={styles.glassCard}>
          <KaraokeLine
            line={scenario.hear}
            playToken={playToken}
            variant="hear"
            onPress={handleReplay}
          />
          {revealed ? (
            <AhaFadeIn>
              <Text style={styles.translation}>{pickTri(lang, scenario.hear.translation)}</Text>
            </AhaFadeIn>
          ) : null}
        </View>
        <Text style={styles.hint}>{pickTri(lang, AHA_STRINGS.listenAgainHint)}</Text>
      </View>
      {revealed ? (
        <AhaFadeIn style={styles.footer}>
          <AhaPrimaryButton label={pickTri(lang, AHA_STRINGS.continueCta)} onPress={onContinue} />
        </AhaFadeIn>
      ) : null}
    </View>
  );
}

function AssembleBeat({
  scenario,
  lang,
  playSay,
  onAdvance,
}: {
  scenario: AhaScenario;
  lang: AhaLang;
  playSay: () => void;
  onAdvance: () => void;
}) {
  const [solved, setSolved] = useState(false);
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  const handleSolved = useCallback(() => {
    trackAhaEvent('onboarding_aha_assembled');
    setSolved(true);
  }, []);

  useEffect(() => {
    if (!solved) return;
    const id = setTimeout(() => onAdvanceRef.current(), 1400);
    return () => clearTimeout(id);
  }, [solved]);

  return (
    <View style={styles.beatBody}>
      <AhaCompassBubble>
        <TypewriterText text={pickTri(lang, scenario.replyPrompt)} charMs={20} skipOnPress />
      </AhaCompassBubble>
      <View style={styles.centerZone}>
        <ChipsAssembly scenario={scenario} lang={lang} onSolved={handleSolved} playSay={playSay} />
        {solved ? (
          <AhaFadeIn>
            <Text style={styles.praise}>{pickTri(lang, AHA_STRINGS.assembledPraise)}</Text>
          </AhaFadeIn>
        ) : null}
      </View>
    </View>
  );
}

function PayoffBeat({ lang, onContinue }: { lang: AhaLang; onContinue: () => void }) {
  return (
    <View style={styles.payoff}>
      <Text style={styles.payoffTitle}>{pickTri(lang, AHA_STRINGS.payoffTitle)}</Text>
      <Text style={styles.payoffBody}>{pickTri(lang, AHA_STRINGS.payoffBody)}</Text>
      <View style={styles.payoffCtaWrap}>
        <AhaPrimaryButton label={pickTri(lang, AHA_STRINGS.payoffCta)} onPress={onContinue} />
      </View>
    </View>
  );
}

export function AhaScene({ goal, lang, onDone, onSkip }: AhaSceneProps) {
  const scenario = useMemo(() => resolveAhaScenario(goal), [goal]);
  const audio = useAhaSceneAudio(scenario.id);
  const { playPlanReady } = useOnboardingSounds();

  const [beat, setBeat] = useState<AhaBeat>('enter');
  const [speech, setSpeech] = useState<SpeechOutcome | null>(null);
  const [skipVisible, setSkipVisible] = useState(false);

  const schedule = useSceneTimers();
  const { displayBeat, transitionStyle } = useBeatTransition(beat);

  const audioRef = useRef(audio);
  audioRef.current = audio;

  // Старт сцены: событие + ambient; на unmount глушим весь звук.
  useEffect(() => {
    trackAhaEvent('onboarding_aha_started', { scenario: scenario.id });
    audioRef.current.startAmbient();
    return () => {
      audioRef.current.stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Скип доступен с 5-й секунды.
  useEffect(() => {
    const id = setTimeout(() => setSkipVisible(true), 5000);
    return () => clearTimeout(id);
  }, []);

  // Перед битом с микрофоном глушим ambient: гул места не должен литься в ASR
  // (и не возобновляем — пейофф озвучен собственным звуком).
  useEffect(() => {
    if (beat === 'speak') audioRef.current.stopAmbient();
  }, [beat]);

  // Пейофф празднуем ровно один раз.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (displayBeat !== 'payoff' || celebratedRef.current) return;
    celebratedRef.current = true;
    void hapticCelebrate();
    playPlanReady();
  }, [displayBeat, playPlanReady]);

  const playHear = useCallback<PlayHear>((onEnd) => audioRef.current.playHear(onEnd), []);
  const playSay = useCallback(() => audioRef.current.playSay(), []);

  const handleTyped = useCallback(() => schedule(() => setBeat('listen'), 350), [schedule]);
  const toAssemble = useCallback(() => setBeat('assemble'), []);
  const toSpeak = useCallback(() => setBeat('speak'), []);
  const handleSpeechDone = useCallback((outcome: SpeechOutcome) => {
    setSpeech(outcome);
    setBeat('payoff');
  }, []);

  const handleDone = useCallback(() => {
    // 'shadow' — страховка: сюда без бита 3 не попадаем.
    const mode = speech?.mode ?? 'shadow';
    trackAhaEvent('onboarding_aha_completed', { beat3: mode, pct: speech?.speechPct });
    onDone({ scenarioId: scenario.id, completed: true, beat3: mode, speechPct: speech?.speechPct });
  }, [onDone, scenario.id, speech]);

  const handleSkip = useCallback(() => {
    audioRef.current.stopAll();
    trackAhaEvent('onboarding_aha_skipped', { beat });
    onSkip({ scenarioId: scenario.id, completed: false, beat3: 'skipped' });
  }, [beat, onSkip, scenario.id]);

  const beatContent = (() => {
    switch (displayBeat) {
      case 'enter':
        return <EnterBeat scenario={scenario} lang={lang} onTyped={handleTyped} />;
      case 'listen':
        return (
          <ListenBeat scenario={scenario} lang={lang} playHear={playHear} onContinue={toAssemble} />
        );
      case 'assemble':
        return (
          <AssembleBeat scenario={scenario} lang={lang} playSay={playSay} onAdvance={toSpeak} />
        );
      case 'speak':
        return (
          <SpeechBeat scenario={scenario} lang={lang} onDone={handleSpeechDone} playSay={playSay} />
        );
      case 'payoff':
        return <PayoffBeat lang={lang} onContinue={handleDone} />;
    }
  })();

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SceneBackdrop scenarioId={scenario.id} active={beat !== 'payoff'} />
      </View>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.beatContainer, transitionStyle]}>{beatContent}</Animated.View>
        {skipVisible && beat !== 'payoff' ? (
          <AhaFadeIn style={styles.skipRow}>
            <AhaSecondaryLink label={pickTri(lang, AHA_STRINGS.skip)} onPress={handleSkip} />
          </AhaFadeIn>
        ) : null}
      </SafeAreaView>
      {displayBeat === 'payoff' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <AhaConfetti />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AHA_THEME.bgGradient[2],
  },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  beatContainer: {
    flex: 1,
    paddingTop: 12,
  },
  beatBody: {
    flex: 1,
    gap: 18,
    paddingTop: 40,
  },
  // Контент бита — в вертикальном центре, а не прижат к шапке.
  centerZone: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 24,
  },
  enterCenter: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 120,
  },
  bubbleText: {
    color: AHA_THEME.textPrimary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  glassCard: {
    borderRadius: AHA_THEME.radiusCard,
    backgroundColor: AHA_THEME.cardBg,
    borderWidth: 1,
    borderColor: AHA_THEME.cardBorder,
    padding: 16,
    gap: 10,
  },
  translation: {
    color: AHA_THEME.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  hint: {
    color: AHA_THEME.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  praise: {
    color: AHA_THEME.wordClean,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 8,
  },
  payoff: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  payoffTitle: {
    color: AHA_THEME.textPrimary,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  payoffBody: {
    color: AHA_THEME.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  payoffCtaWrap: {
    marginTop: 24,
  },
  skipRow: {
    paddingVertical: 10,
  },
});
