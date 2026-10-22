// Шторка «Теория урока» Learning V2 — вид A макета docs/design/v2-app/lesson-theory.html «Конспект с разделами».
//
// зачем (решение владельца №42 от 21.10): теория урока открывается шторкой поверх эпизода — место в задании не теряется;
// все разделы в одной шторке, переключатель сверху, внутри формула, примеры со звуком (тап — слушать), частые ошибки, совет
// и «Проверь себя». Тексты — сессии «12 · ТЕОРИЯ» (modules/learning-v2/theory), задания — те же 4 типа, что в классике.
// Данные из сборки, без сети; прогресс заданий живёт в памяти шторки. Журнал [V2-THEORY].
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStableSafeAreaInsets } from "../../app/stable_safe_area_metrics";
import { triLang, type Lang } from "../../constants/i18n";
import { useAudio } from "../../hooks/use-audio";
import { hapticTap } from "../../hooks/use-haptics";
import type { LearningV2TheoryBlockV1, LearningV2TheoryDrillV1, LearningV2TheoryV1 } from "../../modules/learning-v2/theory/learning_v2_theory_v1";
import BinaryRecognition from "../theory/BinaryRecognition";
import SpotTheSlip from "../theory/SpotTheSlip";
import ThreeTileChoice from "../theory/ThreeTileChoice";
import WordBankBuilder from "../theory/WordBankBuilder";
import { splitTheoryHighlight } from "../theory/highlight";
import { lv2Alpha, Lv2Cta, useLv2Glass, type Lv2Glass } from "./LearningV2Glass";

const LOG = "[V2-THEORY]";

type Props = Readonly<{
  visible: boolean;
  theory: LearningV2TheoryV1 | null;
  lang: Lang;
  /** Раздел, открытый при показе (из эпизода — раздел текущей главы). */
  initialSection: string;
  /** Из эпизода — номер задания и всего: нижняя кнопка «Вернуться к заданию N из M»; без него — «Закрыть». */
  returnTask?: Readonly<{ n: number; m: number }>;
  onClose: () => void;
}>;

const copyFor = (lang: Lang) => ({
  kicker: (n: number) => triLang(lang, { ru: `Теория · урок ${n}`, uk: `Теорія · урок ${n}`, en: `Theory · lesson ${n}`, es: `Teoría · lección ${n}`, "pt-BR": `Teoria · lição ${n}`, vi: `Lý thuyết · bài ${n}`, id: `Teori · pelajaran ${n}`, tr: `Teori · ders ${n}`, pl: `Teoria · lekcja ${n}` }),
  close: triLang(lang, { ru: "Закрыть", uk: "Закрити", en: "Close", es: "Cerrar", "pt-BR": "Fechar", vi: "Đóng", id: "Tutup", tr: "Kapat", pl: "Zamknij" }),
  // RU — из макета; остальные языки — предложение, на сверку «Переводчику».
  returnTo: (n: number, m: number) => triLang(lang, { ru: `Вернуться к заданию ${n} из ${m}`, uk: `Повернутися до завдання ${n} з ${m}`, en: `Back to task ${n} of ${m}`, es: `Volver a la tarea ${n} de ${m}`, "pt-BR": `Voltar à tarefa ${n} de ${m}`, vi: `Quay lại bài tập ${n}/${m}`, id: `Kembali ke tugas ${n} dari ${m}`, tr: `Göreve dön: ${n}/${m}`, pl: `Wróć do zadania ${n} z ${m}` }),
  check: triLang(lang, { ru: "Проверь себя", uk: "Перевір себе", en: "Test yourself", es: "Ponte a prueba", "pt-BR": "Teste seus conhecimentos", vi: "Tự kiểm tra", id: "Uji dirimu", tr: "Kendini sına", pl: "Sprawdź się" }),
  listen: (s: string) => triLang(lang, { ru: `Прослушать: ${s}`, uk: `Прослухати: ${s}`, en: `Listen: ${s}`, es: `Escuchar: ${s}`, "pt-BR": `Ouvir: ${s}`, vi: `Nghe: ${s}`, id: `Dengarkan: ${s}`, tr: `Dinle: ${s}`, pl: `Odsłuchaj: ${s}` }),
});

export default function LearningV2TheorySheet({ visible, theory, lang, initialSection, returnTask, onClose }: Props) {
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const [active, setActive] = useState(initialSection);
  const bodyRef = useRef<ScrollView>(null);
  const { speak, stop } = useAudio();
  const [speaking, setSpeaking] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setActive(initialSection);
    console.log(`${LOG} open`, JSON.stringify({ lesson: theory?.lesson ?? null, lang, from: theory?.lang ?? null, section: initialSection, sections: theory?.sections.length ?? 0 })); // guard-ok: строка на открытие
  }, [initialSection, lang, theory, visible]);
  useEffect(() => () => stop(), [stop]);

  const section = theory?.sections.find((item) => item.num === active) ?? theory?.sections[0] ?? null;

  const pickSection = useCallback((num: string) => {
    void hapticTap();
    setActive(num);
    bodyRef.current?.scrollTo({ y: 0, animated: false });
    console.log(`${LOG} section`, JSON.stringify({ lesson: theory?.lesson ?? null, section: num })); // guard-ok: смена раздела
  }, [theory?.lesson]);

  const play = useCallback((en: string) => {
    stop();
    setSpeaking(en);
    const clear = () => setSpeaking((current) => (current === en ? null : current));
    speak(en, undefined, { language: "en-US", systemTtsOnly: true, onDone: clear, onStopped: clear, onError: clear });
  }, [speak, stop]);

  const close = useCallback(() => {
    stop();
    console.log(`${LOG} close`, JSON.stringify({ lesson: theory?.lesson ?? null, section: active })); // guard-ok: строка на закрытие
    onClose();
  }, [active, onClose, stop, theory?.lesson]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.dim} onPress={close} accessibilityLabel={copy.close} />
      <View testID="learning-v2-theory-sheet" style={[styles.sheet, { top: insets.top + 30, backgroundColor: g.opaqueCard }]}>
        <View style={[styles.grab, { backgroundColor: g.opaqueControl }]} />
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={[styles.kicker, { color: g.secondary }]}>{copy.kicker(theory?.lesson ?? 0)}</Text>
            <Text style={[styles.title, { color: g.text }]}>{theory?.title ?? ""}</Text>
          </View>
          <Pressable testID="learning-v2-theory-close" accessibilityRole="button" accessibilityLabel={copy.close} onPress={close} hitSlop={8}
            style={({ pressed }) => [styles.x, { backgroundColor: g.opaqueControl, opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="close" size={18} color={g.text} />
          </Pressable>
        </View>
        {/* зачем (Сверка 22.10, th_side_T3): вкладка «2 Главная формула» упиралась в край экрана на 411 dp и обрезалась; в макете вкладки помещаются в одну строку.
            Реальные заголовки разделов длиннее макетных, поэтому вкладки переносятся на вторую строку (flexWrap): все разделы видны сразу и ни один не прячется за краем.
            guard-ok: разделов урока 12–16 — виртуализация не нужна */}
        <View style={styles.secs}>
          {(theory?.sections ?? []).map((item) => {
            const on = item.num === section?.num;
            return (
              <Pressable key={item.num} testID={`learning-v2-theory-sec-${item.num}`} accessibilityRole="tab" accessibilityState={{ selected: on }}
                onPress={() => pickSection(item.num)} style={[styles.sec, { backgroundColor: on ? g.text : g.opaqueControl }]}>
                <Text style={[styles.secNum, { color: on ? g.bg : g.text, opacity: on ? 0.6 : 0.45 }]}>{String(Number(item.num))}</Text>
                <Text style={[styles.secTitle, { color: on ? g.bg : g.secondary }]} numberOfLines={1}>{item.title}</Text>
              </Pressable>
            );
          })}
        </View>
        {/* guard-ok: блоков в разделе ≤ 8, порядок данных из сборки не меняется (ключи по индексу безопасны) */}
        <ScrollView ref={bodyRef} style={styles.body} contentContainerStyle={styles.bodyContent}>
          {section?.blocks.map((block, index) => (
            <TheoryBlock key={`${section.num}-${index}`} block={block} g={g} lang={lang} copy={copy} speaking={speaking} onPlay={play} drillKey={`${theory?.lesson}-${section.num}-${index}`} />
          ))}
        </ScrollView>
        <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
          <Lv2Cta testID="learning-v2-theory-return" onPress={close}>{returnTask ? copy.returnTo(returnTask.n, returnTask.m) : copy.close}</Lv2Cta>
        </View>
      </View>
    </Modal>
  );
}

const Highlighted = ({ text, hi, g, style }: Readonly<{ text: string; hi?: string; g: Lv2Glass; style: object }>) => {
  const [before, mark, rest] = splitTheoryHighlight(text, hi);
  return (
    <Text style={[style, { color: g.text }]}>
      {before}
      {mark ? <Text style={{ color: g.accentTextSafe }}>{mark}</Text> : null}
      {rest}
    </Text>
  );
};

const TheoryBlock = memo(function TheoryBlock({ block, g, lang, copy, speaking, onPlay, drillKey }: Readonly<{
  block: LearningV2TheoryBlockV1; g: Lv2Glass; lang: Lang; copy: ReturnType<typeof copyFor>; speaking: string | null; onPlay: (en: string) => void; drillKey: string;
}>) {
  if (block.kind === "body") return <Text style={[styles.tbody, { color: g.text }]}>{block.text}</Text>;
  if (block.kind === "tip") {
    return (
      <View style={[styles.tip, { backgroundColor: lv2Alpha(g.accent, 0.12) }]}>
        <Ionicons name="bulb-outline" size={18} color={g.accentTextSafe} />
        <Text style={[styles.tipText, { color: g.text }]}>{block.text}</Text>
      </View>
    );
  }
  if (block.kind === "formula") {
    return (
      <View style={[styles.frm, { backgroundColor: g.opaqueControl }]}>
        <Text style={styles.frmLine}>
          {block.formula.map((part, index) => (
            <Text key={index} style={{ color: part.accent ? g.accentTextSafe : g.secondary, fontWeight: part.accent ? "800" : "600" }}>
              {index > 0 ? "  ·  " : ""}{part.text}
            </Text>
          ))}
        </Text>
      </View>
    );
  }
  if (block.kind === "examples") {
    return (
      <View style={styles.exs}>
        {block.examples.map((example, index) => {
          const on = speaking === example.en;
          return (
            <View key={index}>
              {index > 0 ? <View style={[styles.sep, { backgroundColor: g.line }]} /> : null}
              <View style={styles.ex}>
                <Pressable accessibilityRole="button" accessibilityLabel={copy.listen(example.en)} onPress={() => onPlay(example.en)} hitSlop={6}
                  style={[styles.sp, { backgroundColor: on ? g.text : g.opaqueControl }]}>
                  <Ionicons name={on ? "volume-high" : "volume-medium"} size={17} color={on ? g.bg : g.text} />
                </Pressable>
                <View style={styles.exText}>
                  <Highlighted text={example.en} hi={example.hi} g={g} style={styles.en} />
                  {example.translation ? <Text style={[styles.ru, { color: g.secondary }]}>{example.translation}</Text> : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  }
  if (block.kind === "fix") {
    return (
      <View style={styles.fx}>
        {block.fixes.map((fix, index) => (
          <View key={index} style={[styles.fxRow, { backgroundColor: g.opaqueControl }]}>
            <Text style={[styles.fxText, { color: g.text }]}>
              <Text style={{ color: g.bad, textDecorationLine: "line-through" }}>{fix.wrong}</Text>
              {"  →  "}
              <Text style={{ color: g.good, fontWeight: "700" }}>{fix.right}</Text>
            </Text>
          </View>
        ))}
      </View>
    );
  }
  if (block.kind === "drill") return <TheoryDrill drill={block.drill} g={g} lang={lang} label={copy.check} drillKey={drillKey} />;
  return null;
});

const TheoryDrill = memo(function TheoryDrill({ drill, g, lang, label, drillKey }: Readonly<{ drill: LearningV2TheoryDrillV1; g: Lv2Glass; lang: Lang; label: string; drillKey: string }>) {
  // Цвета заданий классической теории — из токенов стекла темы (как drillTheme в TheoryLessonView).
  const theme = useMemo(() => ({
    textPrimary: g.text, textMuted: g.secondary, correct: g.good, wrong: g.bad, bgCard: g.opaqueCard,
    chipBg: g.opaqueCard, chipBgStrong: g.selected, chipBgFaint: g.line, onAccentText: g.ctaInk,
  }), [g]);
  const onSolved = useCallback(() => {
    console.log(`${LOG} drill_solved`, JSON.stringify({ drill: drillKey, type: drill.type })); // guard-ok: решённое задание
  }, [drill.type, drillKey]);
  return (
    <View style={[styles.drill, { backgroundColor: g.opaqueControl }]}>
      <View style={styles.drillHead}>
        <Ionicons name="create-outline" size={14} color={g.secondary} />
        <Text style={[styles.drillLabel, { color: g.secondary }]}>{label}</Text>
      </View>
      {drill.type === "choice" ? <ThreeTileChoice data={drill} lang={lang} accent={g.accent} theme={theme} onSolved={onSolved} /> : null}
      {drill.type === "spot_slip" ? <SpotTheSlip data={drill} lang={lang} theme={theme} onSolved={onSolved} /> : null}
      {drill.type === "binary" ? <BinaryRecognition data={drill} lang={lang} theme={theme} onSolved={onSolved} /> : null}
      {drill.type === "word_bank" ? <WordBankBuilder data={drill} lang={lang} accent={g.accent} theme={theme} onSolved={onSolved} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" }, // theme-exempt: затемнение под шторкой — `.xdim` макета
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden" },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginTop: 10 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 10, paddingHorizontal: 20 },
  headText: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
  title: { marginTop: 2, fontSize: 22, lineHeight: 27, fontWeight: "800", letterSpacing: -0.3 },
  x: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  secs: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 14 },
  // maxWidth 100 %: одна вкладка не шире строки; заголовок ужимается эллипсисом только если длиннее всей строки (секции ниже — длинные языки de/pl/pt)
  sec: { height: 36, paddingHorizontal: 14, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%" },
  secNum: { fontSize: 13, fontWeight: "800" },
  secTitle: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 24 },
  tbody: { marginTop: 16, fontSize: 16, lineHeight: 23 },
  frm: { marginTop: 14, borderRadius: 18, padding: 14 },
  frmLine: { fontSize: 16, lineHeight: 22 },
  exs: { marginTop: 12 },
  sep: { height: StyleSheet.hairlineWidth },
  ex: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  sp: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  exText: { flex: 1, minWidth: 0 },
  en: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  ru: { marginTop: 1, fontSize: 13, lineHeight: 18 },
  fx: { marginTop: 12, gap: 8 },
  fxRow: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  fxText: { fontSize: 16, lineHeight: 22 },
  tip: { marginTop: 12, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", gap: 10 },
  tipText: { flex: 1, fontSize: 16, lineHeight: 22 },
  drill: { marginTop: 16, borderRadius: 20, padding: 14 },
  drillHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  drillLabel: { fontSize: 13, fontWeight: "700" },
  foot: { paddingTop: 12, paddingHorizontal: 20 },
});
