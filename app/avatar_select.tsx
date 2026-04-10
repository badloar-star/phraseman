import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { getLevelFromXP } from '../constants/theme';
import { FRAMES, FrameDef, getBestAvatarForLevel, getBestFrameForLevel, getUnlockedFrames } from '../constants/avatars';
import { loadAchievementStates } from './achievements';
import AnimatedFrame from '../components/AnimatedFrame';
import { hapticTap } from '../hooks/use-haptics';

const { width: SW } = Dimensions.get('window');
const COLS     = 4;
const CELL_GAP = 10;
const SIDE_PAD = 16;
const CELL_W   = Math.floor((SW - SIDE_PAD * 2 - CELL_GAP * (COLS - 1)) / COLS);

const FRAME_BODY_H = Math.round(CELL_W * 1.0);
const FRAME_TIP_H  = Math.round(CELL_W * 0.26);
const CORNER       = Math.round(CELL_W * 0.20);

// ── Ячейка рамки (настоящий AnimatedFrame внутри) ────────────────────────────
function FrameCell({
  frameId, color, nameUK, nameRU, unlockLevel, isSelected, isLocked, isUK, onPress, emoji,
}: {
  frameId: string; color: string; nameUK: string; nameRU: string;
  unlockLevel: number; isSelected: boolean; isLocked: boolean;
  isUK: boolean; onPress: () => void; emoji?: string;
}) {
  const bodyBg = isLocked ? '#181818' : color + '22';
  const frameSize = Math.round(CELL_W * 0.58);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ alignItems: 'center', width: CELL_W }}>
      <View style={{
        width: CELL_W, height: FRAME_BODY_H,
        backgroundColor: bodyBg,
        borderTopLeftRadius: CORNER,
        borderTopRightRadius: CORNER,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isSelected ? 2 : 0,
        borderColor: color,
      }}>
        {isLocked ? (
          <Text style={{ fontSize: Math.round(CELL_W * 0.38) }}>🔒</Text>
        ) : (
          <AnimatedFrame emoji={emoji || '🐣'} frameId={frameId} size={frameSize} />
        )}
      </View>
      {/* V-кончик */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: CELL_W / 2, borderRightWidth: CELL_W / 2,
        borderTopWidth: FRAME_TIP_H,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: bodyBg,
      }} />
      <Text style={{ color: isSelected ? color : isLocked ? '#3A3A3A' : '#888', fontSize: 9, textAlign: 'center', marginTop: 4, fontWeight: '600' }}
            numberOfLines={1} maxFontSizeMultiplier={1}>
        {isUK ? nameUK : nameRU}
      </Text>
      <Text style={{ color: isLocked ? '#2A2A2A' : '#555', fontSize: 8, fontWeight: '700' }} maxFontSizeMultiplier={1}>
        Lv.{unlockLevel}
      </Text>
    </TouchableOpacity>
  );
}

type TabId = 'level' | 'achievement' | 'club';

const TABS: { id: TabId; icon: string; labelRU: string; labelUK: string }[] = [
  { id: 'level',       icon: '⭐',  labelRU: 'Уровень',      labelUK: 'Рівень' },
  { id: 'achievement', icon: '🏅',  labelRU: 'Достижения',   labelUK: 'Досягнення' },
  { id: 'club',        icon: '🏛',  labelRU: 'Клуб',         labelUK: 'Клуб' },
];

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function AvatarSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  const [level, setLevel]       = useState(1);
  const [selEmoji, setSelEmoji] = useState('🐣');
  const [selFrame, setSelFrame] = useState('plain');
  const [unlockedFrameIds, setUnlockedFrameIds] = useState<string[]>([]);
  const [currentClubId, setCurrentClubId] = useState<number | null>(null);
  const [unlockedAchIds, setUnlockedAchIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabId>('level');

  useEffect(() => {
    Promise.all([
      AsyncStorage.multiGet(['user_total_xp', 'user_avatar', 'user_frame', 'league_state_v3']),
      getUnlockedFrames(),
      loadAchievementStates(),
    ]).then(([pairs, frameIds, achStates]) => {
      const xp  = parseInt(pairs[0][1] || '0') || 0;
      const lvl = getLevelFromXP(xp) || 1;
      setLevel(lvl);
      setUnlockedFrameIds(frameIds);

      try {
        const ls = pairs[3][1] ? JSON.parse(pairs[3][1]) : null;
        if (ls && typeof ls.leagueId === 'number') setCurrentClubId(ls.leagueId);
      } catch {}

      const achSet = new Set(achStates.filter(s => s.unlockedAt !== null).map(s => s.id));
      setUnlockedAchIds(achSet);

      const bestAvatar = getBestAvatarForLevel(lvl);
      const bestFrame  = getBestFrameForLevel(lvl);
      setSelEmoji(pairs[1][1] || bestAvatar || '🐣');
      setSelFrame(pairs[2][1] || (bestFrame?.id ?? 'plain'));
    }).catch(() => {});
  }, []);

  const selectFrame = (frameId: string) => {
    if (!frameId) return;
    setSelFrame(frameId);
    AsyncStorage.multiSet([['user_avatar', selEmoji || '🐣'], ['user_frame', frameId]]).catch(() => {});
  };

  const isFrameAvailable = (fr: FrameDef): boolean => {
    const type = fr.unlockType ?? 'level';
    if (type === 'level')       return fr.unlockLevel <= level || unlockedFrameIds.includes(fr.id);
    if (type === 'achievement') return unlockedAchIds.has(fr.unlockAchievementId ?? '');
    if (type === 'club')        return currentClubId !== null && currentClubId === fr.unlockClubId;
    return false;
  };

  const getLockedAlert = (fr: FrameDef): { title: string; message: string } => {
    const type = fr.unlockType ?? 'level';
    if (type === 'achievement') {
      const achName = isUK ? (fr.unlockAchievementNameUK ?? '') : (fr.unlockAchievementNameRU ?? '');
      return {
        title:   isUK ? `🏅 Досягнення потрібне` : `🏅 Нужно достижение`,
        message: isUK
          ? `Відкрий досягнення «${achName}», щоб розблокувати цю рамку`
          : `Открой достижение «${achName}», чтобы разблокировать эту рамку`,
      };
    }
    if (type === 'club') {
      const clubName = isUK ? (fr.unlockClubNameUK ?? '') : (fr.unlockClubNameRU ?? '');
      return {
        title:   isUK ? `🏛 Лише для членів клубу` : `🏛 Только для членов клуба`,
        message: isUK
          ? `Ця рамка доступна лише членам «${clubName}». Потрапи до цього клубу, щоб використовувати її!`
          : `Эта рамка доступна только членам «${clubName}». Попади в этот клуб, чтобы использовать её!`,
      };
    }
    return {
      title:   isUK ? `🔒 Рівень ${fr.unlockLevel}` : `🔒 Уровень ${fr.unlockLevel}`,
      message: isUK
        ? `Ця рамка відкриється на рівні ${fr.unlockLevel}`
        : `Эта рамка откроется на уровне ${fr.unlockLevel}`,
    };
  };

  // Фильтрация по активной вкладке
  const tabFrames = FRAMES.filter(fr => (fr.unlockType ?? 'level') === activeTab);
  const unlockedInTab = tabFrames.filter(fr => isFrameAvailable(fr));
  const lockedInTab   = tabFrames.filter(fr => !isFrameAvailable(fr));

  return (
    <ScreenGradient>

      {/* Шапка */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
          onPress={() => { hapticTap(); router.back(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
          {isUK ? 'Рамка' : 'Рамка'}
        </Text>
      </View>

      {/* Превью */}
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <AnimatedFrame key={selFrame} emoji={selEmoji} frameId={selFrame} size={72} />
        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 6 }}>
          {isUK ? `Рівень ${level}` : `Уровень ${level}`}
        </Text>
      </View>

      {/* Сетка рамок */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: SIDE_PAD }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: CELL_GAP }}>
          {[
            ...unlockedInTab.map(fr => (
              <FrameCell
                key={fr.id}
                frameId={fr.id}
                color={fr.color}
                nameUK={fr.nameUK}
                nameRU={fr.nameRU}
                unlockLevel={fr.unlockLevel}
                isSelected={fr.id === selFrame}
                isLocked={false}
                isUK={isUK}
                emoji={selEmoji}
                onPress={() => { hapticTap(); selectFrame(fr.id); }}
              />
            )),
            ...lockedInTab.map(fr => (
              <FrameCell
                key={fr.id}
                frameId={fr.id}
                color={fr.color}
                nameUK={fr.nameUK}
                nameRU={fr.nameRU}
                unlockLevel={fr.unlockLevel}
                isSelected={false}
                isLocked={true}
                isUK={isUK}
                onPress={() => {
                  hapticTap();
                  const { title, message } = getLockedAlert(fr);
                  Alert.alert(title, message);
                }}
              />
            )),
          ]}
        </View>
      </ScrollView>

      {/* Нижние вкладки */}
      <View style={{ borderTopWidth: 0.5, borderTopColor: t.border, backgroundColor: t.bgPrimary, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', paddingTop: 6, paddingBottom: 4 }}>
          {TABS.map(tab => {
            const active = tab.id === activeTab;
            const color  = active ? t.textPrimary : t.textMuted;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => { hapticTap(); setActiveTab(tab.id); }}
                activeOpacity={0.7}
                style={{ flex: 1, alignItems: 'center', gap: 2, position: 'relative' }}
              >
                {active && (
                  <View style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, borderRadius: 1, backgroundColor: t.textPrimary }} />
                )}
                <Text style={{ fontSize: 28 }}>{tab.icon}</Text>
                <Text style={{ fontSize: 10, color, fontWeight: active ? '600' : '400', letterSpacing: 0.1 }} numberOfLines={1}>
                  {isUK ? tab.labelUK : tab.labelRU}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

    </ScreenGradient>
  );
}
