// ════════════════════════════════════════════════════════════════════════════
// ReleaseNotesModal — окно «что нового» для СТАРЫХ пользователей (релиз 1.6.0).
//
// зачем: за релиз переименовались валюта и раздел, а экран «Друзья» исчез.
// Пользователь, помнящий билд 103, без объяснения решит, что у него отобрали
// жемчужины и половину приложения. Окно снимает этот испуг: каждый пункт —
// сначала факт, потом тёплая самоирония, почему так вышло.
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
import { FlowText } from './text-integrity/FlowText';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { pickReleaseNotesTexts, type ReleaseNoteItem } from './release_notes_copy';
import FullscreenHybridEntrance from './feedback/FullscreenHybridEntrance';
import { LUM } from '../constants/motionHybrid';

import { noAndroidOutline } from '../constants/androidGlow';

/**
 * Локали окна. Контракт release_update_modals_locale_runtime.test.ts требует,
 * чтобы все плановые языки были видимы в исходнике этого файла.
 * ru · uk · es · 'pt-BR' · vi · id · tr · pl
 */
const TEXT = {
  chips: {
    ru: ['Жемчужины', 'Турнир', 'Бесплатно'],
    uk: ['Перлини', 'Турнір', 'Безкоштовно'],
    es: ['Perlas', 'Torneo', 'Gratis'],
    'pt-BR': ['Pérolas', 'Torneio', 'Grátis'],
    vi: ['Ngọc trai', 'Giải đấu', 'Miễn phí'],
    id: ['Mutiara', 'Turnamen', 'Gratis'],
    tr: ['İnciler', 'Turnuva', 'Ücretsiz'],
    pl: ['Perły', 'Turniej', 'Za darmo'],
  },
} as const;

const pickReleaseNotesCopy = <T extends { ru: unknown }>(
  lang: string,
  copy: T,
) => (copy[lang as keyof T] ?? copy.ru) as T[keyof T];

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
 * Пункты про деньги подсвечены тоном — именно они снимают испуг «отобрали».
 */
const ReleaseNoteRow = memo(function ReleaseNoteRow({
  item,
  themeMode,
  titleSize,
  bodySize,
}: {
  item: ReleaseNoteItem;
  themeMode: string;
  titleSize: number;
  bodySize: number;
}) {
  const accent = item.reassuring ? '#F9D77A' : '#8FB4FF';
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: item.reassuring ? 'rgba(249,215,122,0.16)' : 'rgba(143,180,255,0.14)' },
        ]}
      >
        <Ionicons name={item.icon} size={17} color={monoIcon(themeMode as never, accent)} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { fontSize: titleSize, color: monoIcon(themeMode as never, '#FFF4DC') }]}>
          {item.title}
        </Text>
        <Text style={[styles.rowBody, { fontSize: bodySize, color: monoIcon(themeMode as never, '#C2D2E8') }]}>
          {item.body}
        </Text>
      </View>
    </View>
  );
});

function ReleaseNotesModal({ visible, onClose, motionVariant = 'classic' }: Props) {
  const { f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  // зачем: системная настройка «уменьшить движение» — бесконечные петли
  // свечения и блика для таких пользователей не запускаем вовсе.
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const cardAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  const tx = useMemo(() => pickReleaseNotesTexts(lang), [lang]);
  const chips = useMemo(() => pickReleaseNotesCopy(lang, TEXT.chips), [lang]);
  const versionLabel = useMemo(() => pickReleaseNotesCopy(lang, {
    ru: 'Обновление',
    uk: 'Оновлення',
    es: 'Actualización',
    'pt-BR': 'Atualização',
    vi: 'Cập nhật',
    id: 'Pembaruan',
    tr: 'Güncelleme',
    pl: 'Aktualizacja',
  }), [lang]);

  const titleSize = Math.min(f.h2, 23);
  const rowTitleSize = Math.min(f.body, 16);
  const bodySize = Math.min(f.body, 15);
  const captionSize = Math.min(f.caption, 13);
  const buttonSize = Math.min(f.bodyLg, 17);

  useEffect(() => {
    if (!visible) {
      cardAnim.setValue(0);
      glowAnim.setValue(0);
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

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
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
    glowLoop.start();
    shineLoop.start();

    return () => {
      enter.stop();
      glowLoop.stop();
      shineLoop.stop();
    };
  }, [cardAnim, glowAnim, shineAnim, reduceMotion, visible, isHybrid]);

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

  const iconAnimatedStyle = {
    transform: [
      {
        scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
      {
        rotate: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-4deg', '5deg'],
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
            <Animated.View style={[styles.iconHalo, iconAnimatedStyle]}>
              <LinearGradient colors={['#FFF1B8', '#F7C75F', '#D68A2E']} style={styles.iconBadge}>
                <Ionicons name="sparkles" size={25} color={monoIcon(themeMode, '#172033', MONO_ICON.onLight)} />
              </LinearGradient>
            </Animated.View>
            <View style={styles.releasePill}>
              <Ionicons name="rocket-outline" size={14} color={monoIcon(themeMode, '#F9D77A')} />
              <Text style={[styles.releasePillText, { fontSize: captionSize, color: monoIcon(themeMode, '#F9D77A') }]}>
                {versionLabel}
              </Text>
            </View>
            <Text style={[styles.title, { fontSize: titleSize, color: monoIcon(themeMode, '#FFF7E3') }]}>
              {tx.title}
            </Text>
            <Text style={[styles.subtitle, { fontSize: bodySize, color: monoIcon(themeMode, '#C8D6EA') }]}>
              {tx.subtitle}
            </Text>
          </View>

          <View style={styles.chipsWrap}>
            {chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                {/* зачем: text-integrity — чип переносится/растёт, не усекается. */}
                <FlowText
                  testID="release-notes-chip"
                  provenance="authored"
                  style={[styles.chipText, { fontSize: captionSize, color: monoIcon(themeMode, '#DCE8FF') }]}
                >
                  {chip}
                </FlowText>
              </View>
            ))}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator
            bounces
          >
            {tx.items.map((item) => (
              <ReleaseNoteRow
                key={item.title}
                item={item}
                themeMode={themeMode}
                titleSize={rowTitleSize}
                bodySize={bodySize}
              />
            ))}
            <Text style={[styles.footer, { fontSize: captionSize, color: monoIcon(themeMode, '#93A6C0') }]}>
              {tx.footer}
            </Text>
          </ScrollView>

          <Pressable
            onPress={closeOnce}
            accessibilityRole="button"
            accessibilityLabel={tx.cta}
            style={({ pressed }) => [
              styles.btn,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={['#FFE08A', '#F7BE4F', '#E99D35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnGradient}
            >
              <Text style={[styles.btnText, { fontSize: buttonSize, color: monoIcon(themeMode, '#121826', MONO_ICON.onLight) }]}>
                {tx.cta}
              </Text>
            </LinearGradient>
          </Pressable>
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
  iconHalo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 199, 95, 0.13)',
    marginBottom: 10,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  chipsWrap: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 14,
  },
  chip: {
    minHeight: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  chipText: {
    color: '#DCE8FF',
    fontWeight: '700',
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
  btn: {
    width: '100%',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#F7BE4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  btnGradient: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  btnText: {
    color: '#121826',
    fontWeight: '900',
    textAlign: 'center',
  },
});
