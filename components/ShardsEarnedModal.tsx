// ShardsEarnedModal — премиальная модалка при получении осколков
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { playShardsRewardModalSound } from '../app/achievement_modal_sound';
import { oskolokImageForPackShards } from '../app/oskolok';
import { triLang, type Lang } from '../constants/i18n';
import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
} from '../constants/shard_plurals';
import { SHARD_MODAL_ACCENT_GLOW, SHARD_MODAL_FRAME_COLORS } from '../constants/shard_modal_chrome';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

interface Props {
  visible: boolean;
  amount: number;
  reason: string;
  onClose: () => void;
}

/** Автозакрытие только спустя это время; до этого — только тап по затемнению. */
const AUTO_CLOSE_MS = 40_000;

function headline(lang: Lang): string {
  return triLang(lang, {
    ru: 'Сокровище зачислено',
    uk: 'Скарб зараховано',
    es: 'Tesoro acreditado',
  });
}

function tapHint(lang: Lang): string {
  return triLang(lang, {
    ru: 'Коснись экрана, чтобы продолжить',
    uk: 'Торкнись екрана, щоб продовжити',
    es: 'Toca en cualquier sitio para seguir',
  });
}

export default function ShardsEarnedModal({ visible, amount, reason, onClose }: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const isES = lang === 'es';
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const gemBounce = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    hapticSuccess();
    void playShardsRewardModalSound();
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0);
    gemBounce.setValue(0);
    glowAnim.setValue(0);
    sheen.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gemBounce, { toValue: -10, duration: 520, useNativeDriver: true }),
          Animated.timing(gemBounce, { toValue: 0, duration: 520, useNativeDriver: true }),
        ]),
        { iterations: 3 },
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 760, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.25, duration: 760, useNativeDriver: true }),
        ]),
        { iterations: 4 },
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(sheen, { toValue: 1, duration: 2400, useNativeDriver: true }),
          Animated.timing(sheen, { toValue: 0, duration: 2400, useNativeDriver: true }),
        ]),
        { iterations: 2 },
      ).start();
    });

    const timer = setTimeout(() => {
      onCloseRef.current();
    }, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [visible, scaleAnim, opacityAnim, gemBounce, glowAnim, sheen]);

  if (!visible) return null;

  const dim =
    themeMode === 'ocean' || themeMode === 'sakura' || themeMode === 'minimalLight'
      ? 'rgba(8,12,20,0.55)'
      : 'rgba(0,0,0,0.68)';

  const shardLabel = isES
    ? amount === 1
      ? 'fragmento de conocimiento'
      : 'fragmentos de conocimiento'
    : lang === 'uk'
      ? ukKnowledgeShardsAfterNumber(amount)
      : ruKnowledgeShardsAfterNumber(amount);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: dim, zIndex: 0 }]}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
        <View style={styles.centerWrap} pointerEvents="box-none">
          <Animated.View
            style={{
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
              maxWidth: 340,
              width: '90%',
            }}
            pointerEvents="auto"
          >
            <LinearGradient
              colors={[...SHARD_MODAL_FRAME_COLORS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.frameOuter}
            >
              <View style={[styles.innerCard, { backgroundColor: t.bgCard, borderColor: 'rgba(255,255,255,0.08)' }]}>
                <LinearGradient
                  colors={[...SHARD_MODAL_ACCENT_GLOW]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View
                  style={[
                    styles.sheenRibbon,
                    {
                      opacity: sheen.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
                      transform: [
                        {
                          translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] }),
                        },
                      ],
                    },
                  ]}
                  pointerEvents="none"
                />

                <Text
                  style={[styles.eyebrow, { color: t.gold }]}
                  numberOfLines={1}
                >
                  ✦ {headline(lang)} ✦
                </Text>

                <Animated.View style={{ transform: [{ translateY: gemBounce }], marginTop: 10, marginBottom: 8 }}>
                  <Animated.View
                    style={{
                      opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
                    }}
                  >
                    <View style={[styles.gemHalo, { borderColor: t.gold + '55', backgroundColor: t.goldBg }]}>
                      <Image
                        source={oskolokImageForPackShards(amount)}
                        style={{ width: 84, height: 84 }}
                        resizeMode="contain"
                      />
                    </View>
                  </Animated.View>
                </Animated.View>

                <Text style={[styles.amount, { color: t.gold }]}>+{amount}</Text>
                <Text
                  style={[styles.shardKind, { color: t.textSecond }]}
                  numberOfLines={2}
                >
                  {shardLabel}
                </Text>

                <View style={[styles.reasonBox, { backgroundColor: t.bgSurface, borderColor: t.gold + '33' }]}>
                  <Text style={[styles.reasonLabel, { color: t.gold }]}>{triLang(lang, {
                    ru: 'За что',
                    uk: 'За що',
                    es: 'Motivo',
                  })}</Text>
                  <Text style={[styles.reasonText, { color: t.textPrimary, fontSize: f.body }]}>
                    {reason}
                  </Text>
                </View>

                <Text style={[styles.tapHint, { color: t.textMuted, fontSize: f.caption }]}>
                  {tapHint(lang)}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  frameOuter: {
    borderRadius: 28,
    padding: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
  },
  innerCard: {
    borderRadius: 25.5,
    paddingTop: 26,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheenRibbon: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#fff',
    transform: [{ skewX: '-18deg' }],
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  gemHalo: {
    padding: 14,
    borderRadius: 52,
    borderWidth: 1.5,
  },
  amount: {
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  shardKind: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  reasonBox: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  reasonText: {
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
  tapHint: {
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.92,
  },
});
