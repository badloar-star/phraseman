import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import PremiumCard from '../components/PremiumCard';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { checkAchievements } from './achievements';
import { updateTaskProgress } from './daily_tasks';
import { ChoiceStyle, DIALOGS, DialogScenario3, getDialogById, GlossaryEntry } from './dialogs_data';
import { loadSettings } from './settings_edu';
import { registerXP } from './xp_manager';

const NPC_SPEECH_OPTS = { language: 'en-US', rate: 0.9, pitch: 1.0 };

// Connection bar: starts 50, casual +10, textbook 0, awkward -25
const CONNECTION_DELTA: Record<ChoiceStyle, number> = {
  casual: 10,
  textbook: 0,
  awkward: -25,
};

const STYLE_LABEL: Record<ChoiceStyle, string> = {
  textbook: '📘 Textbook',
  casual: '😎 Casual',
  awkward: '😬 Awkward',
};

const STYLE_COLOR: Record<ChoiceStyle, string> = {
  textbook: '#6B9FD4',
  casual: '#4CAF72',
  awkward: '#E06060',
};

// ── Connection Bar ────────────────────────────────────────────────────────────
function ConnectionBar({ value, t, f }: { value: number; t: any; f: any }) {
  const clamp = Math.max(0, Math.min(100, value));
  const animValue = useRef(new Animated.Value(clamp)).current;
  const prevValue = useRef(clamp);

  useEffect(() => {
    // Shake when dropping into danger zone
    if (clamp < 30 && prevValue.current >= 30) {
      Animated.sequence([
        Animated.timing(animValue, { toValue: clamp - 3, duration: 60, useNativeDriver: false }),
        Animated.timing(animValue, { toValue: clamp + 3, duration: 60, useNativeDriver: false }),
        Animated.timing(animValue, { toValue: clamp, duration: 60, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.timing(animValue, { toValue: clamp, duration: 300, useNativeDriver: false }).start();
    }
    prevValue.current = clamp;
  }, [clamp]);

  // Color interpolation: green (>=60) → amber (30-59) → red (<30)
  const barColor = animValue.interpolate({
    inputRange: [0, 30, 60, 100],
    outputRange: ['#FF4444', '#FF4444', '#E0A030', '#47C870'],
    extrapolate: 'clamp',
  });

  const barWidth = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const iconColor = clamp < 30 ? '#FF4444' : clamp < 60 ? '#E0A030' : '#47C870';

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="heart-outline" size={14} color={iconColor} />
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <Animated.View style={{ height: '100%', width: barWidth, backgroundColor: barColor, borderRadius: 3 }} />
        </View>
      </View>
    </View>
  );
}

// ── Dialog List ───────────────────────────────────────────────────────────────
function DialogList({ onSelect }: { onSelect: (id: string) => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const isUK = lang === 'uk';
  const [completed, setCompleted] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem('dialogs_completed').then(v => {
      if (v) { try { const parsed = JSON.parse(v); if (Array.isArray(parsed)) setCompleted(parsed); } catch {} }
    });
    AsyncStorage.getItem('dialogs_scores').then(v => {
      if (v) { try { const parsed = JSON.parse(v); if (parsed && typeof parsed === 'object') setScores(parsed); } catch {} }
    });
  }, []);

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700' }}>
              {isUK ? 'Діалоги' : 'Диалоги'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
              {isUK ? 'Відпрацюй соціальні навички' : 'Отработай социальные навыки'}
            </Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {DIALOGS.map(dialog => {
            const score = scores[dialog.id];
            const done = dialog.id in scores || completed.includes(dialog.id);
            const borderColor = score !== undefined
              ? score >= 70 ? '#47C870' : score >= 40 ? '#E0A030' : '#FF6B6B'
              : undefined;
            return (
              <View key={dialog.id} style={done && borderColor ? { borderRadius: 16, borderWidth: 1.5, borderColor } : {}}>
                <PremiumCard
                  level={2}
                  active={done}
                  onPress={() => onSelect(dialog.id)}
                  innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                  <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: dialog.bgColor, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28 }}>{dialog.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{isUK ? dialog.titleUK : dialog.titleRU}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }} numberOfLines={1}>{dialog.setting}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <Text style={{ color: '#F5A623', fontSize: f.caption, fontWeight: '600' }}>+{Math.max(...dialog.endings.map(e => e.xpReward))} XP</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
                </PremiumCard>
              </View>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

// ── Role Card (Intro) ─────────────────────────────────────────────────────────────────────────────
function RoleCard({ dialog, onStart, onBack }: { dialog: DialogScenario3; onStart: () => void; onBack: () => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const goalText = isUK ? dialog.goalUK : dialog.goalRU;
  const roleText = isUK ? dialog.roleUK : dialog.roleRU;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#152019' }}>
      <LinearGradient colors={['#1D2D23', '#152019']} style={{ flex: 1 }}>
        <ContentWrap style={{ flex: 1 }}>
          {/* Thin header — back arrow only */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
            <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color="#F0F7F2" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' }}>
            {/* Large emoji, no box */}
            <Text style={{ fontSize: 72, textAlign: 'center', marginTop: 16, marginBottom: 20 }}>{dialog.emoji}</Text>

            {/* Goal chip */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              {goalText ? (
                <View style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: '#F0F7F2', fontSize: 12 }}>🎯 {goalText}</Text>
                </View>
              ) : null}
            </View>

            {/* One-sentence hook / setting */}
            <Text style={{ color: '#F0F7F2', fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 24, marginBottom: 10 }} numberOfLines={2}>
              {dialog.setting}
            </Text>

            {/* Role description */}
            {roleText ? (
              <Text style={{ color: t.textSecond, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 }} numberOfLines={3}>
                {roleText}
              </Text>
            ) : null}

            {/* Full-width start button */}
            <TouchableOpacity
              onPress={onStart}
              style={{ backgroundColor: '#47C870', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', width: '100%' }}
            >
              <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>
                {isUK ? 'Почати' : 'Начать'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </ContentWrap>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ── Glossary Screen ─────────────────────────────────────────────────────────────────────────────
function GlossaryScreen({ dialog, onBack }: { dialog: DialogScenario3; onBack: () => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const [expanded, setExpanded] = useState<string | null>(null);
  const scaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  const [pulseIdx, setPulseIdx] = useState<number>(-1);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseSeen = useRef(false);

  const getScale = (phrase: string) => {
    if (!scaleAnims[phrase]) {
      scaleAnims[phrase] = new Animated.Value(1);
    }
    return scaleAnims[phrase];
  };

  useEffect(() => {
    if (pulseSeen.current) return;
    const randomIdx = Math.floor(Math.random() * dialog.glossary.length);
    setPulseIdx(randomIdx);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleTileTap = (phrase: string) => {
    if (!pulseSeen.current) {
      pulseSeen.current = true;
      setPulseIdx(-1);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    const isExp = expanded === phrase;
    setExpanded(isExp ? null : phrase);
    if (!isExp) {
      const anim = getScale(phrase);
      Animated.spring(anim, { toValue: 1.04, useNativeDriver: true, speed: 40, bounciness: 4 }).start(() => {
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
      });
    }
  };

  const items = dialog.glossary;

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border, gap: 12 }}>
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
            {isUK ? 'Глосарій' : 'Глоссарий'}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 8 }}>
          {(() => {
            const rows: React.ReactElement[] = [];
            let i = 0;
            while (i < items.length) {
              const item = items[i];
              const isExp = expanded === item.phrase;
              const scale = getScale(item.phrase);

              if (isExp) {
                rows.push(
                  <Animated.View key={item.phrase} style={{ transform: [{ scale }], margin: 4 }}>
                    <TouchableOpacity
                      onPress={() => handleTileTap(item.phrase)}
                      activeOpacity={0.85}
                      style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.accent }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{item.phrase}</Text>
                      <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: 20 }}>
                        {isUK ? item.explanationUK : item.explanationRU}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
                i += 1;
              } else {
                const itemB = items[i + 1];
                const isExpB = itemB ? expanded === itemB.phrase : false;
                if (itemB && !isExpB) {
                  const idxA = i;
                  const idxB = i + 1;
                  rows.push(
                    <View key={`row-${i}`} style={{ flexDirection: 'row' }}>
                      {([item, itemB] as const).map((tile, pairPos) => {
                        const tileIdx = pairPos === 0 ? idxA : idxB;
                        const tileScale = getScale(tile.phrase);
                        const expl = isUK ? tile.explanationUK : tile.explanationRU;
                        const preview = expl.split(' ').slice(0, 3).join(' ');
                        const inner = (
                          <Animated.View key={tile.phrase} style={{ flex: 1, transform: [{ scale: tileScale }], margin: 4 }}>
                            <TouchableOpacity
                              onPress={() => handleTileTap(tile.phrase)}
                              activeOpacity={0.85}
                              style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', minHeight: 72 }}
                            >
                              <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>{tile.phrase}</Text>
                              <Text style={{ color: t.textMuted, fontSize: 11 }} numberOfLines={1}>{preview}…</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        );
                        if (tileIdx === pulseIdx) {
                          return (
                            <Animated.View key={tile.phrase + '-pulse'} style={{ flex: 1, transform: [{ scale: pulseAnim }] }}>
                              {inner}
                            </Animated.View>
                          );
                        }
                        return inner;
                      })}
                    </View>
                  );
                  i += 2;
                } else {
                  const expl = isUK ? item.explanationUK : item.explanationRU;
                  const preview = expl.split(' ').slice(0, 3).join(' ');
                  const tileScale = getScale(item.phrase);
                  const inner = (
                    <Animated.View key={item.phrase} style={{ transform: [{ scale: tileScale }], margin: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleTileTap(item.phrase)}
                        activeOpacity={0.85}
                        style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', minHeight: 72 }}
                      >
                        <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>{item.phrase}</Text>
                        <Text style={{ color: t.textMuted, fontSize: 11 }} numberOfLines={1}>{preview}…</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                  if (i === pulseIdx) {
                    rows.push(
                      <Animated.View key={item.phrase + '-pulse'} style={{ transform: [{ scale: pulseAnim }], margin: 4 }}>
                        {inner}
                      </Animated.View>
                    );
                  } else {
                    rows.push(inner);
                  }
                  i += 1;
                }
              }
            }
            return rows;
          })()}
          <View style={{ height: 16 }} />
        </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

// ── NPC Text Renderer (glossary word highlighting) ────────────────────────────
function renderNPCText(
  text: string,
  glossary: GlossaryEntry[],
  isUK: boolean,
  onWordTap: (entry: GlossaryEntry) => void,
  textStyle: any,
) {
  let parts: { str: string; entry: GlossaryEntry | null }[] = [{ str: text, entry: null }];

  for (const entry of glossary) {
    const newParts: typeof parts = [];
    for (const part of parts) {
      if (part.entry !== null) { newParts.push(part); continue; }
      const idx = part.str.toLowerCase().indexOf(entry.phrase.toLowerCase());
      if (idx === -1) { newParts.push(part); continue; }
      if (idx > 0) newParts.push({ str: part.str.slice(0, idx), entry: null });
      newParts.push({ str: part.str.slice(idx, idx + entry.phrase.length), entry });
      if (idx + entry.phrase.length < part.str.length) newParts.push({ str: part.str.slice(idx + entry.phrase.length), entry: null });
    }
    parts = newParts;
  }

  return (
    <Text style={textStyle}>
      {parts.map((p, i) =>
        p.entry ? (
          <Text
            key={i}
            onPress={() => onWordTap(p.entry!)}
            style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.35)', borderStyle: 'dotted', color: '#F0F7F2' }}
          >
            {p.str}
          </Text>
        ) : (
          <Text key={i} style={{ color: '#F0F7F2' }}>{p.str}</Text>
        )
      )}
    </Text>
  );
}

// ── Chat History Type ─────────────────────────────────────────────────────────
type ChatMsg = { id: string; type: 'npc' | 'player'; textEN: string; textRU?: string; emoji?: string; style?: ChoiceStyle; };

// ── Game Screen ───────────────────────────────────────────────────────────────
function GameScreen({ dialog, onBack }: { dialog: DialogScenario3; onBack: () => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [stepIdx, setStepIdx] = useState(0);
  const [connection, setConnection] = useState(50);
  const [socialScores, setSocialScores] = useState<number[]>([]);
  const [npcEmoji, setNpcEmoji] = useState(dialog.npcEmojiDefault);
  const [finalScore, setFinalScore] = useState(0);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<'choosing' | 'feedback' | 'gameover' | 'result'>('choosing');
  const [userName, setUserName] = useState('');
  const [voiceOut, setVoiceOut] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [showGlossary, setShowGlossary] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [choiceOrder, setChoiceOrder] = useState<number[]>([0, 1, 2]);
  const [tooltip, setTooltip] = useState<{ phrase: string; explanationRU: string; explanationUK: string } | null>(null);
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const isMounted = useRef(true);

  const currentStep = dialog.steps[stepIdx];
  const isLastStep = !!currentStep?.isFinalStep;

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    loadSettings().then(s => { setVoiceOut(s.voiceOut ?? true); setHaptics(s.haptics); });
    return () => { isMounted.current = false; Speech.stop(); };
  }, []);

  // Initialize chat history with first NPC message
  useEffect(() => {
    const step = dialog.steps[0];
    setChatHistory([{ id: 'npc-0', type: 'npc', textEN: step.npcTextEN, textRU: isUK ? step.npcTextUK : step.npcTextRU, emoji: dialog.npcEmojiDefault }]);
  }, []);

  // Shuffle choice order when step changes
  useEffect(() => {
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setChoiceOrder([...order]);
  }, [stepIdx]);

  // Speak NPC text when step changes
  useEffect(() => {
    if (!currentStep || phase !== 'choosing') return;
    if (voiceOut) {
      const text = currentStep.npcTextEN;
      Speech.stop();
      Speech.speak(text, NPC_SPEECH_OPTS);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [stepIdx]);

  const handleChoice = (idx: number) => {
    if (phase !== 'choosing') return;
    Speech.stop();
    setChosenIdx(idx);

    const choice = currentStep.choices[idx];
    const newConnection = Math.max(0, connection + CONNECTION_DELTA[choice.style]);
    setConnection(newConnection);
    setNpcEmoji(choice.npcEmoji);

    if (voiceOut) {
      Speech.stop();
      Speech.speak(choice.textEN, { language: 'en-US', rate: 1.0, pitch: 1.0 });
    }

    setChatHistory(prev => [...prev, {
      id: `player-${stepIdx}`,
      type: 'player',
      textEN: choice.textEN,
      style: choice.style,
    }]);

    if (haptics) {
      choice.style === 'casual'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : choice.style === 'awkward'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (newConnection <= 0) {
      setPhase('gameover');
      if (voiceOut) Speech.speak(dialog.gameOverEN, NPC_SPEECH_OPTS);
      return;
    }

    setPhase('feedback');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const showTooltip = (entry: { phrase: string; explanationRU: string; explanationUK: string }) => {
    setTooltip(entry);
    Animated.spring(tooltipAnim, { toValue: 1, useNativeDriver: true, tension: 150, friction: 8 }).start();
  };

  const hideTooltip = () => {
    Animated.timing(tooltipAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setTooltip(null));
  };

  const handleNext = () => {
    if (phase !== 'feedback' || chosenIdx === null) return;
    const choice = currentStep.choices[chosenIdx];

    setSocialScores(prev => [...prev, choice.socialScore]);

    if (isLastStep) {
      finishDialog([...socialScores, choice.socialScore]);
      return;
    }

    const nextStep = dialog.steps[stepIdx + 1];
    if (nextStep) {
      setChatHistory(prev => [...prev, {
        id: `npc-${stepIdx + 1}`,
        type: 'npc',
        textEN: nextStep.npcTextEN,
        textRU: isUK ? nextStep.npcTextUK : nextStep.npcTextRU,
        emoji: nextStep.npcEmojiDefault ?? dialog.npcEmojiDefault,
      }]);
    }
    setStepIdx(i => i + 1);
    setChosenIdx(null);
    setChoiceOrder([0, 1, 2]);
    setNpcEmoji(dialog.steps[stepIdx + 1]?.npcEmojiDefault ?? dialog.npcEmojiDefault);
    setPhase('choosing');
    setTooltip(null);
    tooltipAnim.setValue(0);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const finishDialog = async (scores: number[]) => {
    setPhase('result');
    Speech.stop();

    // Calculate final score: avg of non-final steps + final delta
    const regularScores = scores.slice(0, scores.length - 1);
    const finalDelta = scores[scores.length - 1] ?? 0;
    const avg = regularScores.length > 0
      ? regularScores.reduce((a, b) => a + b, 0) / regularScores.length
      : 50;
    const score = Math.max(0, Math.round(avg + finalDelta));
    setFinalScore(score);

    const ending = dialog.endings.find(e => score >= e.minScore && score <= e.maxScore)
      ?? dialog.endings[dialog.endings.length - 1];

    // Save progress
    const saved = await AsyncStorage.getItem('dialogs_completed');
    let list: string[] = [];
    if (saved) { try { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) list = parsed; } catch {} }
    if (!list.includes(dialog.id)) {
      list.push(dialog.id);
      await AsyncStorage.setItem('dialogs_completed', JSON.stringify(list));
    }
    // Save score for colored border in list
    const savedScores = await AsyncStorage.getItem('dialogs_scores');
    let scoreMap: Record<string, number> = {};
    if (savedScores) { try { const parsed = JSON.parse(savedScores); if (parsed && typeof parsed === 'object') scoreMap = parsed; } catch {} }
    scoreMap[dialog.id] = score;
    await AsyncStorage.setItem('dialogs_scores', JSON.stringify(scoreMap));
    if (ending.xpReward > 0) {
      const name = await AsyncStorage.getItem('user_name');
      if (name) { await registerXP(ending.xpReward, 'dialog_complete', name, lang); }
    }
    checkAchievements({ type: 'dialog', totalCompleted: list.length, totalDialogs: DIALOGS.length }).catch(() => {});
    await updateTaskProgress('daily_active', 1);
  };

  if (showGlossary) {
    return <GlossaryScreen dialog={dialog} onBack={() => setShowGlossary(false)} />;
  }

  // ── Result ──
  if (phase === 'result') {
    const ending = dialog.endings.find(e => finalScore >= e.minScore && finalScore <= e.maxScore)
      ?? dialog.endings[dialog.endings.length - 1];

    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 72 }}>{ending.icon}</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '800', textAlign: 'center' }}>{ending.titleRU}</Text>
            <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.border, width: '100%' }}>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 24, textAlign: 'center' }}>
                {isUK ? ending.storyUK : ending.storyRU}
              </Text>
            </View>
            {ending.xpReward > 0 && (
              <View style={{ backgroundColor: '#F5A62322', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: '#F5A62366' }}>
                <Text style={{ color: '#F5A623', fontSize: f.h2, fontWeight: '800' }}>+{ending.xpReward} XP</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setShowGlossary(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.bgCard, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 0.5, borderColor: t.border }}
            >
              <Ionicons name="book-outline" size={20} color={t.textSecond} />
              <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
                {isUK ? '📖 Глосарій' : '📖 Глоссарий'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onBack}
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, alignItems: 'center', width: '100%' }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                {isUK ? 'Назад до діалогів' : 'Назад к диалогам'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Game Over ──
  if (phase === 'gameover') {
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 }}>
            <Text style={{ fontSize: 72 }}>💔</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
              {isUK ? 'Зв\'язок втрачено' : 'Связь потеряна'}
            </Text>
            <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.border }}>
              <Text style={{ color: t.textGhost, fontSize: f.sub, fontStyle: 'italic', textAlign: 'center', marginBottom: 8 }}>{dialog.npcName}:</Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, textAlign: 'center', fontStyle: 'italic' }}>
                "{isUK ? dialog.gameOverUK : dialog.gameOverRU}"
              </Text>
            </View>
            <TouchableOpacity
              onPress={onBack}
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14 }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                {isUK ? 'Спробувати знову' : 'Попробовать снова'}
              </Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Active Dialog ──
  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{isUK ? dialog.titleUK : dialog.titleRU}</Text>
          </View>
          {/* NPC emoji dynamic */}
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 24 }}>{npcEmoji}</Text>
          </View>
        </View>

        {/* Connection bar */}
        <ConnectionBar value={connection} t={t} f={f} />

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {/* Chat history */}
          {chatHistory.map(msg => {
            if (msg.type === 'npc') {
              return (
                <View key={msg.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <Text style={{ fontSize: 20 }}>{msg.emoji ?? dialog.npcEmojiDefault}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: t.bgCard, borderRadius: 16, borderBottomLeftRadius: 4, padding: 14, borderWidth: 0.5, borderColor: t.border, maxWidth: '80%' }}>
                    <Text style={{ color: t.textGhost, fontSize: f.caption, fontWeight: '700', marginBottom: 4 }}>{dialog.npcName}</Text>
                    {renderNPCText(msg.textEN.replace(/\[Name\]/gi, userName || 'you'), dialog.glossary, isUK, showTooltip, { color: t.textPrimary, fontSize: f.body, lineHeight: 22 })}
                    {msg.textRU && (
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, fontStyle: 'italic' }}>{msg.textRU}</Text>
                    )}
                  </View>
                </View>
              );
            } else {
              const styleColor = msg.style ? STYLE_COLOR[msg.style] : t.accent;
              return (
                <View key={msg.id} style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                  <View style={{ backgroundColor: t.accent + '22', borderRadius: 16, borderBottomRightRadius: 4, padding: 12, borderWidth: 1, borderColor: styleColor + '60', maxWidth: '80%' }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', lineHeight: 20 }}>{msg.textEN}</Text>
                  </View>
                </View>
              );
            }
          })}

          {/* Feedback for last player choice */}
          {phase === 'feedback' && chosenIdx !== null && (() => {
            const chosen = currentStep.choices[chosenIdx];
            const styleColor = STYLE_COLOR[chosen.style];
            return (
              <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
                <View style={{ maxWidth: '80%', alignItems: 'flex-end', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 32 }}>{npcEmoji}</Text>
                    <View style={{ backgroundColor: styleColor + '22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: styleColor + '60' }}>
                      <Text style={{ color: styleColor, fontSize: f.caption, fontWeight: '700' }}>{STYLE_LABEL[chosen.style]}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: t.bgCard, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: styleColor + '40', alignSelf: 'flex-end', maxWidth: '100%' }}>
                    <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: 18 }}>
                      {(isUK ? chosen.impactUK : chosen.impactRU).replace(/^[🟢🔴🟡🟠⚫🟤🔵🟣]\s*/u, '')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleNext}
                    style={{ backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 11, marginTop: 4 }}
                  >
                    <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                      {isLastStep ? (isUK ? 'Завершити' : 'Завершить') : (isUK ? 'Далі →' : 'Далее →')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}

          {/* Choices */}
          {phase === 'choosing' && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {choiceOrder.map((originalIdx, visualPos) => {
                const choice = currentStep.choices[originalIdx];
                return (
                  <TouchableOpacity
                    key={visualPos}
                    onPress={() => handleChoice(originalIdx)}
                    activeOpacity={0.75}
                    style={{ borderRadius: 18, borderWidth: 0.5, borderColor: t.border, backgroundColor: t.bgCard, paddingHorizontal: 16, paddingVertical: 12 }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', lineHeight: 21 }}>{choice.textEN}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </ContentWrap>

      {/* Tooltip overlay — floats above everything */}
      {tooltip && (
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={hideTooltip}
        >
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 140,
              left: 16,
              right: 16,
              backgroundColor: t.bgCard,
              borderRadius: 16,
              padding: 16,
              borderWidth: 0.5,
              borderColor: t.accent + '60',
              transform: [
                { scale: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                { translateY: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ],
              opacity: tooltipAnim,
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>
              {tooltip.phrase}
            </Text>
            <Text style={{ color: t.textSecond ?? '#A0B8A8', fontSize: 13, lineHeight: 19 }}>
              {isUK ? tooltip.explanationUK : tooltip.explanationRU}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => Speech.speak(tooltip.phrase, NPC_SPEECH_OPTS)}>
                <Ionicons name="volume-medium-outline" size={20} color={t.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={hideTooltip}>
                <Ionicons name="close-circle-outline" size={20} color={t.textMuted ?? '#607870'} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}

// ── Main Entry ────────────────────────────────────────────────────────────────
export default function DialogsScreen() {
  const [screen, setScreen] = useState<'list' | 'rolecard' | 'game'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = selectedId ? getDialogById(selectedId) : null;

  if (screen === 'rolecard' && dialog) {
    return (
      <RoleCard
        dialog={dialog}
        onStart={() => setScreen('game')}
        onBack={() => { setScreen('list'); setSelectedId(null); }}
      />
    );
  }

  if (screen === 'game' && dialog) {
    return (
      <GameScreen
        dialog={dialog}
        onBack={() => { setScreen('list'); setSelectedId(null); }}
      />
    );
  }

  return (
    <DialogList
      onSelect={id => { setSelectedId(id); setScreen('rolecard'); }}
    />
  );
}
