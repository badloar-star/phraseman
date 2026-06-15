// ════════════════════════════════════════════════════════════════════════════
// MaintenanceGate.tsx — режим обслuживания, управляемый из «Пульта» (remote_config).
//
// Два независимых режима (флаги remote_config/app.bools, читаются живьём через
// remote_flags + событие remote_config_changed):
//   • maintenance_block  — ЖЁСТКИЙ полноэкранный блок (приложение недоступно).
//   • maintenance_banner — мягкая плашка сверху (приложение работает).
// Текст берётся из remote_config/app.texts (ru/uk/es) с дефолтом-фоллбэком.
//
// Жёсткий блок переживает офлайн: remote_config кэшируется в AsyncStorage и
// применяется до сети, поэтому если админ включил блок — он покажется и без сети.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
import { isMaintenanceBlock, isMaintenanceBanner, getMaintenanceText } from '../app/remote_flags';

interface MaintenanceState {
  block: boolean;
  banner: boolean;
  text: string;
}

function readState(lang: string): MaintenanceState {
  return {
    block: isMaintenanceBlock(),
    banner: isMaintenanceBanner(),
    text: getMaintenanceText(lang),
  };
}

export default function MaintenanceGate() {
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<MaintenanceState>(() => readState(lang));

  // Перечитываем при каждом снапшоте remote_config (админ включил/выключил живьём)
  // и при смене языка.
  useEffect(() => {
    setState(readState(lang));
    const sub = onAppEvent('remote_config_changed', () => setState(readState(lang)));
    return () => sub.remove();
  }, [lang]);

  if (!state.block && !state.banner) return null;

  const defaultText = triLang(lang as Lang, {
    ru: 'Идут технические работы. Скоро вернёмся.',
    uk: 'Тривають технічні роботи. Скоро повернемось.',
    es: 'Estamos en mantenimiento. Volvemos pronto.',
    'pt-BR': 'Estamos em manutenção. Voltamos em breve.',
    vi: 'Đang bảo trì. Chúng tôi sẽ sớm trở lại.',
    id: 'Sedang pemeliharaan. Kami segera kembali.',
    tr: 'Bakım çalışması yapılıyor. Kısa süre içinde döneceğiz.',
    pl: 'Trwają prace techniczne. Wkrótce wrócimy.',
  });
  const message = state.text && state.text.trim() ? state.text.trim() : defaultText;

  // ЖЁСТКИЙ блок имеет приоритет над баннером.
  if (state.block) {
    return (
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0b0b12',
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 28,
          zIndex: 9999, elevation: 9999,
        }}
      >
        <Text style={{ fontSize: 44, marginBottom: 18 }}>🛠️</Text>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
          {triLang(lang as Lang, {
            ru: 'Технические работы', uk: 'Технічні роботи', es: 'Mantenimiento',
            'pt-BR': 'Manutenção', vi: 'Bảo trì', id: 'Pemeliharaan', tr: 'Bakım', pl: 'Prace techniczne',
          })}
        </Text>
        <Text style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 420 }}>
          {message}
        </Text>
      </View>
    );
  }

  // Мягкий баннер сверху.
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9998, elevation: 9998 }}
    >
      <View
        style={{
          marginTop: insets.top,
          backgroundColor: '#7c2d12',
          borderBottomWidth: 1, borderBottomColor: '#9a3412',
          paddingHorizontal: 16, paddingVertical: 10,
        }}
      >
        <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
          <Text style={{ color: '#fed7aa', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
            🛠️ {message}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
