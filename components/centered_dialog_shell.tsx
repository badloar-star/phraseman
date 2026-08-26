/**
 * CenteredDialogShell — центрированное окно-диалог поверх экрана.
 *
 * зачем: владелец (2026-07-26) — «Добавить друга» не должен быть нижним шитом,
 * который ездит вместе с клавиатурой. Нужно маленькое окошко ПОСРЕДИ экрана,
 * которое появляется, а клавиатура выезжает под ним и НИКАК его не двигает.
 * Поэтому здесь принципиально нет KeyboardAvoidingView и нет подписки на
 * события клавиатуры — геометрия окна не зависит от неё вообще.
 *
 * Отличие от ReferralSheetShell (нижняя шторка): тот каркас закреплён снизу и
 * растит нижний паддинг под клавиатуру. Его трогать нельзя — на нём живут шиты
 * рефералки, поэтому центрированный вариант вынесен в отдельный компонент.
 *
 * Токены темы; без обводок (разделяем тоном); контент скроллится внутри окна,
 * так что появление карточки результата не ломает центрирование.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapticTap } from '../hooks/use-haptics';
import { useTheme } from './ThemeContext';
import TonalSurface from './TonalSurface';

const DIALOG_WIDTH_RATIO = 0.92;
const DIALOG_MAX_WIDTH = 460;
/** Окно не должно упираться в края даже при открытой клавиатуре и мелком экране. */
const DIALOG_MAX_HEIGHT_RATIO = 0.74;

interface CenteredDialogShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  testID?: string;
  children: React.ReactNode;
}

export default function CenteredDialogShell({
  visible,
  onClose,
  title,
  closeLabel,
  testID,
  children,
}: CenteredDialogShellProps) {
  const { theme: t, f } = useTheme();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const dialogO = useSharedValue(0);
  const dialogScale = useSharedValue(0.94);

  useEffect(() => {
    if (!visible) return;
    // Появление: короткий fade + мягкий scale-up. Без bounce — окно «проявляется»,
    // а не прыгает; ease-out кривая как у системных алертов.
    backdropO.value = withTiming(1, { duration: 180, easing: REasing.out(REasing.cubic) });
    dialogO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    dialogScale.value = 0.94;
    dialogScale.value = withTiming(1, { duration: 260, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, dialogO, dialogScale]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;

  const dismissDialog = useCallback(() => {
    hapticTap();
    backdropO.value = withTiming(0, { duration: 160 });
    dialogScale.value = withTiming(0.96, { duration: 160, easing: REasing.in(REasing.cubic) });
    dialogO.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(handleCloseRef.current)();
    });
  }, [backdropO, dialogO, dialogScale]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropO.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: dialogO.value,
    transform: [{ scale: dialogScale.value }],
  }));

  const dialogWidth = Math.min(viewportWidth * DIALOG_WIDTH_RATIO, DIALOG_MAX_WIDTH);
  const dialogMaxHeight = viewportHeight * DIALOG_MAX_HEIGHT_RATIO;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissDialog}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissDialog} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        {/* pointerEvents="box-none" — тап мимо окна доходит до подложки и закрывает его. */}
        <View style={styles.centerer} pointerEvents="box-none">
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={[
              styles.dialog,
              { backgroundColor: t.bgCard, width: dialogWidth, maxHeight: dialogMaxHeight },
              dialogStyle,
            ]}
          >
            <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
            <View style={styles.header}>
              <Text style={{ color: t.textPrimary, fontSize: f.h3, fontWeight: '700', flex: 1 }}>
                {title}
              </Text>
              <Pressable
                onPress={dismissDialog}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                style={({ pressed }) => [styles.closeBtn, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="close" size={20} color={t.textMuted} />
              </Pressable>
            </View>
            {/* зачем: карточка найденного друга заметно растит контент. Скроллим
                ВНУТРИ окна, чтобы окно осталось по центру и не подстраивалось
                под клавиатуру. */}
            <ScrollView decelerationRate="fast"
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  centerer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 2,
  },
});
