import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { reviveStreak, dismissReviveOffer, type StreakReviveOffer } from '../app/streak_revive';
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
}

function formatRemaining(ms: number, lang: Lang): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return triLang(lang, {
    ru: h > 0 ? `${h} ч ${m} мин` : `${m} мин`,
    uk: h > 0 ? `${h} год ${m} хв` : `${m} хв`,
    es: h > 0 ? `${h} h ${m} min` : `${m} min`,
    'pt-BR': h > 0 ? `${h} h ${m} min` : `${m} min`,
    vi: h > 0 ? `${h} giờ ${m} phút` : `${m} phút`,
    id: h > 0 ? `${h} jam ${m} menit` : `${m} menit`,
    tr: h > 0 ? `${h} sa ${m} dk` : `${m} dk`,
    pl: h > 0 ? `${h} godz. ${m} min` : `${m} min`,
  });
}

export default function StreakReviveModal({ visible, offer, onClose, onRevived }: StreakReviveModalProps) {
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

  const remainingMs = useMemo(() => {
    if (!offer) return 0;
    return Math.max(0, offer.expiresAt - Date.now());
  }, [offer]);

  const cost = offer?.costShards ?? 0;
  const lostStreak = offer?.lostStreak ?? 0;
  const remainingText = formatRemaining(remainingMs, lang);

  // ── Копирайт: пользовательское слово «цепочка» ─────────────────────────
  const title = triLang(lang, {
    ru: 'Цепочка оборвалась',
    uk: 'Ланцюжок обірвався',
    es: 'Has perdido la racha',
    'pt-BR': 'Sua sequência foi interrompida',
    vi: 'Chuỗi của bạn đã bị ngắt',
    id: 'Streak kamu terputus',
    tr: 'Serin koptu',
    pl: 'Twoja seria została przerwana',
  });

  const subtitle = triLang(lang, {
    ru: `Твоя серия из ${lostStreak} ${lostStreak === 1 ? 'дня' : 'дней'} оборвалась. Ещё ${remainingText} — восстанови и продолжай с той же отметки.`,
    uk: `Твій ланцюжок із ${lostStreak} ${lostStreak === 1 ? 'дня' : 'днів'} обірвався. Є ще ${remainingText} — відновлюй і продовжуй з того ж місця.`,
    es: `Tu racha de ${lostStreak} días se rompió. Tienes ${remainingText} para recuperarla y continuar desde donde lo dejaste.`,
    'pt-BR': `Sua sequência de ${lostStreak} dias foi interrompida. Você ainda tem ${remainingText} para restaurá-la e continuar de onde parou.`,
    vi: `Chuỗi ${lostStreak} ngày của bạn đã bị ngắt. Bạn còn ${remainingText} để khôi phục và tiếp tục từ điểm cũ.`,
    id: `Streak ${lostStreak} hari kamu terputus. Masih ada ${remainingText} untuk memulihkannya dan lanjut dari titik yang sama.`,
    tr: `${lostStreak} günlük serin koptu. Yenileyip kaldığın yerden devam etmek için ${remainingText} süren var.`,
    pl: `Twoja seria ${lostStreak} dni została przerwana. Masz jeszcze ${remainingText}, aby ją odnowić i kontynuować od tego miejsca.`,
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

  const ctaLabel = triLang(lang, {
    ru: `Восстановить · ${cost}`,
    uk: `Відновити · ${cost}`,
    es: `Recuperar · ${cost}`,
    'pt-BR': `Restaurar · ${cost}`,
    vi: `Khôi phục · ${cost}`,
    id: `Pulihkan · ${cost}`,
    tr: `Yenile · ${cost}`,
    pl: `Odnów · ${cost}`,
  });
  const dismissLabel = triLang(lang, {
    ru: 'Не сейчас',
    uk: 'Не зараз',
    es: 'Ahora no',
    'pt-BR': 'Agora não',
    vi: 'Để sau',
    id: 'Nanti saja',
    tr: 'Şimdi değil',
    pl: 'Nie teraz',
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
            params: { need: String(need), source: 'streak_revive' },
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
            params: { need: String(need), source: 'streak_revive' },
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
                  backgroundColor: 'transparent',
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
