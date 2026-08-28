// ════════════════════════════════════════════════════════════════════════════
// ReleaseNotesModal — одноразовое окно «что нового» для старых пользователей.
//
// Выбранный владельцем вариант B: короткие разговорные главы, которые легко
// просмотреть глазами, но они всё ещё звучат как живое обращение команды.
//
// Тексты — в release_notes_copy.ts (8 локалей). Здесь только вёрстка и движение.
// ════════════════════════════════════════════════════════════════════════════
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
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
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
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
   * зачем: гибрид «Световод + Чекан» (.motion-mockups/phraseman-hybrid.html,
   * семья «Полноэкранные») — сцена входит из света, контент каскадом. Боевой
   * дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
};

/**
 * Один пункт списка. Плоский ряд «иконка + текст», без вложенных карточек:
 * карточка в карточке — всегда лишний слой (и запрет владельца на обводки).
 * Золотой и синий тона чередуют главы и помогают быстро найти нужный факт.
 */
const ReleaseNoteRow = memo(function ReleaseNoteRow({
  item,
  titleSize,
  bodySize,
}: {
  item: ReleaseNoteItem;
  titleSize: number;
  bodySize: number;
}) {
  const isGold = item.tone === 'gold';
  const accent = isGold ? '#F9D77A' : '#8FB4FF';
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: isGold ? 'rgba(249,215,122,0.16)' : 'rgba(143,180,255,0.14)' },
        ]}
      >
        <Ionicons name={item.icon} size={17} color={accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { fontSize: titleSize, color: '#FFF4DC' }]}>
          {item.title}
        </Text>
        <Text style={[styles.rowBody, { fontSize: bodySize, color: '#C2D2E8' }]}>
          {item.body}
        </Text>
      </View>
    </View>
  );
});

function ReleaseNotesModal({ visible, onClose, motionVariant = 'classic' }: Props) {
  const { f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  // зачем: системная настройка «уменьшить движение» — бесконечный блик для
  // таких пользователей не запускаем вовсе.
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const cardAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  const tx = useMemo(() => pickReleaseNotesTexts(lang), [lang]);

  // Окно прокручивается, поэтому не зажимаем пользовательский крупный шрифт до
  // базового размера. Верхние границы лишь защищают неподвижный hero и CTA.
  const titleSize = Math.min(Math.max(f.h2, 23), 28);
  const rowTitleSize = Math.min(Math.max(f.body, 16), 19);
  const bodySize = Math.min(Math.max(f.body, 15), 18);
  const captionSize = Math.min(Math.max(f.caption, 13), 15);
  const buttonSize = Math.min(Math.max(f.bodyLg, 17), 20);

  useEffect(() => {
    if (!visible) {
      cardAnim.setValue(0);
      shineAnim.setValue(0);
      return;
    }

    if (reduceMotion) {
      // Карточка появляется сразу, без пружины и без петель.
      cardAnim.setValue(1);
      return;
    }

    // зачем: гибрид «Световод» — карточка settle без отскока (LUM.settle),
    // без бесконечных петель свечения/блика (те принадлежат только classic —
    // база гибрида «свет рождает форму», не декоративный дрейф).
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

    if (isHybrid) {
      enter.start();
      return () => { enter.stop(); };
    }

    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(6800),
      ]),
    );

    enter.start();
    shineLoop.start();

    return () => {
      enter.stop();
      shineLoop.stop();
    };
  }, [cardAnim, shineAnim, reduceMotion, visible, isHybrid]);

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

  const shineAnimatedStyle = {
    opacity: shineAnim.interpolate({
      inputRange: [0, 0.25, 0.55, 1],
      outputRange: [0, 0.24, 0.08, 0],
    }),
    transform: [
      {
        translateX: shineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-260, 260],
        }),
      },
      { rotate: '18deg' },
    ],
  };

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
          accessibilityLabel={tx.close}
        />
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <LinearGradient
            colors={['#111722', '#171A24', '#241F13']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* зачем: гибрид «Световод» — свет рождает форму, без бесконечного блика (тот только у classic). */}
          {isHybrid ? null : <Animated.View pointerEvents="none" style={[styles.shine, shineAnimatedStyle]} />}

          <View style={styles.hero}>
            <View style={styles.releasePill}>
              <Ionicons name="rocket-outline" size={14} color={'#F9D77A'} />
              <Text style={[styles.releasePillText, { fontSize: captionSize, color: '#F9D77A' }]}>
                {tx.pill}
              </Text>
            </View>
            <Text style={[styles.title, { fontSize: titleSize, color: '#FFF7E3' }]}>
              {tx.title}
            </Text>
            <Text style={[styles.subtitle, { fontSize: bodySize, color: '#C8D6EA' }]}>
              {tx.subtitle}
            </Text>
          </View>

          <ScrollView decelerationRate="fast"
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator
            bounces
          >
            {tx.items.map((item) => (
              <ReleaseNoteRow
                key={item.title}
                item={item}
                titleSize={rowTitleSize}
                bodySize={bodySize}
              />
            ))}
            <Text style={[styles.footer, { fontSize: captionSize, color: '#93A6C0' }]}>
              {tx.footer}
            </Text>
          </ScrollView>

          <DuoPressable
            onPress={closeOnce}
            accessibilityRole="button"
            accessibilityLabel={tx.cta}
            edgeColor="#B9791F"
            edgeHeight={4}
            wrapStyle={styles.btnWrap}
            style={styles.btn}
            gradientColors={['#FFE08A', '#F7BE4F', '#E99D35']}
            gradientStart={{ x: 0, y: 0 }}
            gradientEnd={{ x: 1, y: 1 }}
          >
            <Text style={[styles.btnText, { fontSize: buttonSize, color: '#121826' }]}>
              {tx.cta}
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
    backgroundColor: 'rgba(3, 7, 18, 0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    height: '86%',
    maxHeight: '86%',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    ...noAndroidOutline,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -80,
    bottom: -80,
    width: 96,
    backgroundColor: '#FFF7CE',
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 14,
  },
  releasePill: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 215, 122, 0.1)',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  releasePillText: {
    color: '#F9D77A',
    fontWeight: '800',
  },
  title: {
    textAlign: 'center',
    color: '#FFF7E3',
    fontWeight: '900',
    lineHeight: 29,
    marginBottom: 8,
  },
  subtitle: {
    color: '#C8D6EA',
    textAlign: 'center',
    lineHeight: 21,
  },
  scroll: {
    alignSelf: 'stretch',
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: '#FFF4DC',
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 3,
  },
  rowBody: {
    color: '#C2D2E8',
    lineHeight: 21,
  },
  footer: {
    color: '#93A6C0',
    lineHeight: 19,
    marginTop: 2,
    marginBottom: 4,
  },
  btnWrap: {
    width: '100%',
    marginTop: 12,
    shadowColor: '#F7BE4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  btn: {
    borderRadius: 16,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  btnText: {
    color: '#121826',
    fontWeight: '900',
    textAlign: 'center',
  },
});
