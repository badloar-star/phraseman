import { LinearGradient } from './SafeLinearGradient';
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  RewardModalBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

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
    body: 'Твой репорт проверили и баг починили. Это настоящая работа — осколки заслужены.',
    bodySuggestion:
      'Команда начислила тебе осколки. Твоя помощь делает Phraseman лучше — спасибо.',
    bodyAdmin: 'Команда начислила тебе осколки — это наш способ сказать спасибо.',
    label: 'За исправление:',
    labelSuggestion: 'От команды:',
    labelAdmin: 'От команды:',
    btn: 'Отлично',
    multiple: (n: number) => `${n} исправленных ошибок`,
    multipleSuggestion: (n: number) => `${n} наград от команды`,
    multipleAdmin: (n: number) => `${n} наград от команды`,
  },
  uk: {
    kicker: 'НАГОРОДА',
    title: 'Осколки вже твої',
    subtitle: (n: number) => ukShardKnowledgeSubtitle(n),
    body: 'Репорт перевірили і полагодили баг. Це справжня детективна робота — і вона має ціну.',
    bodySuggestion:
      'Команда нарахувала тобі осколки. Дякуємо, що допомагаєш Phraseman ставати кращим.',
    bodyAdmin: 'Команда нарахувала тобі осколки. Невеликий жест великої вдячності.',
    label: 'За виправлення:',
    labelSuggestion: 'Від команди:',
    labelAdmin: 'Від команди:',
    btn: 'Чудово',
    multiple: (n: number) => `${n} виправлених помилок`,
    multipleSuggestion: (n: number) => `${n} нагород від команди`,
    multipleAdmin: (n: number) => `${n} нагород від команди`,
  },
  es: {
    kicker: 'RECOMPENSA',
    title: 'Tus fragmentos',
    subtitle: (n: number) => (n > 1 ? `+${n} fragmentos de conocimiento` : '+1 fragmento de conocimiento'),
    body:
      'Confirmaron tu informe y ya corrigieron el fallo. Mereces el botín del detective.',
    bodySuggestion:
      'El equipo te abonó fragmentos. Gracias por ayudar a mejorar Phraseman.',
    bodyAdmin: 'El equipo te abonó fragmentos. Gracias por quedarte con nosotros.',
    label: 'Por el arreglo:',
    labelSuggestion: 'Del equipo:',
    labelAdmin: 'Del equipo:',
    btn: 'Entendido',
    multiple: (n: number) => `${n} errores corregidos`,
    multipleSuggestion: (n: number) => `${n} recompensas del equipo`,
    multipleAdmin: (n: number) => `${n} recompensas del equipo`,
  },
  'pt-BR': {
    kicker: 'RECOMPENSA',
    title: 'Fragmentos recebidos',
    subtitle: (n: number) => (n > 1 ? `+${n} fragmentos de conhecimento` : '+1 fragmento de conhecimento'),
    body: 'Seu relatório foi verificado e o bug foi corrigido. Recompensa merecida por uma investigação de verdade.',
    bodySuggestion: 'A equipe creditou fragmentos para você. Obrigado por ajudar o Phraseman a melhorar.',
    bodyAdmin: 'A equipe creditou fragmentos para você. É nosso jeito de agradecer pelo seu apoio.',
    label: 'Pela correção:',
    labelSuggestion: 'Da equipe:',
    labelAdmin: 'Da equipe:',
    btn: 'Perfeito',
    multiple: (n: number) => `${n} erros corrigidos`,
    multipleSuggestion: (n: number) => `${n} recompensas da equipe`,
    multipleAdmin: (n: number) => `${n} recompensas da equipe`,
  },
  vi: {
    kicker: 'PHẦN THƯỞNG',
    title: 'Bạn đã nhận mảnh',
    subtitle: (n: number) => `+${n} mảnh kiến thức`,
    body: 'Báo cáo đã được kiểm tra và lỗi đã được sửa. Đây là phần thưởng xứng đáng cho công việc điều tra thật sự.',
    bodySuggestion: 'Đội ngũ đã cộng mảnh cho bạn. Cảm ơn bạn đã giúp Phraseman tốt hơn.',
    bodyAdmin: 'Đội ngũ đã cộng mảnh cho bạn. Đây là cách chúng tôi cảm ơn sự ủng hộ của bạn.',
    label: 'Cho bản sửa:',
    labelSuggestion: 'Từ đội ngũ:',
    labelAdmin: 'Từ đội ngũ:',
    btn: 'Tuyệt',
    multiple: (n: number) => `${n} lỗi đã sửa`,
    multipleSuggestion: (n: number) => `${n} phần thưởng từ đội ngũ`,
    multipleAdmin: (n: number) => `${n} phần thưởng từ đội ngũ`,
  },
  'id': {
    kicker: 'HADIAH',
    title: 'Shard sudah masuk',
    subtitle: (n: number) => `+${n} shard pengetahuan`,
    body: 'Laporanmu sudah diperiksa dan bug-nya diperbaiki. Hadiah yang pantas untuk kerja investigasi sungguhan.',
    bodySuggestion: 'Tim menambahkan shard untukmu. Terima kasih sudah membantu Phraseman menjadi lebih baik.',
    bodyAdmin: 'Tim menambahkan shard untukmu. Ini cara kami berterima kasih atas dukunganmu.',
    label: 'Untuk perbaikan:',
    labelSuggestion: 'Dari tim:',
    labelAdmin: 'Dari tim:',
    btn: 'Mantap',
    multiple: (n: number) => `${n} bug diperbaiki`,
    multipleSuggestion: (n: number) => `${n} hadiah dari tim`,
    multipleAdmin: (n: number) => `${n} hadiah dari tim`,
  },
  tr: {
    kicker: 'ÖDÜL',
    title: 'Parçalar sende',
    subtitle: (n: number) => `+${n} bilgi parçası`,
    body: 'Raporun incelendi ve hata düzeltildi. Gerçek araştırma çalışması için hak edilmiş bir ödül.',
    bodySuggestion: 'Ekip hesabına parçalar ekledi. Phraseman’i daha iyi yapmaya yardım ettiğin için teşekkürler.',
    bodyAdmin: 'Ekip hesabına parçalar ekledi. Desteğin için teşekkür etme biçimimiz bu.',
    label: 'Düzeltme için:',
    labelSuggestion: 'Ekipten:',
    labelAdmin: 'Ekipten:',
    btn: 'Harika',
    multiple: (n: number) => `${n} düzeltilmiş hata`,
    multipleSuggestion: (n: number) => `${n} ekip ödülü`,
    multipleAdmin: (n: number) => `${n} ekip ödülü`,
  },
  pl: {
    kicker: 'NAGRODA',
    title: 'Odłamki są twoje',
    subtitle: (n: number) => `+${n} odłamków wiedzy`,
    body: 'Zgłoszenie zostało sprawdzone, a błąd naprawiony. Zasłużona nagroda za prawdziwą pracę dochodzeniową.',
    bodySuggestion: 'Zespół przyznał ci odłamki. Dziękujemy, że pomagasz ulepszać Phraseman.',
    bodyAdmin: 'Zespół przyznał ci odłamki. Tak dziękujemy za twoje wsparcie.',
    label: 'Za poprawkę:',
    labelSuggestion: 'Od zespołu:',
    labelAdmin: 'Od zespołu:',
    btn: 'Świetnie',
    multiple: (n: number) => `${n} naprawionych błędów`,
    multipleSuggestion: (n: number) => `${n} nagród od zespołu`,
    multipleAdmin: (n: number) => `${n} nagród od zespołu`,
  },
};

const USE_ELITE_SHARD_REWARD_MODAL = true;

function ShardRewardModal({ rewards, visible, onClose }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const tx = TEXTS[bundleLang(lang)];
  const backdropOpacity = useModalBackdropFade(visible);
  const dimColor = false
    ? (USE_ELITE_SHARD_REWARD_MODAL ? 'rgba(8,12,20,0.64)' : 'rgba(8,12,20,0.48)')
    : (USE_ELITE_SHARD_REWARD_MODAL ? 'rgba(3,5,10,0.82)' : 'rgba(0,0,0,0.72)');

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const gemAnim = useRef(new Animated.Value(1)).current;
  const sheetY = useRef(new Animated.Value(16)).current;
  const topLineGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    hapticSuccess();
    scaleAnim.setValue(0.88);
    opacityAnim.setValue(0);
    gemAnim.setValue(1);
    sheetY.setValue(16);
    topLineGlow.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: USE_ELITE_SHARD_REWARD_MODAL ? 10 : 8, tension: USE_ELITE_SHARD_REWARD_MODAL ? 52 : 56 }),
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, friction: 10, tension: 52 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(topLineGlow, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gemAnim, { toValue: 1.12, duration: 640, useNativeDriver: true }),
          Animated.timing(gemAnim, { toValue: 1, duration: 640, useNativeDriver: true }),
        ]),
        { iterations: 3 },
      ).start();
    });
  }, [visible, scaleAnim, opacityAnim, gemAnim, sheetY, topLineGlow]);

  const totalShards = rewards.reduce((s, r) => s + r.count, 0);
  const firstDataText = rewards[0]?.dataText ?? '';
  const multipleReports = rewards.length > 1;
  const isSuggestion = false;
  const isAdminGrant = rewards.every((r) => r.reason === 'admin_grant' || r.reason === 'suggestion_accepted');
  const typedRewardLabels = rewards
    .filter((r) => r.label && r.rewardType && r.rewardType !== 'shards')
    .map((r) => r.label!) as string[];
  const hasTypedRewards = typedRewardLabels.length > 0;
  const showShardBadge = totalShards > 0;

  const modalAccent = rewardModalAccentColor(themeMode, t);
  const ctaGold = rewardModalPrimaryButtonColors(themeMode);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlayRoot}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
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
              transform: [{ scale: scaleAnim }, { translateY: USE_ELITE_SHARD_REWARD_MODAL ? sheetY : 0 }],
            },
          ]}
        >
          <LinearGradient
            colors={USE_ELITE_SHARD_REWARD_MODAL ? ['rgba(255,255,255,0.10)', modalAccent, 'rgba(255,255,255,0.08)'] : [...SHARD_MODAL_FRAME_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.sheetFrame, USE_ELITE_SHARD_REWARD_MODAL && styles.eliteSheetFrame]}
          >
            <View style={[styles.sheetInner, USE_ELITE_SHARD_REWARD_MODAL && styles.eliteSheetInner, { backgroundColor: rewardModalPanelColors(themeMode, t)[1] }]}>
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
                style={[StyleSheet.absoluteFill, { opacity: USE_ELITE_SHARD_REWARD_MODAL ? 0.48 : 0.55 }]}
              />
              {USE_ELITE_SHARD_REWARD_MODAL && (
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
              <View>
                <Text style={[styles.kicker, { color: modalAccent }]}>{tx.kicker}</Text>

                <View style={styles.gemWrap}>
                  <Animated.View style={{ transform: [{ scale: gemAnim }] }}>
                    <View style={[styles.gemRing, USE_ELITE_SHARD_REWARD_MODAL && styles.eliteGemRing, { borderColor: modalAccent + (USE_ELITE_SHARD_REWARD_MODAL ? '44' : '66'), backgroundColor: rewardModalSoftSurface(themeMode, t) }]}>
                      <Image
                        source={oskolokImageForPackShards(Math.max(1, totalShards))}
                        style={styles.gemIcon}
                        contentFit="contain"
                      />
                    </View>
                  </Animated.View>
                  {showShardBadge && (
                    <LinearGradient
                      colors={USE_ELITE_SHARD_REWARD_MODAL ? ctaGold : ['#16A34A', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.badge}
                    >
                      <Text style={[styles.badgeText, USE_ELITE_SHARD_REWARD_MODAL && { color: rewardModalPrimaryButtonText(themeMode) }]}>+{totalShards}</Text>
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
                        style={[styles.typedLbl, { color: modalAccent, fontSize: f.bodyLg }]}
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
                  <View style={[styles.detailBox, USE_ELITE_SHARD_REWARD_MODAL && styles.eliteDetailBox, { backgroundColor: rewardModalSoftSurface(themeMode, t), borderColor: rewardModalPanelBorder(themeMode, t) }]}>
                    <Text style={[styles.detailLabel, { color: modalAccent, fontSize: f.label }]}>
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
                    <Text style={[styles.btnText, { fontSize: f.bodyLg, color: rewardModalPrimaryButtonText(themeMode) }]}>{tx.btn}</Text>
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

export default memo(ShardRewardModal);

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
  eliteSheetFrame: {
    padding: 1,
    shadowColor: '#D6B85C',
    shadowOpacity: 0.22,
    shadowRadius: 32,
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
  eliteSheetInner: {
    paddingTop: 30,
    paddingBottom: 14,
  },
  eliteTopLine: {
    position: 'absolute',
    top: 0,
    left: 34,
    right: 34,
    height: 1,
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
  eliteGemRing: {
    borderWidth: 1,
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
  eliteDetailBox: {
    borderRadius: 18,
    paddingVertical: 15,
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
