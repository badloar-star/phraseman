import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import SeasonAuraRing, { type SeasonAuraVisibleLayers } from '../components/SeasonAuraRing';
import {
  getSeasonAuraStageAsset,
  getSeasonRewardIcon,
  getSeasonSecretAuraAsset,
} from './season_pass_track_config';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import type { ThemeMode } from '../constants/theme';

type ArtTheme = 'light' | 'dark';
type AuraOption = '1' | '2' | '3' | '4' | 'secret';
type AuraLayer = keyof SeasonAuraVisibleLayers;

const AURA_OPTIONS = ['1', '2', '3', '4', 'secret'] as const;
const AURA_LABELS: Record<AuraOption, string> = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  secret: 'SECRET',
};
const LAYERS: readonly { key: AuraLayer; label: string }[] = [
  { key: 'base', label: 'Основа' },
  { key: 'flow', label: 'Поток' },
  { key: 'particles', label: 'Частицы' },
];

function SegmentedButton({
  active,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.segment, active && styles.segmentActive, pressed && styles.pressed]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function VisitingCard({ theme, framed }: { theme: ArtTheme; framed: boolean }) {
  const themeMode: ThemeMode = theme === 'light' ? 'sagePorcelain' : 'midnight';
  const frameSource = getSeasonRewardIcon('frame', themeMode);
  const light = theme === 'light';

  return (
    <View
      testID="season-visiting-card-preview"
      style={[
        styles.visitingCard,
        { backgroundColor: light ? '#F8F2E6' : '#071B38' },
        !framed && { borderColor: light ? '#D8DDE2' : '#31435C', borderWidth: 1 },
      ]}
    >
      {framed && frameSource ? (
        <Image source={frameSource} resizeMode="stretch" style={StyleSheet.absoluteFill} accessible={false} />
      ) : null}
      <View style={styles.cardContent}>
        <View style={[styles.avatar, { backgroundColor: light ? '#DCEFEA' : '#123B63' }]}>
          <Text style={[styles.avatarText, { color: light ? '#174E44' : '#8DD8FF' }]}>P</Text>
        </View>
        <View style={styles.identity}>
          <Text style={[styles.userName, { color: light ? '#17202A' : '#F4F7FF' }]}>Phraseman</Text>
          <Text style={[styles.userMeta, { color: light ? '#667078' : '#9AB1CB' }]}>Уровень 28 · Серия 17 дней</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: light ? '#8A5C13' : '#FFD47A' }]}>4 820</Text>
            <Text style={[styles.statLabel, { color: light ? '#72777D' : '#91A4BC' }]}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: light ? '#1E6B5A' : '#78DCFF' }]}>Gold</Text>
            <Text style={[styles.statLabel, { color: light ? '#72777D' : '#91A4BC' }]}>ЛИГА</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AdminSeasonPassLab() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [artTheme, setArtTheme] = useState<ArtTheme>('dark');
  const [selected, setSelected] = useState<AuraOption>('1');
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [framed, setFramed] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState<SeasonAuraVisibleLayers>({
    base: true,
    flow: true,
    particles: true,
  });
  const themeMode: ThemeMode = artTheme === 'light' ? 'sagePorcelain' : 'midnight';
  const selectedAura = useMemo(
    () => selected === 'secret'
      ? getSeasonSecretAuraAsset(themeMode)
      : getSeasonAuraStageAsset(Number(selected), themeMode),
    [selected, themeMode],
  );
  const previewSize = Math.min(280, Math.max(220, width - 80));

  const toggleLayer = (key: AuraLayer) => {
    setVisibleLayers((current) => ({ ...current, [key]: current[key] === false }));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={22} color="#E8EAEE" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>DEV · PREVIEW ONLY</Text>
          <Text style={styles.title}>Season Pass Lab</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(28, insets.bottom + 20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>АССЕТЫ</Text>
          <View style={styles.segmentGroup}>
            <SegmentedButton active={artTheme === 'light'} label="Светлые" onPress={() => setArtTheme('light')} />
            <SegmentedButton active={artTheme === 'dark'} label="Тёмные" onPress={() => setArtTheme('dark')} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionKicker}>АУРА СЕЗОНА</Text>
              <Text style={styles.sectionTitle}>Стадия {AURA_LABELS[selected]}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={motionEnabled ? 'Поставить анимацию на паузу' : 'Запустить анимацию'}
              onPress={() => setMotionEnabled((value) => !value)}
              style={({ pressed }) => [styles.motionButton, pressed && styles.pressed]}
            >
              <Ionicons name={motionEnabled ? 'pause' : 'play'} size={17} color="#0A0D11" />
              <Text style={styles.motionButtonText}>{motionEnabled ? 'Пауза' : 'Запустить'}</Text>
            </Pressable>
          </View>

          <View style={[styles.auraCanvas, artTheme === 'light' ? styles.lightCanvas : styles.darkCanvas]}>
            <View style={[styles.avatarCore, artTheme === 'light' ? styles.avatarCoreLight : styles.avatarCoreDark]}>
              <Text style={[styles.avatarCoreText, artTheme === 'light' ? styles.darkText : styles.lightText]}>P</Text>
            </View>
            <View style={styles.auraAbsolute}>
              <SeasonAuraRing
                asset={selectedAura}
                size={previewSize}
                active={motionEnabled}
                visibleLayers={visibleLayers}
              />
            </View>
          </View>

          <Text style={styles.helper}>Каждый элемент живёт отдельно: дыхание основы, вращение потока и мерцание частиц.</Text>

          <View style={styles.layerRow}>
            {LAYERS.map((layer) => {
              const enabled = visibleLayers[layer.key] !== false;
              return (
                <SegmentedButton
                  key={layer.key}
                  active={enabled}
                  label={layer.label}
                  onPress={() => toggleLayer(layer.key)}
                  testID={`season-aura-layer-${layer.key}`}
                />
              );
            })}
          </View>

          <View style={styles.auraOptions}>
            {AURA_OPTIONS.map((option) => {
              const asset = option === 'secret'
                ? getSeasonSecretAuraAsset(themeMode)
                : getSeasonAuraStageAsset(Number(option), themeMode);
              const active = option === selected;
              return (
                <Pressable
                  key={option}
                  testID={`season-aura-${option}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Аура ${AURA_LABELS[option]}`}
                  onPress={() => setSelected(option)}
                  style={({ pressed }) => [styles.auraOption, active && styles.auraOptionActive, pressed && styles.pressed]}
                >
                  <SeasonAuraRing asset={asset} size={58} active={false} />
                  <Text style={[styles.auraOptionLabel, active && styles.auraOptionLabelActive]}>{AURA_LABELS[option]}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.motionMeta}>
            <Text style={styles.motionMetaText}>Пульс {(selectedAura.pulseMs / 1000).toFixed(1)} c</Text>
            <Text style={styles.motionMetaText}>Поток {(selectedAura.flowSpinMs / 1000).toFixed(0)} c</Text>
            <Text style={styles.motionMetaText}>Частицы {(selectedAura.particlesSpinMs / 1000).toFixed(1)} c</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.visitingTitleWrap}>
              <Text style={styles.sectionKicker}>НАГРАДА УРОВНЯ 2</Text>
              <Text style={styles.sectionTitle}>Визитка</Text>
            </View>
            <View style={styles.segmentGroupCompact}>
              <SegmentedButton active={!framed} label="Без рамки" onPress={() => setFramed(false)} />
              <SegmentedButton active={framed} label="С рамкой" onPress={() => setFramed(true)} />
            </View>
          </View>
          <Text style={styles.helper}>Вся пользовательская карточка получает сезонное оформление. Это не рамка аватара.</Text>
          <View style={styles.cardStage}>
            <VisitingCard theme={artTheme} framed={framed} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E1013' },
  header: { minHeight: 68, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#272B32', backgroundColor: '#14161A' },
  backButton: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E2126', borderWidth: 1, borderColor: '#2B3038' },
  headerCopy: { marginLeft: 12 },
  eyebrow: { color: '#8C94A0', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#E8EAEE', fontSize: 21, fontWeight: '800', marginTop: 2 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 16, gap: 14 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  controlLabel: { color: '#8C94A0', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  segmentGroup: { flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: '#17191E', borderWidth: 1, borderColor: '#272B32' },
  segmentGroupCompact: { flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: '#121417', borderWidth: 1, borderColor: '#272B32' },
  segment: { minHeight: 44, minWidth: 70, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#E8EAEE' },
  segmentText: { color: '#8C94A0', fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: '#0A0D11' },
  pressed: { opacity: 0.72 },
  sectionCard: { backgroundColor: '#17191E', borderWidth: 1, borderColor: '#272B32', borderRadius: 20, padding: 14, gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionKicker: { color: '#8C94A0', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  sectionTitle: { color: '#E8EAEE', fontSize: 22, fontWeight: '800', marginTop: 3 },
  motionButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C9D0D9' },
  motionButtonText: { color: '#0A0D11', fontSize: 13, fontWeight: '800' },
  auraCanvas: { height: 310, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  lightCanvas: { backgroundColor: '#F3F2EC', borderColor: '#DADFD8' },
  darkCanvas: { backgroundColor: '#070B16', borderColor: '#252C45' },
  avatarCore: { width: 106, height: 106, borderRadius: 53, alignItems: 'center', justifyContent: 'center', borderWidth: 2, zIndex: 1 },
  avatarCoreLight: { backgroundColor: '#E5ECE8', borderColor: '#FFFFFF' },
  avatarCoreDark: { backgroundColor: '#121B34', borderColor: '#273657' },
  avatarCoreText: { fontSize: 42, fontWeight: '900' },
  lightText: { color: '#F5F8FF' },
  darkText: { color: '#1C3831' },
  auraAbsolute: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  helper: { color: '#9AA2AD', fontSize: 13, lineHeight: 19 },
  layerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  auraOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  auraOption: { minWidth: 82, minHeight: 94, flexGrow: 1, padding: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121417', borderWidth: 1, borderColor: '#272B32' },
  auraOptionActive: { borderColor: '#BFC7D1', backgroundColor: '#22262C' },
  auraOptionLabel: { color: '#77808C', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  auraOptionLabelActive: { color: '#F4F6F8' },
  motionMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motionMetaText: { color: '#737C88', fontSize: 11, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: '#121417' },
  visitingTitleWrap: { minWidth: 88 },
  cardStage: { paddingVertical: 10, alignItems: 'center' },
  visitingCard: { width: '100%', maxWidth: 512, aspectRatio: 1.6, borderRadius: 18, overflow: 'hidden', justifyContent: 'center' },
  cardContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: '11%', paddingTop: '3%', gap: 10 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '900' },
  identity: { flex: 1, minWidth: 0 },
  userName: { fontSize: 17, fontWeight: '900' },
  userMeta: { fontSize: 10, fontWeight: '600', marginTop: 5 },
  stats: { flexDirection: 'row', gap: 9 },
  statItem: { alignItems: 'center', minWidth: 42 },
  statValue: { fontSize: 12, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '800', marginTop: 4, letterSpacing: 0.6 },
});
