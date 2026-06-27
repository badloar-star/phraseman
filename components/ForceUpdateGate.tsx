import React, { useEffect, useState } from 'react';
import { View, Text, Platform, Pressable, Linking } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { onAppEvent } from '../app/events';
import { getStableId } from '../app/stable_id';
import {
  getManualUpdateBody,
  getManualUpdateCampaignId,
  getManualUpdateCta,
  getManualUpdateMode,
  getManualUpdateTargetBuild,
  getManualUpdateTitle,
  getMinAppVersion,
  getStoreUrlAndroid,
  getStoreUrlIos,
  isFlagEnabledForUser,
  shouldForceUpdate,
  shouldShowManualUpdate,
} from '../app/remote_flags';
import {
  campaignDismissalKey,
  isCampaignDismissed,
  markCampaignDismissed,
} from '../app/campaign_dismissals';

type GateMode = 'force' | 'optional';

interface GateState {
  source: 'legacy-force' | 'manual';
  mode: GateMode;
  campaignId: string;
  title: string;
  body: string;
  cta: string;
  storeUrl: string;
}

function currentAppVersion(): string {
  return String(Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '');
}

function currentNativeBuildMarker(): string {
  const cfg = Constants.expoConfig as {
    ios?: { buildNumber?: string | number | null };
    android?: { versionCode?: string | number | null };
  } | null;
  const nativeBuild = (Constants as { nativeBuildVersion?: string | null }).nativeBuildVersion;
  if (Platform.OS === 'ios') {
    return String(cfg?.ios?.buildNumber ?? nativeBuild ?? currentAppVersion() ?? '');
  }
  if (Platform.OS === 'android') {
    return String(cfg?.android?.versionCode ?? nativeBuild ?? currentAppVersion() ?? '');
  }
  return String(nativeBuild ?? currentAppVersion() ?? '');
}

function currentComparableForTarget(targetBuild: string): string {
  return /^\d+$/.test(String(targetBuild || '').trim())
    ? currentNativeBuildMarker()
    : currentAppVersion();
}

function storeUrlForPlatform(): string {
  return String((Platform.OS === 'ios' ? getStoreUrlIos() : getStoreUrlAndroid()) || '').trim();
}

function defaultTitle(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Доступно обновление',
    uk: 'Доступне оновлення',
    es: 'Actualización disponible',
    'pt-BR': 'Atualização disponível',
    vi: 'Có bản cập nhật',
    id: 'Pembaruan tersedia',
    tr: 'Güncelleme var',
    pl: 'Dostępna aktualizacja',
  });
}

function defaultBody(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Мы улучшили приложение. Обновите его в сторе, чтобы продолжить с последней версией.',
    uk: 'Ми покращили застосунок. Оновіть його в сторі, щоб продовжити з останньою версією.',
    es: 'Hemos mejorado la app. Actualízala en la tienda para seguir con la última versión.',
    'pt-BR': 'Melhoramos o app. Atualize na loja para continuar com a versão mais recente.',
    vi: 'Chúng tôi đã cải thiện ứng dụng. Hãy cập nhật trong cửa hàng để dùng phiên bản mới nhất.',
    id: 'Kami telah meningkatkan aplikasi. Perbarui di store untuk memakai versi terbaru.',
    tr: 'Uygulamayı iyileştirdik. En güncel sürümle devam etmek için mağazadan güncelle.',
    pl: 'Ulepszyliśmy aplikację. Zaktualizuj ją w sklepie, aby korzystać z najnowszej wersji.',
  });
}

function defaultCta(lang: string): string {
  return triLang(lang as Lang, {
    ru: 'Обновить',
    uk: 'Оновити',
    es: 'Actualizar',
    'pt-BR': 'Atualizar',
    vi: 'Cập nhật',
    id: 'Perbarui',
    tr: 'Güncelle',
    pl: 'Zaktualizuj',
  });
}

function readLegacyForceState(lang: string, userId: string | null): GateState | null {
  const storeUrl = storeUrlForPlatform();
  if (!storeUrl) return null;
  const blocked = shouldForceUpdate({
    enabled: isFlagEnabledForUser('force_update_enabled', userId),
    currentVersion: currentAppVersion(),
    minVersion: getMinAppVersion(),
  });
  if (!blocked) return null;
  return {
    source: 'legacy-force',
    mode: 'force',
    campaignId: 'legacy-force-update',
    title: triLang(lang as Lang, {
      ru: 'Нужно обновить приложение',
      uk: 'Потрібно оновити застосунок',
      es: 'Hay que actualizar la app',
      'pt-BR': 'Precisa atualizar o app',
      vi: 'Cần cập nhật ứng dụng',
      id: 'Perlu memperbarui aplikasi',
      tr: 'Uygulamayı güncellemen gerek',
      pl: 'Trzeba zaktualizować aplikację',
    }),
    body: defaultBody(lang),
    cta: defaultCta(lang),
    storeUrl,
  };
}

async function readManualState(lang: string, userId: string | null): Promise<GateState | null> {
  const storeUrl = storeUrlForPlatform();
  if (!storeUrl) return null;

  const campaignId = getManualUpdateCampaignId().trim();
  const mode = getManualUpdateMode();
  const targetBuild = getManualUpdateTargetBuild().trim();
  const dismissedKey = campaignDismissalKey('manual_update', campaignId);
  const alreadySeen = mode === 'optional' ? await isCampaignDismissed(dismissedKey) : false;
  const shouldShow = shouldShowManualUpdate({
    enabled: isFlagEnabledForUser('manual_update_enabled', userId),
    campaignId,
    mode,
    currentBuild: currentComparableForTarget(targetBuild),
    targetBuild,
    seenCampaignIds: alreadySeen ? [campaignId] : [],
  });
  if (!shouldShow) return null;

  const title = getManualUpdateTitle(lang).trim() || defaultTitle(lang);
  const body = getManualUpdateBody(lang).trim() || defaultBody(lang);
  const cta = getManualUpdateCta(lang).trim() || defaultCta(lang);
  return { source: 'manual', mode, campaignId, title, body, cta, storeUrl };
}

async function readGateState(lang: string, userId: string | null): Promise<GateState | null> {
  const legacy = readLegacyForceState(lang, userId);
  if (legacy) return legacy;
  return readManualState(lang, userId);
}

export default function ForceUpdateGate() {
  const { lang } = useLang();
  const [userId, setUserId] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);

  useEffect(() => {
    let dead = false;
    void getStableId().then((id) => { if (!dead) setUserId(id || null); }).catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    let dead = false;
    const refresh = () => {
      void readGateState(lang, userId).then((next) => { if (!dead) setGate(next); });
    };
    refresh();
    const sub = onAppEvent('remote_config_changed', refresh);
    return () => { dead = true; sub.remove(); };
  }, [lang, userId]);

  // ВАЖНО: НЕ помечаем optional-кампанию «просмотренной» в момент показа.
  // Раньше тут стоял useEffect, который писал dismissal сразу при рендере модалки.
  // Это давало гонку: userId резолвится асинхронно (см. эффект выше) и повторный
  // refresh()/remote_config_changed читал уже записанный dismissal → модалка
  // пропадала сама, до того как пользователь нажал «Обновить» или «Закрыть».
  // Теперь dismissal пишется ТОЛЬКО по реальному действию пользователя
  // (closeOptional / openStore) — окно держится на экране, пока его не закроют.

  if (!gate) return null;

  const optional = gate.mode === 'optional';

  const closeOptional = () => {
    if (!optional) return;
    void markCampaignDismissed(campaignDismissalKey('manual_update', gate.campaignId));
    setGate(null);
  };

  const openStore = () => {
    if (optional) {
      void markCampaignDismissed(campaignDismissalKey('manual_update', gate.campaignId));
      setGate(null);
    }
    void Linking.openURL(gate.storeUrl).catch(() => {});
  };

  return (
    <View
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: optional ? 'rgba(11, 11, 18, 0.72)' : '#0b0b12',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 24,
        zIndex: 10000, elevation: 10000,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 22,
          backgroundColor: '#121826',
          borderWidth: 1,
          borderColor: '#26324a',
          padding: 22,
          shadowColor: '#000',
          shadowOpacity: 0.24,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
          elevation: 12,
        }}
      >
        {optional && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={triLang(lang as Lang, {
              ru: 'Закрыть',
              uk: 'Закрити',
              es: 'Cerrar',
              'pt-BR': 'Fechar',
              vi: 'Đóng',
              id: 'Tutup',
              tr: 'Kapat',
              pl: 'Zamknij',
            })}
            onPress={closeOptional}
            hitSlop={12}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1f2937',
            }}
          >
            <Ionicons name="close" size={20} color="#e5e7eb" />
          </Pressable>
        )}

        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            backgroundColor: '#eef2ff',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name="phone-portrait-outline" size={28} color="#4338ca" />
        </View>

        <Text style={{ color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '800', marginBottom: 10 }}>
          {gate.title}
        </Text>
        <Text style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginBottom: 18 }}>
          {gate.body}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={openStore}
          style={({ pressed }) => ({
            minHeight: 50,
            borderRadius: 14,
            backgroundColor: pressed ? '#4f46e5' : '#6366f1',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          })}
        >
          <Ionicons name="open-outline" size={19} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
            {gate.cta}
          </Text>
        </Pressable>

        {optional && (
          <Pressable
            accessibilityRole="button"
            onPress={closeOptional}
            style={({ pressed }) => ({
              minHeight: 44,
              marginTop: 10,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#26324a' : 'transparent',
            })}
          >
            <Text style={{ color: '#9ca3af', fontSize: 14, fontWeight: '700' }}>
              {triLang(lang as Lang, {
                ru: 'Позже',
                uk: 'Пізніше',
                es: 'Más tarde',
                'pt-BR': 'Mais tarde',
                vi: 'Để sau',
                id: 'Nanti',
                tr: 'Sonra',
                pl: 'Później',
              })}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
