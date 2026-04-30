import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticError, hapticLightImpact, hapticMediumImpact, hapticSuccess } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import PremiumCard from '../components/PremiumCard';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { checkAchievements } from './achievements';
import { ChoiceStyle, DIALOGS, DialogChoice3, DialogEnding3, DialogScenario3, GlossaryEntry, getDialogById } from './dialogs_data';
import { loadSettings } from './settings_edu';
import { registerXP } from './xp_manager';
import ReportErrorButton from '../components/ReportErrorButton';

const NPC_SPEECH_RATE = 0.9;
const NPC_SPEECH_PITCH = 1.0;
const TYPEWRITER_MS = 25;           // 25ms/char as per spec
const LONG_PRESS_MS = 400;          // flip trigger
const CARDS_STAGGER_MS = 70;        // delay between each card spring-in
const CARDS_DELAY_AFTER_TYPING_MS = 300;
const FLIP_AUTO_RESET_MS = 2000;    // auto flip-back after 2s
const HINT_WAVE_INTERVAL_MS = 5000; // highlight random word every 5s
const HINT_XP_PENALTY = 3;

const CONNECTION_DELTA: Record<ChoiceStyle, number> = {
  casual: 10,
  textbook: 0,
  awkward: -25,
};

const STYLE_COLOR: Record<ChoiceStyle, string> = {
  textbook: '#6B9FD4',
  casual: '#4CAF72',
  awkward: '#E06060',
};

// ── ES copy (escenarios sin campos ES en dialogs_data) ────────────────────────
const DIALOG_META_ES: Record<string, { title: string; role: string; goal: string; gameOver: string; setting: string }> = {
  dinner_001: {
    title: 'Cena en casa de un amigo',
    role: 'Has ido a cenar a casa de un amigo. Su hermana Sarah te recibe en la puerta.',
    goal: 'Dar una buena impresión',
    gameOver: 'Creo que debo mirar la cocina… con permiso.',
    setting: 'Una probadita de hospitalidad — Brighton, casa particular',
  },
};

const GLOSSARY_ES: Record<string, { explanation: string; context?: string }> = {
  'make it': {
    explanation: 'poder venir o asistir (a un plan)',
    context: 'Se usa cuando alguien consigue acudir pese a los compromisos',
  },
  'make yourself at home': {
    explanation: 'siéntete como en casa',
    context: 'Fórmula habitual del anfitrión para que el invitado se relaje',
  },
  'home-cooked': {
    explanation: 'casero / hecho en casa',
    context: 'Opuesto a comida de restaurante o ultraprocesada',
  },
  experimental: {
    explanation: 'atrevido / de prueba',
    context: 'Con comida: «estoy probando una receta nueva, no me juzgues»',
  },
  heavenly: {
    explanation: 'divino (riquísimo)',
    context: 'Halago muy fuerte, más intenso que «delicious»',
  },
  'healthy appetite': {
    explanation: 'buen apetito',
    context: 'Forma educada de decir que disfruta la comida',
  },
  'second helping': {
    explanation: 'repetir / una segunda ración',
    context: 'Pedir repetir es un gran halago a la anfitriona en cultura británica',
  },
  yummy: {
    explanation: 'riquísimo / para chuparse los dedos',
    context: 'Palabra cercana y sincera para elogiar la comida',
  },
  resist: {
    explanation: 'resistirse',
    context: '«I can\'t resist»: es tan bueno que no puedes decir que no',
  },
};

const CHOICE_CARD_ES: Record<string, { line: string; impact: string }> = {
  'Thank you! You have a lovely home. Water is fine for me.': {
    line: '¡Gracias! Tienes una casa preciosa. Para mí, con agua basta.',
    impact: '¡Buen arranque! Sarah sonríe.',
  },
  'Yes, I am here. Give me some juice if you have it, please.': {
    line: 'Sí, aquí estoy. Si tienes, un zumo, por favor.',
    impact: 'Neutral. Sin más.',
  },
  'I am late because of the traffic. I will take any alcohol.': {
    line: 'Llegué tarde por el tráfico. Cualquier bebida con alcohol me vale.',
    impact: 'Sarah está un poco desconcertada. Ve con cuidado.',
  },
  "I love trying new things! I'm sure it tastes heavenly.": {
    line: '¡Me encanta probar cosas nuevas! Seguro que está riquísimo.',
    impact: '¡Sarah está encantada! Nota tu sinceridad.',
  },
  'I like home food. I hope it is not very spicy for me.': {
    line: 'Me gusta la comida casera. Espero que no pique demasiado.',
    impact: 'Sarah asiente. Todo bien.',
  },
  'I usually eat in restaurants. I hope I will like your cooking.': {
    line: 'Suelo comer en restaurantes. Espero que me guste lo que has cocinado.',
    impact: 'Momento incómodo. Sarah disimula.',
  },
  "It's so yummy, I can't resist! Just a small portion, please.": {
    line: '¡Está tan rico que no me puedo resistir! Solo una porción pequeña, por favor.',
    impact: '¡Sarah brilla! Pedir repetir es el mejor halago al cocinero.',
  },
  'Yes, I want more. Please give me one more plate of this food.': {
    line: 'Sí, quiero más. ¿Me sirves otro plato de esto, por favor?',
    impact: 'Correcto, pero un poco rígido. Sarah está contenta.',
  },
  'I am very full. My stomach hurts a bit. No more food, thanks.': {
    line: 'He comido demasiado. Me duele un poco el estómago. No más, gracias.',
    impact: 'Quejarse del cuerpo en la mesa es tabú en el protocolo británico.',
  },
};

const DINNER_ENDINGS_ES: Record<string, { title: string; story: string }> = {
  '70-100': {
    title: 'El invitado perfecto',
    story:
      'Te han acogido de verdad como «uno más». Sarah disfruta tu naturalidad: elogiaste su cocina (¡heavenly!), pediste repetir y sonaste auténtico. Antes de irte te da la receta del plato «experimental» y te invita al brunch del domingo en familia.',
  },
  '40-69': {
    title: 'El desconocido educado',
    story:
      'La cena pasó sin incidentes, pero fría. Fuiste muy correcto, pero tus frases sonaban a manual. Sarah valoró el esfuerzo, pero notó distancia. Os despedisteis con cortesía. Consejo: no temas palabras con carga emotiva — yummy, lovely, heavenly. Te hacen sonar más vivo ante un nativo.',
  },
  '0-39': {
    title: 'El desastre social',
    story:
      'La velada terminó demasiado pronto. Tu retraso y las quejas físicas en la mesa crisparon el ambiente. Lo de que «solo comes en restaurantes» sonó a crítica velada a la cocina de Sarah. Ella mencionó un dolor de cabeza y cerró la cena a los 40 minutos. Recuerda: quejas personales de salud y comparar la comida casera con un restaurante son tabú en el protocolo británico.',
  },
};

function dialogTitle(lang: Lang, d: DialogScenario3): string {
  if (lang === 'es') return DIALOG_META_ES[d.id]?.title ?? d.titleRU;
  return lang === 'uk' ? d.titleUK : d.titleRU;
}

function dialogRole(lang: Lang, d: DialogScenario3): string | undefined {
  const ru = d.roleRU;
  const uk = d.roleUK;
  if (lang === 'es') return DIALOG_META_ES[d.id]?.role ?? ru;
  return lang === 'uk' ? uk : ru;
}

function dialogGoal(lang: Lang, d: DialogScenario3): string | undefined {
  const ru = d.goalRU;
  const uk = d.goalUK;
  if (lang === 'es') return DIALOG_META_ES[d.id]?.goal ?? ru;
  return lang === 'uk' ? uk : ru;
}

function dialogGameOverLine(lang: Lang, d: DialogScenario3): string {
  if (lang === 'es') return DIALOG_META_ES[d.id]?.gameOver ?? d.gameOverRU;
  return lang === 'uk' ? d.gameOverUK : d.gameOverRU;
}

function dialogSetting(lang: Lang, d: DialogScenario3): string {
  if (lang === 'es') return DIALOG_META_ES[d.id]?.setting ?? d.setting;
  return d.setting;
}

function glossaryExplanation(lang: Lang, g: GlossaryEntry): string {
  const es = GLOSSARY_ES[g.phrase]?.explanation;
  return triLang(lang, { ru: g.explanationRU, uk: g.explanationUK, es: es ?? g.explanationRU });
}

function glossaryContext(lang: Lang, g: GlossaryEntry): string | undefined {
  const es = GLOSSARY_ES[g.phrase]?.context;
  const ru = g.contextRU;
  const uk = g.contextUK;
  if (lang === 'es') return es ?? ru;
  return lang === 'uk' ? uk : ru;
}

function choiceCardLine(lang: Lang, choice: DialogChoice3): string {
  const ru = choice.textRU ?? choice.impactRU ?? '';
  const uk = choice.textUK ?? choice.impactUK ?? '';
  const es = CHOICE_CARD_ES[choice.textEN]?.line ?? ru;
  return triLang(lang, { ru, uk, es });
}

function choiceImpactLine(lang: Lang, choice: DialogChoice3): string {
  const es = CHOICE_CARD_ES[choice.textEN]?.impact ?? choice.impactRU;
  return triLang(lang, { ru: choice.impactRU, uk: choice.impactUK, es });
}

function endingLocalized(lang: Lang, _dialogId: string, e: DialogEnding3): { title: string; story: string } {
  if (lang === 'es') {
    const tier = DINNER_ENDINGS_ES[`${e.minScore}-${e.maxScore}`];
    if (tier) return tier;
  }
  return {
    title: lang === 'uk' ? e.titleUK : e.titleRU,
    story: lang === 'uk' ? e.storyUK : e.storyRU,
  };
}

// ── Segmented Progress Dots ───────────────────────────────────────────────────
function SegmentedProgress({ total, current }: { total: number; current: number }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.7, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [current, pulseAnim]);

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        const active = i === current;
        const dot = (
          <View
            style={{
              width: active ? 10 : done ? 8 : 6,
              height: active ? 10 : done ? 8 : 6,
              borderRadius: 5,
              backgroundColor: done ? '#5B9BD5' : active ? '#7EC8E3' : 'rgba(255,255,255,0.12)',
            }}
          />
        );
        if (active) {
          return (
            <Animated.View key={i} style={{ transform: [{ scale: pulseAnim }] }}>
              {dot}
            </Animated.View>
          );
        }
        return <View key={i}>{dot}</View>;
      })}
    </View>
  );
}

// ── Relationship Scale (5 segments + flash on +, shake on −) ─────────────────
function RelationshipScale({ value, lastDelta, version }: { value: number; lastDelta: number; version: number }) {
  const shakeX = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (version === 0) return;
    if (lastDelta > 0) {
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } else if (lastDelta < 0) {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -5, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 5, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]).start();
    }
  }, [version, lastDelta, flashOpacity, shakeX]);

  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round(clamped / 20);
  const segColor =
    clamped >= 80 ? '#F5832A' :
    clamped >= 60 ? '#F0A040' :
    clamped >= 40 ? '#AAAAAA' : '#E06060';
  const flashColor = lastDelta >= 0 ? 'rgba(71,200,112,0.85)' : 'rgba(224,96,96,0.85)';

  return (
    <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{ position: 'relative' }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < filled ? segColor : 'rgba(255,255,255,0.1)' }} />
            {i < filled && (
              <Animated.View style={{ position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: flashColor, opacity: flashOpacity }} />
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Dialog List ───────────────────────────────────────────────────────────────
function DialogList({ onSelect }: { onSelect: (id: string) => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
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
              {triLang(lang, { ru: 'Диалоги', uk: 'Діалоги', es: 'Diálogos' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
              {triLang(lang, {
                ru: 'Отработай социальные навыки',
                uk: 'Відпрацюй соціальні навички',
                es: 'Practica habilidades sociales',
              })}
            </Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {DIALOGS.length === 0 && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 20 }}>🚧</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
                {triLang(lang, {
                  ru: 'Диалоги временно недоступны',
                  uk: 'Діалоги тимчасово недоступні',
                  es: 'Los diálogos no están disponibles por ahora',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, textAlign: 'center', lineHeight: 22 }}>
                {triLang(lang, {
                  ru: 'Попробуй открыть раздел чуть позже или вернись на главную.',
                  uk: 'Спробуй відкрити розділ трохи пізніше або повернись на головну.',
                  es: 'Vuelve a intentarlo más tarde o regresa al inicio.',
                })}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/(tabs)/home' as any)}
                style={{ marginTop: 20, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: t.textSecond, fontSize: f.sub, textDecorationLine: 'underline' }}>
                  {triLang(lang, { ru: 'Вернуться на главную', uk: 'Повернутися на головну', es: 'Volver al inicio' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{dialogTitle(lang, dialog)}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }} numberOfLines={1}>{dialogSetting(lang, dialog)}</Text>
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

// ── Role Card (Intro) ─────────────────────────────────────────────────────────
function RoleCard({ dialog, onStart, onBack }: { dialog: DialogScenario3; onStart: () => void; onBack: () => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#152019' }}>
      <LinearGradient colors={['#1D2D23', '#152019']} style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
            <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color="#F0F7F2" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 72, textAlign: 'center', marginTop: 16, marginBottom: 20 }}>{dialog.emoji}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              {dialogGoal(lang, dialog) ? (
                <View style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: '#F0F7F2', fontSize: 12 }}>🎯 {dialogGoal(lang, dialog)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: '#F0F7F2', fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 24, marginBottom: 10 }} numberOfLines={2}>
              {dialogSetting(lang, dialog)}
            </Text>
            {dialogRole(lang, dialog) ? (
              <Text style={{ color: t.textSecond, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 }} numberOfLines={3}>
                {dialogRole(lang, dialog)}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={onStart}
              style={{ backgroundColor: '#47C870', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', width: '100%' }}
            >
              <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Начать', uk: 'Почати', es: 'Empezar' })}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </ContentWrap>
      </LinearGradient>
    </SafeAreaView>
  );
}

// ── Glossary Screen ───────────────────────────────────────────────────────────
function GlossaryScreen({ dialog, onBack }: { dialog: DialogScenario3; onBack: () => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [expanded, setExpanded] = useState<string | null>(null);
  const scaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  const [pulseIdx, setPulseIdx] = useState<number>(-1);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseSeen = useRef(false);

  const getScale = (phrase: string) => {
    if (!scaleAnims[phrase]) scaleAnims[phrase] = new Animated.Value(1);
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
  }, [dialog.glossary.length, pulseAnim]);

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
            {triLang(lang, { ru: 'Глоссарий', uk: 'Глосарій', es: 'Glosario' })}
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
                    <TouchableOpacity onPress={() => handleTileTap(item.phrase)} activeOpacity={0.85} style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.accent }}>
                      <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{item.phrase}</Text>
                      <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: 20 }}>{glossaryExplanation(lang, item)}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
                i += 1;
              } else {
                const itemB = items[i + 1];
                const isExpB = itemB ? expanded === itemB.phrase : false;
                if (itemB && !isExpB) {
                  const idxA = i; const idxB = i + 1;
                  rows.push(
                    <View key={`row-${i}`} style={{ flexDirection: 'row' }}>
                      {([item, itemB] as const).map((tile, pairPos) => {
                        const tileIdx = pairPos === 0 ? idxA : idxB;
                        const tileScale = getScale(tile.phrase);
                        const expl = glossaryExplanation(lang, tile);
                        const preview = expl.split(' ').slice(0, 3).join(' ');
                        const inner = (
                          <Animated.View key={tile.phrase} style={{ flex: 1, transform: [{ scale: tileScale }], margin: 4 }}>
                            <TouchableOpacity onPress={() => handleTileTap(tile.phrase)} activeOpacity={0.85} style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', minHeight: 72 }}>
                              <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>{tile.phrase}</Text>
                              <Text style={{ color: t.textMuted, fontSize: 11 }} numberOfLines={1}>{preview}…</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        );
                        if (tileIdx === pulseIdx) {
                          return <Animated.View key={tile.phrase + '-pulse'} style={{ flex: 1, transform: [{ scale: pulseAnim }] }}>{inner}</Animated.View>;
                        }
                        return inner;
                      })}
                    </View>
                  );
                  i += 2;
                } else {
                  const expl = glossaryExplanation(lang, item);
                  const preview = expl.split(' ').slice(0, 3).join(' ');
                  const tileScale = getScale(item.phrase);
                  const inner = (
                    <Animated.View key={item.phrase} style={{ transform: [{ scale: tileScale }], margin: 4 }}>
                      <TouchableOpacity onPress={() => handleTileTap(item.phrase)} activeOpacity={0.85} style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', minHeight: 72 }}>
                        <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>{item.phrase}</Text>
                        <Text style={{ color: t.textMuted, fontSize: 11 }} numberOfLines={1}>{preview}…</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                  if (i === pulseIdx) {
                    rows.push(<Animated.View key={item.phrase + '-pulse'} style={{ transform: [{ scale: pulseAnim }], margin: 4 }}>{inner}</Animated.View>);
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

// ── Breathing glossary word (Duolingo-style bold + animated underline) ────────
function GlossaryWord({ entry, isHint, onTap }: { entry: GlossaryEntry; isHint: boolean; onTap: () => void }) {
  const underlineH = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(underlineH, { toValue: 2.5, duration: 600, useNativeDriver: false }),
        Animated.timing(underlineH, { toValue: 1, duration: 1400, useNativeDriver: false }),
      ]),
      { iterations: -1 }
    );
    // Start breathing at offset so words don't all pulse together
    const delay = Math.floor(Math.random() * 3000);
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [underlineH]);

  return (
    <Text onPress={onTap}>
      <Text
        style={{
          color: isHint ? '#7EC8E3' : '#2b70c9',
          fontWeight: '700',
          textDecorationLine: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: isHint ? '#7EC8E3' : '#2b70c9',
        }}
      >
        {entry.phrase}
      </Text>
    </Text>
  );
}

// ── NPC Text Renderer ─────────────────────────────────────────────────────────
function renderNPCText(
  text: string,
  glossary: GlossaryEntry[],
  _isUK: boolean,
  onWordTap: (entry: GlossaryEntry) => void,
  textStyle: object,
  activeHintPhrase?: string,
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
    <Text style={[textStyle, { fontSize: 18, fontWeight: '600', lineHeight: 28 }]}>
      {parts.map((p, i) =>
        p.entry ? (
          <GlossaryWord
            key={i}
            entry={p.entry}
            isHint={activeHintPhrase === p.entry.phrase}
            onTap={() => onWordTap(p.entry!)}
          />
        ) : (
          <Text key={i} style={{ color: '#F0F7F2' }}>{p.str}</Text>
        )
      )}
    </Text>
  );
}

// ── Flip Card ─────────────────────────────────────────────────────────────────
interface FlipCardProps {
  textEN: string;
  textTranslation: string;
  isSelected: boolean;
  selectedColor: string;
  isDisabled: boolean;
  onTap: () => void;
  onFlip: () => void;
  entryAnim: Animated.Value;
  theme: any;
  f: any;
  showHoldHint?: boolean;
}

function FlipCard({ textEN, textTranslation, isSelected, selectedColor, isDisabled, onTap, onFlip, entryAnim, theme: t, f, showHoldHint }: FlipCardProps) {
  const { lang } = useLang();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const isFlippedRef = useRef(false);
  const autoFlipBackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdHintOpacity = useRef(new Animated.Value(showHoldHint ? 1 : 0)).current;
  const holdHintScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showHoldHint) return;
    // Pulse then fade out after 1s
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(holdHintScale, { toValue: 1.25, duration: 400, useNativeDriver: true }),
        Animated.timing(holdHintScale, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    const t = setTimeout(() => {
      pulse.stop();
      Animated.timing(holdHintOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 1200);
    return () => { clearTimeout(t); pulse.stop(); };
  }, [showHoldHint, holdHintOpacity, holdHintScale]);

  useEffect(() => () => { if (autoFlipBackRef.current) clearTimeout(autoFlipBackRef.current); }, []);

  // Entry slide-up from parent spring value
  const entryTranslateY = entryAnim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] });

  // Flip interpolations
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0, 0, 1, 1] });
  const frontRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate   = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const handlePressIn  = () => { if (!isDisabled) Animated.timing(pressScale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start(); };
  const handlePressOut = () => Animated.timing(pressScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();

  const handleLongPress = () => {
    if (isDisabled || isFlippedRef.current) return;
    isFlippedRef.current = true;
    onFlip();
    void hapticMediumImpact();
    // Spring physics with slight overshoot
    Animated.spring(flipAnim, { toValue: 1, tension: 70, friction: 5, useNativeDriver: true }).start();
    // Auto flip-back after 2s
    autoFlipBackRef.current = setTimeout(() => {
      Animated.spring(flipAnim, { toValue: 0, tension: 70, friction: 6, useNativeDriver: true }).start(() => {
        isFlippedRef.current = false;
      });
    }, FLIP_AUTO_RESET_MS);
  };

  const borderColor = isSelected ? selectedColor : 'rgba(255,255,255,0.08)';
  const bgColor = isSelected ? selectedColor + '28' : 'rgba(255,255,255,0.05)';

  return (
    <Animated.View style={{ flex: 1, opacity: entryAnim, transform: [{ translateY: entryTranslateY }, { scale: pressScale }] }}>
    <Pressable
      onPress={isDisabled ? undefined : onTap}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={LONG_PRESS_MS}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Front */}
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: bgColor,
            borderRadius: 16,
            borderWidth: isSelected ? 1.5 : 0.5,
            borderColor,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: frontOpacity,
            transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
          }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600', textAlign: 'center', lineHeight: 21 }}>
            {textEN}
          </Text>
        </Animated.View>
        {/* Hold hint overlay */}
        {showHoldHint && (
          <Animated.View style={{ position: 'absolute', top: 6, right: 8, opacity: holdHintOpacity, transform: [{ scale: holdHintScale }], zIndex: 10 }}>
            <View style={{ backgroundColor: 'rgba(43,112,201,0.85)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11 }}>👆</Text>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{triLang(lang, { ru: 'Удерживай', uk: 'Утримуй', es: 'Mantén pulsado' })}</Text>
            </View>
          </Animated.View>
        )}
        {/* Back (translation) */}
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(91,155,213,0.12)',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(91,155,213,0.35)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: backOpacity,
            transform: [{ perspective: 1200 }, { rotateY: backRotate }],
          }}
        >
          <Text style={{ color: '#7EC8E3', fontSize: f.sub, fontWeight: '500', textAlign: 'center', lineHeight: 19, fontStyle: 'italic' }}>
            {textTranslation || '—'}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
    </Animated.View>
  );
}

// ── Game Screen ───────────────────────────────────────────────────────────────
function GameScreen({ dialog, onBack }: { dialog: DialogScenario3; onBack: () => void }) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [speechRate, setSpeechRate] = useState(NPC_SPEECH_RATE);

  const [stepIdx, setStepIdx] = useState(0);
  const [connection, setConnection] = useState(50);
  const [npcEmoji, setNpcEmoji] = useState(dialog.npcEmojiDefault);
  const [phase, setPhase] = useState<'choosing' | 'feedback' | 'gameover' | 'result'>('choosing');
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);   // visual position
  const [socialScores, setSocialScores] = useState<number[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [voiceOut, setVoiceOut] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [tooltip, setTooltip] = useState<GlossaryEntry | null>(null);
  const [tappedWords, setTappedWords] = useState<GlossaryEntry[]>([]);
  const [choiceOrder, setChoiceOrder] = useState<number[]>([0, 1, 2]);
  const [hintCount, setHintCount] = useState(0);
  const [showGlossary, setShowGlossary] = useState(false);
  const [wordsSaved, setWordsSaved] = useState(false);

  // Gauge animation triggers
  const [gaugeVersion, setGaugeVersion] = useState(0);
  const [lastConnectionDelta, setLastConnectionDelta] = useState(0);

  // Hint wave
  const [activeHintPhrase, setActiveHintPhrase] = useState('');

  // First-session onboarding
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [firstFlipDone, setFirstFlipDone] = useState(false);
  const [flipHintCard] = useState(() => Math.floor(Math.random() * 3)); // which card shows hold hint

  // Typewriter + sequenced reveal
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Animation refs
  const cardEntryAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const avatarOpacity = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  // Timer refs
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardsRevealRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs
  const isMounted = useRef(true);
  const stepIdxRef = useRef(stepIdx);
  stepIdxRef.current = stepIdx;

  const currentStep = dialog.steps[stepIdx];
  const isLastStep = !!currentStep?.isFinalStep;

  // Init
  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n && isMounted.current) setUserName(n); });
    AsyncStorage.getItem('dialogs_tutorial_done').then(v => { if (!v && isMounted.current) setIsFirstVisit(true); });
    loadSettings().then(s => {
      if (isMounted.current) {
        setVoiceOut(s.voiceOut ?? true);
        setHaptics(s.haptics);
        setSpeechRate(s.speechRate ?? NPC_SPEECH_RATE);
      }
    });
    return () => {
      isMounted.current = false;
      stopAudio();
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  // Shuffle choices on step change
  useEffect(() => {
    const order = [0, 1, 2];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setChoiceOrder([...order]);
  }, [stepIdx]);

  // ── Sequenced typewriter + card reveal ──
  useEffect(() => {
    if (!currentStep || phase === 'result' || phase === 'gameover') return;

    // 0ms: hide cards instantly
    setCardsReady(false);
    cardEntryAnims.forEach(a => a.setValue(0));

    // 100ms: avatar blink cross-fade
    const avatarTimer = setTimeout(() => {
      if (!isMounted.current) return;
      Animated.sequence([
        Animated.timing(avatarOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(avatarOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }, 100);

    // 200ms: start typewriter
    const fullText = currentStep.npcTextEN.replace(/\[Name\]/gi, userName || 'you');
    setDisplayedText('');
    setIsTyping(true);
    if (typewriterRef.current) clearInterval(typewriterRef.current);

    const twStart = setTimeout(() => {
      if (!isMounted.current) return;
      // Sync audio: start TTS together with typewriter
      if (voiceOut) {
        setIsAudioPlaying(true);
        speakAudio(fullText, speechRate, {
          pitch: NPC_SPEECH_PITCH,
          onDone: () => { if (isMounted.current) setIsAudioPlaying(false); },
          onStopped: () => { if (isMounted.current) setIsAudioPlaying(false); },
          onError: () => { if (isMounted.current) setIsAudioPlaying(false); },
        });
      }
      let idx = 0;
      typewriterRef.current = setInterval(() => {
        if (!isMounted.current) { clearInterval(typewriterRef.current!); return; }
        idx++;
        setDisplayedText(fullText.slice(0, idx));
        if (idx >= fullText.length) {
          clearInterval(typewriterRef.current!);
          typewriterRef.current = null;
          setIsTyping(false);
          // After typing done + 300ms: spring in cards (staggered)
          cardsRevealRef.current = setTimeout(() => {
            if (!isMounted.current) return;
            setCardsReady(true);
            [0, 1, 2].forEach(i => {
              setTimeout(() => {
                if (!isMounted.current) return;
                Animated.spring(cardEntryAnims[i], {
                  toValue: 1, tension: 85, friction: 6, useNativeDriver: true,
                }).start();
              }, i * CARDS_STAGGER_MS);
            });
          }, CARDS_DELAY_AFTER_TYPING_MS);
        }
      }, TYPEWRITER_MS);
    }, 200);

    return () => {
      clearTimeout(avatarTimer);
      clearTimeout(twStart);
      if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
      if (cardsRevealRef.current) { clearTimeout(cardsRevealRef.current); cardsRevealRef.current = null; }
      // Halt any ongoing TTS to prevent overlap with the next step's utterance.
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, userName, currentStep, phase, voiceOut, speechRate]);

  // ── Hint wave (highlight random glossary word every 5s) ──
  useEffect(() => {
    if (isTyping || phase !== 'choosing' || !currentStep) {
      if (hintIntervalRef.current) { clearInterval(hintIntervalRef.current); hintIntervalRef.current = null; }
      setActiveHintPhrase('');
      return;
    }
    const words = dialog.glossary.filter(g =>
      currentStep.npcTextEN.toLowerCase().includes(g.phrase.toLowerCase())
    );
    if (words.length === 0) return;
    let idx = 0;
    hintIntervalRef.current = setInterval(() => {
      if (!isMounted.current) return;
      setActiveHintPhrase(words[idx % words.length].phrase);
      idx++;
      setTimeout(() => { if (isMounted.current) setActiveHintPhrase(''); }, 1100);
    }, HINT_WAVE_INTERVAL_MS);
    return () => {
      if (hintIntervalRef.current) { clearInterval(hintIntervalRef.current); hintIntervalRef.current = null; }
      setActiveHintPhrase('');
    };
  }, [stepIdx, isTyping, phase, currentStep, dialog.glossary]);

  const revealCards = () => {
    setCardsReady(true);
    [0, 1, 2].forEach(i => {
      setTimeout(() => {
        if (!isMounted.current) return;
        Animated.spring(cardEntryAnims[i], { toValue: 1, tension: 85, friction: 6, useNativeDriver: true }).start();
      }, i * CARDS_STAGGER_MS);
    });
  };

  const skipTypewriter = () => {
    if (!isTyping || !currentStep) return;
    if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
    if (cardsRevealRef.current) { clearTimeout(cardsRevealRef.current); cardsRevealRef.current = null; }
    const fullText = currentStep.npcTextEN.replace(/\[Name\]/gi, userName || 'you');
    setDisplayedText(fullText);
    setIsTyping(false);
    setTimeout(revealCards, CARDS_DELAY_AFTER_TYPING_MS);
  };

  const showTooltip = (entry: GlossaryEntry) => {
    setTappedWords(prev => prev.find(w => w.phrase === entry.phrase) ? prev : [...prev, entry]);
    setTooltip(entry);
    if (isFirstVisit) { setIsFirstVisit(false); AsyncStorage.setItem('dialogs_tutorial_done', '1'); }
    Animated.spring(tooltipAnim, { toValue: 1, useNativeDriver: true, tension: 160, friction: 8 }).start();
    if (haptics) void hapticLightImpact();
  };

  const hideTooltip = () => {
    Animated.timing(tooltipAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      if (isMounted.current) setTooltip(null);
    });
  };

  const transitionToNext = () => {
    if (!isMounted.current) return;
    const nextIdx = stepIdxRef.current + 1;
    const nextStep = dialog.steps[nextIdx];
    // Instant hide
    cardEntryAnims.forEach(a => a.setValue(0));
    setCardsReady(false);
    setTooltip(null);
    tooltipAnim.setValue(0);
    setActiveHintPhrase('');
    setTimeout(() => {
      if (!isMounted.current) return;
      setStepIdx(nextIdx);
      setChosenIdx(null);
      setNpcEmoji(nextStep?.npcEmojiDefault ?? dialog.npcEmojiDefault);
      setPhase('choosing');
    }, 50);
  };

  const handleChoice = (visualPos: number) => {
    if (phase !== 'choosing') return;
    // Complete typewriter immediately
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
      const fullText = currentStep.npcTextEN.replace(/\[Name\]/gi, userName || 'you');
      setDisplayedText(fullText);
      setIsTyping(false);
    }
    if (cardsRevealRef.current) { clearTimeout(cardsRevealRef.current); cardsRevealRef.current = null; }

    const originalIdx = choiceOrder[visualPos];
    const choice = currentStep.choices[originalIdx];
    stopAudio();
    setChosenIdx(visualPos);
    setPhase('feedback');

    const delta = CONNECTION_DELTA[choice.style];
    const newConnection = Math.max(0, Math.min(100, connection + delta));
    setConnection(newConnection);
    setLastConnectionDelta(delta);
    setGaugeVersion(v => v + 1);
    setNpcEmoji(choice.npcEmoji);

    // Avatar blink reaction
    Animated.sequence([
      Animated.timing(avatarOpacity, { toValue: 0.4, duration: 80, useNativeDriver: true }),
      Animated.timing(avatarOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const newScores = [...socialScores, choice.socialScore];
    setSocialScores(newScores);

    if (haptics) {
      if (choice.style === 'casual') void hapticSuccess();
      else if (choice.style === 'awkward') void hapticError();
      else void hapticLightImpact();
    }

    if (voiceOut) {
      speakAudio(choice.textEN, speechRate, { pitch: NPC_SPEECH_PITCH });
    }

    if (newConnection <= 0) {
      setPhase('gameover');
      if (voiceOut) {
        setTimeout(() => {
          speakAudio(dialog.gameOverEN, speechRate, { pitch: NPC_SPEECH_PITCH });
        }, 600);
      }
      return;
    }
    // No auto-advance — user presses Continue manually
  };

  const finishDialog = async (scores: number[]) => {
    if (!isMounted.current) return;
    setPhase('result');
    stopAudio();
    const regularScores = scores.slice(0, scores.length - 1);
    const finalDelta = scores[scores.length - 1] ?? 0;
    const avg = regularScores.length > 0
      ? regularScores.reduce((a, b) => a + b, 0) / regularScores.length
      : 50;
    const score = Math.max(0, Math.round(avg + finalDelta));
    setFinalScore(score);

    const ending = dialog.endings.find(e => score >= e.minScore && score <= e.maxScore)
      ?? dialog.endings[dialog.endings.length - 1];

    const saved = await AsyncStorage.getItem('dialogs_completed');
    let list: string[] = [];
    if (saved) { try { const p = JSON.parse(saved); if (Array.isArray(p)) list = p; } catch {} }
    if (!list.includes(dialog.id)) {
      list.push(dialog.id);
      await AsyncStorage.setItem('dialogs_completed', JSON.stringify(list));
    }
    const savedScores = await AsyncStorage.getItem('dialogs_scores');
    let scoreMap: Record<string, number> = {};
    if (savedScores) { try { const p = JSON.parse(savedScores); if (p && typeof p === 'object') scoreMap = p; } catch {} }
    scoreMap[dialog.id] = score;
    await AsyncStorage.setItem('dialogs_scores', JSON.stringify(scoreMap));

    const adjustedXP = Math.max(1, (ending?.xpReward ?? 0) - hintCount * HINT_XP_PENALTY);
    if (adjustedXP > 0) {
      AsyncStorage.getItem('user_name').then(name => {
        if (name) registerXP(adjustedXP, 'dialog_complete', name, lang).catch(() => {});
      }).catch(() => {});
    }
    checkAchievements({ type: 'dialog', totalCompleted: list.length, totalDialogs: DIALOGS.length }).catch(() => {});
  };

  const saveAllWords = async () => {
    if (tappedWords.length === 0) return;
    const raw = await AsyncStorage.getItem('saved_glossary_words');
    let saved: GlossaryEntry[] = [];
    if (raw) { try { saved = JSON.parse(raw); } catch {} }
    const toAdd = tappedWords.filter(w => !saved.find(s => s.phrase === w.phrase));
    await AsyncStorage.setItem('saved_glossary_words', JSON.stringify([...saved, ...toAdd]));
    setWordsSaved(true);
    setTimeout(() => { if (isMounted.current) setWordsSaved(false); }, 2500);
  };

  const resetForReplay = () => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (hintIntervalRef.current) clearInterval(hintIntervalRef.current);
    if (cardsRevealRef.current) clearTimeout(cardsRevealRef.current);
    cardEntryAnims.forEach(a => a.setValue(0));
    avatarOpacity.setValue(1);
    tooltipAnim.setValue(0);
    setStepIdx(0);
    setConnection(50);
    setChosenIdx(null);
    setSocialScores([]);
    setFinalScore(0);
    setTappedWords([]);
    setHintCount(0);
    setWordsSaved(false);
    setTooltip(null);
    setNpcEmoji(dialog.npcEmojiDefault);
    setPhase('choosing');
    setCardsReady(false);
    setGaugeVersion(0);
    setLastConnectionDelta(0);
    setActiveHintPhrase('');
    setDisplayedText('');
    setIsTyping(false);
  };

  // ── Glossary overlay
  if (showGlossary) {
    return <GlossaryScreen dialog={dialog} onBack={() => setShowGlossary(false)} />;
  }

  // ── Result Screen
  if (phase === 'result') {
    const ending = dialog.endings.find(e => finalScore >= e.minScore && finalScore <= e.maxScore)
      ?? dialog.endings[dialog.endings.length - 1];
    const adjustedXP = Math.max(1, (ending?.xpReward ?? 0) - hintCount * HINT_XP_PENALTY);
    const endingLoc = ending ? endingLocalized(lang, dialog.id, ending) : { title: '', story: '' };

    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16, alignItems: 'center' }}>
            {/* Badge */}
            <Text style={{ fontSize: 72, marginTop: 8 }}>{ending?.icon ?? '🏆'}</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '800', textAlign: 'center' }}>
              {endingLoc.title}
            </Text>
            <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.border, width: '100%' }}>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 24, textAlign: 'center' }}>
                {endingLoc.story}
              </Text>
            </View>

            {/* XP */}
            {adjustedXP > 0 && (
              <View style={{ backgroundColor: '#F5A62322', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: '#F5A62366' }}>
                <XpGainBadge amount={adjustedXP} visible={true} style={{ color: '#F5A623', fontSize: f.h2, fontWeight: '800' }} />
              </View>
            )}

            {/* Phrase Collection */}
            {tappedWords.length > 0 && (
              <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border, width: '100%', gap: 10 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 4 }}>
                  {triLang(lang, {
                    ru: '📚 Изученные слова',
                    uk: '📚 Вивчені слова',
                    es: '📚 Palabras del glosario',
                  })}
                </Text>
                {tappedWords.map(w => (
                  <View key={w.phrase} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <TouchableOpacity onPress={() => speakAudio(w.phrase, speechRate, { pitch: NPC_SPEECH_PITCH })} style={{ marginTop: 2 }}>
                      <Ionicons name="volume-medium-outline" size={14} color={t.accent} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>{w.phrase}</Text>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }}>
                        {glossaryExplanation(lang, w)}
                      </Text>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={saveAllWords}
                  style={{ marginTop: 6, backgroundColor: wordsSaved ? t.correct : t.accent + '22', borderRadius: 10, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: wordsSaved ? t.correct : t.accent + '55' }}
                >
                  <Text style={{ color: wordsSaved ? t.correctText : t.accent, fontSize: f.sub, fontWeight: '700' }}>
                    {wordsSaved
                      ? triLang(lang, { ru: '✓ Сохранено', uk: '✓ Збережено', es: '✓ Guardado' })
                      : triLang(lang, {
                          ru: 'Добавить всё в словарь',
                          uk: 'Додати всі в словник',
                          es: 'Guardar todo en el glosario',
                        })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Replay */}
            <TouchableOpacity
              onPress={resetForReplay}
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', width: '100%', alignItems: 'center' }}
            >
              <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang, {
                  ru: '🔄 Попробовать другой путь',
                  uk: '🔄 Спробувати інший шлях',
                  es: '🔄 Probar otro camino',
                })}
              </Text>
            </TouchableOpacity>

            {/* Glossary */}
            <TouchableOpacity
              onPress={() => setShowGlossary(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.bgCard, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 0.5, borderColor: t.border, width: '100%' }}
            >
              <Ionicons name="book-outline" size={20} color={t.textSecond} />
              <Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '600' }}>
                {triLang(lang, { ru: 'Глоссарий', uk: 'Глосарій', es: 'Glosario' })}
              </Text>
            </TouchableOpacity>

            {/* Back */}
            <TouchableOpacity
              onPress={onBack}
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, alignItems: 'center', width: '100%' }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                {triLang(lang, { ru: 'Назад к диалогам', uk: 'Назад до діалогів', es: 'Volver a los diálogos' })}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Game Over Screen
  if (phase === 'gameover') {
    return (
      <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 }}>
            <Text style={{ fontSize: 72 }}>💔</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Связь потеряна',
                uk: 'Зв\'язок втрачено',
                es: 'Se rompió el vínculo',
              })}
            </Text>
            <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: t.border }}>
              <Text style={{ color: t.textGhost, fontSize: f.sub, fontStyle: 'italic', textAlign: 'center', marginBottom: 8 }}>{dialog.npcName}:</Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, textAlign: 'center', fontStyle: 'italic' }}>
                {`"${dialogGameOverLine(lang, dialog)}"`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={resetForReplay}
              style={{ backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14 }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                {triLang(lang, { ru: 'Попробовать снова', uk: 'Спробувати знову', es: 'Intentar de nuevo' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onBack}>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>{triLang(lang, { ru: 'Выйти', uk: 'Вийти', es: 'Salir' })}</Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Active Dialog (Theater Mode)
  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}>
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <SegmentedProgress total={dialog.steps.length} current={stepIdx} />
          </View>
          <RelationshipScale value={connection} lastDelta={lastConnectionDelta} version={gaugeVersion} />
        </View>

        {/* ── Stage ── */}
        <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }} onPress={skipTypewriter}>

          {/* Avatar — fades on emoji change */}
          <Animated.View style={{ alignItems: 'center', marginBottom: 16, opacity: avatarOpacity }}>
            <Text style={{ fontSize: 60 }}>{npcEmoji}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: f.caption, marginTop: 4 }}>{dialog.npcName}</Text>
          </Animated.View>

          {/* Speech Bubble */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 18, width: '100%', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', minHeight: 80, justifyContent: 'center' }}>
            {renderNPCText(
              displayedText,
              isTyping ? [] : dialog.glossary,
              false,
              showTooltip,
              { color: '#F0F7F2', fontSize: 17, lineHeight: 26 },
              activeHintPhrase,
            )}
            {displayedText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  if (isAudioPlaying) {
                    stopAudio();
                    setIsAudioPlaying(false);
                  } else {
                    const txt = currentStep.npcTextEN.replace(/\[Name\]/gi, userName || 'you');
                    setIsAudioPlaying(true);
                    speakAudio(txt, speechRate, {
                      pitch: NPC_SPEECH_PITCH,
                      onDone: () => { if (isMounted.current) setIsAudioPlaying(false); },
                      onStopped: () => { if (isMounted.current) setIsAudioPlaying(false); },
                      onError: () => { if (isMounted.current) setIsAudioPlaying(false); },
                    });
                  }
                }}
                style={{ position: 'absolute', top: 10, right: 12 }}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons
                  name={isAudioPlaying ? 'volume-high' : 'volume-medium-outline'}
                  size={15}
                  color={isAudioPlaying ? '#7EC8E3' : 'rgba(255,255,255,0.3)'}
                />
              </TouchableOpacity>
            )}
            {isTyping && (
              <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, marginTop: 8, alignSelf: 'flex-end' }}>
                {triLang(lang, {
                  ru: 'Нажми, чтобы пропустить',
                  uk: 'Торкніться, щоб пропустити',
                  es: 'Toca para omitir',
                })}
              </Text>
            )}
          </View>
        </Pressable>

        {/* ── Answer Cards — spring in after typewriter, each card independent ── */}
        {phase === 'feedback' && chosenIdx !== null ? (
          /* After choice: show selected answer + Continue button */
          <View style={{ paddingHorizontal: 16, marginBottom: 20, gap: 10 }}>
            {/* Selected answer bubble */}
            {(() => {
              const originalIdx = choiceOrder[chosenIdx];
              const choice = currentStep.choices[originalIdx];
              const translation = choiceCardLine(lang, choice);
              const impactLine = choiceImpactLine(lang, choice);
              return (
                <View style={{ backgroundColor: STYLE_COLOR[choice.style] + '22', borderRadius: 14, borderWidth: 1.5, borderColor: STYLE_COLOR[choice.style] + '88', padding: 14, gap: 4 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', lineHeight: 22 }}>{choice.textEN}</Text>
                  {translation ? <Text style={{ color: t.textSecond, fontSize: f.sub, fontStyle: 'italic' }}>{translation}</Text> : null}
                  {impactLine ? (
                    <Text style={{ color: STYLE_COLOR[choice.style], fontSize: f.caption, marginTop: 4 }}>
                      {impactLine}
                    </Text>
                  ) : null}
                </View>
              );
            })()}
            <ReportErrorButton
              screen="dialogs"
              dataId={`dialog_${dialog.id}_step_${stepIdx}_choice_${choiceOrder[chosenIdx ?? 0]}`}
              dataText={[
                `NPC: ${currentStep?.npcTextEN ?? ''}`,
                `Выбрано: ${currentStep?.choices[choiceOrder[chosenIdx ?? 0]]?.textEN ?? ''}`,
                `Все варианты: ${choiceOrder.map(i => currentStep?.choices[i]?.textEN ?? '').join(' | ')}`,
              ].join('\n')}
              style={{ alignSelf: 'flex-end' }}
            />
            {/* Continue button */}
            <TouchableOpacity
              onPress={() => {
                if (isLastStep) finishDialog([...socialScores]);
                else transitionToNext();
              }}
              style={{ backgroundColor: t.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                {triLang(lang, { ru: 'Далее →', uk: 'Далі →', es: 'Siguiente →' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : cardsReady ? (
          <View style={{ height: 264, paddingHorizontal: 16, marginBottom: 20, gap: 8 }}>
            {choiceOrder.map((originalIdx, visualPos) => {
              const choice = currentStep.choices[originalIdx];
              const translation = choiceCardLine(lang, choice);
              return (
                <FlipCard
                  key={`${stepIdx}-${visualPos}`}
                  textEN={choice.textEN}
                  textTranslation={translation}
                  isSelected={chosenIdx === visualPos}
                  selectedColor={STYLE_COLOR[choice.style]}
                  isDisabled={phase !== 'choosing'}
                  onTap={() => handleChoice(visualPos)}
                  onFlip={() => { setHintCount(c => c + 1); setFirstFlipDone(true); }}
                  entryAnim={cardEntryAnims[visualPos]}
                  theme={t}
                  f={f}
                  showHoldHint={isFirstVisit && !firstFlipDone && visualPos === flipHintCard}
                />
              );
            })}
          </View>
        ) : null}

      </ContentWrap>

      {/* ── Tooltip Overlay ── */}
      {tooltip && (
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={hideTooltip}
        >
          <Animated.View
            style={{
              position: 'absolute',
              bottom: Math.max(160, insets.bottom + 140),
              left: 20,
              right: 20,
              backgroundColor: 'rgba(22,32,28,0.96)',
              borderRadius: 18,
              padding: 18,
              borderWidth: 1,
              borderColor: 'rgba(126,200,227,0.3)',
              transform: [
                { scale: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
                { translateY: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
              opacity: tooltipAnim,
            }}
          >
            {/* Word + speaker */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Text style={{ color: '#F0F7F2', fontSize: 17, fontWeight: '800', flex: 1 }}>{tooltip.phrase}</Text>
              <TouchableOpacity onPress={() => speakAudio(tooltip.phrase, speechRate, { pitch: NPC_SPEECH_PITCH })} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="volume-medium-outline" size={20} color="#7EC8E3" />
              </TouchableOpacity>
            </View>
            {/* Translation */}
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
              {glossaryExplanation(lang, tooltip)}
            </Text>
            {/* Micro-context */}
            {glossaryContext(lang, tooltip) ? (
              <Text style={{ color: '#7EC8E3', fontSize: 12, fontStyle: 'italic', marginBottom: 6 }}>
                {glossaryContext(lang, tooltip)}
              </Text>
            ) : null}
            {/* Save button (bookmark) */}
            <TouchableOpacity
              onPress={() => {
                setTappedWords(prev => prev.find(w => w.phrase === tooltip.phrase) ? prev : [...prev, tooltip]);
                hideTooltip();
              }}
              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(126,200,227,0.12)', borderRadius: 10, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(126,200,227,0.25)' }}
            >
              <Ionicons name="bookmark-outline" size={15} color="#7EC8E3" />
              <Text style={{ color: '#7EC8E3', fontSize: 13, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Сохранить слово', uk: 'Зберегти слово', es: 'Guardar término' })}
              </Text>
            </TouchableOpacity>
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
    <DialogList onSelect={id => { setSelectedId(id); setScreen('rolecard'); }} />
  );
}
