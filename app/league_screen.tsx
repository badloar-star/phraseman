import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Animated, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import AnimatedFrame from '../components/AnimatedFrame';
import { getBotAvatarData } from '../constants/avatars';
import {
  LEAGUES, GroupMember,
  checkLeagueOnAppOpen,
} from './league_engine';
import { checkAchievements } from './achievements';
import ClubBoostActivator from '../components/ClubBoostActivator';
import { getAvatarImageByIndex } from '../constants/avatars';

// NPC-заглушки для одиночного режима (пока нет Firebase)
const NPC_NAMES_RU = [
  'Алексей_K','Мария_П','Дмитрий_С','Анна_В','Сергей_М',
  'Елена_Т','Игорь_Р','Ольга_Н','Андрей_Ф','Татьяна_Ж',
  'Николай_Б','Светлана_Г','Павел_Д','Ирина_Л','Виктор_З',
  'Наталья_Е','Роман_Х','Юлия_О','Артём_У','Валерия_Ш',
];
const NPC_NAMES_UK = [
  'Олексій_К','Марія_П','Дмитро_С','Анна_В','Сергій_М',
  'Олена_Т','Ігор_Р','Ольга_Н','Андрій_Ф','Тетяна_Ж',
  'Микола_Б','Світлана_Г','Павло_Д','Ірина_Л','Віктор_З',
  'Наталя_Є','Роман_Х','Юлія_О','Артем_У','Валерія_Ш',
];

const generateNPCGroup = (myName: string, myPoints: number, lang: string): GroupMember[] => {
  const names = lang === 'uk' ? NPC_NAMES_UK : NPC_NAMES_RU;
  const seed = myName.length + myPoints;
  const bots: GroupMember[] = names.slice(0, 19).map((name, i) => ({
    name,
    points: Math.max(0, myPoints + Math.floor(Math.sin(seed + i * 7) * 80) + (i % 3) * 20),
    isMe: false,
  }));
  bots.push({ name: myName, points: myPoints, isMe: true });
  return bots.sort((a, b) => b.points - a.points);
};

// Генерируем NPC-участников для чужих клубов (реалистичные точки по уровню)
const generateLeagueNPCs = (leagueId: number, lang: string): GroupMember[] => {
  const names = lang === 'uk' ? NPC_NAMES_UK : NPC_NAMES_RU;
  const bases   = [12, 35, 75, 140, 220, 320];
  const spreads = [8,  20, 35,  50,  60,  80];
  const base   = bases[leagueId]   ?? 12;
  const spread = spreads[leagueId] ?? 8;
  return names.map((name, i) => ({
    name,
    points: Math.max(0, base + Math.floor(Math.sin(leagueId * 11 + i * 7) * spread)),
    isMe: false,
  })).sort((a, b) => b.points - a.points);
};
import { getMyWeekPoints } from './hall_of_fame_utils';
import { getXPProgress } from '../constants/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

// ── Club icon renderer ────────────────────────────────────────────────────────
function ClubIcon({ league, size = 24, bgSize = 44 }: { league: any; size?: number; bgSize?: number }) {
  return (
    <View style={{ width: bgSize, height: bgSize, borderRadius: 12, backgroundColor: (league.color) + '22', justifyContent: 'center', alignItems: 'center' }}>
      {league.imageUri ? (
        <Image source={league.imageUri} style={{ width: size, height: size }} resizeMode="contain" />
      ) : (
        <Ionicons name={(league as any).ionIcon ?? 'trophy'} size={size} color={league.color} />
      )}
    </View>
  );
}

// ── NPC profile generation (seeded by name) ──────────────────────────────────
const seedNum = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
};

const getNPCStreak = (name: string, pts: number = 50): number => {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const h = seedNum(name + String(weekNum));
  const maxStreak = pts > 200 ? 30 : pts > 100 ? 21 : pts > 40 ? 14 : 7;
  return 1 + (h % maxStreak);
};
const APP_EPOCH_MS_LEAGUE = new Date('2026-01-01').getTime();
const getNPCWeekBase = (name: string, pts: number): number => {
  const h = seedNum(name);
  const factor = 0.8 + (h % 20) / 50; // 0.8–1.2
  return Math.max(5, Math.round(pts * factor));
};
const getNPCTotalXP = (name: string, pts: number): number => {
  const weeksSinceEpoch = Math.max(1, Math.floor((Date.now() - APP_EPOCH_MS_LEAGUE) / (7 * 24 * 60 * 60 * 1000)));
  const base = getNPCWeekBase(name, pts);
  const h = seedNum(name);
  const variation = h % Math.max(1, base * 2);
  return Math.max(base, Math.round(base * 0.8) * weeksSinceEpoch + variation);
};
const getNPCLeagueIdx = (pts: number) => pts > 300 ? 5 : pts > 200 ? 4 : pts > 120 ? 3 : pts > 60 ? 2 : pts > 20 ? 1 : 0;

// ── Player Profile Modal ──────────────────────────────────────────────────────
interface PlayerInfo { name: string; points: number; isMe: boolean; leagueId: number; }

function PlayerProfileModal({
  player, isUK, t, f, myAvatarEmoji, myFrameId, onClose,
}: {
  player: PlayerInfo | null; isUK: boolean; t: any; f: any;
  myAvatarEmoji: string; myFrameId: string; onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (player) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
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

  const getBotData = () => {
    if (player.isMe) {
      const isNumeric = myAvatarEmoji && /^\d+$/.test(myAvatarEmoji);
      return {
        image: isNumeric ? getAvatarImageByIndex(parseInt(myAvatarEmoji)) : undefined,
        emoji: myAvatarEmoji,
        frameId: myFrameId,
        level: 1
      };
    }
    const botDataRaw = getBotAvatarData(player.name, getNPCWeekBase(player.name, player.points));
    const isNumeric = botDataRaw.emoji && /^\d+$/.test(botDataRaw.emoji);
    return {
      image: isNumeric ? getAvatarImageByIndex(parseInt(botDataRaw.emoji)) : undefined,
      emoji: botDataRaw.emoji,
      frameId: botDataRaw.frameId,
      level: botDataRaw.level
    };
  };

  const botData    = getBotData();
  const streak     = player.isMe ? null : getNPCStreak(player.name, player.points);
  const totalXP    = getNPCTotalXP(player.name, player.points);
  const leagueIdx  = player.isMe ? player.leagueId : getNPCLeagueIdx(player.points);
  const league     = LEAGUES[leagueIdx] ?? LEAGUES[0];
  const { level }  = getXPProgress(totalXP);

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
          {/* Drag handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 20 }} />

          {/* Avatar + frame */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <AnimatedFrame image={botData.image} emoji={botData.emoji} frameId={botData.frameId} size={68} />
            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: f.h2, fontWeight: '700', color: t.textPrimary }}>
                {player.name}{player.isMe ? (isUK ? ' (ти)' : ' (ты)') : ''}
              </Text>
            </View>
          </View>

          {/* Stats grid */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: f.numMd, fontWeight: '700', color: '#FFD700' }}>{player.points}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>{isUK ? 'очки тижня' : 'очки недели'}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>Lv.{level}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>{isUK ? 'рівень' : 'уровень'}</Text>
            </View>
            {!player.isMe && streak !== null && (
              <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: f.numMd, fontWeight: '700', color: t.textPrimary }}>🔥{streak}</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 3 }}>{isUK ? 'днів поспіль' : 'дней подряд'}</Text>
              </View>
            )}
          </View>

          {/* League */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bgSurface, borderRadius: 14, padding: 14 }}>
            <ClubIcon league={league} size={22} bgSize={42} />
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

export default function LeagueScreen() {
  const router = useRouter();
  const { theme: t , f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [myLeagueId, setMyLeagueId]     = useState(0);
  const [group, setGroup]               = useState<GroupMember[]>([]);
  const [weekPoints, setWeekPoints]     = useState(0);
  const [expandedId, setExpanded]       = useState<number | null>(null);
  const [descModal, setDescModal]       = useState<{ nameRU:string; nameUK:string; descRU:string; descUK:string } | null>(null);
  const [showAll, setShowAll]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [profilePlayer, setProfile]     = useState<PlayerInfo | null>(null);
  const [myAvatarEmoji, setMyAvatarEmoji] = useState('🐣');
  const [myFrameId, setMyFrameId]         = useState('plain');
  const [showBoostActivator, setShowBoostActivator] = useState(false);
  const [userName, setUserName]         = useState('');
  const [playerPhrasm, setPlayerPhrasm] = useState(0);
  const [playerXP, setPlayerXP]         = useState(0);
  const [boostNotification, setBoostNotification] = useState('');

  useEffect(() => {
    const load = async () => {
      const [name, wp, avatar, frame, phrasm, xp] = await Promise.all([
        AsyncStorage.getItem('user_name'),
        getMyWeekPoints(),
        AsyncStorage.getItem('user_avatar'),
        AsyncStorage.getItem('user_frame'),
        AsyncStorage.getItem('user_phrasm'),
        AsyncStorage.getItem('user_total_xp'),
      ]);
      const n  = name || '';
      setUserName(n);
      setWeekPoints(wp);
      setPlayerPhrasm(parseInt(phrasm || '0', 10));
      setPlayerXP(parseInt(xp || '0', 10));
      if (avatar) setMyAvatarEmoji(avatar);
      if (frame)  setMyFrameId(frame);
      const { state, result } = await checkLeagueOnAppOpen(n, wp);
      setMyLeagueId(state.leagueId);
      if (result?.promoted) {
        checkAchievements({ type: 'league_promoted', newLeagueId: state.leagueId }).catch(() => {});
      }
      // TODO (Firebase): при подключении Firebase реализовать группировку как у Duolingo:
      // В начале каждой недели (понедельник 00:00) брать всех активных пользователей,
      // сортировать по уровню лиги, внутри каждого уровня случайно нарезать на группы по 20-30 человек.
      // Каждый видит только свою группу. В воскресенье 23:59 топ-15% → повышение, нижние 10% → понижение.
      // Пока Firebase не подключён — используем NPC-ботов.
      const realGroup = state.group.filter((m: GroupMember) => !m.isMe);
      const finalGroup = realGroup.length < 3
        ? generateNPCGroup(n, wp, lang)
        : state.group;
      setGroup(finalGroup);
      setExpanded(state.leagueId);
      setLoading(false);
    };
    load();
  }, []);

  const myLeague = LEAGUES[myLeagueId];

  const sortedGroup = [...group].sort((a, b) => b.points - a.points);
  const myRank      = sortedGroup.findIndex(m => m.isMe) + 1;
  const total       = sortedGroup.length;
  const topCutoff   = Math.max(1, Math.ceil(total * 0.15));
  const leaguesDesc = [...LEAGUES].reverse();

  if (loading) return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <Text style={{ color:t.textMuted }}>...</Text>
      </View>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      {/* Хедер */}
      <View style={{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize: f.h2, fontWeight:'700', marginLeft:8, flex:1 }}>
          {isUK ? 'Клуб тижня' : 'Клуб недели'}
        </Text>
        <TouchableOpacity
          onPress={() => setShowBoostActivator(true)}
          style={{
            backgroundColor: t.accent + '22',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 16 }}>⚡</Text>
          <Text style={{ color: t.accent, fontWeight: '700', fontSize: f.sub }}>
            {isUK ? 'Буст' : 'Буст'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding:16, gap:12 }}>

        {/* ── Моя лига ── */}
        <View style={{ backgroundColor:t.bgCard, borderRadius:16, padding:16, borderWidth:0.5, borderColor:t.border }}>
          <Text style={{ color:t.textMuted, fontSize: f.label, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
            {isUK ? 'Твій клуб' : 'Твой клуб'}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <Text style={{ fontSize: f.numLg + 10 }}>{myLeague.icon}</Text>
            <View style={{ flex:1 }}>
              <Text style={{ color:t.textPrimary, fontSize: f.h1, fontWeight:'700' }}>
                {isUK ? myLeague.nameUK : myLeague.nameRU}
              </Text>
              <Text style={{ color:t.textSecond, fontSize: f.sub, marginTop:2 }}>
                {weekPoints} {isUK ? 'досвіду цього тижня' : 'опыта этой недели'}
              </Text>
            </View>

          </View>

          <View style={{ marginTop:14, paddingTop:14, borderTopWidth:0.5, borderTopColor:t.border, gap:6 }}>
            {/* Место в таблице */}
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={{ color:t.textSecond, fontSize: f.sub, fontWeight:'600' }}>
                {isUK ? `Місце #${myRank} з ${total}` : `Место #${myRank} из ${total}`}
              </Text>
            </View>
            {/* Статус */}
            {myLeagueId === LEAGUES.length - 1 ? (
              <Text style={{ color:myLeague.color, fontSize: f.sub, fontWeight:'600' }}>
                {isUK ? '👑 Вищий клуб!' : '👑 Высший клуб!'}
              </Text>
            ) : myRank <= topCutoff ? (
              <Text style={{ color:t.correct, fontSize: f.sub, fontWeight:'600' }}>
                🏆 {isUK ? 'Ти в зоні підвищення!' : 'Ты в зоне повышения!'}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Все лиги ── */}
        <Text style={{ color:t.textMuted, fontSize: f.label, textTransform:'uppercase', letterSpacing:0.8, marginTop:4 }}>
          {isUK ? 'Всі клуби' : 'Все клубы'}
        </Text>

        {leaguesDesc.map(league => {
          const isMyLeague = league.id === myLeagueId;
          const isExpanded = expandedId === league.id;
          const players = isMyLeague ? sortedGroup : generateLeagueNPCs(league.id, lang);

          return (
            <TouchableOpacity
              key={league.id}
              style={{
                backgroundColor: isMyLeague ? t.bgSurface : t.bgCard,
                borderRadius: 16,
                borderWidth: isMyLeague ? 1.5 : 0.5,
                borderColor: isMyLeague ? t.textSecond : t.border,
                overflow: 'hidden',
              }}
              onPress={() => setExpanded(isExpanded ? null : league.id)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection:'row', alignItems:'center', padding:14, gap:12 }}>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setDescModal(league); }}
                  hitSlop={{ top:6, bottom:6, left:6, right:6 }}
                >
                  <ClubIcon league={league} size={24} bgSize={44} />
                </TouchableOpacity>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <Text style={{ color:t.textPrimary, fontSize: f.bodyLg, fontWeight:'700' }}>
                      {isUK ? league.nameUK : league.nameRU}
                    </Text>
                    {isMyLeague && (
                      <View style={{ backgroundColor:t.textSecond, borderRadius:6, paddingHorizontal:6, paddingVertical:2 }}>
                        <Text style={{ color:t.bgPrimary, fontSize: f.label, fontWeight:'700' }}>
                          {isUK ? 'Твій' : 'Твой'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {isMyLeague && (
                    <Text style={{ color:t.textMuted, fontSize: f.caption, marginTop:2 }}>
                      {isUK ? 'Твій поточний клуб' : 'Твой текущий клуб'}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems:'flex-end', gap:2 }}>
                  {isMyLeague && (
                    <Text style={{ color:t.textSecond, fontSize: f.sub, fontWeight:'600' }}>
                      {players.length} {isUK ? 'учасн.' : 'участн.'}
                    </Text>
                  )}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16} color={t.textGhost}
                  />
                </View>
              </View>

              {isExpanded && (
                <View style={{ borderTopWidth:0.5, borderTopColor:t.border }}>
                  {players.length === 0 ? (
                    <Text style={{ color:t.textGhost, fontSize: f.sub, padding:16, textAlign:'center' }}>
                      {isMyLeague
                        ? (isUK ? 'Ще немає учасників' : 'Пока нет участников')
                        : (isUK ? 'Дані будуть після Firebase' : 'Данные появятся после подключения Firebase')
                      }
                    </Text>
                  ) : (
                    (isMyLeague && showAll ? players : players.slice(0, 5)).map((p, i) => (
                      <TouchableOpacity
                        key={p.name}
                        activeOpacity={0.7}
                        onPress={() => setProfile({ name: p.name, points: p.points, isMe: p.isMe, leagueId: myLeagueId })}
                        style={{
                          flexDirection:'row', alignItems:'center',
                          paddingHorizontal:16, paddingVertical:11,
                          borderBottomWidth: 0.5,
                          borderBottomColor: t.border,
                          backgroundColor: p.isMe ? t.bgSurface : 'transparent',
                        }}
                      >
                        <Text style={{ width:36, fontSize: i < 3 ? 18 : 14, color:t.textPrimary }}>
                          {i < 3 ? MEDALS[i] : `${i + 1}`}
                        </Text>
                        <Text style={{
                          flex:1, fontSize: f.body,
                          color: p.isMe ? t.textPrimary : t.textSecond,
                          fontWeight: p.isMe ? '700' : '400',
                        }}>
                          {p.name}{p.isMe ? (isUK ? ' (ти)' : ' (ты)') : ''}
                        </Text>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
                          <Ionicons name="star" size={11} color={i < 3 ? '#FFD700' : t.textMuted} />
                          <Text style={{ color: i < 3 ? '#FFD700' : t.textMuted, fontSize: f.body, fontWeight:'600' }}>
                            {p.points}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                  {isMyLeague && players.length > 5 && (
                    <TouchableOpacity
                      onPress={() => setShowAll(v => !v)}
                      style={{ padding:12, alignItems:'center' }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color:t.textSecond, fontSize: f.caption, fontWeight:'600' }}>
                        {showAll
                          ? (isUK ? '▲ Згорнути' : '▲ Свернуть')
                          : `+${players.length - 5} ${isUK ? 'ще' : 'ещё'}`
                        }
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

      </ScrollView>
      </ContentWrap>

      <PlayerProfileModal
        player={profilePlayer}
        isUK={isUK}
        t={t}
        f={f}
        myAvatarEmoji={myAvatarEmoji}
        myFrameId={myFrameId}
        onClose={() => setProfile(null)}
      />

      {/* Описание клуба — попап при тапе на иконку */}
      <Modal
        visible={descModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDescModal(null)}
      >
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:24 }} onPress={() => setDescModal(null)}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor:t.bgCard, borderRadius:20, padding:24, maxWidth:360, borderWidth:0.5, borderColor:t.border }}>
              <Text style={{ color:t.textPrimary, fontSize:f.h2, fontWeight:'800', marginBottom:12, textAlign:'center' }}>
                {descModal ? (isUK ? descModal.nameUK : descModal.nameRU) : ''}
              </Text>
              <Text style={{ color:t.textSecond, fontSize:f.body, lineHeight:22, textAlign:'center' }}>
                {descModal ? (isUK ? descModal.descUK : descModal.descRU) : ''}
              </Text>
              <TouchableOpacity
                onPress={() => setDescModal(null)}
                style={{ marginTop:20, backgroundColor:t.accent, borderRadius:12, paddingVertical:12, alignItems:'center' }}
              >
                <Text style={{ color:'#fff', fontWeight:'700', fontSize:f.body }}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Club Boost Activator */}
      <ClubBoostActivator
        visible={showBoostActivator}
        onClose={() => setShowBoostActivator(false)}
        playerName={userName}
        playerPhrasm={playerPhrasm}
        playerXP={playerXP}
        onBoostActivated={(boostId, notification) => {
          setBoostNotification(notification);
          Alert.alert(
            isUK ? 'Буст активований!' : 'Буст активирован!',
            notification
          );
        }}
      />
    </SafeAreaView>
    </ScreenGradient>
  );
}

