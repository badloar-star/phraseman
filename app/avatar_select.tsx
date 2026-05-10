import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  CUSTOM_AVATAR_BUY_COST,
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_OWNED_KEY,
  CUSTOM_AVATAR_RESTYLE_COST,
  CUSTOM_AVATARS,
  CustomAvatarLogoColor,
  CustomAvatarDef,
  makeCustomAvatarValue,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';
import CustomAvatarBadge from '../components/CustomAvatarBadge';
import AvatarView from '../components/AvatarView';
import { getBestAvatarForLevel, getBestFrameForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { getShardsBalance, spendShards } from './shards_system';
import { emitAppEvent } from './events';
import { syncToCloud } from './cloud_sync';
import { pushMyScoreImmediate } from './firestore_leaderboard';

type OwnedAvatars = Record<string, string>;

const SHARD_ICON = require('../assets/images/levels/OSKOLOK.webp');
const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_PAD = 16;
const GRID_COLS = 4;
const CELL_W = Math.floor((SCREEN_W - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

const encodeOwnedStyle = (gradientId: string, logoColor: CustomAvatarLogoColor) => `${gradientId}:${logoColor}`;
const decodeOwnedStyle = (value?: string | null): { gradientId: string; logoColor: CustomAvatarLogoColor } => {
  if (!value) return { gradientId: CUSTOM_AVATAR_GRADIENTS[0].id, logoColor: 'black' };
  const parts = String(value).split(':');
  return {
    gradientId: parts[0] || CUSTOM_AVATAR_GRADIENTS[0].id,
    logoColor: parts[1] === 'white' ? 'white' : 'black',
  };
};

function ShardCost({ amount, color }: { amount: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '900' }}>{amount}</Text>
      <Image source={SHARD_ICON} style={{ width: 14, height: 14 }} resizeMode="contain" />
    </View>
  );
}

const readOwnedAvatars = async (): Promise<OwnedAvatars> => {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeProfileAvatarSnapshot = async (avatar: string, level: number) => {
  try {
    const [[, nameRaw], [, xpRaw], [, langRaw], [, weekRaw], [, streakRaw], [, leagueRaw], [, frameRaw], [, premiumRaw]] =
      await AsyncStorage.multiGet([
        'user_name',
        'user_total_xp',
        'app_lang',
        'week_points_v2',
        'streak_count',
        'league_state_v3',
        'user_frame',
        'premium_plan',
      ]);
    const totalXp = parseInt(xpRaw || '0', 10) || 0;
    let weekPoints = 0;
    try { if (weekRaw) weekPoints = (JSON.parse(weekRaw) as any).points ?? 0; } catch {}
    let leagueId: number | undefined;
    try { if (leagueRaw) leagueId = JSON.parse(leagueRaw).leagueId; } catch {}
    const name = (nameRaw || '').trim() || `Level ${level}`;
    const streak = parseInt(streakRaw || '0', 10) || undefined;
    await pushMyScoreImmediate(
      name,
      totalXp,
      weekPoints,
      langRaw || 'ru',
      avatar,
      streak,
      leagueId,
      frameRaw || undefined,
      !!premiumRaw,
    );
  } catch {}
};

export default function AvatarSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState(1);
  const [shards, setShards] = useState(0);
  const [activeAvatar, setActiveAvatar] = useState<string>('1');
  const [owned, setOwned] = useState<OwnedAvatars>({});
  const [draftAvatar, setDraftAvatar] = useState<CustomAvatarDef | null>(null);
  const [draftGradientId, setDraftGradientId] = useState(CUSTOM_AVATAR_GRADIENTS[0].id);
  const [draftLogoColor, setDraftLogoColor] = useState<CustomAvatarLogoColor>('black');
  const [busy, setBusy] = useState(false);

  const activeCustom = useMemo(() => parseCustomAvatarValue(activeAvatar), [activeAvatar]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [[, xpRaw], [, avatarRaw]] = await AsyncStorage.multiGet(['user_total_xp', 'user_avatar']);
      const xp = parseInt(xpRaw || '0', 10) || 0;
      const lvl = getLevelFromXP(xp);
      const nextOwned = await readOwnedAvatars();
      setLevel(lvl);
      setOwned(nextOwned);
      setActiveAvatar(avatarRaw || getBestAvatarForLevel(lvl));
      setShards(await getShardsBalance());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getShardsBalance()
        .then((balance) => {
          if (!cancelled) setShards(balance);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const showToast = (type: 'info' | 'success' | 'error', messageRu: string) => {
    emitAppEvent('action_toast', {
      type,
      messageRu,
      messageUk: messageRu,
      messageEs: messageRu,
    });
  };

  const openAvatar = (avatar: CustomAvatarDef) => {
    hapticTap();
    const ownedStyle = decodeOwnedStyle(owned[avatar.id]);
    const currentGradient = activeCustom?.avatarId === avatar.id ? activeCustom.gradientId : ownedStyle.gradientId;
    const currentLogoColor = activeCustom?.avatarId === avatar.id ? activeCustom.logoColor : ownedStyle.logoColor;
    setDraftAvatar(avatar);
    setDraftGradientId(currentGradient);
    setDraftLogoColor(currentLogoColor);
  };

  const persistAvatar = async (nextAvatar: string, nextOwned: OwnedAvatars) => {
    const frameId = getBestFrameForLevel(level).id;
    await AsyncStorage.multiSet([
      ['user_avatar', nextAvatar],
      ['user_frame', frameId],
      [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify(nextOwned)],
    ]);
    await AsyncStorage.multiRemove(['global_lb_cache_v4', 'leaderboard_cache_v1']);
    setActiveAvatar(nextAvatar);
    setOwned(nextOwned);
    emitAppEvent('xp_changed');
    void syncToCloud({ forceNow: true });
    void writeProfileAvatarSnapshot(nextAvatar, level);
  };

  const applyDraft = async () => {
    if (!draftAvatar || busy) return;
    const avatarId = draftAvatar.id;
    const wasOwned = !!owned[avatarId];
    const previousStyle = decodeOwnedStyle(owned[avatarId]);
    const styleChanged = wasOwned && (
      previousStyle.gradientId !== draftGradientId ||
      previousStyle.logoColor !== draftLogoColor
    );
    const cost = wasOwned ? (styleChanged ? CUSTOM_AVATAR_RESTYLE_COST : 0) : CUSTOM_AVATAR_BUY_COST;

    setBusy(true);
    try {
      const currentShards = await getShardsBalance();
      setShards(currentShards);
      if (cost > 0 && currentShards < cost) {
        setDraftAvatar(null);
        router.push({
          pathname: '/shards_shop',
          params: {
            need: String(Math.max(0, cost - currentShards)),
            source: wasOwned ? 'custom_avatar_restyle' : 'custom_avatar',
          },
        } as any);
        return;
      }

      if (cost > 0) {
        const ok = await spendShards(cost, wasOwned ? 'custom_avatar_restyle' : 'custom_avatar', { skipServerAwait: true });
        if (!ok) {
          showToast('error', 'Не удалось списать осколки');
          return;
        }
      }
      const nextOwned = { ...owned, [avatarId]: encodeOwnedStyle(draftGradientId, draftLogoColor) };
      const nextAvatar = makeCustomAvatarValue(avatarId, draftGradientId, draftLogoColor);
      await persistAvatar(nextAvatar, nextOwned);
      setShards(await getShardsBalance());
      setDraftAvatar(null);
      showToast('success', wasOwned ? 'Аватар применен' : 'Аватар куплен');
    } finally {
      setBusy(false);
    }
  };

  const resetToLevelAvatar = async () => {
    if (busy) return;
    hapticTap();
    setBusy(true);
    try {
      const nextAvatar = getBestAvatarForLevel(level);
      await persistAvatar(nextAvatar, owned);
      showToast('success', 'Вернули обычный аватар уровня');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ScreenGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
          onPress={() => { hapticTap(); router.back(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', flex: 1 }}>Аватар</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: '#A78BFA', fontSize: 16, fontWeight: '900' }}>{shards}</Text>
          <Image source={SHARD_ICON} style={{ width: 20, height: 20 }} resizeMode="contain" />
        </View>
      </View>

      <View style={{ alignItems: 'center', paddingVertical: 14 }}>
        <AvatarView avatar={activeAvatar} level={level} size={82} />
        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8 }}>Текущий аватар</Text>
      </View>

      {activeCustom && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={resetToLevelAvatar}
            style={{ borderRadius: 16, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>Использовать аватар по уровню</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GRID_PAD, paddingBottom: insets.bottom + 18 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, justifyContent: 'center' }}>
          {CUSTOM_AVATARS.map((avatar) => {
            const isOwned = !!owned[avatar.id];
            const ownedStyle = decodeOwnedStyle(owned[avatar.id]);
            const gradientId = ownedStyle.gradientId;
            const logoColor = ownedStyle.logoColor;
            const isActive = activeCustom?.avatarId === avatar.id;
            return (
              <TouchableOpacity
                key={avatar.id}
                activeOpacity={0.78}
                onPress={() => openAvatar(avatar)}
                style={{
                  width: CELL_W,
                  minHeight: Math.round(CELL_W * 1.34),
                  borderRadius: 16,
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? t.accent : t.border,
                  backgroundColor: t.bgCard,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                }}
              >
                <CustomAvatarBadge avatarId={avatar.id} gradientId={gradientId} logoColor={logoColor} size={Math.min(64, Math.round(CELL_W * 0.76))} />
                <View style={{ marginTop: 7, minHeight: 16, alignItems: 'center', justifyContent: 'center' }}>
                  {isOwned
                    ? <Text style={{ color: t.textPrimary, fontSize: 10, fontWeight: '900' }}>Куплен</Text>
                    : <ShardCost amount={CUSTOM_AVATAR_BUY_COST} color={t.textMuted} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!draftAvatar} transparent animationType="fade" onRequestClose={() => setDraftAvatar(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' }} onPress={() => setDraftAvatar(null)}>
          <Pressable
            style={{
              backgroundColor: t.bgCard,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              padding: 18,
              paddingBottom: insets.bottom + 18,
              borderTopWidth: 1,
              borderColor: t.border,
            }}
          >
            {draftAvatar && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 18 }}>
                  <CustomAvatarBadge avatarId={draftAvatar.id} gradientId={draftGradientId} logoColor={draftLogoColor} size={112} />
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', marginTop: 10 }}>Настройка</Text>
                  {(() => {
                    const previousStyle = decodeOwnedStyle(owned[draftAvatar.id]);
                    const isOwned = !!owned[draftAvatar.id];
                    const styleChanged = isOwned && (
                      previousStyle.gradientId !== draftGradientId ||
                      previousStyle.logoColor !== draftLogoColor
                    );
                    const visibleCost = !isOwned
                      ? CUSTOM_AVATAR_BUY_COST
                      : (styleChanged ? CUSTOM_AVATAR_RESTYLE_COST : 0);
                    if (visibleCost <= 0) return null;
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>{visibleCost}</Text>
                        <Image source={SHARD_ICON} style={{ width: 18, height: 18 }} resizeMode="contain" />
                      </View>
                    );
                  })()}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                  {CUSTOM_AVATAR_GRADIENTS.map((gradient) => {
                    const selected = gradient.id === draftGradientId;
                    return (
                      <TouchableOpacity
                        key={gradient.id}
                        activeOpacity={0.78}
                        onPress={() => { hapticTap(); setDraftGradientId(gradient.id); }}
                        style={{
                          width: 72,
                          alignItems: 'center',
                          borderRadius: 14,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? t.accent : t.border,
                          padding: 7,
                        }}
                      >
                        <CustomAvatarBadge avatarId={draftAvatar.id} gradientId={gradient.id} logoColor={draftLogoColor} size={52} />
                        <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: '800', marginTop: 5 }} numberOfLines={1}>
                          {gradient.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>


                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  {(['black', 'white'] as CustomAvatarLogoColor[]).map((color) => {
                    const selected = draftLogoColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        activeOpacity={0.8}
                        onPress={() => { hapticTap(); setDraftLogoColor(color); }}
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? t.accent : t.border,
                          backgroundColor: color === 'black' ? '#111827' : '#F8FAFC',
                          paddingVertical: 11,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: color === 'black' ? '#FFFFFF' : '#111827', fontSize: f.body, fontWeight: '900' }}>
                          {color === 'black' ? 'Черное лого' : 'Белое лого'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={busy}
                  onPress={applyDraft}
                  style={{
                    marginTop: 18,
                    borderRadius: 16,
                    backgroundColor: busy ? t.textGhost : t.accent,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.textOnGold ?? '#111827', fontSize: f.bodyLg, fontWeight: '900' }}>
                    {busy ? '...' : 'Применить'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenGradient>
  );
}
