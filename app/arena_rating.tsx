import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import XpGainBadge from '../components/XpGainBadge';
import {
  ARENA_RATING_SCREEN_CACHE_KEY,
  fetchAndCacheArenaRating,
  sanitizeArenaProfileForRating,
  sanitizeArenaRatingHistory,
} from './arena_rating_cache';
import { ArenaProfile, RankTier, RankLevel } from './types/arena';
import { getRankImage } from '../hooks/use-arena-rank';
import { emitAppEvent } from './events';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';

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

export function arenaTierLabel(tier: RankTier, lang: Lang): string {
  return triLang(lang, { ru: RANK_NAMES[tier], uk: RANK_NAMES_UK[tier], es: RANK_NAMES_ES[tier] });
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

export default function DuelRatingScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [myProfile, setMyProfile] = useState<ArenaProfile | null>(null);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ARENA_RATING_SCREEN_CACHE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as { profile?: unknown; history?: unknown };
          const profile = sanitizeArenaProfileForRating(parsed.profile ?? null);
          const history = sanitizeArenaRatingHistory(parsed.history);
          if (profile) setMyProfile(profile);
          setMatchHistory(history);
          setLoading(false);
        }
      } catch { /* use full load */ }
      if (!cancelled) void loadData();
    })();
    return () => { cancelled = true; };
  }, []);

  const loadData = async () => {
    setLoadError(false);
    try {
      const data = await fetchAndCacheArenaRating();
      if (data) {
        if (data.profile) setMyProfile(data.profile);
        setMatchHistory(data.history);
      }
    } catch {
      setLoadError(true);
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось загрузить историю арены.',
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

  return (
    <ScreenGradient>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/home' as any); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Image source={require('../assets/images/levels/ARENA  ICON.png')} style={{ width: 44, height: 44 }} resizeMode="contain" />
          <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700' }}>
            {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Моя карточка */}
        <LinearGradient
          colors={t.cardGradient}
          style={[styles.myCard, { borderColor: t.border }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.myCardLeft}>
            <Image source={getRankImage(myRankTier, myRankLevel)} style={{ width: 48, height: 48 }} resizeMode="contain" />
            <View>
              <Text style={[styles.myRankName, { color: t.textPrimary, fontSize: f.h2 }]}>
                {arenaTierLabel(myRankTier, lang)} {myRankLevel}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {(() => {
                  const n = myProfile?.stats?.matchesPlayed ?? 0;
                  return triLang(lang, {
                    ru: `${myXP} XP · ${n} игр`,
                    uk: `${myXP} XP · ${n} ігор`,
                    es: `${myXP} XP · ${n} ${n === 1 ? 'duelo' : 'duelos'}`,
                  });
                })()}
              </Text>
            </View>
          </View>
          <View style={styles.myCardRight}>
            <Stars count={myStars} color={t.gold} />
            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }}>
              {triLang(lang, {
                ru: `${myStars}/3 до повышения`,
                uk: `${myStars}/3 до підвищення`,
                es: `${myStars}/3 para subir de rango`,
              })}
            </Text>
          </View>
        </LinearGradient>

        {/* История матчей */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
            {triLang(lang, {
              ru: 'История матчей',
              uk: 'Історія матчів',
              es: 'Historial de duelos',
            })}
          </Text>

          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator size="large" color={t.accent} />
            </View>
          )}

          {!loading && matchHistory.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>⚔️</Text>
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginBottom: loadError ? 14 : 0 }}>
                {loadError
                  ? triLang(lang, {
                      ru: 'Не удалось получить историю матчей',
                      uk: 'Не вдалося завантажити історію матчів',
                      es: 'No se ha podido cargar el historial de duelos.',
                    })
                  : triLang(lang, {
                      ru: 'Сыграй первый матч,\nи он появится здесь',
                      uk: 'Зіграй перший матч,\nі він з’явиться тут',
                      es: 'Juega tu primer duelo\ny aparecerá aquí.',
                    })}
              </Text>
              {loadError && (
                <TouchableOpacity onPress={loadData} style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '700' }}>
                    {triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' })}
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
  myCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myRankName: { fontWeight: '800' },
  myCardRight: { alignItems: 'flex-end' },

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
