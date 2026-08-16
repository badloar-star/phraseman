// ─── Витрина движения · шард «Отклик · кнопки, иконки, таббар» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Файл .tsx (не .ts): render-пункт монтирует живую превью-панель с иконками (JSX).
// Агрегатор components/dev/motion_showcase/index.ts импортирует без расширения —
// tsc/Metro резолвят .tsx точно так же, как .ts.
import React, { memo, useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MotionModal from '../../../MotionModal';
import { useTheme } from '../../../ThemeContext';
import { StreakChainIcon } from '../../../StreakChainIcon';
import LevelBadge from '../../../LevelBadge';
import PlusBadge from '../../../PlusBadge';
import LeagueCrownName from '../../../LeagueCrownName';
import EnergyIcon from '../../../EnergyIcon';
import PressableHybrid, { type PressableHybridVariant } from '../../../PressableHybrid';
import TabBarHybridPreview from '../../../tabbar/TabBarHybridPreview';
import LiveStreakFlame from '../../../icons/LiveStreakFlame';
import { getDevTabBarMotionVariant, setDevTabBarMotionVariant } from '../../../../hooks/dev_motion_variant';
import { emitAppEvent, actionToastTri } from '../../../../app/events';
import DuoPressable from '../../../DuoPressable';
import CircularProgress from '../../../CircularProgress';
import GradientProgressBar from '../../../GradientProgressBar';
import GiftExpiryCountdown from '../../../GiftExpiryCountdown';
import { GOLD_RICH } from '../../../../constants/goldTheme';
import type { ShowcaseRenderProps, ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

/**
 * Живая превью-панель шести «целевых» иконок семьи «Отклик» в одном месте.
 * Только визуальные демо-пропсы (статичный уровень/стрик/энергия) — никаких
 * grant/spend/claim колбэков, ничего не пишет в прогресс или сеть.
 * NotificationCenterButton сюда сознательно НЕ включён — см. note ниже:
 * компонент сам читает Firestore и помечает уведомления прочитанными.
 */
function IconsLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f, themeMode } = useTheme();
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-press-icons-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('icons_live_preview_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('icons_live_preview_hint')}
        </Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <StreakChainIcon themeMode={themeMode} streakDays={7} size={48} />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_streak_chain')}</Text>
          </View>
          <View style={styles.cell}>
            <LevelBadge level={12} size={48} autoplay={false} centeredNumber />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_level_badge')}</Text>
          </View>
          <View style={styles.cell}>
            <PlusBadge themeMode={themeMode} size="md" />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_plus_badge')}</Text>
          </View>
          <View style={styles.cell}>
            <LeagueCrownName text={cs('press_icon_league_crown_demo_text')} fontSize={16} count={3} />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_league_crown_name')}</Text>
          </View>
          <View style={styles.cell}>
            <EnergyIcon filled themeColor={t.accent} themeMode={themeMode} size={40} animateChange={false} />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_energy_icon')}</Text>
          </View>
        </View>
      </View>
    </MotionModal>
  );
}

const IconsLivePreviewMemo = memo(IconsLivePreview);

/**
 * Живая панель гибрид-таббара «жидкое золото» — TabBarHybridPreview монтируется
 * напрямую (не бутафория): демо-переключение локальное, без роутера/навигации.
 */
function TabBarHybridLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f } = useTheme();
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-tabbar-hybrid-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('tabbar_hybrid_preview_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('tabbar_hybrid_preview_hint')}
        </Text>
        <View style={styles.tabbarWrap}>
          <TabBarHybridPreview />
        </View>
      </View>
    </MotionModal>
  );
}

const TabBarHybridLivePreviewMemo = memo(TabBarHybridLivePreview);

const PRESS_HYBRID_VARIANTS: readonly PressableHybridVariant[] = ['primary', 'secondary', 'icon', 'chip', 'card'];

/**
 * Живая панель единого пресс-стандарта (гибрид «Световод + Чекан») — все пять
 * ролей PressableHybrid рядом, каждая тапабельна своей физикой (PRESS из
 * constants/motionHybrid.ts). silent — чтобы демо-тапы в витрине не спамили
 * хаптиком владельцу при простом просмотре списка кнопок.
 */
function PressHybridLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f } = useTheme();
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-press-hybrid-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('press_hybrid_panel_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('press_hybrid_panel_hint')}
        </Text>
        <View style={styles.pressGrid}>
          {PRESS_HYBRID_VARIANTS.map((variant) => (
            <PressableHybrid
              key={variant}
              variant={variant}
              withHaptic={false}
              style={styles.pressItem}
              contentStyle={[
                styles.pressChip,
                { backgroundColor: t.bgSurface2, shadowColor: t.shadowDark },
              ]}
            >
              <Text style={[styles.pressChipLabel, { color: t.textPrimary }]}>
                {cs(`press_hybrid_variant_${variant}` as const)}
              </Text>
            </PressableHybrid>
          ))}
        </View>
      </View>
    </MotionModal>
  );
}

const PressHybridLivePreviewMemo = memo(PressHybridLivePreview);

/**
 * Живая панель огня стрика — покой статичным тиром (LiveStreakFlame без
 * burstToken → лёгкий expo-image путь), кнопка «Вспыхнуть» инкрементит токен
 * и проигрывает burst (рост/колыхание/затухающий блик по гардам компонента).
 */
function StreakFlameHybridLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f, themeMode } = useTheme();
  const [burstToken, setBurstToken] = useState<number | undefined>(undefined);
  const burstSeqRef = useRef(0);
  const handleBurst = useCallback(() => {
    burstSeqRef.current += 1;
    setBurstToken(burstSeqRef.current);
  }, []);
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-streak-flame-hybrid-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('streak_flame_hybrid_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('streak_flame_hybrid_hint')}
        </Text>
        <View style={styles.flameWrap}>
          <LiveStreakFlame themeMode={themeMode} streakDays={7} size={72} burstToken={burstToken} />
        </View>
        <PressableHybrid
          variant="primary"
          onPress={handleBurst}
          contentStyle={[styles.burstButton, { backgroundColor: t.accent }]}
        >
          <Text style={[styles.burstButtonLabel, { color: t.bgCard }]}>
            {cs('streak_flame_hybrid_burst_button')}
          </Text>
        </PressableHybrid>
      </View>
    </MotionModal>
  );
}

const StreakFlameHybridLivePreviewMemo = memo(StreakFlameHybridLivePreview);

/**
 * Живая панель «кнопки с кромкой»: настоящая keycap-физика DuoPressable —
 * статичная подошва (edge) снизу + лицо едет вниз на edgeHeight при нажатии
 * (кромка «схлопывается»), без scale/opacity. Три кнопки: primary с кромкой 6,
 * secondary с кромкой 4, плоская без edgeColor (лёгкий translateY, старое
 * поведение сохранено для мест без кромки).
 */
function EdgePressLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f } = useTheme();
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-edge-press-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('edge_press_panel_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('edge_press_panel_hint')}
        </Text>
        <View style={styles.edgePressStack}>
          <DuoPressable
            withHaptic={false}
            edgeColor={GOLD_RICH.bronzeDark}
            edgeHeight={6}
            style={[styles.edgePressButton, { backgroundColor: GOLD_RICH.metalGold }]}
          >
            <Text style={[styles.edgePressLabel, { color: GOLD_RICH.blackPiano }]}>
              {cs('edge_press_primary_label')}
            </Text>
          </DuoPressable>
          <DuoPressable
            withHaptic={false}
            edgeColor={t.shadowDark}
            edgeHeight={4}
            style={[styles.edgePressButton, { backgroundColor: t.bgSurface2 }]}
          >
            <Text style={[styles.edgePressLabel, { color: t.textPrimary }]}>
              {cs('edge_press_secondary_label')}
            </Text>
          </DuoPressable>
          <DuoPressable
            withHaptic={false}
            style={[styles.edgePressButton, { backgroundColor: t.bgSurface2 }]}
          >
            <Text style={[styles.edgePressLabel, { color: t.textMuted }]}>
              {cs('edge_press_flat_label')}
            </Text>
          </DuoPressable>
        </View>
      </View>
    </MotionModal>
  );
}

const EdgePressLivePreviewMemo = memo(EdgePressLivePreview);

const RING_DEMO_VALUES = [18, 62, 94] as const;
const BAR_DEMO_VALUES = [0.15, 0.55, 0.9] as const;

/**
 * Живая панель кольца прогресса (CircularProgress) — кнопка «изменить»
 * переключает по кругу демо-значения, заливка едет плавно (Reanimated внутри
 * самого компонента, withTiming LUM.resolveMs), а не прыгает.
 */
function ProgressRingLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f } = useTheme();
  const [step, setStep] = useState(0);
  const pct = RING_DEMO_VALUES[step % RING_DEMO_VALUES.length];
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-progress-ring-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('progress_ring_hybrid_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('progress_ring_hybrid_hint')}
        </Text>
        <View style={styles.progressRingWrap}>
          <CircularProgress
            pct={pct}
            size={96}
            sw={8}
            color={t.accent}
            bg={t.bgSurface2}
            textColor={t.textPrimary}
            fontSize={18}
          />
        </View>
        <PressableHybrid
          variant="primary"
          onPress={() => setStep((s) => s + 1)}
          contentStyle={[styles.burstButton, { backgroundColor: t.accent }]}
        >
          <Text style={[styles.burstButtonLabel, { color: t.bgCard }]}>
            {cs('progress_change_value_button')}
          </Text>
        </PressableHybrid>
      </View>
    </MotionModal>
  );
}

const ProgressRingLivePreviewMemo = memo(ProgressRingLivePreview);

/** Живая панель полосы прогресса (GradientProgressBar) — тот же принцип. */
function ProgressBarLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f } = useTheme();
  const [step, setStep] = useState(0);
  const progress = BAR_DEMO_VALUES[step % BAR_DEMO_VALUES.length];
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-progress-bar-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('progress_bar_hybrid_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('progress_bar_hybrid_hint')}
        </Text>
        <View style={styles.progressBarWrap}>
          <GradientProgressBar progress={progress} accent={t.accent} height={10} />
        </View>
        <PressableHybrid
          variant="primary"
          onPress={() => setStep((s) => s + 1)}
          contentStyle={[styles.burstButton, { backgroundColor: t.accent }]}
        >
          <Text style={[styles.burstButtonLabel, { color: t.bgCard }]}>
            {cs('progress_change_value_button')}
          </Text>
        </PressableHybrid>
      </View>
    </MotionModal>
  );
}

const ProgressBarLivePreviewMemo = memo(ProgressBarLivePreview);

/**
 * Живая панель таймера подарка (GiftExpiryCountdown) — демо-TTL 5 часов 50
 * минут, чтобы «загорание» (порог 6ч) сработало почти сразу после открытия
 * панели, без ожидания реального 72-часового отсчёта.
 */
function ProgressTimerLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f } = useTheme();
  const [expiresAtMs] = useState(() => Date.now() + 5 * 60 * 60 * 1000 + 50 * 60 * 1000);
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-progress-timer-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('progress_timer_hybrid_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('progress_timer_hybrid_hint')}
        </Text>
        <View style={styles.progressTimerWrap}>
          <GiftExpiryCountdown expiresAtMs={expiresAtMs} accent={t.accent} testID="motion-showcase-progress-timer" />
        </View>
      </View>
    </MotionModal>
  );
}

const ProgressTimerLivePreviewMemo = memo(ProgressTimerLivePreview);

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, gap: 6 },
  title: { fontWeight: '800' },
  hint: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 12 },
  cell: { alignItems: 'center', gap: 6, width: 92 },
  cellLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tabbarWrap: { marginTop: 16 },
  pressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  pressItem: { width: 'auto', alignSelf: 'flex-start' },
  pressChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  pressChipLabel: { fontSize: 13, fontWeight: '700' },
  flameWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20, height: 96 },
  burstButton: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  burstButtonLabel: { fontSize: 14, fontWeight: '700' },
  edgePressStack: { gap: 16, marginTop: 16 },
  edgePressButton: { minHeight: 54, borderRadius: 14, paddingHorizontal: 20 },
  edgePressLabel: { fontSize: 15, fontWeight: '700' },
  progressRingWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20, height: 120 },
  progressBarWrap: { marginTop: 16, marginBottom: 20 },
  progressTimerWrap: { alignItems: 'flex-start', marginTop: 16, marginBottom: 8 },
});

export const SECTION: ShowcaseSection = {
  id: 'press_icons_tabbar',
  order: 80,
  title: cs('press_icons_tabbar_section_title'),
  items: [
    // ── Пресс-примитивы: три текущих реализации + целевой гибрид-стандарт ──
    {
      id: 'press-primitive-pressablescale-root',
      title: cs('press_primitive_root_title'),
      kind: 'note',
      note: cs('press_primitive_root_note'),
    },
    {
      id: 'press-primitive-pressablescale-feedback',
      title: cs('press_primitive_feedback_title'),
      kind: 'note',
      note: cs('press_primitive_feedback_note'),
    },
    {
      id: 'press-primitive-tapscale',
      title: cs('press_primitive_tapscale_title'),
      kind: 'note',
      note: cs('press_primitive_tapscale_note'),
    },
    {
      id: 'press-primitive-target-hybrid',
      title: cs('press_primitive_target_hybrid_title'),
      kind: 'note',
      note: cs('press_primitive_target_hybrid_note'),
    },
    // ── Живая панель: единый пресс-стандарт (гибрид) уже реализован ──
    {
      id: 'press-hybrid-live-preview',
      title: cs('press_hybrid_panel_title'),
      kind: 'render',
      detail: cs('press_hybrid_panel_detail'),
      render: ({ visible, onClose }) => <PressHybridLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    // ── Целевые статичные иконки: что оживёт по какому событию ──
    {
      id: 'icon-target-streak-chain',
      title: cs('icon_target_streak_chain_title'),
      kind: 'note',
      note: cs('icon_target_streak_chain_note'),
    },
    {
      id: 'icon-target-level-badge',
      title: cs('icon_target_level_badge_title'),
      kind: 'note',
      note: cs('icon_target_level_badge_note'),
    },
    {
      id: 'icon-target-plus-badge',
      title: cs('icon_target_plus_badge_title'),
      kind: 'note',
      note: cs('icon_target_plus_badge_note'),
    },
    {
      id: 'icon-target-league-crown-name',
      title: cs('icon_target_league_crown_name_title'),
      kind: 'note',
      note: cs('icon_target_league_crown_name_note'),
    },
    {
      id: 'icon-target-notification-center-button',
      title: cs('icon_target_notification_center_button_title'),
      kind: 'note',
      note: cs('icon_target_notification_center_button_note'),
    },
    {
      id: 'icon-target-energy-icon',
      title: cs('icon_target_energy_icon_title'),
      kind: 'note',
      note: cs('icon_target_energy_icon_note'),
    },
    // ── Живое превью: все целевые иконки разом, безопасные демо-пропсы ──
    {
      id: 'icons-live-preview',
      title: cs('icons_live_preview_title'),
      kind: 'render',
      detail: cs('icons_live_preview_detail'),
      render: ({ visible, onClose }) => <IconsLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    // ── Живая панель: таббар «жидкое золото» (гибрид) ──
    {
      // зачем: владелец требует гибрид В РЕАЛЬНОМ таббаре — этот пункт переключает
      // характер движения настоящего таббара внизу (капсула «жидкое золото»,
      // bloom активной иконки). Default 'classic', в стор-сборке недоступно.
      id: 'tabbar-hybrid-real-toggle',
      title: cs('tabbar_real_toggle_title'),
      detail: cs('tabbar_real_toggle_detail'),
      kind: 'event',
      fire: () => {
        const next = getDevTabBarMotionVariant() === 'hybrid' ? 'classic' : 'hybrid';
        setDevTabBarMotionVariant(next);
        emitAppEvent('action_toast', actionToastTri('info', next === 'hybrid'
          ? { ru: 'Таббар: гибрид включён', uk: 'Таббар: гібрид увімкнено', es: 'Barra: híbrido activado', 'pt-BR': 'Barra: híbrido ativado', vi: 'Thanh tab: bật hybrid', id: 'Bilah tab: hybrid aktif', tr: 'Sekme çubuğu: hibrit açık', pl: 'Pasek: hybryda włączona' }
          : { ru: 'Таббар: обычный вид', uk: 'Таббар: звичайний вигляд', es: 'Barra: vista clásica', 'pt-BR': 'Barra: visual clássico', vi: 'Thanh tab: kiểu thường', id: 'Bilah tab: tampilan biasa', tr: 'Sekme çubuğu: klasik', pl: 'Pasek: zwykły widok' }));
      },
    },
    {
      id: 'tabbar-hybrid-live-preview',
      title: cs('tabbar_hybrid_preview_title'),
      kind: 'render',
      detail: cs('tabbar_hybrid_preview_detail'),
      render: ({ visible, onClose }) => <TabBarHybridLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    // ── Реальный таббар для проверки текущего состояния ──
    {
      id: 'route-tabbar-home',
      title: cs('route_tabbar_home_title'),
      kind: 'route',
      route: '/(tabs)/home',
      detail: cs('route_tabbar_home_detail'),
    },
    // ── Живая панель: огонь стрика (гибрид) ──
    {
      id: 'streak-flame-hybrid-live-preview',
      title: cs('streak_flame_hybrid_title'),
      kind: 'render',
      detail: cs('streak_flame_hybrid_detail'),
      render: ({ visible, onClose }) => <StreakFlameHybridLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    // ── Живая панель: кнопки с кромкой (keycap-физика DuoPressable) ──
    {
      id: 'edge-press-live-preview',
      title: cs('edge_press_panel_title'),
      kind: 'render',
      detail: cs('edge_press_panel_detail'),
      render: ({ visible, onClose }) => <EdgePressLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    // ── Живые панели: прогресс-примитивы (кольцо/бар/таймер) с гибрид-заливкой ──
    {
      id: 'progress-ring-live-preview',
      title: cs('progress_ring_hybrid_title'),
      kind: 'render',
      detail: cs('progress_ring_hybrid_detail'),
      render: ({ visible, onClose }) => <ProgressRingLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    {
      id: 'progress-bar-live-preview',
      title: cs('progress_bar_hybrid_title'),
      kind: 'render',
      detail: cs('progress_bar_hybrid_detail'),
      render: ({ visible, onClose }) => <ProgressBarLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    {
      id: 'progress-timer-live-preview',
      title: cs('progress_timer_hybrid_title'),
      kind: 'render',
      detail: cs('progress_timer_hybrid_detail'),
      render: ({ visible, onClose }) => <ProgressTimerLivePreviewMemo visible={visible} onClose={onClose} />,
    },
  ],
};
