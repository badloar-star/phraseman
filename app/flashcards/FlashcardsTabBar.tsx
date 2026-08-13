/**
 * Cards 2.1 §5.2 — нижний таббар раздела «Карточки» (3 позиции), закреплён внизу.
 *
 *   слева   «Тренировка» → вверх выезжает список: Тренировка / Слушать / Блиц
 *   центр   «+» (акцентная круглая) → над кнопкой: Создать карточку / Создать набор
 *   справа  «Наборы» → каталог наборов сообщества
 *
 * Анимация (§5.2/§8): пружина со стаггером, затемнение фона, поворот «+» в «×»,
 * закрытие по тапу вне и по системному «назад» (Android). Только transform/opacity.
 * Деградация: `useFcReduceMotion()` и `isLowPowerEffective()` → короткий timing без
 * стаггера (функциональность полностью сохраняется).
 *
 * Вся чистая логика (состояние раскрытия, тайминги, сборка маршрутов) — `tabbar_state.ts`.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { hapticTap } from '../../hooks/use-haptics';
import { useTheme } from '../../components/ThemeContext';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import DeckPickerSheet, { type DeckSheetOption } from './DeckPickerSheet';
import { loadFcDeckOptions } from './deck_options';
import { isLowPowerEffective } from './low_power';
import { getLastPreset, type FcModePreset } from './mode_prefs';
import { useFcReduceMotion } from './PhraseCard';
import {
  buildFcCreateRoute,
  buildFcTrainRoute,
  consumeFcTabBackPress,
  FC_CREATE_OPTIONS,
  FC_PACKS_ROUTE,
  FC_PLUS_ROTATION_DEG,
  FC_TABBAR_SCRIM_OPACITY,
  FC_TRAIN_OPTIONS,
  fcTabMenuItemDelay,
  fcTrainOptionPresetMode,
  isFcTabMenuOpen,
  toggleFcTabMenu,
  type FcCreateOption,
  type FcTabMenu,
  type FcTrainOption,
} from './tabbar_state';

/** Высота панели без нижнего инсета — контейнеры резервируют её под контент. */
export const FC_TABBAR_HEIGHT = 62;

const SPRING_OPEN = { damping: 15, stiffness: 240, mass: 0.55 } as const;
const SPRING_CLOSE = { damping: 20, stiffness: 300, mass: 0.5 } as const;
const TIMING_MS = 140;

type Props = {
  lang: Lang;
  t: Theme;
  /** Какая позиция подсвечена: сохранённые карточки или каталог наборов. */
  active: 'cards' | 'packs';
  /** Нижний safe-area инсет экрана. */
  bottomInset?: number;
};

type MenuItemProps = {
  t: Theme;
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  index: number;
  total: number;
  open: boolean;
  simple: boolean;
  accent?: boolean;
  onPress: () => void;
  /** §6: выбор колоды перед стартом — ⚙ справа + долгий тап по строке. */
  onSetup?: () => void;
  setupTestID?: string;
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
  sub,
  index,
  total,
  open,
  simple,
  accent = false,
  onPress,
  onSetup,
  setupTestID,
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
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 11,
            paddingLeft: 14,
            paddingRight: onSetup ? 10 : 14,
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
          <View style={{ minWidth: 96 }}>
            <Text style={{ color: t.textPrimary, fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
              {label}
            </Text>
            {sub ? (
              <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {onSetup ? (
          /* §6: мультивыбор колод — быстрый старт идёт мимо шита, ⚙ открывает выбор. */
          <Pressable
            testID={setupTestID}
            accessibilityRole="button"
            accessibilityLabel={setupTestID ? `qa-${setupTestID}` : undefined}
            accessible
            onPress={onSetup}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
            style={({ pressed }) => ({
              width: 28,
              height: 28,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${t.textMuted}1A`,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="options-outline" size={15} color={t.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Reanimated.View>
  );
}

export default function FlashcardsTabBar({ lang, t, active, bottomInset = 0 }: Props) {
  const router = useRouter();
  const { f } = useTheme();
  const [menu, setMenu] = useState<FcTabMenu>('none');
  /** §6: для какого режима открыт шит выбора колод (null — закрыт). */
  const [pickerOption, setPickerOption] = useState<FcTrainOption | null>(null);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);
  const reduceMotion = useFcReduceMotion();
  /** §8: «уменьшить движение» и слабые устройства — упрощённый вариант без потери функций. */
  const simple = reduceMotion || isLowPowerEffective() || Platform.OS === 'web';

  const open = isFcTabMenuOpen(menu);
  const createOpen = menu === 'create';
  const trainOpen = menu === 'train';

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

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value * FC_TABBAR_SCRIM_OPACITY }));
  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${plus.value * FC_PLUS_ROTATION_DEG}deg` }],
  }));

  const close = useCallback(() => setMenu('none'), []);

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

  const go = useCallback(
    (target: { pathname: string; params: Record<string, string> }) => {
      close();
      router.push({ pathname: target.pathname, params: target.params } as any);
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

  /**
   * §6: шит мультивыбора колод. Быстрый старт (обычный тап) идёт мимо него —
   * ⚙ / долгий тап открывают выбор наборов и размера сессии.
   */
  const onTrainOptionSetup = useCallback((option: FcTrainOption) => {
    void hapticTap();
    setMenu('none');
    setPickerOption(option);
  }, []);

  const closePicker = useCallback(() => setPickerOption(null), []);

  /** Колоды и предвыбор грузим только при открытии — вход в раздел не платит за это. */
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
      const target = buildFcTrainRoute(option, preset);
      router.push({ pathname: target.pathname, params: target.params } as any);
    },
    [pickerOption, router],
  );

  const onTogglePress = useCallback((kind: 'train' | 'create') => {
    void hapticTap();
    setMenu((cur) => toggleFcTabMenu(cur, kind));
  }, []);

  const onPacksPress = useCallback(() => {
    void hapticTap();
    close();
    if (active === 'packs') return;
    router.push(FC_PACKS_ROUTE as any);
  }, [active, close, router]);

  const labels = useMemo(
    () => ({
      train: triLang(lang, { ru: 'Тренировка', uk: 'Тренування', es: 'Entrenar' }),
      listen: triLang(lang, { ru: 'Слушать', uk: 'Слухати', es: 'Escuchar' }),
      blitz: triLang(lang, { ru: 'Блиц', uk: 'Бліц', es: 'Blitz' }),
      packs: triLang(lang, { ru: 'Наборы', uk: 'Набори', es: 'Packs' }),
      createCard: triLang(lang, { ru: 'Создать карточку', uk: 'Створити картку', es: 'Crear tarjeta' }),
      createPack: triLang(lang, { ru: 'Создать набор', uk: 'Створити набір', es: 'Crear pack' }),
      trainSub: triLang(lang, { ru: 'слова и фразы', uk: 'слова та фрази', es: 'palabras y frases' }),
      listenSub: triLang(lang, { ru: 'аудио без рук', uk: 'аудіо без рук', es: 'audio sin manos' }),
      blitzSub: triLang(lang, { ru: '60 секунд', uk: '60 секунд', es: '60 s' }),
    }),
    [lang],
  );

  const trainMeta: Record<FcTrainOption, { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string }> = {
    train: { icon: 'barbell-outline', label: labels.train, sub: labels.trainSub },
    listen: { icon: 'headset-outline', label: labels.listen, sub: labels.listenSub },
    blitz: { icon: 'flash-outline', label: labels.blitz, sub: labels.blitzSub },
  };
  const createMeta: Record<FcCreateOption, { icon: keyof typeof Ionicons.glyphMap; label: string; testID: string }> = {
    card: { icon: 'add-circle-outline', label: labels.createCard, testID: 'fc-tabbar-create-card' },
    pack: { icon: 'albums-outline', label: labels.createPack, testID: 'fc-tabbar-create-pack' },
  };

  const os = getEffectivePlatformOS();
  const barShadow =
    os === 'ios'
      ? { shadowColor: t.cardShadow, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.22, shadowRadius: 12 }
      : os === 'android'
        ? { elevation: 12 }
        : {};

  const barBottomPad = Math.max(bottomInset, 8);
  /** Полная высота панели — от неё отсчитываются раскрывающиеся группы. */
  const barTotalH = FC_TABBAR_HEIGHT + barBottomPad;

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

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        {/* §5.2: список режимов выезжает ВВЕРХ над левой кнопкой «Тренировка» */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 12, bottom: barTotalH + 10 }}
        >
          <View pointerEvents="box-none" style={{ gap: 8, alignItems: 'flex-start' }}>
            {FC_TRAIN_OPTIONS.map((option, i) => (
              <TabMenuItem
                key={option}
                t={t}
                testID={`fc-tabbar-train-option-${option}`}
                icon={trainMeta[option].icon}
                label={trainMeta[option].label}
                sub={trainMeta[option].sub}
                index={i}
                total={FC_TRAIN_OPTIONS.length}
                open={trainOpen}
                simple={simple}
                onPress={() => onTrainOption(option)}
                onSetup={() => onTrainOptionSetup(option)}
                setupTestID={`fc-tabbar-train-option-${option}-setup`}
              />
            ))}
          </View>

        </View>

        {/* §5.2: две кнопки создания раскрываются НАД центральной «+» */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: barTotalH + 22, alignItems: 'center' }}
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

        {/* Сама панель */}
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: FC_TABBAR_HEIGHT + barBottomPad,
              paddingBottom: barBottomPad,
              paddingHorizontal: 18,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: t.border,
              backgroundColor: t.bgCard,
            },
            barShadow,
          ]}
        >
          <TabBarButton
            t={t}
            testID="fc-tabbar-train"
            icon="barbell-outline"
            label={labels.train}
            activeState={trainOpen}
            onPress={() => onTogglePress('train')}
          />

          {/* Место под акцентную «+» — сама кнопка вынесена из панели, чтобы
              выступающая часть не обрезалась на Android. */}
          <View style={{ width: 54 }} />

          <TabBarButton
            t={t}
            testID="fc-tabbar-packs"
            icon="albums-outline"
            label={labels.packs}
            activeState={active === 'packs'}
            onPress={onPacksPress}
          />
        </View>

        {/* Акцентная круглая «+» — приподнята над панелью (§5.2) */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: barBottomPad + 18, alignItems: 'center' }}
        >
          <Pressable
            testID="fc-tabbar-plus"
            accessibilityRole="button"
            accessibilityLabel="qa-fc-tabbar-plus"
            accessible
            onPress={() => onTogglePress('create')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              {
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.accent,
                borderWidth: 3,
                borderColor: t.bgCard,
                opacity: pressed ? 0.9 : 1,
              },
              os === 'ios'
                ? { shadowColor: t.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 }
                : os === 'android'
                  ? { elevation: 10 }
                  : {},
            ]}
          >
            <Reanimated.View style={plusStyle}>
              <Ionicons name="add" size={30} color={t.correctText} />
            </Reanimated.View>
          </Pressable>
        </View>
      </View>

      {/* §6: мультивыбор колод перед стартом режима (⚙ / долгий тап на пункте) */}
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

function TabBarButton({
  t,
  testID,
  icon,
  label,
  activeState,
  onPress,
}: {
  t: Theme;
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  activeState: boolean;
  onPress: () => void;
}) {
  const color = activeState ? t.accent : t.textMuted;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`qa-${testID}`}
      accessible
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      style={({ pressed }) => ({
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minWidth: 78,
        paddingVertical: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
