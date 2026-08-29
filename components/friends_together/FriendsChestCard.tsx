// «Вместе» — карточка общего прогресса на вкладке Друзья.
// зачем: одна полоса с тремя порогами, статус и действие. Никаких цифр
// прогресса на карточке: они живут в модалке результата, не здесь.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { resolveFriendsSharedFlameAsset } from './friends_flame_assets';
import { friendsFlameVisual } from './friends_flame_model';

export interface FriendsChestCardProps {
  model: WeeklyChestModel;
  onClaim: () => void;
  /** Кнопка «Открыть» гаснет мгновенно после тапа — до ответа сервера (optimistic). */
  claimBusy?: boolean;
  testID?: string;
  /** Вкладка Друзья видима (runtimeOwnerId === 'friends') — гейт бесконечного покачивания. */
  ownerVisible?: boolean;
  /** DEV-витрина: явно отличает локальное открытие от реальной полученной награды. */
  devMode?: boolean;
}

/** Статус-пилюля — ОДНО слово/фраза, без цифр (закон макета). */
function statusLabel(model: WeeklyChestModel, devMode: boolean, L: (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) => string): string {
  if (devMode && model.state === 'claimed') return 'Собрано · DEV';
  if (model.state === 'claimed') return L('Искры собраны', 'Іскри зібрано', 'Sparks collected', 'Chispas recogidas', 'Faíscas coletadas', 'Đã thu thập tia lửa', 'Percikan terkumpul', 'Kıvılcımlar toplandı', 'Iskry zebrane');
  if (model.canClaim) return L('Искры готовы', 'Іскри готові', 'Sparks ready', 'Chispas listas', 'Faíscas prontas', 'Tia lửa đã sẵn sàng', 'Percikan siap', 'Kıvılcımlar hazır', 'Iskry gotowe');
  if (model.tier >= 3) return L('Общее пламя', 'Спільне полум’я', 'Shared flame', 'Llama compartida', 'Chama compartilhada', 'Ngọn lửa chung', 'Api bersama', 'Ortak alev', 'Wspólny płomień');
  if (model.tier >= 2) return L('Пламя', 'Полум’я', 'Flame', 'Llama', 'Chama', 'Ngọn lửa', 'Api', 'Alev', 'Płomień');
  return L('Искра', 'Іскра', 'Spark', 'Chispa', 'Faísca', 'Tia lửa', 'Percikan', 'Kıvılcım', 'Iskra');
}

function TierTick({ leftPercent }: { leftPercent: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.tick, { left: `${leftPercent}%` as unknown as number }]}
    />
  );
}

function FriendsChestCard({ model, onClaim, claimBusy = false, ownerVisible = true, devMode = false, testID = 'friends-chest-card' }: FriendsChestCardProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  // зачем: бесконечное дыхание принадлежит вкладке Друзья и не живёт в фоне.
  const runtimeActive = useRuntimeActive(ownerVisible);
  const visual = friendsFlameVisual(model);
  const flameAsset = resolveFriendsSharedFlameAsset(themeMode, visual.stage);
  const flameAssetKey = `friends-shared-flame-${themeMode}-${visual.stage}`;
  const [failedFlameAssetKey, setFailedFlameAssetKey] = useState<string | null>(null);
  const flameImageFailed = failedFlameAssetKey === flameAssetKey;
  const L = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang as any, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });

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
  const shouldBreathe = visual.animated && !reduceMotion && runtimeActive;

  useEffect(() => {
    setFailedFlameAssetKey(null);
  }, [flameAssetKey]);

  useEffect(() => {
    if (!shouldBreathe) {
      cancelAnimation(rock);
      rock.value = 0;
      return;
    }
    rock.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(rock);
  }, [rock, shouldBreathe]);
  const flameStyle = useAnimatedStyle(() => ({
    opacity: 0.96 + rock.value * 0.04,
    transform: [{ scale: visual.scale * (1 + rock.value * 0.035) }],
  }), [visual.scale]);

  const claimLabel = L('Собрать искры', 'Зібрати іскри', 'Collect sparks', 'Recoger chispas', 'Coletar faíscas', 'Thu thập tia lửa', 'Kumpulkan percikan', 'Kıvılcımları topla', 'Zbierz iskry');

  return (
    <TonalSurface testID={testID} tone="card" radius={18} style={styles.card}>
      <View style={styles.row}>
        <View
          style={styles.flameSlot}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Reanimated.View style={flameStyle}>
            {flameImageFailed ? (
              <Ionicons name="flame" size={60} color={barColor} />
            ) : (
              <ExpoImage
                source={flameAsset}
                style={styles.flameImage}
                contentFit="contain"
                transition={160}
                recyclingKey={flameAssetKey}
                onError={() => setFailedFlameAssetKey(flameAssetKey)}
              />
            )}
          </Reanimated.View>
        </View>
        <View style={styles.grow}>
          <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700' }}>
            {L('Общее пламя', 'Спільне полум’я', 'Shared flame', 'Llama compartida', 'Chama compartilhada', 'Ngọn lửa chung', 'Api bersama', 'Ortak alev', 'Wspólny płomień')}
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
                {statusLabel(model, devMode, L)}
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
          <Text style={{ color: t.correctText ?? '#0B0B0E', fontSize: f.body, fontWeight: '700' }}>{claimLabel}</Text>
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
  // Фиксированный слот не даёт росту пламени сдвигать полосу или CTA.
  flameSlot: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameImage: {
    width: 92,
    height: 92,
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
