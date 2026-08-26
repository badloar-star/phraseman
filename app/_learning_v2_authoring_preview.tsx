import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import PressableHybrid from "../components/PressableHybrid";
import ScreenGradient from "../components/ScreenGradient";
import { useTheme } from "../components/ThemeContext";
import { LEARNING_V2_AUTHORING_PREVIEW_ROUTE } from "../constants/devRoutes";
import {
  learningV2AuthoringDevicePreviewRowsV1,
  type LearningV2AuthoringDevicePreviewRowV1,
} from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { rememberNavigationPath, safeRouterBack } from "./navigation_back";
import { useStableSafeAreaInsets } from "./stable_safe_area_metrics";

const STATUS_COPY = Object.freeze({
  DRAFT: "Черновик",
  AUTO_PASS: "Автопроверка пройдена",
  OWNER_APPROVED: "Одобрена владельцем",
  LOCKED: "Зафиксирована",
});

export default function LearningV2AuthoringPreviewScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const rows = useMemo(() => learningV2AuthoringDevicePreviewRowsV1(), []);
  const blockedCount = 56 - rows.length;

  useEffect(() => {
    rememberNavigationPath(LEARNING_V2_AUTHORING_PREVIEW_ROUTE);
  }, []);

  const openSession = (row: LearningV2AuthoringDevicePreviewRowV1) => {
    rememberNavigationPath(LEARNING_V2_AUTHORING_PREVIEW_ROUTE);
    router.push({
      pathname: "/learning-v2/session/[id]",
      params: {
        id: `lesson-01:session:${String(row.sessionOrdinal).padStart(2, "0")}`,
        runtimeMode: "direct_v1",
        previewMode: "authoring_v1",
        releaseEnvironment: "lab",
        releaseSeasonId: "learning-v2",
        lessonOrdinal: "1",
        sessionOrdinal: String(row.sessionOrdinal),
      },
    } as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary }]}>
      <ScreenGradient />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableHybrid
          variant="icon"
          accessibilityRole="button"
          accessibilityLabel="Назад в DEV Hub"
          style={styles.backHit}
          contentStyle={[styles.back, { backgroundColor: t.bgSurface }]}
          onPress={() => safeRouterBack(router, "/(tabs)/settings" as never)}
        >
          <Ionicons name="chevron-back" size={21} color={t.textPrimary} />
        </PressableHybrid>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>Проверка сессий</Text>
          <Text style={[styles.subtitle, { color: t.textMuted, fontSize: f.caption }]}>Реальный мобильный плеер · без записи прогресса</Text>
        </View>
      </View>

      <FlatList decelerationRate="fast"
        data={rows}
        keyExtractor={(row) => String(row.sessionOrdinal)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 28 },
        ]}
        ListHeaderComponent={
          <View style={[styles.notice, { backgroundColor: t.bgCard }]}>
            <Ionicons name="phone-portrait-outline" size={22} color={t.accent} />
            <View style={styles.noticeCopy}>
              <Text style={[styles.noticeTitle, { color: t.textPrimary }]}>Открывается фактический черновик</Text>
              <Text style={[styles.noticeBody, { color: t.textMuted }]}>
                Можно пройти интро, карточки слов и все задания. До публикации аудиофайлов точный target озвучивает системный голос телефона.
              </Text>
            </View>
          </View>
        }
        ListFooterComponent={
          blockedCount > 0 ? (
            <Text style={[styles.blocked, { color: t.textMuted }]}>Следующие сессии заблокированы реестром: {blockedCount}</Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <PressableHybrid
            variant="card"
            accessibilityRole="button"
            accessibilityLabel={`Открыть сессию ${item.sessionOrdinal}. Статус: ${STATUS_COPY[item.status]}`}
            onPress={() => openSession(item)}
            style={styles.rowHit}
            contentStyle={[
              styles.row,
              { backgroundColor: index % 2 === 0 ? t.bgCard : t.bgSurface },
            ]}
          >
            <View style={[styles.ordinal, { backgroundColor: t.bgSurface2 }]}>
              <Text style={[styles.ordinalText, { color: t.textPrimary }]}>{item.sessionOrdinal}</Text>
            </View>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: t.textPrimary }]}>Сессия {item.sessionOrdinal}</Text>
              <Text style={[styles.rowStatus, { color: item.status === "DRAFT" ? t.accent : t.textMuted }]}>{STATUS_COPY[item.status]}</Text>
            </View>
            <Ionicons name="play" size={18} color={t.accent} />
          </PressableHybrid>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backHit: { width: 48, height: 48 },
  back: { width: 48, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { marginTop: 2, fontWeight: "400" },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  notice: { flexDirection: "row", gap: 12, borderRadius: 22, padding: 16, marginBottom: 8 },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  noticeBody: { marginTop: 4, fontSize: 14, lineHeight: 21, fontWeight: "400" },
  rowHit: { minHeight: 74 },
  row: { minHeight: 74, borderRadius: 20, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  ordinal: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  ordinalText: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  rowStatus: { marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  blocked: { marginTop: 8, paddingHorizontal: 4, fontSize: 13, lineHeight: 19, fontWeight: "400" },
});
