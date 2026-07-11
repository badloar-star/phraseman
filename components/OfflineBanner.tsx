// Глобальный баннер «Нет соединения» — тонкая плашка под статус-баром.
// Приложение раньше НИКАК не показывало офлайн: экраны молча отдавали
// устаревший кэш, а действия падали с генерик-«попробуй ещё раз».
// Баннер появляется через пару секунд офлайна (probe в net_status).
//
// Поведение (по просьбе пользователя):
//  - короткий текст «Нет соединения» (без «прогресс сохраняется…»);
//  - его можно смахнуть вверх, чтобы скрыть;
//  - он сам исчезает через 10 секунд.
// Смахивание/авто-скрытие держатся до возврата сети: при повторном офлайне
// (online→offline) баннер показывается заново.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeNetStatus } from '../app/net_status';

const AUTO_HIDE_MS = 10_000;

const L = (lang: string, map: Record<string, string>): string =>
  map[lang] ?? map.ru ?? Object.values(map)[0] ?? '';

// lang приходит пропом (не из LangContext): баннер монтируется в _layout,
// где язык уже есть, — так он не зависит от места в дереве провайдеров.
export default function OfflineBanner({ lang }: { lang: string }) {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  // Локально скрыт (смахнули или прошло 10с). Сбрасывается при возврате сети.
  const [dismissed, setDismissed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = offline && !dismissed;

  useEffect(() => {
    const unsubscribe = subscribeNetStatus((online) => {
      setOffline(!online);
      // Вернулась сеть — сбрасываем «скрытость», чтобы следующий офлайн показался.
      if (online) setDismissed(false);
    });
    return unsubscribe;
  }, []);

  // Плавно смахнуть/скрыть баннер.
  const hide = useRef(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -80, duration: 180, useNativeDriver: true }),
    ]).start(() => setDismissed(true));
  }).current;

  // Жест «смахнуть вверх» для закрытия.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        // Тянем только вверх (dy < 0), вниз не уводим.
        translateY.setValue(Math.min(0, g.dy));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -24) {
          hide();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (visible) {
      translateY.setValue(0);
      // Авто-скрытие через 10 секунд.
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
      autoHideRef.current = setTimeout(() => { hide(); }, AUTO_HIDE_MS);
    }
    return () => {
      if (autoHideRef.current) {
        clearTimeout(autoHideRef.current);
        autoHideRef.current = null;
      }
    };
  }, [visible, opacity, translateY, hide]);

  if (!visible) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.banner, { top: insets.top + 4, opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {L(lang, {
          ru: '📡 Нет соединения',
          uk: '📡 Немає з’єднання',
          es: '📡 Sin conexión',
          'pt-BR': '📡 Sem conexão',
          vi: '📡 Mất kết nối',
          id: '📡 Tidak ada koneksi',
          tr: '📡 Bağlantı yok',
          pl: '📡 Brak połączenia',
        })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 12,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(30, 30, 36, 0.92)',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  text: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
