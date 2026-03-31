import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, Animated, TouchableOpacity,
  Dimensions, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { LeagueResult, LEAGUES, CLUBS, clearPendingResult } from './league_engine';

const { width: W, height: H } = Dimensions.get('window');
const MEDALS = ['🥇', '🥈', '🥉'];
const CONFETTI_COLORS = ['#FFD700','#34C759','#007AFF','#FF3B30','#AF52DE','#FF9500'];

// ─── Confetti particle ──────────────────────────────────────────────────────
function ConfettiPiece({ color, delay, startX }: { color: string; delay: number; startX: number }) {
  const y   = useRef(new Animated.Value(-20)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y,   { toValue: H + 20, duration: 2200 + Math.random()*800, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1080,   duration: 2000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(op, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
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
  const club       = CLUBS[result.newLeagueId]     ?? CLUBS[0];

  const headerScale  = useRef(new Animated.Value(0)).current;
  const iconScale    = useRef(new Animated.Value(0)).current;
  const iconGlow     = useRef(new Animated.Value(0)).current;
  const listOpacity  = useRef(new Animated.Value(0)).current;
  const rankScale    = useRef(new Animated.Value(0)).current;
  const btnOpacity   = useRef(new Animated.Value(0)).current;
  const myRowY       = useRef(new Animated.Value(80)).current;
  const transitionOp = useRef(new Animated.Value(0)).current;

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!visible) return;

    headerScale.setValue(0);
    iconScale.setValue(0);
    iconGlow.setValue(0);
    listOpacity.setValue(0);
    rankScale.setValue(0);
    btnOpacity.setValue(0);
    myRowY.setValue(80);
    transitionOp.setValue(0);

    Animated.sequence([
      Animated.spring(iconScale,    { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(headerScale,  { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.timing(transitionOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.spring(rankScale,    { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(listOpacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(myRowY,       { toValue: 0, friction: 8, tension: 80,  useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(btnOpacity,   { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Pulsing glow on club icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(iconGlow, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    if (result.promoted) {
      const t1 = setTimeout(() => setShowConfetti(true), 400);
      const t2 = setTimeout(() => setShowConfetti(false), 3500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [visible]);

  const handleClose = async () => {
    await clearPendingResult();
    onClose();
  };

  const isPromo  = result.promoted;
  const isDemo   = result.demoted;
  const isStay   = !isPromo && !isDemo;

  const outcomeColor = isPromo ? '#34C759' : isDemo ? '#FF3B30' : t.textSecond;
  const glowColor    = isPromo ? '#FFD700' : isDemo ? '#FF3B30' : club.color;
  const outcomeIcon  = isPromo ? 'arrow-up-circle' : isDemo ? 'arrow-down-circle' : 'checkmark-circle';

  const outcomeText = isPromo
    ? (isUK ? `Підвищено до ${newLeague.nameUK}!` : `Повышен до ${newLeague.nameRU}!`)
    : isDemo
      ? (isUK ? `Понижено до ${newLeague.nameUK}` : `Понижен до ${newLeague.nameRU}`)
      : (isUK ? 'Залишаєшся в клубі' : 'Остаёшься в клубе');

  const btnText = isPromo
    ? (isUK ? '🚀 Вперед!' : '🚀 Вперед!')
    : isDemo
      ? (isUK ? 'Розумію' : 'Понял')
      : (isUK ? 'Продовжити' : 'Продолжить');

  const headerBg = isPromo
    ? 'rgba(52,199,89,0.12)'
    : isDemo
      ? 'rgba(255,59,48,0.15)'
      : 'rgba(100,100,100,0.08)';

  const cardBg = isDemo ? 'rgba(255,59,48,0.06)' : t.bgCard;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}>

        {/* Confetti on promotion */}
        {showConfetti && CONFETTI_COLORS.flatMap((color, ci) =>
          Array.from({ length: 8 }, (_, i) => (
            <ConfettiPiece
              key={`${ci}-${i}`}
              color={color}
              delay={i * 50 + ci * 25}
              startX={Math.random() * W}
            />
          ))
        )}

        <View style={{
          backgroundColor: cardBg,
          borderRadius: 24,
          width: W - 32,
          maxHeight: H * 0.85,
          overflow: 'hidden',
          borderWidth: isDemo ? 2 : isPromo ? 2 : 0,
          borderColor: isDemo ? '#FF3B30' : isPromo ? '#FFD700' : 'transparent',
        }}>

          {/* Gradient-like header area */}
          <View style={{
            backgroundColor: headerBg,
            paddingTop: 28,
            paddingBottom: 18,
            alignItems: 'center',
          }}>

            {/* Club icon */}
            <Animated.View style={{
              transform: [{ scale: iconScale }],
              marginBottom: 12,
            }}>
              <Image
                source={club.imageUri}
                style={{
                  width: 96,
                  height: 96,
                }}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Header text */}
            <Animated.View style={{
              alignItems: 'center',
              transform: [{ scale: headerScale }],
            }}>
              <Text style={{
                color: t.textPrimary,
                fontSize: 26,
                fontWeight: '900',
                letterSpacing: 0.5,
              }}>
                {isUK ? 'Підсумки тижня' : 'Итоги недели'}
              </Text>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 10,
              }}>
                <Ionicons name={outcomeIcon as any} size={22} color={outcomeColor}/>
                <Text style={{
                  color: outcomeColor,
                  fontSize: 18,
                  fontWeight: '800',
                }}>
                  {outcomeText}
                </Text>
              </View>
            </Animated.View>

            {/* League transition */}
            {(isPromo || isDemo) && (
              <Animated.View style={{
                opacity: transitionOp,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                backgroundColor: 'rgba(0,0,0,0.15)',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 12,
              }}>
                <Text style={{ color: t.textMuted, fontSize: 14 }}>
                  {isUK ? prevLeague.nameUK : prevLeague.nameRU}
                </Text>
                <Ionicons
                  name={isPromo ? 'arrow-forward' : 'arrow-forward'}
                  size={16}
                  color={outcomeColor}
                />
                <Text style={{ color: outcomeColor, fontSize: 14, fontWeight: '700' }}>
                  {isUK ? newLeague.nameUK : newLeague.nameRU}
                </Text>
              </Animated.View>
            )}
          </View>

          {/* Rank badge */}
          <Animated.View style={{
            alignSelf: 'center',
            backgroundColor: isPromo ? 'rgba(52,199,89,0.12)' : isDemo ? 'rgba(255,59,48,0.12)' : t.bgSurface,
            borderRadius: 18,
            paddingHorizontal: 36,
            paddingVertical: 14,
            marginTop: 16,
            marginBottom: 14,
            transform: [{ scale: rankScale }],
            borderWidth: 2,
            borderColor: isPromo ? '#34C759' : isDemo ? '#FF3B30' : club.color + '40',
            shadowColor: outcomeColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}>
            <Text style={{
              color: t.textMuted,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 1,
              textAlign: 'center',
              fontWeight: '600',
            }}>
              {isUK ? 'Твоє місце' : 'Твоё место'}
            </Text>
            <Text style={{
              color: t.textPrimary,
              fontSize: 52,
              fontWeight: '900',
              textAlign: 'center',
              lineHeight: 58,
            }}>
              #{result.myRank}
            </Text>
            <Text style={{
              color: t.textMuted,
              fontSize: 15,
              textAlign: 'center',
              fontWeight: '500',
            }}>
              {isUK ? `з ${result.totalInGroup} учасників` : `из ${result.totalInGroup} участников`}
            </Text>
          </Animated.View>

          {/* Group table */}
          <Animated.View style={{ opacity: listOpacity }}>
            <Text style={{
              color: t.textMuted,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              paddingHorizontal: 20,
              marginBottom: 6,
              fontWeight: '600',
            }}>
              {isUK ? 'Група тижня' : 'Группа недели'}
            </Text>
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {result.group.slice(0, 10).map((member, i) => (
                <Animated.View
                  key={member.name}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 10,
                    backgroundColor: member.isMe
                      ? (isPromo ? 'rgba(52,199,89,0.13)' : isDemo ? 'rgba(255,59,48,0.1)' : t.bgSurface)
                      : 'transparent',
                    borderLeftWidth: member.isMe ? 3 : 0,
                    borderLeftColor: outcomeColor,
                    transform: member.isMe ? [{ translateY: myRowY }] : [],
                  }}
                >
                  <Text style={{ width: 36, fontSize: i < 3 ? 20 : 14, color: t.textPrimary }}>
                    {i < 3 ? MEDALS[i] : `${i + 1}`}
                  </Text>
                  <Text style={{
                    flex: 1, fontSize: 15,
                    color: member.isMe ? t.textPrimary : t.textSecond,
                    fontWeight: member.isMe ? '700' : '400',
                  }}>
                    {member.name}{member.isMe ? (isUK ? ' (ти)' : ' (ты)') : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={11} color={i < 3 ? '#FFD700' : t.textMuted}/>
                    <Text style={{ color: i < 3 ? '#FFD700' : t.textMuted, fontSize: 14, fontWeight: '600' }}>
                      {member.points}
                    </Text>
                  </View>
                </Animated.View>
              ))}
              {result.group.length > 10 && (
                <Text style={{ color: t.textGhost, fontSize: 12, textAlign: 'center', padding: 10 }}>
                  +{result.group.length - 10} {isUK ? 'учасників' : 'участников'}
                </Text>
              )}
            </ScrollView>
          </Animated.View>

          {/* Button */}
          <Animated.View style={{ opacity: btnOpacity, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}>
            <TouchableOpacity
              style={{
                backgroundColor: isPromo ? '#34C759' : isDemo ? '#FF3B30' : club.color,
                borderRadius: 16,
                padding: 18,
                alignItems: 'center',
                shadowColor: outcomeColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>
                {btnText}
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </View>
    </Modal>
  );
}
