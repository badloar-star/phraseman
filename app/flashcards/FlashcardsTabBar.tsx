/**
 * Cards 2.1 §5.2 — нижний таббар раздела «Карточки».
 *
 *   слева   «Тренировка» → вверх выезжает список: Тренировка / Слушать / Блиц
 *   центр   «+» (акцентная позиция) → над кнопкой: Создать карточку / Создать набор
 *   справа  «Наборы» → над кнопкой: Мои наборы / Наборы сообщества
 *
 * Внешний вид и поведение — ОДИН В ОДИН с таббаром главного экрана
 * (`app/(tabs)/_layout.tsx`): плавающая капсула со скруглением height/2, тот же
 * нижний зазор, та же тень, иконки без подписей, бегущая подсветка активной
 * позиции на пружине и «вдавливание» капсулы при нажатии. Все числа и цветовые
 * правила лежат в `pill_tabbar_chrome.ts`, чтобы значения не расходились.
 *
 * Раскрывающиеся группы (§5.2/§8): пружина со стаггером, затемнение фона,
 * поворот «+» в «×», закрытие по тапу вне и по системному «назад» (Android).
 * Только transform/opacity. Деградация: `useFcReduceMotion()` и
 * `isLowPowerEffective()` → короткий timing без стаггера (функции сохраняются).
 *
 * Вся чистая логика (состояние раскрытия, тайминги, сборка маршрутов) —
 * `tabbar_state.ts`; геометрия капсулы — `pill_tabbar_chrome.ts`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  InteractionManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { triLang, type Lang } from '../../constants/i18n';
import { OLIVE_RICH } from '../../constants/oliveTheme';
import type { Theme } from '../../constants/theme';
import { hapticTap } from '../../hooks/use-haptics';
import { useScreen } from '../../hooks/use-screen';
import { useTheme } from '../../components/ThemeContext';
import { markNextNavigationAsReplace } from '../navigation_back';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import DeckPickerSheet, { type DeckSheetOption } from './DeckPickerSheet';
import { loadFcDeckOptions } from './deck_options';
import { type DeckRef } from './deck_sources';
import { countAvailableFcCards } from './deck_options';
import { isLowPowerEffective } from './low_power';
import { getLastPreset, type FcModePreset } from './mode_prefs';
import { useFcReduceMotion } from './PhraseCard';
import {
  FLOATING_PILL_BOTTOM_GAP,
  TAB_ACTIVE_PILL_HEIGHT,
  TAB_ACTIVE_PILL_PRESS_OPACITY,
  TAB_ACTIVE_PILL_PRESS_SCALE,
  TAB_ACTIVE_PILL_WIDTH,
  TAB_CENTER_ICON_SIZE,
  TAB_DARK_ACTIVE_BG_ALPHA,
  TAB_DARK_ICON_MUTED_ALPHA,
  TAB_HIGHLIGHT_FADE_MS,
  TAB_HIGHLIGHT_SPRING,
  TAB_ICON_PRESS_SCALE,
  TAB_ICON_SIZE,
  TAB_PILL_PRESS_SCALE,
  TAB_PILL_SHADOW,
  TAB_PRESS_IN_SPRING,
  TAB_PRESS_OUT_SPRING,
  TAB_SCROLL_COLLAPSE_MS,
  TAB_SCROLL_COLLAPSED_OPACITY,
  TAB_SCROLL_COLLAPSED_SCALE,
  TAB_SCROLL_COLLAPSED_TRANSLATE_Y,
  TAB_SCROLL_EXPAND_MS,
  TAB_SCROLL_TOGGLE_COOLDOWN_MS,
  TAB_SLOT_WIDTH,
  TAB_UNDERLAY_DIM_BG,
  tabHighlightInset,
  tabHighlightOffset,
  tabPillWidth,
  withAlpha,
} from './pill_tabbar_chrome';
import {
  buildFcCreateRoute,
  buildFcPacksRoute,
  buildFcTrainRoute,
  consumeFcTabBackPress,
  fcTabChromeAction,
  FC_CREATE_OPTIONS,
  FC_PACKS_OPTIONS,
  FC_PLUS_ROTATION_DEG,
  FC_TABBAR_SCRIM_OPACITY,
  fcTabMenuItemDelay,
  fcTrainOptionPresetMode,
  isFcTabMenuOpen,
  toggleFcTabMenu,
  visibleFcTrainOptions,
  type FcCreateOption,
  type FcPacksOption,
  type FcTabMenu,
  type FcTrainOption,
} from './tabbar_state';

/** Высота панели без нижнего инсета — контейнеры резервируют её под контент. */
export const FC_TABBAR_HEIGHT = 62;

/** Кривая сворачивания капсулы — та же, что у таббара главной (`Easing.out(Easing.cubic)`).
 *  Считается один раз на модуль: воркету достаётся готовая функция. */
const TAB_SCROLL_EASING = Easing.out(Easing.cubic);

const SPRING_OPEN = { damping: 15, stiffness: 240, mass: 0.55 } as const;
const SPRING_CLOSE = { damping: 20, stiffness: 300, mass: 0.5 } as const;
const TIMING_MS = 140;

/** Позиции капсулы слева направо; центральная — акцентная «+». */
const BAR_SLOTS = ['train', 'create', 'packs'] as const;
type BarSlot = (typeof BAR_SLOTS)[number];
const CENTER_SLOT: BarSlot = 'create';

/** Пул блица по умолчанию — «все сохранённые + мои карточки» (как в сессии блица). */
/** Счёт карточек переживает перемонтирование таббара: пункт не мигает при переходах. */
let blitzPoolCountCache: number | null = null;

type Props = {
  lang: Lang;
  t: Theme;
  /** Какая позиция подсвечена: сохранённые карточки, каталог наборов или свои наборы. */
  active: 'cards' | 'packs' | 'mine';
  /** Нижний safe-area инсет экрана. */
  bottomInset?: number;
  /**
   * Транспорт скролла экрана (`useFcTabBarScroll`). Пока его нет, капсула просто
   * статична — экраны без списка ничего не подключают.
   */
  scroll?: FcTabBarScroll | null;
};

/**
 * Сворачивание капсулы при скролле — ровно как у таббара главного экрана.
 *
 * Экран создаёт транспорт хуком и:
 *   • отдаёт `scrollHandler` Reanimated-списку (UI-поток, без JS на кадр), либо
 *   • отдаёт `onScroll` обычному FlatList / `listener`-у чужого `Animated.event`,
 *     если список уже занят своим нативным драйвером;
 *   • передаёт сам объект в `<FlashcardsTabBar scroll={...} />`.
 *
 * Состояние живёт в shared values: покадрового `setState` нет ни в одном из
 * вариантов, а сама анимация (`withTiming`) в обоих случаях идёт на UI-потоке.
 */
export type FcTabBarScroll = {
  /** 0 — капсула раскрыта, 1 — сжата. */
  chrome: SharedValue<number>;
  /** Для Reanimated-списков: `onScroll={scroll.scrollHandler}`. */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** Для обычных списков: `onScroll={scroll.onScroll}` + `scrollEventThrottle={16}`. */
  onScroll: (e: { nativeEvent?: { contentOffset?: { y?: number } } } | undefined) => void;
  /** Мгновенно вернуть капсулу (смена экрана, раскрытие меню). */
  expandNow: () => void;
};

export function useFcTabBarScroll(): FcTabBarScroll {
  const reduceMotion = useFcReduceMotion();
  /** §8: «уменьшить движение» / слабое устройство / web — капсула просто не двигается. */
  const enabled = !(reduceMotion || isLowPowerEffective() || Platform.OS === 'web');

  const chrome = useSharedValue(0);
  /** Целевое состояние машины (0/1) — отдельно от анимируемого прогресса. */
  const collapsed = useSharedValue(0);
  const lastY = useSharedValue(0);
  const toggledAt = useSharedValue(0);

  /** Один шаг машины состояний. Воркет: зовётся и с UI-, и с JS-потока. */
  const step = useCallback((y: number) => {
    'worklet';
    if (!enabled) return;
    const action = fcTabChromeAction(y, lastY.value);
    lastY.value = Number.isFinite(y) ? Math.max(0, y) : 0;
    if (action === 'keep') return;

    if (action === 'expand_now') {
      collapsed.value = 0;
      if (chrome.value !== 0) chrome.value = 0;
      return;
    }

    const target = action === 'collapse' ? 1 : 0;
    if (collapsed.value === target) return;
    const now = Date.now();
    if (now - toggledAt.value < TAB_SCROLL_TOGGLE_COOLDOWN_MS) return;
    toggledAt.value = now;
    collapsed.value = target;
    chrome.value = withTiming(target, {
      duration: target === 1 ? TAB_SCROLL_COLLAPSE_MS : TAB_SCROLL_EXPAND_MS,
      easing: TAB_SCROLL_EASING,
    });
  }, [chrome, collapsed, enabled, lastY, toggledAt]);

  const scrollHandler = useAnimatedScrollHandler(
    { onScroll: (e) => { step(e.contentOffset.y); } },
    [step],
  );

  const onScroll = useCallback((e: { nativeEvent?: { contentOffset?: { y?: number } } } | undefined) => {
    const y = e?.nativeEvent?.contentOffset?.y;
    if (typeof y === 'number') step(y);
  }, [step]);

  const expandNow = useCallback(() => {
    lastY.value = 0;
    collapsed.value = 0;
    chrome.value = 0;
  }, [chrome, collapsed, lastY]);

  return useMemo(
    () => ({ chrome, scrollHandler, onScroll, expandNow }),
    [chrome, scrollHandler, onScroll, expandNow],
  );
}

type MenuItemProps = {
  t: Theme;
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  index: number;
  total: number;
  open: boolean;
  simple: boolean;
  accent?: boolean;
  onPress: () => void;
  /** §6: выбор наборов перед стартом — кнопка справа + долгий тап по строке. */
  onSetup?: () => void;
  setupTestID?: string;
  /** Подпись кнопки выбора наборов («Выбрать наборы») — озвучка и подсказка. */
  setupLabel?: string;
};

/**
 * Кнопка раскрывающейся группы: собственный shared value → стаггер по индексу.
 * Только transform (translateY/scale) + opacity.
 */
function TabMenuItem({
  t,
  testID,
  icon,
  label,
  index,
  total,
  open,
  simple,
  accent = false,
  onPress,
  onSetup,
  setupTestID,
  setupLabel,
}: MenuItemProps) {
  const p = useSharedValue(0);

  useEffect(() => {
    const target = open ? 1 : 0;
    if (simple) {
      p.value = withTiming(target, { duration: TIMING_MS });
      return;
    }
    const delay = fcTabMenuItemDelay(index, { open, total });
    p.value = withDelay(delay, withSpring(target, open ? SPRING_OPEN : SPRING_CLOSE));
  }, [open, simple, index, total, p]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { translateY: (1 - p.value) * 18 },
      { scale: 0.9 + p.value * 0.1 },
    ],
  }));

  const os = getEffectivePlatformOS();
  const shadow =
    os === 'ios'
      ? { shadowColor: t.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 }
      : os === 'android'
        ? { elevation: 6 }
        : {};

  return (
    <Reanimated.View style={aStyle} pointerEvents={open ? 'auto' : 'none'}>
      {/* Кнопка режима и ⚙ — СОСЕДИ, а не вложенные Pressable: вложенность даёт
          <button> в <button> на web и спорную адресацию тапа на нативе. */}
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: accent ? `${t.accent}77` : t.border,
            backgroundColor: t.bgCard,
            paddingRight: onSetup ? 10 : 0,
          },
          shadow,
        ]}
      >
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`qa-${testID}`}
          accessible
          onPress={onPress}
          onLongPress={onSetup}
          delayLongPress={onSetup ? 420 : undefined}
          accessibilityHint={onSetup ? setupLabel : undefined}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            paddingLeft: 14,
            paddingRight: onSetup ? 10 : 16,
            borderRadius: 16,
            opacity: pressed ? 0.86 : 1,
          })}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${t.accent}1F`,
            }}
          >
            <Ionicons name={icon} size={17} color={t.accent} />
          </View>
          <Text
            style={{ color: t.textPrimary, fontSize: 14, fontWeight: '800', minWidth: 96 }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Pressable>

        {onSetup ? (
          /*
           * §6: мультивыбор наборов — быстрый старт идёт мимо шита, эта кнопка
           * открывает выбор. FIX (владелец, 2026-08-13): «выбор наборов доступен
           * не везде и не очевиден» — серая ⚙ читалась как «настройки чего-то»,
           * а долгий тап невидим вовсе. Тот же значок наборов, что и у кнопки
           * выбора внутри режимов, и акцентный тон: путь к выбору виден сразу.
           */
          <Pressable
            testID={setupTestID}
            accessibilityRole="button"
            accessibilityLabel={setupTestID ? `qa-${setupTestID}` : undefined}
            accessibilityHint={setupLabel}
            accessible
            onPress={onSetup}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
            style={({ pressed }) => ({
              width: 30,
              height: 30,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${t.accent}1F`,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="albums-outline" size={16} color={t.accent} />
          </Pressable>
        ) : null}
      </View>
    </Reanimated.View>
  );
}

export default function FlashcardsTabBar({ lang, t, active, bottomInset = 0, scroll = null }: Props) {
  const router = useRouter();
  const { f, ds, themeMode } = useTheme();
  const { tabBarHeight, bottomInset: screenBottomInset, width: screenWidth } = useScreen();
  const [menu, setMenu] = useState<FcTabMenu>('none');
  /** §6: для какого режима открыт шит выбора наборов (null — закрыт). */
  const [pickerOption, setPickerOption] = useState<FcTrainOption | null>(null);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);
  /** Сколько карточек в пуле блица по умолчанию (null — ещё не посчитано). */
  const [blitzPoolCount, setBlitzPoolCount] = useState<number | null>(blitzPoolCountCache);
  const reduceMotion = useFcReduceMotion();
  /** §8: «уменьшить движение» и слабые устройства — упрощённый вариант без потери функций. */
  const simple = reduceMotion || isLowPowerEffective() || Platform.OS === 'web';

  const open = isFcTabMenuOpen(menu);
  const createOpen = menu === 'create';
  const trainOpen = menu === 'train';
  const packsOpen = menu === 'packs';

  const scrim = useSharedValue(0);
  const plus = useSharedValue(0);

  useEffect(() => {
    const target = open ? 1 : 0;
    scrim.value = simple ? withTiming(target, { duration: TIMING_MS }) : withTiming(target, { duration: 190 });
  }, [open, simple, scrim]);

  useEffect(() => {
    const target = createOpen ? 1 : 0;
    plus.value = simple
      ? withTiming(target, { duration: TIMING_MS })
      : withSpring(target, createOpen ? SPRING_OPEN : SPRING_CLOSE);
  }, [createOpen, simple, plus]);

  /** Экран без транспорта скролла — капсула просто стоит на месте. */
  const idleChrome = useSharedValue(0);
  const chrome = scroll?.chrome ?? idleChrome;

  /**
   * Сжатие капсулы при скролле — те же значения и тот же порядок трансформаций,
   * что и на главной: сначала уезд вниз, затем масштаб (нажатие масштабируется
   * отдельным, вложенным слоем). Только transform/opacity.
   */
  const scrollChromeStyle = useAnimatedStyle(() => ({
    opacity: 1 - chrome.value * (1 - TAB_SCROLL_COLLAPSED_OPACITY),
    transform: [
      { translateY: chrome.value * TAB_SCROLL_COLLAPSED_TRANSLATE_Y },
      { scale: 1 - chrome.value * (1 - TAB_SCROLL_COLLAPSED_SCALE) },
    ],
  }), [chrome]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value * FC_TABBAR_SCRIM_OPACITY }));
  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${plus.value * FC_PLUS_ROTATION_DEG}deg` }],
  }));

  const close = useCallback(() => setMenu('none'), []);

  /** Раскрытая группа над сжатой капсулой выглядит оторванной — возвращаем её. */
  useEffect(() => {
    if (menu !== 'none') scroll?.expandNow();
  }, [menu, scroll]);

  /** §5.2: системный «назад» сначала сворачивает раскрытую группу. */
  useEffect(() => {
    if (Platform.OS !== 'android' || !open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const next = consumeFcTabBackPress(menu);
      if (!next.handled) return false;
      setMenu(next.menu);
      return true;
    });
    return () => sub.remove();
  }, [open, menu]);

  /**
   * Пункт «Блиц» показываем только когда карточек хватает на 4 варианта ответа:
   * иначе он ведёт на экран-заглушку. Счёт снимаем ПОСЛЕ интеракций — вход в
   * раздел за это не платит, а результат кэшируется на модуль.
   */
  const refreshBlitzPoolCount = useCallback(() => {
    let cancelled = false;
    void (async () => {
      // FIX (владелец, 2026-08-13): считали только «сохранённые + мои карточки»,
      // поэтому у человека с карточками ТОЛЬКО в добавленных наборах пункт
      // «Блиц» не появлялся вовсе. Считаем ВСЕ доступные источники — ровно тот
      // же пул, что берёт сама сессия блица по умолчанию (loadAllFcDeckRefs).
      const count = await countAvailableFcCards(lang).catch(() => null);
      if (cancelled || count === null) return;
      blitzPoolCountCache = count;
      setBlitzPoolCount(count);
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    let cancelPool: (() => void) | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      cancelPool = refreshBlitzPoolCount();
    });
    return () => {
      task.cancel();
      cancelPool?.();
    };
  }, [refreshBlitzPoolCount]);

  /** Свежесозданная карточка могла разблокировать блиц — пересчитываем на раскрытии. */
  useEffect(() => {
    if (!trainOpen) return;
    return refreshBlitzPoolCount();
  }, [trainOpen, refreshBlitzPoolCount]);

  const trainOptions = useMemo(() => visibleFcTrainOptions(blitzPoolCount), [blitzPoolCount]);

  /**
   * FIX (владелец, 2026-08-16) «разделы карточек зациклены, выйти невозможно»:
   * таббар делал push, поэтому каждый тап клал ЕЩЁ один экран карточек в стек.
   * «Мои наборы» → «Наборы сообщества» → «Мои наборы» давали стек из трёх
   * экранов одного раздела, и «назад» ходил по ним кругами вместо выхода.
   *
   * Таббар — это ТАБ, а не переход вглубь: смена позиции ЗАМЕНЯЕТ текущий экран
   * раздела. Стек не растёт, «назад» из любого раздела карточек ведёт наружу.
   * markNextNavigationAsReplace держит историю navigation_back в согласии с
   * реальным стеком роутера — иначе она копила бы записи о снятых экранах.
   */
  const go = useCallback(
    (target: { pathname: string; params: Record<string, string> }) => {
      close();
      markNextNavigationAsReplace();
      router.replace({ pathname: target.pathname, params: target.params } as any);
    },
    [close, router],
  );

  const onTrainOption = useCallback(
    (option: FcTrainOption) => {
      void hapticTap();
      close();
      void (async () => {
        const preset = await getLastPreset(fcTrainOptionPresetMode(option)).catch(() => null);
        const target = buildFcTrainRoute(option, preset);
        router.push({ pathname: target.pathname, params: target.params } as any);
      })();
    },
    [close, router],
  );

  const onCreateOption = useCallback(
    (option: FcCreateOption) => {
      void hapticTap();
      go(buildFcCreateRoute(option));
    },
    [go],
  );

  const onPacksOption = useCallback(
    (option: FcPacksOption) => {
      void hapticTap();
      const target = buildFcPacksRoute(option);
      const alreadyHere =
        (option === 'mine' && active === 'mine') || (option === 'community' && active === 'packs');
      if (alreadyHere) {
        close();
        return;
      }
      // Оба раздела наборов — соседи по таббару, а не вложенные экраны: переход
      // между ними заменяет экран (см. go), иначе они копятся в стеке.
      go(target);
    },
    [active, close, go],
  );

  /**
   * §6: шит мультивыбора наборов. Быстрый старт (обычный тап) идёт мимо него —
   * ⚙ / долгий тап открывают выбор наборов и размера сессии.
   */
  const onTrainOptionSetup = useCallback((option: FcTrainOption) => {
    void hapticTap();
    setMenu('none');
    setPickerOption(option);
  }, []);

  const closePicker = useCallback(() => setPickerOption(null), []);

  /** Наборы и предвыбор грузим только при открытии — вход в раздел не платит за это. */
  useEffect(() => {
    if (!pickerOption) return;
    let cancelled = false;
    const mode = fcTrainOptionPresetMode(pickerOption);
    void (async () => {
      const [decks, preset] = await Promise.all([
        loadFcDeckOptions(mode, lang).catch(() => [] as DeckSheetOption[]),
        getLastPreset(mode).catch(() => null),
      ]);
      if (cancelled) return;
      setDeckOptions(decks);
      setDeckPreset(preset);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOption, lang]);

  const onPickerStart = useCallback(
    (preset: FcModePreset) => {
      const option = pickerOption;
      setPickerOption(null);
      if (!option) return;
      const target = buildFcTrainRoute(option, preset, { fromPicker: true });
      router.push({ pathname: target.pathname, params: target.params } as any);
    },
    [pickerOption, router],
  );

  const onTogglePress = useCallback((kind: 'train' | 'create' | 'packs') => {
    void hapticTap();
    setMenu((cur) => toggleFcTabMenu(cur, kind));
  }, []);

  const labels = useMemo(
    () => ({
      train: triLang(lang, {
        ru: 'Тренировка', uk: 'Тренування', es: 'Entrenar',
        'pt-BR': 'Treinar', vi: 'Luyện tập', id: 'Latihan', tr: 'Antrenman', pl: 'Trening',
      }),
      listen: triLang(lang, {
        ru: 'Слушать', uk: 'Слухати', es: 'Escuchar',
        'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengar', tr: 'Dinle', pl: 'Słuchaj',
      }),
      blitz: triLang(lang, {
        ru: 'Блиц', uk: 'Бліц', es: 'Blitz',
        'pt-BR': 'Blitz', vi: 'Blitz', id: 'Blitz', tr: 'Blitz', pl: 'Blitz',
      }),
      packs: triLang(lang, {
        ru: 'Наборы', uk: 'Набори', es: 'Packs',
        'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy',
      }),
      createCard: triLang(lang, {
        ru: 'Создать карточку', uk: 'Створити картку', es: 'Crear tarjeta',
        'pt-BR': 'Criar cartão', vi: 'Tạo thẻ', id: 'Buat kartu', tr: 'Kart oluştur', pl: 'Utwórz fiszkę',
      }),
      createPack: triLang(lang, {
        ru: 'Создать набор', uk: 'Створити набір', es: 'Crear pack',
        'pt-BR': 'Criar pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur', pl: 'Utwórz zestaw',
      }),
      myPacks: triLang(lang, {
        ru: 'Мои наборы', uk: 'Мої набори', es: 'Mis packs',
        'pt-BR': 'Meus pacotes', vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
      }),
      communityPacks: triLang(lang, {
        ru: 'Наборы сообщества', uk: 'Набори спільноти', es: 'Packs de la comunidad',
        'pt-BR': 'Pacotes da comunidade', vi: 'Bộ thẻ cộng đồng', id: 'Paket komunitas',
        tr: 'Topluluk paketleri', pl: 'Zestawy społeczności',
      }),
      create: triLang(lang, {
        ru: 'Создать', uk: 'Створити', es: 'Crear',
        'pt-BR': 'Criar', vi: 'Tạo', id: 'Buat', tr: 'Oluştur', pl: 'Utwórz',
      }),
      /** §6: одна и та же подпись у кнопки выбора наборов во всех трёх режимах. */
      pickDecks: triLang(lang, {
        ru: 'Выбрать наборы', uk: 'Обрати набори', es: 'Elegir packs',
        'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih set kartu',
        tr: 'Setleri seç', pl: 'Wybierz zestawy',
      }),
    }),
    [lang],
  );

  const trainMeta: Record<FcTrainOption, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    train: { icon: 'barbell-outline', label: labels.train },
    listen: { icon: 'headset-outline', label: labels.listen },
    blitz: { icon: 'flash-outline', label: labels.blitz },
  };
  const createMeta: Record<FcCreateOption, { icon: keyof typeof Ionicons.glyphMap; label: string; testID: string }> = {
    card: { icon: 'add-circle-outline', label: labels.createCard, testID: 'fc-tabbar-create-card' },
    pack: { icon: 'albums-outline', label: labels.createPack, testID: 'fc-tabbar-create-pack' },
  };
  const packsMeta: Record<FcPacksOption, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    mine: { icon: 'bookmarks-outline', label: labels.myPacks },
    community: { icon: 'people-outline', label: labels.communityPacks },
  };

  // ── Хром капсулы: те же правила, что и у таббара главного экрана ────────────
  const isSagePorcelainTabChrome = themeMode === 'sagePorcelain';
  const isOliveTheme = themeMode === 'olive';
  const pillBackground = isSagePorcelainTabChrome ? t.accent : isOliveTheme ? OLIVE_RICH.panel : TAB_UNDERLAY_DIM_BG;
  const iconActive = isSagePorcelainTabChrome ? t.correctText : isOliveTheme ? OLIVE_RICH.champagne : t.accent;
  const iconMuted = isSagePorcelainTabChrome
    ? withAlpha(t.correctText, 0.72)
    : isOliveTheme ? withAlpha(OLIVE_RICH.ivory, 0.62)
    : withAlpha(t.textSecond, TAB_DARK_ICON_MUTED_ALPHA);
  const activePillBg = withAlpha(iconActive, TAB_DARK_ACTIVE_BG_ALPHA);

  const pillBottom = Math.max(bottomInset, screenBottomInset, ds.spacing.sm) + FLOATING_PILL_BOTTOM_GAP;
  /** Верхняя кромка капсулы — от неё отсчитываются раскрывающиеся группы. */
  const barTotalH = pillBottom + tabBarHeight;

  /** Капсула — по содержимому и по центру экрана (три позиции, а не четыре). */
  const pillW = tabPillWidth(BAR_SLOTS.length);
  /**
   * Раскрывающиеся группы прижимаются к краям КАПСУЛЫ, а не экрана — иначе
   * список висел бы в стороне от своей кнопки. Не уже прежнего отступа.
   */
  const menuSideInset = Math.max(ds.spacing.lg, (screenWidth - pillW) / 2);

  /** Стартовое положение подсветки = финальное: первый кадр без «переезда». */
  const initialActiveIdx = active === 'packs' || active === 'mine' ? BAR_SLOTS.indexOf('packs') : -1;
  const highlightAnim = useRef(new Animated.Value(Math.max(0, initialActiveIdx))).current;
  const highlightOpacity = useRef(new Animated.Value(initialActiveIdx >= 0 ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(0)).current;
  const [pressedSlot, setPressedSlot] = useState<BarSlot | null>(null);

  /** Подсвечена раскрытая группа, иначе — открытый раздел наборов. */
  const activeSlot: BarSlot | null =
    menu === 'train' ? 'train'
      : menu === 'create' ? 'create'
        : menu === 'packs' ? 'packs'
          : active === 'packs' || active === 'mine' ? 'packs'
            : null;
  const activeSlotIdx = activeSlot ? BAR_SLOTS.indexOf(activeSlot) : -1;

  useEffect(() => {
    if (activeSlotIdx < 0) return;
    Animated.spring(highlightAnim, {
      toValue: activeSlotIdx,
      ...TAB_HIGHLIGHT_SPRING,
      useNativeDriver: true,
    }).start();
  }, [activeSlotIdx, highlightAnim]);

  useEffect(() => {
    Animated.timing(highlightOpacity, {
      toValue: activeSlotIdx >= 0 ? 1 : 0,
      duration: TAB_HIGHLIGHT_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [activeSlotIdx, highlightOpacity]);

  const endSlotPress = useCallback(() => {
    pressAnim.stopAnimation();
    Animated.spring(pressAnim, {
      toValue: 0,
      ...TAB_PRESS_OUT_SPRING,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPressedSlot(null);
    });
  }, [pressAnim]);

  const beginSlotPress = useCallback((slot: BarSlot) => {
    setPressedSlot(slot);
    pressAnim.stopAnimation();
    Animated.spring(pressAnim, {
      toValue: 1,
      ...TAB_PRESS_IN_SPRING,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const pillPressScale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, TAB_PILL_PRESS_SCALE] });
  const activePillPressScale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, TAB_ACTIVE_PILL_PRESS_SCALE] });
  const activePillPressOpacity = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, TAB_ACTIVE_PILL_PRESS_OPACITY] });

  const slotMeta: Record<BarSlot, { icon: keyof typeof Ionicons.glyphMap; testID: string; label: string; onPress: () => void }> = {
    train: { icon: 'barbell-outline', testID: 'fc-tabbar-train', label: labels.train, onPress: () => onTogglePress('train') },
    create: { icon: 'add', testID: 'fc-tabbar-plus', label: labels.create, onPress: () => onTogglePress('create') },
    packs: { icon: 'albums-outline', testID: 'fc-tabbar-packs', label: labels.packs, onPress: () => onTogglePress('packs') },
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      {/* Затемнение фона + закрытие по тапу вне (§5.2) */}
      <Reanimated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }, scrimStyle]}
      >
        <Pressable
          testID="fc-tabbar-scrim"
          accessibilityLabel="qa-fc-tabbar-scrim"
          onPress={close}
          style={StyleSheet.absoluteFillObject}
        />
      </Reanimated.View>

      {/* Слой на весь экран: все всплывашки живут ВНУТРИ его границ — иначе на
          Android касание по кнопке, отрисованной выше родителя, не доходит. */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
        {/* §5.2: список режимов выезжает ВВЕРХ над левой позицией «Тренировка» */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: menuSideInset, bottom: barTotalH + 10 }}
        >
          <View pointerEvents="box-none" style={{ gap: 8, alignItems: 'flex-start' }}>
            {trainOptions.map((option, i) => (
              <TabMenuItem
                key={option}
                t={t}
                testID={`fc-tabbar-train-option-${option}`}
                icon={trainMeta[option].icon}
                label={trainMeta[option].label}
                index={i}
                total={trainOptions.length}
                open={trainOpen}
                simple={simple}
                onPress={() => onTrainOption(option)}
                onSetup={() => onTrainOptionSetup(option)}
                setupTestID={`fc-tabbar-train-option-${option}-setup`}
                setupLabel={labels.pickDecks}
              />
            ))}
          </View>
        </View>

        {/* Два раздела наборов раскрываются НАД правой позицией */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', right: menuSideInset, bottom: barTotalH + 10 }}
        >
          <View pointerEvents="box-none" style={{ gap: 8, alignItems: 'flex-end' }}>
            {FC_PACKS_OPTIONS.map((option, i) => (
              <TabMenuItem
                key={option}
                t={t}
                testID={`fc-tabbar-packs-option-${option}`}
                icon={packsMeta[option].icon}
                label={packsMeta[option].label}
                index={i}
                total={FC_PACKS_OPTIONS.length}
                open={packsOpen}
                simple={simple}
                onPress={() => onPacksOption(option)}
              />
            ))}
          </View>
        </View>

        {/* §5.2: две кнопки создания раскрываются НАД центральной «+» */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: barTotalH + 10, alignItems: 'center' }}
        >
          <View pointerEvents="box-none" style={{ gap: 8, alignItems: 'center' }}>
            {FC_CREATE_OPTIONS.map((option, i) => (
              <TabMenuItem
                key={option}
                t={t}
                testID={createMeta[option].testID}
                icon={createMeta[option].icon}
                label={createMeta[option].label}
                index={i}
                total={FC_CREATE_OPTIONS.length}
                open={createOpen}
                simple={simple}
                accent
                onPress={() => onCreateOption(option)}
              />
            ))}
          </View>
        </View>

        {/* Плавающая капсула. Хром (сжатие от скролла) — на внешнем слое, чтобы
            не спорить с «вдавливанием» при нажатии на внутреннем. */}
        <Reanimated.View
          pointerEvents="box-none"
          style={[styles.pillDock, { bottom: pillBottom }, scrollChromeStyle]}
        >
          <Animated.View
            style={[
              styles.pill,
              TAB_PILL_SHADOW,
              {
                width: pillW,
                height: tabBarHeight,
                borderRadius: tabBarHeight / 2,
                shadowColor: t.shadowDark,
                transform: [{ scale: pillPressScale }],
              },
            ]}
          >
            <View pointerEvents="none" style={[styles.pillFill, { backgroundColor: pillBackground }]} />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                {
                  top: (tabBarHeight - TAB_ACTIVE_PILL_HEIGHT) / 2,
                  left: tabHighlightInset(),
                  backgroundColor: activePillBg,
                  opacity: Animated.multiply(highlightOpacity, activePillPressOpacity),
                  transform: [
                    {
                      translateX: highlightAnim.interpolate({
                        inputRange: BAR_SLOTS.map((_, index) => index),
                        outputRange: BAR_SLOTS.map((_, index) => tabHighlightOffset(index)),
                        extrapolate: 'clamp',
                      }),
                    },
                    { scale: activePillPressScale },
                  ],
                },
              ]}
            />

            {BAR_SLOTS.map((slot) => {
              const isCenter = slot === CENTER_SLOT;
              const focused = activeSlot === slot;
              const color = isCenter ? iconActive : focused ? iconActive : iconMuted;
              const iconScale = pressedSlot === slot
                ? pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, TAB_ICON_PRESS_SCALE] })
                : 1;
              const icon = (
                <Ionicons
                  name={slotMeta[slot].icon}
                  size={isCenter ? TAB_CENTER_ICON_SIZE : TAB_ICON_SIZE}
                  color={color}
                />
              );
              return (
                <TouchableOpacity
                  key={slot}
                  testID={slotMeta[slot].testID}
                  accessibilityLabel={`qa-${slotMeta[slot].testID}`}
                  accessible
                  accessibilityRole="button"
                  accessibilityState={{ expanded: menu === slot }}
                  accessibilityHint={slotMeta[slot].label}
                  style={styles.slot}
                  onPressIn={() => beginSlotPress(slot)}
                  onPressOut={endSlotPress}
                  onPress={slotMeta[slot].onPress}
                  activeOpacity={1}
                >
                  <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                    {isCenter ? <Reanimated.View style={plusStyle}>{icon}</Reanimated.View> : icon}
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </Reanimated.View>
      </View>

      {/* §6: мультивыбор наборов перед стартом режима (⚙ / долгий тап на пункте) */}
      <DeckPickerSheet
        visible={!!pickerOption}
        onClose={closePicker}
        onStart={onPickerStart}
        decks={deckOptions}
        initialPreset={deckPreset}
        lang={lang}
        t={t}
        f={f}
        reduceMotion={reduceMotion}
        mode={pickerOption ? fcTrainOptionPresetMode(pickerOption) : 'trainer'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Слой-«док»: держит капсулу по центру и несёт сжатие от скролла. */
  pillDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  /** Плавающая капсула остаётся целой и слегка вдавливается при нажатии. */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0,
  },
  pillFill: { ...StyleSheet.absoluteFillObject },
  slot: {
    width: TAB_SLOT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    position: 'relative',
    zIndex: 10,
  },
  activePill: {
    position: 'absolute',
    width: TAB_ACTIVE_PILL_WIDTH,
    height: TAB_ACTIVE_PILL_HEIGHT,
    borderRadius: TAB_ACTIVE_PILL_HEIGHT / 2,
  },
});
