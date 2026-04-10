import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import AnimatedFrame from '../../components/AnimatedFrame';
import ContentWrap from '../../components/ContentWrap';
import { getLeague, useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { useTheme } from '../../components/ThemeContext';
import { getAvatarImageByIndex, getBestAvatarForLevel, getBestFrameForLevel, getBotAvatarData } from '../../constants/avatars';
import { getLevelFromXP } from '../../constants/theme';
import {
    addOrUpdateScore,
    getMyWeekPoints, LeaderEntry,
    loadLeaderboard,
    pointsForAnswer,
    streakMultiplier,
} from '../hall_of_fame_utils';
import { LEAGUES, loadLeagueState } from '../league_engine';
import { useTabNav } from '../TabContext';
import EnergyBar from '../../components/EnergyBar';

export { addOrUpdateScore, pointsForAnswer, streakMultiplier };

const MEDALS = ['🥇','🥈','🥉'];

// Fisher-Yates shuffle
const shuffle = <T,>(a: T[]): T[] => { const r=[...a]; for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];} return r; };

// ── NPC profile helpers ───────────────────────────────────────────────────────
const hofSeed = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
};
const getNPCHoFStreak = (name: string, weekBase: number = 50): number => {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const h = hofSeed(name + String(weekNum));
  const maxStreak = weekBase >= 150 ? 30 : weekBase >= 80 ? 21 : weekBase >= 30 ? 14 : 7;
  return 1 + (h % maxStreak);
};
const getNPCHoFLeagueIdx = (pts: number) =>
  pts > 300 ? 5 : pts > 200 ? 4 : pts > 120 ? 3 : pts > 60 ? 2 : pts > 20 ? 1 : 0;

interface HoFPlayerInfo { name: string; points: number; isMe: boolean; }

function HoFProfileModal({
  player, myAvatar, myFrame, myTotalXP, myLeague, isUK, t, f, onClose,
}: {
  player: HoFPlayerInfo | null;
  myAvatar: string; myFrame: string; myTotalXP: number;
  myLeague: typeof LEAGUES[0] | null;
  isUK: boolean; t: any; f: any; onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (player) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [player]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };

  if (!player) return null;

  const isMe = player.isMe;
  const npc = NPC_PLAYERS.find(n => n.name === player.name);
  const isMyAvatarNumeric = myAvatar && /^\d+$/.test(myAvatar);
  const avatarData = isMe
    ? { image: isMyAvatarNumeric ? getAvatarImageByIndex(parseInt(myAvatar)) : undefined, emoji: myAvatar, frameId: myFrame }
    : npc
      ? (() => {
        const botData = getBotAvatarData(npc.name, npc.weekBase);
        const isBotAvatarNumeric = botData.emoji && /^\d+$/.test(botData.emoji);
        return {
          image: isBotAvatarNumeric ? getAvatarImageByIndex(parseInt(botData.emoji)) : undefined,
          emoji: botData.emoji,
          frameId: botData.frameId,
          level: botData.level
        };
      })()
      : { image: getAvatarImageByIndex(1), emoji: '1', frameId: 'plain', level: 1 };

  const level     = isMe ? getLevelFromXP(myTotalXP) : ((avatarData as any).level ?? 1);
  const streak    = isMe ? null : getNPCHoFStreak(player.name, npc?.weekBase ?? 50);
  const leagueIdx = isMe
    ? (myLeague ? LEAGUES.findIndex(l => l.id === myLeague.id) : 0)
    : getNPCHoFLeagueIdx(player.points);
  const league    = LEAGUES[Math.max(0, leagueIdx)] ?? LEAGUES[0];

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeAnim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <Animated.View style={{
          backgroundColor: t.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
          transform: [{ translateY: slideAnim }],
          borderTopWidth: 0.5, borderColor: t.border,
        }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <AnimatedFrame image={avatarData.image} emoji={avatarData.emoji} frameId={avatarData.frameId} size={72} />
            <Text style={{ fontSize: f.h2, fontWeight: '700', color: t.textPrimary, marginTop: 10 }}>
              {player.name}{isMe ? (isUK ? ' (ти)' : ' (ты)') : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: f.numMd, fontWeight: '700', color: '#FFD700' }}>{player.points}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>{isUK ? 'очки тижня' : 'очки недели'}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>Lv.{level}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>{isUK ? 'рівень' : 'уровень'}</Text>
            </View>
            {!isMe && streak !== null && (
              <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>🔥{streak}</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>{isUK ? 'днів поспіль' : 'дней подряд'}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14 }}>
            <Text style={{ fontSize: 28 }}>{league.icon}</Text>
            <View>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {isUK ? league.nameUK : league.nameRU}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub }}>
                {isUK ? 'поточний клуб' : 'текущий клуб'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── NPC Боты — заполняют рейтинг если мало реальных игроков ─────────────────
const NPC_PLAYERS = [
  // Топ-игроки
  { name: 'LinguaMaster',  weekBase: 200 },
  { name: 'GrammarKing',   weekBase: 170 },
  { name: 'Олег Б.',       weekBase: 155 },
  { name: 'PhrasePro',     weekBase: 140 },
  { name: 'Max W.',        weekBase: 130 },
  { name: 'Тетяна М.',     weekBase: 115 },
  { name: 'Саша Г.',       weekBase: 105 },
  { name: 'Макс К.',       weekBase: 95  },
  { name: 'WordNinja',     weekBase: 88  },
  { name: 'Lior B.',       weekBase: 80  },
  // Средний уровень
  { name: 'Lena_V',        weekBase: 72  },
  { name: 'EnglishHero',   weekBase: 65  },
  { name: 'Ірина П.',      weekBase: 58  },
  { name: 'Sofia_L',       weekBase: 52  },
  { name: 'Verbmaster99',  weekBase: 46  },
  { name: 'QuizQueen',     weekBase: 42  },
  { name: 'PhraseHunter',  weekBase: 38  },
  { name: 'Катя Р.',       weekBase: 34  },
  { name: 'WordWatcher',   weekBase: 30  },
  { name: 'Дмитро Л.',     weekBase: 27  },
  { name: 'StudyBuddy',    weekBase: 24  },
  { name: 'Anna K.',       weekBase: 21  },
  { name: 'EduFan',        weekBase: 19  },
  { name: 'Роман В.',      weekBase: 17  },
  { name: 'LearnDaily',    weekBase: 15  },
  // Новички / нечастые
  { name: 'Beginner_B',    weekBase: 13  },
  { name: 'NoviceNick',    weekBase: 11  },
  { name: 'Соня М.',       weekBase: 10  },
  { name: 'DailyLearner',  weekBase: 8   },
  { name: 'Юра Т.',        weekBase: 7   },
  { name: 'EnglishFan',    weekBase: 6   },
  { name: 'Аліна С.',      weekBase: 5   },
  { name: 'Vik_L',         weekBase: 4   },
  { name: 'NewBee22',      weekBase: 3   },
  { name: 'Петро К.',      weekBase: 2   },
];

// Детерминированный псевдо-рандом по имени и неделе — накапливается по дням.
// dailyGain пропорционален weekBase: активные игроки набирают больше в день.
const npcWeekPoints = (base: number, seed: string): number => {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

  // Пропускные дни — менее активные боты иногда пропускают день
  const skipChance = base < 15 ? 3 : base < 40 ? 5 : 8; // чем ниже база — чаще пропускают

  let total = 0;
  for (let d = 0; d <= dayOfWeek; d++) {
    let h = (weekNum * 7 + d) * 31337;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;

    // Иногда бот не заходит
    if (Math.abs(h) % skipChance === 0) continue;

    // Дневной прирост пропорционален базе: топ-боты набирают 10-60, новички 1-8
    const maxDaily = Math.max(4, Math.round(base / 4));
    const dailyGain = 1 + (Math.abs(h) % maxDaily);
    total += dailyGain;
  }

  return Math.max(base, total);
};

// Накопленный XP бота за всё время с эпохи 2026-01-01
const APP_EPOCH_MS_HOF = new Date('2026-01-01').getTime();
const npcTotalXP = (base: number, seed: string): number => {
  const weeksSinceEpoch = Math.max(1, Math.floor((Date.now() - APP_EPOCH_MS_HOF) / (7 * 24 * 60 * 60 * 1000)));
  const avgWeekly = Math.round(base * 0.8); // ~80% активных дней
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  const variation = h % Math.max(1, base * 2);
  return Math.max(base, avgWeekly * weeksSinceEpoch + variation);
};

// ── NPC случайные обновления раз в 3 часа ────────────────────────────────────
const NPC_UPDATES_KEY = 'npc_bot_updates';

interface NPCUpdates {
  lastUpdate3h: string;    // ISO-timestamp
  lastUpdateDaily: string; // YYYY-MM-DD
  deltas: Record<string, number>;
}

async function updateNPCDeltas(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(NPC_UPDATES_KEY);
    const data: NPCUpdates = raw
      ? JSON.parse(raw)
      : { lastUpdate3h: '', lastUpdateDaily: '', deltas: {} };

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    let changed = false;

    // Каждые 3 часа: 10-20 случайных ботов получают 3-188 XP
    const THREE_H = 3 * 60 * 60 * 1000;
    if (!data.lastUpdate3h || now - new Date(data.lastUpdate3h).getTime() >= THREE_H) {
      const count = 10 + Math.floor(Math.random() * 11);
      const shuffled = shuffle([...NPC_PLAYERS]).slice(0, count);
      for (const npc of shuffled) {
        const gain = 3 + Math.floor(Math.random() * 186);
        data.deltas[npc.name] = (data.deltas[npc.name] ?? 0) + gain;
      }
      data.lastUpdate3h = new Date(now).toISOString();
      changed = true;
    }

    // Раз в день: 1-3 топ-бота получают +500
    if (data.lastUpdateDaily !== today) {
      const topBots = NPC_PLAYERS.slice(0, 10);
      const count = 1 + Math.floor(Math.random() * 3);
      const chosen = shuffle([...topBots]).slice(0, count);
      for (const npc of chosen) {
        data.deltas[npc.name] = (data.deltas[npc.name] ?? 0) + 500;
      }
      data.lastUpdateDaily = today;
      changed = true;
    }

    if (changed) await AsyncStorage.setItem(NPC_UPDATES_KEY, JSON.stringify(data));
    return data.deltas;
  } catch {
    return {};
  }
}

const mergeWithNPC = (realBoard: LeaderEntry[], myName: string, deltas: Record<string, number> = {}): LeaderEntry[] => {
  // Берём только тех NPC которых нет в реальном рейтинге
  const realNames = new Set(realBoard.map(e => e.name.toLowerCase()));
  const npcEntries: LeaderEntry[] = NPC_PLAYERS
    .filter(n => !realNames.has(n.name.toLowerCase()) && n.name !== myName)
    .map(n => ({
      name: n.name,
      points: npcTotalXP(n.weekBase, n.name) + (deltas[n.name] ?? 0),
      lang: 'ru',
    }));

  // Объединяем и сортируем
  const combined = [...realBoard, ...npcEntries]
    .sort((a, b) => b.points - a.points)
    .slice(0, 50); // топ-50

  return combined;
};

export default function HallOfFame() {
  const { goHome } = useTabNav();
  const flatListRef = useRef<any>(null);
  const { activeIdx } = useTabNav();

  useEffect(() => {
    if (activeIdx === 3 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [activeIdx]);

  const [board, setBoard]        = useState<LeaderEntry[]>([]);
  const [myName, setMyName]      = useState('');
  const [weekPoints, setWeekPts] = useState(0);
  const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);
  const [myAvatar, setMyAvatar]      = useState('🐣');
  const [myFrame, setMyFrame]        = useState('plain');
  const [myTotalXP, setMyTotalXP]   = useState(0);
  const [profilePlayer, setProfile] = useState<HoFPlayerInfo | null>(null);
  const { theme: t , f } = useTheme();
  const { s, lang } = useLang();
  const isUK = lang === 'uk';

  const load = async () => {
    const [b, name, wp, ls, xp, avatar, frame, deltas] = await Promise.all([
      loadLeaderboard(),
      AsyncStorage.getItem('user_name'),
      getMyWeekPoints(),
      loadLeagueState(),
      AsyncStorage.getItem('user_total_xp'),
      AsyncStorage.getItem('user_avatar'),
      AsyncStorage.getItem('user_frame'),
      updateNPCDeltas(),
    ]);
    const merged = mergeWithNPC(b, name || '', deltas);
    setBoard(merged);
    if (name) setMyName(name);
    setWeekPts(wp);
    if (ls) setEngineLeague(LEAGUES.find(l => l.id === ls.leagueId) || null);
    const xpNum = parseInt(xp || '0') || 0;
    const lvl = getLevelFromXP(xpNum);
    setMyTotalXP(xpNum);
    setMyAvatar(avatar || getBestAvatarForLevel(lvl));
    setMyFrame(frame   || getBestFrameForLevel(lvl).id);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeIdx === 3) load();
  }, [activeIdx]);

  const myRank = board.findIndex(e => e.name === myName);
  const league = getLeague(weekPoints, lang);
  const displayLeague = engineLeague
    ? { name: isUK ? engineLeague.nameUK : engineLeague.nameRU }
    : league;

  return (
    <ScreenGradient>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, paddingBottom:24, paddingTop:16 }}>
        <TouchableOpacity
          style={{ width:36, height:36, borderRadius:18, backgroundColor:t.bgCard, borderWidth:0.5, borderColor:t.border, justifyContent:'center', alignItems:'center', marginRight:12 }}
          onPress={() => goHome()}
        >
          <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: f.h2 + 6, fontWeight: '700', flex:1 }}>
          {s.hallFame.title}
        </Text>
        <EnergyBar size={16} />
      </View>

      {myName !== '' && (
        <View style={{
          marginHorizontal: 16, marginBottom: 8, backgroundColor: t.bgCard,
          borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: t.border,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <AnimatedFrame image={/^\d+$/.test(myAvatar) ? getAvatarImageByIndex(parseInt(myAvatar)) : undefined} emoji={myAvatar} frameId={myFrame} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>{myName}</Text>
            <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }}>
              {displayLeague.name}
            </Text>
          </View>
          {myRank >= 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: t.textMuted, fontSize: f.label }}>{isUK ? 'Місце' : 'Место'}</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }} adjustsFontSizeToFit numberOfLines={1}>#{myRank + 1}</Text>
            </View>
          )}
        </View>
      )}

      {board.length > 0 && (
        <View style={{
          flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8,
          borderBottomWidth: 0.5, borderBottomColor: t.border,
        }}>
          <Text style={{ width: 44, color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>#</Text>
          <Text style={{ flex: 1, color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>
            {isUK ? 'Учасник' : 'Участник'}
          </Text>
          <Text style={{ color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>
            {isUK ? 'Досвід' : 'Опыт'}
          </Text>
        </View>
      )}

      {board.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard,
            borderWidth: 1, borderColor: t.border, justifyContent: 'center',
            alignItems: 'center', marginBottom: 20,
          }}>
            <Ionicons name="trophy-outline" size={36} color={t.textSecond} />
          </View>
          <Text style={{ color: t.textMuted, fontSize: f.bodyLg, textAlign: 'center', lineHeight: 26 }}>
            {s.hallFame.empty}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={board}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item, index }) => {
            const isTop3 = index < 3;
            const isMe   = item.name === myName;
            // Аватарка: своя или бота
            const npc = NPC_PLAYERS.find(n => n.name === item.name);
            const getAvatarData = () => {
              if (isMe) {
                const isNumeric = myAvatar && /^\d+$/.test(myAvatar);
                return { image: isNumeric ? getAvatarImageByIndex(parseInt(myAvatar)) : undefined, emoji: myAvatar, frameId: myFrame };
              }
              if (npc) {
                const d = getBotAvatarData(npc.name, npc.weekBase);
                const isNumeric = d.emoji && /^\d+$/.test(d.emoji);
                return { image: isNumeric ? getAvatarImageByIndex(parseInt(d.emoji)) : undefined, emoji: d.emoji, frameId: d.frameId };
              }
              return { image: getAvatarImageByIndex(1), emoji: '1', frameId: 'plain' };
            };
            const avatarData = getAvatarData();

            return (
              <TouchableOpacity
                onPress={() => setProfile({ name: item.name, points: item.points, isMe })}
                activeOpacity={0.7}
                style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 10,
                borderBottomWidth: 0.5, borderBottomColor: t.border,
                backgroundColor: isMe ? t.bgSurface : isTop3 ? t.bgCard : t.bgPrimary,
              }}>
                <Text style={{ width: 36, fontSize: isTop3 ? 22 : 14, color: t.textPrimary, textAlign: 'center' }}>
                  {isTop3 ? MEDALS[index] : `${index + 1}`}
                </Text>
                <AnimatedFrame image={avatarData.image} emoji={avatarData.emoji} frameId={avatarData.frameId} size={36} style={{ marginRight: 10 }} />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1, fontSize: isTop3 ? 15 : 13,
                    color: isMe ? t.textPrimary : t.textSecond,
                    fontWeight: isMe || isTop3 ? '600' : '400',
                  }}
                >
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={12} color={t.textSecond} />
                  <Text style={{ color: t.textSecond, fontSize: isTop3 ? 17 : 14, fontWeight: '600' }}>
                    {item.points}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      </ContentWrap>

      {profilePlayer && (
        <HoFProfileModal
          player={profilePlayer}
          myAvatar={myAvatar}
          myFrame={myFrame}
          myTotalXP={myTotalXP}
          myLeague={engineLeague}
          isUK={isUK}
          t={t}
          f={f}
          onClose={() => setProfile(null)}
        />
      )}
    </ScreenGradient>
  );
}

