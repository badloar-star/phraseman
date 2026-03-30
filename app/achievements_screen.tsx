import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Dimensions, Pressable, Share, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { ALL_ACHIEVEMENTS, loadAchievementStates, Achievement, AchievementState } from './achievements';
import { STORE_URL } from './config';

const { width: SW } = Dimensions.get('window');
const COLS = 4;
const SHIELD_OUTER = Math.floor((SW - 32 - (COLS - 1) * 10) / COLS);
const SHIELD_W = SHIELD_OUTER - 4;

interface AchievementStats {
  streak: number;
  loginDays: number;
  lessons: number;
  perfectLessons: number;
  xp: number;
}

async function loadAchievementStats(): Promise<AchievementStats> {
  try {
    const [streakRaw, loginRaw, xpRaw] = await Promise.all([
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('login_bonus_v1'),
      AsyncStorage.getItem('user_total_xp'),
    ]);
    const streak = parseInt(streakRaw || '0') || 0;
    const xp = parseInt(xpRaw || '0') || 0;
    let loginDays = 0;
    try { loginDays = loginRaw ? JSON.parse(loginRaw).consecutiveDays || 0 : 0; } catch {}
    let lessons = 0, perfectLessons = 0;
    try {
      const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
      const lessonEntries = await AsyncStorage.multiGet(lessonKeys);
      for (const [, saved] of lessonEntries) {
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;
          if (correct >= 45) {
            lessons++;
            if (p.filter(x => x === 'wrong').length === 0) perfectLessons++;
          }
        }
      }
    } catch {}
    return { streak, loginDays, lessons, perfectLessons, xp };
  } catch { return { streak: 0, loginDays: 0, lessons: 0, perfectLessons: 0, xp: 0 }; }
}

function getAchievementProgress(id: string, stats: AchievementStats): [number, number] | null {
  if (id.startsWith('streak_') && !id.includes('repair')) {
    const n = parseInt(id.replace('streak_', ''));
    if (!isNaN(n)) return [Math.min(stats.streak, n), n];
  }
  if (id.startsWith('login_')) {
    const n = parseInt(id.replace('login_', ''));
    if (!isNaN(n)) return [Math.min(stats.loginDays, n), n];
  }
  if (id.startsWith('lesson_') && !id.includes('perfect') && id !== 'lesson_all') {
    const n = parseInt(id.replace('lesson_', ''));
    if (!isNaN(n)) return [Math.min(stats.lessons, n), n];
  }
  if (id === 'lesson_all') return [Math.min(stats.lessons, 32), 32];
  if (id === 'lesson_perfect') return [Math.min(stats.perfectLessons, 1), 1];
  if (id === 'lesson_perfect3') return [Math.min(stats.perfectLessons, 3), 3];
  if (id === 'lesson_all_perfect') return [Math.min(stats.perfectLessons, 32), 32];
  if (id.startsWith('xp_')) {
    const n = parseInt(id.replace('xp_', ''));
    if (!isNaN(n)) return [Math.min(stats.xp, n), n];
  }
  return null;
}

// ── Иконки по ачивке (Ionicons) ───────────────────────────────────────────────
const ACHIEVEMENT_ICON: Record<string, any> = {
  streak_3:           'flame',
  streak_7:           'medal',
  streak_14:          'medal-outline',
  streak_30:          'ribbon',
  streak_60:          'ribbon-outline',
  streak_100:         'diamond',
  streak_200:         'diamond-outline',
  streak_365:         'star',
  streak_500:         'crown',
  streak_repair:      'refresh-circle',
  perfect_week:       'checkmark-circle',
  lesson_1:           'book',
  lesson_3:           'book-outline',
  lesson_5:           'book',
  lesson_10:          'school',
  lesson_15:          'library-outline',
  lesson_20:          'library',
  lesson_all:         'trophy',
  lesson_perfect:     'checkmark-done',
  lesson_perfect3:    'checkmark-done-circle',
  lesson_all_perfect: 'ribbon',
  dialog_first:       'chatbubble',
  dialog_all:         'chatbubbles',
  xp_100:             'flash-outline',
  xp_250:             'flash',
  xp_500:             'flash',
  xp_1000:            'star',
  xp_2500:            'planet-outline',
  xp_5000:            'star-half',
  xp_10000:           'infinite',
  xp_20000:           'planet',
  xp_50000:           'nuclear',
  xp_100000:          'trophy',
  wager_win:          'dice',
  personal_best:      'trending-up',
  quiz_first:          'help-circle',
  quiz_medium:         'flame',
  quiz_hard:           'skull',
  quiz_all_levels:     'albums',
  quiz_perfect_easy:   'checkmark-circle',
  quiz_perfect:        'aperture',
  quiz_perfect_medium: 'radio-button-on',
  quiz_triple_perfect: 'star',
  quiz_speed_demon:    'flash',
  league_1:            'people',
  league_3:            'library',
  league_5:            'trophy',
  club_all:            'crown',
  combo_3:            'git-merge',
  combo_10:           'radio-button-on',
  combo_20:           'shield',
  combo_50:           'flash',
  combo_100:          'nuclear',
  daily_task_first:   'checkmark-circle',
  all_daily:          'albums',
  login_7:            'calendar',
  login_14:           'calendar-outline',
  login_30:           'calendar-number',
  login_60:           'calendar-number-outline',
  login_365:          'earth',
  comeback:           'rocket',
  diagnosis:          'flask',
  night_owl:          'moon',
  early_bird:         'sunny',
  exam_first:         'document-text',
  exam_ace:           'ribbon',
  flashcards_session: 'layers',
};

// ── Цвет категории ────────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  streak:  '#FF6B35',
  lessons: '#3B82F6',
  xp:      '#F59E0B',
  quiz:    '#8B5CF6',
  combo:   '#EC4899',
  special: '#10B981',
};
const CAT_ICON: Record<string, any> = {
  streak:  'flame',
  lessons: 'book',
  xp:      'star',
  quiz:    'help-circle',
  combo:   'flash',
  special: 'rocket',
};
const CAT_LABEL_RU: Record<string, string> = {
  streak: 'Цепочка', lessons: 'Уроки', xp: 'Опыт',
  quiz: 'Квизы', combo: 'Серии', special: 'Особые',
};
const CAT_LABEL_UK: Record<string, string> = {
  streak: 'Ланцюжок', lessons: 'Уроки', xp: 'Досвід',
  quiz: 'Квізи', combo: 'Серії', special: 'Особливі',
};

const CATEGORIES = ['streak', 'lessons', 'xp', 'quiz', 'combo', 'special'] as const;

// ── Щит-значок с PNG фоном ────────────────────────────────────────────────────
function BadgeShield({
  unlocked, inProgress, color, iconName, size,
}: {
  unlocked: boolean; inProgress: boolean; color: string;
  iconName: string; size: number; maskBg?: string;
}) {
  const W      = size;
  const BODY_H = Math.round(W * 0.88);
  const TIP_H  = Math.round(W * 0.26);
  const ICON   = Math.round(W * 0.42);

  const isLocked  = !unlocked && !inProgress;
  const tintColor = isLocked ? '#383838' : inProgress ? color + '55' : color;
  const iconColor = isLocked ? '#383838' : inProgress ? color + 'BB' : '#fff';

  return (
    <View style={{ width: W, alignItems: 'center' }}>
      {/* Изображение - achievement.png (щит как фон, окрашен в цвет) */}
      <View style={{ width: W, height: BODY_H, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* PNG изображение щита, окрашенное в цвет достижения */}
        <Image
          source={require('../assets/images/levels/achivement.png')}
          style={{ width: W, height: BODY_H, tintColor }}
          resizeMode="contain"
        />
        {/* Иконка поверх щита */}
        <Ionicons
          name={iconName as any}
          size={ICON}
          color={iconColor}
          style={{ position: 'absolute' }}
        />
      </View>
      {/* V-образный низ */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: W / 2, borderRightWidth: W / 2,
        borderTopWidth: TIP_H,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor: tintColor,
        marginTop: -1,
      }} />
    </View>
  );
}

// ── Модальное окно ────────────────────────────────────────────────────────────
function AchievementModal({
  achievement, state, stats, isUK, t, f, onClose,
}: {
  achievement: Achievement;
  state: AchievementState | undefined;
  stats: AchievementStats;
  isUK: boolean;
  t: any; f: any;
  onClose: () => void;
}) {
  const unlocked = !!state?.unlockedAt;
  const color    = CAT_COLOR[achievement.category] ?? '#888';
  const iconName = ACHIEVEMENT_ICON[achievement.id] ?? 'star';
  const name     = isUK ? achievement.nameUk : achievement.nameRu;
  const desc     = isUK ? achievement.descUk : achievement.descRu;
  const prog     = !unlocked && !achievement.secret
    ? getAchievementProgress(achievement.id, stats)
    : null;
  const progPct  = prog ? Math.round((prog[0] / (prog[1] || 1)) * 100) : 0;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(isUK ? 'uk-UA' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 24, padding: 24, alignItems: 'center', width: SW - 48, gap: 12 }}>
            {/* Shield */}
            <BadgeShield
              unlocked={unlocked}
              inProgress={!unlocked && !achievement.secret}
              color={color}
              iconName={iconName}
              size={72}
              maskBg={t.bgCard}
            />

            {/* Name */}
            <Text style={{ color: unlocked ? color : t.textMuted, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
              {unlocked || !achievement.secret ? name : (isUK ? 'Секретне досягнення' : 'Секретное достижение')}
            </Text>

            {/* Description */}
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: 22 }}>
              {unlocked || !achievement.secret ? desc : (isUK ? 'Розблокуй, щоб дізнатись' : 'Разблокируй, чтобы узнать')}
            </Text>

            {/* Date unlocked */}
            {unlocked && state?.unlockedAt && (
              <View style={{ backgroundColor: color + '22', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ color, fontSize: f.sub, fontWeight: '700' }}>
                  {isUK ? 'Отримано' : 'Получено'} {formatDate(state.unlockedAt)}
                </Text>
              </View>
            )}

            {/* Progress bar */}
            {prog && prog[1] > 0 && (
              <View style={{ width: '100%', gap: 6 }}>
                <View style={{ height: 8, backgroundColor: t.bgSurface2, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: 8, width: `${progPct}%` as any, backgroundColor: color, borderRadius: 4 }} />
                </View>
                <Text style={{ color: t.textGhost, fontSize: f.sub, textAlign: 'center' }}>
                  {prog[0]} / {prog[1]}
                  {prog[1] - prog[0] > 0 && progPct > 0 && (
                    `  ·  ${isUK ? 'ще' : 'ещё'} ${prog[1] - prog[0]}`
                  )}
                </Text>
              </View>
            )}

            {/* Share (only for unlocked) */}
            {unlocked && (
              <TouchableOpacity
                style={{ flexDirection:'row', alignItems:'center', gap:6 }}
                onPress={async () => {
                  const msg = isUK
                    ? `Здобув досягнення «${name}» у Phraseman! 🏅\n${STORE_URL}`
                    : `Получил достижение «${name}» в Phraseman! 🏅\n${STORE_URL}`;
                  try { await Share.share({ message: msg }); } catch {}
                }}
              >
                <Ionicons name="share-outline" size={16} color={t.textSecond}/>
                <Text style={{ color: t.textSecond, fontSize: f.sub }}>
                  {isUK ? 'Поділитися' : 'Поделиться'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Close */}
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: t.bgSurface2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {isUK ? 'Закрити' : 'Закрыть'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const router          = useRouter();
  const { theme: t, f } = useTheme();
  const { lang }        = useLang();
  const isUK = lang === 'uk';

  const [states, setStates]   = useState<AchievementState[]>([]);
  const [stats, setStats]     = useState<AchievementStats>({ streak:0, loginDays:0, lessons:0, perfectLessons:0, xp:0 });
  const [selected, setSelected] = useState<Achievement | null>(null);

  useEffect(() => {
    loadAchievementStates().then(setStates);
    loadAchievementStats().then(setStats);
  }, []);

  const stateMap      = new Map(states.map(s => [s.id, s]));
  const unlockedCount = states.filter(s => s.unlockedAt !== null).length;
  const total         = ALL_ACHIEVEMENTS.length;

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>

        {/* Хедер */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {isUK ? 'Досягнення' : 'Достижения'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub }}>
              {unlockedCount} / {total} {isUK ? 'розблоковано' : 'разблокировано'}
            </Text>
          </View>
          <View style={{ backgroundColor: t.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: t.textSecond, fontWeight: '800', fontSize: f.body }}>
              {Math.round(unlockedCount / total * 100)}%
            </Text>
          </View>
        </View>

        {/* Общий прогресс-бар */}
        <View style={{ height: 3, backgroundColor: t.bgSurface2, marginHorizontal: 16, borderRadius: 2, marginBottom: 16 }}>
          <View style={{ height: 3, width: `${unlockedCount / total * 100}%` as any, backgroundColor: t.textSecond, borderRadius: 2 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 24 }} showsVerticalScrollIndicator={false}>
          {CATEGORIES.map(cat => {
            const color    = CAT_COLOR[cat];
            const catIcon  = CAT_ICON[cat];
            const label    = isUK ? CAT_LABEL_UK[cat] : CAT_LABEL_RU[cat];
            const catAchs  = ALL_ACHIEVEMENTS.filter(a => a.category === cat);
            const catUnlocked = catAchs.filter(a => stateMap.get(a.id)?.unlockedAt).length;

            return (
              <View key={cat}>
                {/* Заголовок категории */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={catIcon as any} size={15} color={color} />
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                    {label}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: f.sub }}>
                    {catUnlocked}/{catAchs.length}
                  </Text>
                </View>

                {/* Сетка щитов */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {catAchs.map(a => {
                    const state    = stateMap.get(a.id);
                    const unlocked = !!state?.unlockedAt;
                    const isLocked = !unlocked && (a.secret || false);
                    const inProgress = !unlocked && !a.secret;
                    const iconName = ACHIEVEMENT_ICON[a.id] ?? catIcon;
                    const prog = inProgress ? getAchievementProgress(a.id, stats) : null;
                    const progPct = prog ? Math.round((prog[0] / (prog[1] || 1)) * 100) : 0;

                    return (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => setSelected(a)}
                        activeOpacity={0.8}
                        style={{ alignItems: 'center', width: SHIELD_OUTER, gap: 5 }}
                      >
                        <BadgeShield
                          unlocked={unlocked}
                          inProgress={inProgress}
                          color={color}
                          iconName={iconName}
                          size={SHIELD_W}
                          maskBg={t.bgPrimary}
                        />

                        {/* Mini progress bar под щитом */}
                        {inProgress && prog && prog[1] > 0 && progPct > 0 && (
                          <View style={{ width: SHIELD_W * 0.8, height: 3, backgroundColor: t.bgSurface2, borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ height: 3, width: `${progPct}%` as any, backgroundColor: color, borderRadius: 2 }} />
                          </View>
                        )}

                        {/* Название */}
                        {!isLocked && (
                          <Text
                            style={{ color: unlocked ? t.textPrimary : t.textGhost, fontSize: 10, textAlign: 'center' }}
                            numberOfLines={2}
                            maxFontSizeMultiplier={1}
                          >
                            {isUK ? a.nameUk : a.nameRu}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

      </ContentWrap>

      {/* Модальное окно */}
      {selected && (
        <AchievementModal
          achievement={selected}
          state={stateMap.get(selected.id)}
          stats={stats}
          isUK={isUK}
          t={t} f={f}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
    </ScreenGradient>
  );
}
