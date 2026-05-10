import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playShardsRewardModalSound } from '../app/achievement_modal_sound';
import { oskolokImageForPackShards } from '../app/oskolok';
import { bundleLang } from '../constants/i18n';
import { SHARD_MODAL_ACCENT_GLOW, SHARD_MODAL_FRAME_COLORS } from '../constants/shard_modal_chrome';
import {
  ruShardKnowledgeSubtitle,
  ukShardKnowledgeSubtitle,
} from '../constants/shard_plurals';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useModalBackdropFade } from '../hooks/useModalBackdropFade';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

export interface ShardReward {
  id: string;
  dataId: string;
  dataText: string;
  count: number;
  /** Текст модалки */
  reason?: 'bug_fixed' | 'suggestion_accepted' | 'admin_grant';
  rewardType?: string;
  label?: string;
}

interface Props {
  rewards: ShardReward[];
  visible: boolean;
  onClose: () => void;
}

const TEXTS = {
  ru: {
    kicker: 'НАГРАДА',
    title: 'Осколки у тебя',
    subtitle: (n: number) => ruShardKnowledgeSubtitle(n),
    body: 'Репорт проверили и починили баг. Заслуженная награда за настоящую сыскную работу.',
    bodySuggestion:
      'Идея принята в работу — спасибо, что помогаешь Phraseman становиться лучше. Ценим это.',
    bodyAdmin: 'Команда начислила тебе осколки. Это наш способ сказать спасибо за твою поддержку.',
    label: 'За исправление:',
    labelSuggestion: 'Твоя идея:',
    labelAdmin: 'От команды:',
    btn: 'Прекрасно',
    multiple: (n: number) => `${n} исправленных ошибок`,
    multipleSuggestion: (n: number) => `${n} принятых идей`,
    multipleAdmin: (n: number) => `${n} наград от команды`,
  },
  uk: {
    kicker: 'НАГОРОДА',
    title: 'Осколки вже твої',
    subtitle: (n: number) => ukShardKnowledgeSubtitle(n),
    body: 'Репорт перевірили і полагодили баг. Це справжня детективна робота — і вона має ціну.',
    bodySuggestion:
      'Ідея прийнята в роботу — дякуємо, що допомагаєш Phraseman ставати кращим. Це важливо для нас.',
    bodyAdmin: 'Команда нарахувала тобі осколки. Невеликий жест великої вдячності.',
    label: 'За виправлення:',
    labelSuggestion: 'Твоя ідея:',
    labelAdmin: 'Від команди:',
    btn: 'Чудово',
    multiple: (n: number) => `${n} виправлених помилок`,
    multipleSuggestion: (n: number) => `${n} прийнятих ідей`,
    multipleAdmin: (n: number) => `${n} нагород від команди`,
  },
  es: {
    kicker: 'RECOMPENSA',
    title: 'Tus fragmentos',
    subtitle: (n: number) => (n > 1 ? `+${n} fragmentos de conocimiento` : '+1 fragmento de conocimiento'),
    body:
      'Confirmaron tu informe y ya corrigieron el fallo. Mereces el botín del detective.',
    bodySuggestion:
      'Tu idea pasó a desarrollo. Gracias por empujar Phraseman hacia algo mejor.',
    bodyAdmin: 'El equipo te abonó fragmentos. Gracias por quedarte con nosotros.',
    label: 'Por el arreglo:',
    labelSuggestion: 'Tu idea:',
    labelAdmin: 'Del equipo:',
    btn: 'Entendido',
    multiple: (n: number) => `${n} errores corregidos`,
    multipleSuggestion: (n: number) => `${n} ideas aceptadas`,
    multipleAdmin: (n: number) => `${n} recompensas del equipo`,
  },
};

export default function ShardRewardModal({ rewards, visible, onClose }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const tx = TEXTS[bundleLang(lang)];
  const backdropOpacity = useModalBackdropFade(visible);
  const dimColor =
    themeMode === 'ocean' || themeMode === 'sakura' || themeMode === 'minimalLight'
      ? 'rgba(8,12,20,0.48)'
      : 'rgba(0,0,0,0.72)';

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const gemAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    hapticSuccess();
    void playShardsRewardModalSound();
    scaleAnim.setValue(0.88);
    opacityAnim.setValue(0);
    gemAnim.setValue(1);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 56 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gemAnim, { toValue: 1.12, duration: 640, useNativeDriver: true }),
          Animated.timing(gemAnim, { toValue: 1, duration: 640, useNativeDriver: true }),
        ]),
        { iterations: 3 },
      ).start();
    });
  }, [visible, scaleAnim, opacityAnim, gemAnim]);

  const totalShards = rewards.reduce((s, r) => s + r.count, 0);
  const firstDataText = rewards[0]?.dataText ?? '';
  const multipleReports = rewards.length > 1;
  const isSuggestion = rewards.some((r) => r.reason === 'suggestion_accepted');
  const isAdminGrant = !isSuggestion && rewards.every((r) => r.reason === 'admin_grant');
  const typedRewardLabels = rewards
    .filter((r) => r.label && r.rewardType && r.rewardType !== 'shards')
    .map((r) => r.label!) as string[];
  const hasTypedRewards = typedRewardLabels.length > 0;
  const showShardBadge = totalShards > 0;

  const ctaGold = [t.gold, '#E8C547', '#C9A227'] as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlayRoot}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: dimColor, opacity: backdropOpacity }]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
        <Animated.View
          style={[
            styles.sheetOuter,
            {
              paddingBottom: 26 + insets.bottom,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[...SHARD_MODAL_FRAME_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.sheetFrame}
          >
            <View style={[styles.sheetInner, { backgroundColor: t.bgCard }]}>
              <LinearGradient
                colors={[...SHARD_MODAL_ACCENT_GLOW]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
              />
              <View>
                <Text style={[styles.kicker, { color: t.gold }]}>{tx.kicker}</Text>

                <View style={styles.gemWrap}>
                  <Animated.View style={{ transform: [{ scale: gemAnim }] }}>
                    <View style={[styles.gemRing, { borderColor: t.gold + '66', backgroundColor: t.goldBg }]}>
                      <Image
                        source={oskolokImageForPackShards(Math.max(1, totalShards))}
                        style={styles.gemIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </Animated.View>
                  {showShardBadge && (
                    <LinearGradient
                      colors={['#16A34A', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.badge}
                    >
                      <Text style={styles.badgeText}>+{totalShards}</Text>
                    </LinearGradient>
                  )}
                </View>

                <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.round(f.h2 * 1.15) }]}>
                  {tx.title}
                </Text>
                {showShardBadge && (
                  <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.h3 }]}>
                    {tx.subtitle(totalShards)}
                  </Text>
                )}
                {hasTypedRewards && (
                  <View style={{ alignItems: 'center', marginTop: 6, gap: 4 }}>
                    {typedRewardLabels.map((lbl, i) => (
                      <Text
                        key={`tr-${i}`}
                        style={[styles.typedLbl, { color: t.gold, fontSize: f.bodyLg }]}
                      >
                        {lbl}
                      </Text>
                    ))}
                  </View>
                )}

                <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>
                  {isAdminGrant ? tx.bodyAdmin : isSuggestion ? tx.bodySuggestion : tx.body}
                </Text>

                {(isAdminGrant && !firstDataText) ? null : (
                  <View style={[styles.detailBox, { backgroundColor: t.bgSurface, borderColor: t.gold + '2A' }]}>
                    <Text style={[styles.detailLabel, { color: t.gold, fontSize: f.label }]}>
                      {multipleReports
                        ? (isAdminGrant ? tx.multipleAdmin(rewards.length) : isSuggestion ? tx.multipleSuggestion(rewards.length) : tx.multiple(rewards.length))
                        : (isAdminGrant ? tx.labelAdmin : isSuggestion ? tx.labelSuggestion : tx.label)}
                    </Text>
                    {!multipleReports && firstDataText && (
                      <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={4}>
                        {firstDataText}
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  onPress={onClose}
                  onPressIn={hapticTap}
                  activeOpacity={0.9}
                  style={styles.btnWrap}
                >
                  <LinearGradient
                    colors={[...ctaGold]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnGradient}
                  >
                    <Text style={[styles.btnText, { fontSize: f.bodyLg, color: t.textOnGold }]}>{tx.btn}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetOuter: {
    paddingHorizontal: 12,
  },
  sheetFrame: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 2.5,
    marginBottom: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 28,
  },
  sheetInner: {
    borderTopLeftRadius: 29.5,
    borderTopRightRadius: 29.5,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 10,
    gap: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  gemWrap: {
    width: 108,
    height: 108,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  gemRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemIcon: { width: 62, height: 62 },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  title: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { fontWeight: '700', textAlign: 'center', marginTop: -2 },
  typedLbl: { fontWeight: '800', textAlign: 'center' },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  detailBox: {
    alignSelf: 'stretch',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  detailLabel: { fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  detailText: { lineHeight: 22, fontWeight: '600' },
  btnWrap: {
    alignSelf: 'stretch',
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontWeight: '900', letterSpacing: 0.3 },
});
