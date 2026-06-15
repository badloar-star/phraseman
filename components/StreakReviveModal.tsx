import React, { memo, useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import RewardCardV2 from './reward_v2/RewardCardV2';
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
import { rewardModalSoftSurface, rewardModalPanelBorder } from './RewardModalBackdrop';

interface StreakReviveModalProps {
  visible: boolean;
  offer: StreakReviveOffer | null;
  onClose: () => void;
  onRevived?: (restoredStreak: number) => void;
  shopReturnTo?: 'home' | 'streak_stats';
}

function formatStreakDays(count: number, lang: Lang): string {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  return triLang(lang, {
    ru: `${safeCount} ${safeCount === 1 ? 'дня' : 'дней'}`,
    uk: `${safeCount} ${safeCount === 1 ? 'дня' : 'днів'}`,
    es: `${safeCount} día${safeCount === 1 ? '' : 's'}`,
    'pt-BR': `${safeCount} dia${safeCount === 1 ? '' : 's'}`,
    vi: `${safeCount} ngày`,
    id: `${safeCount} hari`,
    tr: `${safeCount} gün`,
    pl: `${safeCount} ${safeCount === 1 ? 'dzień' : 'dni'}`,
  });
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
  const lostStreakText = formatStreakDays(lostStreak, lang);

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

  // Огненный акцент стрика — совпадает с semantic="fire" кольца карточки.
  const accent = '#FF7A1A';
  const soft = rewardModalSoftSurface(themeMode, t);
  const border = rewardModalPanelBorder(themeMode, t);

  return (
    <RewardCardV2
      visible={visible}
      semantic="fire"
      backdropAction="ghost"
      kicker={triLang(lang, { ru: '', uk: '', es: 'Racha', 'pt-BR': 'Sequência', vi: 'Chuỗi', id: 'Streak', tr: 'Seri', pl: 'Seria' })}
      icon="🔥"
      title={triLang(lang, { ru: 'Цепочка прервалась', uk: 'Ланцюжок перервався', es: 'La racha se interrumpió', 'pt-BR': 'A sequência foi interrompida', vi: 'Chuỗi của bạn đã bị gián đoạn', id: 'Rangkaian terputus', tr: 'Serin kesildi', pl: 'Seria została przerwana' })}
      value={triLang(lang, {
        ru: `Ты пропустил серию из ${lostStreakText}. Восстанови рекорд или начни новую цепочку.`,
        uk: `Ви втратили серію з ${lostStreakText}. Хочете відновити свій рекорд чи почати новий ланцюжок?`,
        es: `Perdiste una racha de ${lostStreakText}. ¿Quieres recuperar tu récord o empezar una nueva racha?`,
        'pt-BR': `Você perdeu uma sequência de ${lostStreakText}. Quer restaurar seu recorde ou começar uma nova sequência?`,
        vi: `Bạn đã mất chuỗi ${lostStreakText}. Bạn muốn khôi phục kỷ lục hay bắt đầu chuỗi mới?`,
        id: `Kamu kehilangan rangkaian ${lostStreakText}. Mau memulihkan rekor atau mulai rangkaian baru?`,
        tr: `${lostStreakText} serini kaybettin. Rekorunu yenilemek mi, yoksa yeni bir seri başlatmak mı istersin?`,
        pl: `Utraciłeś serię ${lostStreakText}. Chcesz odnowić swój rekord czy zacząć nową serię?`,
      })}
      ctaLabel={triLang(lang, { ru: 'Восстановить рекорд', uk: 'Відновити рекорд', es: 'Recuperar récord', 'pt-BR': 'Restaurar recorde', vi: 'Khôi phục kỷ lục', id: 'Pulihkan rekor', tr: 'Rekoru yenile', pl: 'Odnów rekord' })}
      onCta={() => { hapticTap(); void onConfirm(); }}
      ghostLabel={triLang(lang, { ru: 'Начать новую цепочку', uk: 'Почати новий ланцюжок', es: 'Empezar una nueva racha', 'pt-BR': 'Começar uma nova sequência', vi: 'Bắt đầu chuỗi mới', id: 'Mulai rangkaian baru', tr: 'Yeni seri başlat', pl: 'Zacznij nową serię' })}
      onGhost={onDismiss}
    >
      {/* Пилл стрика и цены — уникальный контент этой модалки */}
      <View style={[styles.streakPill, { backgroundColor: soft, borderColor: border }]}>
        <Text style={[styles.streakNum, { color: accent }]}>{lostStreak}</Text>
        <Text style={[styles.streakUnit, { color: t.textSecond, fontSize: f.sub }]}>{streakUnit}</Text>
      </View>
      <View style={[styles.pricePill, { backgroundColor: soft, borderColor: border }]}>
        <Image source={oskolokImageForPackShards(cost)} style={styles.priceIcon} contentFit="contain" />
        <Text style={[styles.priceValue, { color: accent, fontSize: f.body }]}>{cost}</Text>
      </View>
      {msLeft > 0 && (
        <Text style={[styles.countdown, { color: t.textSecond, fontSize: f.sub }]}>
          {formatCountdown(msLeft, lang)}
        </Text>
      )}
    </RewardCardV2>
  );
}

export default memo(StreakReviveModal);

const styles = StyleSheet.create({
  streakPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  streakNum: { fontSize: 32, fontWeight: '900' },
  streakUnit: { fontWeight: '600' },
  pricePill: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
  },
  priceIcon: { width: 28, height: 28, flexShrink: 0 },
  priceValue: { fontWeight: '900' },
  countdown: { marginTop: 10, textAlign: 'center', opacity: 0.7 },
});
