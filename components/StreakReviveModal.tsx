import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { PAYWALL_MODAL } from './paywallModalPalette';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import {
  reviveStreak,
  dismissReviveOffer,
  type StreakReviveOffer,
} from '../app/streak_revive';
import { getShardsBalance } from '../app/shards_system';
import { oskolokImageForPackShards } from '../app/oskolok';
import { emitAppEvent } from '../app/events';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import { triLang, type Lang } from '../constants/i18n';
import {
  RewardModalBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

interface StreakReviveModalProps {
  visible: boolean;
  offer: StreakReviveOffer | null;
  onClose: () => void;
  onRevived?: (restoredStreak: number) => void;
  shopReturnTo?: 'home' | 'streak_stats';
}

function formatStreakDays(count: number, lang: Lang): string {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  const ruWord = safeCount === 1 ? 'дня' : 'дней';
  const ukWord = safeCount === 1 ? 'дня' : 'днів';

  return triLang(lang, {
    ru: `${safeCount} ${ruWord}`,
    uk: `${safeCount} ${ukWord}`,
    es: `${safeCount} día${safeCount === 1 ? '' : 's'}`,
    'pt-BR': `${safeCount} dia${safeCount === 1 ? '' : 's'}`,
    vi: `${safeCount} ngày`,
    id: `${safeCount} hari`,
    tr: `${safeCount} gün`,
    pl: `${safeCount} ${safeCount === 1 ? 'dzień' : 'dni'}`,
  });
}

export default function StreakReviveModal({ visible, offer, onClose, onRevived, shopReturnTo = 'home' }: StreakReviveModalProps) {
  const router = useRouter();
  const { lang } = useLang();
  const { f, theme: t, themeMode } = useTheme();
  const [busy, setBusy] = useState(false);

  const flameAnim = useRef(new Animated.Value(0)).current;
  const haloPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) {
      flameAnim.setValue(0);
      haloPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(flameAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => {
      loop.stop();
      pulse.stop();
    };
  }, [visible, flameAnim, haloPulse]);

  // Сбрасываем busy при закрытии/открытии
  useEffect(() => {
    if (!visible) setBusy(false);
  }, [visible]);

  const flameStyle = {
    transform: [{ scale: flameAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }],
  };

  const cost = offer?.costShards ?? 0;
  const lostStreak = offer?.lostStreak ?? 0;
  const lostStreakText = formatStreakDays(lostStreak, lang);

  // ── Копирайт: пользовательское слово «цепочка» ─────────────────────────
  const title = triLang(lang, {
    ru: 'Цепочка прервалась',
    uk: 'Ланцюжок перервався',
    es: 'La racha se interrumpió',
    'pt-BR': 'A sequência foi interrompida',
    vi: 'Chuỗi của bạn đã bị gián đoạn',
    id: 'Rangkaian terputus',
    tr: 'Serin kesildi',
    pl: 'Seria została przerwana',
  });

  const subtitle = triLang(lang, {
    ru: `Вы потеряли серию из ${lostStreakText}. Хотите восстановить свой рекорд или начать новую цепочку?`,
    uk: `Ви втратили серію з ${lostStreakText}. Хочете відновити свій рекорд чи почати новий ланцюжок?`,
    es: `Perdiste una racha de ${lostStreakText}. ¿Quieres recuperar tu récord o empezar una nueva racha?`,
    'pt-BR': `Você perdeu uma sequência de ${lostStreakText}. Quer restaurar seu recorde ou começar uma nova sequência?`,
    vi: `Bạn đã mất chuỗi ${lostStreakText}. Bạn muốn khôi phục kỷ lục hay bắt đầu chuỗi mới?`,
    id: `Kamu kehilangan rangkaian ${lostStreakText}. Mau memulihkan rekor atau mulai rangkaian baru?`,
    tr: `${lostStreakText} serini kaybettin. Rekorunu yenilemek mi, yoksa yeni bir seri başlatmak mı istersin?`,
    pl: `Utraciłeś serię ${lostStreakText}. Chcesz odnowić swój rekord czy zacząć nową serię?`,
  });

  const streakUnit = triLang(lang, {
    ru: `${lostStreak === 1 ? 'день' : 'дней'} подряд`,
    uk: `${lostStreak === 1 ? 'день' : 'днів'} поспіль`,
    es: 'días seguidos',
    'pt-BR': 'dias seguidos',
    vi: 'ngày liên tiếp',
    id: 'hari berturut-turut',
    tr: 'gün üst üste',
    pl: 'dni z rzędu',
  });

  const priceAccessibilityLabel = triLang(lang, {
    ru: `Цена восстановления: ${cost}`,
    uk: `Ціна відновлення: ${cost}`,
    es: `Precio de recuperación: ${cost}`,
    'pt-BR': `Preço da restauração: ${cost}`,
    vi: `Giá khôi phục: ${cost}`,
    id: `Harga pemulihan: ${cost}`,
    tr: `Yenileme ücreti: ${cost}`,
    pl: `Cena odnowienia: ${cost}`,
  });

  const ctaLabel = triLang(lang, {
    ru: 'Восстановить рекорд',
    uk: 'Відновити рекорд',
    es: 'Recuperar récord',
    'pt-BR': 'Restaurar recorde',
    vi: 'Khôi phục kỷ lục',
    id: 'Pulihkan rekor',
    tr: 'Rekoru yenile',
    pl: 'Odnów rekord',
  });
  const dismissLabel = triLang(lang, {
    ru: 'Начать новую цепочку',
    uk: 'Почати новий ланцюжок',
    es: 'Empezar una nueva racha',
    'pt-BR': 'Começar uma nova sequência',
    vi: 'Bắt đầu chuỗi mới',
    id: 'Mulai rangkaian baru',
    tr: 'Yeni seri başlat',
    pl: 'Zacznij nową serię',
  });

  const onConfirm = useCallback(async () => {
    if (busy || !offer) return;
    setBusy(true);
    try {
      const balance = await getShardsBalance();
      if (balance < cost) {
        const need = Math.max(0, cost - balance);
        navigateAfterModalClose(onClose, () => {
          router.push({
            pathname: '/shards_shop',
            params: { need: String(need), source: 'streak_revive', returnTo: shopReturnTo },
          } as any);
        });
        return;
      }
      const r = await reviveStreak();
      if (r.ok) {
        hapticSuccess();
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: `🔥 Цепочка восстановлена: ${r.restoredStreak} дн.`,
          messageUk: `🔥 Ланцюжок відновлено: ${r.restoredStreak} дн.`,
          messageEs: `🔥 Racha recuperada: ${r.restoredStreak} días`,
          messagePtBr: `🔥 Sequência restaurada: ${r.restoredStreak} dias`,
          messageVi: `🔥 Đã khôi phục chuỗi: ${r.restoredStreak} ngày`,
          messageId: `🔥 Streak dipulihkan: ${r.restoredStreak} hari`,
          messageTr: `🔥 Seri yenilendi: ${r.restoredStreak} gün`,
          messagePl: `🔥 Seria odnowiona: ${r.restoredStreak} dni`,
        });
        onRevived?.(r.restoredStreak);
        onClose();
        return;
      }
      if (r.reason === 'insufficient_shards') {
        const balance2 = await getShardsBalance();
        const need = Math.max(0, cost - balance2);
        navigateAfterModalClose(onClose, () => {
          router.push({
            pathname: '/shards_shop',
            params: { need: String(need), source: 'streak_revive', returnTo: shopReturnTo },
          } as any);
        });
        return;
      }
      if (r.reason === 'no_offer' || r.reason === 'expired') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Время восстановления уже истекло.',
          messageUk: 'Час відновлення вже минув.',
          messageEs: 'El tiempo de recuperación ya expiró.',
          messagePtBr: 'O tempo para restaurar já acabou.',
          messageVi: 'Thời gian khôi phục đã hết.',
          messageId: 'Waktu pemulihan sudah habis.',
          messageTr: 'Yenileme süresi doldu.',
          messagePl: 'Czas na odnowienie już minął.',
        });
        onClose();
        return;
      }
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось восстановить цепочку. Попробуй ещё раз.',
        messageUk: 'Не вдалося відновити ланцюжок. Спробуй ще раз.',
        messageEs: 'No se pudo recuperar la racha. Inténtalo de nuevo.',
        messagePtBr: 'Não foi possível restaurar a sequência. Tente novamente.',
        messageVi: 'Không thể khôi phục chuỗi. Hãy thử lại.',
        messageId: 'Tidak dapat memulihkan streak. Coba lagi.',
        messageTr: 'Seri yenilenemedi. Tekrar dene.',
        messagePl: 'Nie udało się odnowić serii. Spróbuj ponownie.',
      });
    } finally {
      setBusy(false);
    }
  }, [busy, offer, cost, onClose, router, onRevived]);

  const onDismiss = useCallback(() => {
    if (busy) return;
    hapticTap();
    void dismissReviveOffer();
    onClose();
  }, [busy, onClose]);

  const isLight = false;
  const modalAccent = rewardModalAccentColor(themeMode, t);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      {/*
        Подложка не должна быть сиблингом Pressable на весь экран — на Android до кнопок
        может «не докасаться» несколько первых тачей. Закрытие по серому — один родитель
        TouchableWithoutFeedback + кнопки внутрь (внутренний Touchable перехватит первый тап).
      */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View
          style={[
            styles.overlayRoot,
            { backgroundColor: isLight ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.74)' },
          ]}
        >
          <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={[`${modalAccent}14`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.55 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={styles.cardWrap} pointerEvents="box-none">
            <View
              collapsable={Platform.OS === 'android' ? false : undefined}
              style={[
                styles.card,
                {
                  backgroundColor: rewardModalPanelColors(themeMode, t)[1],
                  borderColor: rewardModalPanelBorder(themeMode, t),
                  borderWidth: 1,
                  shadowColor: modalAccent,
                  shadowOpacity: isLight ? PAYWALL_MODAL.shadowOpacityLight : PAYWALL_MODAL.shadowOpacityDark,
                },
              ]}
            >
            <LinearGradient
              colors={rewardModalPanelColors(themeMode, t)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={[`${modalAccent}18`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.cardGlow}
              pointerEvents="none"
            />

            <View style={styles.heroWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.heroHalo,
                  {
                    backgroundColor: modalAccent,
                    opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }),
                    transform: [{ scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }],
                  },
                ]}
              />
              <Animated.View style={[styles.iconShell, flameStyle]}>
                <Ionicons name="flame" size={30} color={modalAccent} />
              </Animated.View>
            </View>

            <Text style={[styles.title, { color: PAYWALL_MODAL.title, fontSize: f.h2 }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: PAYWALL_MODAL.subtitle, fontSize: f.body }]}>{subtitle}</Text>

            <View
              style={[
                styles.streakPill,
                {
                  backgroundColor: rewardModalSoftSurface(themeMode, t),
                  borderColor: rewardModalPanelBorder(themeMode, t),
                },
              ]}
            >
              <Text style={[styles.streakNum, { color: PAYWALL_MODAL.title }]}>{lostStreak}</Text>
              <Text style={[styles.streakUnit, { color: PAYWALL_MODAL.subtitle }]}>{streakUnit}</Text>
            </View>

            <View
              style={[
                styles.pricePill,
                {
                  backgroundColor: rewardModalSoftSurface(themeMode, t),
                  borderColor: rewardModalPanelBorder(themeMode, t),
                },
              ]}
              accessible
              accessibilityLabel={priceAccessibilityLabel}
            >
              <Image
                source={oskolokImageForPackShards(cost)}
                style={styles.priceIcon}
                resizeMode="contain"
              />
              <View style={styles.priceTextWrap}>
                <Text style={[styles.priceValue, { color: modalAccent }]}>{cost}</Text>
              </View>
            </View>

            {/* Трата осколков — стиль как «Восстановить энергию» в NoEnergyModal */}
            <TouchableOpacity
              onPress={() => { hapticTap(); void onConfirm(); }}
              activeOpacity={0.88}
              disabled={busy}
              style={[styles.shardBtn, { opacity: busy ? 0.65 : 1, marginTop: 10 }]}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.shardBtnInner,
                  { borderColor: rewardModalPanelBorder(themeMode, t), backgroundColor: rewardModalSoftSurface(themeMode, t) },
                ]}
              >
                {false && busy ? (
                  <View />
                ) : (
                  <>
                    <View style={styles.shardBtnIconSlot} pointerEvents="none">
                      <Image source={oskolokImageForPackShards(cost)} style={{ width: 30, height: 30 }} resizeMode="contain" />
                    </View>
                    <Text
                      style={[
                        styles.shardBtnLabel,
                        {
                          color: modalAccent,
                          fontSize: f.body,
                          textAlign: 'center',
                        },
                      ]}
                    >
                      {ctaLabel}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.btnGhost, { borderColor: rewardModalPanelBorder(themeMode, t), backgroundColor: rewardModalSoftSurface(themeMode, t), marginTop: 6 }]}
              activeOpacity={0.75}
              accessibilityRole="button"
            >
              <Text style={[styles.btnGhostText, { color: PAYWALL_MODAL.subtitle, fontSize: f.body }]}>{dismissLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: 26,
    padding: 26,
    width: '100%',
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  heroWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  heroHalo: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  iconShell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#12110F',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '900', textAlign: 'center' },
  subtitle: { lineHeight: 22, textAlign: 'center' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  streakNum: { fontSize: 32, fontWeight: '900' },
  streakUnit: { fontSize: 13, fontWeight: '600' },
  pricePill: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 2,
  },
  priceIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  priceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  shardBtnIconSlot: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  shardBtn: { alignSelf: 'stretch', width: '100%' },
  shardBtnInner: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  shardBtnLabel: { fontWeight: '800' },
  btnGhost: {
    alignSelf: 'stretch',
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
  },
  btnGhostText: { fontWeight: '700' },
});
