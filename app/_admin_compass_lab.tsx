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
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { compassOn } from './compass/compass_flags';
import { useCompassDay } from './compass/use_compass_day';
import { compassTaskRoute } from './compass/compass_task_route';
import { resolvePronunciationRoute } from './compass/compass_pronunciation_route';
import CompassBriefingModal from './compass/compass_briefing_modal';
import type { CompassDay, CompassDayType, CompassTask } from './compass/compass_brain';

const SEEN_KEY_PREFIX = 'compass_briefing_seen_';

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
}

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
  },
];

export default function AdminCompassLab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [visible, setVisible] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const showDay = (day: CompassDay | null, social: string[] = []) => {
    hapticTap();
    if (!day) return;
    setShownDay(day);
    setShownSocial(social);
    setVisible(true);
  };

  const closeModal = () => setVisible(false);

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
              : 'Компас выключен (флаг compass_enabled). Модал брифинга вернёт пусто. Включи флаг в Пульте, чтобы видеть содержимое.'}
          </Text>
        </View>

        {/* Превью брифинга — типы дня, приветствия, соц-сводка «Кстати…» */}
        <Text style={styles.sectionLabel}>Превью модалок — разные ситуации</Text>
        {PREVIEW_DAYS.map((d) => (
          <TouchableOpacity key={`${d.type}-${d.title}`} style={styles.row} onPress={() => showDay(d.build(), d.social)} activeOpacity={0.6}>
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
        onStart={closeModal}
        onLater={closeModal}
        onTaskPress={handleTaskPress}
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
  resetMsg: {
    color: LAB_ACCENT,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
});
