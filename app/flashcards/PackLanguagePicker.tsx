import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useTheme } from '../../components/ThemeContext';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LUM } from '../../constants/motionHybrid';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import {
  NO_PACK_LANGUAGE,
  PACK_LANGUAGES,
  PACK_LANGUAGE_CHOICES,
  PACK_LANGUAGE_META,
  packLanguageLabel,
  packLanguagePickerHint,
  type PackLanguage,
} from './pack_languages';

type Props = {
  lang: Lang;
  t: Theme;
  value: PackLanguage;
  onChange: (language: PackLanguage) => void;
  disabled?: boolean;
  /**
   * зачем (D127): «Без языка» — выбор АВТОРА набора. В фильтрах по изучаемому
   * языку его нет: такие наборы и так видны при любом выбранном языке.
   */
  allowNone?: boolean;
  /** зачем: оставлен для совместимости вызовов — окно теперь всегда Liquid Glass. */
  liquidGlass?: boolean;
  /**
   * зачем (packs-simple.html `.lg`, шапка «Сообщества» 04.10): пилюля «EN ▾» без флага —
   * 40 высотой, светлая полупрозрачная заливка. Остальные вызовы не меняются.
   */
  pill?: boolean;
  /**
   * зачем (п.83, cards-027): фильтр языка наборов на настройке тренировки показывает только языки, где есть наборы, —
   * список пунктов сужается до этих кодов (без «Без языка»). Без параметра — все языки, как раньше.
   */
  languages?: readonly PackLanguage[];
  /** Число наборов у языка — серым справа в пункте меню (п.83). */
  counts?: Readonly<Partial<Record<PackLanguage, number>>>;
  /** Своя кнопка вместо стандартной: окно выбора то же. open() открывает окно, visible — окно открыто (п.83: чип языка тренировки). */
  renderTrigger?: (open: () => void, visible: boolean) => React.ReactNode;
};

const FLAG_ART: Partial<Record<PackLanguage, number>> = {
  en: require('../../assets/images/language_flags/language_en.webp'),
  fr: require('../../assets/images/language_flags/language_fr_dev.webp'),
  es: require('../../assets/images/language_flags/language_es_dev.webp'),
  // зачем D130: флаги итальянского и немецкого в стиле готовых (2026-09-30).
  de: require('../../assets/images/language_flags/language_de.webp'),
  it: require('../../assets/images/language_flags/language_it.webp'),
};

// зачем: флаг — растровый там, где есть арт (как в макете); для остальных языков — код в плашке, а не эмодзи.
function FlagMark({ code, width, height, color }: { code: PackLanguage; width: number; height: number; color: string }) {
  // Нейтральный значок вместо флага: у набора «без языка» нет страны (D127).
  if (code === NO_PACK_LANGUAGE) return <Ionicons name="globe-outline" size={height + 2} color={color} style={{ width, textAlign: 'center' }} />;
  const art = FLAG_ART[code];
  if (art) return <Image source={art} style={{ width, height, borderRadius: 3 }} contentFit="cover" />;
  return <Text style={{ width, fontSize: 13, fontWeight: '700', color, textAlign: 'center' }}>{PACK_LANGUAGE_META[code].shortName}</Text>;
}

export default function PackLanguagePicker({ lang, t, value, onChange, disabled = false, allowNone = false, pill = false, languages, counts, renderTrigger }: Props) {
  const options: readonly PackLanguage[] = languages ?? (allowNone ? PACK_LANGUAGE_CHOICES : PACK_LANGUAGES);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const closeLabel = triLang(lang, {
    ru: 'Закрыть выбор языка наборов', uk: 'Закрити вибір мови наборів', en: 'Close pack language picker',
    es: 'Cerrar selector de idioma de sets', 'pt-BR': 'Fechar seletor de idioma', vi: 'Đóng bộ chọn ngôn ngữ',
    id: 'Tutup pemilih bahasa', tr: 'Paket dili seçicisini kapat', pl: 'Zamknij wybór języka zestawu',
  });

  useEffect(() => {
    const duration = reduceMotion ? 0 : visible ? LUM.contentMs : LUM.exitMs;
    if (visible) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => { if (finished && !visible) setMounted(false); });
    return () => animation.stop();
  }, [progress, reduceMotion, visible]);

  const open = () => {
    if (!disabled) setVisible(true);
  };
  const close = () => setVisible(false);

  return (
    <>
      {renderTrigger ? renderTrigger(open, visible) : <Pressable
        testID="pack-language-picker"
        accessibilityRole="button"
        accessibilityLabel={`${packLanguagePickerHint(lang)}: ${packLanguageLabel(value, lang)}`}
        accessibilityState={{ expanded: visible, disabled }}
        disabled={disabled}
        onPress={open}
        hitSlop={4}
        style={({ pressed }) => [styles.trigger, pill ? styles.triggerPill : null, {
          backgroundColor: visible ? g.selected : pill ? g.hairlineSoft : g.opaqueControl,
          opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
        }]}
      >
        {pill && value !== NO_PACK_LANGUAGE ? null : <FlagMark code={value} width={24} height={16} color={g.text} />}
        {value === NO_PACK_LANGUAGE ? null : (
          <Text style={[styles.code, { color: g.text }]}>{PACK_LANGUAGE_META[value].shortName}</Text>
        )}
        <Ionicons name="chevron-down" size={pill ? 16 : 14} color={pill ? g.text : g.secondary} />
      </Pressable>}

      <Modal
        visible={mounted || visible}
        transparent
        animationType="none"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={[styles.overlay, { paddingTop: insets.top + 56 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            style={StyleSheet.absoluteFill}
            onPress={close}
          />
          <Animated.View style={[styles.sheet, {
            backgroundColor: g.opaqueSheet,
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }, {
              scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
            }],
          }]}>
            {options.map((code) => {
              const item = PACK_LANGUAGE_META[code];
              const selected = item.code === value;
              return (
                <Pressable
                  key={item.code}
                  accessibilityRole="button"
                  accessibilityLabel={packLanguageLabel(item.code, lang)}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(item.code);
                    close();
                  }}
                  style={({ pressed }) => [styles.option, {
                    backgroundColor: selected ? g.opaqueControl : pressed ? g.selected : 'transparent',
                  }]}
                >
                  <FlagMark code={item.code} width={26} height={17} color={g.text} />
                  <Text style={[styles.optionText, { color: g.text }]}>{packLanguageLabel(item.code, lang)}</Text>
                  {counts && typeof counts[item.code] === 'number' ? (
                    <Text style={[styles.optionCount, { color: g.secondary }]}>{counts[item.code]}</Text>
                  ) : null}
                  {selected ?<Ionicons name="checkmark" size={18} color={g.text} /> : null}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 64,
    height: 36,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  triggerPill: { minWidth: 0, minHeight: 40, paddingLeft: 14, paddingRight: 14, borderRadius: 20, gap: 6 },
  code: { fontSize: 16, fontWeight: '700' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', // theme-exempt: затемнение под выпадающим списком — тёмный скрим в любой теме
  },
  sheet: {
    width: 230,
    padding: 6,
    borderRadius: 18,
  },
  option: { minHeight: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  optionText: { flex: 1, fontSize: 16, fontWeight: '600' },
  optionCount: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
