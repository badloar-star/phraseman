import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
/**
 * _admin_compass_lab.tsx — DEV/QA лаборатория фичи «Компас».
 *
 * Зачем: брифинг «Компаса» в обычном приложении показывается только раз в день
 * и только при включённом флаге + наличии премиума, а тип дня (лёгкий / ремонт /
 * погружение / возврат) выбирается правилами по реальному пути ученика — руками
 * половину состояний не воспроизвести. Эта лаборатория:
 *   1) открывает модал брифинга в ЛЮБОМ из 4 типов дня (синтетический CompassDay,
 *      без чтения реальных сигналов) — для проверки ИИ-голоса и вёрстки;
 *   2) грузит и показывает РЕАЛЬНЫЙ сегодняшний день (через настоящий хук);
 *   3) сбрасывает локальный маркер «показано сегодня», чтобы брифинг снова всплыл
 *      на главном экране при следующем входе.
 *
 * ИЗОЛЯЦИЯ: лаборатория не трогает основной поток. Синтетические дни строятся
 * прямо здесь, реальный показ идёт через те же compass_briefing_modal /
 * use_compass_day, что и в проде. Открывается только под ENABLE_DEV_TOOLS из
 * админ-хаба настроек; в продакшн-сборке экран вырезается стабом
 * admin_compass_lab.tsx и редиректит на главную.
 *
 * НЕ относится к незавершённой работе над lesson1.tsx (другая сессия) — это
 * самодостаточный новый раздел админ-панели.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { compassOn } from './compass/compass_flags';
import { useCompassDay } from './compass/use_compass_day';
import { compassTaskRoute } from './compass/compass_task_route';
import { resolvePronunciationRoute } from './compass/compass_pronunciation_route';
import CompassBriefingModal from './compass/compass_briefing_modal';
import type { CompassDay, CompassDayType, CompassTask } from './compass/compass_brain';
import type {
  DayClosingFocus,
  DayClosingFocusKind,
  DayClosingHighlight,
  DayClosingHighlightKind,
  DayClosingRitual,
} from './compass/day_closing_ritual';
import { formatCompactNumber } from './format_compact_number';

const SEEN_KEY_PREFIX = 'compass_briefing_seen_';
const DAY_CLOSING_SEED_STORAGE_KEY = 'admin_compass_day_closing_seed_v1';

/** Палитра лаборатории — нейтральная тёмная (как в остальной админке). */
const LAB_BG = '#0E1013';
const LAB_SURFACE = '#17191E';
const LAB_BORDER = '#2B3038';
const LAB_TEXT = '#E8EAEE';
const LAB_TEXT_MUTED = '#8C94A0';
const LAB_ACCENT = '#A9B1BD';
const LAB_DANGER = '#D9A04A';

/** Описание одного синтетического дня для превью. */
interface PreviewDay {
  type: CompassDayType;
  title: string;
  desc: string;
  icon: string;
  build: () => CompassDay;
  /** Соц-сводка «Кстати…» для этого превью (если показываем блок заявок/лайков). */
  social?: string[];
  /** Полный список соц-событий для проверки раскрытия «и ещё N» без облачных чтений. */
  socialAll?: string[];
}

type DayClosingSeedPreset = {
  id: string;
  title: string;
  desc: string;
  seed: string;
};

const DAY_CLOSING_HIGHLIGHT_KINDS: readonly DayClosingHighlightKind[] = [
  'phrases',
  'xp',
  'plan',
  'tasks',
  'cards',
  'rounds',
  'streak',
];

const DAY_CLOSING_FOCUS_KINDS: readonly DayClosingFocusKind[] = [
  'due',
  'weak_phrase',
  'weak_area',
  'targeted_review',
  'fresh_phrases',
  'cards',
  'plan',
  'round',
  'one_phrase',
];

const DAY_CLOSING_REPEAT_KINDS: readonly DayClosingRitual['repeatKind'][] = [
  'fresh_phrases',
  'cards',
  'plan',
  'round',
  'one_phrase',
];

const DEFAULT_DAY_CLOSING_SEED = JSON.stringify({
  isPremium: false,
  xpToday: 1240,
  streak: 12,
  phrasesLearned: 18,
  flashcardsSaved: 6,
  quizzesCompleted: 3,
  dailyTasksClaimed: 2,
  planTasksCompleted: 1,
  repeatKind: 'fresh_phrases',
  focus: {
    kind: 'due',
    count: 7,
  },
}, null, 2);

const PREMIUM_DAY_CLOSING_SEED = JSON.stringify({
  isPremium: true,
  xpToday: 1840,
  streak: 31,
  phrasesLearned: 14,
  flashcardsSaved: 4,
  quizzesCompleted: 5,
  dailyTasksClaimed: 3,
  planTasksCompleted: 2,
  focus: {
    kind: 'weak_phrase',
    phrase: 'I have seen this film before',
    count: 2,
  },
}, null, 2);

const BIG_NUMBERS_DAY_CLOSING_SEED = JSON.stringify({
  isPremium: false,
  xpToday: 1400000,
  streak: 12000,
  phrasesLearned: 1200,
  flashcardsSaved: 12000,
  quizzesCompleted: 340,
  dailyTasksClaimed: 7,
  planTasksCompleted: 12,
  focus: {
    kind: 'targeted_review',
    count: 7,
  },
}, null, 2);

const DAY_CLOSING_PRESETS: readonly DayClosingSeedPreset[] = [
  {
    id: 'free_due',
    title: 'Free + повторение',
    desc: 'Free-состояние, фокус на due-фразах, числа режутся в K/M.',
    seed: DEFAULT_DAY_CLOSING_SEED,
  },
  {
    id: 'premium_weak_phrase',
    title: 'Premium + слабая фраза',
    desc: 'Premium-состояние, фокус на конкретной фразе.',
    seed: PREMIUM_DAY_CLOSING_SEED,
  },
  {
    id: 'big_numbers',
    title: 'Большие числа',
    desc: 'Проверка 1.2K, 12K, 1.4M в метриках.',
    seed: BIG_NUMBERS_DAY_CLOSING_SEED,
  },
];

/** Синтетические дни — по одному на каждый тип, чтобы проверить голос и вёрстку. */
const PREVIEW_DAYS: readonly PreviewDay[] = [
  {
    type: 'easy',
    title: 'Лёгкий день',
    desc: 'Всё спокойно: повтор карточек + произношение',
    icon: 'sunny-outline',
    build: () => ({
      type: 'easy',
      planDayIndex: 7,
      tasks: [
        { kind: 'flashcards_review', minutes: 2 },
        { kind: 'pronunciation', minutes: 1 },
      ],
    }),
  },
  {
    type: 'repair',
    title: 'День-ремонт',
    desc: 'Накопились ошибки: разбор слабых мест',
    icon: 'bandage-outline',
    build: () => ({
      type: 'repair',
      planDayIndex: 12,
      topicFocus: 'verb',
      tasks: [
        { kind: 'mistake_repair', minutes: 3, weakTopic: 'verb' },
        { kind: 'flashcards_review', minutes: 2 },
        { kind: 'plan_continue', minutes: 3 },
      ],
    }),
  },
  {
    type: 'deep_dive',
    title: 'День-погружение',
    desc: 'Есть слабая тема + непройденная сессия',
    icon: 'book-outline',
    build: () => ({
      type: 'deep_dive',
      planDayIndex: 18,
      topicFocus: 'article',
      lessonInviteId: 5,
      tasks: [
        { kind: 'lesson_dive', minutes: 5, focus: '5', weakTopic: 'article' },
        { kind: 'mistake_repair', minutes: 3, weakTopic: 'article' },
        { kind: 'flashcards_review', minutes: 2 },
        { kind: 'pronunciation', minutes: 1 },
      ],
    }),
  },
  {
    type: 'comeback',
    title: 'День-возврат',
    desc: 'Давно не заходил — мягкое возвращение',
    icon: 'enter-outline',
    build: () => ({
      type: 'comeback',
      planDayIndex: 21,
      tasks: [
        { kind: 'plan_continue', minutes: 4 },
        { kind: 'flashcards_review', minutes: 2 },
        { kind: 'pronunciation', minutes: 1 },
      ],
    }),
  },
  // ── Приветствия (живой голос Компаса) ────────────────────────────────────
  {
    type: 'first_day',
    title: 'Первый день — знакомство',
    desc: 'Живое приветствие новичка: имя + цель + «с чего начать»',
    icon: 'happy-outline',
    build: () => ({
      type: 'first_day',
      greetingName: 'Олег',
      goal: 'travel',
      level: 'beginner',
      hasPremium: true,
      inductionFeature: 'dialogs',
      tasks: [],
    }),
  },
  {
    type: 'first_day',
    title: 'Первый день — без имени/без премиума',
    desc: 'Тот же экран, но юзер не назвал имя и не купил доступ',
    icon: 'person-outline',
    build: () => ({
      type: 'first_day',
      greetingName: '',
      goal: 'words',
      hasPremium: false,
      inductionFeature: 'flashcards',
      tasks: [],
    }),
  },
  // ── Соц-сводка «Кстати…» (заявки в друзья / приняли заявку / лайки) ───────
  {
    type: 'easy',
    title: 'Обычный день + соц-сводка',
    desc: 'Блок «Кстати…»: приняли заявку + лайк',
    icon: 'people-outline',
    build: () => ({
      type: 'easy',
      planDayIndex: 4,
      tasks: [
        { kind: 'flashcards_review', minutes: 2 },
        { kind: 'pronunciation', minutes: 1 },
      ],
    }),
    social: ['Аня приняла твою заявку в друзья 🤝', 'Боб поставил тебе лайк ❤️'],
  },
  {
    type: 'comeback',
    title: 'Возврат + соц-сводка',
    desc: 'Приветствие возврата вместе с блоком «Кстати…»',
    icon: 'people-circle-outline',
    build: () => ({
      type: 'comeback',
      greetingName: 'Олег',
      tasks: [
        { kind: 'plan_continue', minutes: 4 },
        { kind: 'flashcards_review', minutes: 2 },
      ],
    }),
    social: ['Катя хочет добавить тебя в друзья 👋'],
  },
  {
    type: 'deep_dive',
    title: 'Соц-сводка: много событий',
    desc: 'Три строки + свёртка «и ещё N»',
    icon: 'notifications-outline',
    build: () => ({
      type: 'deep_dive',
      planDayIndex: 9,
      topicFocus: 'article',
      tasks: [
        { kind: 'lesson_dive', minutes: 5, focus: '5' },
        { kind: 'flashcards_review', minutes: 2 },
      ],
    }),
    social: [
      'Аня приняла твою заявку в друзья 🤝',
      'Боб хочет добавить тебя в друзья 👋',
      'Лена поставила тебе лайк ❤️ и ещё 3',
    ],
    socialAll: [
      'Аня приняла твою заявку в друзья 🤝',
      'Боб хочет добавить тебя в друзья 👋',
      'Лена поставила тебе лайк ❤️',
      'Ира поставила тебе лайк ❤️',
      'Макс поставил тебе лайк ❤️',
      'Оля хочет добавить тебя в друзья 👋',
    ],
  },
];

function readSeedObject(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('JSON seed не разобран. Проверь кавычки, запятые и фигурные скобки.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Seed должен быть JSON-объектом.');
  }
  return parsed as Record<string, unknown>;
}

function readSeedNestedObject(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readSeedNumber(source: Record<string, unknown>, key: string, fallback = 0): number {
  const n = Number(source[key] ?? fallback);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function readSeedString(source: Record<string, unknown>, key: string, fallback = ''): string {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readSeedBool(source: Record<string, unknown>, key: string, fallback = false): boolean {
  const value = source[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'premium'].includes(normalized)) return true;
    if (['false', '0', 'no', 'free'].includes(normalized)) return false;
  }
  return fallback;
}

function isDayClosingHighlightKind(value: unknown): value is DayClosingHighlightKind {
  return typeof value === 'string' && DAY_CLOSING_HIGHLIGHT_KINDS.includes(value as DayClosingHighlightKind);
}

function isDayClosingFocusKind(value: unknown): value is DayClosingFocusKind {
  return typeof value === 'string' && DAY_CLOSING_FOCUS_KINDS.includes(value as DayClosingFocusKind);
}

function isDayClosingRepeatKind(value: unknown): value is DayClosingRitual['repeatKind'] {
  return typeof value === 'string' && DAY_CLOSING_REPEAT_KINDS.includes(value as DayClosingRitual['repeatKind']);
}

function buildSeedHighlights(seed: Record<string, unknown>, base: {
  xpToday: number;
  streak: number;
  phrasesLearned: number;
  flashcardsSaved: number;
  quizzesCompleted: number;
  dailyTasksClaimed: number;
  planTasksCompleted: number;
}): DayClosingHighlight[] {
  const custom = seed.highlights;
  if (Array.isArray(custom)) {
    const highlights = custom.flatMap((item): DayClosingHighlight[] => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const row = item as Record<string, unknown>;
      if (!isDayClosingHighlightKind(row.kind)) return [];
      const value = readSeedString(row, 'value');
      return value ? [{ kind: row.kind, value }] : [];
    });
    if (highlights.length > 0) return highlights.slice(0, 3);
  }

  const highlights: DayClosingHighlight[] = [];
  if (base.phrasesLearned > 0) highlights.push({ kind: 'phrases', value: formatCompactNumber(base.phrasesLearned) });
  if (base.xpToday > 0) highlights.push({ kind: 'xp', value: formatCompactNumber(base.xpToday) });
  if (base.planTasksCompleted > 0) highlights.push({ kind: 'plan', value: formatCompactNumber(base.planTasksCompleted) });
  if (base.dailyTasksClaimed > 0) highlights.push({ kind: 'tasks', value: formatCompactNumber(base.dailyTasksClaimed) });
  if (base.flashcardsSaved > 0) highlights.push({ kind: 'cards', value: formatCompactNumber(base.flashcardsSaved) });
  if (base.quizzesCompleted > 0) highlights.push({ kind: 'rounds', value: formatCompactNumber(base.quizzesCompleted) });
  if (base.streak > 0) highlights.push({ kind: 'streak', value: formatCompactNumber(base.streak) });
  return highlights.slice(0, 3);
}

function buildSeedRepeatKind(seed: Record<string, unknown>, base: {
  phrasesLearned: number;
  flashcardsSaved: number;
  planTasksCompleted: number;
  quizzesCompleted: number;
}): DayClosingRitual['repeatKind'] {
  if (isDayClosingRepeatKind(seed.repeatKind)) return seed.repeatKind;
  if (base.phrasesLearned > 0) return 'fresh_phrases';
  if (base.flashcardsSaved > 0) return 'cards';
  if (base.planTasksCompleted > 0) return 'plan';
  if (base.quizzesCompleted > 0) return 'round';
  return 'one_phrase';
}

function buildSeedFocus(seed: Record<string, unknown>): DayClosingFocus {
  const focusSeed = readSeedNestedObject(seed, 'focus');
  const kindRaw = focusSeed.kind ?? seed.focusKind;
  const kind = isDayClosingFocusKind(kindRaw) ? kindRaw : 'due';
  const rawCount = readSeedNumber(focusSeed, 'count', readSeedNumber(seed, 'focusCount', 0));
  const value = readSeedString(focusSeed, 'value') || (rawCount > 0 ? formatCompactNumber(rawCount) : undefined);
  const phrase = readSeedString(focusSeed, 'phrase', readSeedString(seed, 'focusPhrase'));
  const category = readSeedString(focusSeed, 'category', readSeedString(seed, 'focusCategory'));

  if (kind === 'weak_phrase') {
    return {
      kind,
      phrase: phrase || 'I have seen this film before',
      rawCount: rawCount || 2,
      value: value || formatCompactNumber(rawCount || 2),
    };
  }
  if (kind === 'weak_area') {
    return {
      kind,
      category: category || 'article',
      rawCount: rawCount || 3,
      value: value || formatCompactNumber(rawCount || 3),
    };
  }
  if (kind === 'due' || kind === 'targeted_review') {
    const fallbackCount = kind === 'due' ? 12 : 7;
    return {
      kind,
      rawCount: rawCount || fallbackCount,
      value: value || formatCompactNumber(rawCount || fallbackCount),
    };
  }
  return { kind };
}

function buildDayClosingDayFromSeed(rawSeed: string): CompassDay {
  const seed = readSeedObject(rawSeed);
  const isPremium = readSeedBool(seed, 'isPremium', readSeedBool(seed, 'premium', false));
  const base = {
    xpToday: readSeedNumber(seed, 'xpToday', 1240),
    streak: readSeedNumber(seed, 'streak', 12),
    phrasesLearned: readSeedNumber(seed, 'phrasesLearned', 18),
    flashcardsSaved: readSeedNumber(seed, 'flashcardsSaved', 6),
    quizzesCompleted: readSeedNumber(seed, 'quizzesCompleted', 3),
    dailyTasksClaimed: readSeedNumber(seed, 'dailyTasksClaimed', 2),
    planTasksCompleted: readSeedNumber(seed, 'planTasksCompleted', 1),
  };
  const ritual: DayClosingRitual = {
    dateKey: readSeedString(seed, 'dateKey', 'admin-seed'),
    isPremium,
    ...base,
    highlights: buildSeedHighlights(seed, base),
    repeatKind: buildSeedRepeatKind(seed, base),
    focus: buildSeedFocus(seed),
  };

  if (ritual.highlights.length === 0) {
    ritual.highlights = [{ kind: 'xp', value: formatCompactNumber(ritual.xpToday || 1) }];
  }

  return {
    type: 'day_closing',
    tasks: [],
    hasPremium: isPremium,
    dayClosing: ritual,
  };
}

export default function AdminCompassLab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ panel?: string }>();
  const dayClosingAutoOpenRef = useRef(false);
  const insets = useStableSafeAreaInsets();
  const { theme: t } = useTheme();
  const { lang } = useLang();

  // Стабильный «сейчас» для реального дня — не пересчитываем каждый рендер,
  // иначе хук зациклится (та же причина, что и в compass_briefing_host).
  const nowMs = useMemo(() => Date.now(), []);
  const { day: realDay, loading: realLoading } = useCompassDay(nowMs);

  // Какой день сейчас показан в модале (синтетический или реальный); null = закрыто.
  const [shownDay, setShownDay] = useState<CompassDay | null>(null);
  // Соц-сводка «Кстати…» для текущего превью (пусто = блок не показывается).
  const [shownSocial, setShownSocial] = useState<string[]>([]);
  const [shownSocialAll, setShownSocialAll] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [dayClosingSeed, setDayClosingSeed] = useState(DEFAULT_DAY_CLOSING_SEED);
  const [dayClosingSeedMsg, setDayClosingSeedMsg] = useState<string | null>(null);

  const showDay = (day: CompassDay | null, social: string[] = [], socialAll: string[] = social) => {
    hapticTap();
    if (!day) return;
    setShownDay(day);
    setShownSocial(social);
    setShownSocialAll(socialAll);
    setVisible(true);
  };

  const closeModal = () => setVisible(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DAY_CLOSING_SEED_STORAGE_KEY)
      .then((saved) => {
        if (mounted && saved?.trim()) setDayClosingSeed(saved);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const showDayClosingSeed = (rawSeed = dayClosingSeed) => {
    try {
      const day = buildDayClosingDayFromSeed(rawSeed);
      setDayClosingSeedMsg(null);
      showDay(day);
    } catch (error) {
      setDayClosingSeedMsg(error instanceof Error ? error.message : 'Не удалось разобрать custom seed.');
    }
  };

  useEffect(() => {
    if (params.panel !== 'day_closing' || dayClosingAutoOpenRef.current) return;
    dayClosingAutoOpenRef.current = true;
    showDayClosingSeed(DEFAULT_DAY_CLOSING_SEED);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dev route auto-opens one known-safe preview seed once
  }, [params.panel]);

  const applyDayClosingPreset = (preset: DayClosingSeedPreset) => {
    hapticTap();
    setDayClosingSeed(preset.seed);
    setDayClosingSeedMsg(`${preset.title}: сид подставлен.`);
    showDayClosingSeed(preset.seed);
  };

  const saveDayClosingSeed = async () => {
    hapticTap();
    try {
      buildDayClosingDayFromSeed(dayClosingSeed);
      await AsyncStorage.setItem(DAY_CLOSING_SEED_STORAGE_KEY, dayClosingSeed);
      setDayClosingSeedMsg('Custom seed сохранён локально на этом устройстве.');
    } catch (error) {
      setDayClosingSeedMsg(error instanceof Error ? error.message : 'Не удалось сохранить custom seed.');
    }
  };

  const resetDayClosingSeed = async () => {
    hapticTap();
    setDayClosingSeed(DEFAULT_DAY_CLOSING_SEED);
    await AsyncStorage.removeItem(DAY_CLOSING_SEED_STORAGE_KEY).catch(() => {});
    setDayClosingSeedMsg('Custom seed сброшен к free-пресету.');
  };

  // Тап по задаче в превью: закрываем модал и открываем её реальный экран —
  // та же маршрутизация, что в проде (для проверки переходов из QA).
  const handleTaskPress = (task: CompassTask) => {
    setVisible(false);
    void (async () => {
      let route = compassTaskRoute(task, shownDay);
      if (task.kind === 'pronunciation') {
        const direct = await resolvePronunciationRoute();
        if (direct) route = direct;
      }
      router.push(route.params ? { pathname: route.pathname, params: route.params } as never : route.pathname as never);
    })();
  };

  // Сбросить ВСЕ маркеры «показано сегодня» — чтобы брифинг снова всплыл дома.
  const resetSeen = async () => {
    hapticTap();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const seenKeys = keys.filter((k) => k.startsWith(SEEN_KEY_PREFIX));
      if (seenKeys.length > 0) await AsyncStorage.multiRemove(seenKeys);
      setResetMsg(`Сброшено маркеров: ${seenKeys.length}. Брифинг снова всплывёт на главной.`);
    } catch {
      setResetMsg('Не удалось сбросить маркеры (AsyncStorage).');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={LAB_TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Компас — лаборатория</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Статус флага */}
        <View style={styles.banner}>
          <Ionicons
            name={compassOn() ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={18}
            color={compassOn() ? LAB_ACCENT : LAB_DANGER}
          />
          <Text style={styles.bannerText}>
            {compassOn()
              ? 'Компас включён — модал и реальный день доступны.'
              : 'Компас выключен (флаг compass_enabled). Превью в лаборатории всё равно откроется локально; реальный показ в приложении останется выключенным.'}
          </Text>
        </View>

        {/* Day-closing ritual — тот самый вечерний модал с custom seed. */}
        <Text style={styles.sectionLabel}>Итог дня — модал ритуала</Text>
        <View style={styles.seedPanel}>
          <View style={styles.seedHead}>
            <Ionicons name="moon-outline" size={22} color={LAB_ACCENT} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Day-closing ritual</Text>
              <Text style={styles.rowSub}>Превью без Firebase: free/premium, K/M-числа и фокус на завтра.</Text>
            </View>
          </View>

          <View style={styles.seedPresetList}>
            {DAY_CLOSING_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={styles.seedPreset}
                activeOpacity={0.72}
                onPress={() => applyDayClosingPreset(preset)}
                accessibilityRole="button"
                accessibilityLabel={`Показать пресет итогов дня: ${preset.title}`}
              >
                <Text style={styles.seedPresetTitle}>{preset.title}</Text>
                <Text style={styles.seedPresetDesc}>{preset.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.seedLabel}>Custom seed JSON</Text>
          <TextInput
            testID="admin-compass-day-closing-custom-seed"
            value={dayClosingSeed}
            onChangeText={(text) => {
              setDayClosingSeed(text);
              setDayClosingSeedMsg(null);
            }}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={styles.seedInput}
            placeholder='{"xpToday": 1200, "focus": {"kind": "due", "count": 12}}'
            placeholderTextColor={LAB_TEXT_MUTED}
            accessibilityLabel="Custom seed JSON для модала итогов дня"
          />
          <Text style={styles.seedHelp}>
            Поля: isPremium, xpToday, streak, phrasesLearned, flashcardsSaved, quizzesCompleted,
            dailyTasksClaimed, planTasksCompleted, repeatKind, focus.kind, focus.count, focus.phrase, focus.category.
          </Text>
          {dayClosingSeedMsg && (
            <Text style={[styles.seedMsg, (dayClosingSeedMsg.includes('Seed должен') || dayClosingSeedMsg.includes('JSON seed')) && styles.seedMsgDanger]}>
              {dayClosingSeedMsg}
            </Text>
          )}

          <View style={styles.seedActions}>
            <TouchableOpacity
              testID="admin-compass-day-closing-show-seed"
              style={[styles.seedButton, styles.seedButtonPrimary]}
              activeOpacity={0.78}
              onPress={() => showDayClosingSeed()}
              accessibilityRole="button"
              accessibilityLabel="Показать модал итогов дня с custom seed"
            >
              <Text style={styles.seedButtonPrimaryText}>Показать custom seed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.seedButton}
              activeOpacity={0.72}
              onPress={saveDayClosingSeed}
              accessibilityRole="button"
              accessibilityLabel="Сохранить custom seed локально"
            >
              <Text style={styles.seedButtonText}>Сохранить сид</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.seedButton}
              activeOpacity={0.72}
              onPress={resetDayClosingSeed}
              accessibilityRole="button"
              accessibilityLabel="Сбросить custom seed"
            >
              <Text style={styles.seedButtonText}>Сбросить</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Превью брифинга — типы дня, приветствия, соц-сводка «Кстати…» */}
        <Text style={styles.sectionLabel}>Превью модалок — разные ситуации</Text>
        {PREVIEW_DAYS.map((d) => (
          <TouchableOpacity key={`${d.type}-${d.title}`} style={styles.row} onPress={() => showDay(d.build(), d.social, d.socialAll)} activeOpacity={0.6}>
            <Ionicons name={d.icon as any} size={22} color={LAB_ACCENT} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{d.title}</Text>
              <Text style={styles.rowSub}>{d.desc}</Text>
            </View>
            <Ionicons name="play-outline" size={18} color={LAB_TEXT_MUTED} />
          </TouchableOpacity>
        ))}

        {/* Реальный день */}
        <Text style={styles.sectionLabel}>Реальный день (по твоему пути)</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => showDay(realDay)}
          activeOpacity={0.6}
          disabled={realLoading || !realDay}
        >
          <Ionicons name="navigate-outline" size={22} color={realDay ? LAB_ACCENT : LAB_TEXT_MUTED} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, !realDay && { color: LAB_TEXT_MUTED }]}>
              {realLoading ? 'Загружаю реальный день…' : realDay ? `Показать реальный день (${realDay.type})` : 'Реальный день недоступен'}
            </Text>
            <Text style={styles.rowSub}>
              {realDay
                ? `${realDay.tasks.length} задач${realDay.planDayIndex ? ` · план: день ${realDay.planDayIndex}` : ''}`
                : 'Включи Компас и набери немного активности'}
            </Text>
          </View>
          <Ionicons name="play-outline" size={18} color={LAB_TEXT_MUTED} />
        </TouchableOpacity>

        {/* Обновление дней — сброс маркера показа */}
        <Text style={styles.sectionLabel}>Обновление дней</Text>
        <TouchableOpacity style={[styles.row, styles.dangerRow]} onPress={resetSeen} activeOpacity={0.6}>
          <Ionicons name="refresh-outline" size={22} color={LAB_DANGER} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: LAB_DANGER }]}>Сбросить «показано сегодня»</Text>
            <Text style={styles.rowSub}>Брифинг снова всплывёт при следующем входе на главную</Text>
          </View>
        </TouchableOpacity>
        {resetMsg && (
          <Text style={styles.resetMsg}>{resetMsg}</Text>
        )}
      </ScrollView>

      {/* Сам модал брифинга — те же компоненты, что в проде. */}
      <CompassBriefingModal
        visible={visible}
        day={shownDay}
        socialLines={shownSocial}
        socialAllLines={shownSocialAll}
        onStart={closeModal}
        onLater={closeModal}
        onTaskPress={handleTaskPress}
        ignoreCompassFlag
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: LAB_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: LAB_BORDER,
  },
  backBtn: { width: 24, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', color: LAB_TEXT, fontSize: 16, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LAB_BORDER,
    backgroundColor: LAB_SURFACE,
  },
  bannerText: { flex: 1, color: LAB_TEXT_MUTED, fontSize: 12, lineHeight: 17 },
  sectionLabel: {
    color: LAB_TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LAB_BORDER,
    backgroundColor: LAB_SURFACE,
  },
  dangerRow: { borderColor: LAB_DANGER + '55', backgroundColor: '#1E1A12' },
  rowTitle: { color: LAB_TEXT, fontSize: 15, fontWeight: '600' },
  rowSub: { color: LAB_TEXT_MUTED, fontSize: 12, marginTop: 2 },
  seedPanel: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LAB_BORDER,
    backgroundColor: LAB_SURFACE,
    overflow: 'hidden',
  },
  seedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  seedPresetList: { borderTopWidth: 0.5, borderTopColor: LAB_BORDER },
  seedPreset: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: LAB_BORDER,
  },
  seedPresetTitle: { color: LAB_TEXT, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  seedPresetDesc: { color: LAB_TEXT_MUTED, fontSize: 12, lineHeight: 17, marginTop: 2 },
  seedLabel: {
    color: LAB_TEXT,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  seedInput: {
    minHeight: 172,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LAB_BORDER,
    backgroundColor: LAB_BG,
    color: LAB_TEXT,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Courier',
  },
  seedHelp: {
    color: LAB_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  seedMsg: {
    color: LAB_ACCENT,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  seedMsgDanger: { color: LAB_DANGER },
  seedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  seedButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LAB_BORDER,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  seedButtonPrimary: {
    backgroundColor: LAB_ACCENT,
    borderColor: LAB_ACCENT,
  },
  seedButtonText: { color: LAB_TEXT, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  seedButtonPrimaryText: { color: '#10131b', fontSize: 12, lineHeight: 16, fontWeight: '900' },
  resetMsg: {
    color: LAB_ACCENT,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
});
