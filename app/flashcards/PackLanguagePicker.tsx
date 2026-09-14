import Ionicons from '@expo/vector-icons/Ionicons';
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
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LUM } from '../../constants/motionHybrid';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import {
  PACK_LANGUAGES,
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
};

export default function PackLanguagePicker({ lang, t, value, onChange, disabled = false }: Props) {
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
      <Pressable
        testID="pack-language-picker"
        accessibilityRole="button"
        accessibilityLabel={`${packLanguagePickerHint(lang)}: ${packLanguageLabel(value)}`}
        accessibilityState={{ expanded: visible, disabled }}
        disabled={disabled}
        onPress={open}
        style={({ pressed }) => [styles.trigger, {
          borderColor: visible ? t.accent : t.border,
          backgroundColor: visible ? t.accentBg : t.bgSurface,
          opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
        }]}
      >
        <Text style={styles.flag}>{PACK_LANGUAGE_META[value].flagGlyph}</Text>
        <Text style={[styles.code, { color: t.textPrimary }]}>{PACK_LANGUAGE_META[value].shortName}</Text>
        <Ionicons name="chevron-down" size={12} color={t.textSecond} />
      </Pressable>

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
            backgroundColor: t.bgSurface,
            borderColor: t.border,
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }, {
              scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
            }],
          }]}>
            <Text style={[styles.heading, { color: t.textMuted }]}>{packLanguagePickerHint(lang)}</Text>
            {PACK_LANGUAGES.map((code) => {
              const item = PACK_LANGUAGE_META[code];
              const selected = item.code === value;
              return (
                <Pressable
                  key={item.code}
                  accessibilityRole="button"
                  accessibilityLabel={packLanguageLabel(item.code)}
                  accessibilityState={{ selected: item.code === value }}
                  onPress={() => {
                    onChange(item.code);
                    close();
                  }}
                  style={({ pressed }) => [styles.option, {
                    backgroundColor: selected ? t.accentBg : pressed ? `${t.border}55` : 'transparent',
                    borderColor: selected ? `${t.accent}88` : 'transparent',
                  }]}
                >
                  <Text style={styles.optionFlag}>{item.flagGlyph}</Text>
                  <Text style={[styles.optionText, { color: t.textPrimary }]}>{item.nativeName}</Text>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selected ? t.accent : t.textGhost}
                  />
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
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  flag: { fontSize: 17, lineHeight: 20 },
  code: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  sheet: {
    width: 220,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heading: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 6, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  option: { minHeight: 44, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 9 },
  optionFlag: { fontSize: 19, width: 24 },
  optionText: { flex: 1, fontSize: 14, fontWeight: '800' },
});
