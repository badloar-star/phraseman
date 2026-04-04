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

// ── Ячейка рамки (без аватарки внутри) ────────────────────────────────────────
function FrameCell({
  frameId, color, nameUK, nameRU, unlockLevel, isSelected, isLocked, isUK, onPress,
}: {
  frameId: string; color: string; nameUK: string; nameRU: string;
  unlockLevel: number; isSelected: boolean; isLocked: boolean;
  isUK: boolean; onPress: () => void; unlockType?: string;
}) {
  const frameSize = Math.round(CELL_W * 0.62);
  const bodyBg    = isLocked ? '#181818' : color + '22';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ alignItems: 'center', width: CELL_W }}>
      {/* Тело */}
      <View style={{
        width: CELL_W, height: FRAME_BODY_H,
        backgroundColor: bodyBg,
        borderTopLeftRadius: CORNER,
        borderTopRightRadius: CORNER,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <View style={{ opacity: isLocked ? 0.25 : 1 }}>
          <AnimatedFrame
            emoji={isLocked ? '🔒' : '⬡'}
            frameId={frameId}
            size={frameSize}
            noAvatar={!isLocked}
            bgColor={!isLocked ? bodyBg : undefined}
          />
        </View>
      </View>
      {/* V-кончик */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: CELL_W / 2, borderRightWidth: CELL_W / 2,
        borderTopWidth: FRAME_TIP_H,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: bodyBg,
      }} />
      {/* Название + уровень */}
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

  useEffect(() => {
    Promise.all([
      AsyncStorage.multiGet(['user_total_xp', 'user_avatar', 'user_frame', 'league_state']),
      getUnlockedFrames(),
      loadAchievementStates(),
    ]).then(([pairs, frameIds, achStates]) => {
      const xp  = parseInt(pairs[0][1] || '0') || 0;
      const lvl = getLevelFromXP(xp) || 1;
      setLevel(lvl);
      setUnlockedFrameIds(frameIds);

      // Текущий клуб
      try {
        const ls = pairs[3][1] ? JSON.parse(pairs[3][1]) : null;
        if (ls && typeof ls.leagueId === 'number') setCurrentClubId(ls.leagueId);
      } catch {}

      // Разблокированные достижения
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
    // level
    return {
      title:   isUK ? `🔒 Рівень ${fr.unlockLevel}` : `🔒 Уровень ${fr.unlockLevel}`,
      message: isUK
        ? `Ця рамка відкриється на рівні ${fr.unlockLevel}`
        : `Эта рамка откроется на уровне ${fr.unlockLevel}`,
    };
  };

  const unlockedFrames = FRAMES.filter(fr => isFrameAvailable(fr));
  const lockedFrames   = FRAMES.filter(fr => !isFrameAvailable(fr));

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

      {/* Превью — показывает рамку с текущей аватаркой */}
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <AnimatedFrame emoji={selEmoji} frameId={selFrame} size={72} />
        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 6 }}>
          {isUK ? `Рівень ${level}` : `Уровень ${level}`}
        </Text>
      </View>

      {/* Сетка рамок */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: SIDE_PAD }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: CELL_GAP }}>

          {[
            ...unlockedFrames.map(fr => (
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
                onPress={() => selectFrame(fr.id)}
              />
            )),
            ...lockedFrames.map(fr => (
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
                unlockType={fr.unlockType}
                onPress={() => {
                  const { title, message } = getLockedAlert(fr);
                  Alert.alert(title, message);
                }}
              />
            )),
          ]}

        </View>
      </ScrollView>
    </ScreenGradient>
  );
}
