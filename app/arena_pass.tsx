// ARENA SEASON REWARDS — экран сезонных наград Арены.
//
// Лестница из двух треков: БЕСПЛАТНЫЙ (всем) и ПРЕМИУМ (с подпиской).
// За матчи копятся BP-очки → новые уровни → награды. Премиум-награды залочены без подписки
// и ведут на пейвол. Это главный долгосрочный повод оформить премиум ради Арены.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Reanimated, {
  Easing, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useFeatureAccess } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import {
  buildBattlePassLadder,
  computeBattlePassProgress,
  computeClaimables,
  type BattlePassReward,
  type ClaimableState,
} from './arena_battle_pass';
import {
  getBattlePassPoints,
  getClaimedFreeLevels,
  getClaimedPremiumLevels,
  markFreeClaimed,
  markPremiumClaimed,
  grantArenaAura,
  currentSeasonId,
} from './arena_battle_pass_store';
import { seasonNumberFromId } from './arena_season_math';
import { addShardsRaw } from './shards_system';
import { registerXP } from './xp_manager';
import { getAvatarAuraById } from '../constants/avatar_auras';
import AsyncStorage from '@react-native-async-storage/async-storage';

function auraNameForLang(auraId: string, lang: Lang): string {
  const aura = getAvatarAuraById(auraId);
  if (!aura) return 'Aura';
  switch (lang) {
    case 'uk': return aura.nameUk;
    case 'es': return aura.nameEs;
    case 'pt-BR': return aura.namePtBr;
    case 'vi': return aura.nameVi;
    case 'id': return aura.nameId;
    case 'tr': return aura.nameTr;
    case 'pl': return aura.namePl;
    default: return aura.nameRu;
  }
}

function rewardLabel(r: BattlePassReward, lang: Lang): string {
  switch (r.kind) {
    case 'shards':
      return triLang(lang, {
        ru: `+${r.amount} осколков`, uk: `+${r.amount} осколків`, es: `+${r.amount} fragmentos`,
        'pt-BR': `+${r.amount} fragmentos`, vi: `+${r.amount} mảnh`, id: `+${r.amount} pecahan`,
        tr: `+${r.amount} parça`, pl: `+${r.amount} odłamków`,
      });
    case 'xp':
      return `+${r.amount} XP`;
    case 'aura': {
      const name = r.auraId ? auraNameForLang(r.auraId, lang) : 'Aura';
      const prefix = triLang(lang, {
        ru: 'Аура', uk: 'Аура', es: 'Aura', 'pt-BR': 'Aura', vi: 'Hào quang', id: 'Aura', tr: 'Aura', pl: 'Aura',
      });
      return `${prefix}: ${name}`;
    }
    default:
      return '';
  }
}

function rewardIcon(r: BattlePassReward): keyof typeof Ionicons.glyphMap {
  switch (r.kind) {
    case 'shards': return 'diamond';
    case 'xp': return 'flash';
    case 'aura': return 'sparkles';
    default: return 'gift';
  }
}

export default function ArenaBattlePassScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const hasPremium = useFeatureAccess('arena');
  const seasonId = currentSeasonId();

  const ladder = useMemo(() => buildBattlePassLadder(), []);
  const [points, setPoints] = useState(0);
  const [claimedFree, setClaimedFree] = useState<Set<number>>(new Set());
  const [claimedPremium, setClaimedPremium] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [p, cf, cp] = await Promise.all([
      getBattlePassPoints(seasonId),
      getClaimedFreeLevels(seasonId),
      getClaimedPremiumLevels(seasonId),
    ]);
    setPoints(p);
    setClaimedFree(cf);
    setClaimedPremium(cp);
    setLoaded(true);
  }, [seasonId]);

  useEffect(() => { void reload(); }, [reload]);

  const progress = computeBattlePassProgress(points);
  const states = useMemo(
    () => computeClaimables(ladder, points, claimedFree, claimedPremium, hasPremium),
    [ladder, points, claimedFree, claimedPremium, hasPremium],
  );

  const headerFill = useSharedValue(0);
  useEffect(() => {
    headerFill.value = withTiming(progress.ratio, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [headerFill, progress.ratio]);
  const headerFillStyle = useAnimatedStyle(() => ({ width: `${headerFill.value * 100}%` }));

  const grantReward = useCallback(async (r: BattlePassReward, track: 'free' | 'premium', level: number) => {
    if (r.kind === 'shards') {
      await addShardsRaw(r.amount, 'arena_battle_pass', { skipServerAwait: true, showEarnModal: true, earnModalKey: 'arena_battle_pass' });
    } else if (r.kind === 'aura' && r.auraId) {
      // Реальная выдача ауры: владение + надеть + синк (видна в лидерборде/профиле).
      await grantArenaAura(r.auraId, true);
    } else if (r.kind === 'xp') {
      // Настоящее начисление XP через registerXP с детерминированным eventId (без дублей).
      const eventId = `arena_pass:${seasonId}:${track}:lvl${level}:xp`;
      try {
        const name = (await AsyncStorage.getItem('user_name'))?.trim() || 'Player';
        await registerXP(r.amount, 'achievement_reward', name, lang, undefined, { eventId, payload: { surface: 'arena_battle_pass', level } });
      } catch { /* XP не критичен — награда всё равно помечается забранной */ }
    }
  }, [seasonId, lang]);

  const claimFree = useCallback(async (level: number) => {
    const tier = ladder.find((x) => x.level === level);
    if (!tier) return;
    await hapticSuccess();
    await grantReward(tier.free, 'free', level);
    const next = await markFreeClaimed(level, seasonId);
    setClaimedFree(new Set(next));
  }, [ladder, grantReward, seasonId]);

  const claimPremium = useCallback(async (level: number) => {
    const tier = ladder.find((x) => x.level === level);
    if (!tier?.premium) return;
    await hapticSuccess();
    await grantReward(tier.premium, 'premium', level);
    const next = await markPremiumClaimed(level, seasonId);
    setClaimedPremium(new Set(next));
  }, [ladder, grantReward, seasonId]);

  const openPaywall = useCallback(() => {
    hapticTap();
    router.push({ pathname: '/premium_modal', params: { context: 'arena' } } as any);
  }, [router]);

  const seasonNo = seasonNumberFromId(seasonId);

  return (
    <ScreenGradient>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => { hapticTap(); safeRouterBack(router, '/(tabs)/arena'); }} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {triLang(lang, {
            ru: 'Награды сезона', uk: 'Нагороди сезону', es: 'Recompensas de temporada',
            'pt-BR': 'Recompensas da temporada', vi: 'Phần thưởng mùa giải', id: 'Hadiah musim',
            tr: 'Sezon ödülleri', pl: 'Nagrody sezonu',
          })}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Шапка прогресса */}
      <View style={[styles.progressCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
        <View style={styles.progressTop}>
          <Text style={[styles.seasonText, { color: t.textMuted, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: `Сезон ${seasonNo}`, uk: `Сезон ${seasonNo}`, es: `Temporada ${seasonNo}`,
              'pt-BR': `Temporada ${seasonNo}`, vi: `Mùa ${seasonNo}`, id: `Musim ${seasonNo}`,
              tr: `Sezon ${seasonNo}`, pl: `Sezon ${seasonNo}`,
            })}
          </Text>
          <Text style={[styles.levelText, { color: t.accent, fontSize: f.body }]}>
            {triLang(lang, {
              ru: `Уровень ${progress.level}`, uk: `Рівень ${progress.level}`, es: `Nivel ${progress.level}`,
              'pt-BR': `Nível ${progress.level}`, vi: `Cấp ${progress.level}`, id: `Level ${progress.level}`,
              tr: `Seviye ${progress.level}`, pl: `Poziom ${progress.level}`,
            })}
          </Text>
        </View>
        <View style={[styles.headerTrack, { backgroundColor: t.bgSurface2 }]}>
          <Reanimated.View style={[styles.headerFill, { backgroundColor: t.accent }, headerFillStyle]} />
        </View>
        {!progress.maxed ? (
          <Text style={[styles.toNextText, { color: t.textMuted, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: `${progress.bpToNext} очков до уровня ${progress.level + 1}`,
              uk: `${progress.bpToNext} очок до рівня ${progress.level + 1}`,
              es: `${progress.bpToNext} puntos para nivel ${progress.level + 1}`,
              'pt-BR': `${progress.bpToNext} pontos para nível ${progress.level + 1}`,
              vi: `${progress.bpToNext} điểm tới cấp ${progress.level + 1}`,
              id: `${progress.bpToNext} poin ke level ${progress.level + 1}`,
              tr: `${progress.level + 1}. seviyeye ${progress.bpToNext} puan`,
              pl: `${progress.bpToNext} pkt do poziomu ${progress.level + 1}`,
            })}
          </Text>
        ) : null}
      </View>

      {!hasPremium ? (
        <TouchableOpacity onPress={openPaywall} activeOpacity={0.85} style={[styles.premiumCta, { backgroundColor: t.gold + '22', borderColor: t.gold }]}>
          <Ionicons name="star" size={16} color={t.gold} />
          <Text style={[styles.premiumCtaText, { color: t.gold, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Открой плюс-награды', uk: 'Відкрий плюс-нагороди', es: 'Desbloquea recompensas Plus',
              'pt-BR': 'Desbloqueie recompensas Plus', vi: 'Mở khóa thưởng Plus', id: 'Buka hadiah Plus',
              tr: 'Plus ödülleri aç', pl: 'Odblokuj nagrody Plus',
            })}
          </Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loaded ? states.map((s) => {
          const tier = ladder[s.level - 1];
          return (
            <TierRow
              key={s.level}
              level={s.level}
              state={s}
              freeReward={tier.free}
              premiumReward={tier.premium}
              lang={lang}
              t={t}
              f={f}
              onClaimFree={() => claimFree(s.level)}
              onClaimPremium={() => claimPremium(s.level)}
              onLockedPremium={openPaywall}
            />
          );
        }) : null}
        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenGradient>
  );
}

interface TierRowProps {
  level: number;
  state: ClaimableState;
  freeReward: BattlePassReward;
  premiumReward?: BattlePassReward;
  lang: Lang;
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
  onClaimFree: () => void;
  onClaimPremium: () => void;
  onLockedPremium: () => void;
}

function TierRow({ level, state, freeReward, premiumReward, lang, t, f, onClaimFree, onClaimPremium, onLockedPremium }: TierRowProps) {
  const dim = !state.free.unlocked;
  return (
    <View style={[styles.tierRow, { borderColor: t.border, backgroundColor: t.bgCard, opacity: dim ? 0.55 : 1 }]}>
      <View style={[styles.levelBadge, { backgroundColor: state.free.unlocked ? t.accent : t.bgSurface2 }]}>
        <Text style={[styles.levelBadgeText, { color: state.free.unlocked ? '#06210F' : t.textMuted }]}>{level}</Text>
      </View>

      {/* Бесплатная награда */}
      <RewardCell
        reward={freeReward}
        claimable={state.free.claimable}
        claimed={state.free.claimed}
        locked={false}
        onPress={onClaimFree}
        onLockedPress={() => {}}
        lang={lang} t={t} f={f}
      />

      {/* Премиум-награда */}
      {premiumReward ? (
        <RewardCell
          reward={premiumReward}
          claimable={!!state.premium?.claimable}
          claimed={!!state.premium?.claimed}
          locked={!!state.premium?.locked}
          onPress={onClaimPremium}
          onLockedPress={onLockedPremium}
          isPremium
          lang={lang} t={t} f={f}
        />
      ) : <View style={styles.rewardCell} />}
    </View>
  );
}

interface RewardCellProps {
  reward: BattlePassReward;
  claimable: boolean;
  claimed: boolean;
  locked: boolean;
  isPremium?: boolean;
  onPress: () => void;
  onLockedPress: () => void;
  lang: Lang;
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
}

function RewardCell({ reward, claimable, claimed, locked, isPremium, onPress, onLockedPress, lang, t, f }: RewardCellProps) {
  const accent = isPremium ? t.gold : t.accent;
  const handle = locked ? onLockedPress : claimable ? onPress : undefined;
  return (
    <TouchableOpacity
      activeOpacity={handle ? 0.8 : 1}
      onPress={handle}
      disabled={!handle}
      style={[
        styles.rewardCell,
        {
          borderColor: claimed ? t.border : accent + '66',
          backgroundColor: claimed ? t.bgSurface2 : accent + '14',
        },
      ]}
    >
      <Ionicons name={locked ? 'lock-closed' : rewardIcon(reward)} size={16} color={claimed ? t.textMuted : accent} />
      <Text style={[styles.rewardText, { color: claimed ? t.textMuted : t.textPrimary, fontSize: f.caption }]} numberOfLines={2}>
        {rewardLabel(reward, lang)}
      </Text>
      {claimed ? (
        <Text style={[styles.claimedTag, { color: t.textMuted, fontSize: 10 }]}>
          {triLang(lang, { ru: 'взято', uk: 'взято', es: 'hecho', 'pt-BR': 'feito', vi: 'xong', id: 'diambil', tr: 'alındı', pl: 'odebrane' })}
        </Text>
      ) : claimable ? (
        <View style={[styles.claimDot, { backgroundColor: accent }]} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '800' },
  progressCard: { marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seasonText: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  levelText: { fontWeight: '800' },
  headerTrack: { height: 9, borderRadius: 999, overflow: 'hidden' },
  headerFill: { height: '100%', borderRadius: 999 },
  toNextText: { fontWeight: '600' },
  premiumCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  premiumCtaText: { fontWeight: '800' },
  scroll: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 14, borderWidth: 1 },
  levelBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  levelBadgeText: { fontWeight: '900', fontSize: 13 },
  rewardCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, borderWidth: 1, minHeight: 40 },
  rewardText: { fontWeight: '700', flexShrink: 1 },
  claimedTag: { fontWeight: '700', textTransform: 'uppercase' },
  claimDot: { width: 8, height: 8, borderRadius: 4 },
});
