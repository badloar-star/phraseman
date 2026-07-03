/**
 * Компас — модал брифинга дня. ОБОЛОЧКА, Волна «плоский лист» (2026-07-03).
 *
 * Один тёплый лист при входе. ЕДИНЫЙ дизайн-язык Компаса (compass_sheet_kit):
 * секции делит воздух и тонкая линия, НЕ рамки-коробки; голос Компаса — крупный
 * заголовок-герой; один акцент из активной темы. ВСЕ тексты — через triLang из
 * compass_copy (канон Библии). Никакой собственной логики выбора дня — получает
 * готовый CompassDay из мозга.
 *
 * ВЕТКИ:
 *  • day_closing → вечерний ритуал (DayClosingPanel, свой CTA внутри);
 *  • welcome (first_day / comeback) → живое приветствие Компаса + список первых
 *    шагов (тап ведёт в фичу) + «Поехали» (осмысленный старт) + «Позже»;
 *  • обычный день → голос + задачи-ВЫБОР (тап по задаче = переход, БЕЗ отдельной
 *    кнопки «Начать день» — она была непонятной) + мягкие секции + «Позже».
 *
 * «Позже» — маленький серый нажимаемый текст, НЕ широкая кнопка (правило юзера).
 *
 * ИЗОЛЯЦИЯ: компонент рендерит null, если Компас выключен или дня нет. Вызывающий
 * экран (home) монтирует его за флагом — при off ничего не появляется.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { compassOn } from './compass_flags';
import type { CompassDay, CompassTask, CompassTaskKind } from './compass_brain';
import DayClosingPanel from './compass_day_closing_panel';
import { useCompassVoice } from './use_compass_voice';
import {
  CompassGrabber,
  CompassEyebrow,
  CompassVoice,
  CompassLede,
  CompassPickList,
  CompassPickRow,
  CompassSoftSection,
  CompassLaterLink,
} from './compass_sheet_kit';
import {
  COMPASS_BRIEFING_TITLE,
  COMPASS_LETS_GO,
  COMPASS_LATER,
  COMPASS_TASK_TITLE,
  COMPASS_TASK_MINUTES,
  COMPASS_DAY_CLOSING_TITLE,
  buildCompassGreeting,
  buildCompassInduction,
} from './compass_copy';
import { COMPASS_SOCIAL_COLLAPSE, COMPASS_SOCIAL_HEADER, COMPASS_SOCIAL_SHOW_ALL } from './compass_social_copy';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TASK_ICON: Record<CompassTaskKind, IoniconName> = {
  lesson_dive: 'book-outline',
  mistake_repair: 'bandage-outline',
  flashcards_review: 'albums-outline',
  pronunciation: 'mic-outline',
  plan_continue: 'navigate-outline',
};

const INDUCTION_ICON: Record<NonNullable<CompassDay['inductionFeature']>, IoniconName> = {
  level_test: 'flag-outline',
  dialogs: 'chatbubbles-outline',
  flashcards: 'albums-outline',
  lessons: 'book-outline',
  daily_tasks: 'sparkles-outline',
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
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const accent = t.accent;
  const dayClosing = day?.type === 'day_closing' ? day.dayClosing : undefined;
  const isDayClosing = !!dayClosing;
  const [socialExpanded, setSocialExpanded] = useState(false);
  // Гибрид-голос: текст Библии сразу, живой ИИ-текст подменяет когда придёт.
  // Хук вызывается всегда (правила хуков) и сам безопасно обрабатывает day=null.
  const comment = useCompassVoice(visible && !isDayClosing ? day : null);

  // Тактильный «стук» Компаса при появлении брифинга: мягкий tap. Один раз на показ.
  useEffect(() => {
    if (visible && day) void hapticTap();
  }, [visible, day]);

  // ОДНОРАЗОВАЯ анимация показа (перф-канон: без циклов на фоне): содержимое
  // проявляется каскадом (голос → блоки → задачи). Сброс на каждый показ.
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible || !day) return;
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 720,
      delay: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, day, reveal]);

  useEffect(() => {
    if (!visible || isDayClosing) setSocialExpanded(false);
  }, [visible, isDayClosing, socialLines, socialAllLines]);

  if ((!ignoreCompassFlag && !compassOn()) || !day) return null;

  const title = triLang(lang, isDayClosing ? COMPASS_DAY_CLOSING_TITLE : COMPASS_BRIEFING_TITLE);
  const dayLabel = !isDayClosing && day.planDayIndex ? `${title} · ${dayWord(lang)} ${day.planDayIndex}` : title;

  // Приветственные дни (первый день / возврат) — живое обращение Компаса.
  const greeting = isDayClosing ? [] : buildCompassGreeting(day, lang);
  const induction = isDayClosing ? null : buildCompassInduction(day.inductionFeature, lang);
  const isWelcome = greeting.length > 0;
  const social = isDayClosing ? [] : (socialLines ?? []).filter((line) => line.trim().length > 0);
  const socialFull = isDayClosing ? [] : (socialAllLines ?? social).filter((line) => line.trim().length > 0);
  const socialHasMore = socialFull.length > social.length;
  const socialShown = socialExpanded && socialHasMore ? socialFull : social;
  const socialHeader = triLang(lang, COMPASS_SOCIAL_HEADER);
  const socialToggleText = socialExpanded
    ? triLang(lang, COMPASS_SOCIAL_COLLAPSE)
    : triLang(lang, COMPASS_SOCIAL_SHOW_ALL).replace('{count}', String(socialFull.length));
  const laterLabel = triLang(lang, COMPASS_LATER);
  const letsGoLabel = triLang(lang, COMPASS_LETS_GO);
  const minutesLabel = triLang(lang, COMPASS_TASK_MINUTES);

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
        <View style={[styles.sheet, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          {!isDayClosing && <CompassGrabber t={t} />}

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
            ) : (
              <Animated.View style={revealHead}>
                <CompassEyebrow t={t} icon="compass-outline" text={dayLabel} accent={accent} />

                {isWelcome ? (
                  <View style={styles.greeting}>
                    {greeting.map((line, i) => (
                      <Text
                        key={`greet-${i}`}
                        style={[i === 0 ? styles.greetLead : styles.greetLine, { color: i === 0 ? t.textPrimary : t.textSecond }]}
                      >
                        {line}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <CompassVoice t={t}>{comment}</CompassVoice>
                )}
              </Animated.View>
            )}

            {!isDayClosing && (
              <Animated.View style={revealBody}>
                {/* Индакшн «с чего здорово начать» — как строка-выбор в списке. */}
                {induction && day.inductionFeature && (
                  <CompassPickList style={styles.pickTop}>
                    <CompassPickRow
                      t={t}
                      accent={accent}
                      icon={INDUCTION_ICON[day.inductionFeature]}
                      title={induction.cta}
                      meta={induction.text}
                      onPress={onInductionPress ? () => onInductionPress(day.inductionFeature!) : undefined}
                    />
                  </CompassPickList>
                )}

                {/* Задачи дня — плоский список-ВЫБОР. Только обычные дни (в welcome */}
                {/* ведёт живой текст + индакшн). Тап по задаче = переход в её экран. */}
                {!isWelcome && day.tasks.length > 0 && (
                  <CompassPickList style={styles.pickTop}>
                    {day.tasks.map((task, i) => (
                      <CompassPickRow
                        key={`${task.kind}-${i}`}
                        t={t}
                        accent={accent}
                        icon={TASK_ICON[task.kind]}
                        title={triLang(lang, COMPASS_TASK_TITLE[task.kind])}
                        meta={`${task.minutes} ${minutesLabel}`}
                        onPress={onTaskPress ? () => onTaskPress(task) : undefined}
                      />
                    ))}
                  </CompassPickList>
                )}

                {/* «Кстати…» — тёплая соц-сводка за линией (не рамка). */}
                {social.length > 0 && (
                  <CompassSoftSection testID="compass-social-summary" t={t} accent={accent} eyebrow={socialHeader} eyebrowIcon="people-outline">
                    {socialHasMore && (
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPressIn={() => hapticTap()}
                        onPress={() => setSocialExpanded((v) => !v)}
                        accessibilityRole="button"
                        accessibilityLabel={socialToggleText}
                        style={styles.socialToggle}
                      >
                        <Text style={[styles.socialToggleText, { color: accent }]} numberOfLines={1}>
                          {socialToggleText}
                        </Text>
                        <Ionicons name={socialExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={accent} />
                      </TouchableOpacity>
                    )}
                    {socialShown.map((line, i) => (
                      <Text key={`social-${i}`} style={[styles.softLine, { color: t.textPrimary }]}>
                        {line}
                      </Text>
                    ))}
                  </CompassSoftSection>
                )}

                {/* Напоминание привязать аккаунт — за линией; testID'ы сохранены (контракт). */}
                {accountReminder && (
                  <CompassSoftSection
                    testID="compass-account-link-reminder"
                    t={t}
                    accent={accent}
                    eyebrow={accountReminder.eyebrow}
                    eyebrowIcon="cloud-upload-outline"
                  >
                    <Text style={[styles.accountTitle, { color: t.textPrimary }]}>{accountReminder.title}</Text>
                    <Text style={[styles.accountBody, { color: t.textSecond }]}>{accountReminder.body}</Text>
                    {onAccountLinkPress && (
                      <TouchableOpacity
                        testID="compass-account-link-cta"
                        activeOpacity={0.84}
                        onPressIn={() => hapticTap()}
                        onPress={onAccountLinkPress}
                        style={[styles.accountCta, { backgroundColor: accent }]}
                      >
                        <Text style={styles.accountCtaText}>{accountReminder.cta}</Text>
                      </TouchableOpacity>
                    )}
                  </CompassSoftSection>
                )}

                {/* Вопрос-приглашение в конце welcome-дня (над «Поехали»). */}
                {isWelcome && (
                  <CompassLede t={t} center>
                    {triLang(lang, {
                      ru: 'С чего хочешь начать?',
                      uk: 'З чого хочеш почати?',
                      es: '¿Por dónde quieres empezar?',
                      'pt-BR': 'Por onde você quer começar?',
                      vi: 'Bạn muốn bắt đầu từ đâu?',
                      id: 'Mau mulai dari mana?',
                      tr: 'Nereden başlamak istersin?',
                      pl: 'Od czego chcesz zacząć?',
                    })}
                  </CompassLede>
                )}
              </Animated.View>
            )}
          </ScrollView>

          {/* Низ листа — только для брифинга (вечерний ритуал носит свои внутри панели). */}
          {/* Welcome-дни: «Поехали» осмысленный старт (CTA-текст) + «Позже». */}
          {/* Обычный день: только «Позже» — задачи выше и есть сам выбор. */}
          {!isDayClosing && (
            <>
              {isWelcome && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPressIn={() => hapticTap()}
                  onPress={onStart}
                  style={[styles.letsGo, { backgroundColor: accent }]}
                >
                  <Text style={styles.letsGoText}>{letsGoLabel}</Text>
                </TouchableOpacity>
              )}
              <CompassLaterLink t={t} label={laterLabel} onPress={onLater} />
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
  sheet: { width: '100%', maxWidth: 520, maxHeight: '88%', alignSelf: 'center', borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 22, paddingBottom: 18 },
  scroll: { flexGrow: 0 },
  scrollBody: { paddingBottom: 2 },
  greeting: { gap: 9, marginTop: 15 },
  greetLead: { fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.2 },
  greetLine: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  pickTop: { marginTop: 20 },
  socialToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 8 },
  socialToggleText: { fontSize: 11.5, fontWeight: '800' },
  softLine: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 2 },
  accountTitle: { fontSize: 15.5, lineHeight: 21, fontWeight: '900' },
  accountBody: { fontSize: 13.5, lineHeight: 19, fontWeight: '600', marginTop: 5 },
  accountCta: { marginTop: 12, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  accountCtaText: { color: '#10131b', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  letsGo: { marginTop: 8, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  letsGoText: { fontSize: 16, fontWeight: '800', color: '#10131b' },
});
