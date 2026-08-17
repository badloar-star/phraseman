// «Вместе» — карточка «Сундук недели» на вкладке Друзья.
// зачем: макет 4.1/4.5 (docs/prototypes/2026-08-16-vmeste-friends-concept.html) —
// крупно и без подписей: сундук + одна полоса с тремя порогами + одна пилюля-
// статус + кнопка «Открыть», когда canClaim. Никаких цифр прогресса на карточке
// (прогресс живёт в модалке результата, не здесь) — ровно то, что в макете.
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import DuoPressable from '../DuoPressable';
import TonalSurface from '../TonalSurface';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { WeeklyChestModel } from '../../app/friends_together/weekly_chest_model';

const CHEST_GOLD_TOP = '#E8C878';
const CHEST_GOLD_BOTTOM = '#8B6320';

/** Иконка сундука — тот же силуэт, что в макете (chestSvg), без внешних ассетов. */
function ChestGlyph({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (56 / 64)} viewBox="0 0 64 56">
      <Defs>
        <SvgLinearGradient id="ftChestGrad" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={CHEST_GOLD_TOP} />
          <Stop offset="1" stopColor={CHEST_GOLD_BOTTOM} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={6} y={20} width={52} height={30} rx={6} fill="url(#ftChestGrad)" />
      <Path d="M6 26a26 14 0 0 1 52 0v2H6z" fill={CHEST_GOLD_TOP} />
      <Rect x={6} y={26} width={52} height={4} fill="#6a4a14" opacity={0.35} />
      <Rect x={27} y={24} width={10} height={12} rx={2} fill="#4a3210" />
      <Circle cx={32} cy={31} r={2} fill="#F5E6B8" />
    </Svg>
  );
}

export interface FriendsChestCardProps {
  model: WeeklyChestModel;
  onClaim: () => void;
  /** Кнопка «Открыть» гаснет мгновенно после тапа — до ответа сервера (optimistic). */
  claimBusy?: boolean;
  testID?: string;
  /** Вкладка Друзья видима (runtimeOwnerId === 'friends') — гейт бесконечного покачивания. */
  ownerVisible?: boolean;
}

/** Статус-пилюля — ОДНО слово/фраза, без цифр (закон макета). */
function statusLabel(model: WeeklyChestModel, L: (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) => string): string {
  if (model.state === 'claimed') return L('забрано', 'забрано', 'забрано'.length ? 'reclamado' : 'reclamado', 'resgatado', 'đã nhận', 'diklaim', 'alındı', 'odebrano');
  if (model.canClaim) return L('готов', 'готовий', 'listo', 'pronto', 'sẵn sàng', 'siap', 'hazır', 'gotowe');
  if (model.tier >= 3) return L('порог III', 'поріг III', 'nivel III', 'nível III', 'mốc III', 'ambang III', 'eşik III', 'próg III');
  if (model.tier >= 2) return L('порог II', 'поріг II', 'nivel II', 'nível II', 'mốc II', 'ambang II', 'eşik II', 'próg II');
  if (model.tier >= 1) return L('порог I', 'поріг I', 'nivel I', 'nível I', 'mốc I', 'ambang I', 'eşik I', 'próg I');
  return L('до порога I', 'до порогу I', 'hasta nivel I', 'até nível I', 'đến mốc I', 'menuju ambang I', 'eşik I\'e kadar', 'do progu I');
}

function TierTick({ leftPercent }: { leftPercent: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.tick, { left: `${leftPercent}%` as unknown as number }]}
    />
  );
}

function FriendsChestCard({ model, onClaim, claimBusy = false, ownerVisible = true, testID = 'friends-chest-card' }: FriendsChestCardProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  // зачем: бесконечное покачивание сундука обязано иметь владельца (runtime_lifecycle_ratchet /
  // perf_freeze_contract) — крутится только пока вкладка Друзья в фокусе и приложение активно.
  const runtimeActive = useRuntimeActive(ownerVisible);
  const L = (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as any, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const isGold = model.tier >= 2;
  const barColor = isGold ? t.gold : t.accent;
  // Полный прогресс до последнего порога (для полосы), не до следующего —
  // владелец: «одна полоса с тремя порогами», а не полоса на каждый сегмент.
  const lastTierGoal = model.nextTierGoal ?? (model.progress || 1);
  const totalGoal = model.state === 'ready' || model.state === 'claimed'
    ? Math.max(model.progress, lastTierGoal)
    : lastTierGoal;
  const fillPercent = Math.max(0, Math.min(100, Math.round((model.progress / Math.max(1, totalGoal)) * 100)));

  const rock = useSharedValue(0);
  useEffect(() => {
    if (!model.canClaim || reduceMotion || !runtimeActive) {
      cancelAnimation(rock);
      rock.value = 0;
      return;
    }
    rock.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(rock);
  }, [model.canClaim, reduceMotion, runtimeActive, rock]);
  const rockStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rock.value}deg` }] }));

  const openLabel = L('Открыть', 'Відкрити', 'Abrir', 'Abrir', 'Mở', 'Buka', 'Aç', 'Otwórz');

  return (
    <TonalSurface testID={testID} tone="card" radius={18} style={styles.card}>
      <View style={styles.row}>
        <Reanimated.View style={rockStyle}>
          <ChestGlyph size={56} />
        </Reanimated.View>
        <View style={styles.grow}>
          <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }}>
            {L('Сундук недели', 'Скриня тижня', 'Cofre semanal', 'Baú semanal', 'Rương tuần', 'Peti mingguan', 'Haftalık sandık', 'Skrzynia tygodnia')}
          </Text>
          <View style={styles.progWrap}>
            <View style={[styles.progTrack, { backgroundColor: t.bgSurface2 }]}>
              <View style={[styles.progFill, { width: `${fillPercent}%`, backgroundColor: barColor }]} />
              <TierTick leftPercent={30} />
              <TierTick leftPercent={60} />
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.pill, { backgroundColor: model.tier > 0 ? (isGold ? t.goldBg : t.accentBg) : t.bgSurface2 }]}>
              <Text style={{ color: model.tier > 0 ? barColor : t.textMuted, fontSize: f.sub, fontWeight: '700' }}>
                {statusLabel(model, L)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      {model.canClaim && (
        <DuoPressable
          testID="friends-chest-claim"
          onPress={onClaim}
          disabled={claimBusy}
          edgeColor={t.accent}
          style={[styles.claimBtn, { backgroundColor: t.accent, opacity: claimBusy ? 0.6 : 1 }]}
          wrapStyle={styles.claimWrap}
        >
          <Text style={{ color: t.correctText ?? '#0B0B0E', fontSize: f.body, fontWeight: '700' }}>{openLabel}</Text>
        </DuoPressable>
      )}
    </TonalSurface>
  );
}

export default memo(FriendsChestCard);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  grow: { flex: 1, minWidth: 0 },
  progWrap: { marginTop: 10 },
  progTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  progFill: {
    height: '100%',
    borderRadius: 6,
  },
  tick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  pill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimWrap: { marginTop: 14 },
  claimBtn: {
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
