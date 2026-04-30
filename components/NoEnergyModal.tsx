import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ENERGY_GATE_MESSAGES_RU,
  ENERGY_GATE_MESSAGES_UK,
  ENERGY_GATE_MESSAGES_ES,
  ENERGY_MESSAGES_RU,
  ENERGY_MESSAGES_UK,
  ENERGY_MESSAGES_ES,
} from '../app/lesson1_energy';
import { useTheme } from './ThemeContext';
import { useEnergy } from './EnergyContext';
import { useLang } from './LangContext';
import { hapticTap, hapticWarning } from '../hooks/use-haptics';
import { getShardsBalance } from '../app/shards_system';
import {
  energyRefillShardCost,
  refillEnergyWithShards,
  toastEnergyRefilledWithShards,
} from '../app/energy_shard_refill';
import { oskolokImageForPackShards } from '../app/oskolok';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import PremiumGoldButton from './PremiumGoldButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  onBackHome?: () => void;
  /** Напр. 8 — экзамен Лингмана: иной текст, не «закончилась» */
  minRequired?: number;
  /** `premium_modal` context: аналитика и тексты. По умолчанию `no_energy`. */
  paywallContext?: string;
  /**
   * Админ/QA: показать CTA «за осколки» даже при полной базовой энергии (превью в настройках тестера).
   * Покупка тогда вернёт already_full — покажем info-тост.
   */
  qaForceShardCta?: boolean;
}

export default function NoEnergyModal({
  visible,
  onClose,
  onBackHome,
  minRequired,
  paywallContext = 'no_energy',
  qaForceShardCta = false,
}: Props) {
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const { formattedTime, energy, bonusEnergy, maxEnergy, isUnlimited, reload } = useEnergy();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const totalAvailable = energy + bonusEnergy;
  const isGate = minRequired != null && minRequired > 0;
  const [lineRuUk, setLineRuUk] = useState('');
  const [shardBusy, setShardBusy] = useState(false);

  const shardCost = energyRefillShardCost(maxEnergy);
  /** Докупка базы за осколки: не скрываем при гейте экзамена (8⚡ при max базы < 8 — база + бонус всё равно могут дотянуть). */
  const showShardRestore =
    !isUnlimited &&
    (qaForceShardCta || energy < maxEnergy);

  // ─── Анимации входа и pulse-glow на молнии ──────────────────────────────
  const cardScale  = useRef(new Animated.Value(0.85)).current;
  const cardOp     = useRef(new Animated.Value(0)).current;
  const boltScale  = useRef(new Animated.Value(0)).current;
  const boltShake  = useRef(new Animated.Value(0)).current;
  const haloPulse  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.85);
      cardOp.setValue(0);
      boltScale.setValue(0);
      boltShake.setValue(0);
      haloPulse.setValue(0);
      return;
    }

    // Все запущенные анимации сохраняем в список и останавливаем в cleanup
    // (Fabric: иначе анимация продолжает driver-update view, который уже
    // отдан на размонтаж → NativeAnimatedNodesManager.disconnect crash).
    const running: Animated.CompositeAnimation[] = [];

    const intro = Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.timing(cardOp, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(boltScale, { toValue: 1, friction: 4, tension: 130, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(boltShake, { toValue: 1, duration: 70, useNativeDriver: true }),
          Animated.timing(boltShake, { toValue: -1, duration: 70, useNativeDriver: true }),
          Animated.timing(boltShake, { toValue: 0.6, duration: 70, useNativeDriver: true }),
          Animated.timing(boltShake, { toValue: 0, duration: 90, useNativeDriver: true }),
        ]),
      ]),
    ]);
    intro.start();
    running.push(intro);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    running.push(pulse);

    return () => { running.forEach(a => a.stop()); };
  }, [visible, cardScale, cardOp, boltScale, boltShake, haloPulse]);

  const wasOpenRef = useRef(false);
  useLayoutEffect(() => {
    if (!visible) {
      wasOpenRef.current = false;
      setLineRuUk('');
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    hapticWarning();
    // «Нет энергии» в проде = пользователь уже увидел систему; не дублировать отдельным тутором на главной
    void AsyncStorage.setItem('energy_onboarding_shown', '1');
    emitAppEvent('bug_hunt_eligible_check');
    if (isGate && minRequired != null) {
      const list = isUK ? ENERGY_GATE_MESSAGES_UK : isES ? ENERGY_GATE_MESSAGES_ES : ENERGY_GATE_MESSAGES_RU;
      const line = list[Math.floor(Math.random() * list.length)]!({
        required: String(minRequired),
        have: String(totalAvailable),
      });
      setLineRuUk(line);
      return;
    }
    const list = isUK ? ENERGY_MESSAGES_UK : isES ? ENERGY_MESSAGES_ES : ENERGY_MESSAGES_RU;
    const raw = list[Math.floor(Math.random() * list.length)] ?? list[0] ?? '';
    setLineRuUk(raw.replace(/\{time\}/g, formattedTime || '...'));
  }, [visible, isGate, isUK, isES, minRequired, totalAvailable, formattedTime]);

  const defaultSubtitle = isUK
    ? `+1 ⚡ відновиться через ${formattedTime || '...'}. Хочеш безліміт? Тобі в Premium.`
    : isES
      ? `+1 ⚡ se recuperará en ${formattedTime || '...'}. ¿Quieres energía ilimitada? Prueba Premium.`
      : `+1 ⚡ восстановится через ${formattedTime || '...'}. Хочешь безлимит? Тебе в Premium.`;
  const gateFallback = isGate && minRequired != null
    ? (isUK
      ? `Для іспиту потрібно ${minRequired} ⚡ одразу. У вас: ${totalAvailable}. У Premium — без обмежень.`
      : isES
        ? `Para el examen necesitas ${minRequired} ⚡ de golpe. Dispones de: ${totalAvailable}. Con Premium, sin límites.`
        : `Для экзамена нужно ${minRequired} ⚡ сразу. У вас: ${totalAvailable}. С Premium — без ограничений.`)
    : '';
  const showBody = (isGate ? (lineRuUk || gateFallback) : (lineRuUk || defaultSubtitle));

  const onRestoreWithShards = async () => {
    if (shardBusy || !showShardRestore) return;
    setShardBusy(true);
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
        onClose();
        router.push({
          pathname: '/shards_shop',
          params: { need: String(Math.max(0, shardCost - bal)), source: 'no_energy_modal' },
        } as any);
        return;
      }
      if (r.reason === 'already_full' || r.reason === 'unlimited') {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu:
            'Базовая энергия уже на максимуме — потратьте ⚡ в уроке или квизе, затем снова откройте превью, чтобы проверить покупку за осколки.',
          messageUk:
            'Базова енергія вже на максимумі — витратьте ⚡ в уроці або квізі, потім знову відкрийте превʼю, щоб перевірити покупку за осколки.',
          messageEs:
            'La energía base ya está al máximo: gasta ⚡ en una lección o un cuestionario y vuelve a abrir la vista previa para probar la compra con fragmentos.',
        });
      }
    } finally {
      setShardBusy(false);
    }
  };

  const ENERGY_GLOW = '#F59E0B';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.72)' }]}>
        {/* Цветной радиальный отблеск над затемнением */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[ENERGY_GLOW + '22', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: t.bgCard,
              opacity: cardOp,
              transform: [{ scale: cardScale }],
              shadowColor: ENERGY_GLOW,
              shadowOpacity: 0.45,
              shadowRadius: 24,
            },
          ]}
        >
          {/* Внутренний градиент сверху карточки */}
          <LinearGradient
            colors={[ENERGY_GLOW + '24', 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={styles.cardGlow}
            pointerEvents="none"
          />

          {/* Hero icon: молния со свечением */}
          <View style={styles.boltWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.boltHalo,
                {
                  backgroundColor: ENERGY_GLOW,
                  opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] }),
                  transform: [{ scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] }) }],
                },
              ]}
            />
            <Animated.Text
              style={[
                styles.emoji,
                {
                  transform: [
                    { scale: boltScale },
                    { rotate: boltShake.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) },
                  ],
                  textShadowColor: ENERGY_GLOW + 'CC',
                  textShadowRadius: 18,
                },
              ]}
            >
              ⚡
            </Animated.Text>
          </View>

          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {isGate
              ? (isUK ? 'Недостатньо енергії' : isES ? 'No tienes suficiente energía' : 'Недостаточно энергии')
              : (isUK ? 'Енергія закінчилась' : isES ? 'Se acabó la energía' : 'Энергия закончилась')}
          </Text>
          <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}>
            {showBody}
          </Text>
          {showShardRestore && (
            <TouchableOpacity
              onPress={() => {
                hapticTap();
                void onRestoreWithShards();
              }}
              activeOpacity={0.88}
              disabled={shardBusy}
              style={[styles.shardBtn, { borderColor: '#7C3AED88', backgroundColor: '#7C3AED22' }]}
            >
              {shardBusy ? (
                <ActivityIndicator color={t.textPrimary} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Image
                    source={oskolokImageForPackShards(shardCost)}
                    style={{ width: 30, height: 30 }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: t.textPrimary, fontWeight: '800', fontSize: f.body, flex: 1 }}>
                    {isUK ? 'Відновити енергію' : isES ? 'Recuperar energía' : 'Восстановить энергию'} · {shardCost} 💎
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <PremiumGoldButton f={f} paywallContext={paywallContext} shellStyle={{ marginTop: 4 }} />
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              (onBackHome ?? onClose)();
            }}
            activeOpacity={0.88}
            style={styles.closeBtnWrap}
          >
            <LinearGradient
              colors={[t.accent, t.accent + 'BB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.closeBtn}
            >
              <Text style={[styles.closeBtnText, { fontSize: f.body, color: t.correctText }]}>
                {onBackHome
                  ? (isUK ? 'На головну' : isES ? 'Volver al inicio' : 'На главную')
                  : (isUK ? 'Зрозуміло' : isES ? 'Entendido' : 'Понятно')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    borderRadius: 22,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 180,
  },
  boltWrap: {
    width: 88, height: 88,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  boltHalo: {
    position: 'absolute',
    width: 88, height: 88, borderRadius: 44,
  },
  emoji: { fontSize: 52 },
  title: { fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  shardBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 2,
    minHeight: 52,
    justifyContent: 'center',
  },
  closeBtnWrap: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  closeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  closeBtnText: { fontWeight: '700' },
});
