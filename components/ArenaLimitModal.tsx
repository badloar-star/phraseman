import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import {
  ARENA_DAILY_MAX,
  ARENA_MATCHES_SHARD_REFILL_COST,
  ARENA_MATCHES_SHARD_REFILL_SLOTS,
  refundDailyArenaPlays,
} from '../app/arena_daily_limit';
import { getShardsBalance, spendShards } from '../app/shards_system';
import { emitAppEvent } from '../app/events';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import PremiumGoldButton from './PremiumGoldButton';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import { oskolokImageForPackShards } from '../app/oskolok';
import { triLang } from '../constants/i18n';

export type ArenaLimitMode = 'matchmaking' | 'invite';

interface Props {
  visible: boolean;
  mode: ArenaLimitMode;
  playsUsed: number;
  /** По умолчанию 5; с бонусом подарка уровня может быть 10 и больше */
  dailyMax?: number;
  onClose: () => void;
  /** Premium — безлимит; кнопка за осколки не показывается */
  isUnlimited?: boolean;
  /** После успешной покупки слотов (обновить счётчики в родителе) */
  onRefillSuccess?: () => void | Promise<void>;
}

const { height: SCREEN_H } = Dimensions.get('window');

// Лимит арены — это НЕ наказание, а «доступно с Premium». Поэтому акцент янтарный,
// а не красный (см. ALL_MODALS_AUDIT §3.2: красный портил семантику и конверсию).
const ARENA_LIMIT_ACCENT = '#F4D889';

function opaqueArenaLimitSurface(color: string): string {
  const trimmed = color.trim();
  if (/^#[\da-fA-F]{8}$/.test(trimmed)) return trimmed.slice(0, 7);
  const rgba = trimmed.match(/^rgba\((.+),\s*[\d.]+\)$/);
  if (rgba) return `rgb(${rgba[1]})`;
  return trimmed || '#202020';
}

function ArenaLimitModal({
  visible,
  mode,
  playsUsed,
  dailyMax: dailyMaxProp,
  onClose,
  isUnlimited = false,
  onRefillSuccess,
}: Props) {
  const router = useRouter();
  const dailyMax = dailyMaxProp ?? ARENA_DAILY_MAX;
  const { theme: t, themeMode, f } = useTheme();
  const paywallSheetBg = opaqueArenaLimitSurface(t.bgCard);
  const { lang } = useLang();
  const slideY = useRef(new Animated.Value(SCREEN_H)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(0)).current;
  const [shardBusy, setShardBusy] = useState(false);

  const showShardRefill =
    !isUnlimited && mode === 'matchmaking' && playsUsed >= dailyMax;

  useEffect(() => {
    if (visible) {
      hapticTap();
      iconScale.setValue(0.6);
      titleY.setValue(20);
      titleOp.setValue(0);

      // Все анимации сохраняем в running, чтобы гарантированно остановить
      // в cleanup (Fabric: иначе native crash на disconnect ноды).
      const running: Animated.CompositeAnimation[] = [];

      const intro = Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: MOTION_DURATION.normal, useNativeDriver: true }),
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: MOTION_SPRING.panel.tension,
          friction: MOTION_SPRING.panel.friction,
        }),
        Animated.sequence([
          Animated.delay(140),
          Animated.spring(iconScale, { toValue: 1, friction: 4, tension: 110, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(220),
          Animated.parallel([
            Animated.timing(titleY, { toValue: 0, duration: 320, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
            Animated.timing(titleOp, { toValue: 1, duration: 280, useNativeDriver: true }),
          ]),
        ]),
      ]);
      intro.start();
      running.push(intro);

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(iconPulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      running.push(pulse);

      const dotLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(dotPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(dotPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      );
      dotLoop.start();
      running.push(dotLoop);

      return () => { running.forEach(a => a.stop()); };
    } else {
      const out = Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: MOTION_DURATION.fast, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: SCREEN_H, duration: MOTION_DURATION.fast, useNativeDriver: true }),
      ]);
      out.start();
      return () => out.stop();
    }
  }, [visible, bgOpacity, slideY, iconScale, iconPulse, titleY, titleOp, dotPulse]);

  const dots = Array.from({ length: dailyMax }, (_, i) => i < playsUsed);

  const onRestoreMatchesWithShards = async () => {
    if (shardBusy || !showShardRefill) return;
    setShardBusy(true);
    try {
      const bal = await getShardsBalance();
      if (bal < ARENA_MATCHES_SHARD_REFILL_COST) {
        navigateAfterModalClose(onClose, () => {
          router.push({
            pathname: '/shards_shop',
            params: {
              need: String(Math.max(0, ARENA_MATCHES_SHARD_REFILL_COST - bal)),
              source: 'arena_limit_modal',
            },
          } as any);
        });
        return;
      }
      const spent = await spendShards(ARENA_MATCHES_SHARD_REFILL_COST, 'arena_plays_refill');
      if (!spent) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Осколки не списались. Попробуй ещё раз.',
          messageUk: 'Не вдалося списати осколки. Спробуй ще раз.',
          messageEs: 'No se pudieron usar los fragmentos. Inténtalo de nuevo.',
          messagePtBr: 'Não foi possível usar os fragmentos. Tente novamente.',
          messageVi: 'Không thể dùng mảnh. Hãy thử lại.',
          messageId: 'Tidak dapat memakai shard. Coba lagi.',
          messageTr: 'Parçalar kullanılamadı. Tekrar dene.',
          messagePl: 'Nie udało się użyć odłamków. Spróbuj ponownie.',
        });
        return;
      }
      await refundDailyArenaPlays(ARENA_MATCHES_SHARD_REFILL_SLOTS);
      await onRefillSuccess?.();
      hapticSuccess();
      onClose();
    } finally {
      setShardBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: bgOpacity,
            backgroundColor: 'rgba(0,0,0,0.55)',
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            hapticTap();
            onClose();
          }}
        />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { backgroundColor: paywallSheetBg, transform: [{ translateY: slideY }] }]}
        pointerEvents="box-none"
      >
        <View
          pointerEvents="none"
          style={[styles.sheetOpaqueFill, { backgroundColor: paywallSheetBg }]}
        />

        {/* Внутренний радиальный отблеск сверху листа */}
        <LinearGradient
          colors={[ARENA_LIMIT_ACCENT + '22', 'transparent']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={styles.sheetGlow}
          pointerEvents="none"
        />

        {/* Drag indicator */}
        <View style={[styles.drag, { backgroundColor: t.border }]} />

        {/* Hero icon — пульсирующее свечение под мечом */}
        <View style={styles.iconWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.iconHalo,
              {
                backgroundColor: ARENA_LIMIT_ACCENT,
                opacity: iconPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }),
                transform: [{ scale: iconPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Ionicons name="time-outline" size={56} color={ARENA_LIMIT_ACCENT} />
          </Animated.View>
          <View style={[styles.badgeRed, { backgroundColor: ARENA_LIMIT_ACCENT }]}>
            <Ionicons name="time" size={14} color="#3A2C06" />
          </View>
        </View>

        <Animated.Text
          style={[
            styles.title,
            { color: t.textPrimary, fontSize: f.h1, opacity: titleOp, transform: [{ translateY: titleY }] },
          ]}
        >
          {mode === 'matchmaking'
            ? triLang(lang, {
                ru: 'На сегодня матчи закончились',
                uk: 'Матчі на сьогодні вичерпано',
                es: 'No quedan duelos en la Arena hoy',
                'pt-BR': 'Duelos da Arena esgotados por hoje',
                vi: 'Hôm nay đã hết lượt đấu Arena',
                id: 'Duel Arena hari ini sudah habis',
                tr: 'Bugünkü Arena düelloları bitti',
                pl: 'Dzisiejsze pojedynki Areny wyczerpane',
              })
            : triLang(lang, {
                ru: 'На сегодня приглашения закончились',
                uk: 'Запрошення на сьогодні вичерпано',
                es: 'No quedan invitaciones en la Arena hoy',
                'pt-BR': 'Convites da Arena esgotados por hoje',
                vi: 'Hôm nay đã hết lượt mời Arena',
                id: 'Undangan Arena hari ini sudah habis',
                tr: 'Bugünkü Arena davetleri bitti',
                pl: 'Dzisiejsze zaproszenia Areny wyczerpane',
              })}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            { color: t.textMuted, fontSize: f.body, opacity: titleOp },
          ]}
        >
          {mode === 'matchmaking'
            ? triLang(lang, {
                ru: `Ты сыграл все ${dailyMax} матчей на сегодня.\nЗавтра лимит обновится — возвращайся.`,
                uk: `Ти використав усі ${dailyMax} матчів арени на сьогодні.\nЛіміт оновиться опівночі.`,
                es: `Has usado los ${dailyMax} duelos de la Arena de hoy.\nEl límite se renueva a medianoche.`,
                'pt-BR': `Você usou todos os ${dailyMax} duelos da Arena de hoje.\nO limite renova à meia-noite.`,
                vi: `Bạn đã dùng hết ${dailyMax} lượt đấu Arena hôm nay.\nGiới hạn sẽ làm mới lúc nửa đêm.`,
                id: `Kamu sudah memakai semua ${dailyMax} duel Arena hari ini.\nBatasnya diperbarui tengah malam.`,
                tr: `Bugünkü ${dailyMax} Arena düellonun hepsini kullandın.\nLimit gece yarısı yenilenir.`,
                pl: `Wykorzystano dziś wszystkie ${dailyMax} pojedynków Areny.\nLimit odnowi się o północy.`,
              })
            : triLang(lang, {
                ru: `Ты отправил все ${dailyMax} приглашений на сегодня.\nЗавтра лимит обновится — возвращайся.`,
                uk: `Ти використав усі ${dailyMax} запрошень арени на сьогодні.\nЛіміт оновиться опівночі.`,
                es: `Has usado las ${dailyMax} invitaciones en la Arena de hoy.\nEl límite se renueva a medianoche.`,
                'pt-BR': `Você usou todos os ${dailyMax} convites da Arena de hoje.\nO limite renova à meia-noite.`,
                vi: `Bạn đã dùng hết ${dailyMax} lượt mời Arena hôm nay.\nGiới hạn sẽ làm mới lúc nửa đêm.`,
                id: `Kamu sudah memakai semua ${dailyMax} undangan Arena hari ini.\nBatasnya diperbarui tengah malam.`,
                tr: `Bugünkü ${dailyMax} Arena davetinin hepsini kullandın.\nLimit gece yarısı yenilenir.`,
                pl: `Wykorzystano dziś wszystkie ${dailyMax} zaproszeń Areny.\nLimit odnowi się o północy.`,
              })}
        </Animated.Text>

        {/* Индикатор dots — последняя занятая дрожит и светится */}
        <View style={styles.dots}>
          {dots.map((used, i) => {
            const isLastUsed = used && i === playsUsed - 1;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: used ? ARENA_LIMIT_ACCENT : t.bgSurface,
                    borderColor: used ? ARENA_LIMIT_ACCENT : t.border,
                  },
                  isLastUsed && {
                    transform: [{ scale: dotPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
                    shadowColor: ARENA_LIMIT_ACCENT,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.9,
                    shadowRadius: 6,
                  },
                ]}
              />
            );
          })}
        </View>

        <Text style={[styles.hintPremium, { color: t.textMuted, fontSize: f.sub }]}>
          {triLang(lang, {
            ru: 'С Plus — безлимитные матчи каждый день',
            uk: 'З Plus — безлімітні матчі щодня',
            es: 'Con Plus tienes duelos ilimitados cada día',
            'pt-BR': 'Com Plus, duelos ilimitados todos os dias',
            vi: 'Với Plus, bạn có lượt đấu không giới hạn mỗi ngày',
            id: 'Dengan Plus, duel tak terbatas setiap hari',
            tr: 'Plus ile her gün sınırsız düello',
            pl: 'Z Plus masz nielimitowane pojedynki każdego dnia',
          })}
        </Text>

        <PremiumGoldButton
          f={f}
          paywallContext="arena"
          onPress={() => {
            navigateAfterModalClose(onClose, () => {
              router.push({ pathname: '/premium_modal', params: { context: 'arena' } } as any);
            });
          }}
        />

        {showShardRefill && (
          <TouchableOpacity
            onPress={() => {
              hapticTap();
              void onRestoreMatchesWithShards();
            }}
            activeOpacity={0.88}
            disabled={shardBusy}
            style={[
              styles.shardBtn,
              { borderColor: '#7C3AED88', backgroundColor: '#7C3AED22' },
            ]}
          >
            {false && shardBusy ? (
              <View />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
                <Text style={{ color: t.textPrimary, fontWeight: '800', fontSize: f.body, flex: 1 }}>
                  {triLang(lang, {
                    ru: `Восстановить ${ARENA_MATCHES_SHARD_REFILL_SLOTS} попыток за ${ARENA_MATCHES_SHARD_REFILL_COST} осколков`,
                    uk: `Відновити ${ARENA_MATCHES_SHARD_REFILL_SLOTS} спроб за ${ARENA_MATCHES_SHARD_REFILL_COST} осколків`,
                    es: `Recuperar ${ARENA_MATCHES_SHARD_REFILL_SLOTS} duelos por ${ARENA_MATCHES_SHARD_REFILL_COST} fragmentos`,
                    'pt-BR': `Restaurar ${ARENA_MATCHES_SHARD_REFILL_SLOTS} tentativas por ${ARENA_MATCHES_SHARD_REFILL_COST} fragmentos`,
                    vi: `Khôi phục ${ARENA_MATCHES_SHARD_REFILL_SLOTS} lượt với ${ARENA_MATCHES_SHARD_REFILL_COST} mảnh`,
                    id: `Pulihkan ${ARENA_MATCHES_SHARD_REFILL_SLOTS} percobaan dengan ${ARENA_MATCHES_SHARD_REFILL_COST} shard`,
                    tr: `${ARENA_MATCHES_SHARD_REFILL_SLOTS} hakkı ${ARENA_MATCHES_SHARD_REFILL_COST} parça ile yenile`,
                    pl: `Odnów ${ARENA_MATCHES_SHARD_REFILL_SLOTS} próby za ${ARENA_MATCHES_SHARD_REFILL_COST} odłamków`,
                  })}
                </Text>
                <Image
                  source={oskolokImageForPackShards(ARENA_MATCHES_SHARD_REFILL_COST)}
                  style={{ width: 26, height: 26 }}
                  contentFit="contain"
                />
              </View>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => {
            hapticTap();
            onClose();
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnSecondaryText, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Закрыть',
              uk: 'Закрити',
              es: 'Entendido',
              'pt-BR': 'Entendi',
              vi: 'Đã hiểu',
              id: 'Mengerti',
              tr: 'Anladım',
              pl: 'Rozumiem',
            })}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

export default memo(ArenaLimitModal);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  sheetOpaqueFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 220,
  },
  drag: {
    width: 40, height: 4, borderRadius: 2, marginBottom: 8,
  },
  iconWrap: {
    position: 'relative',
    marginTop: 4,
    width: 96, height: 96,
    alignItems: 'center', justifyContent: 'center',
  },
  iconHalo: {
    position: 'absolute',
    width: 96, height: 96, borderRadius: 48,
  },
  emoji: { fontSize: 56 },
  badgeRed: {
    position: 'absolute', bottom: -2, right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10, width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontWeight: '800', textAlign: 'center', marginTop: 4 },
  subtitle: { textAlign: 'center', lineHeight: 22, marginBottom: 4 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 1.5,
  },
  hintPremium: { textAlign: 'center', marginTop: 4 },
  shardBtn: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14,
  },
  btnSecondaryText: { fontWeight: '600' },
});
