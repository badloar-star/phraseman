/**
 * Шаг масштаба сетки карточек: 1 / 2 / 3 / 5 колонок, щипок двумя пальцами, ползунок и кнопки (макет cards-v2, функция `initZoom`).
 *
 * зачем (Карточки 2.0): сетка не растягивается непрерывно, а переключается по четырём остановкам. Во время щипка сетка «тянется» за пальцами
 * (масштаб 0.8…1.2 вокруг точки пальцев), на пороге 1.12 / 0.89 переключается шаг, по отпусканию — привязка к шагу (порог 1.06 / 0.94) и плавный
 * возврат. Смена шага — перетекание плиток 380 мс cubic-bezier(.2,.8,.2,1): позиция и размер каждой плитки идут от старой раскладки к новой,
 * а карточка под пальцами остаётся на месте (докрутка списка). Выбранный шаг запоминается (gallery_step_prefs).
 *
 * Optimistic UI: шаг меняется мгновенно в состоянии, перетекание идёт на UI-потоке; запись на диск — фоном.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Easing, runOnJS, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

import { useReduceMotion } from '../../hooks/use_reduce_motion';
import {
  GALLERY_LAST_STEP,
  GALLERY_MORPH_EASE,
  GALLERY_MORPH_MS,
  clampStep,
  galleryLayoutFor,
  galleryScrollFor,
} from './cardsGalleryLayout';
import { gridScrollFor, type GalleryGrids } from './cardsGalleryGrid';
import { initialGalleryStep, loadGalleryStep, peekGalleryStep, saveGalleryStep } from './gallery_step_prefs';

const TAG = '[CARDS-ZOOM]';
const LIVE_MIN = 0.8;
const LIVE_MAX = 1.2;
/** Порог переключения шага во время щипка (макет: live > 1.12 / < 0.89). */
const LIVE_IN = 1.12;
const LIVE_OUT = 0.89;
/** Порог привязки по отпусканию. */
const END_IN = 1.06;
const END_OUT = 0.94;
const RELAX_MS = 300;
/** Пока идёт перетекание, новый шаг от щипка не принимаем (busy макета, 240 мс). */
const BUSY_MS = 240;
const MORPH_EASING = Easing.bezier(...GALLERY_MORPH_EASE);

const clamp = (value: number, lo: number, hi: number): number => {
  'worklet';
  return Math.max(lo, Math.min(hi, value));
};

export type GridMorph = Readonly<{
  /** Шаг, из которого перетекаем, и шаг, в который перетекаем (числа на UI-потоке). */
  from: SharedValue<number>;
  to: SharedValue<number>;
  /** Прогресс 0…1. */
  t: SharedValue<number>;
  /** На сколько пикселей сдвинулась прокрутка при смене шага (позиции «из» сдвигаются на неё). */
  shift: SharedValue<number>;
  /** Живой масштаб щипка и точка опоры в координатах сетки. */
  live: SharedValue<number>;
  fx: SharedValue<number>;
  fy: SharedValue<number>;
}>;

export type GridHostApi = Readonly<{
  /** Число карточек и ширина сетки — для расчёта докрутки. */
  count: number;
  width: number;
  viewportH: number;
  /** Верх сетки в содержимом прокрутки и точная текущая прокрутка. */
  getGridTop: () => number;
  getScrollY: () => number;
  /** Мгновенная (без анимации) прокрутка списка. */
  scrollTo: (y: number) => void;
  /** Горизонтальное поле сетки от края окна. */
  sideInset: number;
  /** Сетки с рядами разной высоты (текст растит плитку): докрутка считается по ним; без них — прежняя раскладка с одной высотой на шаг. */
  getGrids?: () => GalleryGrids | null;
}>;

export function useCardsGridStep(host: GridHostApi) {
  const reduceMotion = useReduceMotion();
  const [step, setStepState] = useState<number>(() => initialGalleryStep());
  /** Шаг, из которого идёт перетекание (для окна отрисовки), и прокрутка до смены; null — перетекания нет. */
  const [morphFrom, setMorphFrom] = useState<{ step: number; scrollY: number } | null>(null);
  const stepRef = useRef(step);
  const hostRef = useRef(host);
  hostRef.current = host;
  const busyUntil = useRef(0);
  const touched = useRef(false);
  const from = useSharedValue(step);
  const to = useSharedValue(step);
  const t = useSharedValue(1);
  const shift = useSharedValue(0);
  const live = useSharedValue(1);
  const fx = useSharedValue(0);
  const fy = useSharedValue(0);

  const endMorph = useCallback(() => {
    setMorphFrom(null);
  }, []);

  /** Сменить шаг. `focal` — точка опоры в окне прокрутки (по умолчанию середина экрана, но не ниже 360, как в макете). */
  const setStep = useCallback((next: number, focal?: { x: number; y: number }, source = 'api', persist = true) => {
    const target = clampStep(next);
    const prev = stepRef.current;
    if (target === prev) {
      console.log(`${TAG} шаг ${prev} уже выбран, источник=${source}`);
      return;
    }
    touched.current = true;
    const h = hostRef.current;
    const scrollBefore = h.getScrollY();
    const fvY = focal?.y ?? Math.min(h.viewportH / 2, 360);
    const fxGrid = (focal?.x ?? h.sideInset + h.width / 2) - h.sideInset;
    const prevLayout = galleryLayoutFor(prev, h.width);
    const nextLayout = galleryLayoutFor(target, h.width);
    const grids = h.getGrids?.() ?? null;
    // зачем (владелец 18.10): ряды разной высоты — точка под пальцами остаётся на месте и при росте плиток под текст
    const scrollAfter = grids
      ? gridScrollFor({ n: h.count, prev: grids.grids[prev]!, next: grids.grids[target]!, fx: fxGrid, fvY, scrollY: scrollBefore, gridTop: h.getGridTop() })
      : galleryScrollFor({ n: h.count, prev: prevLayout, next: nextLayout, fx: fxGrid, fvY, scrollY: scrollBefore, gridTop: h.getGridTop() });
    const delta = scrollAfter - scrollBefore;
    console.log(`${TAG} шаг ${prev}→${target} источник=${source} колонок ${prevLayout.cols}→${nextLayout.cols} карточек=${h.count} scroll ${Math.round(scrollBefore)}→${Math.round(scrollAfter)} фокус=(${Math.round(fxGrid)},${Math.round(fvY)}) быстро=${reduceMotion}`);
    stepRef.current = target;
    setStepState(target);
    setMorphFrom({ step: prev, scrollY: scrollBefore });
    h.scrollTo(scrollAfter);
    from.value = prev;
    to.value = target;
    shift.value = delta;
    t.value = 0;
    t.value = withTiming(1, { duration: reduceMotion ? 0 : GALLERY_MORPH_MS, easing: MORPH_EASING }, (finished) => {
      if (finished) runOnJS(endMorph)();
    });
    busyUntil.current = Date.now() + BUSY_MS;
    if (persist) saveGalleryStep(target);
  }, [endMorph, from, reduceMotion, shift, t, to]);

  /** Первый вход процесса: сохранённый шаг ещё не был в памяти — подтягиваем его без анимации, если человек не успел ничего нажать. */
  useEffect(() => {
    if (peekGalleryStep() !== null) return undefined;
    let cancelled = false;
    void loadGalleryStep().then((saved) => {
      if (cancelled || saved === null || touched.current || saved === stepRef.current) return;
      console.log(`${TAG} подтянут сохранённый шаг ${saved} (был ${stepRef.current}), без анимации`);
      stepRef.current = saved;
      setStepState(saved);
      from.value = saved;
      to.value = saved;
      t.value = 1;
    });
    return () => { cancelled = true; };
  }, [from, t, to]);

  const setStepRef = useRef(setStep);
  setStepRef.current = setStep;

  const gesture = useMemo(() => {
    let base = 1;
    const relax = () => {
      live.value = withTiming(1, { duration: RELAX_MS, easing: MORPH_EASING });
    };
    const focalOf = (event: { focalX: number; focalY: number }) => {
      const h = hostRef.current;
      fx.value = event.focalX - h.sideInset;
      fy.value = event.focalY + h.getScrollY() - h.getGridTop();
    };
    return Gesture.Pinch()
      .runOnJS(true)
      .onStart((event) => {
        base = 1;
        live.value = 1;
        focalOf(event);
      })
      .onUpdate((event) => {
        const ratio = event.scale / base;
        const cur = stepRef.current;
        const canIn = cur > 0;
        const canOut = cur < GALLERY_LAST_STEP;
        const busy = Date.now() < busyUntil.current;
        let next = clamp(ratio, LIVE_MIN, LIVE_MAX);
        if (!busy && next > LIVE_IN && canIn) {
          setStepRef.current(cur - 1, { x: event.focalX, y: event.focalY }, 'щипок-крупнее');
          base = event.scale;
          live.value = 1;
          focalOf(event);
          return;
        }
        if (!busy && next < LIVE_OUT && canOut) {
          setStepRef.current(cur + 1, { x: event.focalX, y: event.focalY }, 'щипок-мельче');
          base = event.scale;
          live.value = 1;
          focalOf(event);
          return;
        }
        if (!canIn) next = Math.min(next, 1.04);
        if (!canOut) next = Math.max(next, 0.96);
        live.value = next;
      })
      .onEnd((event) => {
        const cur = stepRef.current;
        const l = live.value;
        // зачем (владелец: «привязка к шагу по окончании щипка»): отпустили, не дойдя до порога перехода, но уже заметно потянув, — доводим до шага
        if (l > END_IN && cur > 0) setStepRef.current(cur - 1, { x: event.focalX, y: event.focalY }, 'отпускание-крупнее');
        else if (l < END_OUT && cur < GALLERY_LAST_STEP) setStepRef.current(cur + 1, { x: event.focalX, y: event.focalY }, 'отпускание-мельче');
        else console.log(`${TAG} щипок завершён без смены шага, живой масштаб=${l.toFixed(2)}`);
      })
      .onFinalize(() => {
        relax();
      });
  }, [fx, fy, live]);

  const morph: GridMorph = useMemo(() => ({ from, to, t, shift, live, fx, fy }), [from, fx, fy, live, shift, t, to]);
  return { step, setStep, gesture, morph, morphFrom };
}

/** Состояние сетки целиком — то, что нужно `CardsGallery` (шаг, перетекание, окно отрисовки). */
export type GridState = Readonly<{ step: number; morph: GridMorph; morphFrom: Readonly<{ step: number; scrollY: number }> | null }>;

/**
 * Совместимость со старым вызовом `useCardsScale(initial)` (экран набора до Карточек 2.0): отдаёт `{ scale, gesture }`, где `scale` — обёртка
 * над новым состоянием сетки, которую `CardsGallery` принимает вместо отдельных `step/morph/morphFrom`. Докрутки списка и полосы масштаба здесь нет —
 * экран, который хочет «карточка под пальцами» и ползунок, подключает `useCardsGridStep` + `ZoomBar` напрямую (пример: CollectionGalleryView).
 * зачем: не ломать чужие экраны на время перехода; удалить, когда последний потребитель перейдёт на `useCardsGridStep`.
 */
export function useCardsScale(_initial = 0) {
  const grid = useCardsGridStep({ count: 0, width: 0, viewportH: 0, sideInset: 0, getGridTop: () => 0, getScrollY: () => 0, scrollTo: () => undefined });
  const state: GridState = useMemo(() => ({ step: grid.step, morph: grid.morph, morphFrom: grid.morphFrom }), [grid.morph, grid.morphFrom, grid.step]);
  const animateTo = useCallback((value: number) => grid.setStep(GALLERY_LAST_STEP - Math.round(Math.max(0, Math.min(1, value)) * GALLERY_LAST_STEP), undefined, 'animateTo'), [grid]);
  return { scale: state, gesture: grid.gesture, animateTo, setStep: grid.setStep };
}
