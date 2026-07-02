/**
 * Компас — модал брифинга дня. ОБОЛОЧКА, Волна 2.3.
 *
 * Один тёплый экран при входе: голос Компаса (комментарий по типу дня) + список
 * задач дня + кнопка «Начать день». ВСЕ тексты — через triLang из compass_copy
 * (канон Библии). Никакой собственной логики выбора дня — получает готовый
 * CompassDay из мозга.
 *
 * ИЗОЛЯЦИЯ: компонент рендерит null, если Компас выключен или дня нет. Вызывающий
 * экран (home) монтирует его за флагом — при off ничего не появляется.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { compassIconSource } from '../../constants/weeklyCompassIcons';
import { compassOn } from './compass_flags';
import type { CompassDay, CompassDayType, CompassTask, CompassTaskKind } from './compass_brain';
import DayClosingPanel from './compass_day_closing_panel';
import { useCompassVoice } from './use_compass_voice';
import {
  COMPASS_BRIEFING_TITLE,
  COMPASS_START_DAY,
  COMPASS_LETS_GO,
  COMPASS_LATER,
  COMPASS_TASK_TITLE,
  COMPASS_TASK_MINUTES,
  COMPASS_DAY_CLOSING_TITLE,
  buildCompassGreeting,
  buildCompassInduction,
} from './compass_copy';
import { COMPASS_SOCIAL_COLLAPSE, COMPASS_SOCIAL_HEADER, COMPASS_SOCIAL_SHOW_ALL } from './compass_social_copy';

const TASK_ICON: Record<CompassTaskKind, React.ComponentProps<typeof Ionicons>['name']> = {
  lesson_dive: 'book-outline',
  mistake_repair: 'bandage-outline',
  flashcards_review: 'albums-outline',
  pronunciation: 'mic-outline',
  plan_continue: 'navigate-outline',
};

/**
 * Угол стрелки Компаса в бейдже — «цель дня» по типу дня. Стрелка ОДИН раз
 * докручивается к цели при показе (пружинный overshoot), дальше статична —
 * никаких фоновых циклов (перф-канон).
 */
const DAY_NEEDLE_ANGLE: Record<CompassDayType, number> = {
  first_day: 0,
  easy: 40,
  deep_dive: 140,
  repair: 250,
  comeback: 320,
  day_closing: 180,
};

interface CompassBriefingModalProps {
  visible: boolean;
  day: CompassDay | null;
  onStart: () => void;
  onLater: () => void;
  /**
   * Тап по конкретной задаче дня (открыть её экран). Необязателен: если не задан —
   * строки задач остаются некликабельными (поведение «только просмотр»).
   */
  onTaskPress?: (task: CompassTask) => void;
  /** Тап по индакшн-подсказке «попробуй первым» (открыть фичу). Необязателен. */
  onInductionPress?: (feature: NonNullable<CompassDay['inductionFeature']>) => void;
  /**
   * Локализованные строки соц-сводки «Кстати…» (заявки/принятия/лайки).
   * Необязательно: пусто/нет — блок не рендерится.
   */
  socialLines?: string[];
  socialAllLines?: string[];
  /** Мост к полному доступу с запертого вечернего ритуала (free-tier). */
  onDayClosingUpgrade?: () => void;
  accountReminder?: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  } | null;
  onAccountLinkPress?: () => void;
  /** Только для dev/QA лабораторий: показать превью, даже если remote flag Компаса выключен. */
  ignoreCompassFlag?: boolean;
}

export default function CompassBriefingModal({
  visible,
  day,
  onStart,
  onLater,
  onTaskPress,
  onInductionPress,
  onDayClosingUpgrade,
  socialLines,
  socialAllLines,
  accountReminder,
  onAccountLinkPress,
  ignoreCompassFlag = false,
}: CompassBriefingModalProps) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const dayClosing = day?.type === 'day_closing' ? day.dayClosing : undefined;
  const isDayClosing = !!dayClosing;
  const [socialExpanded, setSocialExpanded] = useState(false);
  // Гибрид-голос: текст Библии сразу, живой ИИ-текст подменяет когда придёт.
  // Хук вызывается всегда (правила хуков) и сам безопасно обрабатывает day=null.
  // Keep hooks unconditional, but avoid the AI voice callable while the modal is hidden.
  const comment = useCompassVoice(visible && !isDayClosing ? day : null);

  // Тактильный «стук» Компаса при появлении брифинга: мягкий tap (не success —
  // чтобы открытие не спамило сильной вибрацией). Анти-наложение и уважение к
  // настройке хаптика — внутри hapticTap. Вызывается один раз на показ.
  useEffect(() => {
    if (visible && day) void hapticTap();
  }, [visible, day]);

  // ОДНОРАЗОВЫЕ анимации показа (перф-канон: без циклов на фоне):
  //  - needleTurn: стрелка бейджа докручивается к «цели дня» с пружинкой;
  //  - reveal: содержимое (голос → блоки → задачи) проявляется каскадом.
  // Значения сбрасываются на каждый показ, при скрытии не анимируют ничего.
  const needleTurn = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible || !day) return;
    needleTurn.setValue(0);
    reveal.setValue(0);
    Animated.parallel([
      Animated.timing(needleTurn, {
        toValue: 1,
        duration: 850,
        delay: 180,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.timing(reveal, {
        toValue: 1,
        duration: 780,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, day, needleTurn, reveal]);

  useEffect(() => {
    if (!visible || isDayClosing) setSocialExpanded(false);
  }, [visible, isDayClosing, socialLines, socialAllLines]);

  if ((!ignoreCompassFlag && !compassOn()) || !day) return null;

  const title = triLang(lang, isDayClosing ? COMPASS_DAY_CLOSING_TITLE : COMPASS_BRIEFING_TITLE);
  const dayLabel = !isDayClosing && day.planDayIndex ? `${title} · ${dayWord(lang)} ${day.planDayIndex}` : title;

  // Приветственные дни (первый день / возврат) — живое обращение Компаса от
  // первого лица (знакомство + благодарность/роль + цель + «не навязываю» +
  // вопрос). Обычные дни приветствия не имеют — там говорит комментарий по типу
  // дня (как раньше). Индакшн «с чего начать» — только новичкам/возврату.
  const greeting = isDayClosing ? [] : buildCompassGreeting(day, lang);
  const induction = isDayClosing ? null : buildCompassInduction(day.inductionFeature, lang);
  const isWelcome = greeting.length > 0;
  const social = isDayClosing ? [] : (socialLines ?? []).filter(line => line.trim().length > 0);
  const socialFull = isDayClosing ? [] : (socialAllLines ?? social).filter(line => line.trim().length > 0);
  const socialHasMore = socialFull.length > social.length;
  const socialShown = socialExpanded && socialHasMore ? socialFull : social;
  const socialHeader = triLang(lang, COMPASS_SOCIAL_HEADER);
  const socialToggleText = socialExpanded
    ? triLang(lang, COMPASS_SOCIAL_COLLAPSE)
    : triLang(lang, COMPASS_SOCIAL_SHOW_ALL).replace('{count}', String(socialFull.length));
  const primaryLabel = triLang(lang, isWelcome ? COMPASS_LETS_GO : COMPASS_START_DAY);
  const secondaryLabel = triLang(lang, COMPASS_LATER);
  const minutesLabel = triLang(lang, COMPASS_TASK_MINUTES);

  // Стрелка бейджа: от лёгкого «недокрута» к углу цели дня (пружинка в Easing).
  const needleRotate = needleTurn.interpolate({
    inputRange: [0, 1],
    outputRange: ['-70deg', `${DAY_NEEDLE_ANGLE[day.type] ?? 0}deg`],
  });
  // Каскад проявления: сперва голос/приветствие, следом блоки и задачи.
  const revealHead = {
    opacity: reveal.interpolate({ inputRange: [0, 0.55], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 0.55], outputRange: [10, 0], extrapolate: 'clamp' as const }) }],
  };
  const revealBody = {
    opacity: reveal.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [{ translateY: reveal.interpolate({ inputRange: [0.3, 1], outputRange: [12, 0], extrapolate: 'clamp' as const }) }],
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.bgCard, borderColor: t.accent + '44' }]}>
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: t.accent + '1A', borderColor: t.accent + '55' }]}>
              <Animated.View style={{ transform: [{ rotate: needleRotate }] }}>
                <Ionicons name="compass-outline" size={20} color={t.accent} />
              </Animated.View>
            </View>
            <Text style={[styles.title, { color: t.textPrimary }]}>
              {dayLabel}
            </Text>
            {/* Иконка компаса темы — свой ассет на каждую тему (правый верхний угол). */}
            <Image
              source={compassIconSource(themeMode)}
              style={styles.themeGlyph}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          {isDayClosing && dayClosing ? (
            <Animated.View style={revealHead}>
              <DayClosingPanel
                dayClosing={dayClosing}
                onClose={onStart}
                onUpgrade={onDayClosingUpgrade}
                onLater={onLater}
                preview={ignoreCompassFlag}
              />
            </Animated.View>
          ) : isWelcome ? (
            <Animated.View style={[styles.greeting, revealHead]}>
              {greeting.map((line, i) => (
                <Text
                  key={`greet-${i}`}
                  style={[i === 0 ? styles.greetLead : styles.greetLine, { color: i === 0 ? t.textPrimary : t.textSecond }]}
                >
                  {line}
                </Text>
              ))}
            </Animated.View>
          ) : (
            <Animated.Text style={[styles.comment, { color: t.textSecond }, revealHead]}>{comment}</Animated.Text>
          )}

          {/* «Кстати…» — тёплая соц-сводка: заявки в друзья / принятия / лайки. */}
          {/* Отдельный блок-контейнер, не мешается с днём; пусто — не рендерится. */}
          {social.length > 0 && (
            <TouchableOpacity
              testID="compass-social-summary"
              activeOpacity={socialHasMore ? 0.78 : 1}
              disabled={!socialHasMore}
              onPressIn={socialHasMore ? () => hapticTap() : undefined}
              onPress={socialHasMore ? () => setSocialExpanded((v) => !v) : undefined}
              accessibilityRole={socialHasMore ? 'button' : undefined}
              accessibilityLabel={socialHasMore ? socialToggleText : socialHeader}
              style={[styles.social, { backgroundColor: t.accent + '10', borderColor: t.accent + '33' }]}
            >
              <View style={styles.socialHead}>
                <Ionicons name="people-outline" size={14} color={t.accent} />
                <Text style={[styles.socialLabel, { color: t.accent }]}>{socialHeader}</Text>
                {socialHasMore && (
                  <View style={[styles.socialToggle, { borderColor: t.accent + '33' }]}>
                    <Text style={[styles.socialToggleText, { color: t.accent }]} numberOfLines={1}>
                      {socialToggleText}
                    </Text>
                    <Ionicons name={socialExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={t.accent} />
                  </View>
                )}
              </View>
              {socialShown.map((line, i) => (
                <Text key={`social-${i}`} style={[styles.socialLine, { color: t.textPrimary }]}>
                  {line}
                </Text>
              ))}
            </TouchableOpacity>
          )}

          {accountReminder && (
            <View
              testID="compass-account-link-reminder"
              style={[styles.accountReminder, { backgroundColor: t.accent + '12', borderColor: t.accent + '44' }]}
            >
              <View style={styles.accountReminderHead}>
                <Ionicons name="cloud-upload-outline" size={15} color={t.accent} />
                <Text style={[styles.accountReminderEyebrow, { color: t.accent }]}>{accountReminder.eyebrow}</Text>
              </View>
              <Text style={[styles.accountReminderTitle, { color: t.textPrimary }]}>{accountReminder.title}</Text>
              <Text style={[styles.accountReminderBody, { color: t.textSecond }]}>{accountReminder.body}</Text>
              {onAccountLinkPress && (
                <TouchableOpacity
                  testID="compass-account-link-cta"
                  activeOpacity={0.84}
                  onPressIn={() => hapticTap()}
                  onPress={onAccountLinkPress}
                  style={[styles.accountReminderCta, { backgroundColor: t.accent }]}
                >
                  <Text style={styles.accountReminderCtaText}>{accountReminder.cta}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Индакшн «с чего здорово начать»: одна крутая фича под ситуацию. */}
          {induction && (
            <TouchableOpacity
              activeOpacity={onInductionPress ? 0.8 : 1}
              disabled={!onInductionPress || !day.inductionFeature}
              onPressIn={onInductionPress && day.inductionFeature ? () => hapticTap() : undefined}
              onPress={onInductionPress && day.inductionFeature ? () => onInductionPress(day.inductionFeature!) : undefined}
              style={[styles.induction, { backgroundColor: t.accent + '12', borderColor: t.accent + '44' }]}
            >
              <View style={styles.inductionHead}>
                <Ionicons name="sparkles-outline" size={14} color={t.accent} />
                <Text style={[styles.inductionLabel, { color: t.accent }]}>{induction.label}</Text>
              </View>
              <Text style={[styles.inductionText, { color: t.textPrimary }]}>{induction.text}</Text>
              {onInductionPress && (
                <View style={styles.inductionCta}>
                  <Text style={[styles.inductionCtaText, { color: t.accent }]}>{induction.cta}</Text>
                  <Ionicons name="chevron-forward" size={14} color={t.accent} />
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Список задач дня — только в обычные дни. В приветствии новичка/возврата */}
          {/* ведёт живой текст + индакшн «с чего начать», список тут лишний шум. */}
          {!isWelcome && !isDayClosing && (
            <Animated.View style={[styles.tasks, revealBody]}>
              {day.tasks.map((task, i) => (
                <TouchableOpacity
                  key={`${task.kind}-${i}`}
                  style={[styles.task, { borderColor: t.border }]}
                  activeOpacity={onTaskPress ? 0.7 : 1}
                  disabled={!onTaskPress}
                  onPressIn={onTaskPress ? () => hapticTap() : undefined}
                  onPress={onTaskPress ? () => onTaskPress(task) : undefined}
                >
                  <View style={[styles.taskIcon, { backgroundColor: t.accent + '14' }]}>
                    <Ionicons name={TASK_ICON[task.kind]} size={16} color={t.accent} />
                  </View>
                  <Text style={[styles.taskText, { color: t.textPrimary }]}>
                    {triLang(lang, COMPASS_TASK_TITLE[task.kind])}
                  </Text>
                  <Text style={[styles.taskMin, { color: t.textMuted }]}>{task.minutes} {minutesLabel}</Text>
                  {onTaskPress && (
                    <Ionicons name="chevron-forward" size={15} color={t.textMuted} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
          </ScrollView>

          {/* Кнопки дня — только для брифинга: вечерний ритуал носит свои внутри панели */}
          {/* (закрытие с наградой / мост к доступу), общий CTA ему не нужен. */}
          {!isDayClosing && (
            <>
              <TouchableOpacity activeOpacity={0.85} onPressIn={() => hapticTap()} onPress={onStart} style={[styles.cta, { backgroundColor: t.accent }]}>
                <Text style={styles.ctaText}>{primaryLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPressIn={() => hapticTap()} onPress={onLater} style={styles.later}>
                <Text style={[styles.laterText, { color: t.textMuted }]}>{secondaryLabel}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function dayWord(lang: string): string {
  return triLang(lang as never, {
    ru: 'День',
    uk: 'День',
    es: 'Día',
    'pt-BR': 'Dia',
    vi: 'Ngày',
    id: 'Hari',
    tr: 'Gün',
    pl: 'Dzień',
  });
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 18, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '88%', alignSelf: 'center', borderRadius: 22, borderWidth: 1, padding: 18, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '800' },
  themeGlyph: { width: 40, height: 40, marginLeft: 6 },
  scroll: { flexGrow: 0 },
  scrollBody: { gap: 12, paddingBottom: 2 },
  comment: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  greeting: { gap: 7 },
  greetLead: { fontSize: 16, lineHeight: 23, fontWeight: '800' },
  greetLine: { fontSize: 14.5, lineHeight: 21, fontWeight: '600' },
  social: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  socialHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 },
  socialLabel: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  socialToggle: { minHeight: 30, maxWidth: 150, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialToggleText: { flexShrink: 1, fontSize: 11.5, lineHeight: 15, fontWeight: '800' },
  socialLine: { fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  accountReminder: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 7 },
  accountReminderHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountReminderEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  accountReminderTitle: { fontSize: 15.5, lineHeight: 21, fontWeight: '900' },
  accountReminderBody: { fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  accountReminderCta: { marginTop: 3, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  accountReminderCtaText: { color: '#10131b', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  induction: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  inductionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inductionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  inductionText: { fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  inductionCta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  inductionCtaText: { fontSize: 13, fontWeight: '700' },
  tasks: { gap: 8 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  taskIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  taskText: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  taskMin: { fontSize: 11, fontWeight: '600' },
  cta: { marginTop: 4, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#10131b' },
  later: { paddingVertical: 8, alignItems: 'center' },
  laterText: { fontSize: 13, fontWeight: '600' },
});
