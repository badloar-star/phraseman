import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
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
  mode: 'club';
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

const ROW_HEIGHT_CLUB = 60;
const MY_INDEX = 4;

function buildSorted(lang: Lang): { rows: FakeRow[]; myRank: number } {
  const base = FAKE_PARTICIPANTS_CLUB;
  const myReference = base[MY_INDEX];
  const myPts = myReference.points + 1;
  const myXp = 12000;
  const list: FakeRow[] = [];
  for (let i = 0; i < base.length; i++) {
    if (i === MY_INDEX) {
      list.push({
        name: triLang(lang, {
          uk: 'Ти',
          ru: 'Ты',
          es: 'Tú',
          'pt-BR': 'Você',
          vi: 'Bạn',
          id: 'Kamu',
          tr: 'Sen',
          pl: 'Ty',
        }),
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

function RankChangeTestModal({ visible, mode, delta, onClose, lang }: Props) {
  const { theme: t, f } = useTheme();
  const myAnim = useRef(new Animated.Value(0)).current;
  const bannerKeyRef = useRef(0);

  const ROW_HEIGHT = ROW_HEIGHT_CLUB;

  const { rows, myRank } = useMemo(() => buildSorted(lang), [lang]);

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

  const headerTitle = triLang(lang, {
    ru: 'Тест: Лига недели',
    uk: 'Тест: Ліга тижня',
    es: 'Prueba: Liga de la semana',
    'pt-BR': 'Teste: Liga da semana',
    vi: 'Kiểm tra: Giải đấu tuần',
    id: 'Tes: Liga minggu ini',
    tr: 'Test: Haftanın ligi',
    pl: 'Test: liga tygodnia',
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
              {row.name}{isMe ? triLang(lang, {
                uk: ' (ти)',
                ru: ' (ты)',
                es: ' (tú)',
                'pt-BR': ' (você)',
                vi: ' (bạn)',
                id: ' (kamu)',
                tr: ' (sen)',
                pl: ' (ty)',
              }) : ''}
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

            <View style={{
                backgroundColor: t.bgSurface, borderRadius: 16, padding: 14,
                borderWidth: 0.5, borderColor: t.border,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                {sampleLeague.imageUri && (
                  <Image source={sampleLeague.imageUri} style={{ width: 56, height: 56 }} contentFit="contain" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {triLang(lang, {
                      ru: 'Твоя лига',
                      uk: 'Твоя ліга',
                      es: 'Tu liga',
                      'pt-BR': 'Sua liga',
                      vi: 'Giải đấu của bạn',
                      id: 'Ligamu',
                      tr: 'Ligin',
                      pl: 'Twoja liga',
                    })}
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
                      'pt-BR': 'de XP esta semana',
                      vi: 'XP tuần này',
                      id: 'XP minggu ini',
                      tr: 'bu haftaki XP',
                      pl: 'XP w tym tygodniu',
                    })}
                  </Text>
                </View>
              </View>

            <View style={{
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 0.5,
              borderColor: t.border,
            }}>
              {rows.map((row, i) => renderClubRow(row, i))}
            </View>

            <Text style={{ color: t.textGhost, fontSize: f.caption, textAlign: 'center', paddingHorizontal: 8 }}>
              {triLang(lang, {
                ru: '🧪 Тестовое окно. Реальные клубы не меняются.',
                uk: '🧪 Тестове вікно. Реальні клуби не змінюються.',
                es: '🧪 Ventana de prueba. Los clubes reales no cambian.',
                'pt-BR': '🧪 Janela de teste. Clubes reais não mudam.',
                vi: '🧪 Cửa sổ thử nghiệm. Các câu lạc bộ thật không thay đổi.',
                id: '🧪 Jendela uji. Klub asli tidak berubah.',
                tr: '🧪 Test penceresi. Gerçek kulüpler değişmez.',
                pl: '🧪 Okno testowe. Prawdziwe kluby się nie zmieniają.',
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
                {triLang(lang, {
                  ru: 'Закрыть',
                  uk: 'Закрити',
                  es: 'Cerrar',
                  'pt-BR': 'Fechar',
                  vi: 'Đóng',
                  id: 'Tutup',
                  tr: 'Kapat',
                  pl: 'Zamknij',
                })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default memo(RankChangeTestModal);
