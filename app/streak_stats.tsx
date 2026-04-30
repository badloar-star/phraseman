import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Modal, Pressable,
  TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import LevelBadge from '../components/LevelBadge';
import { getXPProgress } from '../constants/theme';
import { getTitleString, TITLES } from '../constants/titles';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import {
  streakCalendarShortWeekdays,
  streakWeekRowShort,
  streakWagerTierDaysLabel,
} from '../constants/streak_stats_i18n';
import XpGainBadge from '../components/XpGainBadge';
import { loadLeagueState, LEAGUES, CLUB_DESC_ES } from './league_engine';
import { loadLeaderboard, loadWeekLeaderboard, getMyWeekPoints, getWeekKey , checkStreakLossPending } from './hall_of_fame_utils';
import { loadWager, placeWager, wagerDaysLeft, WagerState, WAGER_TIERS } from './streak_wager';
import { getXPMultiplier, getActiveBoosts } from './club_boosts';
// stationary_clubs feature удалён.
import { readGiftMultiplier } from './level_gift_system';
import { STORE_URL } from './config';
import { usePremium } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { useArenaRank } from '../hooks/use-arena-rank';
import { getShardsBalance, spendShards } from './shards_system';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { getStatsCache, preloadStats, invalidateStatsCache } from './statsCache';
import { onAppEvent } from './events';
import { oskolokImageForPackShards } from './oskolok';
import { loadActiveLeagueBoost } from './league_personal_boosts';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import Svg from 'react-native-svg';
import StreakShareCardSvg from '../components/share_cards/StreakShareCardSvg';
import { shareStreakCardPng } from '../components/share_cards/shareStreakCardImage';

const CHART_H = 110;
const DAYS_SHOW = 14;

interface DayData {
  date: string;
  shortLabel: string;
  dayNum: string;
  points: number;
  active: boolean;
  streak: number;
}

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const getLast14 = (): string[] => {
  const days: string[] = [];
  for (let i = DAYS_SHOW - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
};

// Reads day value from daily_stats — supports both formats:
// 1) plain number: { "2025-03-15": 48 }
// 2) object: { "2025-03-15": { points: 48, streak: 3 } }
const extractPoints = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && typeof val.points === 'number') return val.points;
  return 0;
};
const extractStreak = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && typeof val.streak === 'number') return val.streak;
  return 0;
};

// ── Пари на цепочку ───────────────────────────────────────────────────────────
const TIER_ICONS_WAGER: any[] = ['flag-outline', 'flame-outline', 'thunderstorm-outline', 'trophy-outline', 'star-outline', 'diamond-outline'];

// ── Inline shard icon + amount helper ────────────────────────────────────────
function ShardsInline({ n, size = 14, textColor }: { n: number | string; size?: number; textColor?: string }) {
  const nNum = typeof n === 'number' ? n : parseInt(String(n), 10);
  const src = oskolokImageForPackShards(
    Number.isFinite(nNum) && nNum > 0 ? nNum : 0,
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ color: textColor ?? '#E9D5FF', fontSize: size, fontWeight: '700', lineHeight: size * 1.35 }}>{n}</Text>
      <Image
        source={src}
        style={{ width: size + 2, height: size + 2 }}
        resizeMode="contain"
      />
    </View>
  );
}

function WagerCard({ lang, t, f, totalStreak }: { lang: Lang; t: any; f: any; totalStreak: number }) {
  const router = useRouter();
  const [wager, setWager]               = useState<WagerState | null>(null);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [placing, setPlacing]           = useState(false);
  const [selectedTier, setSelectedTier] = useState(1);
  const [shardsWager, setShardsWager]   = useState(0);
  const [wagerNeedShards, setWagerNeedShards] = useState(false);
  const [wagerConfirm, setWagerConfirm] = useState(false);

  const reload = async () => {
    const [w, shardsRaw] = await Promise.all([
      loadWager(),
      getShardsBalance(),
    ]);
    setWager(w);
    setShardsWager(shardsRaw);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const clampTierIdx = (i: number) => Math.max(0, Math.min(i, WAGER_TIERS.length - 1));

  const handlePlace = () => {
    const tier = WAGER_TIERS[clampTierIdx(selectedTier)];
    if (!tier) return;
    if (shardsWager < tier.betShards) {
      setWagerNeedShards(true);
      return;
    }
    setWagerConfirm(true);
  };

  const doPlace = async () => {
    setPlacing(true);
    const ok = await placeWager(totalStreak, clampTierIdx(selectedTier));
    if (ok) {
      await reload();
      setModalOpen(false);
    }
    setPlacing(false);
  };

  if (loading) return null;

  // ── Результат ──────────────────────────────────────────────────────────────
  if (wager && !wager.active && wager.result !== 'pending') {
    const won = wager.result === 'won';
    const resultColor = won ? '#34C759' : '#FF3B30';
    return (
      <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: resultColor + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={won ? 'trophy' : 'close-circle'} size={22} color={resultColor} />
        </View>
        <View style={{ flex: 1 }}>
          {won ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Пари выиграно!',
                  uk: 'Парі виграно!',
                  es: '¡Apuesta ganada!',
                })}
              </Text>
              <ShardsInline n={`+${wager.rewardShards}`} size={f.body} textColor={resultColor} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>+{wager.rewardXP} XP</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Цепочка сорвана · −',
                  uk: 'Ланцюжок зірвано · −',
                  es: 'Racha perdida · −',
                })}
              </Text>
              <ShardsInline n={wager.betShards} size={f.body} textColor={resultColor} />
            </View>
          )}
          <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
            {triLang(lang, {
              ru: 'Принять новое пари?',
              uk: 'Прийняти нове парі?',
              es: '¿Empezar otra apuesta?',
            })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setWager(null)}
          style={{ backgroundColor: t.bgSurface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Да', uk: 'Так', es: 'Sí' })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Активное пари ──────────────────────────────────────────────────────────
  if (wager?.active) {
    const daysLeft = wagerDaysLeft(wager);
    const daysKept = wager.daysRequired - daysLeft;
    const tierIcon = TIER_ICONS_WAGER[wager.tierIdx] ?? 'flame-outline';

    return (
      <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.textSecond + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={tierIcon} size={20} color={t.textSecond} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Пари активно', uk: 'Парі активне', es: 'Apuesta activa' })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {triLang(lang, {
                  ru: `${daysLeft} дн. осталось · ставка`,
                  uk: `${daysLeft} дн. залишилось · ставка`,
                  es: `Quedan ${daysLeft} días · apuesta`,
                })}
              </Text>
              <ShardsInline n={wager.betShards} size={f.sub} textColor={t.textSecond} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <XpGainBadge amount={wager.rewardXP} visible={true} style={{ color: t.textSecond, fontSize: f.body, fontWeight: '800' }} />
            <Text style={{ color: t.textMuted, fontSize: f.label }}>XP</Text>
          </View>
        </View>

        {/* Day dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {Array.from({ length: wager.daysRequired }, (_, i) => {
            const done = i < daysKept;
            const cur  = i === daysKept;
            return (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3,
                backgroundColor: done ? t.textSecond : cur ? t.textSecond + '55' : t.bgSurface2 }} />
            );
          })}
        </View>
        <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center' }}>
          {triLang(lang, {
            ru: `${daysKept} из ${wager.daysRequired} дней сохранено`,
            uk: `${daysKept} з ${wager.daysRequired} днів збережено`,
            es: `${daysKept} de ${wager.daysRequired} días guardados`,
          })}
        </Text>
      </View>
    );
  }

  // ── Кнопка → открывает модал ────────────────────────────────────────────────
  const sel       = WAGER_TIERS[clampTierIdx(selectedTier)];
  const canAfford = shardsWager >= sel.betShards;

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        activeOpacity={0.8}
        style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.textSecond + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="dice-outline" size={22} color={t.textSecond} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Пари', uk: 'Парі', es: 'Apuesta' })}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.sub }}>
            {triLang(lang, {
              ru: 'Удержи цепочку — получи +100% XP',
              uk: 'Утримай ланцюжок — отримай +100% XP',
              es: 'Mantén la racha y gana +100 % de XP',
            })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textGhost} />
      </TouchableOpacity>

      {/* Модал выбора ставки */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }} onPress={() => setModalOpen(false)}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ backgroundColor: t.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>

              {/* Handle */}
              <View style={{ width: 36, height: 4, backgroundColor: t.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', flex: 1 }}>
                  {triLang(lang, {
                    ru: 'Пари на цепочку',
                    uk: 'Парі на ланцюжок',
                    es: 'Apuesta por la racha',
                  })}
                </Text>
                {/* Shard balance chip */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.bgSurface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Image
                    source={oskolokImageForPackShards(typeof shardsWager === 'number' ? shardsWager : 0)}
                    style={{ width: 16, height: 16 }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }}>{shardsWager}</Text>
                </View>
              </View>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginBottom: 6, lineHeight: 20 }}>
                {triLang(lang, {
                  ru: 'Сейчас снимаем ставку. Если цепочку удержишь — на баланс начислим осколки и опыт.',
                  uk: 'Зараз знімаємо ставку. Якщо ланцюжок дотримаєш — на баланс нарахуємо осколки та досвід.',
                  es: 'Ahora retiramos la apuesta en fragmentos. Si mantienes la racha, añadimos fragmentos y XP al saldo.',
                })}
              </Text>

              {/* Tier grid: срок + ставка + чистый плюс (без «1→+4») */}
              <View style={{ gap: 8, marginBottom: 18 }}>
                {[[0, 1], [2, 3], [4, 5]].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map(i => {
                      const tier     = WAGER_TIERS[i];
                      const netShards = tier.rewardShards - tier.betShards;
                      const icon     = TIER_ICONS_WAGER[i];
                      const label    = streakWagerTierDaysLabel(lang, i);
                      const selected = selectedTier === i;
                      const afford   = shardsWager >= tier.betShards;
                      const deficit  = Math.max(0, tier.betShards - shardsWager);
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setSelectedTier(i)}
                          activeOpacity={0.75}
                          style={{
                            flex: 1, borderRadius: 14,
                            backgroundColor: selected ? t.textSecond + '1A' : t.bgCard,
                            borderWidth: selected ? 1.5 : 1,
                            borderColor: selected ? t.textSecond : t.border,
                            opacity: afford ? 1 : 0.55,
                            paddingVertical: 10, paddingHorizontal: 10,
                            gap: 4,
                            minHeight: 72,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name={icon} size={16} color={afford ? (selected ? t.textSecond : t.textMuted) : t.textGhost} />
                            <Text
                              style={{ color: afford ? (selected ? t.textPrimary : t.textMuted) : t.textGhost, fontSize: f.sub, fontWeight: '800', flex: 1 }}
                              numberOfLines={1}
                            >
                              {label}
                            </Text>
                          </View>
                          {afford ? (
                            <>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={{ color: t.textGhost, fontSize: 10, fontWeight: '600' }}>
                                  {triLang(lang, { ru: 'Ставка', uk: 'Ставка', es: 'Apuesta' })}
                                </Text>
                                <ShardsInline n={tier.betShards} size={10} textColor={t.textGhost} />
                              </View>
                              <Text style={{ color: selected ? t.textSecond : t.textPrimary, fontSize: 13, fontWeight: '800' }}>
                                {`+${netShards} ${triLang(lang, {
                                  ru: 'к балансу',
                                  uk: 'чистими до балансу',
                                  es: 'netos al saldo',
                                })}`}
                              </Text>
                            </>
                          ) : (
                            <Text style={{ color: t.textGhost, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                              {triLang(lang, {
                                ru: `Нужно ещё ${deficit} оск.`,
                                uk: `Ще ${deficit} оск.`,
                                es: `Faltan ${deficit} frag.`,
                              })}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={handlePlace}
                disabled={placing || !canAfford}
                activeOpacity={0.85}
                style={{ borderRadius: 14, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={canAfford ? [t.textSecond, t.textSecond + 'CC'] : [t.bgSurface2, t.bgSurface2]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {placing ? (
                    <Text style={{ color: canAfford ? '#000' : t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                      {triLang(lang, { ru: 'Ставим...', uk: 'Ставимо...', es: 'Apostando…' })}
                    </Text>
                  ) : canAfford ? (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={18} color="#000" />
                        <Text style={{ color: '#000', fontSize: f.body, fontWeight: '800' }}>
                          {`${triLang(lang, { ru: 'Поставить ', uk: 'Поставити ', es: 'Apostar ' })}`}
                        </Text>
                        <ShardsInline n={sel.betShards} size={f.body} textColor="#000" />
                      </View>
                      <Text style={{ color: '#000', fontSize: f.sub, fontWeight: '700', textAlign: 'center' }}>
                        {triLang(lang, {
                          ru: `Успех: +${sel.rewardShards - sel.betShards} к балансу · +${sel.rewardXP} XP`,
                          uk: `Успіх: +${sel.rewardShards - sel.betShards} чистими · +${sel.rewardXP} XP`,
                          es: `Si aciertas: +${sel.rewardShards - sel.betShards} netos al saldo · +${sel.rewardXP} XP`,
                        })}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="lock-closed-outline" size={18} color={t.textGhost} />
                      <Text style={{ color: t.textGhost, fontSize: f.body, fontWeight: '800' }}>
                        {triLang(lang, {
                          ru: 'Недостаточно осколков',
                          uk: 'Недостатньо осколків',
                          es: 'No tienes suficientes fragmentos',
                        })}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <ThemedConfirmModal
        visible={wagerNeedShards}
        title={triLang(lang, {
          ru: 'Недостаточно осколков',
          uk: 'Недостатньо осколків',
          es: 'No tienes suficientes fragmentos',
        })}
        messageNode={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 22 }}>
            <Text style={{ color: t.textMuted, fontSize: f.body }}>
              {triLang(lang, { ru: 'Нужно:', uk: 'Потрібно:', es: 'Hacen falta:' })}
            </Text>
            <ShardsInline n={sel.betShards} size={f.body} textColor="#A78BFA" />
            <Text style={{ color: t.textMuted, fontSize: f.body }}>
              {triLang(lang, { ru: 'осколков', uk: 'осколків', es: 'fragmentos' })}
            </Text>
          </View>
        }
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { ru: 'В магазин', uk: 'У магазин', es: 'A la tienda' })}
        onCancel={() => setWagerNeedShards(false)}
        onConfirm={() => {
          setWagerNeedShards(false);
          router.push({
            pathname: '/shards_shop',
            params: {
              need: String(Math.max(0, sel.betShards - shardsWager)),
              source: 'streak_wager',
            },
          } as any);
        }}
      />
      <ThemedConfirmModal
        visible={wagerConfirm}
        title={triLang(lang, {
          ru: 'Подтвердить пари',
          uk: 'Підтвердити парі',
          es: 'Confirmar la apuesta',
        })}
        messageNode={
          <View style={{ gap: 10, marginBottom: 22 }}>
            {/* Stake row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, { ru: 'Ставка:', uk: 'Ставка:', es: 'Apuesta:' })}
              </Text>
              <ShardsInline n={sel.betShards} size={f.body} textColor={t.textPrimary} />
            </View>
            {/* Win row */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Text style={{ fontSize: f.body }}>✅</Text>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>
                  {triLang(lang, {
                    ru: `Цепочка ${sel.daysRequired} дней без срывов.`,
                    uk: `Ланцюжок ${sel.daysRequired} днів без скидів.`,
                    es: `${sel.daysRequired} días de racha seguidos sin romperla.`,
                  })}
                </Text>
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <Text style={{ color: t.textMuted, fontSize: f.body }}>
                      {triLang(lang, { ru: 'К балансу', uk: 'До балансу', es: 'Al saldo' })}
                    </Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      +{sel.rewardShards - sel.betShards}
                    </Text>
                    <Text style={{ color: t.textGhost, fontSize: f.sub }}>
                      {triLang(lang, {
                        ru: `(начислим +${sel.rewardShards}, ставка уже снята)`,
                        uk: `(зарахуємо +${sel.rewardShards}, ставку вже знято)`,
                        es: `(abonamos +${sel.rewardShards}; la apuesta ya está apartada)`,
                      })}
                    </Text>
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.body }}>+{sel.rewardXP} XP</Text>
                </View>
              </View>
            </View>
            {/* Lose row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: f.body }}>❌</Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, flex: 1 }}>
                {triLang(lang, {
                  ru: 'Собьёшь цепочку → потеряешь ',
                  uk: 'Зірвеш ланцюжок → втратиш ',
                  es: 'Si rompes la racha pierdes ',
                })}
              </Text>
              <ShardsInline n={sel.betShards} size={f.body} textColor="#FF3B30" />
            </View>
          </View>
        }
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { ru: 'Поставить', uk: 'Поставити', es: 'Apostar' })}
        onCancel={() => setWagerConfirm(false)}
        onConfirm={() => {
          setWagerConfirm(false);
          void doPlace();
        }}
      />
    </>
  );
}

export default function StreakStats() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{section?:string}>();
  const { theme: t, f, isDark, themeMode } = useTheme();
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const purpleColor = isDark ? '#9B59F5' : '#6B21D4';
  const { lang } = useLang();
  const wdays = streakCalendarShortWeekdays(lang, REPORT_SCREENS_RUSSIAN_ONLY);

  // Initialise from pre-loaded cache so the screen shows real data immediately
  const _sc = getStatsCache();

  const [days, setDays]                  = useState<DayData[]>([]);
  const [allDays, setAllDays]            = useState<DayData[]>([]);
  const [totalStreak, setTotalStreak]    = useState(_sc.totalStreak);
  const [bestStreak, setBestStreak]      = useState(0);
  const [, setTotalPoints]    = useState(0);
  const [, setActiveDays] = useState(0);
  const [weekPoints, setWeekPoints]      = useState(_sc.weekPoints);
  const [, setTopPlayers]      = useState<{ name: string; points: number }[]>([]);
  const [, setMyRank]              = useState(0);
  const [, setMyName]              = useState(_sc.myName);
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[number]>(() =>
    LEAGUES.find(l => l.id === (_sc.engineLeagueId != null ? _sc.engineLeagueId : 0)) ?? LEAGUES[0],
  );
  const [totalXP, setTotalXP]            = useState(_sc.totalXP);
  const [lessonsCompleted, setLessonsCompleted] = useState(_sc.lessonsCompleted);
  const [lessonsProgressPct, setLessonsProgressPct] = useState(_sc.lessonsProgressPct);
  const { isPremium }                            = usePremium();
  const arenaRank                                = useArenaRank();
  const [freezeActive, setFreezeActive]         = useState(_sc.freezeActive);
  const [, setStreakAtRisk]          = useState(_sc.streakAtRisk);
  const [premiumFreezeUsed, setPremiumFreezeUsed] = useState(_sc.premiumFreezeUsed);
  const [comebackActive, setComebackActive]      = useState(_sc.comebackActive);
  const [clubBoostMultiplier, setClubBoostMultiplier] = useState(_sc.clubBoostMultiplier);
  // stationary_clubs feature удалён, мультипликатор фиксирован 1.
  const stationaryClubMultiplier = 1;
  const [clubBoostExpiresAt, setClubBoostExpiresAt]   = useState(_sc.clubBoostExpiresAt);
  const [shardsBalance, setShardsBalance]        = useState(_sc.shardsBalance);
  const [clubBoostTimeLeft,  setClubBoostTimeLeft]    = useState('');
  const [leagueBoostMultiplier, setLeagueBoostMultiplier] = useState(1);
  const [leagueBoostExpiresAt, setLeagueBoostExpiresAt] = useState(0);
  const [leagueBoostTimeLeft, setLeagueBoostTimeLeft] = useState('');
  const [giftMultiplier, setGiftMultiplier]           = useState(_sc.giftMultiplier);
  const [giftExpiresAt, setGiftExpiresAt]             = useState(_sc.giftExpiresAt);
  const [giftTimeLeft,  setGiftTimeLeft]              = useState('');
  const [chainShieldDays, setChainShieldDays]         = useState(_sc.chainShieldDays);
  const [clubDescVisible, setClubDescVisible]   = useState(false);
  const [, setHadPremiumEver]     = useState(_sc.hadPremiumEver);
  const [titlesModalVisible, setTitlesModalVisible] = useState(false);
  const [freezeConfirmVisible, setFreezeConfirmVisible] = useState(false);
  const [freezeNeedShardsModal, setFreezeNeedShardsModal] = useState(false);
  const FREEZE_COST_SHARDS = 3;

  const scrollRef     = useRef<any>(null);
  const chartScrollRef = useRef<any>(null);
  const streakShareSvgRef = useRef<InstanceType<typeof Svg> | null>(null);
  const today = toDateStr(new Date());
  const [levelY, setLevelY] = React.useState(0);

  const loadAll = React.useCallback(async () => {
    try {
      const [streakVal, statsRaw, wp, name, board, weekBoard] = await Promise.all([
        AsyncStorage.getItem('streak_count'),
        AsyncStorage.getItem('daily_stats'),
        getMyWeekPoints(),
        AsyncStorage.getItem('user_name'),
        loadLeaderboard(),
        loadWeekLeaderboard(),
      ]);

      if (streakVal) setTotalStreak(parseInt(streakVal) || 0);
      setWeekPoints(wp);
      if (name) setMyName(name);
      getShardsBalance().then(setShardsBalance);

      const statsMap: Record<string, any> = statsRaw ? JSON.parse(statsRaw) : {};

      const dates = getLast14();
      const dayData: DayData[] = dates.map(dateStr => {
        const d = new Date(dateStr + 'T12:00:00'); // fix timezone
        const val = statsMap[dateStr];
        const pts = extractPoints(val);
        return {
          date: dateStr,
          shortLabel: wdays[d.getDay()],
          dayNum: String(d.getDate()),
          points: pts,
          active: pts > 0,
          streak: extractStreak(val),
        };
      });
      setDays(dayData);

      // All-history chart: from first day of usage to first day + 60 days
      const todayStr = toDateStr(new Date());
      const statsKeys = Object.keys(statsMap).sort();
      const firstUsageDate = statsKeys.length > 0 ? statsKeys[0] : todayStr;
      const firstDay = new Date(firstUsageDate + 'T12:00:00');
      const sixtyDaysFromFirst = new Date(firstDay);
      sixtyDaysFromFirst.setDate(sixtyDaysFromFirst.getDate() + 59);

      const todayDay = new Date(todayStr + 'T12:00:00');
      const endDate = todayDay < sixtyDaysFromFirst ? todayDay : sixtyDaysFromFirst;

      const allHistoryDays: DayData[] = [];
      const cursor = new Date(firstDay);
      while (cursor <= endDate) {
        const dateStr = toDateStr(cursor);
        const val = statsMap[dateStr];
        const pts = extractPoints(val);
        allHistoryDays.push({
          date: dateStr,
          shortLabel: wdays[cursor.getDay()],
          dayNum: String(cursor.getDate()),
          points: pts,
          active: pts > 0,
          streak: extractStreak(val),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      setAllDays(allHistoryDays);

      const allPts = Object.values(statsMap).reduce((sum: number, val: any) => {
        return sum + extractPoints(val);
      }, 0);
      const allActive = Object.values(statsMap).filter((val: any) => extractPoints(val) > 0).length;
      setTotalPoints(allPts);
      setActiveDays(allActive);

      const xpStored = await AsyncStorage.getItem('user_total_xp');
      setTotalXP(parseInt(xpStored || '0') || allPts * 5);


      let best = 0, cur = 0;
      for (const d of dayData) {
        if (d.active) { cur++; best = Math.max(best, cur); } else cur = 0;
      }
      setBestStreak(best);

      // Validate week board is current week before showing
      const currentWeekKey = getWeekKey(new Date());
      const wbMetaRaw = await AsyncStorage.getItem('week_board_meta');
      const weekMeta = wbMetaRaw ? JSON.parse(wbMetaRaw) : { weekKey: '' };
      const validWeekBoard = weekMeta.weekKey === currentWeekKey ? weekBoard : [];
      const topSource = validWeekBoard.length > 0 ? validWeekBoard : board;
      setTopPlayers(topSource.slice(0, 3).map(e => ({ name: e.name, points: e.points })));
      if (name) {
        const rank = topSource.findIndex(e => e.name === name);
        setMyRank(rank >= 0 ? rank + 1 : 0);
      }

      const ls = await loadLeagueState();
      setEngineLeague(LEAGUES.find(l => l.id === (ls?.leagueId ?? 0)) ?? LEAGUES[0]);

      const hadPrem = await AsyncStorage.getItem('had_premium_ever');
      setHadPremiumEver(hadPrem === '1');

      // Count completed lessons (≥45 correct+replay_correct out of 50)
      let completedCount = 0;
      let totalCorrectAll = 0;
      const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
      const lessonResults = await AsyncStorage.multiGet(lessonKeys);
      for (const [, val] of lessonResults) {
        if (val) {
          const p: string[] = JSON.parse(val);
          const correctCount = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          totalCorrectAll += correctCount;
          if (correctCount >= 45) completedCount++; // 90% of TOTAL=50
        }
      }
      setLessonsCompleted(completedCount);
      setLessonsProgressPct(Math.min(100, Math.round(totalCorrectAll / (32 * 50) * 100)));

      // Streak freeze state
      const [freezeRaw, freeUsedRaw] = await Promise.all([
        AsyncStorage.getItem('streak_freeze'),
        AsyncStorage.getItem('premium_free_freeze_used'),
      ]);
      const freeze = freezeRaw ? JSON.parse(freezeRaw) : null;
      const freezeDateStr = new Date().toISOString().split('T')[0];
      const freezeIsActive = !!(freeze?.active && freeze?.date === freezeDateStr);
      setFreezeActive(freezeIsActive);
      setPremiumFreezeUsed(freeUsedRaw === 'true');
      const { willLose } = await checkStreakLossPending();
      setStreakAtRisk(willLose && !freezeIsActive);

      // Comeback и клуб-буст для блока множителей
      const comebackRaw = await AsyncStorage.getItem('comeback_active');
      setComebackActive(comebackRaw === todayStr);
      const clubM = await getXPMultiplier();
      setClubBoostMultiplier(clubM);
      // stationary_clubs feature удалён.
      if (clubM > 1) {
        const activeBoosts = await getActiveBoosts();
        // XP boost IDs start with 'xp_' (e.g. 'xp_2x_1h', 'xp_1_5x_2h')
        const xpBoost = activeBoosts.find(b => b.id.startsWith('xp_'));
        if (xpBoost) setClubBoostExpiresAt(xpBoost.activatedAt + xpBoost.durationMs);
      }
      const activeLeagueBoost = await loadActiveLeagueBoost();
      setLeagueBoostMultiplier(activeLeagueBoost?.multiplier ?? 1);
      setLeagueBoostExpiresAt(activeLeagueBoost?.expiresAt ?? 0);
      const gm = await readGiftMultiplier();
      setGiftMultiplier(gm);
      if (gm > 1) {
        const raw = await AsyncStorage.getItem('gift_xp_multiplier');
        if (raw) {
          const state = JSON.parse(raw);
          setGiftExpiresAt(state.expiresAt || 0);
        }
      }
      const csRaw = await AsyncStorage.getItem('chain_shield');
      if (csRaw) {
        const cs = JSON.parse(csRaw);
        const granted = cs.grantedAt ? new Date(cs.grantedAt) : null;
        const total = cs.daysLeft || 0;
        if (granted && total > 0) {
          const today = new Date();
          const daysPassed = Math.floor((today.getTime() - granted.getTime()) / 86400000);
          const remaining = Math.max(0, total - daysPassed);
          setChainShieldDays(remaining);
          // persist updated value if changed
          if (remaining !== total) {
            await AsyncStorage.setItem('chain_shield', JSON.stringify({ ...cs, daysLeft: remaining }));
          }
        } else {
          setChainShieldDays(total);
        }
      }
    } catch {}
  }, [wdays]);

  // Reload data when screen regains focus (e.g. after tester functions).
  // After loadAll finishes, invalidate the cache so the next open re-fetches fresh data.
  useFocusEffect(React.useCallback(() => {
    loadAll().then(() => invalidateStatsCache());
    // If the home screen didn't pre-load (e.g. cold start straight to stats),
    // kick off a fresh preload for the *next* visit in background.
    preloadStats();
    return undefined;
  }, [loadAll]));

  useEffect(() => {
    const sub = onAppEvent('xp_changed', () => {
      void loadAll();
    });
    return () => sub.remove();
  }, [loadAll]);

  // Таймер обратного отсчёта для клубного буста XP
  useEffect(() => {
    if (!clubBoostExpiresAt || clubBoostMultiplier <= 1) { setClubBoostTimeLeft(''); return; }
    const fmt = () => {
      const ms = clubBoostExpiresAt - Date.now();
      if (ms <= 0) { setClubBoostTimeLeft(''); setClubBoostMultiplier(1); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setClubBoostTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2,'0')}м` : `${m}м ${s.toString().padStart(2,'0')}с`);
    };
    fmt();
    const timer = setInterval(fmt, 1000);
    return () => clearInterval(timer);
  }, [clubBoostExpiresAt, clubBoostMultiplier]);

  // Таймер обратного отсчёта для персонального буста лиги
  useEffect(() => {
    if (!leagueBoostExpiresAt || leagueBoostMultiplier <= 1) { setLeagueBoostTimeLeft(''); return; }
    const fmt = () => {
      const ms = leagueBoostExpiresAt - Date.now();
      if (ms <= 0) { setLeagueBoostTimeLeft(''); setLeagueBoostMultiplier(1); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeagueBoostTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2,'0')}м` : `${m}м ${s.toString().padStart(2,'0')}с`);
    };
    fmt();
    const timer = setInterval(fmt, 1000);
    return () => clearInterval(timer);
  }, [leagueBoostExpiresAt, leagueBoostMultiplier]);

  // Scroll to level section if opened from level block on home screen
  // Таймер обратного отсчёта для подарочного множителя XP
  useEffect(() => {
    if (!giftExpiresAt || giftMultiplier <= 1) { setGiftTimeLeft(''); return; }
    const fmt = () => {
      const ms = giftExpiresAt - Date.now();
      if (ms <= 0) { setGiftTimeLeft(''); setGiftMultiplier(1); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setGiftTimeLeft(h > 0 ? `${h}ч ${m.toString().padStart(2,'0')}м` : `${m}м ${s.toString().padStart(2,'0')}с`);
    };
    fmt();
    const timer = setInterval(fmt, 1000);
    return () => clearInterval(timer);
  }, [giftExpiresAt, giftMultiplier]);

  useEffect(() => {
    if (section === 'level' && levelY > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: levelY, animated: true });
      }, 300);
    }
  }, [section, levelY]);

  const handleFreezeStreak = () => {
    hapticTap();
    if (!isPremium) {
      router.push({ pathname: '/premium_modal', params: { context: 'streak', streak: String(totalStreak) } } as any);
      return;
    }
    if (premiumFreezeUsed) {
      setFreezeConfirmVisible(true);
    } else {
      doFreezeStreak(true);
    }
  };

  const doFreezeStreak = async (free: boolean) => {
    const today = toDateStr(new Date());
    if (free) {
      await AsyncStorage.setItem('premium_free_freeze_used', 'true');
      setPremiumFreezeUsed(true);
    } else {
      const ok = await spendShards(FREEZE_COST_SHARDS, 'streak_freeze');
      if (!ok) {
        setFreezeNeedShardsModal(true);
        return;
      }
      setShardsBalance(prev => Math.max(0, prev - FREEZE_COST_SHARDS));
    }
    await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
    setFreezeActive(true);
    setStreakAtRisk(false);
  };

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>

      {/* Подтверждение траты осколков на заморозку */}
      <Modal transparent visible={freezeConfirmVisible} animationType="fade" onRequestClose={() => setFreezeConfirmVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setFreezeConfirmVisible(false)}>
          <Pressable onPress={e => e.stopPropagation()} style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 28, width: '82%', alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>❄️</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginBottom: 6, textAlign: 'center' }}>
              {triLang(lang, { ru: 'Заморозить стрик?', uk: 'Заморозити стрік?', es: '¿Congelar la racha?' })}
            </Text>
            <View style={{ alignItems: 'center', marginBottom: 20, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>{triLang(lang, { ru: 'Стоимость:', uk: 'Вартість:', es: 'Coste:' })}</Text>
                <ShardsInline n={FREEZE_COST_SHARDS} size={f.body} textColor={t.textMuted} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: t.textMuted, fontSize: f.body }}>{triLang(lang, { ru: 'Баланс:', uk: 'Баланс:', es: 'Saldo:' })}</Text>
                <ShardsInline n={shardsBalance} size={f.body} textColor={t.textMuted} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                onPress={() => setFreezeConfirmVisible(false)}
                style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: t.textMuted, fontWeight: '600', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setFreezeConfirmVisible(false); doFreezeStreak(false); }}
                style={{ flex: 1, borderRadius: 14, backgroundColor: '#64B4FF', paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Заморозить', uk: 'Заморозити', es: 'Congelar' })}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 8 }}>
          {triLang(lang, { ru: 'Статистика', uk: 'Статистика', es: 'Estadísticas' })}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        <View
          pointerEvents="none"
          collapsable={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
        >
          <StreakShareCardSvg
            ref={streakShareSvgRef}
            days={totalStreak}
            lang={lang}
            layoutSize={1080}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push('/hall_of_fame_screen' as any)}
            style={{
              flex: 1,
              backgroundColor: t.bgSurface,
              borderRadius: 12,
              borderWidth: 1.2,
              borderColor: `${t.accent}55`,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View style={{ width: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trophy-outline" size={18} color={t.textPrimary} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Зал славы', uk: 'Зал слави', es: 'Salón de la fama' })}
            </Text>
          </TouchableOpacity>
          {/* «Клубы» feature удалён — кнопка убрана. */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push('/club_screen' as any)}
            style={{
              flex: 1,
              backgroundColor: t.bgSurface,
              borderRadius: 12,
              borderWidth: 1.2,
              borderColor: `${t.accent}55`,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View style={{ width: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-outline" size={18} color={t.textPrimary} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Лига', uk: 'Ліга', es: 'Liga' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LEVEL */}
        <View onLayout={(e) => setLevelY(e.nativeEvent.layout.y)}>
          {(() => {
            const { level, xpInLevel, xpNeeded, progress } = getXPProgress(totalXP);
            return (
              <LinearGradient colors={t.cardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={{ borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: t.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <LevelBadge level={level} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
                      {triLang(lang, { ru: `Уровень ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}` })}
                    </Text>
                    <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '600', marginTop: 2 }}>{Math.round(totalXP)} XP</Text>
                  </View>
                </View>
                <View style={{ height: 7, backgroundColor: t.bgSurface, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                  <View style={{ width: `${Math.min(100, Math.round(progress * 100))}%` as any, height: '100%', borderRadius: 4, backgroundColor: isLightTheme ? t.accent : t.gold }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: t.textMuted, fontSize: f.label }}>{xpInLevel} / {xpNeeded} XP</Text>
                  <Text style={{ color: t.gold, fontSize: f.label }}>
                    {triLang(lang, { ru: `Уровень ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}` })}
                  </Text>
                </View>
              </LinearGradient>
            );
          })()}
        </View>

        {/* TITLE PANEL */}
        {(() => {
          const { level } = getXPProgress(totalXP);
          const title = getTitleString(level, lang);
          const nextTitle = TITLES.find(t2 => t2.minLevel > level);
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTitlesModalVisible(true)}
              style={{ borderRadius: 16, padding: 14, borderWidth: 0.5, backgroundColor: t.bgCard, borderColor: t.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View>
                <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                  {triLang(lang, { ru: 'Мой титул', uk: 'Мій титул', es: 'Mi título' })}
                </Text>
                <Text style={{ color: t.gold, fontSize: f.sub, fontWeight: '800' }}>{title}</Text>
                {nextTitle && (
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
                    {triLang(lang, {
                      ru: `Следующий: ${nextTitle.titleEN} (уровень ${nextTitle.minLevel})`,
                      uk: `Наступний: ${nextTitle.titleEN} (рівень ${nextTitle.minLevel})`,
                      es: `Siguiente: ${nextTitle.titleEN} (nivel ${nextTitle.minLevel})`,
                    })}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </TouchableOpacity>
          );
        })()}

        {/* TITLES MODAL */}
        <Modal visible={titlesModalVisible} transparent animationType="slide" onRequestClose={() => setTitlesModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setTitlesModalVisible(false)} />
            <View style={{ backgroundColor: t.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', paddingHorizontal: 20, marginBottom: 16 }}>
                {triLang(lang, { ru: 'Все титулы', uk: 'Всі титули', es: 'Todos los títulos' })}
              </Text>
              {(() => {
                const { level } = getXPProgress(totalXP);
                return (
                  <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                    {TITLES.map((tl, i) => {
                      const unlocked  = level >= tl.minLevel;
                      const isCurrent = level >= tl.minLevel && level <= tl.maxLevel;
                      const rangeLabel = tl.minLevel === tl.maxLevel
                        ? `${tl.minLevel}`
                        : `${tl.minLevel}–${tl.maxLevel}`;
                      return (
                        <View key={tl.minLevel} style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingHorizontal: 20, paddingVertical: 10,
                          borderBottomWidth: i < TITLES.length - 1 ? 0.5 : 0,
                          borderBottomColor: t.border,
                          backgroundColor: isCurrent ? t.bgSurface : 'transparent',
                        }}>
                          <Text style={{ color: unlocked ? t.gold : t.textGhost, fontSize: f.body, fontWeight: isCurrent ? '800' : '400', flex: 1 }}>
                            {tl.titleEN}
                            {isCurrent ? ' ✓' : ''}
                          </Text>
                          <Text style={{ color: unlocked ? t.textMuted : t.textGhost, fontSize: f.label }}>
                            {triLang(lang, { ru: `Уровень ${rangeLabel}`, uk: `Рівень ${rangeLabel}`, es: `Nivel ${rangeLabel}` })}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* XP MULTIPLIERS BLOCK */}
        {(() => {
          const streakM = totalStreak >= 30 ? 1.8 : totalStreak >= 14 ? 1.6 : totalStreak >= 7 ? 1.4 : totalStreak >= 3 ? 1.2 : 1;
          const clubWeekTierM = 1 + engineLeague.id * 0.1;
          const clubCombinedM = clubBoostMultiplier + clubWeekTierM + stationaryClubMultiplier - 2;
          const comebackM = comebackActive ? 2 : 1;
          const total = 1 + (streakM - 1) + (clubCombinedM - 1) + (leagueBoostMultiplier - 1) + (comebackM - 1) + (giftMultiplier - 1);
          const hasBonus = total > 1;
          const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;
          const items: { key: string; label: string; value: string; color: string; active: boolean }[] = [
            { key: 'streak', label: triLang(lang, { ru: 'Цепочка', uk: 'Ланцюжок', es: 'Racha' }), value: pct(streakM), color: '#FF6B35', active: streakM > 1 },
            { key: 'club', label: triLang(lang, { ru: 'Лига', uk: 'Ліга', es: 'Liga' }), value: pct(clubCombinedM), color: t.gold, active: clubCombinedM > 1 },
            { key: 'league_boost', label: triLang(lang, { ru: 'Буст лиги', uk: 'Буст ліги', es: 'Impulso de liga' }), value: pct(leagueBoostMultiplier), color: '#A78BFA', active: leagueBoostMultiplier > 1 },
            { key: 'comeback', label: triLang(lang, { ru: 'Возврат', uk: 'Повернення', es: 'Bonificación de retorno' }), value: pct(comebackM), color: '#60A5FA', active: comebackActive },
            { key: 'gift', label: triLang(lang, { ru: 'Подарок уровня', uk: 'Подарунок рівня', es: 'Regalo de nivel' }), value: pct(giftMultiplier), color: purpleColor, active: giftMultiplier > 1 },
          ];
          const activeItems = items.filter(i => i.active);
          return (
            <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: hasBonus ? t.gold : t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: activeItems.length > 0 ? 10 : 0 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Активные множители XP', uk: 'Активні множники XP', es: 'Multiplicadores de XP activos' })}
                </Text>
                <Text style={{ color: hasBonus ? t.gold : t.textMuted, fontSize: f.bodyLg, fontWeight: '800' }}>
                  ×{total.toFixed(2)}
                </Text>
              </View>
              {activeItems.length === 0 ? (
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 6 }}>
                  {triLang(lang, { ru: 'Нет активных бонусов', uk: 'Немає активних бонусів', es: 'No hay bonificaciones activas' })}
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {activeItems.map(item => {
                    const isGiftItem = item.key === 'gift';
                    const isClubRow = item.key === 'club';
                    const isLeagueBoostRow = item.key === 'league_boost';
                    return (
                      <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                          <Text style={{ color: t.textSecond, fontSize: f.caption }}>{item.label}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ color: item.color, fontSize: f.caption, fontWeight: '700' }}>{item.value}</Text>
                          {isGiftItem && !!giftTimeLeft && (
                            <Text style={{ color: t.textMuted, fontSize: f.caption - 1, fontWeight: '500' }}>{giftTimeLeft}</Text>
                          )}
                          {isClubRow && clubBoostMultiplier > 1 && !!clubBoostTimeLeft && (
                            <Text style={{ color: t.textMuted, fontSize: f.caption - 1, fontWeight: '500' }}>{clubBoostTimeLeft}</Text>
                          )}
                          {isLeagueBoostRow && leagueBoostMultiplier > 1 && !!leagueBoostTimeLeft && (
                            <Text style={{ color: t.textMuted, fontSize: f.caption - 1, fontWeight: '500' }}>{leagueBoostTimeLeft}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })()}

        {/* STREAK */}
        <LinearGradient colors={t.cardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={{ borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Ionicons name={freezeActive ? 'snow-outline' : 'flame'} size={Math.round(f.numLg * 1.1)} color={freezeActive ? '#64B4FF' : '#FF6B35'} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.numLg + 4, fontWeight: '700' }} numberOfLines={1}>{totalStreak}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption }}>{triLang(lang, { ru: 'дней подряд', uk: 'днів поспіль', es: 'días seguidos' })}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ color: t.textSecond, fontSize: f.h1, fontWeight: '700' }}>{bestStreak}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label }}>{triLang(lang, { ru: 'лучший', uk: 'найкращий', es: 'récord' })}</Text>
              {totalStreak >= 3 && (
                <TouchableOpacity
                  style={{ flexDirection:'row', alignItems:'center', gap:4 }}
                  onPress={async () => {
                    const _ru = [
                      `Мой стрик в Phraseman — ${totalStreak} дней! 🔥 Я мощнее, чем утренняя доза кофеина. Кто догонит?`,
                      `${totalStreak} дней подряд в Phraseman! 🏆 Стабильность — моё второе имя. Английский уже как родной! 🔥`,
                      `Видишь этот огонь? 🔥 Это мой стрик ${totalStreak} дней в Phraseman! Ни дня без английского, ни дня без побед!`,
                      `${totalStreak} дней подряд в Phraseman! Моя дисциплина официально вышла на новый уровень. Не останавливайте меня! 🔥`,
                      `Говорят, привычка формируется 21 день. У меня уже ${totalStreak}! Phraseman — это уже стиль жизни. ☕️📖`,
                      `Мой стрик в Phraseman горит ярче моего желания уйти в отпуск! 🔥 ${totalStreak} дней в деле!`,
                      `Мой стрик в Phraseman горит ярче солнца! 🔥 ${totalStreak} дней подряд. Кто сможет побить мой рекорд?`,
                      `${totalStreak} дней в Phraseman! 🏆 Маленькими шагами к большой цели. Мой английский говорит мне «спасибо»!`,
                      `Не сбавляю темп! 🔥 ${totalStreak} дней обучения в Phraseman. Стабильность — признак мастерства!`,
                      `Не подходите близко — я горяч! 🔥 ${totalStreak} дней стрика в Phraseman. Английский стал моей полезной привычкой.`,
                      `Бегу марафон по английскому. Уже ${totalStreak}-й день в Phraseman без остановок! 🏃‍♀️ Кто со мной?`,
                    ];
                    const _uk = [
                      `Мій стрік у Phraseman — ${totalStreak} днів! 🔥 Я потужніший за ранкову дозу кофеїну. Хто наздожене?`,
                      `${totalStreak} днів поспіль у Phraseman! 🏆 Стабільність — моє друге ім'я. Англійська вже як рідна! 🔥`,
                      `Бачиш цей вогонь? 🔥 Це мій стрік ${totalStreak} днів у Phraseman! Жодного дня без англійської, жодного дня без перемог!`,
                      `${totalStreak} днів поспіль у Phraseman! Моя дисципліна офіційно вийшла на новий рівень. Не зупиняйте мене! 🔥`,
                      `Кажуть, звичка формується 21 день. У мене вже ${totalStreak}! Phraseman — це вже стиль життя. ☕️📖`,
                      `Мій стрік у Phraseman горить яскравіше за моє бажання піти у відпустку! 🔥 ${totalStreak} днів у справі!`,
                      `Мій стрік у Phraseman горить яскравіше за сонце! 🔥 ${totalStreak} днів поспіль. Хто зможе побити мій рекорд?`,
                      `${totalStreak} днів у Phraseman! 🏆 Маленькими кроками до великої мети. Моя англійська каже мені «дякую»!`,
                      `Не збавляю темп! 🔥 ${totalStreak} днів навчання у Phraseman. Стабільність — ознака майстерності!`,
                      `Не підходьте близько — я гарячий! 🔥 ${totalStreak} днів стріку у Phraseman. Англійська стала моєю корисною звичкою.`,
                      `Біжу марафон з англійської. Вже ${totalStreak}-й день у Phraseman без зупинок! 🏃‍♀️ Хто зі мною?`,
                    ];
                    const _es = [
                      `Mi racha en Phraseman: ¡${totalStreak} días! 🔥 Más fuerte que el café de la mañana. ¿Quién me alcanza?`,
                      `¡${totalStreak} días seguidos en Phraseman! 🏆 La constancia es mi segundo nombre. ¡El inglés ya se siente natural! 🔥`,
                      `¿Ves ese fuego? 🔥 Es mi racha de ${totalStreak} días en Phraseman. Ni un día sin inglés, ni un día sin ganar.`,
                      `¡${totalStreak} días seguidos en Phraseman! Mi disciplina subió de nivel. ¡No me frenes! 🔥`,
                      `Dicen que un hábito tarda 21 días. ¡Yo llevo ${totalStreak}! Phraseman ya es estilo de vida. ☕️📖`,
                      `¡Mi racha en Phraseman arde más que mis ganas de vacaciones! 🔥 ${totalStreak} días y sumando.`,
                      `¡Mi racha en Phraseman brilla más que el sol! 🔥 ${totalStreak} días seguidos. ¿Quién bate mi récord?`,
                      `¡${totalStreak} días en Phraseman! 🏆 Paso a paso hacia la meta. ¡Mi inglés me lo agradece!`,
                      `¡No bajo el ritmo! 🔥 ${totalStreak} días estudiando en Phraseman. ¡La constancia es maestría!`,
                      `¡Cuidado, que quemo! 🔥 ${totalStreak} días de racha en Phraseman. El inglés ya es mi buen hábito.`,
                      `Maratón de inglés: día ${totalStreak} en Phraseman sin parar. 🏃 ¿Quién se une?`,
                    ];
                    const _p = lang === 'uk' ? _uk : lang === 'es' ? _es : _ru;
                    const msg = _p[Math.floor(Math.random() * _p.length)] + `\n${STORE_URL}`;
                    await shareStreakCardPng(streakShareSvgRef, msg);
                  }}
                >
                  <Ionicons name="share-outline" size={14} color={t.textGhost}/>
                  <Text style={{ color: t.textGhost, fontSize: f.label }}>
                    {triLang(lang, { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Current week days */}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {streakWeekRowShort(lang).map((d, i) => {
              const todayIdx = (new Date().getDay() + 6) % 7;
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - todayIdx);
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + i);
              const dateStr = toDateStr(dayDate);
              const dayInfo = days.find(x => x.date === dateStr);
              const done = dayInfo?.active || false;
              const isToday = i === todayIdx;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View style={[
                    { width: 22, height: 22, borderRadius: 11, backgroundColor: t.bgSurface2 },
                    done && { backgroundColor: t.correct },
                    isToday && !done && { backgroundColor: t.bgSurface2, borderWidth: 2, borderColor: t.textPrimary },
                  ]} />
                  <Text style={{ color: isToday ? t.textPrimary : (done ? t.textPrimary : t.textMuted), fontSize: 12, fontWeight: isToday ? '700' : '600' }}>{d}</Text>
                </View>
              );
            })}
          </View>

          {/* Freeze button */}
          <View style={{ marginTop: 14 }}>
            {chainShieldDays > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#A78BFA" />
                <Text style={{ color: purpleColor, fontSize: f.body, fontWeight: '600', flex: 1 }}>
                  {triLang(lang, {
                    ru: `Заморозка активна: ${chainShieldDays} дней`,
                    uk: `Заморозка активна: ${chainShieldDays} дн.`,
                    es: `Congelación activa: ${chainShieldDays} días`,
                  })}
                </Text>
              </View>
            )}
            {freezeActive ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(100,180,255,0.12)', borderRadius: 12, padding: 12 }}>
                <Ionicons name="snow-outline" size={20} color="#64B4FF" />
                <Text style={{ color: '#64B4FF', fontSize: f.body, fontWeight: '600', flex: 1 }}>
                  {triLang(lang, {
                    ru: 'Цепочка заморожена на сегодня',
                    uk: 'Ланцюжок заморожено на сьогодні',
                    es: 'Racha congelada por hoy',
                  })}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleFreezeStreak}
                disabled={chainShieldDays > 0}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#64B4FF', paddingVertical: 11, paddingHorizontal: 16, opacity: chainShieldDays > 0 ? 0.4 : 1 }}
              >
                <Ionicons name="snow-outline" size={18} color="#64B4FF" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#64B4FF', fontSize: f.body, fontWeight: '600' }}>
                    {triLang(lang, { ru: 'Заморозить цепочку', uk: 'Заморозити ланцюжок', es: 'Congelar la racha' })}
                  </Text>
                  {isPremium && premiumFreezeUsed ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                      <Text style={{ color: t.textMuted, fontSize: f.label }}>{FREEZE_COST_SHARDS}</Text>
                      <Image source={oskolokImageForPackShards(FREEZE_COST_SHARDS)} style={{ width: 14, height: 14 }} />
                    </View>
                  ) : (
                    <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                      {isPremium
                        ? triLang(lang, { ru: 'Бесплатно (Премиум)', uk: 'Безкоштовно (Преміум)', es: 'Gratis (Premium)' })
                        : triLang(lang, { ru: 'Нужен Премиум', uk: 'Потрібен Преміум', es: 'Se necesita Premium' })}
                    </Text>
                  )}
                </View>
                {!isPremium && <Ionicons name="lock-closed-outline" size={16} color={t.textMuted} />}
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>


        {/* LEAGUE */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/club_screen' as any)}
          style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border }}
        >
          <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            {triLang(lang, { ru: 'Текущая лига', uk: 'Поточна ліга', es: 'Liga actual' })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {engineLeague.imageUri
              ? <Image source={engineLeague.imageUri} style={{ width: 48, height: 48 }} resizeMode="contain" />
              : engineLeague.ionIcon
                ? <Ionicons name={engineLeague.ionIcon as any} size={28} color={engineLeague.color ?? t.textSecond} />
                : <Ionicons name="people-outline" size={28} color={t.textSecond} />
            }
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }} adjustsFontSizeToFit numberOfLines={1}>
                {triLang(lang, {
                  ru: engineLeague.nameRU,
                  uk: engineLeague.nameUK,
                  es: engineLeague.nameES ?? engineLeague.nameRU,
                })}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }}>
                {`${weekPoints} ${triLang(lang, {
                  ru: 'опыта на этой неделе',
                  uk: 'досвіду цього тижня',
                  es: 'XP esta semana',
                })}`}
              </Text>
            </View>
            <Ionicons name="information-circle-outline" size={20} color={t.textGhost} />
          </View>
        </TouchableOpacity>

        {/* CHART — horizontal scroll, full history */}
        {(() => {
          const chartDays = allDays.length > 0 ? allDays : days;
          const maxAllPts = Math.max(...chartDays.map(d => d.points), 1);
          return (
            <LinearGradient colors={t.cardGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={{ borderRadius: 16, padding: 16, paddingBottom: 8, borderWidth: 0.5, borderColor: t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>
                  {triLang(lang, { ru: 'Вся активность', uk: 'Вся активність', es: 'Toda tu actividad' })}
                </Text>
              </View>
              <ScrollView
                ref={chartScrollRef}
                horizontal
                showsHorizontalScrollIndicator
                indicatorStyle="white"
                onLayout={() => chartScrollRef.current?.scrollToEnd?.({ animated: false })}
                contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingBottom: 12 }}
              >
                {chartDays.map((d, i) => {
                  const barH = d.points > 0 ? Math.max((d.points / maxAllPts) * CHART_H, 8) : 5;
                  const isToday = d.date === today;
                  const barColor = d.active
                    ? (isToday ? t.textPrimary : t.accent)
                    : (isToday ? t.border : t.bgSurface2 ?? t.border);
                  return (
                    <View key={i} style={{ width: 26, alignItems: 'center', gap: 2 }}>
                      {d.points > 0 && (
                        <Text style={{ color: t.textMuted, fontSize: 7, fontWeight: '600' }} numberOfLines={1}>{d.points}</Text>
                      )}
                      {d.points === 0 && <View style={{ height: 12 }} />}
                      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: CHART_H }}>
                        <View style={{
                          width: d.active ? 18 : 14, height: barH, borderRadius: 3,
                          backgroundColor: barColor,
                          opacity: d.active ? 1 : 0.35,
                        }} />
                      </View>
                      <Text style={{
                        color: isToday ? t.textPrimary : t.textMuted,
                        fontSize: 8, fontWeight: isToday ? '800' : '400',
                        lineHeight: 11,
                      }} numberOfLines={1}>{d.shortLabel}</Text>
                      <Text style={{ color: isToday ? t.textSecond : t.textGhost, fontSize: 8 }}>{d.dayNum}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </LinearGradient>
          );
        })()}



        {/* PATH A1 → B2 */}
        {(() => {
          const stages = ['A1','A2','B1','B2'];
          // Lesson brackets: A1=1-8, A2=9-18, B1=19-28, B2=29-32
          const lessonStages = [
            { label: 'A1', from: 1,  to: 8  },
            { label: 'A2', from: 9,  to: 18 },
            { label: 'B1', from: 19, to: 28 },
            { label: 'B2', from: 29, to: 32 },
          ];
          const overallPct = lessonsProgressPct;
          const currentStage = lessonsCompleted < 8 ? 0 : lessonsCompleted < 18 ? 1 : lessonsCompleted < 28 ? 2 : 3;
          const currentStageMeta = lessonStages[currentStage] || lessonStages[3];
          return (
            <View style={{ borderRadius: 16, padding: 14, borderWidth: 0.5, backgroundColor: t.bgCard, borderColor: t.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Путь A1 → B2', uk: 'Шлях A1 → B2', es: 'Camino A1 → B2' })}
                </Text>
                <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '700' }}>
                  {overallPct}%
                </Text>
              </View>
              {/* Progress bar */}
              <View style={{ height: 6, backgroundColor: t.bgSurface, borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
                <View style={{ width: `${overallPct}%` as any, height: '100%', borderRadius: 3, backgroundColor: t.accent }} />
              </View>
              {/* Stage labels */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                {stages.map((s, i) => (
                  <Text key={s} style={{ fontSize: f.label, fontWeight: '600', color: i <= currentStage ? t.accent : t.textMuted }}>{s}</Text>
                ))}
              </View>
              {/* Real progress info */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{lessonsCompleted}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>{triLang(lang, { ru: 'уроков сдано', uk: 'уроків виконано', es: 'lecciones hechas' })}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: t.accent, fontSize: f.numMd, fontWeight: '700' }}>{currentStageMeta.label}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>{triLang(lang, { ru: 'текущий уровень', uk: 'поточний рівень', es: 'nivel actual' })}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>{32 - lessonsCompleted}</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>{triLang(lang, { ru: 'осталось', uk: 'залишилось', es: 'restantes' })}</Text>
                </View>
              </View>
              {lessonsCompleted < 32 && (
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 10, textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: `Уроки ${currentStageMeta.from}–${currentStageMeta.to} — уровень ${currentStageMeta.label}`,
                    uk: `Уроки ${currentStageMeta.from}–${currentStageMeta.to} — рівень ${currentStageMeta.label}`,
                    es: `Lecciones ${currentStageMeta.from}–${currentStageMeta.to} — nivel ${currentStageMeta.label}`,
                  })}
                </Text>
              )}
            </View>
          );
        })()}

        {/* ── ДОСТИЖЕНИЯ ────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.push('/achievements_screen')}
          style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: f.numMd + 6 }}>🏅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Достижения', uk: 'Досягнення', es: 'Logros' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
              {triLang(lang, { ru: 'Открой все 35 наград', uk: 'Відкрий усі 35 нагород', es: 'Abre las 35 recompensas' })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </TouchableOpacity>

        {/* ── РЕЙТИНГ ДУЭЛЕЙ ────────────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => router.push('/arena_rating' as any)}
          style={{ borderRadius: 18, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={t.cardGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: t.border }}
          >
            <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              ⚔️ {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Image source={arenaRank.image} style={{ width: 48, height: 48 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', lineHeight: f.h2 + 4 }}>
                  {arenaRank.label}
                </Text>
                {arenaRank.games > 0 && (
                  <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 2 }}>
                    {`${arenaRank.xp} XP`}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {/* 3 stars: filled / empty */}
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <View
                      key={i}
                      style={{
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: i < arenaRank.stars ? t.gold : 'transparent',
                        borderWidth: 2,
                        borderColor: i < arenaRank.stars ? t.gold : t.textGhost,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ color: t.textGhost, fontSize: f.label }}>
                  {arenaRank.stars}/3
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── ОСКОЛКИ ЗНАНИЙ ──────────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => { hapticTap(); router.push('/shards_shop' as any); }}
        >
          <LinearGradient
            colors={['#1A0A3B', '#2D1660']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 18, padding: 16, borderWidth: 0.5, borderColor: '#7C3AED44', marginBottom: 12 }}
          >
            <Text style={{ color: '#A78BFA', fontSize: f.label, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              {triLang(lang, { ru: 'Осколки знаний', uk: 'Осколки знань', es: 'Fragmentos de conocimiento' })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Image source={oskolokImageForPackShards(shardsBalance)} style={{ width: 48, height: 48 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#E9D5FF', fontSize: f.h2 + 4, fontWeight: '800' }}>{shardsBalance}</Text>
                <Text style={{ color: '#A78BFA', fontSize: f.sub, marginTop: 2 }}>
                  {triLang(lang, { ru: 'накоплено осколков', uk: 'накопичено осколків', es: 'fragmentos acumulados' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── ПАРИ НА СТРИК ─────────────────────────────────────────────────── */}
        <WagerCard lang={lang} t={t} f={f} totalStreak={totalStreak} />

        <View style={{ height: 8 }} />
      </ScrollView>
      </ContentWrap>

      {/* Кастомный модал описания клуба — вместо системного Alert */}
      <Modal
        visible={clubDescVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClubDescVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setClubDescVisible(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: t.bgCard, borderRadius: 20, padding: 24, maxWidth: 360, borderWidth: 0.5, borderColor: t.border }}>
              {engineLeague.imageUri && (
                <Image source={engineLeague.imageUri} style={{ width: 64, height: 64, alignSelf: 'center', marginBottom: 12 }} resizeMode="contain" />
              )}
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: engineLeague.nameRU,
                  uk: engineLeague.nameUK,
                  es: engineLeague.nameES ?? engineLeague.nameRU,
                })}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: engineLeague.descRU,
                  uk: engineLeague.descUK,
                  es: CLUB_DESC_ES[engineLeague.id] ?? engineLeague.descRU,
                })}
              </Text>
              {(() => {
                const xpHintRU: Record<number, string> = {
                  0:  `Ты только начинаешь — все занятия приносят стандартный опыт, бонус +0%.`,
                  1:  `Первый шаг сделан — все занятия приносят +10% опыта.`,
                  2:  `Ты нашёл свой путь — все занятия засчитываются с +20% опыта.`,
                  3:  `Практика приносит плоды — все занятия дают +30% опыта.`,
                  4:  `Острый ум — острый рост. Все занятия приносят +40% опыта.`,
                  5:  `Эрудиты учатся эффективнее — все занятия приносят +50% опыта.`,
                  6:  `Знаток своего дела — все занятия приносят +60% опыта.`,
                  7:  `Эксперты растут быстрее всех — все занятия приносят +70% опыта.`,
                  8:  `Магистры учатся с максимальной отдачей — все занятия приносят +80% опыта.`,
                  9:  `Мыслители видят глубже и дальше — все занятия приносят +90% опыта.`,
                  10: `Мастера выкладываются на полную — все занятия приносят +100% опыта.`,
                  11: `Вершина мастерства! Профессора получают максимальный бонус — все занятия приносят +110% опыта.`,
                };
                const xpHintUK: Record<number, string> = {
                  0:  `Ти тільки починаєш — всі заняття приносять стандартний досвід, бонус +0%.`,
                  1:  `Перший крок зроблено — всі заняття приносять +10% досвіду.`,
                  2:  `Ти знайшов свій шлях — всі заняття зараховуються з +20% досвіду.`,
                  3:  `Практика дає результат — всі заняття приносять +30% досвіду.`,
                  4:  `Гострий розум — стрімке зростання. Всі заняття приносять +40% досвіду.`,
                  5:  `Ерудити вчаться ефективніше — всі заняття приносять +50% досвіду.`,
                  6:  `Знавець своєї справи — всі заняття приносять +60% досвіду.`,
                  7:  `Експерти ростуть швидше за всіх — всі заняття приносять +70% досвіду.`,
                  8:  `Магістри вчаться з максимальною віддачею — всі заняття приносять +80% досвіду.`,
                  9:  `Мислителі бачать глибше і далі — всі заняття приносять +90% досвіду.`,
                  10: `Майстри викладаються на повну — всі заняття приносять +100% досвіду.`,
                  11: `Вершина майстерності! Професори отримують максимальний бонус — всі заняття приносять +110% досвіду.`,
                };
                const xpHintES: Record<number, string> = {
                  0:  `Empiezas desde cero: todas las actividades dan XP estándar, bonificación +0 %.`,
                  1:  `Primer paso: todas las actividades dan +10 % de XP.`,
                  2:  `Ya encontraste tu ritmo: todas las actividades cuentan con +20 % de XP.`,
                  3:  `La práctica da frutos: todas las actividades dan +30 % de XP.`,
                  4:  `Mente ágil, progreso rápido: todas las actividades dan +40 % de XP.`,
                  5:  `Quienes estudian con método ganan más: +50 % de XP en todas las actividades.`,
                  6:  `Dominas el proceso: todas las actividades dan +60 % de XP.`,
                  7:  `Los expertos avanzan más rápido: todas las actividades dan +70 % de XP.`,
                  8:  `Sacas el máximo a cada sesión: todas las actividades dan +80 % de XP.`,
                  9:  `Ves el idioma en profundidad: todas las actividades dan +90 % de XP.`,
                  10: `Das el cien por cien: todas las actividades dan +100 % de XP.`,
                  11: `¡Cima del recorrido! En la élite profesional todas las actividades dan +110 % de XP.`,
                };
                const hint = lang === 'uk'
                  ? xpHintUK[engineLeague.id]
                  : lang === 'es'
                    ? xpHintES[engineLeague.id]
                    : xpHintRU[engineLeague.id];
                return hint ? (
                  <Text style={{ color: t.gold, fontSize: f.body, fontWeight: '700', textAlign: 'center', marginTop: 12 }}>
                    ⭐ {hint}
                  </Text>
                ) : null;
              })()}
              <TouchableOpacity
                onPress={() => setClubDescVisible(false)}
                style={{ marginTop: 20, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: t.correctText, fontWeight: '700', fontSize: f.body }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ThemedConfirmModal
        visible={freezeNeedShardsModal}
        title={triLang(lang, {
          ru: 'Недостаточно осколков',
          uk: 'Недостатньо осколків',
          es: 'No tienes suficientes fragmentos',
        })}
        messageNode={
          <View style={{ gap: 4, marginBottom: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, {
                  ru: 'Стоимость заморозки:',
                  uk: 'Вартість заморозки:',
                  es: 'Coste de congelar:',
                })}
              </Text>
              <ShardsInline n={FREEZE_COST_SHARDS} size={f.body} textColor={t.textMuted} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: f.body }}>
                {triLang(lang, {
                  ru: 'Твой баланс:',
                  uk: 'Твій баланс:',
                  es: 'Tu saldo:',
                })}
              </Text>
              <ShardsInline n={shardsBalance} size={f.body} textColor={t.textMuted} />
            </View>
          </View>
        }
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' })}
        confirmLabel={triLang(lang, { ru: 'В магазин', uk: 'У магазин', es: 'A la tienda' })}
        onCancel={() => setFreezeNeedShardsModal(false)}
        onConfirm={() => {
          setFreezeNeedShardsModal(false);
          router.push({
            pathname: '/shards_shop',
            params: {
              need: String(Math.max(0, FREEZE_COST_SHARDS - shardsBalance)),
              source: 'streak_stats_freeze',
            },
          } as any);
        }}
      />

    </SafeAreaView>
    </ScreenGradient>
  );
}
