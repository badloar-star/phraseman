import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import RankChangeBanner from './RankChangeBanner';
import AvatarView from './AvatarView';
import { LEAGUES, clubTierShortName } from '../app/league_engine';
import { getBestAvatarForLevel } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import { triLang, type Lang } from '../constants/i18n';

const TOP3_EMOJI = ['🥇', '🥈', '🥉'];

interface Props {
  visible: boolean;
  mode: 'club' | 'hof';
  /** prev_rank - new_rank. >0 поднялся, <0 опустился. */
  delta: number;
  onClose: () => void;
  lang: Lang;
}

interface FakeRow {
  name: string;
  points: number;
  totalXp: number;
  isMe?: boolean;
  isPremium?: boolean;
}

const FAKE_PARTICIPANTS_CLUB: FakeRow[] = [
  { name: 'Anna',  points: 3420, totalXp: 28000 },
  { name: 'Mark',  points: 3180, totalXp: 24000, isPremium: true },
  { name: 'Yuri',  points: 2950, totalXp: 19000 },
  { name: 'Lena',  points: 2700, totalXp: 16500 },
  { name: 'Игорь', points: 2480, totalXp: 14200 },
  { name: 'Саша',  points: 2240, totalXp: 11000 },
  { name: 'Майк',  points: 1990, totalXp: 8400, isPremium: true },
  { name: 'Оля',   points: 1750, totalXp: 6200 },
  { name: 'Дима',  points: 1520, totalXp: 4800 },
  { name: 'Маша',  points: 1300, totalXp: 3500 },
];

const FAKE_PARTICIPANTS_HOF: FakeRow[] = [
  { name: 'Pro_Master', points: 142000, totalXp: 142000 },
  { name: 'Linguist',   points: 128500, totalXp: 128500, isPremium: true },
  { name: 'WordKing',   points: 110200, totalXp: 110200 },
  { name: 'Phraseman',  points:  98700, totalXp: 98700 },
  { name: 'EnglishGuru',points:  87400, totalXp: 87400 },
  { name: 'Vocab_Pro',  points:  75200, totalXp: 75200, isPremium: true },
  { name: 'Daily_Win',  points:  64100, totalXp: 64100 },
  { name: 'IdiomLover', points:  53000, totalXp: 53000 },
  { name: 'NightOwl',   points:  42500, totalXp: 42500 },
  { name: 'Streak50',   points:  31800, totalXp: 31800 },
];

const ROW_HEIGHT_CLUB = 60;
const ROW_HEIGHT_HOF  = 64;
const MY_INDEX = 4;

function buildSorted(mode: 'club' | 'hof', lang: Lang): { rows: FakeRow[]; myRank: number } {
  const base = mode === 'club' ? FAKE_PARTICIPANTS_CLUB : FAKE_PARTICIPANTS_HOF;
  const myReference = base[MY_INDEX];
  const myPts = myReference.points + 1;
  const myXp = mode === 'club' ? 12000 : myReference.totalXp + 1;
  const list: FakeRow[] = [];
  for (let i = 0; i < base.length; i++) {
    if (i === MY_INDEX) {
      list.push({
        name: triLang(lang, { uk: 'Ти', ru: 'Ты', es: 'Tú' }),
        points: myPts,
        totalXp: myXp,
        isMe: true,
      });
    }
    list.push(base[i]);
  }
  const rows = [...list].sort((a, b) => b.points - a.points);
  const myRank = rows.findIndex(r => r.isMe) + 1;
  return { rows, myRank };
}

export default function RankChangeTestModal({ visible, mode, delta, onClose, lang }: Props) {
  const { theme: t, f } = useTheme();
  const myAnim = useRef(new Animated.Value(0)).current;
  const bannerKeyRef = useRef(0);

  const ROW_HEIGHT = mode === 'club' ? ROW_HEIGHT_CLUB : ROW_HEIGHT_HOF;

  const { rows, myRank } = useMemo(() => buildSorted(mode, lang), [mode, lang]);

  useEffect(() => {
    if (!visible) return;
    bannerKeyRef.current += 1;
    // delta>0 поднялся → стартуем НИЖЕ (translateY=+N), плывём вверх к 0.
    // delta<0 опустился → стартуем ВЫШЕ (translateY=-N), плывём вниз к 0.
    const startOffset = delta * ROW_HEIGHT;
    myAnim.setValue(startOffset);
    Animated.timing(myAnim, {
      toValue: 0,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, delta, ROW_HEIGHT, myAnim]);

  const passedName = delta > 0 ? (rows[myRank]?.name ?? null) : null;
  const lostToName = delta < 0 ? (rows[myRank - 2]?.name ?? null) : null;

  const accentBg    = (t as any).accentBg    ?? t.bgSurface;
  const correctText = (t as any).correctText ?? '#fff';
  const goldColor   = (t as any).gold        ?? '#F5A623';

  const sampleLeague = LEAGUES[0]; // Медь — для preview шапки клуба

  const headerTitle = mode === 'club'
    ? triLang(lang, {
        ru: 'Тест: Лига недели',
        uk: 'Тест: Ліга тижня',
        es: 'Prueba: Liga de la semana',
      })
    : triLang(lang, {
        ru: 'Тест: Зал славы',
        uk: 'Тест: Зала слави',
        es: 'Prueba: Salón de la fama',
      });

  const renderClubRow = (row: FakeRow, i: number) => {
    const isMe = !!row.isMe;
    const rowAvatar = String(getBestAvatarForLevel(getLevelFromXP(row.totalXp)));
    const rowMask = isMe ? t.bgSurface : t.bgCard;
    return (
      <Animated.View
        key={`${row.name}-${i}`}
        style={{
          transform: isMe ? [{ translateY: myAnim }] : undefined,
          zIndex: isMe ? 5 : 0,
          elevation: isMe ? 5 : 0,
        }}
      >
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 11,
            borderBottomWidth: 0.5, borderBottomColor: t.border,
            backgroundColor: isMe ? t.bgSurface : 'transparent',
          }}
        >
          {i < 3 ? (
            <Text style={{ width: 36, fontSize: 18, marginRight: 0, textAlign: 'center' }}>{TOP3_EMOJI[i]}</Text>
          ) : (
            <Text style={{ width: 36, fontSize: 14, color: t.textPrimary }}>{i + 1}</Text>
          )}
          <View style={{ marginRight: 10 }}>
            <AvatarView avatar={rowAvatar} totalXP={row.totalXp} size={36} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: f.body,
              color: isMe ? t.textPrimary : t.textSecond,
              fontWeight: isMe ? '700' : '400',
            }}>
              {row.name}{isMe ? triLang(lang, { uk: ' (ти)', ru: ' (ты)', es: ' (tú)' }) : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="star" size={11} color={i < 3 ? goldColor : t.textMuted} />
            <Text style={{ color: i < 3 ? goldColor : t.textMuted, fontSize: f.body, fontWeight: '600' }}>
              {row.points}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderHofRow = (row: FakeRow, i: number) => {
    const isMe = !!row.isMe;
    const isTop3 = i < 3;
    const rowAvatar = String(getBestAvatarForLevel(getLevelFromXP(row.totalXp)));
    return (
      <Animated.View
        key={`${row.name}-${i}`}
        style={{
          transform: isMe ? [{ translateY: myAnim }] : undefined,
          zIndex: isMe ? 5 : 0,
          elevation: isMe ? 5 : 0,
        }}
      >
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 14,
            borderBottomWidth: 0.5, borderBottomColor: t.border,
            backgroundColor: isMe ? accentBg : t.bgCard,
          }}
        >
          <Text style={{
            width: 36, fontSize: isTop3 ? 16 : 14,
            color: isTop3 ? goldColor : t.textPrimary,
            textAlign: 'center',
            fontWeight: isTop3 ? '700' : '400',
          }}>
            {i + 1}
          </Text>
          <View style={{ marginRight: 10 }}>
            <AvatarView avatar={rowAvatar} totalXP={row.totalXp} size={36} />
          </View>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: isTop3 ? 17 : 15,
              color: t.textPrimary,
              fontWeight: isMe || isTop3 ? '700' : '600',
            }}
          >
            {row.name}{isMe ? triLang(lang, { uk: ' (ти)', ru: ' (ты)', es: ' (tú)' }) : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="star" size={12} color={t.textSecond} />
            <Text style={{ color: t.textSecond, fontSize: isTop3 ? 17 : 14, fontWeight: '600' }}>
              {row.points}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 8 }}>
        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: 20,
            borderWidth: 1, borderColor: t.border,
            maxHeight: '92%',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 12,
            borderBottomWidth: 0.5, borderBottomColor: t.border,
          }}>
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>
              {headerTitle}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={t.textGhost} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
            {/* Banner — без auto-dismiss */}
            <RankChangeBanner
              key={bannerKeyRef.current}
              delta={delta}
              passedName={passedName}
              lostToName={lostToName}
              lang={lang}
              duration={0}
              onClose={() => {}}
            />

            {mode === 'club' && (
              <View style={{
                backgroundColor: t.bgSurface, borderRadius: 16, padding: 14,
                borderWidth: 0.5, borderColor: t.border,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                {sampleLeague.imageUri && (
                  <Image source={sampleLeague.imageUri} style={{ width: 56, height: 56 }} resizeMode="contain" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {triLang(lang, { ru: 'Твоя лига', uk: 'Твоя ліга', es: 'Tu liga' })}
                  </Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginTop: 2 }}>
                    {clubTierShortName(sampleLeague, lang)}
                  </Text>
                  <Text style={{ color: t.textSecond, fontSize: f.sub, marginTop: 2 }}>
                    {rows.find(r => r.isMe)?.points}{' '}
                    {triLang(lang, {
                      ru: 'опыта этой недели',
                      uk: 'досвіду цього тижня',
                      es: 'de XP esta semana',
                    })}
                  </Text>
                </View>
              </View>
            )}

            {mode === 'hof' && (
              <View style={{
                flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 6,
                borderBottomWidth: 0.5, borderBottomColor: t.border,
              }}>
                <Text style={{ width: 44, color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>#</Text>
                <Text style={{ flex: 1, color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>
                  {triLang(lang, { ru: 'Участник', uk: 'Учасник', es: 'Participante' })}
                </Text>
                <Text style={{ color: t.textGhost, fontSize: f.label, fontWeight: '600' }}>
                  {triLang(lang, { ru: 'Опыт', uk: 'Досвід', es: 'Experiencia' })}
                </Text>
              </View>
            )}

            <View style={{
              borderRadius: mode === 'club' ? 16 : 0,
              overflow: 'hidden',
              borderWidth: mode === 'club' ? 0.5 : 0,
              borderColor: t.border,
            }}>
              {rows.map((row, i) => mode === 'club' ? renderClubRow(row, i) : renderHofRow(row, i))}
            </View>

            <Text style={{ color: t.textGhost, fontSize: f.caption, textAlign: 'center', paddingHorizontal: 8 }}>
              {triLang(lang, {
                ru: '🧪 Тестовое окно. Реальные клубы и зал славы не меняются.',
                uk: '🧪 Тестове вікно. Реальні клуби та зала слави не змінюються.',
                es: '🧪 Ventana de prueba. Los clubes y el salón de la fama reales no cambian.',
              })}
            </Text>
          </ScrollView>

          <View style={{ padding: 12, borderTopWidth: 0.5, borderTopColor: t.border }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 14,
                backgroundColor: t.accent,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: correctText, fontWeight: '800', fontSize: f.body }}>
                {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
