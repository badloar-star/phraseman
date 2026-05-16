/**
 * Progress Map — визуальная карта прогресса.
 * Вертикальный скролл: уровни 1-50, milestone\'ы на 10/20/30/40/50.
 * Подарки уровня: принятые, непринятые (можно открыть здесь), будущие.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  InteractionManager,
  ListRenderItem,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import LevelBadge from '../components/LevelBadge';
import LevelGiftDualModal, { loadUnclaimedDualGifts, loadDualClaimedLevels, type PremPair } from '../components/LevelGiftDualModal';
import LevelGiftModal, { loadUnclaimedGifts, loadClaimedGiftRarities } from '../components/LevelGiftModal';
import { ARENA_DAILY_MAX, getDailyArenaMaxToday } from './arena_daily_limit';
import { getPackGiftTrial, getPackTrialHoursLeft } from './flashcards/pack_trial_gift';
import {
  GiftDef,
  getBonusHintsToday,
  getMilestoneLevelGift,
  giftTitleForLang,
  readGiftXpBank,
} from './level_gift_system';
import { triLang } from '../constants/i18n';
import { getXPProgress, getMaxEnergyForLevel } from '../constants/theme';
import { TITLES } from '../constants/titles';

const CHEST_IMAGES: Record<string, any> = {
  common: require('../assets/images/levels/GIF_COMMON.webp'),
  rare:   require('../assets/images/levels/GIFT_RARE.webp'),
  epic:   require('../assets/images/levels/GIFT_EPIC.webp'),
};
const PREMIUM_CHEST_SM = require('../assets/images/levels/GIFT_PREMIUM.webp');

interface MilestoneInfo {
  level: number;
  emojiRu: string;
  emojiUk: string;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  /** Текст для ещё не достигнутого milestone */
  descRu: string;
  descUk: string;
  descEs: string;
  /** Текст после достижения (опционально) */
  doneDescRu?: string;
  doneDescUk?: string;
  doneDescEs?: string;
}

interface ActiveGiftInfo {
  key: string;
  icon: string;
  title: string;
  desc: string;
}

const formatMsLeft = (ms: number, lang: 'ru' | 'uk' | 'es'): string => {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / 3600000);
  const m = Math.floor((safe % 3600000) / 60000);
  if (h > 0) return lang === 'es' ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}ч ${String(m).padStart(2, '0')}м`;
  return lang === 'es' ? `${m}m` : `${m}м`;
};

const MILESTONES: MilestoneInfo[] = [
  {
    level: 10,
    emojiRu: '⚡', emojiUk: '⚡',
    titleRu: '+1 слот энергии', titleUk: '+1 слот енергії',
    titleEs: '+1 ranura de energía',
    descRu: 'Максимум энергии увеличится до 6', descUk: 'Максимум енергії збільшиться до 6',
    descEs: 'La energía máxima subirá hasta 6',
    doneDescRu: 'Максимум энергии увеличен до 6', doneDescUk: 'Максимум енергії збільшено до 6',
    doneDescEs: 'Energía máxima aumentada a 6',
  },
  {
    level: 20,
    emojiRu: '⚡', emojiUk: '⚡',
    titleRu: '+1 слот энергии', titleUk: '+1 слот енергії',
    titleEs: '+1 ranura de energía',
    descRu: 'Максимум энергии увеличится до 7', descUk: 'Максимум енергії збільшиться до 7',
    descEs: 'La energía máxima subirá hasta 7',
    doneDescRu: 'Максимум энергии увеличен до 7', doneDescUk: 'Максимум енергії збільшено до 7',
    doneDescEs: 'Energía máxima aumentada a 7',
  },
  {
    level: 30,
    emojiRu: '⚡', emojiUk: '⚡',
    titleRu: '+1 слот энергии', titleUk: '+1 слот енергії',
    titleEs: '+1 ranura de energía',
    descRu: 'Максимум энергии увеличится до 8', descUk: 'Максимум енергії збільшиться до 8',
    descEs: 'La energía máxima subirá hasta 8',
    doneDescRu: 'Максимум энергии увеличен до 8', doneDescUk: 'Максимум енергії збільшено до 8',
    doneDescEs: 'Energía máxima aumentada a 8',
  },
  {
    level: 40,
    emojiRu: '⚡', emojiUk: '⚡',
    titleRu: '+1 слот энергии', titleUk: '+1 слот енергії',
    titleEs: '+1 ranura de energía',
    descRu: 'Максимум энергии увеличится до 9', descUk: 'Максимум енергії збільшиться до 9',
    descEs: 'La energía máxima subirá hasta 9',
    doneDescRu: 'Максимум энергии увеличен до 9', doneDescUk: 'Максимум енергії збільшено до 9',
    doneDescEs: 'Energía máxima aumentada a 9',
  },
  {
    level: 50,
    emojiRu: '👑', emojiUk: '👑',
    titleRu: 'Максимум энергии 10', titleUk: 'Максимум енергії 10',
    titleEs: 'Energía máxima 10',
    descRu: 'Достигни вершины — стань Легендой!', descUk: 'Досягни вершини — стань Легендою!',
    descEs: '¡Alcanza la cima — conviértete en leyenda!',
    doneDescRu: 'Ты достиг вершины. Легенда!', doneDescUk: 'Ти досяг вершини. Легенда!',
    doneDescEs: 'Has alcanzado la cima. ¡Leyenda!',
  },
];

/** O(1) вместо .find в каждой строке */
const MILESTONE_BY_LEVEL: Partial<Record<number, MilestoneInfo>> = Object.fromEntries(
  MILESTONES.map(m => [m.level, m])
);

export default function ProgressMapScreen() {
  const { theme: t, f, isDark } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const [totalXP, setTotalXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userName, setUserName] = useState('');
  const [unclaimedGifts, setUnclaimedGifts] = useState<Record<number, GiftDef>>({});
  const [unclaimedDual, setUnclaimedDual]   = useState<Record<number, PremPair>>({});
  const [claimedRarities, setClaimedRarities] = useState<Record<number, string>>({});
  const [dualClaimedLevels, setDualClaimedLevels] = useState<Set<number>>(() => new Set());
  const [activeGifts, setActiveGifts] = useState<ActiveGiftInfo[]>([]);

  // Gift modal state for unclaimed gifts opened from this screen
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [giftModalLevel, setGiftModalLevel] = useState(0);
  const [giftModalIsDual, setGiftModalIsDual] = useState(false);

  const scrollRef = useRef<FlatList<number>>(null);
  /** Только transform — useNativeDriver: true, без нагрузки на JS layout */
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const loadData = useCallback(async () => {
    const [xpRaw, nameRaw] = await Promise.all([
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('user_name'),
    ]);
    const xp = parseInt(xpRaw || '0') || 0;
    setTotalXP(xp);
    const { level } = getXPProgress(xp);
    setUserLevel(level);
    if (nameRaw) setUserName(nameRaw);
    const [unclaimed, claimed, dualU, dualClaim] = await Promise.all([
      loadUnclaimedGifts(), loadClaimedGiftRarities(), loadUnclaimedDualGifts(), loadDualClaimedLevels(),
    ]);
    setUnclaimedGifts(unclaimed);
    setClaimedRarities(claimed);
    setUnclaimedDual(dualU);
    setDualClaimedLevels(dualClaim);

    const nextActive: ActiveGiftInfo[] = [];
    const [
      xpBank,
      packTrial,
      arenaMax,
      hintsToday,
      giftMultRaw,
      shieldRaw,
      wagerDiscount,
      clubGiftBoost,
    ] = await Promise.all([
      readGiftXpBank(),
      getPackGiftTrial(),
      getDailyArenaMaxToday(),
      getBonusHintsToday(),
      AsyncStorage.getItem('gift_xp_multiplier'),
      AsyncStorage.getItem('chain_shield'),
      AsyncStorage.getItem('wager_discount'),
      AsyncStorage.getItem('club_gift_free_boost_v1'),
    ]);

    if (xpBank.remaining > 0) {
      nextActive.push({
        key: 'xp_bank',
        icon: '⚡',
        title: triLang(lang, { ru: 'Бонус ×2', uk: 'Бонус ×2', es: 'Bono ×2' }),
        desc: triLang(lang, {
          ru: `ещё на ${xpBank.remaining} XP`,
          uk: `ще на ${xpBank.remaining} XP`,
          es: `por ${xpBank.remaining} XP más`,
        }),
      });
    }

    try {
      const state = giftMultRaw ? JSON.parse(giftMultRaw) as { multiplier?: number; expiresAt?: number } : null;
      const ms = Math.max(0, Number(state?.expiresAt || 0) - Date.now());
      const mult = Math.max(1, Number(state?.multiplier || 1));
      if (ms > 0 && mult > 1) {
        nextActive.push({
          key: 'gift_focus',
          icon: '⏱️',
          title: triLang(lang, { ru: 'Фокус', uk: 'Фокус', es: 'Foco' }),
          desc: `×${mult.toFixed(mult % 1 === 0 ? 0 : 2)} · ${formatMsLeft(ms, lang)}`,
        });
      }
    } catch {}

    if (packTrial) {
      nextActive.push({
        key: 'pack_trial',
        icon: '📦',
        title: triLang(lang, { ru: 'Ваучер набора', uk: 'Ваучер набору', es: 'Vale de pack' }),
        desc: triLang(lang, {
          ru: `${getPackTrialHoursLeft(packTrial.expiresAt)} ч доступа`,
          uk: `${getPackTrialHoursLeft(packTrial.expiresAt)} год доступу`,
          es: `${getPackTrialHoursLeft(packTrial.expiresAt)} h de acceso`,
        }),
      });
    }

    if (arenaMax > ARENA_DAILY_MAX) {
      nextActive.push({
        key: 'arena_extra',
        icon: '🎟️',
        title: triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' }),
        desc: triLang(lang, {
          ru: `+${arenaMax - ARENA_DAILY_MAX} матчей сегодня`,
          uk: `+${arenaMax - ARENA_DAILY_MAX} матчів сьогодні`,
          es: `+${arenaMax - ARENA_DAILY_MAX} duelos hoy`,
        }),
      });
    }

    if (hintsToday > 0) {
      nextActive.push({
        key: 'hints',
        icon: '💡',
        title: triLang(lang, { ru: 'Подсказки', uk: 'Підказки', es: 'Pistas' }),
        desc: triLang(lang, {
          ru: `${hintsToday} на сегодня`,
          uk: `${hintsToday} на сьогодні`,
          es: `${hintsToday} para hoy`,
        }),
      });
    }

    try {
      const shield = shieldRaw ? JSON.parse(shieldRaw) as { daysLeft?: number; grantedAt?: string } : null;
      const total = Math.max(0, Math.floor(Number(shield?.daysLeft) || 0));
      const granted = shield?.grantedAt ? new Date(shield.grantedAt) : null;
      const daysPassed = granted ? Math.floor((Date.now() - granted.getTime()) / 86400000) : 0;
      const remaining = Math.max(0, total - daysPassed);
      if (remaining > 0) {
        nextActive.push({
          key: 'chain_shield',
          icon: '🛡️',
          title: triLang(lang, { ru: 'Защита цепочки', uk: 'Захист ланцюжка', es: 'Protección de racha' }),
          desc: triLang(lang, {
            ru: `${remaining} дн.`,
            uk: `${remaining} дн.`,
            es: `${remaining} d`,
          }),
        });
      }
    } catch {}

    if (wagerDiscount) {
      nextActive.push({
        key: 'wager_discount',
        icon: '🎲',
        title: triLang(lang, { ru: 'Скидка на пари', uk: 'Знижка на парі', es: 'Descuento apuesta' }),
        desc: '-25%',
      });
    }

    if (clubGiftBoost === '1') {
      nextActive.push({
        key: 'club_boost',
        icon: '👥',
        title: triLang(lang, { ru: 'Буст клуба', uk: 'Буст клубу', es: 'Impulso de liga' }),
        desc: triLang(lang, { ru: '1 бесплатная активация', uk: '1 безкоштовна активація', es: '1 activación gratis' }),
      });
    }

    setActiveGifts(nextActive);
  }, [lang]);

  // После анимации перехода экрана — чтение AsyncStorage не борется с transition
  useEffect(() => {
    let cancelled = false;
    InteractionManager.runAfterInteractions(() => {
      if (!cancelled) void loadData();
    });
    return () => { cancelled = true; };
  }, [loadData]);
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  // Прокрутка к текущему уровню — после списка и без конкуренции с enter-анимацией
  useEffect(() => {
    if (userLevel <= 1) return;
    const index = Math.max(0, userLevel - 1 - 3);
    const t = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        try {
          scrollRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.12 });
        } catch {
          /* layout may be pending */
        }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [userLevel]);

  const openUnclaimedGift = (lvl: number) => {
    setGiftModalLevel(lvl);
    setGiftModalIsDual(!!unclaimedDual[lvl]);
    setGiftModalVisible(true);
  };

  const onSingleGiftClose = (claimed: boolean) => {
    setGiftModalVisible(false);
    setGiftModalIsDual(false);
    if (claimed) {
      const rarity = unclaimedGifts[giftModalLevel]?.rarity ?? 'common';
      setUnclaimedGifts(prev => { const next = { ...prev }; delete next[giftModalLevel]; return next; });
      setClaimedRarities(prev => ({ ...prev, [giftModalLevel]: rarity }));
    }
  };

  const onDualGiftClose = (claimed: boolean) => {
    const level = giftModalLevel;
    const p = unclaimedDual[level];
    setGiftModalVisible(false);
    setGiftModalIsDual(false);
    if (claimed) {
      setUnclaimedDual(prev => { const n = { ...prev }; delete n[level]; return n; });
      setDualClaimedLevels(prev => new Set([...prev, level]));
      if (p) {
        const best
          = p.f2p.rarity === 'epic' || p.prem.rarity === 'epic' ? 'epic'
            : p.f2p.rarity === 'rare' || p.prem.rarity === 'rare' ? 'rare' : 'common';
        setClaimedRarities(prev => ({ ...prev, [level]: best }));
      }
    }
  };

  const levels = Array.from({ length: 50 }, (_, i) => i + 1);

  const renderLevelRow: ListRenderItem<number> = ({ item: lvl }) => {
    const isDone = lvl < userLevel;
    const isCurrent = lvl === userLevel;
    const isLocked = lvl > userLevel;
    const maxEnrg = getMaxEnergyForLevel(lvl);
    const milestone = MILESTONE_BY_LEVEL[lvl];
    const milestoneGift = getMilestoneLevelGift(lvl);
    const titleDef = TITLES.find(td => td.minLevel === lvl);
    const hasUnclaimed = !!unclaimedGifts[lvl] || !!unclaimedDual[lvl];
    const receivedGiftLabel = triLang(lang, {
      ru: 'Получено',
      uk: 'Отримано',
      es: 'Reclamado',
    });

    const rowStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: isCurrent ? t.accentBg : t.bgCard,
      borderRadius: 16,
      borderWidth: isCurrent ? 2 : 0.5,
      borderColor: isCurrent ? t.accent : hasUnclaimed ? '#B8860B88' : t.border,
      opacity: isLocked ? 0.45 : 1,
      shadowColor: (isCurrent ? t.accent : hasUnclaimed ? '#FFD700' : 'transparent') as string,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isCurrent ? 0.6 : hasUnclaimed ? 0.3 : 0,
      shadowRadius: isCurrent ? 8 : hasUnclaimed ? 6 : 0,
      elevation: isCurrent ? 6 : hasUnclaimed ? 3 : 0,
    };

    const rowInner = (
      <View style={rowStyle}>
          <View style={{ alignItems: 'center', width: 50 }}>
            {isCurrent ? (
              <LevelBadge level={lvl} size={44} autoplay />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: t.bgSurface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: t.border,
                }}
              >
                <Text style={{ color: t.textMuted, fontSize: 15, fontWeight: '800' }}>{lvl}</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  color: isCurrent ? t.textPrimary : isDone ? t.textPrimary : t.textMuted,
                  fontSize: isCurrent ? f.bodyLg : f.body,
                  fontWeight: isCurrent ? '800' : '500',
                }}
              >
                {triLang(lang, {
                  ru: `Уровень ${lvl}`,
                  uk: `Рівень ${lvl}`,
                  es: `Nivel ${lvl}`,
                })}
              </Text>
              {isDone && !hasUnclaimed && <Ionicons name="checkmark-circle" size={16} color={isDark ? t.gold : t.accent} />}
            </View>

            {titleDef && (
              <Text
                style={{
                  color: isDone || isCurrent ? (isDark ? t.gold : t.accent) : t.textGhost,
                  fontSize: 12,
                  fontWeight: '600',
                  marginTop: 2,
                }}
              >
                {titleDef.titleEN}
              </Text>
            )}
            {milestoneGift && (
              <Text
                style={{
                  color: isDone || isCurrent ? t.textSecond : t.textMuted,
                  fontSize: 11,
                  fontWeight: '700',
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {milestoneGift.icon} {giftTitleForLang(milestoneGift, lang)}
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {isLocked ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16, opacity: 0.4 }}>🎁</Text>
                <Ionicons name="lock-closed" size={12} color={t.textGhost} />
              </View>
            ) : hasUnclaimed ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => openUnclaimedGift(lvl)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#B8860B',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: '#FFD700',
                }}
              >
                <Text style={{ fontSize: 14 }}>🎁</Text>
                <Text style={{ color: '#FFD700', fontSize: f.sub, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Reclamar' })}
                </Text>
              </TouchableOpacity>
            ) : isDone || isCurrent ? (
              claimedRarities[lvl] ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Image
                      source={CHEST_IMAGES[claimedRarities[lvl]] ?? CHEST_IMAGES.common}
                      style={{ width: 28, height: 28, opacity: 0.7 }}
                      resizeMode="contain"
                    />
                    {dualClaimedLevels.has(lvl) && (
                      <Image
                        source={PREMIUM_CHEST_SM}
                        style={{ width: 22, height: 22, opacity: 0.85 }}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <Text
                    style={{ color: t.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'right' }}
                    numberOfLines={1}
                  >
                    {receivedGiftLabel}
                  </Text>
                </View>
              ) : isDone ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Image
                    source={CHEST_IMAGES.common}
                    style={{ width: 28, height: 28, opacity: 0.55 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{ color: t.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'right' }}
                    numberOfLines={1}
                  >
                    {receivedGiftLabel}
                  </Text>
                </View>
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={t.accent} />
              )
            ) : null}

            {isLocked ? (
              <Text style={{ color: t.textGhost, fontSize: 12, fontWeight: '700' }}>
                max {maxEnrg}
              </Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: -2 }}>
                  {Array.from({ length: maxEnrg }).map((_, i) => (
                    <View key={i} style={{ transform: [{ rotate: '-90deg' }] }}>
                      <Ionicons
                        name="battery-full"
                        size={18}
                        color={isDone || isCurrent ? '#3DB87A' : t.bgSurface2}
                      />
                    </View>
                  ))}
                </View>
                <Text style={{ color: isDark ? t.textMuted : t.textPrimary, fontSize: 12, fontWeight: '700' }}>{maxEnrg}</Text>
              </>
            )}
          </View>
      </View>
    );

    return (
      <View>
        {milestone && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: isDone || isCurrent ? t.accentBg : t.bgSurface,
              borderRadius: 14,
              padding: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: isDone || isCurrent ? t.accent : t.border,
            }}
          >
            <Text style={{ fontSize: 22 }}>{triLang(lang, {
              ru: milestone.emojiRu,
              uk: milestone.emojiUk,
              es: milestone.emojiRu,
            })}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: isDone || isCurrent ? t.accent : t.textMuted, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: milestone.titleRu,
                  uk: milestone.titleUk,
                  es: milestone.titleEs,
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                {isDone || isCurrent
                  ? triLang(lang, {
                    ru: milestone.doneDescRu ?? milestone.descRu,
                    uk: milestone.doneDescUk ?? milestone.descUk,
                    es: milestone.doneDescEs ?? milestone.descEs,
                  })
                  : triLang(lang, {
                    ru: milestone.descRu,
                    uk: milestone.descUk,
                    es: milestone.descEs,
                  })}
              </Text>
            </View>
            {(isDone || isCurrent) && <Ionicons name="checkmark-circle" size={20} color={t.accent} />}
          </View>
        )}
        {isCurrent ? (
          <Animated.View style={{ marginBottom: 8, transform: [{ scale: pulseAnim }] }}>
            {rowInner}
          </Animated.View>
        ) : (
          <View style={{ marginBottom: 8 }}>{rowInner}</View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', flex: 1 }}>
              {triLang(lang, {
                ru: 'Карта прогресса',
                uk: 'Карта прогресу',
                es: 'Mapa de progreso',
              })}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: isDark ? t.gold : t.textPrimary, fontSize: f.label, fontWeight: '700' }}>{Math.round(totalXP)} XP</Text>
              <Text style={{ color: t.textMuted, fontSize: 10 }}>
                {triLang(lang, {
                  ru: `Уровень ${userLevel}`,
                  uk: `Рівень ${userLevel}`,
                  es: `Nivel ${userLevel}`,
                })}
              </Text>
            </View>
          </View>

          <FlatList
            ref={scrollRef}
            data={levels}
            keyExtractor={item => String(item)}
            renderItem={renderLevelRow}
            extraData={{ userLevel, unclaimedGifts, unclaimedDual, claimedRarities, dualClaimedLevels, activeGifts, lang }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={activeGifts.length > 0 ? (
              <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: t.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                    {triLang(lang, { ru: 'Активные подарки', uk: 'Активні подарунки', es: 'Regalos activos' })}
                  </Text>
                  <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: t.accentBg }}>
                    <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800' }}>{activeGifts.length}</Text>
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  {activeGifts.map((gift) => (
                    <View
                      key={gift.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 12,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        backgroundColor: t.bgSurface2,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{gift.icon}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '800' }} numberOfLines={1}>
                          {gift.title}
                        </Text>
                        <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
                          {gift.desc}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={4}
            updateCellsBatchingPeriod={80}
            removeClippedSubviews
            onScrollToIndexFailed={info => {
              setTimeout(() => {
                try {
                  scrollRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.12,
                  });
                } catch {
                  /* ignore */
                }
              }, 80);
            }}
            ListFooterComponent={(
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ReportErrorButton
                  screen="progress_map"
                  dataId="progress_map_levels"
                  dataText={triLang(lang, {
                    ru: 'Карта прогресса',
                    uk: 'Карта прогресу',
                    es: 'Mapa de progreso',
                  })}
                />
              </View>
            )}
          />
        </SafeAreaView>
      </ScreenGradient>

      {/* Модалка тяжёлая (EnergyContext + анимации) — монтируем только при открытии */}
      {giftModalVisible && giftModalIsDual ? (
        <LevelGiftDualModal
          visible
          level={giftModalLevel}
          userName={userName}
          lang={lang}
          onClose={onDualGiftClose}
          preRolledPair={unclaimedDual[giftModalLevel]}
        />
      ) : null}
      {giftModalVisible && !giftModalIsDual ? (
        <LevelGiftModal
          visible
          level={giftModalLevel}
          userName={userName}
          lang={lang}
          onClose={onSingleGiftClose}
          preRolledGift={unclaimedGifts[giftModalLevel]}
        />
      ) : null}
    </View>
  );
}
