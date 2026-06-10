/**
 * _admin_speaking_lab.tsx — DEV/QA превью режима «Устно» (Speaking Mode).
 *
 * Зачем: в обычном приложении SpeakingPanel показывает свои состояния только
 * по ходу реальной попытки (нужен premium, микрофон, удачное/неудачное
 * произношение, отказ в правах, устройство без распознавания). Половину
 * состояний руками не воспроизвести. Эта лаборатория открывает панель в
 * ЛЮБОМ из 8 статусов через dev-проп `previewStatus`, плюс показывает пейвол
 * `context='speaking'` (то, что видит free-пользователь при тапе на «Устно»).
 *
 * ВАЖНО: изолированное превью. Микрофон в превью-режиме инертен — права не
 * запрашиваются, нативный модуль распознавания не трогается. Открывается
 * только под ENABLE_DEV_TOOLS из админ-хаба настроек. В продакшн-сборке
 * экран вырезается (см. стаб admin_speaking_lab.tsx) и редиректит на главную.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEV_MODE } from './config';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import {
  SpeakingPanel,
  buildSpeakingPanelTheme,
  type SpeakingPanelStatus,
  type SpeakingPanelTheme,
} from '../components/SpeakingPanel';

interface PreviewRow {
  status: SpeakingPanelStatus;
  /** Russian label for the QA list (matches the changelog wording). */
  title: string;
  /** One-line description of what the user sees in this state. */
  desc: string;
  icon: string;
  /** Tint for the row icon so states read at a glance. */
  tint: string;
  /** Fixed score for the passed/failed previews. */
  score?: number;
}

const PREVIEW_ROWS: readonly PreviewRow[] = [
  {
    status: 'idle',
    title: 'idle — «Нажми на микрофон и произнеси фразу»',
    desc: 'Начальное состояние. Кнопка активна, фраза серая.',
    icon: 'ellipse-outline',
    tint: '#8A93A6',
  },
  {
    status: 'requesting',
    title: 'requesting — «Готовимся слушать…»',
    desc: 'Запрос прав микрофона. Спиннер, кнопка disabled.',
    icon: 'hourglass-outline',
    tint: '#E0A93C',
  },
  {
    status: 'listening',
    title: 'listening — «Слушаю… говори»',
    desc: 'Микрофон красный, эквалайзер активен, кнопка = «Остановить запись».',
    icon: 'mic',
    tint: '#E5484D',
  },
  {
    status: 'scoring',
    title: 'scoring — «Проверяю…»',
    desc: 'Идёт подсчёт совпадения. Спиннер, кнопка disabled.',
    icon: 'sync-outline',
    tint: '#E0A93C',
  },
  {
    status: 'passed',
    title: 'passed (≥90%) — «Отлично! Чисто сказано»',
    desc: 'Зелёный кружок со счётом 97% (анимация заполнения), подпись «нужно 90%», hapticSuccess, retry.',
    icon: 'checkmark-circle',
    tint: '#36E6A0',
    score: 97,
  },
  {
    status: 'failed',
    title: 'failed (<90%) — «Почти. Попробуй ещё раз»',
    desc: 'Красный кружок со счётом 45%, подпись «нужно 90%», retry-кнопка.',
    icon: 'close-circle',
    tint: '#E5484D',
    score: 45,
  },
  {
    status: 'no_speech',
    title: 'no_speech — «Не расслышал. Скажи чуть громче»',
    desc: 'Ничего не распознано (тишина/nomatch). Нейтральный текст, retry-кнопка. НЕ провал 0%.',
    icon: 'volume-mute-outline',
    tint: '#8A93A6',
  },
  {
    status: 'denied',
    title: 'denied — «Нужен доступ к микрофону. Включи в настройках»',
    desc: 'Пользователь запретил микрофон. Кнопка disabled.',
    icon: 'lock-closed',
    tint: '#E5484D',
  },
  {
    status: 'unavailable',
    title: 'unavailable — «Режим говорения недоступен на этом устройстве»',
    desc: 'Нет expo-speech-recognition. Кнопка disabled.',
    icon: 'warning',
    tint: '#E0A93C',
  },
];

const PREVIEW_TARGET = 'I would like a cup of coffee, please';

export default function AdminSpeakingLab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { lang } = useLang();

  const [preview, setPreview] = useState<PreviewRow | null>(null);

  // Defence-in-depth: hidden from the menu in prod, but block deep links too.
  useEffect(() => {
    if (!__DEV__ && !DEV_MODE) {
      router.replace('/(tabs)/settings' as any);
    }
  }, [router]);

  const panelTheme = useMemo<SpeakingPanelTheme>(() => buildSpeakingPanelTheme(t), [t]);

  const openPreview = (row: PreviewRow) => {
    hapticTap();
    setPreview(row);
  };

  const openSpeakingPaywall = () => {
    hapticTap();
    router.push({
      pathname: '/premium_modal',
      params: { context: 'speaking', source: 'admin_speaking_lab' },
    } as any);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          testID="speaking-lab-back"
        >
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Speaking Mode — все статусы</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: t.textMuted }]}>
          Тапни статус — откроется реальная панель SpeakingPanel в этом состоянии. Микрофон в превью
          не трогается (права не запрашиваются).
        </Text>

        {/* Paywall — что видит free-пользователь */}
        <TouchableOpacity
          onPress={openSpeakingPaywall}
          activeOpacity={0.8}
          testID="speaking-lab-paywall"
          style={[styles.paywallBtn, { backgroundColor: t.bgCard, borderColor: t.accent }]}
        >
          <Ionicons name="diamond-outline" size={22} color={t.accent} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: t.textPrimary }]}>
              Пейвол context=&apos;speaking&apos;
            </Text>
            <Text style={[styles.rowDesc, { color: t.textMuted }]}>
              Что видит free-пользователь при тапе на «Устно».
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: t.textSecond }]}>СТАТУСЫ ПАНЕЛИ</Text>

        {PREVIEW_ROWS.map((row) => (
          <TouchableOpacity
            key={row.status}
            onPress={() => openPreview(row)}
            activeOpacity={0.8}
            testID={`speaking-lab-status-${row.status}`}
            style={[styles.row, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <Ionicons name={row.icon as any} size={22} color={row.tint} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: t.textPrimary }]}>{row.title}</Text>
              <Text style={[styles.rowDesc, { color: t.textMuted }]}>{row.desc}</Text>
            </View>
            <Ionicons name="play-outline" size={18} color={t.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {preview && (
        <SpeakingPanel
          key={preview.status}
          targetText={PREVIEW_TARGET}
          lang={lang}
          theme={panelTheme}
          previewStatus={preview.status}
          previewScore={preview.score}
          onClose={() => setPreview(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  paywallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  rowDesc: { fontSize: 12, lineHeight: 17 },
});
