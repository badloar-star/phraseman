import React, { memo, useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
// зачем: сырой useSafeAreaInsets в свежесмонтированном модале даёт 0 до прихода
// нативных метрик — контент прыгал; стабильная обёртка знает инсеты синхронно.
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
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

interface StreakReviveModalProps {
  visible: boolean;
  offer: StreakReviveOffer | null;
  onClose: () => void;
  onRevived?: (restoredStreak: number) => void;
  shopReturnTo?: 'home' | 'streak_stats';
}

function slavicPlural(count: number, one: string, few: string, many: string): string {
  const normalized = Math.abs(Math.floor(count));
  const mod10 = normalized % 10;
  const mod100 = normalized % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function formatCountdown(msLeft: number, lang: Lang): string {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return triLang(lang, {
    ru: `Истекает через ${time}`,
    uk: `Спливає через ${time}`,
    es: `Expira en ${time}`,
    'pt-BR': `Expira em ${time}`,
    vi: `Hết hạn sau ${time}`,
    id: `Kedaluwarsa dalam ${time}`,
    tr: `${time} içinde sona erer`,
    pl: `Wygasa za ${time}`,
  });
}

function StreakReviveModal({ visible, offer, onClose, onRevived, shopReturnTo = 'home' }: StreakReviveModalProps) {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();
  const insets = useStableSafeAreaInsets();
  const { height: windowHeight, fontScale } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => { if (!visible) setBusy(false); }, [visible]);

  // Countdown timer — auto-closes when offer expires
  useEffect(() => {
    if (!visible || !offer?.expiresAt) return;
    const tick = () => {
      const remaining = offer.expiresAt - Date.now();
      setMsLeft(remaining);
      if (remaining <= 0) onClose();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible, offer?.expiresAt, onClose]);

  const cost = offer?.costShards ?? 0;
  const lostStreak = offer?.lostStreak ?? 0;
  const compactHeight = windowHeight < 700 || fontScale > 1.15;

  const streakUnit = triLang(lang, {
    ru: `${slavicPlural(lostStreak, 'день', 'дня', 'дней')} подряд`,
    uk: `${slavicPlural(lostStreak, 'день', 'дні', 'днів')} поспіль`,
    es: 'días seguidos',
    'pt-BR': 'dias seguidos',
    vi: 'ngày liên tiếp',
    id: 'hari berturut-turut',
    tr: 'gün üst üste',
    pl: 'dni z rzędu',
  });

  const title = triLang(lang, {
    ru: 'Рекорд всё ещё твой',
    uk: 'Рекорд усе ще твій',
    es: 'Tu récord sigue siendo tuyo',
    'pt-BR': 'Seu recorde ainda é seu',
    vi: 'Kỷ lục vẫn là của bạn',
    id: 'Rekormu masih milikmu',
    tr: 'Rekorun hâlâ senin',
    pl: 'Twój rekord nadal jest Twój',
  });
  const description = triLang(lang, {
    ru: 'Верни прерванную серию одним действием — либо спокойно начни заново.',
    uk: 'Поверни перервану серію одним дотиком — або спокійно почни заново.',
    es: 'Recupera la racha con un toque o empieza de nuevo con tranquilidad.',
    'pt-BR': 'Restaure a sequência com um toque ou recomece com tranquilidade.',
    vi: 'Khôi phục chuỗi chỉ với một lần chạm, hoặc bình tĩnh bắt đầu lại.',
    id: 'Pulihkan rangkaian dengan sekali ketuk, atau mulai lagi dengan tenang.',
    tr: 'Seriyi tek dokunuşla geri getir veya sakin biçimde yeniden başla.',
    pl: 'Przywróć serię jednym dotknięciem albo spokojnie zacznij od nowa.',
  });
  const primaryLabel = triLang(lang, {
    ru: 'Восстановить рекорд',
    uk: 'Відновити рекорд',
    es: 'Recuperar récord',
    'pt-BR': 'Restaurar recorde',
    vi: 'Khôi phục kỷ lục',
    id: 'Pulihkan rekor',
    tr: 'Rekoru yenile',
    pl: 'Odnów rekord',
  });
  const busyLabel = triLang(lang, {
    ru: 'Восстанавливаем…',
    uk: 'Відновлюємо…',
    es: 'Recuperando…',
    'pt-BR': 'Restaurando…',
    vi: 'Đang khôi phục…',
    id: 'Memulihkan…',
    tr: 'Yenileniyor…',
    pl: 'Odnawianie…',
  });
  const secondaryLabel = triLang(lang, {
    ru: 'Начать новую цепочку',
    uk: 'Почати новий ланцюжок',
    es: 'Empezar una nueva racha',
    'pt-BR': 'Começar uma nova sequência',
    vi: 'Bắt đầu chuỗi mới',
    id: 'Mulai rangkaian baru',
    tr: 'Yeni seri başlat',
    pl: 'Zacznij nową serię',
  });
  const costLabel = triLang(lang, {
    ru: 'Стоимость',
    uk: 'Вартість',
    es: 'Coste',
    'pt-BR': 'Custo',
    vi: 'Chi phí',
    id: 'Biaya',
    tr: 'Ücret',
    pl: 'Koszt',
  });
  const closeLabel = triLang(lang, {
    ru: 'Закрыть предложение восстановления',
    uk: 'Закрити пропозицію відновлення',
    es: 'Cerrar la oferta de recuperación',
    'pt-BR': 'Fechar a oferta de restauração',
    vi: 'Đóng đề nghị khôi phục',
    id: 'Tutup tawaran pemulihan',
    tr: 'Yenileme teklifini kapat',
    pl: 'Zamknij ofertę odnowienia',
  });

  const onConfirm = useCallback(async () => {
    if (busy || !offer) return;
    setBusy(true);
    try {
      const balance = await getShardsBalance();
      if (balance < cost) {
        const need = Math.max(0, cost - balance);
        navigateAfterModalClose(onClose, () => {
          router.push({ pathname: '/shards_shop', params: { need: String(need), source: 'streak_revive', returnTo: shopReturnTo } } as any);
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
          router.push({ pathname: '/shards_shop', params: { need: String(need), source: 'streak_revive', returnTo: shopReturnTo } } as any);
        });
        return;
      }
      if (r.reason === 'no_offer' || r.reason === 'expired') {
        emitAppEvent('action_toast', { type: 'info', messageRu: 'Время восстановления уже истекло.', messageUk: 'Час відновлення вже минув.', messageEs: 'El tiempo de recuperación ya expiró.', messagePtBr: 'O tempo para restaurar já acabou.', messageVi: 'Thời gian khôi phục đã hết.', messageId: 'Waktu pemulihan sudah habis.', messageTr: 'Yenileme süresi doldu.', messagePl: 'Czas na odnowienie już minął.' });
        onClose();
        return;
      }
      emitAppEvent('action_toast', { type: 'error', messageRu: 'Цепочку восстановить не получилось. Попробуй ещё раз.', messageUk: 'Не вдалося відновити ланцюжок. Спробуй ще раз.', messageEs: 'No se pudo recuperar la racha. Inténtalo de nuevo.', messagePtBr: 'Não foi possível restaurar a sequência. Tente novamente.', messageVi: 'Không thể khôi phục chuỗi. Hãy thử lại.', messageId: 'Tidak dapat memulihkan streak. Coba lagi.', messageTr: 'Seri yenilenemedi. Tekrar dene.', messagePl: 'Nie udało się odnowić serii. Spróbuj ponownie.' });
    } finally {
      setBusy(false);
    }
  }, [busy, offer, cost, onClose, router, onRevived, shopReturnTo]);

  const onDismiss = useCallback(() => {
    if (busy) return;
    hapticTap();
    void dismissReviveOffer();
    onClose();
  }, [busy, onClose]);

  const handleDismiss = useCallback(() => {
    if (busy) return;
    onDismiss();
  }, [busy, onDismiss]);

  const accent = '#FF7A45';
  const accentDarkText = '#241008';
  const isLightTheme = themeMode === 'businessLight';
  const passSurface = isLightTheme ? '#F7F5FA' : '#171824';
  const primarySurface = isLightTheme ? '#6E5AE8' : '#F3F0FF';
  const primaryText = isLightTheme ? '#FFFFFF' : '#171421';

  if (!visible || !offer) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View
        style={[
          styles.modalRoot,
          { paddingTop: Math.max(18, insets.top), paddingBottom: Math.max(18, insets.bottom) },
        ]}
      >
        <Pressable
          testID="streak-revive-backdrop"
          style={styles.backdrop}
          onPress={handleDismiss}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          accessibilityState={{ disabled: busy }}
        />

        <View
          testID="streak-revive-pass"
          style={[styles.pass, compactHeight && styles.passCompact, { backgroundColor: passSurface }]}
          accessibilityViewIsModal
        >
          <View
            testID="streak-revive-header"
            style={[styles.header, compactHeight && styles.headerCompact, { backgroundColor: accent }]}
          >
            <Pressable
              testID="streak-revive-close"
              onPress={handleDismiss}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              accessibilityState={{ disabled: busy }}
              hitSlop={8}
              style={({ pressed }) => [styles.closeButton, pressed && !busy && styles.pressed]}
            >
              <Ionicons name="close" size={27} color={accentDarkText} />
            </Pressable>
            {/* зачем: убран шрифто-сжимающий проп (запрещён на iOS) — streak-число
                реалистично 1-3 цифры, tabular-nums держит фикс. ширину цифр,
                clip как крайний случай вместо сжатия при аномально большом значении */}
            <Text
              style={[styles.streakNumber, compactHeight && styles.streakNumberCompact, { color: accentDarkText, fontVariant: ['tabular-nums'] }]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {lostStreak}
            </Text>
            <Text style={[styles.streakLabel, { color: accentDarkText }]}>{streakUnit}</Text>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={[styles.body, compactHeight && styles.bodyCompact]}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}
              numberOfLines={3}
            >
              {title}
            </Text>
            <Text style={[styles.description, { color: t.textSecond, fontSize: f.body }]}>{description}</Text>

            <Pressable
              testID="streak-revive-primary"
              onPress={() => { hapticTap(); void onConfirm(); }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={busy ? busyLabel : primaryLabel}
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: primarySurface },
                pressed && !busy && styles.pressed,
              ]}
            >
              {busy ? <ActivityIndicator color={primaryText} size="small" /> : null}
              <Text style={[styles.primaryText, { color: primaryText }]}>{busy ? busyLabel : primaryLabel}</Text>
            </Pressable>

            <View style={styles.costRow}>
              <Image source={oskolokImageForPackShards(cost)} style={styles.priceIcon} contentFit="contain" />
              <Text style={[styles.costText, { color: t.textSecond }]}>{costLabel}: {cost}</Text>
            </View>

            <Pressable
              testID="streak-revive-secondary"
              onPress={handleDismiss}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [styles.secondaryButton, pressed && !busy && styles.pressed]}
            >
              <Text style={[styles.secondaryText, { color: t.textMuted }]}>{secondaryLabel}</Text>
            </Pressable>

            {msLeft > 0 ? (
              <Text style={[styles.countdown, { color: t.textMuted }]}>{formatCountdown(msLeft, lang)}</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default memo(StreakReviveModal);

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 4, 10, 0.76)',
  },
  pass: {
    zIndex: 1,
    width: 342,
    maxWidth: '100%',
    maxHeight: '92%',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.48,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
  passCompact: {
    maxHeight: '96%',
  },
  header: {
    minHeight: 206,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 24,
    justifyContent: 'flex-end',
  },
  headerCompact: {
    minHeight: 150,
    paddingTop: 20,
    paddingBottom: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36, 16, 8, 0.10)',
  },
  streakNumber: {
    fontSize: 100,
    lineHeight: 94,
    fontWeight: '900',
    letterSpacing: -5,
  },
  streakNumberCompact: {
    fontSize: 72,
    lineHeight: 68,
    letterSpacing: -3,
  },
  streakLabel: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '900',
  },
  bodyScroll: {
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
  },
  bodyCompact: {
    paddingTop: 20,
    paddingBottom: 14,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  description: {
    marginTop: 9,
    lineHeight: 23,
    fontWeight: '500',
  },
  primaryButton: {
    minHeight: 58,
    marginTop: 24,
    borderRadius: 19,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
  costRow: {
    minHeight: 34,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  priceIcon: {
    width: 22,
    height: 22,
    flexShrink: 0,
  },
  costText: {
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  countdown: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
});
