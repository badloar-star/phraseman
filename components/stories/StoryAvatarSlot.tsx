// ═══════════════════════════════════════════════════════════════════════════
// StoryAvatarSlot.tsx — аватар-монета в шапке Главной: кнопка профиля, а при непросмотренных событиях — ещё и кольцо сторис с просмотром (D192, за флагом stories_v1).
//
// зачем (владелец 14.10: «на Главной иконка аватарки с кругом, как история в Instagram, когда есть хоть одно событие»): один компонент вместо прежней разметки кнопки в home.tsx.
// Событий нет или флаг выключен → ровно прежняя кнопка (те же testID, тот же обработчик, тап ведёт в профиль) — поведение «как раньше» гарантировано. Есть непросмотренные →
// кольцо вокруг монеты, тап открывает просмотр; всё просмотрено, но за 7 дней события есть → кольца нет, тап открывает просмотр недавних. Просмотр живёт отдельно от кольца: когда события просмотрены, кольцо гаснет, а открытый просмотр дорабатывает до конца.
// Данные — useStoryEvents() Ядра (память процесса, первый кадр синхронно, сети нет). Логи: [STORY-RING] (что решило: кольцо/профиль, откуда origin).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import type { Lang } from '../../constants/i18n';
import { DebugLogger } from '../../app/debug-logger';
import { useStoryEvents } from '../../modules/story_events/use_story_events';
import type { StoryEventList } from '../../modules/story_events/story_events_core';
import StoryRing, { STORY_RING_COIN, STORY_RING_SLOT } from './StoryRing';
import StoryViewer, { type StoryOrigin } from './StoryViewer';
import { storyText } from './story_strings';

const LOG = '[STORY-RING]';

export type StoryAvatarSlotProps = Readonly<{
  lang: Lang;
  /** Ранг монеты 0…19; null — пока неизвестен. */
  coinRank: number | null;
  /** Картинка монеты ранга; null — пока грузится (рисуется заглушка прежнего вида). */
  coinSource: ImageSourcePropType | null;
  /** Цвет заглушки, пока монета не готова (прежний t.bgSurface2). */
  placeholderColor: string;
  /** Прежний обработчик аватара — открыть профиль. */
  onOpenProfile: () => void;
  /** Прежняя подпись кнопки профиля. */
  profileLabel: string;
}>;

type ViewerState = Readonly<{ events: StoryEventList; origin: StoryOrigin | null }>;

function StoryAvatarSlot({ lang, coinRank, coinSource, placeholderColor, onOpenProfile, profileLabel }: StoryAvatarSlotProps) {
  const { enabled, unseenCount, playback, stories, markSeen } = useStoryEvents();
  const buttonRef = useRef<React.ElementRef<typeof TouchableOpacity> | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const ring = enabled && unseenCount > 0;
  // зачем (координатор 14.10): кольца нет (всё просмотрено), но за 7 дней события есть → тап открывает просмотр недавних, от старого к новому; событий нет → профиль как раньше
  const queue = useMemo<StoryEventList>(() => (ring ? playback : enabled ? [...stories].reverse() : []), [enabled, playback, ring, stories]);
  const opensStories = queue.length > 0;

  const open = useCallback(() => {
    if (viewer) { DebugLogger.info(LOG, 'тап: просмотр уже открыт'); return; }
    if (!opensStories) { DebugLogger.info(LOG, `тап → профиль (событий нет) enabled=${String(enabled)} непросмотрено=${unseenCount} живых=${stories.length}`); onOpenProfile(); return; }
    const events = queue;
    const handle = buttonRef.current;
    if (!handle || typeof handle.measureInWindow !== 'function') {
      DebugLogger.info(LOG, `тап → просмотр (${ring ? 'непросмотренные' : 'недавние'}): измерить аватар нельзя, раскрытие из угла, событий=${events.length}`);
      setViewer({ events, origin: null });
      return;
    }
    handle.measureInWindow((x: number, y: number, w: number, h: number) => {
      const origin = Number.isFinite(x) && w > 0 ? { x: x + w / 2, y: y + h / 2 } : null;
      DebugLogger.info(LOG, `тап → просмотр (${ring ? 'непросмотренные' : 'недавние'}): событий=${events.length} origin=${origin ? `${Math.round(origin.x)},${Math.round(origin.y)}` : 'нет'}`);
      setViewer({ events, origin });
    });
  }, [enabled, onOpenProfile, opensStories, queue, ring, stories.length, unseenCount, viewer]);

  const closeViewer = useCallback(() => { setViewer(null); }, []);

  const coin = (size: number): React.ReactElement => (coinSource ? (
    <Image testID="home-avatar-coin-rank" source={coinSource} style={{ width: size, height: size }} contentFit="contain" />
  ) : (
    <View testID="home-avatar-coin-loading" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: placeholderColor }} />
  ));

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        testID="home-hero-avatar-button"
        activeOpacity={0.82}
        onPress={opensStories ? open : onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel={ring ? storyText(lang, 'ringLabel') : profileLabel}
        hitSlop={6}
      >
        {ring ? <StoryRing>{coin(STORY_RING_COIN)}</StoryRing> : coin(STORY_RING_SLOT)}
      </TouchableOpacity>
      {viewer ? (
        <StoryViewer lang={lang} events={viewer.events} coinRank={coinRank} origin={viewer.origin} onSeen={markSeen} onClose={closeViewer} />
      ) : null}
    </>
  );
}

export default memo(StoryAvatarSlot);
