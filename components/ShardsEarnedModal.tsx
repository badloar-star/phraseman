// ShardsEarnedModal — премиальная модалка при получении осколков
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
import {
  RewardModalBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

interface Props {
  visible: boolean;
  amount: number;
  reason: string;
  onClose: () => void;
}

/** Автозакрытие только спустя это время; до этого — только тап по затемнению. */
const AUTO_CLOSE_MS = 40_000;
const USE_ELITE_SHARDS_EARNED_MODAL = true;

function headline(lang: Lang): string {
  return triLang(lang, {
    ru: 'Сокровище зачислено',
    uk: 'Скарб зараховано',
    es: 'Tesoro acreditado',
    'pt-BR': 'Tesouro creditado',
    vi: 'Kho báu đã được cộng',
    id: 'Harta telah ditambahkan',
    tr: 'Hazine eklendi',
    pl: 'Skarb dodany',
  });
}

function tapHint(lang: Lang): string {
  return triLang(lang, {
    ru: 'Коснись экрана, чтобы продолжить',
    uk: 'Торкнись екрана, щоб продовжити',
    es: 'Toca en cualquier sitio para seguir',
    'pt-BR': 'Toque na tela para continuar',
    vi: 'Chạm vào màn hình để tiếp tục',
    id: 'Ketuk layar untuk melanjutkan',
    tr: 'Devam etmek için ekrana dokun',
    pl: 'Dotknij ekranu, aby kontynuować',
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
  const entranceY = useRef(new Animated.Value(18)).current;
  const topLineGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    hapticSuccess();
    scaleAnim.setValue(USE_ELITE_SHARDS_EARNED_MODAL ? 0.92 : 0.5);
    opacityAnim.setValue(0);
    gemBounce.setValue(0);
    glowAnim.setValue(0);
    sheen.setValue(0);
    entranceY.setValue(18);
    topLineGlow.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: USE_ELITE_SHARDS_EARNED_MODAL ? 9 : 6, tension: USE_ELITE_SHARDS_EARNED_MODAL ? 70 : 100, useNativeDriver: true }),
      Animated.spring(entranceY, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(topLineGlow, { toValue: 1, duration: 900, useNativeDriver: true }),
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
  }, [visible, scaleAnim, opacityAnim, gemBounce, glowAnim, sheen, entranceY, topLineGlow]);

  if (!visible) return null;

  const dim = themeMode === 'minimalLight'
    ? (USE_ELITE_SHARDS_EARNED_MODAL ? 'rgba(8,12,20,0.68)' : 'rgba(8,12,20,0.55)')
    : (USE_ELITE_SHARDS_EARNED_MODAL ? 'rgba(3,5,10,0.82)' : 'rgba(0,0,0,0.68)');
  const modalAccent = rewardModalAccentColor(themeMode, t);

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
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
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
              transform: [{ scale: scaleAnim }, { translateY: USE_ELITE_SHARDS_EARNED_MODAL ? entranceY : 0 }],
              maxWidth: USE_ELITE_SHARDS_EARNED_MODAL ? 336 : 340,
              width: '90%',
            }}
            pointerEvents="auto"
          >
            <LinearGradient
              colors={USE_ELITE_SHARDS_EARNED_MODAL ? ['rgba(255,255,255,0.10)', modalAccent, 'rgba(255,255,255,0.08)'] : [...SHARD_MODAL_FRAME_COLORS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.frameOuter, USE_ELITE_SHARDS_EARNED_MODAL && styles.eliteFrameOuter]}
            >
              <View style={[styles.innerCard, USE_ELITE_SHARDS_EARNED_MODAL && styles.eliteInnerCard, { backgroundColor: 'transparent', borderColor: rewardModalPanelBorder(themeMode, t) }]}>
                <LinearGradient
                  colors={rewardModalPanelColors(themeMode, t)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={[...SHARD_MODAL_ACCENT_GLOW]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[StyleSheet.absoluteFill, { opacity: USE_ELITE_SHARDS_EARNED_MODAL ? 0.62 : 1 }]}
                />
                {USE_ELITE_SHARDS_EARNED_MODAL && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.eliteTopLine,
                      {
                        backgroundColor: modalAccent,
                        opacity: topLineGlow.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.46] }),
                      },
                    ]}
                  />
                )}
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
                  style={[styles.eyebrow, USE_ELITE_SHARDS_EARNED_MODAL && styles.eliteEyebrow, { color: modalAccent }]}
                  numberOfLines={1}
                >
                  ✦ {headline(lang)} ✦
                </Text>

                <Animated.View style={{ transform: [{ translateY: gemBounce }], marginTop: USE_ELITE_SHARDS_EARNED_MODAL ? 12 : 10, marginBottom: 8 }}>
                  <Animated.View
                    style={{
                      opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
                    }}
                  >
                    <View style={[styles.gemHalo, USE_ELITE_SHARDS_EARNED_MODAL && styles.eliteGemHalo, { borderColor: modalAccent + (USE_ELITE_SHARDS_EARNED_MODAL ? '44' : '55'), backgroundColor: rewardModalSoftSurface(themeMode, t) }]}>
                      <Image
                        source={oskolokImageForPackShards(amount)}
                        style={{ width: USE_ELITE_SHARDS_EARNED_MODAL ? 88 : 84, height: USE_ELITE_SHARDS_EARNED_MODAL ? 88 : 84 }}
                        resizeMode="contain"
                      />
                    </View>
                  </Animated.View>
                </Animated.View>

                <Text style={[styles.amount, USE_ELITE_SHARDS_EARNED_MODAL && styles.eliteAmount, { color: modalAccent }]}>+{amount}</Text>
                <Text
                  style={[styles.shardKind, { color: t.textSecond }]}
                  numberOfLines={2}
                >
                  {shardLabel}
                </Text>

                <View style={[styles.reasonBox, USE_ELITE_SHARDS_EARNED_MODAL && styles.eliteReasonBox, { backgroundColor: rewardModalSoftSurface(themeMode, t), borderColor: rewardModalPanelBorder(themeMode, t) }]}>
                  <Text style={[styles.reasonLabel, { color: modalAccent }]}>{triLang(lang, {
                    ru: 'За что',
                    uk: 'За що',
                    es: 'Motivo',
                    'pt-BR': 'Motivo',
                    vi: 'Lý do',
                    id: 'Alasan',
                    tr: 'Neden',
                    pl: 'Powód',
                  })}</Text>
                  <Text style={[styles.reasonText, { color: t.textPrimary, fontSize: f.body }]}>
                    {reason}
                  </Text>
                </View>

                <Text style={[styles.tapHint, USE_ELITE_SHARDS_EARNED_MODAL && styles.eliteTapHint, { color: t.textMuted, fontSize: f.caption }]}>
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
  eliteFrameOuter: {
    borderRadius: 30,
    padding: 1,
    shadowColor: '#D6B85C',
    shadowOpacity: 0.22,
    shadowRadius: 32,
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
  eliteInnerCard: {
    borderRadius: 29,
    paddingTop: 28,
    paddingBottom: 26,
  },
  eliteTopLine: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 30,
    height: 1,
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
  eliteEyebrow: {
    letterSpacing: 1.7,
  },
  gemHalo: {
    padding: 14,
    borderRadius: 52,
    borderWidth: 1.5,
  },
  eliteGemHalo: {
    padding: 15,
    borderWidth: 1,
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
  eliteAmount: {
    fontSize: 48,
    letterSpacing: 0,
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
  eliteReasonBox: {
    borderRadius: 18,
    paddingVertical: 15,
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
  eliteTapHint: {
    opacity: 0.78,
  },
});
