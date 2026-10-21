// ═══════════════════════════════════════════════════════════
// dev_learning_v2_theory — DEV-маршрут шторки «Теория урока» Learning V2 (вид A lesson-theory.html) для «Сверки».
//
// зачем (координатор 22.10): шторка нужна «Сверке» раньше, чем кнопка в боевом плеере (подвал плеера сейчас переделывает
// «Дизайн»). Маршрут: /dev_learning_v2_theory?lesson=N&session=S&theme=<id темы>
//   lesson — урок 1..15 (по умолчанию 1); session — занятие, по карте урока выбирает открытый раздел;
//   theme — id темы стекла (LIQUID_GLASS_THEME_IDS), меняет тему приложения как в Настройках (только dev).
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import LearningV2TheorySheet from "../components/learning-v2/LearningV2TheorySheet";
import { useLv2Glass } from "../components/learning-v2/LearningV2Glass";
import { useLang } from "../components/LangContext";
import { useTheme } from "../components/ThemeContext";
import { LIQUID_GLASS_THEME_IDS, type LiquidGlassThemeId } from "../constants/liquidGlassThemePalette";
import { learningV2TheorySectionForSessionV1, loadLearningV2TheoryV1 } from "../modules/learning-v2/theory/learning_v2_theory_v1";
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from "./config";
import { safeRouterBack } from "./navigation_back";

const LOG = "[V2-THEORY]";
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function DevLearningV2Theory() {
  const params = useLocalSearchParams<{ lesson?: string; session?: string; theme?: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const g = useLv2Glass();
  const { setLiquidGlassThemeId } = useTheme();
  const lesson = Math.max(1, Math.min(32, Number(first(params.lesson)) || 1));
  const session = Number(first(params.session)) || null;
  const themeParam = first(params.theme);
  const theory = useMemo(() => loadLearningV2TheoryV1(lesson, lang), [lang, lesson]);
  const section = useMemo(() => (theory ? learningV2TheorySectionForSessionV1(theory, session) : "01"), [session, theory]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!themeParam) return;
    if ((LIQUID_GLASS_THEME_IDS as readonly string[]).includes(themeParam)) setLiquidGlassThemeId(themeParam as LiquidGlassThemeId);
    else console.warn(`${LOG} dev_route: неизвестная тема ${themeParam}`); // guard-ok: причина, почему тема не сменилась
  }, [setLiquidGlassThemeId, themeParam]);

  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) {
    console.warn(`${LOG} dev_route: отклонено — не dev-сборка, уводим на Главную`); // guard-ok: ранний выход логируется
    return <Redirect href="/" />;
  }
  console.log(`${LOG} dev_route lesson=${lesson} session=${session ?? "-"} theme=${themeParam || "-"} found=${theory !== null} section=${section}`); // guard-ok: строка на показ
  return (
    <View style={[styles.fill, { backgroundColor: g.bg }]}>
      <LearningV2TheorySheet
        visible={visible}
        theory={theory}
        lang={lang}
        initialSection={section}
        onClose={() => { setVisible(false); safeRouterBack(router); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
