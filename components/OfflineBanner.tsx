// Глобальный баннер «Нет соединения» — тонкая плашка под статус-баром.
// Приложение раньше НИКАК не показывало офлайн: экраны молча отдавали
// устаревший кэш, а действия падали с генерик-«попробуй ещё раз».
// Баннер появляется через пару секунд офлайна (probe в net_status) и
// исчезает сразу при возврате сети.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeNetStatus } from '../app/net_status';

const L = (lang: string, map: Record<string, string>): string =>
  map[lang] ?? map.ru ?? Object.values(map)[0] ?? '';

// lang приходит пропом (не из LangContext): баннер монтируется в _layout,
// где язык уже есть, — так он не зависит от места в дереве провайдеров.
export default function OfflineBanner({ lang }: { lang: string }) {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = subscribeNetStatus((online) => {
      setOffline(!online);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: offline ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [offline, opacity]);

  if (!offline) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { top: insets.top + 4, opacity }]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {L(lang, {
          ru: '📡 Нет соединения — прогресс сохраняется на устройстве',
          uk: '📡 Немає з’єднання — прогрес зберігається на пристрої',
          es: '📡 Sin conexión: tu progreso se guarda en el dispositivo',
          'pt-BR': '📡 Sem conexão — seu progresso fica salvo no aparelho',
          vi: '📡 Mất kết nối — tiến độ được lưu trên thiết bị',
          id: '📡 Tidak ada koneksi — progres tersimpan di perangkat',
          tr: '📡 Bağlantı yok — ilerlemen cihazda saklanıyor',
          pl: '📡 Brak połączenia — postęp zapisuje się na urządzeniu',
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  text: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12.5,
    fontWeight: '600',
  },
});
