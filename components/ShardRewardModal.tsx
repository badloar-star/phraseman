import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { bundleLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { oskolokImageForPackShards } from '../app/oskolok';
import { useModalBackdropFade } from '../hooks/useModalBackdropFade';

export interface ShardReward {
  id: string;
  dataId: string;
  dataText: string;
  count: number;
  /** Текст модалки */
  reason?: 'bug_fixed' | 'suggestion_accepted' | 'admin_grant';
  /**
   * Типизированная награда от adminGrantReward CF.
   * Если задан и !== 'shards' — count может быть 0, и модалка показывает label вместо «+N осколков».
   */
  rewardType?: string;
  /** Человекочитаемая подпись (например «🛡️ Щит стрика на 1 день»). */
  label?: string;
}

interface Props {
  rewards: ShardReward[];
  visible: boolean;
  onClose: () => void;
}

const TEXTS = {
  ru: {
    title: '💎 Награда получена',
    subtitle: (n: number) => (n > 1 ? `+${n} осколка знаний` : '+1 осколок знаний'),
    body: 'Твой репорт об ошибке подтвердили и исправили. Детектив не остался без награды 🕵️',
    bodySuggestion:
      'Твоя идея принята в работу — спасибо, что помогаешь сделать Phraseman лучше! Награда уже на счёте.',
    bodyAdmin: 'Команда Phraseman начислила тебе осколки. Спасибо, что ты с нами 💜',
    label: 'За исправленную ошибку:',
    labelSuggestion: 'Фрагмент идеи:',
    labelAdmin: 'Комментарий:',
    btn: 'Понятно',
    multiple: (n: number) => `Получено за ${n} исправленных ошибки`,
    multipleSuggestion: (n: number) => `Награды за ${n} принятых идей`,
    multipleAdmin: (n: number) => `Получено ${n} наград от команды`,
  },
  uk: {
    title: '💎 Нагороду отримано',
    subtitle: (n: number) => (n > 1 ? `+${n} осколки знань` : '+1 осколок знань'),
    body: 'Твій репорт про помилку підтвердили та виправили. Детектив не залишився без нагороди 🕵️',
    bodySuggestion:
      'Твою ідею прийнято в роботу — дякуємо, що допомагаєш зробити Phraseman кращим! Нагорода вже на рахунку.',
    bodyAdmin: 'Команда Phraseman нарахувала тобі осколки. Дякуємо, що ти з нами 💜',
    label: 'За виправлену помилку:',
    labelSuggestion: 'Фрагмент ідеї:',
    labelAdmin: 'Коментар:',
    btn: 'Зрозуміло',
    multiple: (n: number) => `Отримано за ${n} виправлених помилки`,
    multipleSuggestion: (n: number) => `Нагороди за ${n} прийнятих ідей`,
    multipleAdmin: (n: number) => `Отримано ${n} нагород від команди`,
  },
  es: {
    title: '💎 Recompensa recibida',
    subtitle: (n: number) => (n > 1 ? `+${n} fragmentos de conocimiento` : '+1 fragmento de conocimiento'),
    body:
      'Tu informe de error quedó confirmado y ya está corregido. El detective no se queda sin su recompensa 🕵️',
    bodySuggestion:
      'Tu idea pasó a desarrollo: gracias por ayudar a mejorar Phraseman. La recompensa ya está en tu cuenta.',
    bodyAdmin: 'El equipo de Phraseman te ha abonado fragmentos. Gracias por seguir con nosotros 💜',
    label: 'Por el error corregido:',
    labelSuggestion: 'Fragmento de la idea:',
    labelAdmin: 'Comentario:',
    btn: 'Entendido',
    multiple: (n: number) => `Por ${n} errores corregidos`,
    multipleSuggestion: (n: number) => `Recompensas por ${n} ideas aceptadas`,
    multipleAdmin: (n: number) => `Has recibido ${n} recompensas del equipo`,
  },
};

export default function ShardRewardModal({ rewards, visible, onClose }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const tx = TEXTS[bundleLang(lang)];
  const backdropOpacity = useModalBackdropFade(visible);
  const dimColor = themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.65)';

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const gemAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    hapticSuccess();
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    gemAnim.setValue(1);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 50 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      // пульс на иконке
      Animated.loop(
        Animated.sequence([
          Animated.timing(gemAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(gemAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start();
    });
  }, [visible, scaleAnim, opacityAnim, gemAnim]);

  const totalShards = rewards.reduce((s, r) => s + r.count, 0);
  const firstDataText = rewards[0]?.dataText ?? '';
  const multipleReports = rewards.length > 1;
  const isSuggestion = rewards.some((r) => r.reason === 'suggestion_accepted');
  const isAdminGrant = !isSuggestion && rewards.every((r) => r.reason === 'admin_grant');
  // Типизированные награды (xp_boost / chain_shield / arena_extra) приходят с count=0 + label.
  const typedRewardLabels = rewards
    .filter((r) => r.label && r.rewardType && r.rewardType !== 'shards')
    .map((r) => r.label!) as string[];
  const hasTypedRewards = typedRewardLabels.length > 0;
  const showShardBadge = totalShards > 0;

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
            styles.sheet,
            {
              backgroundColor: t.bgCard,
              borderColor: t.correct,
              paddingBottom: 28 + insets.bottom,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            {/* Shard icon */}
            <View style={styles.gemWrap}>
              <Animated.View style={{ transform: [{ scale: gemAnim }] }}>
                <Image
                  source={oskolokImageForPackShards(Math.max(1, totalShards))}
                  style={styles.gemIcon}
                  resizeMode="contain"
                />
              </Animated.View>
              {showShardBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>+{totalShards}</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: t.correct, fontSize: f.h2 }]}>
              {tx.title}
            </Text>
            {showShardBadge && (
              <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.h3 }]}>
                {tx.subtitle(totalShards)}
              </Text>
            )}
            {hasTypedRewards && (
              <View style={{ alignItems: 'center', marginTop: 4 }}>
                {typedRewardLabels.map((lbl, i) => (
                  <Text
                    key={`tr-${i}`}
                    style={[styles.subtitle, { color: t.correct, fontSize: f.h3, marginTop: 2 }]}
                  >
                    {lbl}
                  </Text>
                ))}
              </View>
            )}

            {/* Body */}
            <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>
              {isAdminGrant ? tx.bodyAdmin : isSuggestion ? tx.bodySuggestion : tx.body}
            </Text>

            {/* Report detail */}
            {(isAdminGrant && !firstDataText) ? null : (
              <View style={[styles.detailBox, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                <Text style={[styles.detailLabel, { color: t.textSecond, fontSize: f.sub }]}>
                  {multipleReports
                    ? (isAdminGrant ? tx.multipleAdmin(rewards.length) : isSuggestion ? tx.multipleSuggestion(rewards.length) : tx.multiple(rewards.length))
                    : (isAdminGrant ? tx.labelAdmin : isSuggestion ? tx.labelSuggestion : tx.label)}
                </Text>
                {!multipleReports && firstDataText && (
                  <Text style={[styles.detailText, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={3}>
                    {firstDataText}
                  </Text>
                )}
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              onPress={onClose}
              onPressIn={hapticTap}
              style={[styles.btn, { backgroundColor: t.correct }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnText, { fontSize: f.body, color: t.correctText }]}>{tx.btn}</Text>
            </TouchableOpacity>
          </Pressable>
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
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 28,
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  gemWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  gemIcon: { width: 56, height: 56 },
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { fontWeight: '600', textAlign: 'center', marginTop: -4 },
  body: { textAlign: 'center', lineHeight: 20 },
  detailBox: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  detailLabel: { fontWeight: '600' },
  detailText: { lineHeight: 20 },
  btn: {
    alignSelf: 'stretch',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { fontWeight: '800' },
});
