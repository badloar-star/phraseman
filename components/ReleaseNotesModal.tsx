// ════════════════════════════════════════════════════════════════════════════
// ReleaseNotesModal — одноразовое окно «что нового» для старых пользователей.
//
// Выбранный владельцем вариант B: короткие разговорные главы, которые легко
// просмотреть глазами, но они всё ещё звучат как живое обращение команды.
//
// Тексты — в release_notes_copy.ts (8 локалей). Здесь только вёрстка и движение.
//
// зачем (Liquid Glass, ночной перенос 2026-09-29): обычные «Что нового» — шторка
// HybridSheetShell material="liquid-glass" как ReleaseNotesV2Modal / макет SYS-06;
// вариант-объявление (AppMessageAnnouncementModal) остаётся центральной карточкой,
// но на непрозрачной основе и токенах темы, без жёстких hex и бликов.
// ════════════════════════════════════════════════════════════════════════════
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from './SafeLinearGradient';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { pickReleaseNotesTexts, type ReleaseNoteItem } from './release_notes_copy';
import { LUM } from '../constants/motionHybrid';

import { noAndroidOutline } from '../constants/androidGlow';
import DuoPressable from './DuoPressable';

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * Optional one-message variant for admin announcements. It keeps the exact
   * release-notes shell, while replacing the built-in changelog copy with the
   * message sent from the admin Inbox.
   */
  announcement?: ReleaseNotesAnnouncement | null;
  /** Optional icon-only dismiss control for announcement variants. */
  showCloseButton?: boolean;
  /**
   * зачем: гибрид «Световод + Чекан» (.motion-mockups/phraseman-hybrid.html,
   * семья «Полноэкранные») — сцена входит из света, контент каскадом. Боевой
   * дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
};

export type ReleaseNotesAnnouncement = {
  readonly title: string;
  readonly body: string;
  readonly cta: string;
  readonly close: string;
};

/**
 * Один пункт списка. Плоский ряд «иконка + текст», без вложенных карточек и обводок.
 * зачем: Liquid Glass (SYS-06) — иконка на нейтральной плитке темы, цвет текста из
 * токенов, а не из жёстких «золотых/синих» hex; тон главы больше не красит иконку.
 */
const ReleaseNoteRow = memo(function ReleaseNoteRow({
  item,
  titleSize,
  bodySize,
  glass,
}: {
  item: ReleaseNoteItem;
  titleSize: number;
  bodySize: number;
  glass: ReturnType<typeof liquidGlassTokens>;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: glass.opaqueControl }]} accessible={false}>
        <Ionicons name={item.icon} size={20} color={glass.lightTint} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { fontSize: titleSize, color: glass.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.rowBody, { fontSize: bodySize, color: glass.secondary }]}>
          {item.body}
        </Text>
      </View>
    </View>
  );
});

function ReleaseNotesModal({
  visible,
  onClose,
  announcement = null,
  showCloseButton = false,
  motionVariant = 'classic',
}: Props) {
  const { f, liquidGlassThemeId } = useTheme();
  const announcementGlass = liquidGlassTokens(liquidGlassThemeId);
  const releaseGlass = announcementGlass;
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  // зачем: системная настройка «уменьшить движение» — бесконечный блик для
  // таких пользователей не запускаем вовсе.
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const cardAnim = useRef(new Animated.Value(0)).current;

  const tx = useMemo(() => pickReleaseNotesTexts(lang), [lang]);
  const displayTx = useMemo(() => {
    if (!announcement) return tx;
    return {
      ...tx,
      title: announcement.title,
      cta: announcement.cta,
      close: announcement.close,
    };
  }, [announcement, tx]);

  // Окно прокручивается, поэтому не зажимаем пользовательский крупный шрифт до
  // базового размера. Верхние границы лишь защищают неподвижный hero и CTA.
  const titleSize = Math.min(Math.max(f.h2, 23), 28);
  const rowTitleSize = Math.min(Math.max(f.body, 16), 19);
  const bodySize = Math.min(Math.max(f.body, 15), 18);
  const captionSize = Math.min(Math.max(f.caption, 13), 15);
  const buttonSize = Math.min(Math.max(f.bodyLg, 17), 20);

  // зачем: обычные «Что нового» теперь идут через HybridSheetShell (своё движение) —
  // локальная пружина карточки нужна только варианту объявления. Бесконечный блик
  // (кремовый hex) убран вместе со старой карточкой.
  const isSheet = !announcement;
  useEffect(() => {
    if (isSheet) return;
    if (!visible) {
      cardAnim.setValue(0);
      return;
    }

    if (reduceMotion) {
      // Карточка появляется сразу, без пружины.
      cardAnim.setValue(1);
      return;
    }

    // зачем: гибрид «Световод» — карточка settle без отскока (LUM.settle).
    const enter = isHybrid
      ? Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: LUM.settle.stiffness,
        damping: LUM.settle.damping,
        mass: LUM.settle.mass,
      })
      : Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 74,
        friction: 9,
      });

    enter.start();
    return () => { enter.stop(); };
  }, [cardAnim, isSheet, reduceMotion, visible, isHybrid]);

  const closeOnce = () => {
    hapticTap();
    onClose();
  };

  const cardAnimatedStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
      {
        scale: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  if (isSheet) {
    return (
      <HybridSheetShell
        visible={visible}
        onClose={onClose}
        closeLabel={displayTx.close}
        backdropAccessible={false}
        material="liquid-glass"
        testID="release-notes-sheet"
      >
        {({ requestDismiss }) => (
          <>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false} decelerationRate="fast"
            >
              <Text style={[styles.eyebrow, { fontSize: captionSize, color: releaseGlass.secondary }]}>
                {displayTx.pill}
              </Text>
              <Text
                accessibilityRole="header"
                style={[styles.sheetTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.22), color: releaseGlass.text }]}
              >
                {displayTx.title}
              </Text>
              <Text style={[styles.sheetSubtitle, { fontSize: bodySize, color: releaseGlass.secondary }]}>
                {displayTx.subtitle}
              </Text>
              <View style={styles.items}>
                {displayTx.items.map((item) => (
                  <ReleaseNoteRow
                    key={item.title}
                    item={item}
                    titleSize={rowTitleSize}
                    bodySize={bodySize}
                    glass={releaseGlass}
                  />
                ))}
              </View>
              <Text style={[styles.footer, { fontSize: captionSize, color: releaseGlass.mutedText }]}>
                {displayTx.footer}
              </Text>
            </ScrollView>
            <DuoPressable
              testID="release-notes-cta"
              onPress={requestDismiss}
              accessibilityRole="button"
              accessibilityLabel={displayTx.cta}
              edgeColor={releaseGlass.opaqueControl}
              edgeHeight={4}
              wrapStyle={styles.sheetCtaWrap}
              style={[styles.btn, { backgroundColor: releaseGlass.accent }]}
            >
              <Text style={[styles.btnText, { fontSize: buttonSize, color: releaseGlass.accentInk }]}>
                {displayTx.cta}
              </Text>
            </DuoPressable>
          </>
        )}
      </HybridSheetShell>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isHybrid ? 'none' : 'fade'}
      statusBarTranslucent
      onRequestClose={closeOnce}
    >
      <View style={[styles.root, { paddingBottom: bottomInset }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnce}
          accessibilityRole="button"
          accessibilityLabel={displayTx.close}
        />
        <Animated.View
          style={[
            styles.card,
            styles.announcementCard,
            cardAnimatedStyle,
          ]}
        >
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: announcementGlass.opaqueSheet }]} />

          {showCloseButton ? (
            <Pressable
              onPress={closeOnce}
              accessibilityRole="button"
              accessibilityLabel={displayTx.close}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[styles.closeButton, { backgroundColor: announcementGlass.buttonFill }]}
            >
              <Ionicons name="close" size={22} color={announcementGlass.text} />
            </Pressable>
          ) : null}

          {announcement ? (
            <View style={styles.announcementContent}>
              <ScrollView
                decelerationRate="fast"
                style={styles.announcementScroll}
                contentContainerStyle={styles.announcementScrollInner}
                showsVerticalScrollIndicator
                bounces
              >
                <View
                  style={[
                    styles.announcementStageOuter,
                    {
                      backgroundColor: announcementGlass.opaqueControl,
                      shadowColor: announcementGlass.bg,
                    },
                  ]}
                >
                  <View style={styles.announcementStage}>
                    <LinearGradient
                      pointerEvents="none"
                      colors={[announcementGlass.selected, announcementGlass.opaqueControl]}
                      start={{ x: 0.18, y: 0.12 }}
                      end={{ x: 0.82, y: 0.9 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={[announcementGlass.lightTint, 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.78, y: 0.72 }}
                      style={[StyleSheet.absoluteFill, { opacity: 0.14 }]}
                    />
                    <View pointerEvents="none" style={styles.announcementStageRim} />
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color={announcementGlass.lightTint} />
                  </View>
                </View>
                <Text style={[styles.title, { fontSize: titleSize, color: announcementGlass.text }]}>
                  {displayTx.title}
                </Text>
                <Text style={[styles.announcementBody, { fontSize: bodySize, color: announcementGlass.secondary }]}>
                  {announcement.body}
                </Text>
              </ScrollView>
            </View>
          ) : null}

          <DuoPressable
            onPress={closeOnce}
            accessibilityRole="button"
            accessibilityLabel={displayTx.cta}
            edgeColor={announcementGlass.opaqueControl}
            edgeHeight={4}
            wrapStyle={styles.btnWrap}
            style={[styles.btn, { backgroundColor: announcementGlass.accent }]}
          >
            <Text style={[styles.btnText, { fontSize: buttonSize, color: announcementGlass.accentInk }]}>
              {displayTx.cta}
            </Text>
          </DuoPressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(ReleaseNotesModal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    ...noAndroidOutline,
    overflow: 'hidden',
  },
  announcementCard: {
    alignItems: 'stretch',
    paddingTop: 58,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementContent: {
    width: '100%',
    flexShrink: 1,
  },
  announcementStageOuter: {
    width: 108,
    height: 108,
    alignSelf: 'center',
    borderRadius: 34,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.26,
    shadowRadius: 24,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  announcementStage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    overflow: 'hidden',
  },
  announcementStageRim: {
    position: 'absolute',
    top: 1,
    alignSelf: 'center',
    width: '72%',
    height: StyleSheet.hairlineWidth,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)', // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  },
  announcementScroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  announcementScrollInner: {
    paddingBottom: 2,
  },
  announcementBody: {
    lineHeight: 23,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 29,
    marginBottom: 8,
  },
  // Sheet (SYS-06 «Что нового»): те же размеры, что у ReleaseNotesV2Modal.
  sheetScroll: { flexShrink: 1 },
  sheetScrollContent: { paddingTop: 12, paddingBottom: 8 },
  eyebrow: { lineHeight: 18, fontWeight: '700', letterSpacing: 2 },
  sheetTitle: { fontWeight: '700', marginTop: 6 },
  sheetSubtitle: { lineHeight: 22, marginTop: 8 },
  items: { marginTop: 18, gap: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontWeight: '700',
    lineHeight: 22,
  },
  rowBody: {
    lineHeight: 21,
    marginTop: 2,
  },
  footer: {
    lineHeight: 19,
    marginTop: 16,
  },
  sheetCtaWrap: {
    width: '100%',
    marginTop: 12,
  },
  btnWrap: {
    width: '100%',
    marginTop: 12,
  },
  btn: {
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
