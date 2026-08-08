import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';

import { getLevelGiftRewardIcon } from '../constants/levelGiftRewardIcons';
import { triLang, type Lang } from '../constants/i18n';
import { soundDirector } from '../modules/audio/sound_director';
import {
  giftDisplayDescForLang,
  giftDisplayTitleForLang,
  giftRarityUiLabel,
  type GiftDef,
} from '../app/level_gift_system';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { RewardModalBackdrop } from './RewardModalBackdrop';
import { useTheme } from './ThemeContext';

type Props = {
  visible: boolean;
  gift: GiftDef | null;
  giftId: string | null;
  lang: Lang;
  isPremium?: boolean;
  requestId: string | null;
  onClaim: () => void;
  onClose: () => void;
};

/** The immediate, animated winner surface shown after the reel has physically settled. */
export default function LevelSpinRewardModal({
  visible,
  gift,
  giftId,
  lang,
  isPremium = false,
  requestId,
  onClaim,
  onClose,
}: Props) {
  const { theme: t, themeMode } = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const icon = useRef(new Animated.Value(0)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible || !requestId) return;
    entrance.setValue(0);
    glow.setValue(0);
    icon.setValue(0);
    const rewardEvent = isPremium
      ? 'pm.spin.reward_premium'
      : gift?.rarity === 'rare' || gift?.rarity === 'epic'
        ? 'pm.spin.reward_rare'
        : 'pm.spin.reward_win';
    soundDirector.request(rewardEvent, {
      scope: 'level-spin-reward-modal',
      dedupeKey: `level-spin-reward-modal:${requestId}`,
      rateLimit: { maxStarts: 6, windowMs: 4_000 },
    });
    void hapticSuccess();
    Animated.parallel([
      Animated.spring(entrance, { toValue: 1, tension: 118, friction: 12, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(icon, { toValue: 1, tension: 170, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
    glowLoopRef.current?.stop();
    glowLoopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1_250, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1_250, useNativeDriver: true }),
    ]));
    glowLoopRef.current.start();
    return () => { glowLoopRef.current?.stop(); };
  }, [entrance, gift, glow, icon, isPremium, requestId, visible]);

  if (!visible) return null;

  const effectiveGiftId = gift?.id ?? giftId ?? 'choice_3_level';
  const title = gift
    ? giftDisplayTitleForLang(gift, lang)
    : triLang(lang, { ru: 'ПОДАРОК ПОЛУЧЕН', uk: 'ПОДАРУНОК ОТРИМАНО', es: 'REGALO RECIBIDO', 'pt-BR': 'PRESENTE RECEBIDO', vi: 'ĐÃ NHẬN QUÀ', id: 'HADIAH DITERIMA', tr: 'HEDİYE ALINDI', pl: 'PREZENT ODEBRANY' });
  const description = gift
    ? giftDisplayDescForLang(gift, lang)
    : triLang(lang, { ru: 'Награда сохранена в подарках', uk: 'Нагороду збережено в подарунках', es: 'La recompensa está guardada en regalos', 'pt-BR': 'A recompensa foi salva nos presentes', vi: 'Phần thưởng đã được lưu trong quà tặng', id: 'Hadiah disimpan di hadiah', tr: 'Ödül hediyelerde saklandı', pl: 'Nagroda jest zapisana w prezentach' });
  const rarity = gift ? giftRarityUiLabel(gift.rarity, lang) : triLang(lang, { ru: 'НАГРАДА', uk: 'НАГОРОДА', es: 'RECOMPENSA', 'pt-BR': 'RECOMPENSA', vi: 'PHẦN THƯỞNG', id: 'HADIAH', tr: 'ÖDÜL', pl: 'NAGRODA' });

  const panelScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const panelY = entrance.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const panelOpacity = entrance;
  const iconScale = icon.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.35, 1.12, 1] });
  const iconY = icon.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.26, 0.72] });

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View testID="level-spin-reward-modal" style={styles.root}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <Animated.View style={[styles.panel, { backgroundColor: t.bgCard, opacity: panelOpacity, transform: [{ translateY: panelY }, { scale: panelScale }] }]}>
          <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity }]} />
          <View style={styles.topLine} />
          <Text style={[styles.kicker, { color: t.gold }]}>
            {triLang(lang, { ru: 'ТВОЙ ПОДАРОК', uk: 'ТВІЙ ПОДАРУНОК', es: 'TU REGALO', 'pt-BR': 'SEU PRESENTE', vi: 'PHẦN THƯỞNG CỦA BẠN', id: 'HADIAHMU', tr: 'HEDİYEN', pl: 'TWÓJ PREZENT' })}
          </Text>
          <Animated.View style={[styles.iconStage, { transform: [{ translateY: iconY }, { scale: iconScale }] }]}>
            <View style={[styles.iconHalo, { borderColor: `${t.gold}88` }]} />
            <Image source={getLevelGiftRewardIcon(effectiveGiftId, themeMode)} style={styles.icon} contentFit="contain" />
          </Animated.View>
          <Text style={[styles.rarity, { color: t.gold }]}>{rarity}</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
          <Text style={[styles.description, { color: t.textSecond }]}>{description}</Text>
          {isPremium ? <Text style={styles.plus}>PLUS</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Получить подарок', uk: 'Отримати подарунок', es: 'Recibir regalo', 'pt-BR': 'Receber presente', vi: 'Nhận phần thưởng', id: 'Ambil hadiah', tr: 'Hediyeyi al', pl: 'Odbierz prezent' })}
            onPress={() => {
              void hapticTap();
              soundDirector.request('pm.spin.reward_lock', {
                scope: 'level-spin-reward-modal',
                dedupeKey: `level-spin-reward-lock:${requestId ?? 'unknown'}`,
                rateLimit: { maxStarts: 6, windowMs: 4_000 },
              });
              onClaim();
            }}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>{triLang(lang, { ru: 'ГОТОВО', uk: 'ГОТОВО', es: 'LISTO', 'pt-BR': 'PRONTO', vi: 'XONG', id: 'SELESAI', tr: 'TAMAM', pl: 'GOTOWE' })}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  panel: { width: '100%', maxWidth: 430, minHeight: 510, borderRadius: 30, borderWidth: 1.5, borderColor: '#F3C85CAA', alignItems: 'center', paddingHorizontal: 26, paddingTop: 30, paddingBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 28, elevation: 24 },
  glow: { position: 'absolute', top: 84, width: 260, height: 260, borderRadius: 130, backgroundColor: '#F3C85C2B', shadowColor: '#F3C85C', shadowOpacity: 0.8, shadowRadius: 46, elevation: 4 },
  topLine: { width: 62, height: 4, borderRadius: 3, backgroundColor: '#F3C85C', marginBottom: 22 },
  kicker: { fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 2.2 },
  iconStage: { width: 164, height: 164, marginTop: 26, marginBottom: 18, alignItems: 'center', justifyContent: 'center' },
  iconHalo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, backgroundColor: '#F3C85C12' },
  icon: { width: 126, height: 126 },
  rarity: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { marginTop: 10, fontSize: 27, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  description: { marginTop: 10, maxWidth: 310, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  plus: { marginTop: 15, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', color: '#2A164A', backgroundColor: '#E8D7FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  cta: { width: '100%', minHeight: 58, marginTop: 'auto', borderRadius: 18, backgroundColor: '#F3C85C', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: '#B67A0D' },
  ctaPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 1 },
  ctaText: { color: '#211500', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
