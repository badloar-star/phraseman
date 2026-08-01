import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { COMPASS_RICH, compassShadow } from '../../constants/compassTheme';

export type CompassStackPreviewCard = {
  id: string;
  source: string;
  title: string;
  body: string;
  summary: string;
  actionLabel: string;
  icon: string;
  accent: string;
};

type PreviewTemplate = Omit<CompassStackPreviewCard, 'id'>;

const PREVIEW_TEMPLATES: PreviewTemplate[] = [
  {
    source: 'releaseNotes',
    title: 'Что нового в Phraseman',
    body: 'Компас складывает релиз-ноты в короткую карточку и не открывает отдельный экран поверх остальных событий.',
    summary: 'Показать 3 пункта обновления, затем отпустить пользователя на главный экран.',
    actionLabel: 'Открыть заметки',
    icon: 'rocket-outline',
    accent: COMPASS_RICH.champagne,
  },
  {
    source: 'broadcast',
    title: 'Сообщение дня',
    body: 'Глобальное объявление можно показать как мягкий блок в общей пачке, если оно не требует немедленного решения.',
    summary: 'Сохранить CTA, но не перебивать более важные состояния.',
    actionLabel: 'Подробнее',
    icon: 'megaphone-outline',
    accent: '#8FD6FF',
  },
  {
    source: 'achievementToast',
    title: 'Достижение разблокировано',
    body: 'Мелкие награды и тосты можно собрать в один digest, чтобы они не спорили с модалками.',
    summary: 'Отдать эмоцию награды без отдельного fullscreen-перехвата.',
    actionLabel: 'Забрать',
    icon: 'medal-outline',
    accent: '#FACC6B',
  },
  {
    source: 'collectibleDrop',
    title: 'Новая карточка коллекции',
    body: 'Коллекционный дроп остается видимым, но попадает в листаемую очередь вместе с другими мягкими событиями.',
    summary: 'Показать редкость, источник и кнопку перехода в коллекцию.',
    actionLabel: 'В коллекцию',
    icon: 'sparkles-outline',
    accent: '#C4B5FD',
  },
  {
    source: 'leagueResult',
    title: 'Итог лиги',
    body: 'Если итог не блокирует пользователя, Compass может показать его рядом с наградами и подсказками дня.',
    summary: 'Сохранить статус, ранг и награду как отдельную карточку.',
    actionLabel: 'Открыть лигу',
    icon: 'trophy-outline',
    accent: '#F2C48D',
  },
  {
    source: 'notifNudge',
    title: 'Напоминания выключены',
    body: 'Мягкий запрос на уведомления можно показывать после полезных событий, а не отдельным внезапным модалом.',
    summary: 'Дать короткую причину и не давить, если пользователь свайпнул дальше.',
    actionLabel: 'Включить',
    icon: 'notifications-outline',
    accent: '#A7F3D0',
  },
  {
    source: 'referralWelcome',
    title: 'Друг пришел по ссылке',
    body: 'Referral welcome хорошо живет как карточка в общей очереди, пока нет критичного шага оплаты или аккаунта.',
    summary: 'Показать бонус, друга и быстрый переход в referral lab.',
    actionLabel: 'Посмотреть',
    icon: 'people-outline',
    accent: '#93C5FD',
  },
  {
    source: 'boonActivated',
    title: 'Буст активирован',
    body: 'Короткое подтверждение буста не обязано занимать отдельный слой, если рядом уже есть события дня.',
    summary: 'Показать срок действия и дать продолжить урок.',
    actionLabel: 'Продолжить',
    icon: 'flash-outline',
    accent: '#FBBF24',
  },
  {
    source: 'dailyTaskRewardToast',
    title: 'Дейли-награда готова',
    body: 'Мелкую награду можно вложить в карточку, чтобы пользователь не видел серию отдельных тостов и окон.',
    summary: 'Собрать XP, осколки и задачу в одну строку прогресса.',
    actionLabel: 'Забрать',
    icon: 'checkbox-outline',
    accent: '#86EFAC',
  },
  {
    source: 'comebackDay',
    title: 'Возврат после паузы',
    body: 'Компас может мягко объяснить, что изменилось, и предложить короткий первый шаг без отдельного welcome-модала.',
    summary: 'Показать безопасный старт и одну кнопку к тренировке.',
    actionLabel: 'Начать',
    icon: 'compass-outline',
    accent: '#FDBA74',
  },
];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCompassStackPreviewSeed(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function buildCompassStackPreviewCards(seed: string): CompassStackPreviewCard[] {
  const random = makeRandom(seed);
  const shuffled = [...PREVIEW_TEMPLATES];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const count = 4 + Math.floor(random() * 4);
  return shuffled.slice(0, count).map((template, index) => ({
    ...template,
    id: `${template.source}-${seed}-${index}`,
  }));
}

type CompassStackPreviewModalProps = {
  visible: boolean;
  seed: string;
  onClose: () => void;
  onReroll: () => void;
};

export default function CompassStackPreviewModal({
  visible,
  seed,
  onClose,
  onReroll,
}: CompassStackPreviewModalProps) {
  const { width, height } = useWindowDimensions();
  const cards = useMemo(() => buildCompassStackPreviewCards(seed), [seed]);
  const [activeIndex, setActiveIndex] = useState(0);
  const dragX = useRef(new Animated.Value(0)).current;
  const shellWidth = Math.min(Math.max(width - 28, 292), 448);
  const cardWidth = Math.min(Math.max(shellWidth - 56, 248), 360);
  const stageHeight = Math.min(Math.max(height - 300, 300), 420);
  const swipeThreshold = Math.max(72, cardWidth * 0.24);

  useEffect(() => {
    if (!visible) return;
    setActiveIndex(0);
    dragX.setValue(0);
  }, [dragX, seed, visible]);

  const goTo = useCallback((direction: -1 | 1) => {
    if (cards.length < 2) return;
    const target = direction > 0 ? -cardWidth : cardWidth;
    Animated.timing(dragX, {
      toValue: target,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      setActiveIndex((current) => (current + direction + cards.length) % cards.length);
      dragX.setValue(0);
    });
  }, [cardWidth, cards.length, dragX]);

  const settle = useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [dragX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const rubber = Math.sign(gesture.dx) * Math.pow(Math.abs(gesture.dx), 0.88);
          dragX.setValue(rubber);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -swipeThreshold) {
            goTo(1);
            return;
          }
          if (gesture.dx > swipeThreshold) {
            goTo(-1);
            return;
          }
          settle();
        },
        onPanResponderTerminate: settle,
      }),
    [dragX, goTo, settle, swipeThreshold],
  );

  if (!visible) return null;

  const current = cards[activeIndex];
  const prev = cards[(activeIndex - 1 + cards.length) % cards.length];
  const next = cards[(activeIndex + 1) % cards.length];
  const rotate = dragX.interpolate({
    inputRange: [-cardWidth, 0, cardWidth],
    outputRange: ['-4deg', '0deg', '4deg'],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          testID="admin-compass-stack-preview-modal"
          style={[
            styles.shell,
            compassShadow(3),
            {
              width: shellWidth,
              maxHeight: height - 34,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="albums-outline" size={22} color={COMPASS_RICH.champagne} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>LAB PREVIEW</Text>
              <Text style={styles.title}>Компас: очередь событий</Text>
              <Text style={styles.subtitle}>Seed {seed} · {cards.length} soft-событий</Text>
            </View>
            <Pressable
              testID="admin-compass-stack-preview-close"
              accessibilityRole="button"
              accessibilityLabel="Закрыть превью очереди Компаса"
              onPress={onClose}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={22} color={COMPASS_RICH.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.stage, { height: stageHeight }]}>
            {cards.length > 1 ? (
              <>
                <PreviewCard card={prev} width={cardWidth} stageHeight={stageHeight} peek side="left" />
                <PreviewCard card={next} width={cardWidth} stageHeight={stageHeight} peek side="right" />
              </>
            ) : null}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.activeCard,
                {
                  width: cardWidth,
                  transform: [{ translateX: dragX }, { rotate }],
                },
              ]}
            >
              <PreviewCard card={current} width={cardWidth} />
            </Animated.View>
          </View>

          <View style={styles.footer}>
            <Pressable
              testID="admin-compass-stack-prev"
              accessibilityRole="button"
              accessibilityLabel="Предыдущая карточка"
              onPress={() => goTo(-1)}
              style={styles.navButton}
            >
              <Ionicons name="chevron-back" size={22} color={COMPASS_RICH.champagne} />
            </Pressable>
            <View style={styles.counterWrap}>
              <Text style={styles.counter}>{activeIndex + 1} / {cards.length}</Text>
              <Text style={styles.counterSub}>Свайп влево или вправо</Text>
            </View>
            <Pressable
              testID="admin-compass-stack-next"
              accessibilityRole="button"
              accessibilityLabel="Следующая карточка"
              onPress={() => goTo(1)}
              style={styles.navButton}
            >
              <Ionicons name="chevron-forward" size={22} color={COMPASS_RICH.champagne} />
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            <Pressable
              testID="admin-compass-stack-reroll"
              accessibilityRole="button"
              accessibilityLabel="Сгенерировать новый seed"
              onPress={onReroll}
              style={styles.secondaryButton}
            >
              <Ionicons name="shuffle-outline" size={18} color={COMPASS_RICH.champagne} />
              <Text style={styles.secondaryButtonText}>Новый seed</Text>
            </Pressable>
            <Pressable
              testID="admin-compass-stack-done"
              accessibilityRole="button"
              accessibilityLabel="Закрыть превью"
              onPress={onClose}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Готово</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PreviewCard({
  card,
  width,
  stageHeight,
  peek = false,
  side,
}: {
  card: CompassStackPreviewCard;
  width: number;
  stageHeight?: number;
  peek?: boolean;
  side?: 'left' | 'right';
}) {
  const sideOffset = side === 'left' ? -width * 0.68 : width * 0.68;
  const peekTop = Math.max(12, ((stageHeight ?? 334) - 310) / 2);
  return (
    <View
      pointerEvents={peek ? 'none' : 'auto'}
      style={[
        styles.card,
        peek
          ? {
              position: 'absolute',
              alignSelf: 'center',
              top: peekTop,
              width,
              opacity: 0.48,
              transform: [{ translateX: sideOffset }, { scale: 0.9 }],
            }
          : { width },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.eventIcon, { borderColor: card.accent, backgroundColor: `${card.accent}22` }]}>
          <Ionicons name={card.icon as any} size={24} color={card.accent} />
        </View>
        <View style={styles.sourcePill}>
          <Text numberOfLines={1} style={styles.sourceText}>{card.source}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{card.title}</Text>
      <Text style={styles.cardBody}>{card.body}</Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>Как это ляжет в Compass</Text>
        <Text style={styles.summaryText}>{card.summary}</Text>
      </View>

      <View style={styles.cardActions}>
        <View style={[styles.mockPrimaryAction, { backgroundColor: card.accent }]}>
          <Text style={styles.mockPrimaryActionText}>{card.actionLabel}</Text>
        </View>
        <View style={styles.mockSecondaryAction}>
          <Text style={styles.mockSecondaryActionText}>Позже</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  shell: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairlineStrong,
    backgroundColor: COMPASS_RICH.charcoal,
  },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COMPASS_RICH.hairlineQuiet,
    backgroundColor: COMPASS_RICH.charcoalRaised,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairline,
    backgroundColor: COMPASS_RICH.wash,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: COMPASS_RICH.champagne,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: COMPASS_RICH.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairlineQuiet,
    backgroundColor: COMPASS_RICH.charcoal,
  },
  stage: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 16,
    backgroundColor: COMPASS_RICH.void,
  },
  activeCard: {
    alignSelf: 'center',
  },
  card: {
    minHeight: 310,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairlineStrong,
    padding: 18,
    backgroundColor: COMPASS_RICH.charcoalRaised,
    ...compassShadow(2),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  eventIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  sourcePill: {
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairlineQuiet,
    paddingHorizontal: 10,
    backgroundColor: COMPASS_RICH.charcoal,
  },
  sourceText: {
    color: COMPASS_RICH.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  cardBody: {
    color: COMPASS_RICH.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 10,
  },
  summaryBox: {
    marginTop: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairlineQuiet,
    padding: 12,
    backgroundColor: COMPASS_RICH.wash,
  },
  summaryLabel: {
    color: COMPASS_RICH.champagne,
    fontSize: 11,
    fontWeight: '900',
  },
  summaryText: {
    color: COMPASS_RICH.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  mockPrimaryAction: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  mockPrimaryActionText: {
    color: COMPASS_RICH.textDark,
    fontSize: 14,
    fontWeight: '900',
  },
  mockSecondaryAction: {
    minWidth: 82,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairlineQuiet,
    paddingHorizontal: 12,
    backgroundColor: COMPASS_RICH.charcoal,
  },
  mockSecondaryActionText: {
    color: COMPASS_RICH.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COMPASS_RICH.hairlineQuiet,
    backgroundColor: COMPASS_RICH.charcoalRaised,
  },
  navButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairline,
    backgroundColor: COMPASS_RICH.charcoal,
  },
  counterWrap: {
    flex: 1,
    alignItems: 'center',
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  counterSub: {
    color: COMPASS_RICH.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: COMPASS_RICH.charcoal,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairline,
    backgroundColor: COMPASS_RICH.wash,
  },
  secondaryButtonText: {
    color: COMPASS_RICH.champagne,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COMPASS_RICH.hairlineStrong,
    backgroundColor: COMPASS_RICH.champagne,
  },
  primaryButtonText: {
    color: COMPASS_RICH.textDark,
    fontSize: 14,
    fontWeight: '900',
  },
});
