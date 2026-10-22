// ═══════════════════════════════════════════════════════════════════════════
// StoryAvatarSlot.tsx — аватар-монета в шапке Главной: кнопка профиля, а при непросмотренных событиях — ещё и кольцо сторис с просмотром (D192, за флагом stories_v1).
//
// зачем (владелец 14.10: «на Главной иконка аватарки с кругом, как история в Instagram, когда есть хоть одно событие»): один компонент вместо прежней разметки кнопки в home.tsx.
// Событий нет или флаг выключен → ровно прежняя кнопка (те же testID, тот же обработчик, тап ведёт в профиль) — поведение «как раньше» гарантировано. Есть непросмотренные →
// кольцо вокруг монеты, тап открывает просмотр; всё просмотрено, но за 7 дней события есть → кольца нет, тап открывает просмотр недавних. Просмотр живёт отдельно от кольца: когда события просмотрены, кольцо гаснет, а открытый просмотр дорабатывает до конца.
// Данные — useStoryEvents() Ядра (память процесса, первый кадр синхронно, сети нет). Логи: [STORY-RING] (что решило: кольцо/профиль, откуда origin).
// Холодный старт (координатор 14.10): StoryRing (Svg + Reanimated) и StoryViewer (жесты, Modal, слайды) подключаются через require ВНУТРИ функций — только когда кольцо нужно (есть непросмотренное)
// или человек тапнул по аватару с событиями. Флаг выключен / событий нет → слот не грузит ни одного модуля сторис, кроме лёгких констант, строк и хука данных.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { TouchableOpacity, View, type GestureResponderEvent, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import type { Lang } from '../../constants/i18n';
import { DebugLogger } from '../../app/debug-logger';
import { sceneTouchTrace } from '../../app/scene_touch_trace';
import { useStoryEvents } from '../../modules/story_events/use_story_events';
import type { StoryEventList } from '../../modules/story_events/story_events_core';
import { STORY_RING_COIN, STORY_RING_SLOT } from './story_ring_constants';
import type { StoryOrigin } from './StoryViewer';
import { storyText } from './story_strings';

const LOG = '[STORY-RING]';
const AVATAR_LOG = '[AVATAR-TAP]';

// зачем: ленивые подключения тяжёлых частей; кэш модуля — повторный require мгновенный. Отступ у require обязателен: сторож статического графа (cold_start_static_graph_guard) считает только require верхнего уровня.
type StoryRingModule = typeof import('./StoryRing');
type StoryViewerModule = typeof import('./StoryViewer');
let ringModuleCache: StoryRingModule | null = null;
let viewerModuleCache: StoryViewerModule | null = null;
function loadStoryRing(): StoryRingModule {
  if (!ringModuleCache) {
    DebugLogger.info(LOG, 'подгрузка StoryRing (первое кольцо в этой сессии)');
    ringModuleCache = require('./StoryRing') as StoryRingModule;
  }
  return ringModuleCache;
}
function loadStoryViewer(): StoryViewerModule {
  if (!viewerModuleCache) {
    DebugLogger.info(LOG, 'подгрузка StoryViewer (первое открытие просмотра в этой сессии)');
    viewerModuleCache = require('./StoryViewer') as StoryViewerModule;
  }
  return viewerModuleCache;
}

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
  // зачем (координатор 15.10, R21; было 14.10 — «недавние» 7 дней): после просмотра аватар снова ведёт в профиль — иначе кнопка
  // неделю меняет смысл. Просмотр открывается только пока есть непросмотренное (кольцо горит).
  const queue = useMemo<StoryEventList>(() => (ring ? playback : []), [playback, ring]);
  const opensStories = queue.length > 0;

  const open = useCallback(() => {
    if (viewer) { DebugLogger.info(LOG, 'тап: просмотр уже открыт'); return; }
    if (!opensStories) { DebugLogger.info(LOG, `тап → профиль (непросмотренных нет) enabled=${String(enabled)} непросмотрено=${unseenCount} живых=${stories.length}`); onOpenProfile(); return; }
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

  // зачем (Сверка 22.10: аватар открывает профиль 3 из 5 — первое нажатие после входа на Главную и у верхнего края круга; правило
  // «сперва логи»): [AVATAR-TAP] показывает, где кнопка на экране, дошло ли касание до неё, отдал ли ей responder нажатие и какая ветка
  // сработала. Касание без onPress (палец сдвинулся / нажатие забрал прокрутчик) пишется при следующем касании.
  const mountedAtRef = useRef(Date.now());
  const frameRef = useRef('—'); // зачем: «рамка ещё не измерена»; не русская строка — сканер непереведённого UI принял бы её за текст экрана
  const pressRef = useRef<{ seq: number; inAt: number; pageX: number; pageY: number; pressed: boolean } | null>(null);
  const pressSeqRef = useRef(0);
  const sinceMount = (): number => Date.now() - mountedAtRef.current;
  const onButtonLayout = useCallback(() => {
    const handle = buttonRef.current;
    if (!handle || typeof handle.measureInWindow !== 'function') {
      DebugLogger.info(AVATAR_LOG, `рамка: измерить нельзя (handle=${String(Boolean(handle))}) +${sinceMount()} мс`);
      return;
    }
    handle.measureInWindow((x: number, y: number, w: number, h: number) => {
      frameRef.current = `x=${Math.round(x)} y=${Math.round(y)} ${Math.round(w)}×${Math.round(h)}`;
      DebugLogger.info(AVATAR_LOG, `рамка кнопки в окне ${frameRef.current} (hitSlop 6) +${sinceMount()} мс с монтажа`);
    });
  }, []);
  const traceRawTouch = useMemo(() => sceneTouchTrace('home_avatar', () => ({ frame: frameRef.current, sinceMountMs: sinceMount() })), []);
  const onPressIn = useCallback((event: GestureResponderEvent) => {
    const prev = pressRef.current;
    if (prev && !prev.pressed) DebugLogger.warn(AVATAR_LOG, `касание #${prev.seq} закончилось БЕЗ onPress (палец ушёл за кнопку или нажатие забрал другой ответчик)`);
    const n = event.nativeEvent;
    pressSeqRef.current += 1;
    pressRef.current = { seq: pressSeqRef.current, inAt: Date.now(), pageX: n.pageX, pageY: n.pageY, pressed: false };
    DebugLogger.info(AVATAR_LOG, `pressIn #${pressSeqRef.current} в кнопке ${Math.round(n.locationX)},${Math.round(n.locationY)} на экране ${Math.round(n.pageX)},${Math.round(n.pageY)} рамка ${frameRef.current} +${sinceMount()} мс с монтажа; сторис=${String(opensStories)} монета=${coinSource ? 'готова' : 'заглушка'}`);
  }, [coinSource, opensStories]);
  const onPressOut = useCallback((event: GestureResponderEvent) => {
    const cur = pressRef.current;
    const n = event.nativeEvent;
    DebugLogger.info(AVATAR_LOG, `pressOut #${cur?.seq ?? '?'} держали ${cur ? Date.now() - cur.inAt : '?'} мс, сдвиг ${cur ? `${Math.round(n.pageX - cur.pageX)},${Math.round(n.pageY - cur.pageY)}` : '?'}`);
  }, []);
  const onPress = useCallback(() => {
    if (pressRef.current) pressRef.current.pressed = true;
    DebugLogger.info(AVATAR_LOG, `onPress #${pressRef.current?.seq ?? '?'} → ${opensStories ? 'просмотр сторис' : 'профиль'} +${sinceMount()} мс с монтажа`);
    if (opensStories) open(); else onOpenProfile();
  }, [onOpenProfile, open, opensStories]);

  const coin = (size: number): React.ReactElement => (coinSource ? (
    <Image testID="home-avatar-coin-rank" source={coinSource} style={{ width: size, height: size }} contentFit="contain" />
  ) : (
    <View testID="home-avatar-coin-loading" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: placeholderColor }} />
  ));

  const Ring = ring ? loadStoryRing().default : null;
  const Viewer = viewer ? loadStoryViewer().default : null;

  return (
    <>
      {/* зачем ([AVATAR-TAP]): обёртка без стиля только ловит сырое касание (onTouchStart не участвует в выборе ответчика) */}
      <View onTouchStart={traceRawTouch}>
        <TouchableOpacity
          ref={buttonRef}
          testID="home-hero-avatar-button"
          activeOpacity={0.82}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onLayout={onButtonLayout}
          accessibilityRole="button"
          accessibilityLabel={ring ? storyText(lang, 'ringLabel') : profileLabel}
          hitSlop={6}
        >
          {Ring ? <Ring>{coin(STORY_RING_COIN)}</Ring> : coin(STORY_RING_SLOT)}
        </TouchableOpacity>
      </View>
      {viewer && Viewer ? (
        <Viewer lang={lang} events={viewer.events} coinRank={coinRank} origin={viewer.origin} onSeen={markSeen} onClose={closeViewer} />
      ) : null}
    </>
  );
}

export default memo(StoryAvatarSlot);
