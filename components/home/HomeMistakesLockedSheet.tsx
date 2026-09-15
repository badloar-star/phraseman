import React, { memo, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import type { Lang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { mistakesLockedCopy } from '../../app/mistakes_locked_copy';
import { useTheme } from '../ThemeContext';

/**
 * Небольшой лист «разбирать пока нечего» для закрытого раздела ошибок.
 *
 * зачем (владелец 2026-09-15): «при нажатии небольшой текст». Это сообщение, а
 * не выбор, поэтому берётся не ThemedConfirmModal с двумя кнопками, а один
 * лист с единственным «Понятно»: вторая кнопка здесь была бы ложным выбором.
 */

type Props = {
  visible: boolean;
  lang: Lang;
  /** Сколько ошибок уже накоплено — от этого зависит текст. */
  count: number;
  onClose: () => void;
};

function HomeMistakesLockedSheet({ visible, lang, count, onClose }: Props) {
  const { theme: t, f } = useTheme();
  const copy = useMemo(() => mistakesLockedCopy(lang, count), [count, lang]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={copy.action} onPress={onClose} />
        <Animated.View
          entering={FadeInDown.duration(220).springify().damping(18)}
          exiting={FadeOut.duration(140)}
          style={[styles.sheet, { backgroundColor: t.bgCard }]}
        >
          <Text testID="mistakes-locked-title" style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>
            {copy.title}
          </Text>
          <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>{copy.body}</Text>
          <Pressable
            testID="mistakes-locked-close"
            accessibilityRole="button"
            onPress={() => { hapticTap(); onClose(); }}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: t.accent, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>{copy.action}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34, gap: 12 },
  title: { fontWeight: '900', letterSpacing: -0.4 },
  body: { fontWeight: '600', lineHeight: 23 },
  action: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
});

export default memo(HomeMistakesLockedSheet);
