import React, { memo, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { LinearGradient } from './SafeLinearGradient';
import TapScale from './TapScale';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { ENABLE_DEV_TOOLS } from '../app/config';
import { triLang } from '../constants/i18n';

type StageId = 'words' | 'theory' | 'build' | 'listen' | 'speak' | 'recall' | 'mini_game' | 'exam';
type StageState = 'completed' | 'current' | 'recommended' | 'locked';

type Stage = {
  id: StageId;
  icon: keyof typeof Ionicons.glyphMap;
  state: StageState;
};

const STAGES: readonly Stage[] = [
  { id: 'words', icon: 'albums-outline', state: 'completed' },
  { id: 'theory', icon: 'book-outline', state: 'completed' },
  { id: 'build', icon: 'construct-outline', state: 'current' },
  { id: 'listen', icon: 'ear-outline', state: 'recommended' },
  { id: 'speak', icon: 'mic-outline', state: 'locked' },
  { id: 'recall', icon: 'create-outline', state: 'locked' },
  { id: 'mini_game', icon: 'game-controller-outline', state: 'locked' },
  { id: 'exam', icon: 'ribbon-outline', state: 'locked' },
];

const STAGE_COPY: Record<StageId, { label: { ru: string; uk: string; es: string }; hint: { ru: string; uk: string; es: string } }> = {
  words: { label: { ru: 'Слова', uk: 'Слова', es: 'Palabras' }, hint: { ru: 'Разогрев и новая лексика', uk: 'Розігрів і нова лексика', es: 'Calentamiento y vocabulario' } },
  theory: { label: { ru: 'Теория', uk: 'Теорія', es: 'Teoría' }, hint: { ru: 'Разберём, как работает фраза', uk: 'Розберемо, як працює фраза', es: 'Descubre cómo funciona la frase' } },
  build: { label: { ru: 'Построение', uk: 'Побудова', es: 'Construcción' }, hint: { ru: 'Собери живую фразу', uk: 'Склади живу фразу', es: 'Construye una frase viva' } },
  listen: { label: { ru: 'Слушай', uk: 'Слухай', es: 'Escucha' }, hint: { ru: 'Услышь фразу в естественном темпе', uk: 'Почуй фразу в природному темпі', es: 'Escucha la frase a velocidad natural' } },
  speak: { label: { ru: 'Говори', uk: 'Говори', es: 'Habla' }, hint: { ru: 'Произнеси фразу по памяти', uk: 'Скажи фразу з памʼяті', es: 'Di la frase de memoria' } },
  recall: { label: { ru: 'Вспомни', uk: 'Згадай', es: 'Recuerda' }, hint: { ru: 'Напиши фразу без подсказок', uk: 'Напиши фразу без підказок', es: 'Escribe sin pistas' } },
  mini_game: { label: { ru: 'Мини-игра', uk: 'Мінігра', es: 'Minijuego' }, hint: { ru: 'Развивай скорость и серию', uk: 'Розвивай швидкість і серію', es: 'Gana velocidad y combos' } },
  exam: { label: { ru: 'Экзамен', uk: 'Іспит', es: 'Examen' }, hint: { ru: 'Покажи результат урока', uk: 'Покажи результат уроку', es: 'Demuestra lo aprendido' } },
};

function stageLabel(stage: Stage, lang: Parameters<typeof triLang>[0]): string {
  return triLang(lang, STAGE_COPY[stage.id].label);
}

function stageStateLabel(state: StageState, lang: Parameters<typeof triLang>[0]): string {
  return triLang(lang, {
    ru: state === 'completed' ? 'ЗАВЕРШЕНО' : state === 'current' ? 'ТЕКУЩИЙ ЭТАП' : state === 'recommended' ? 'РЕКОМЕНДОВАНО' : 'ЗАКРЫТО',
    uk: state === 'completed' ? 'ЗАВЕРШЕНО' : state === 'current' ? 'ПОТОЧНИЙ ЕТАП' : state === 'recommended' ? 'РЕКОМЕНДОВАНО' : 'ЗАБЛОКОВАНО',
    es: state === 'completed' ? 'COMPLETADO' : state === 'current' ? 'ETAPA ACTUAL' : state === 'recommended' ? 'RECOMENDADO' : 'BLOQUEADO',
  });
}

const STAGE_TONE: Record<StageState, { fill: string; accent: string; text: string }> = {
  completed: { fill: '#3D8F77', accent: '#A8F2D4', text: '#08251D' },
  current: { fill: '#6860D9', accent: '#D4CFFF', text: '#FFFFFF' },
  recommended: { fill: '#C28A43', accent: '#FFE4A4', text: '#3A2108' },
  locked: { fill: '#73809A', accent: '#E0E6F1', text: '#25304A' },
};

function stageCopy(stage: Stage, lang: Parameters<typeof triLang>[0]): string {
  return triLang(lang, STAGE_COPY[stage.id].hint);
}

const HexNode = memo(function HexNode({ stage, lang, onPress, selected }: { stage: Stage; lang: Parameters<typeof triLang>[0]; onPress: () => void; selected: boolean }) {
  const { theme: t } = useTheme();
  const tone = STAGE_TONE[stage.state];
  const label = stageLabel(stage, lang);
  return (
    <TapScale
      testID={`lessons-v2-stage-${stage.id}`}
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.96}
      style={[styles.node, selected && styles.nodeSelected]}
    >
      <View style={styles.hexShadow}>
        <Svg width={76} height={76} viewBox="0 0 100 100" pointerEvents="none">
          <Defs>
            <SvgLinearGradient id={`v2Hex_${stage.id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={tone.accent} stopOpacity={0.9} />
              <Stop offset="0.48" stopColor={tone.fill} stopOpacity={1} />
              <Stop offset="1" stopColor="#11182B" stopOpacity={0.9} />
            </SvgLinearGradient>
          </Defs>
          <Polygon points="50,8 93,30.5 93,78.5 50,100.5 7,78.5 7,30.5" fill="#10162B" opacity={0.42} />
          <Polygon points="50,3.5 93,26 93,74 50,96.5 7,74 7,26" fill={`url(#v2Hex_${stage.id})`} />
          <Polygon points="50,3.5 93,26 93,74 50,96.5 7,74 7,26" fill="none" stroke={tone.accent} strokeOpacity={0.52} strokeWidth={2} />
          <Path d="M19 29 L50 12 L81 29" fill="none" stroke="#FFFFFF" strokeOpacity={0.28} strokeWidth={3} strokeLinecap="round" />
          <Polygon points="50,12 81,29 58,48 44,46" fill="#FFFFFF" opacity={0.12} />
        </Svg>
        <Ionicons name={stage.icon} size={27} color={tone.text} style={styles.nodeIcon} />
      </View>
      <Text style={[styles.nodeLabel, { color: stage.state === 'locked' ? t.textMuted : t.textPrimary }]}>{label}</Text>
      {stage.state === 'current' ? <Text style={[styles.nodeState, { color: t.accent }]}>{triLang(lang, { ru: 'СЕЙЧАС', uk: 'ЗАРАЗ', es: 'AHORA' })}</Text> : null}
    </TapScale>
  );
});

export default function LessonsV2TabContent({ bottomPadding = 24 }: { bottomPadding?: number }) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const [selectedStageId, setSelectedStageId] = useState<StageId>('build');
  const selectedStage = useMemo(() => STAGES.find((stage) => stage.id === selectedStageId) ?? STAGES[2], [selectedStageId]);

  const openLegacyPreview = () => {
    if (selectedStage.state === 'locked') return;
    if (selectedStage.id === 'theory') {
      router.push({ pathname: '/lesson_theory_v2', params: { id: '1' } });
      return;
    }
    router.push({ pathname: '/lesson1', params: { id: '1', from: 'lessons_v2' } });
  };

  return (
    <ScrollView
      testID="lessons-v2-surface"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
    >
      <LinearGradient colors={['#202958', '#4F58C9']} style={styles.hero}>
        <View style={styles.heroTop}><Text style={styles.eyebrow}>{triLang(lang, { ru: 'ПУТЬ УРОКА', uk: 'ШЛЯХ УРОКУ', es: 'RUTA DE LA LECCIÓN' })}</Text><Text style={styles.progress}>{triLang(lang, { ru: '3 / 8 этапов', uk: '3 / 8 етапів', es: '3 / 8 etapas' })}</Text></View>
        <Text style={styles.heroTitle}>{triLang(lang, { ru: 'Основы путешествий', uk: 'Основи подорожей', es: 'Fundamentos de viaje' })}</Text>
        <View style={styles.heroMeter}><View style={styles.heroMeterFill} /></View>
      </LinearGradient>

      <View style={[styles.map, { backgroundColor: t.bgSurface ?? t.bgPrimary }]}>
        <View pointerEvents="none" style={styles.mapGlow} />
        <Svg style={styles.routeSvg} width="100%" height="680" viewBox="0 0 320 680" pointerEvents="none">
          <Path d="M55 40 C112 59 226 78 255 130 C280 172 194 199 104 235 C38 261 72 320 145 345 C224 372 270 416 211 467 C166 508 101 570 55 635" fill="none" stroke={t.accent} strokeOpacity={0.35} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M55 40 C112 59 226 78 255 130 C280 172 194 199 104 235" fill="none" stroke={t.correct} strokeOpacity={0.7} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <View style={[styles.nodePosition, styles.nWords]}><HexNode stage={STAGES[0]} lang={lang} selected={selectedStageId === 'words'} onPress={() => setSelectedStageId('words')} /></View>
        <View style={[styles.nodePosition, styles.nTheory]}><HexNode stage={STAGES[1]} lang={lang} selected={selectedStageId === 'theory'} onPress={() => setSelectedStageId('theory')} /></View>
        <View style={[styles.nodePosition, styles.nBuild]}><HexNode stage={STAGES[2]} lang={lang} selected={selectedStageId === 'build'} onPress={() => setSelectedStageId('build')} /></View>
        <View style={[styles.nodePosition, styles.nListen]}><HexNode stage={STAGES[3]} lang={lang} selected={selectedStageId === 'listen'} onPress={() => setSelectedStageId('listen')} /></View>
        <View style={[styles.nodePosition, styles.nSpeak]}><HexNode stage={STAGES[4]} lang={lang} selected={selectedStageId === 'speak'} onPress={() => setSelectedStageId('speak')} /></View>
        <View style={[styles.nodePosition, styles.nRecall]}><HexNode stage={STAGES[5]} lang={lang} selected={selectedStageId === 'recall'} onPress={() => setSelectedStageId('recall')} /></View>
        <View style={[styles.nodePosition, styles.nMini]}><HexNode stage={STAGES[6]} lang={lang} selected={selectedStageId === 'mini_game'} onPress={() => setSelectedStageId('mini_game')} /></View>
        <View style={[styles.nodePosition, styles.nExam]}><HexNode stage={STAGES[7]} lang={lang} selected={selectedStageId === 'exam'} onPress={() => setSelectedStageId('exam')} /></View>
      </View>

      <View style={styles.detailPanel}>
        <Text style={styles.detailEyebrow}>{stageStateLabel(selectedStage.state, lang)}</Text>
        <Text style={styles.detailTitle}>{stageLabel(selectedStage, lang)}</Text>
        <Text style={styles.detailHint}>{stageCopy(selectedStage, lang)}</Text>
        <TapScale testID="lessons-v2-start-stage" accessibilityLabel={selectedStage.state === 'locked' ? stageStateLabel(selectedStage.state, lang) : stageLabel(selectedStage, lang)} disabled={selectedStage.state === 'locked'} onPress={openLegacyPreview} scaleTo={0.98} style={[styles.primaryButton, selectedStage.state === 'locked' && styles.primaryButtonDisabled]}>
          <Text style={styles.primaryText}>{selectedStage.id === 'theory' ? triLang(lang, { ru: 'Открыть превью теории', uk: 'Відкрити превʼю теорії', es: 'Abrir vista previa de teoría' }) : triLang(lang, { ru: 'Открыть Legacy-превью', uk: 'Відкрити Legacy-превʼю', es: 'Abrir vista previa Legacy' })}</Text>
          <Ionicons name="arrow-forward" size={18} color="#07110A" />
        </TapScale>
      </View>

      {ENABLE_DEV_TOOLS ? (
        <View testID="lessons-v2-dev-panel" style={styles.devPanel}>
          <View style={styles.devHeader}><Text style={styles.devTitle}>V2 DEV LAB</Text><Text style={styles.devHint}>{triLang(lang, { ru: 'только dev', uk: 'лише dev', es: 'solo dev' })}</Text></View>
          <Text style={styles.devDescription}>{triLang(lang, { ru: 'Нажми на этап, чтобы проверить его состояние. Эти кнопки не меняют основной прогресс урока.', uk: 'Натисни на етап, щоб перевірити його стан. Ці кнопки не змінюють основний прогрес уроку.', es: 'Toca una etapa para probar su estado. Estos botones no cambian el progreso principal.' })}</Text>
          <View style={styles.devGrid}>
            {STAGES.map((stage) => (
              <TapScale key={stage.id} testID={`lessons-v2-dev-${stage.id}`} accessibilityLabel={stageLabel(stage, lang)} onPress={() => setSelectedStageId(stage.id)} scaleTo={0.96} style={styles.devButton}>
                <Ionicons name={stage.icon} size={16} color="#CFC8FF" /><Text style={styles.devButtonText}>{stageLabel(stage, lang)}</Text>
              </TapScale>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 10 },
  hero: { marginHorizontal: 14, padding: 18, borderRadius: 22, overflow: 'hidden', shadowColor: '#242875', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 6 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#C9CFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  progress: { color: '#E0E4FF', fontSize: 11, fontWeight: '800' },
  heroTitle: { color: '#FFF', fontSize: 23, fontWeight: '900', marginTop: 12 },
  heroSubtitle: { color: '#D8DCFF', fontSize: 11, marginTop: 4 },
  heroMeter: { height: 6, borderRadius: 5, backgroundColor: '#ffffff28', marginTop: 17, overflow: 'hidden' },
  heroMeterFill: { width: '38%', height: '100%', borderRadius: 5, backgroundColor: '#8FE7C3' },
  map: { height: 680, marginTop: 10, marginHorizontal: 8, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  mapGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#786CFF24', top: 140, left: 55 },
  routeSvg: { position: 'absolute', left: 20, right: 20, top: 0 },
  nodePosition: { position: 'absolute' },
  nWords: { left: 18, top: 8 }, nTheory: { right: 14, top: 88 }, nBuild: { left: 126, top: 168 }, nListen: { left: 18, top: 248 }, nSpeak: { right: 10, top: 328 }, nRecall: { left: 126, top: 408 }, nMini: { right: 16, top: 488 }, nExam: { left: 8, top: 568 },
  node: { width: 86, alignItems: 'center', borderRadius: 18 },
  nodeSelected: { transform: [{ scale: 1.06 }] },
  hexShadow: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  nodeIcon: { position: 'absolute' },
  nodeLabel: { fontSize: 10, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  nodeState: { color: '#5D55D8', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  detailPanel: { marginHorizontal: 14, marginTop: 8, padding: 16, borderRadius: 20, backgroundColor: '#171F35', shadowColor: '#000', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 },
  detailEyebrow: { color: '#A9A1FF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  detailTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 5 },
  detailHint: { color: '#BCC6E4', fontSize: 12, marginTop: 4 },
  primaryButton: { minHeight: 48, marginTop: 14, borderRadius: 15, backgroundColor: '#D6FF3D', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#07110A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 0, elevation: 4 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryText: { color: '#07110A', fontSize: 13, fontWeight: '900' },
  devPanel: { marginHorizontal: 14, marginTop: 10, padding: 14, borderRadius: 18, backgroundColor: '#1A1731', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 3 },
  devHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  devTitle: { color: '#B5ACFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  devHint: { color: '#8E88B5', fontSize: 10 },
  devDescription: { color: '#B5B3CB', fontSize: 11, lineHeight: 15, marginTop: 6 },
  devGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  devButton: { minHeight: 40, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#2B2550', flexDirection: 'row', alignItems: 'center', gap: 5, shadowColor: '#080611', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.32, shadowRadius: 0, elevation: 2 },
  devButtonText: { color: '#E0DCFF', fontSize: 10, fontWeight: '800' },
});
