import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { oskolokImageForPackShards } from '../app/oskolok';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import {
  RewardModalBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
} from './RewardModalBackdrop';

interface ThroneRewardModalProps {
  visible: boolean;
  shards: number;
  wins: number;
  onClose: () => void;
}


// Одна плавающая частица
function Particle({
  x, y, size, delay, color,
}: { x: number; y: number; size: number; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1800 + delay * 200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1800 + delay * 200, useNativeDriver: true }),
        ]),
      ).start();
    }, delay * 120);
    return () => clearTimeout(timeout);
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.9, 0.9, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

const PARTICLES = [
  { x: 20, y: 60, size: 5, delay: 0, color: '#FFE566' },
  { x: 55, y: 40, size: 3, delay: 2, color: '#C9A84C' },
  { x: 290, y: 55, size: 4, delay: 4, color: '#FFE566' },
  { x: 320, y: 35, size: 3, delay: 1, color: '#fff' },
  { x: 160, y: 20, size: 3, delay: 6, color: '#C9A84C' },
  { x: 240, y: 30, size: 5, delay: 3, color: '#fff' },
  { x: 80, y: 80, size: 3, delay: 5, color: '#FFD700' },
  { x: 270, y: 70, size: 4, delay: 7, color: '#FFD700' },
];

// Декоративная звезда (SVG)
function StarBurst({ size = 18, color = '#FFE566', opacity = 0.7 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity }}>
      <Path
        d="M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z"
        fill={color}
      />
    </Svg>
  );
}

export default function ThroneRewardModal({ visible, shards, wins, onClose }: ThroneRewardModalProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const primaryButtonColors = rewardModalPrimaryButtonColors(themeMode);

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const crownAnim = useRef(new Animated.Value(0)).current;
  const crownRotate = useRef(new Animated.Value(0)).current;
  const shardAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const rayAnim = useRef(new Animated.Value(0)).current;
  const shardBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      overlayAnim.setValue(0);
      cardAnim.setValue(0);
      crownAnim.setValue(0);
      crownRotate.setValue(0);
      shardAnim.setValue(0);
      glowAnim.setValue(0);
      btnAnim.setValue(0);
      rayAnim.setValue(0);
      shardBounce.setValue(0);
      return;
    }

    // Оверлей
    Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Основная последовательность
    Animated.sequence([
      // 1. Карточка влетает снизу + масштаб
      Animated.parallel([
        Animated.spring(cardAnim, {
          toValue: 1, useNativeDriver: true, tension: 70, friction: 9,
        }),
      ]),
      // 2. Корона появляется с вращением
      Animated.parallel([
        Animated.spring(crownAnim, {
          toValue: 1, useNativeDriver: true, tension: 100, friction: 6,
        }),
        Animated.timing(crownRotate, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
        // Лучи появляются
        Animated.timing(rayAnim, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
      ]),
      // 3. Награда влетает
      Animated.spring(shardAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 7,
      }),
      // 4. Кнопка появляется
      Animated.spring(btnAnim, {
        toValue: 1, useNativeDriver: true, tension: 60, friction: 8,
      }),
    ]).start();

    // Пульсирующее свечение
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();

    // Осколок парит вверх-вниз
    Animated.loop(
      Animated.sequence([
        Animated.timing(shardBounce, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shardBounce, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [visible]);

  const cardScale = cardAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 1.04, 1] });
  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const crownScale = crownAnim.interpolate({ inputRange: [0, 0.5, 0.8, 1], outputRange: [0, 1.4, 0.9, 1] });
  const crownRotateDeg = crownRotate.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.3, 0.85] });
  const rayOpacity = rayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const shardTranslateY = shardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
  const shardScale = shardAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.4, 1.08, 1] });
  const btnTranslateY = btnAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const shardFloat = shardBounce.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const overlayOpacity = overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const handleClose = () => {
    hapticTap();
    onClose();
  };

  const winsText = triLang(lang, {
    ru: `${wins} побед${wins === 1 ? 'а' : wins < 5 ? 'ы' : ''} сегодня — никто тебя не скинул`,
    uk: `${wins} перемог сьогодні — ніхто тебе не скинув`,
    es: `${wins} victorias hoy — nadie te destronó`,
    'pt-BR': `${wins} vitória${wins === 1 ? '' : 's'} hoje — ninguém tirou você do trono`,
    vi: `${wins} chiến thắng hôm nay — chưa ai hạ bạn khỏi ngai`,
    id: `${wins} kemenangan hari ini — belum ada yang menjatuhkanmu`,
    tr: `Bugün ${wins} galibiyet — kimse seni tahttan indirmedi`,
    pl: `Wygrane dzisiaj: ${wins} — nikt Cię nie zrzucił`,
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        {/* Плавающие частицы */}
        {PARTICLES.map((p, i) => (
          <Particle key={i} {...p} />
        ))}

        <Animated.View style={[
          styles.card,
          {
            borderColor: rewardModalPanelBorder(themeMode, t),
            shadowColor: modalAccent,
            transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
            opacity: cardAnim,
          },
        ]}>
          <LinearGradient
            colors={rewardModalPanelColors(themeMode, t)}
            style={styles.cardInner}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          >
            {/* Верхний золотой блик-полоса */}
            <LinearGradient
              colors={['transparent', `${modalAccent}44`, 'transparent']}
              style={styles.topShine}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />

            {/* Большое свечение за короной */}
            <Animated.View style={[styles.bigGlow, { opacity: glowOpacity }]}>
              <LinearGradient
                colors={['rgba(201,168,76,0.55)', 'rgba(255,210,60,0.18)', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
              />
            </Animated.View>

            {/* Лучи */}
            <Animated.View style={[styles.raysWrap, { opacity: rayOpacity }]}>
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <View
                  key={deg}
                  style={[
                    styles.ray,
                    { transform: [{ rotate: `${deg}deg` }] },
                  ]}
                />
              ))}
            </Animated.View>

            {/* Декоративные звёздочки */}
            <View style={styles.starsWrap}>
              <View style={{ position: 'absolute', left: 18, top: 10 }}>
                <StarBurst size={14} color="#FFE566" opacity={0.5} />
              </View>
              <View style={{ position: 'absolute', right: 22, top: 18 }}>
                <StarBurst size={10} color="#C9A84C" opacity={0.4} />
              </View>
              <View style={{ position: 'absolute', left: 32, top: 52 }}>
                <StarBurst size={8} color="#fff" opacity={0.25} />
              </View>
              <View style={{ position: 'absolute', right: 14, top: 50 }}>
                <StarBurst size={12} color="#FFE566" opacity={0.35} />
              </View>
            </View>

            {/* Корона */}
            <Animated.View style={[
              styles.crownWrap,
              {
                transform: [
                  { scale: crownScale },
                  { rotate: crownRotateDeg },
                ],
              },
            ]}>
              <LinearGradient
                colors={['#2E1F04', '#6B4E12', '#C9A84C', '#E8C96A', '#C9A84C', '#6B4E12', '#2E1F04']}
                locations={[0, 0.15, 0.35, 0.5, 0.65, 0.85, 1]}
                style={styles.crownCircle}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {/* Внутренний ободок */}
                <View style={styles.crownInnerRing}>
                  <Ionicons name="trophy" size={46} color="#FFE566" />
                </View>
              </LinearGradient>
              {/* Тень короны */}
              <View style={styles.crownShadow} />
            </Animated.View>

            {/* Заголовок */}
            <View style={styles.titleWrap}>
              <Text style={[styles.title, { fontSize: f.h2 ?? 22 }]}>
                {triLang(lang, {
                  ru: 'Ты удержал трон!',
                  uk: 'Ти втримав трон!',
                  es: '¡Mantuviste el trono!',
                  'pt-BR': 'Você manteve o trono!',
                  vi: 'Bạn đã giữ được ngai!',
                  id: 'Kamu mempertahankan takhta!',
                  tr: 'Tahtı korudun!',
                  pl: 'Utrzymałeś tron!',
                })}
              </Text>
              {/* Линия-декор под заголовком */}
              <LinearGradient
                colors={['transparent', '#C9A84C', 'transparent']}
                style={styles.titleUnderline}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>

            <Text style={[styles.subtitle, { fontSize: f.body ?? 15 }]}>
              {winsText}
            </Text>

            {/* Блок награды */}
            <Animated.View style={[
              styles.rewardRow,
              {
                transform: [{ translateY: shardTranslateY }, { scale: shardScale }],
                opacity: shardAnim,
              },
            ]}>
              <LinearGradient
                colors={['rgba(30,100,180,0.18)', 'rgba(20,70,140,0.28)', 'rgba(30,100,180,0.18)']}
                style={styles.rewardBox}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {/* Блик поверх награды */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.07)', 'transparent']}
                  style={styles.rewardShine}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />

                {/* Настоящая иконка осколков из ассетов проекта */}
                <Animated.View style={{ transform: [{ translateY: shardFloat }] }}>
                  <Image
                    source={oskolokImageForPackShards(shards)}
                    style={styles.shardImage}
                    resizeMode="contain"
                  />
                </Animated.View>

                <View style={styles.rewardTextCol}>
                  <Text style={[styles.rewardAmount, { fontSize: (f.h1 ?? 36) + 4 }]}>
                    +{shards}
                  </Text>
                  <Text style={[styles.rewardLabel, { fontSize: f.caption ?? 11 }]}>
                    {triLang(lang, {
                      ru: 'ОСКОЛКОВ',
                      uk: 'ОСКОЛКІВ',
                      es: 'FRAGMENTOS',
                      'pt-BR': 'FRAGMENTOS',
                      vi: 'MẢNH',
                      id: 'FRAGMEN',
                      tr: 'PARÇA',
                      pl: 'ODŁAMKI',
                    })}
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Разделитель */}
            <LinearGradient
              colors={['transparent', `${modalAccent}55`, 'transparent']}
              style={styles.divider}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />

            {/* Кнопка */}
            <Animated.View style={[
              styles.btnWrap,
              { transform: [{ translateY: btnTranslateY }], opacity: btnAnim },
            ]}>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.8}>
                <LinearGradient
                  colors={primaryButtonColors}
                  start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                  style={styles.btnInner}
                >
                  {/* Блик сверху кнопки */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'transparent']}
                    style={styles.btnTopShine}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  />
                  <Text style={[styles.btnText, { fontSize: f.body ?? 15, color: rewardModalPrimaryButtonText(themeMode) }]}>
                    {triLang(lang, {
                      ru: 'Забрать награду',
                      uk: 'Забрати нагороду',
                      es: 'Reclamar recompensa',
                      'pt-BR': 'Resgatar recompensa',
                      vi: 'Nhận thưởng',
                      id: 'Klaim hadiah',
                      tr: 'Ödülü al',
                      pl: 'Odbierz nagrodę',
                    })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,76,0.55)',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 32,
    elevation: 28,
  },
  cardInner: {
    padding: 28,
    paddingTop: 32,
    alignItems: 'center',
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  topShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  bigGlow: {
    position: 'absolute',
    top: -20,
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
  },
  raysWrap: {
    position: 'absolute',
    top: 30,
    left: '50%',
    marginLeft: -80,
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 1.5,
    height: 80,
    backgroundColor: 'rgba(201,168,76,0.12)',
    top: 0,
    left: '50%',
    marginLeft: -0.75,
    transformOrigin: 'bottom',
  },
  starsWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  crownWrap: {
    marginTop: 4,
    alignItems: 'center',
  },
  crownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownInnerRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,229,102,0.4)',
  },
  crownShadow: {
    position: 'absolute',
    bottom: -8,
    width: 70,
    height: 14,
    borderRadius: 35,
    backgroundColor: 'rgba(201,168,76,0.25)',
    alignSelf: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  title: {
    color: '#FFE566',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(201,168,76,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  titleUnderline: {
    height: 1.5,
    width: '70%',
    borderRadius: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 8,
  },
  rewardRow: {
    width: '100%',
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  rewardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  shardImage: {
    width: 60,
    height: 60,
  },
  rewardTextCol: {
    alignItems: 'flex-start',
  },
  rewardAmount: {
    color: '#FFE566',
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 42,
    textShadowColor: 'rgba(201,168,76,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  rewardLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 0,
  },
  divider: {
    height: 1,
    width: '85%',
    borderRadius: 1,
    marginVertical: 2,
  },
  btnWrap: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,76,0.5)',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnInner: {
    paddingVertical: 17,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  btnTopShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  btnText: {
    color: '#1A0F04',
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
