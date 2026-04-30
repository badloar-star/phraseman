import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Долгое нажатие на индикатор энергии — полный заряд базы за осколки.
 * Одна схема UI: иконка осколков + цена + «Восстановить» (активна только когда есть смысл).
 */
export default function EnergyRefillShardModal({ visible, onClose }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const { theme: t, themeMode, f } = useTheme();
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
        onClose();
        router.push({
          pathname: '/shards_shop',
          params: { need: String(need), source: 'energy_refill_modal' },
        } as any);
        return;
      }
      if (r.reason === 'already_full' || r.reason === 'unlimited') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Сейчас пополнение не требуется.',
          messageUk: 'Зараз поповнення не потрібне.',
          messageEs: 'Ahora no hace falta recargar energía.',
        });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, canRefill, cost, energy, isUnlimited, maxEnergy, onClose, reload, router]);

  const title = isUK ? 'Відновити енергію' : isES ? 'Recuperar energía' : 'Восстановить энергию';
  const closeLabel = isUK ? 'Закрити' : isES ? 'Cerrar' : 'Закрыть';

  const hintUnlimited = isUK
    ? 'У тебе безліміт енергії (Premium або тестовий режим). Осколки на заряд не витрачаються.'
    : isES
      ? 'Tienes energía ilimitada (Premium o modo de prueba). Los fragmentos no se gastan en la recarga.'
      : 'У тебя безлимит энергии (Premium или тестовый режим). Осколки на заряд не тратятся.';
  const hintFull = isUK
    ? `Базова енергія вже повна (${maxEnergy} ⚡). Спочатку витрать заряд у уроці або квізі — тоді зможеш купити повне відновлення за осколки.`
    : isES
      ? `Tu reserva base de energía ya está llena (${maxEnergy} ⚡). Primero gasta ⚡ en una lección o un cuestionario; después podrás recuperarla a cambio de fragmentos.`
      : `Базовая энергия уже полная (${maxEnergy} ⚡). Сначала потрать заряд в уроке или квизе — тогда сможешь купить полное восстановление за осколки.`;
  const hintOk = isUK
    ? `Повний заряд базової енергії (${maxEnergy} ⚡) за`
    : isES
      ? `Recarga completa de la energía base (${maxEnergy} ⚡) por`
      : `Полный заряд базовой энергии (${maxEnergy} ⚡) за`;

  const bodyHint = isUnlimited ? hintUnlimited : baseFull ? hintFull : hintOk;

  const isLight = themeMode === 'ocean' || themeMode === 'sakura';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlayRoot}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: isLight ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.72)' }]}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
        <View style={styles.cardWrap} pointerEvents="box-none">
          <View style={[styles.card, { backgroundColor: t.bgCard }]}>
            <Text style={styles.emoji}>⚡</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body, textAlign: 'center' }]}>
              {bodyHint}
            </Text>

            {!isUnlimited && (
              <View style={styles.priceRow}>
                <Image source={oskolokImageForPackShards(cost)} style={{ width: 36, height: 36 }} resizeMode="contain" />
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
                      messageRu: 'База уже полная — сначала потрать ⚡ в уроке или квизе.',
                      messageUk: 'База вже повна — спочатку витрать ⚡ в уроці або квізі.',
                      messageEs:
                        'Ya tienes la energía al máximo: primero gasta ⚡ en una lección o un cuestionario.',
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
                {busy ? (
                  <ActivityIndicator color={t.correctText} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Image source={oskolokImageForPackShards(cost)} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    <Text style={[styles.btnPrimaryText, { fontSize: f.body, color: t.correctText }]}>
                      {isUK ? 'Відновити' : isES ? 'Recuperar' : 'Восстановить'} · {cost} 💎
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                hapticTap();
                onClose();
              }}
              style={[styles.btnGhost, { borderColor: t.border }]}
              disabled={busy}
            >
              <Text style={[styles.btnGhostText, { color: t.textPrimary, fontSize: f.body }]}>{closeLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
    zIndex: 1,
  },
  card: {
    borderRadius: 22,
    padding: 26,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  emoji: { fontSize: 40 },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: { lineHeight: 22 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  priceNum: { fontSize: 28, fontWeight: '900' },
  btnGhost: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
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
