// ════════════════════════════════════════════════════════════════════════════
// ForceUpdateGate.tsx — принудительное обновление, управляемое из «Пульта».
//
// Когда в remote_config включён force_update_enabled И текущая версия приложения
// строго ниже min_app_version — показываем полноэкранный блок «обнови приложение»
// с кнопкой в стор. Решение считается чистой функцией shouldForceUpdate
// (remote_flags), версия берётся из expo-constants. По образцу MaintenanceGate:
// перечитываем на каждый снапшот remote_config (живьём, без релиза).
//
// Безопасность-страховка: при пустой/мусорной min_app_version блок НЕ
// показывается (см. shouldForceUpdate/isVersionBelow) — нельзя случайно запереть
// всех. Дефолт флага — выключено.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { View, Text, Platform, Pressable, Linking } from 'react-native';
import Constants from 'expo-constants';

import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
import {
  isForceUpdateEnabled,
  getMinAppVersion,
  getStoreUrlIos,
  getStoreUrlAndroid,
  shouldForceUpdate,
} from '../app/remote_flags';

/** Текущая версия приложения из expo-config (fallback на nativeAppVersion). */
function currentAppVersion(): string {
  return String(
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '',
  );
}

/** Ссылка стора для текущей платформы. */
function storeUrlForPlatform(): string {
  return String((Platform.OS === 'ios' ? getStoreUrlIos() : getStoreUrlAndroid()) || '').trim();
}

function readShouldBlock(): boolean {
  // Защита от наглухо-блока: если для текущей платформы НЕ задана ссылка на стор,
  // блокирующий экран был бы без кнопки выхода (нечем обновиться) → не блокируем.
  // Это страхует от ошибки админа (включил force-update, но забыл ссылку).
  if (!storeUrlForPlatform()) return false;
  return shouldForceUpdate({
    enabled: isForceUpdateEnabled(),
    currentVersion: currentAppVersion(),
    minVersion: getMinAppVersion(),
  });
}

export default function ForceUpdateGate() {
  const { lang } = useLang();
  const [blocked, setBlocked] = useState<boolean>(() => readShouldBlock());

  // Перечитываем при каждом снапшоте remote_config (админ включил/выключил живьём).
  useEffect(() => {
    setBlocked(readShouldBlock());
    const sub = onAppEvent('remote_config_changed', () => setBlocked(readShouldBlock()));
    return () => sub.remove();
  }, []);

  if (!blocked) return null;

  const openStore = () => {
    const url = Platform.OS === 'ios' ? getStoreUrlIos() : getStoreUrlAndroid();
    if (url && url.trim()) {
      void Linking.openURL(url.trim()).catch(() => { /* ссылка кривая — игнор */ });
    }
  };
  const hasUrl = (Platform.OS === 'ios' ? getStoreUrlIos() : getStoreUrlAndroid()).trim() !== '';

  return (
    <View
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0b0b12',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 28,
        zIndex: 10000, elevation: 10000,
      }}
    >
      <Text style={{ fontSize: 44, marginBottom: 18 }}>🚀</Text>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
        {triLang(lang as Lang, {
          ru: 'Нужно обновить приложение', uk: 'Потрібно оновити застосунок', es: 'Hay que actualizar la app',
          'pt-BR': 'Precisa atualizar o app', vi: 'Cần cập nhật ứng dụng', id: 'Perlu memperbarui aplikasi',
          tr: 'Uygulamayı güncellemen gerek', pl: 'Trzeba zaktualizować aplikację',
        })}
      </Text>
      <Text style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 420, marginBottom: 22 }}>
        {triLang(lang as Lang, {
          ru: 'Вышла новая версия с важными улучшениями. Обнови, чтобы продолжить.',
          uk: 'Вийшла нова версія з важливими покращеннями. Онови, щоб продовжити.',
          es: 'Hay una nueva versión con mejoras importantes. Actualiza para continuar.',
          'pt-BR': 'Saiu uma nova versão com melhorias importantes. Atualize para continuar.',
          vi: 'Đã có phiên bản mới với cải tiến quan trọng. Hãy cập nhật để tiếp tục.',
          id: 'Ada versi baru dengan peningkatan penting. Perbarui untuk melanjutkan.',
          tr: 'Önemli iyileştirmelerle yeni sürüm çıktı. Devam etmek için güncelle.',
          pl: 'Jest nowa wersja z ważnymi ulepszeniami. Zaktualizuj, aby kontynuować.',
        })}
      </Text>
      {hasUrl && (
        <Pressable
          onPress={openStore}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#4f46e5' : '#6366f1',
            paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
          })}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
            {triLang(lang as Lang, {
              ru: 'Обновить', uk: 'Оновити', es: 'Actualizar', 'pt-BR': 'Atualizar',
              vi: 'Cập nhật', id: 'Perbarui', tr: 'Güncelle', pl: 'Zaktualizuj',
            })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
