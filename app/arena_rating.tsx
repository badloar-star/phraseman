import AsyncStorage from '@react-native-async-storage/async-storage';
import TapScale from '../components/TapScale';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Reanimated from 'react-native-reanimated';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Pressable, Dimensions, InteractionManager, Animated,
} from 'react-native';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { Image } from 'expo-image';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import XpGainBadge from '../components/XpGainBadge';
import { hapticTap } from '../hooks/use-haptics';
import {
  ARENA_RATING_SCREEN_CACHE_KEY,
  fetchAndCacheArenaRating,
  sanitizeArenaProfileForRating,
  sanitizeArenaRatingHistory,
  rememberArenaLobbyProfile,
} from './arena_rating_cache';
import { ArenaProfile, RankTier, RankLevel, RANK_TIERS, RANK_LEVELS, rankToIndex } from './types/arena';
import { getRankImage, getRankImageDisplayScale } from '../hooks/use-arena-rank';
import { emitAppEvent } from './events';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { safeRouterBack } from './navigation_back';

const RANK_NAMES: Record<RankTier, string> = {
  bronze: 'Бронза', silver: 'Серебро', gold: 'Золото',
  platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер',
  grandmaster: 'Грандмастер', legend: 'Легенда',
};

const RANK_NAMES_UK: Record<RankTier, string> = {
  bronze: 'Бронза', silver: 'Срібло', gold: 'Золото',
  platinum: 'Платина', diamond: 'Діамант', master: 'Майстер',
  grandmaster: 'Гросмейстер', legend: 'Легенда',
};

const RANK_NAMES_ES: Record<RankTier, string> = {
  bronze: 'Bronce', silver: 'Plata', gold: 'Oro',
  platinum: 'Platino', diamond: 'Diamante', master: 'Maestro',
  grandmaster: 'Gran maestro', legend: 'Leyenda',
};

const RANK_NAMES_PTBR: Record<RankTier, string> = {
  bronze: 'Bronze', silver: 'Prata', gold: 'Ouro',
  platinum: 'Platina', diamond: 'Diamante', master: 'Mestre',
  grandmaster: 'Grão-mestre', legend: 'Lenda',
};

const RANK_NAMES_VI: Record<RankTier, string> = {
  bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng',
  platinum: 'Bạch kim', diamond: 'Kim cương', master: 'Cao thủ',
  grandmaster: 'Đại cao thủ', legend: 'Huyền thoại',
};

const RANK_NAMES_ID: Record<RankTier, string> = {
  bronze: 'Perunggu', silver: 'Perak', gold: 'Emas',
  platinum: 'Platinum', diamond: 'Berlian', master: 'Master',
  grandmaster: 'Grandmaster', legend: 'Legenda',
};

const RANK_NAMES_TR: Record<RankTier, string> = {
  bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın',
  platinum: 'Platin', diamond: 'Elmas', master: 'Usta',
  grandmaster: 'Büyük usta', legend: 'Efsane',
};

const RANK_NAMES_PL: Record<RankTier, string> = {
  bronze: 'Brąz', silver: 'Srebro', gold: 'Złoto',
  platinum: 'Platyna', diamond: 'Diament', master: 'Mistrz',
  grandmaster: 'Arcymistrz', legend: 'Legenda',
};

export function arenaTierLabel(tier: RankTier, lang: Lang): string {
  return triLang(lang, {
    ru: RANK_NAMES[tier],
    uk: RANK_NAMES_UK[tier],
    es: RANK_NAMES_ES[tier],
    'pt-BR': RANK_NAMES_PTBR[tier],
    vi: RANK_NAMES_VI[tier],
    id: RANK_NAMES_ID[tier],
    tr: RANK_NAMES_TR[tier],
    pl: RANK_NAMES_PL[tier],
  });
}

interface MatchRecord {
  id: string;
  createdAt: number;
  won: boolean;
  myScore: number;
  oppScore: number;
  oppName: string;
  xpGained: number;
  starsChange: number;
  rankBefore: { tier: RankTier; level: RankLevel; stars: number };
  rankAfter: { tier: RankTier; level: RankLevel; stars: number };
}

function Stars({ count, color }: { count: 0 | 1 | 2; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2].map(i => (
        <Text key={i} style={{ fontSize: 18, opacity: i < count ? 1 : 0.25 }}>⭐</Text>
      ))}
    </View>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month} ${hours}:${mins}`;
}

function MatchRow({ match, t, f, lang }: { match: MatchRecord; t: ReturnType<typeof useTheme>['theme']; f: ReturnType<typeof useTheme>['f']; lang: Lang }) {
  const resultColor = match.won ? '#4CAF50' : '#F44336';
  const resultText = triLang(lang, {
    ru: match.won ? 'Победа' : 'Поражение',
    uk: match.won ? 'Перемога' : 'Поразка',
    es: match.won ? 'Victoria' : 'Derrota',
    'pt-BR': match.won ? 'Vitória' : 'Derrota',
    vi: match.won ? 'Thắng' : 'Thua',
    id: match.won ? 'Menang' : 'Kalah',
    tr: match.won ? 'Zafer' : 'Yenilgi',
    pl: match.won ? 'Wygrana' : 'Porażka',
  });
  const starDelta = match.starsChange;
  const starDeltaText = starDelta > 0 ? `+${starDelta}⭐` : starDelta < 0 ? `${starDelta}⭐` : '±0⭐';
  const starDeltaColor = starDelta > 0 ? '#4CAF50' : starDelta < 0 ? '#F44336' : t.textMuted;

  return (
    <View style={[styles.matchRow, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      <View style={[styles.resultBadge, { backgroundColor: resultColor + '22', borderColor: resultColor }]}>
        <Text style={{ color: resultColor, fontSize: f.sub, fontWeight: '700' }}>{resultText}</Text>
      </View>
      <View style={styles.matchInfo}>
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }} numberOfLines={1}>
          vs {match.oppName}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: f.sub }}>
          {formatDate(match.createdAt)}
        </Text>
      </View>
      <View style={styles.matchScores}>
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
          {match.myScore} — {match.oppScore}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <XpGainBadge amount={match.xpGained} visible={true} style={{ color: '#FFD700', fontSize: f.sub, fontWeight: '600' }} />
          <Text style={{ color: starDeltaColor, fontSize: f.sub, fontWeight: '600' }}>{starDeltaText}</Text>
        </View>
      </View>
    </View>
  );
}

const ALL_RANK_SLOTS = (() => {
  const slots: { tier: RankTier; level: RankLevel }[] = [];
  for (const tier of RANK_TIERS) {
    for (const level of RANK_LEVELS) {
      slots.push({ tier, level });
    }
  }
  return slots;
})();

export default function DuelRatingScreen() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const [myProfile, setMyProfile] = useState<ArenaProfile | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rankPickerOpen, setRankPickerOpen] = useState(false);
  const [rankPickerTop, setRankPickerTop] = useState(0);
  const rankRowRef = useRef<View>(null);
  const rankListRef = useRef<ScrollView>(null);
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);

  const pickerMaxH = useMemo(() => Math.round(Dimensions.get('window').height * 0.58), []);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(ARENA_RATING_SCREEN_CACHE_KEY);
          if (raw && !cancelled) {
            const parsed = JSON.parse(raw) as { profile?: unknown; history?: unknown };
            const profile = sanitizeArenaProfileForRating(parsed.profile ?? null);
            const history = sanitizeArenaRatingHistory(parsed.history);
            if (profile) {
              rememberArenaLobbyProfile(profile);
              setMyProfile(profile);
            }
            setMatchHistory(history);
            setLoading(false);
          }
        } catch { /* use full load */ }
        if (!cancelled) void loadData();
      })();
    });
    return () => { cancelled = true; task.cancel(); };
  }, []);

  const loadData = async () => {
    setLoadError(false);
    try {
      const data = await fetchAndCacheArenaRating();
      if (data) {
        if (data.profile) {
          rememberArenaLobbyProfile(data.profile);
          setMyProfile(data.profile);
        }
        setMatchHistory(data.history);
      }
    } catch {
      setLoadError(true);
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'История арены не загрузилась. Попробуй позже.',
        messageUk: 'Не вдалося завантажити історію арени.',
        messageEs: 'No se ha podido cargar el historial de la Arena.',
      });
    } finally {
      setLoading(false);
    }
  };

  const myRankTier = myProfile?.rank?.tier ?? 'bronze';
  const myRankLevel = myProfile?.rank?.level ?? 'I';
  const myStars = (myProfile?.rank?.stars ?? 0) as 0 | 1 | 2;
  const myXP = myProfile?.xp ?? 0;
  const myRankIdx = rankToIndex(myRankTier, myRankLevel);

  const openRankPicker = () => {
    hapticTap();
    requestAnimationFrame(() => {
      rankRowRef.current?.measureInWindow((_x, y, _w, h) => {
        setRankPickerTop(y + h + 6);
        setRankPickerOpen(true);
      });
    });
  };

  const closeRankPicker = () => setRankPickerOpen(false);

  useEffect(() => {
    if (!rankPickerOpen) return;
    const tm = setTimeout(() => {
      const rowH = 58;
      const scrollY = Math.max(0, myRankIdx * rowH - pickerMaxH / 2 + rowH);
      rankListRef.current?.scrollTo({ y: scrollY, animated: false });
    }, 72);
    return () => clearTimeout(tm);
  }, [rankPickerOpen, myRankIdx, pickerMaxH]);

  return (
    <ScreenGradient>
      <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
      <View style={styles.header}>
        <TapScale onPress={() => safeRouterBack(router, '/(tabs)/home' as any)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={sx.primary} />
        </TapScale>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Image source={require('../assets/images/levels/ARENA  ICON.webp')} style={{ width: 44, height: 44 }} contentFit="contain" />
          <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena', vi: 'Arena', id: 'Arena', tr: 'Arena', pl: 'Arena' })}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <BouncyWrap>
      <ScrollView decelerationRate="normal" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} bounces alwaysBounceVertical overScrollMode="always" onScroll={onBouncyScroll} scrollEventThrottle={16}>
        {/* Моя карточка */}
        <LinearGradient
          colors={t.cardGradient}
          style={[styles.myCard, { borderColor: t.border }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View ref={rankRowRef} collapsable={false} style={styles.myCardLeft}>
            <Pressable
              onPress={openRankPicker}
              style={({ pressed }) => [
                styles.rankPressable,
                { opacity: pressed ? 0.78 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Все ранги арены',
                uk: 'Усі ранги арени',
                es: 'Todos los rangos de la arena',
                'pt-BR': 'Todos os ranques da arena',
                vi: 'Tất cả hạng Arena',
                id: 'Semua rank arena',
                tr: 'Tüm arena rütbeleri',
                pl: 'Wszystkie rangi areny',
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={getRankImage(myRankTier, myRankLevel)}
                  style={{
                    width: 48,
                    height: 48,
                    transform: [{ scale: getRankImageDisplayScale(myRankTier, myRankLevel) }],
                  }}
                  contentFit="contain"
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <Text style={[styles.myRankName, { color: t.textPrimary, fontSize: f.h2 }]}>
                    {arenaTierLabel(myRankTier, lang)} {myRankLevel}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={t.textMuted} />
                </View>
                <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                  {(() => {
                    const n = myProfile?.stats?.matchesPlayed ?? 0;
                    return triLang(lang, {
                      ru: `${myXP} XP · ${n} игр`,
                      uk: `${myXP} XP · ${n} ігор`,
                      es: `${myXP} XP · ${n} ${n === 1 ? 'duelo' : 'duelos'}`,
                      'pt-BR': `${myXP} XP · ${n} ${n === 1 ? 'duelo' : 'duelos'}`,
                      vi: `${myXP} XP · ${n} trận`,
                      id: `${myXP} XP · ${n} game`,
                      tr: `${myXP} XP · ${n} oyun`,
                      pl: `${myXP} XP · ${n} gier`,
                    });
                  })()}
                </Text>
              </View>
            </Pressable>
          </View>
          <View style={styles.myCardRight}>
            <Stars count={myStars} color={t.gold} />
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
              {triLang(lang, {
                ru: `${myStars}/3 до повышения`,
                uk: `${myStars}/3 до підвищення`,
                es: `${myStars}/3 para subir de rango`,
                'pt-BR': `${myStars}/3 para subir de ranque`,
                vi: `${myStars}/3 để lên hạng`,
                id: `${myStars}/3 untuk naik rank`,
                tr: `Yükselmek için ${myStars}/3`,
                pl: `${myStars}/3 do awansu`,
              })}
            </Text>
          </View>
        </LinearGradient>

        <Modal
          visible={rankPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={closeRankPicker}
        >
          <View style={styles.rankModalRoot} pointerEvents="box-none">
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={closeRankPicker}
            />
            <View
              pointerEvents="box-none"
              style={[
                styles.rankPickerSheet,
                {
                  top: Math.max(72, rankPickerTop),
                  backgroundColor: t.bgCard,
                  borderColor: 'rgba(255,215,0,0.35)',
                  maxHeight: pickerMaxH,
                },
              ]}
            >
              <Text style={[styles.rankPickerTitle, { color: t.textMuted, fontSize: f.label }]}>
                {triLang(lang, { ru: 'РАНГИ АРЕНЫ', uk: 'РАНГИ АРЕНИ', es: 'RANGOS DE LA ARENA', 'pt-BR': 'RANQUES DA ARENA', vi: 'HẠNG ARENA', id: 'RANK ARENA', tr: 'ARENA RÜTBELERİ', pl: 'RANGI ARENY' })}
              </Text>
              <ScrollView
                ref={rankListRef}
                decelerationRate="normal"
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={{ right: 4 }}
                contentContainerStyle={styles.rankPickerScrollContent}
              >
                {ALL_RANK_SLOTS.map(({ tier, level }) => {
                  const idx = rankToIndex(tier, level);
                  const current = idx === myRankIdx;
                  return (
                    <View
                      key={`${tier}-${level}`}
                      style={[
                        styles.rankPickerRow,
                        {
                          borderColor: current ? '#D4AF37' : t.border,
                          backgroundColor: current ? 'rgba(255,215,0,0.14)' : t.bgSurface,
                        },
                      ]}
                    >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={getRankImage(tier, level)}
                        style={{
                          width: 40,
                          height: 40,
                          transform: [{ scale: getRankImageDisplayScale(tier, level) }],
                        }}
                        contentFit="contain"
                      />
                    </View>
                      <Text
                        style={[
                          styles.rankPickerRowText,
                          { color: t.textPrimary, fontSize: f.body, fontWeight: current ? '800' : '600' },
                        ]}
                      >
                        {arenaTierLabel(tier, lang)} {level}
                      </Text>
                      {current ? (
                        <View style={styles.rankPickerYouBadge}>
                          <Text style={{ color: '#1a1208', fontSize: f.caption - 1, fontWeight: '800' }}>
                            {triLang(lang, { ru: 'Твой', uk: 'Твій', es: 'Tuyo', 'pt-BR': 'Seu', vi: 'Của bạn', id: 'Milikmu', tr: 'Senin', pl: 'Twój' })}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* История матчей */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
            {triLang(lang, {
              ru: 'История матчей',
              uk: 'Історія матчів',
              es: 'Historial de duelos',
              'pt-BR': 'Histórico de duelos',
              vi: 'Lịch sử trận đấu',
              id: 'Riwayat pertandingan',
              tr: 'Maç geçmişi',
              pl: 'Historia meczów',
            })}
          </Text>

          {matchHistory.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>⚔️</Text>
              <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', marginBottom: loadError ? 14 : 0 }}>
                {loadError
                  ? triLang(lang, {
                      ru: 'История матчей не загрузилась. Попробуй ещё раз.',
                      uk: 'Не вдалося завантажити історію матчів',
                      es: 'No se ha podido cargar el historial de duelos.',
                      'pt-BR': 'Não foi possível carregar o histórico de duelos.',
                      vi: 'Không thể tải lịch sử trận đấu.',
                      id: 'Tidak dapat memuat riwayat pertandingan.',
                      tr: 'Maç geçmişi yüklenemedi.',
                      pl: 'Nie udało się wczytać historii meczów.',
                    })
                  : triLang(lang, {
                      ru: 'Сыграй первый матч,\nи он появится здесь',
                      uk: 'Зіграй перший матч,\nі він з\'явиться тут',
                      es: 'Juega tu primer duelo\ny aparecerá aquí.',
                      'pt-BR': 'Jogue seu primeiro duelo\ne ele aparecerá aqui.',
                      vi: 'Chơi trận đầu tiên\nvà nó sẽ xuất hiện ở đây.',
                      id: 'Mainkan duel pertamamu\ndan hasilnya akan muncul di sini.',
                      tr: 'İlk maçını oyna,\nburada görünsün.',
                      pl: 'Zagraj pierwszy mecz,\na pojawi się tutaj.',
                    })}
              </Text>
              {loadError && (
                <TouchableOpacity onPress={loadData} style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {matchHistory.map(match => (
            <MatchRow key={match.id} match={match} t={t} f={f} lang={lang} />
          ))}
        </View>
      </ScrollView>
      </BouncyWrap>
      </Reanimated.View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { padding: 4 },

  myCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, borderWidth: 1, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  myCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  rankPressable: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  myRankName: { fontWeight: '800' },
  myCardRight: { alignItems: 'flex-end' },

  rankModalRoot: { flex: 1 },
  rankPickerSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  rankPickerTitle: { fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  rankPickerScrollContent: {
    paddingBottom: 8,
    paddingRight: 14,
  },
  rankPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  rankPickerRowText: { flex: 1 },
  rankPickerYouBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 12,
    marginBottom: 8,
  },
  resultBadge: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4,
    minWidth: 76, alignItems: 'center',
  },
  matchInfo: { flex: 1 },
  matchScores: { alignItems: 'flex-end' },
});
