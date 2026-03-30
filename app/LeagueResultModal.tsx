import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, Animated, TouchableOpacity,
  Dimensions, ScrollView, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { LeagueResult, LEAGUES, clearPendingResult } from './league_engine';
import { STORE_URL } from './config';

const { width: W, height: H } = Dimensions.get('window');
const MEDALS = ['🥇', '🥈', '🥉'];
const CONFETTI_COLORS = ['#FFD700','#34C759','#007AFF','#FF3B30','#AF52DE','#FF9500'];

// ─── Одна конфетти-частица ───────────────────────────────────────────────────
function ConfettiPiece({ color, delay, startX }: { color: string; delay: number; startX: number }) {
  const y   = useRef(new Animated.Value(-20)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(y,   { toValue: H + 20, duration: 2200 + Math.random()*800, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1080,   duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(op, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0,
        left: startX,
        width: 8, height: 8, borderRadius: 2,
        backgroundColor: color,
        opacity: op,
        transform: [
          { translateY: y },
          { rotate: rot.interpolate({ inputRange:[0,1080], outputRange:['0deg','1080deg'] }) },
        ],
      }}
    />
  );
}

interface Props {
  visible: boolean;
  result:  LeagueResult;
  onClose: () => void;
}

export default function LeagueResultModal({ visible, result, onClose }: Props) {
  const { theme: t } = useTheme();
  const { lang }     = useLang();
  const isUK = lang === 'uk';

  const prevLeague = LEAGUES[result.prevLeagueId] ?? LEAGUES[0];
  const newLeague  = LEAGUES[result.newLeagueId]  ?? LEAGUES[0];

  const headerScale = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const rankScale   = useRef(new Animated.Value(0)).current;
  const btnOpacity  = useRef(new Animated.Value(0)).current;
  const myRowY      = useRef(new Animated.Value(80)).current;

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!visible) return;

    // Сбрасываем
    headerScale.setValue(0);
    listOpacity.setValue(0);
    rankScale.setValue(0);
    btnOpacity.setValue(0);
    myRowY.setValue(80);

    // Последовательная анимация
    Animated.sequence([
      Animated.spring(headerScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(listOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(myRowY,      { toValue: 0, friction: 8, tension: 80,  useNativeDriver: true }),
      Animated.spring(rankScale,   { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(btnOpacity,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    if (result.promoted) {
      setTimeout(() => setShowConfetti(true), 500);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [visible]);

  const handleClose = async () => {
    await clearPendingResult();
    onClose();
  };

  const outcomeColor = result.promoted ? '#34C759' : result.demoted ? '#FF3B30' : t.textSecond;
  const outcomeIcon  = result.promoted ? 'arrow-up-circle' : result.demoted ? 'arrow-down-circle' : 'checkmark-circle';
  const outcomeText  = result.promoted
    ? (isUK ? `Підвищено до ${newLeague.nameUK}!` : `Повышен до ${newLeague.nameRU}!`)
    : result.demoted
      ? (isUK ? `Понижено до ${newLeague.nameUK}` : `Понижен до ${newLeague.nameRU}`)
      : (isUK ? 'Залишаєшся в клубі' : 'Остаёшься в клубе');

  const btnText = result.promoted
    ? (isUK ? '🚀 Вперед у новий клуб!' : '🚀 Вперёд в новый клуб!')
    : result.demoted
      ? (isUK ? 'Наступного тижня краще!' : 'В следующий раз лучше!')
      : (isUK ? 'Продовжити' : 'Продолжить');

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.88)', justifyContent:'flex-end' }}>

        {/* Конфетти при повышении */}
        {showConfetti && CONFETTI_COLORS.flatMap((color, ci) =>
          Array.from({ length: 6 }, (_, i) => (
            <ConfettiPiece
              key={`${ci}-${i}`}
              color={color}
              delay={i * 60 + ci * 30}
              startX={Math.random() * W}
            />
          ))
        )}

        <View style={{
          backgroundColor: t.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: 40, maxHeight: H * 0.9,
        }}>

          {/* Заголовок */}
          <Animated.View style={{
            alignItems: 'center', padding: 24, paddingBottom: 12,
            transform: [{ scale: headerScale }],
          }}>
            <Text style={{ fontSize: 56, marginBottom: 6 }}>{newLeague.icon}</Text>
            <Text style={{ color: t.textPrimary, fontSize: 22, fontWeight: '800' }}>
              {isUK ? 'Підсумки тижня' : 'Итоги недели'}
            </Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:8 }}>
              <Ionicons name={outcomeIcon as any} size={20} color={outcomeColor}/>
              <Text style={{ color: outcomeColor, fontSize: 16, fontWeight: '700' }}>
                {outcomeText}
              </Text>
            </View>
            {(result.promoted || result.demoted) && (
              <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 5 }}>
                {isUK
                  ? `${prevLeague.nameUK} → ${newLeague.nameUK}`
                  : `${prevLeague.nameRU} → ${newLeague.nameRU}`}
              </Text>
            )}
          </Animated.View>

          {/* Моё место */}
          <Animated.View style={{
            alignSelf: 'center',
            backgroundColor: t.bgSurface,
            borderRadius: 14, paddingHorizontal: 28, paddingVertical: 10,
            marginBottom: 14, transform: [{ scale: rankScale }],
          }}>
            <Text style={{ color: t.textMuted, fontSize: 11, textTransform:'uppercase', letterSpacing:0.8, textAlign:'center' }}>
              {isUK ? 'Твоє місце' : 'Твоё место'}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: 38, fontWeight: '800', textAlign: 'center' }}>
              #{result.myRank}
              <Text style={{ color: t.textMuted, fontSize: 18, fontWeight: '400' }}>
                {' '}/{result.totalInGroup}
              </Text>
            </Text>
          </Animated.View>

          {/* Таблица группы */}
          <Animated.View style={{ opacity: listOpacity }}>
            <Text style={{ color:t.textMuted, fontSize:11, textTransform:'uppercase', letterSpacing:0.8, paddingHorizontal:20, marginBottom:6 }}>
              {isUK ? 'Група тижня' : 'Группа недели'}
            </Text>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {result.group.slice(0, 10).map((member, i) => (
                <Animated.View
                  key={member.name}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 10,
                    backgroundColor: member.isMe
                      ? (result.promoted ? 'rgba(52,199,89,0.13)' : result.demoted ? 'rgba(255,59,48,0.1)' : t.bgSurface)
                      : 'transparent',
                    borderLeftWidth: member.isMe ? 3 : 0,
                    borderLeftColor: outcomeColor,
                    // Анимация скольжения только для моей строки
                    transform: member.isMe ? [{ translateY: myRowY }] : [],
                  }}
                >
                  <Text style={{ width:36, fontSize: i < 3 ? 20 : 14, color: t.textPrimary }}>
                    {i < 3 ? MEDALS[i] : `${i + 1}`}
                  </Text>
                  <Text style={{
                    flex: 1, fontSize: 15,
                    color: member.isMe ? t.textPrimary : t.textSecond,
                    fontWeight: member.isMe ? '700' : '400',
                  }}>
                    {member.name}{member.isMe ? (isUK ? ' (ти)' : ' (ты)') : ''}
                  </Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
                    <Ionicons name="star" size={11} color={i < 3 ? '#FFD700' : t.textMuted}/>
                    <Text style={{ color: i < 3 ? '#FFD700' : t.textMuted, fontSize:14, fontWeight:'600' }}>
                      {member.points}
                    </Text>
                  </View>
                </Animated.View>
              ))}
              {result.group.length > 10 && (
                <Text style={{ color:t.textGhost, fontSize:12, textAlign:'center', padding:10 }}>
                  +{result.group.length - 10} {isUK ? 'учасників' : 'участников'}
                </Text>
              )}
            </ScrollView>
          </Animated.View>

          {/* Кнопка */}
          <Animated.View style={{ opacity: btnOpacity, paddingHorizontal:20, paddingTop:14, gap:10 }}>
            <TouchableOpacity
              style={{ backgroundColor: outcomeColor, borderRadius:16, padding:16, alignItems:'center' }}
              onPress={handleClose}
            >
              <Text style={{ color:'#fff', fontSize:17, fontWeight:'700' }}>{btnText}</Text>
            </TouchableOpacity>
            {result.promoted && (
              <TouchableOpacity
                style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, padding:10 }}
                onPress={async () => {
                  const msg = isUK
                    ? `Підвищений до ${newLeague.nameUK} у Phraseman! 🏆\n${STORE_URL}`
                    : `Повышен до ${newLeague.nameRU} в Phraseman! 🏆\n${STORE_URL}`;
                  try { await Share.share({ message: msg }); } catch {}
                }}
              >
                <Ionicons name="share-outline" size={16} color={t.textSecond}/>
                <Text style={{ color:t.textSecond, fontSize:14 }}>
                  {isUK ? 'Поділитися' : 'Поделиться'}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

        </View>
      </View>
    </Modal>
  );
}
