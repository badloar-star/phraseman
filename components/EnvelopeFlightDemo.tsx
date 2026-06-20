// Имитация анимации «прилёт письма» для QA-панели админки.
// Повторяет ту же анимацию конверта, что AppMessagesInbox показывает при новом
// сообщении (полёт в иконку + подскок иконки + звук), но автономно и в рамках
// небольшой превью-зоны — чтобы можно было проверить анимацию по кнопке, не
// дожидаясь реального сообщения. Не зависит от инбокса и реальных сообщений.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessageReceivedCue } from '../hooks/use-message-received-cue';

const ENV_W = 88;
const ENV_H = 60;

interface EnvelopeFlightDemoProps {
  /** Меняй это число (например счётчиком нажатий), чтобы запустить анимацию заново. */
  trigger: number;
  /** Высота превью-зоны. */
  height?: number;
}

/**
 * Проигрывает анимацию прилёта конверта в иконку каждый раз, когда меняется
 * `trigger`. Защищён замком: повторный запуск, пока конверт ещё летит,
 * игнорируется — ровно как в боевом инбоксе.
 */
export default function EnvelopeFlightDemo({ trigger, height = 160 }: EnvelopeFlightDemoProps) {
  const { playMessageReceived } = useMessageReceivedCue();
  const flyAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const [flying, setFlying] = useState(false);
  const inProgressRef = useRef(false);
  const bounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // размеры превью-зоны для расчёта траектории
  const boxRef = useRef<{ w: number; h: number }>({ w: 280, h: height });

  const play = useCallback(() => {
    if (inProgressRef.current) return; // уже летит — не дублируем
    inProgressRef.current = true;
    flyAnim.setValue(0);
    setFlying(true);
    Animated.timing(flyAnim, {
      toValue: 1,
      duration: 720,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setFlying(false);
    });
    if (bounceTimer.current) clearTimeout(bounceTimer.current);
    bounceTimer.current = setTimeout(() => {
      bounceTimer.current = null;
      playMessageReceived();
      Animated.sequence([
        Animated.spring(iconScale, { toValue: 1.28, useNativeDriver: true, friction: 4, tension: 160 }),
        Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
      ]).start(() => {
        inProgressRef.current = false;
      });
    }, 560);
  }, [flyAnim, iconScale, playMessageReceived]);

  // запуск при каждом изменении trigger (пропускаем первый рендер trigger=0)
  useEffect(() => {
    if (trigger > 0) play();
  }, [trigger, play]);

  useEffect(() => () => {
    if (bounceTimer.current) clearTimeout(bounceTimer.current);
    inProgressRef.current = false;
  }, []);

  // целевая точка — правый верхний угол зоны (где «иконка»)
  const box = boxRef.current;
  const targetX = box.w - 34;
  const targetY = 28;
  const startX = box.w / 2;
  const startY = box.h * 0.62;

  const translateX = flyAnim.interpolate({ inputRange: [0, 1], outputRange: [startX - ENV_W / 2, targetX - ENV_W / 2] });
  const translateY = flyAnim.interpolate({ inputRange: [0, 1], outputRange: [startY - ENV_H / 2, targetY - ENV_H / 2] });
  const scale = flyAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.42, 0.08] });
  const rotate = flyAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '-8deg', '14deg'] });
  const skewX = flyAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['0deg', '6deg', '-18deg'] });
  const scaleY = flyAnim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.86, 0.5] });
  const opacity = flyAnim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View
      style={[styles.zone, { height }]}
      onLayout={(e) => {
        boxRef.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
      }}
    >
      {/* «иконка письма» в углу — подпрыгивает в момент прилёта */}
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
        <Ionicons name="mail" size={22} color="#E2C36B" />
      </Animated.View>

      {/* летящий конверт */}
      {flying ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: ENV_W,
            height: ENV_H,
            opacity,
            transform: [{ translateX }, { translateY }, { scale }, { scaleY }, { rotate }, { skewX }],
          }}
        >
          <View style={styles.envelope}>
            <View style={styles.envelopeFlap} />
            <View style={styles.envelopeShine} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    margin: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(226,195,107,0.35)',
    backgroundColor: 'rgba(20,17,15,0.6)',
    overflow: 'hidden',
  },
  iconWrap: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226,195,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226,195,107,0.4)',
  },
  envelope: {
    flex: 1,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2C36B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  envelopeFlap: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    height: 0,
    borderLeftWidth: 45,
    borderRightWidth: 45,
    borderTopWidth: 33,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F2E2B0',
  },
  envelopeShine: {
    position: 'absolute',
    top: 5,
    left: 6,
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-18deg' }],
  },
});
