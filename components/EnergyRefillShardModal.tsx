import { LinearGradient } from './SafeLinearGradient';
import React, { memo, useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEnergy } from './EnergyContext';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  energyRefillShardCost,
  refillEnergyWithShards,
  toastEnergyRefilledWithShards,
} from '../app/energy_shard_refill';
import { getShardsBalance } from '../app/shards_system';
import { oskolokImageForPackShards } from '../app/oskolok';
import { emitAppEvent } from '../app/events';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import { SHARD_MODAL_FRAME_COLORS } from '../constants/shard_modal_chrome';
import { triLang } from '../constants/i18n';

import { noAndroidOutline } from '../constants/androidGlow';
type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Долгое нажатие на индикатор энергии — полный заряд базы за осколки.
 * Одна схема UI: иконка осколков + цена + «Восстановить» (активна только когда есть смысл).
 */
function EnergyRefillShardModal({ visible, onClose }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, themeMode, f } = useTheme();
  const shardModalCardBg = t.bgCard;
  const { energy, maxEnergy, isUnlimited, reload } = useEnergy();
  const [busy, setBusy] = useState(false);

  const cost = energyRefillShardCost(maxEnergy);
  const baseFull = energy >= maxEnergy;
  /** Реальная покупка за осколки возможна */
  const canRefill = !isUnlimited && !baseFull;

  const onConfirm = useCallback(async () => {
    if (busy || !canRefill) return;
    setBusy(true);
    try {
      const r = await refillEnergyWithShards({
        maxEnergy,
        baseEnergy: energy,
        isUnlimited,
      });
      if (r.ok) {
        toastEnergyRefilledWithShards();
        await reload();
        onClose();
        return;
      }
      if (r.reason === 'insufficient_shards') {
        const bal = await getShardsBalance();
        const need = Math.max(0, cost - bal);
        navigateAfterModalClose(onClose, () => {
          router.push({
            pathname: '/shards_shop',
            params: { need: String(need), source: 'energy_refill_modal' },
          } as any);
        });
        return;
      }
      if (r.reason === 'already_full' || r.reason === 'unlimited') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Сейчас пополнение не требуется.',
          messageUk: 'Зараз поповнення не потрібне.',
          messageEs: 'Ahora no hace falta recargar energía.',
          messagePtBr: 'Não é preciso recarregar energia agora.',
          messageVi: 'Hiện chưa cần nạp năng lượng.',
          messageId: 'Saat ini tidak perlu mengisi ulang energi.',
          messageTr: 'Şu anda enerji yenilemeye gerek yok.',
          messagePl: 'Teraz nie trzeba odnawiać energii.',
        });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, canRefill, cost, energy, isUnlimited, maxEnergy, onClose, reload, router]);

  const title = triLang(lang, {
    ru: 'Восстановить энергию',
    uk: 'Відновити енергію',
    es: 'Recuperar energía',
    'pt-BR': 'Restaurar energia',
    vi: 'Khôi phục năng lượng',
    id: 'Pulihkan energi',
    tr: 'Enerjiyi yenile',
    pl: 'Odnów energię',
  });
  const closeLabel = triLang(lang, {
    ru: 'Закрыть',
    uk: 'Закрити',
    es: 'Cerrar',
    'pt-BR': 'Fechar',
    vi: 'Đóng',
    id: 'Tutup',
    tr: 'Kapat',
    pl: 'Zamknij',
  });

  const hintUnlimited = triLang(lang, {
    ru: 'У тебя безлимит энергии (Plus или тестовый режим). Жемчуг на заряд не тратится.',
    uk: 'У тебе безліміт енергії (Plus або тестовий режим). Перлини на заряд не витрачаються.',
    es: 'Tienes energía ilimitada (Plus o modo de prueba). Los perlas no se gastan en la recarga.',
    'pt-BR': 'Você tem energia ilimitada (Plus ou modo de teste). Pérolas não são gastos na recarga.',
    vi: 'Bạn có năng lượng không giới hạn (Plus hoặc chế độ thử nghiệm). Xu sẽ không bị dùng để nạp.',
    id: 'Kamu punya energi tanpa batas (Plus atau mode uji). Koin tidak dipakai untuk isi ulang.',
    tr: 'Sınırsız enerjin var (Plus veya test modu). Yenileme için jeton harcanmaz.',
    pl: 'Masz energię bez limitu (Plus albo tryb testowy). Monety nie są wydawane na odnowienie.',
  });
  const hintFull = triLang(lang, {
    ru: `Базовая энергия уже полная (${maxEnergy} ⚡). Сначала потрать заряд в раунде или вызове — тогда сможешь открыть полное восстановление за жемчуг.`,
    uk: `Базова енергія вже повна (${maxEnergy} ⚡). Спочатку витрать заряд у раунді або виклику — тоді зможеш відкрити повне відновлення за перлини.`,
    es: `Tu reserva base de energía ya está llena (${maxEnergy} ⚡). Primero gasta ⚡ en una lección o un cuestionario; después podrás recuperarla a cambio de perlas.`,
    'pt-BR': `Sua energia base já está cheia (${maxEnergy} ⚡). Primeiro gaste ⚡ em uma lição ou quiz; depois você poderá restaurar tudo com pérolas.`,
    vi: `Năng lượng cơ bản đã đầy (${maxEnergy} ⚡). Trước tiên hãy dùng ⚡ trong bài học hoặc quiz; sau đó bạn có thể khôi phục đầy bằng xu.`,
    id: `Energi dasar sudah penuh (${maxEnergy} ⚡). Gunakan ⚡ dulu di pelajaran atau kuis; setelah itu kamu bisa memulihkan penuh dengan koin.`,
    tr: `Temel enerji zaten dolu (${maxEnergy} ⚡). Önce bir ders veya quizde ⚡ harca; sonra jetonlarla tamamen yenileyebilirsin.`,
    pl: `Podstawowa energia jest już pełna (${maxEnergy} ⚡). Najpierw zużyj ⚡ w lekcji albo quizie; potem możesz odnowić ją za monety.`,
  });
  const hintOk = triLang(lang, {
    ru: `Полный заряд базовой энергии (${maxEnergy} ⚡) за`,
    uk: `Повний заряд базової енергії (${maxEnergy} ⚡) за`,
    es: `Recarga completa de la energía base (${maxEnergy} ⚡) por`,
    'pt-BR': `Carga completa da energia base (${maxEnergy} ⚡) por`,
    vi: `Nạp đầy năng lượng cơ bản (${maxEnergy} ⚡) với`,
    id: `Isi penuh energi dasar (${maxEnergy} ⚡) dengan`,
    tr: `Temel enerjiyi tamamen yenile (${maxEnergy} ⚡):`,
    pl: `Pełne odnowienie energii podstawowej (${maxEnergy} ⚡) za`,
  });
  const kicker = triLang(lang, {
    ru: 'ЭНЕРГИЯ',
    uk: 'ЕНЕРГІЯ',
    es: 'ENERGÍA',
    'pt-BR': 'ENERGIA',
    vi: 'NĂNG LƯỢNG',
    id: 'ENERGI',
    tr: 'ENERJİ',
    pl: 'ENERGIA',
  });
  const refillLabel = triLang(lang, {
    ru: 'Восстановить',
    uk: 'Відновити',
    es: 'Recuperar',
    'pt-BR': 'Restaurar',
    vi: 'Khôi phục',
    id: 'Pulihkan',
    tr: 'Yenile',
    pl: 'Odnów',
  });

  const bodyHint = isUnlimited ? hintUnlimited : baseFull ? hintFull : hintOk;

  const isLight = false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
          карточка пополнения энергии центрировалась во весь рост без прокрутки
          — на низком экране обрезалась вместе с кнопкой покупки. */}
      <ScrollView
        style={styles.overlayScroll}
        contentContainerStyle={styles.overlayRoot}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: isLight ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.72)' }]}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
        <View style={styles.cardWrap} pointerEvents="box-none">
          <LinearGradient
            colors={[...SHARD_MODAL_FRAME_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardFrame}
          >
            <View style={[styles.card, { backgroundColor: shardModalCardBg }]}>
              <Text style={[styles.kicker, { color: t.gold }]}>
                {kicker}
              </Text>
              <Text style={styles.emoji}>⚡</Text>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: Math.round(f.h2 * 1.08) }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: t.textMuted, fontSize: f.body, textAlign: 'center' }]}>
                {bodyHint}
              </Text>

            {!isUnlimited && (
              <View style={styles.priceRow}>
                <Image source={oskolokImageForPackShards(cost)} style={{ width: 36, height: 36 }} contentFit="contain" />
                <Text style={[styles.priceNum, { color: t.textPrimary }]}>{cost}</Text>
              </View>
            )}

            {!isUnlimited && (
              <TouchableOpacity
                onPress={() => {
                  hapticTap();
                  if (!canRefill) {
                    emitAppEvent('action_toast', {
                      type: 'info',
                      messageRu: 'База уже полная — сначала потрать ⚡ в раунде или вызове.',
                      messageUk: 'База вже повна — спочатку витрать ⚡ в раунді або виклику.',
                      messageEs:
                        'Ya tienes la energía al máximo: primero gasta ⚡ en una lección o un cuestionario.',
                      messagePtBr: 'A energia base já está cheia: primeiro gaste ⚡ em uma lição ou quiz.',
                      messageVi: 'Năng lượng cơ bản đã đầy: trước tiên hãy dùng ⚡ trong bài học hoặc quiz.',
                      messageId: 'Energi dasar sudah penuh: gunakan ⚡ dulu di pelajaran atau kuis.',
                      messageTr: 'Temel enerji zaten dolu: önce bir ders veya quizde ⚡ harca.',
                      messagePl: 'Podstawowa energia jest już pełna: najpierw zużyj ⚡ w lekcji albo quizie.',
                    });
                    return;
                  }
                  void onConfirm();
                }}
                style={[
                  styles.btnPrimary,
                  { backgroundColor: t.accent, opacity: canRefill && !busy ? 1 : 0.42 },
                ]}
                disabled={busy}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Image source={oskolokImageForPackShards(cost)} style={{ width: 22, height: 22 }} contentFit="contain" />
                  <Text style={[styles.btnPrimaryText, { fontSize: f.body, color: t.correctText }]}>
                    {refillLabel} · {cost}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                hapticTap();
                onClose();
              }}
              style={[styles.btnGhost, { borderColor: t.gold + '40' }]}
              disabled={busy}
            >
              <Text style={[styles.btnGhostText, { color: t.textPrimary, fontSize: f.body }]}>{closeLabel}</Text>
            </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </Modal>
  );
}

export default memo(EnergyRefillShardModal);

const styles = StyleSheet.create({
  overlayScroll: {
    flex: 1,
  },
  overlayRoot: {
    // flexGrow (а не flex) — в contentContainerStyle это единственный способ
    // сказать «растянись на всю высоту, если контента мало, но дай прокрутку,
    // если много». Центрирование сохранено для больших экранов.
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
    zIndex: 1,
  },
  cardFrame: {
    borderRadius: 26,
    padding: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    ...noAndroidOutline,
  },
  card: {
    borderRadius: 23.5,
    padding: 26,
    width: '100%',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.8,
    textAlign: 'center',
  },
  emoji: { fontSize: 36, marginTop: 2 },
  title: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.2 },
  subtitle: { lineHeight: 22 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  priceNum: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  btnGhost: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnGhostText: { fontWeight: '700' },
  btnPrimary: {
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  btnPrimaryText: { fontWeight: '800' },
});
