import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { getLevelFromXP } from '../constants/theme';
import {
  FRAMES, FrameDef, frameNameForLang, getBestAvatarForLevel, getBestFrameForLevel, getUnlockedFrames,
} from '../constants/avatars';
import { triLang } from '../constants/i18n';
import type { Lang } from '../constants/i18n';
import { loadAchievementStates } from './achievements';
import AnimatedFrame from '../components/AnimatedFrame';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent } from './events';

const { width: SW } = Dimensions.get('window');
const COLS     = 4;
const CELL_GAP = 10;
const SIDE_PAD = 16;
const CELL_W   = Math.floor((SW - SIDE_PAD * 2 - CELL_GAP * (COLS - 1)) / COLS);

const FRAME_BODY_H = Math.round(CELL_W * 1.1);
const CORNER       = Math.round(CELL_W * 0.20);

// ── Ячейка рамки (настоящий AnimatedFrame внутри) ────────────────────────────
function FrameCell({
  frameId, color, name, unlockLevel, isSelected, isLocked, onPress, emoji,
}: {
  frameId: string; color: string; name: string;
  unlockLevel: number; isSelected: boolean; isLocked: boolean;
  onPress: () => void; emoji?: string;
}) {
  const { theme: t, isDark, f } = useTheme();
  const bodyBg = isLocked ? (isDark ? '#181818' : t.bgSurface2) : color + '22';
  const frameSize = Math.round(CELL_W * 0.58);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ alignItems: 'center', width: CELL_W }}>
      <View style={{
        width: CELL_W, height: FRAME_BODY_H,
        backgroundColor: bodyBg,
        borderRadius: CORNER,
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
      <Text style={{ color: isSelected ? color : t.textPrimary, fontSize: f.sub, textAlign: 'center', marginTop: 4, fontWeight: '600' }}
            numberOfLines={1} maxFontSizeMultiplier={1}>
        {name}
      </Text>
      <Text style={{ color: isDark ? t.textGhost : t.textMuted, fontSize: f.label, fontWeight: '700' }} maxFontSizeMultiplier={1}>
        Lv.{unlockLevel}
      </Text>
    </TouchableOpacity>
  );
}

type TabId = 'level' | 'achievement' | 'club';

const TABS: { id: TabId; icon: string; labelRU: string; labelUK: string; labelES: string }[] = [
  { id: 'level',       icon: '⭐',  labelRU: 'Уровень',      labelUK: 'Рівень', labelES: 'Nivel' },
  { id: 'achievement', icon: '🏅',  labelRU: 'Достижения',   labelUK: 'Досягнення', labelES: 'Logros' },
  { id: 'club',        icon: '🏛',  labelRU: 'Клуб',         labelUK: 'Клуб', labelES: 'Club' },
];

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function AvatarSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

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

  const getLockedFrameToast = (
    fr: FrameDef,
  ): { messageRu: string; messageUk: string; messageEs: string } => {
    const type = fr.unlockType ?? 'level';
    if (type === 'achievement') {
      const achRu = fr.unlockAchievementNameRU ?? '';
      const achUk = fr.unlockAchievementNameUK ?? '';
      const achEs = fr.unlockAchievementNameES ?? achRu;
      return {
        messageRu: `🏅 Нужно достижение\nОткрой достижение «${achRu}», чтобы разблокировать эту рамку`,
        messageUk: `🏅 Потрібне досягнення\nВідкрий досягнення «${achUk}», щоб розблокувати цю рамку`,
        messageEs: `🏅 Hace falta un logro\nConsigue «${achEs}» en la pantalla de logros para desbloquear este marco.`,
      };
    }
    if (type === 'club') {
      const clubRu = fr.unlockClubNameRU ?? '';
      const clubUk = fr.unlockClubNameUK ?? '';
      const clubEs = fr.unlockClubNameES ?? clubRu;
      return {
        messageRu: `🏛 Только для членов клуба\nЭта рамка доступна только членам «${clubRu}». Попади в этот клуб, чтобы использовать её!`,
        messageUk: `🏛 Лише для членів клубу\nЦя рамка доступна лише членам «${clubUk}». Потрапи до цього клубу, щоб використовувати її!`,
        messageEs: `🏛 Solo para miembros del club\n«${clubEs}»: entra en este club en la temporada para usar el marco.`,
      };
    }
    return {
      messageRu: `🔒 Уровень ${fr.unlockLevel}\nЭта рамка откроется на уровне ${fr.unlockLevel}`,
      messageUk: `🔒 Рівень ${fr.unlockLevel}\nЦя рамка відкриється на рівні ${fr.unlockLevel}`,
      messageEs: `🔒 Nivel ${fr.unlockLevel}\nEste marco se desbloquea al llegar al nivel ${fr.unlockLevel}.`,
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
          {triLang(lang, { ru: 'Рамка', uk: 'Рамка', es: 'Marco' })}
        </Text>
      </View>

      {/* Превью */}
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <AnimatedFrame key={selFrame} emoji={selEmoji} frameId={selFrame} size={72} />
        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 6 }}>
          {triLang(lang, { ru: `Уровень ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}` })}
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
                name={frameNameForLang(fr, lang as Lang)}
                unlockLevel={fr.unlockLevel}
                isSelected={fr.id === selFrame}
                isLocked={false}
                emoji={selEmoji}
                onPress={() => { hapticTap(); selectFrame(fr.id); }}
              />
            )),
            ...lockedInTab.map(fr => (
              <FrameCell
                key={fr.id}
                frameId={fr.id}
                color={fr.color}
                name={frameNameForLang(fr, lang as Lang)}
                unlockLevel={fr.unlockLevel}
                isSelected={false}
                isLocked={true}
                onPress={() => {
                  hapticTap();
                  const { messageRu, messageUk, messageEs } = getLockedFrameToast(fr);
                  emitAppEvent('action_toast', { type: 'info', messageRu, messageUk, messageEs });
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
                <Text style={{ fontSize: f.numLg }}>{tab.icon}</Text>
                <Text style={{ fontSize: f.label, color, fontWeight: active ? '600' : '400', letterSpacing: 0.1 }} numberOfLines={1}>
                  {triLang(lang, { ru: tab.labelRU, uk: tab.labelUK, es: tab.labelES })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

    </ScreenGradient>
  );
}
