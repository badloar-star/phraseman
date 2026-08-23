import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import EnergyCostBadge from '../EnergyCostBadge';
import {
  mistakePracticeLengthOptions,
  type MistakePracticeLength,
} from '../../modules/mistake-practice/session';
import HybridSheetShell from '../modal_fx/HybridSheetShell';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';

type Props = {
  visible: boolean;
  readyCount: number;
  onClose: () => void;
  onStart: (length: MistakePracticeLength) => void;
};

const optionLabel = (id: MistakePracticeLength, allLabel: string): string =>
  id === 'all' ? allLabel : id;

export default function MistakePracticeSetupSheet({
  visible,
  readyCount,
  onClose,
  onStart,
}: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const copy = useMemo(() => triLang(lang, {
    ru: { all: 'Все', closeSheet: 'Закрыть настройку ошибок', title: 'Ошибки', close: 'Закрыть', length: 'Длина сессии', start: 'Начать' },
    uk: { all: 'Усі', closeSheet: 'Закрити налаштування помилок', title: 'Помилки', close: 'Закрити', length: 'Тривалість сесії', start: 'Почати' },
    es: { all: 'Todas', closeSheet: 'Cerrar la configuración de errores', title: 'Errores', close: 'Cerrar', length: 'Duración de la sesión', start: 'Empezar' },
  }), [lang]);
  const [selected, setSelected] = useState<MistakePracticeLength>('5');
  const options = useMemo(() => mistakePracticeLengthOptions(readyCount), [readyCount]);

  useEffect(() => {
    if (!visible) return;
    setSelected('5');
  }, [visible]);

  useEffect(() => {
    if (!visible || options.some((option) => option.id === selected && option.enabled)) return;
    setSelected(options.find((option) => option.enabled)?.id ?? '5');
  }, [options, selected, visible]);

  const selectedOption = options.find((option) => option.id === selected);
  const canStart = !!selectedOption?.enabled;

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={copy.closeSheet}
      testID="mistake-practice-setup-sheet"
      glowColor={t.wrong}
    >
      <View style={styles.content}>
        <View style={styles.headingRow}>
          <View style={[styles.icon, { backgroundColor: t.wrongBg }]}>
            <Ionicons name="refresh-circle-outline" size={25} color={t.wrong} />
          </View>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>{copy.title}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={onClose}
            hitSlop={10}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
          </Pressable>
        </View>

        <View style={styles.lengthRow}>
          {options.map((option) => {
            const active = option.id === selected;
            return (
              <Pressable
                key={option.id}
                testID={`mistake-practice-length-${option.id}`}
                accessibilityRole="radio"
                accessibilityLabel={`${copy.length}: ${optionLabel(option.id, copy.all)}`}
                accessibilityState={{ disabled: !option.enabled, checked: active }}
                disabled={!option.enabled}
                onPress={() => {
                  void hapticTap();
                  setSelected(option.id);
                }}
                style={[
                  styles.lengthButton,
                  {
                    backgroundColor: active && option.enabled ? t.accent : t.bgSurface2,
                    opacity: option.enabled ? 1 : 0.38,
                  },
                ]}
              >
                <Text style={{ color: active && option.enabled ? t.correctText : t.textPrimary, fontSize: f.sub, fontWeight: '700' }}>
                  {optionLabel(option.id, copy.all)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.startWrap}>
          <Pressable
            testID="mistake-practice-start"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canStart }}
            disabled={!canStart}
            onPress={() => {
              void hapticTap();
              onStart(selected);
            }}
            style={[styles.start, { backgroundColor: canStart ? t.accent : t.bgSurface2 }]}
          >
            <Text style={{ color: canStart ? t.correctText : t.textGhost, fontSize: f.body, fontWeight: '700' }}>{copy.start}</Text>
          </Pressable>
          {/* Цена входа видна до нажатия (владелец 2026-08-23). */}
          {canStart ? <EnergyCostBadge testID="mistake-practice-energy-cost" /> : null}
        </View>
      </View>
    </HybridSheetShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 16 },
  // Якорь для углового бейджа «−1 ⚡».
  startWrap: { position: 'relative' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingCopy: { flex: 1, gap: 2 },
  icon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lengthRow: { flexDirection: 'row', gap: 8 },
  lengthButton: { minWidth: 54, flexGrow: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  start: { minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
