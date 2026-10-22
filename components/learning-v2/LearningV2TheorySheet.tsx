// Теория урока Learning V2 — тот же экран, что теория основного курса (app/lesson_theory_v2.tsx → TheoryLessonView).
//
// ЗАМОК ВЛАДЕЛЬЦА 22.10: теория Learning V2 — тот же TheoryLessonView, что основной курс; своей шторки с вкладками не возвращать.
// зачем (владелец 22.10, на снимок шторки с 14 чипами разделов столбиком: «ТЫ НЕ ВИДЕЛ, КАК ТЕОРИЯ ВЫГЛЯДИТ В ОСНОВНОМ КУРСЕ???»):
// своя шторка с вкладками заменена тем же компонентом, что в классике — шапка «‹ Урок N · A1», заголовок, прогресс,
// разделы аккордеоном в одной карточке, внутри формула, примеры, ошибки, совет и задания. 1:1 по определению: один компонент.
// Данные — разделы сессии «12 · ТЕОРИЯ» (modules/learning-v2/theory), из сборки, без сети. Прогресс разделов живёт, пока
// экран открыт (своего ключа хранения нет: сохранённое «что открыто» перебило бы раздел эпизода). Журнал [V2-THEORY].
import React, { useCallback, useEffect, useMemo } from "react";
import { Modal } from "react-native";

import type { Lang } from "../../constants/i18n";
import TheoryLessonView, { type TheoryBlock, type TheorySection } from "../theory/TheoryLessonView";
import type { LearningV2TheoryBlockV1, LearningV2TheoryV1 } from "../../modules/learning-v2/theory/learning_v2_theory_v1";

const LOG = "[V2-THEORY]";

type Props = Readonly<{
  visible: boolean;
  theory: LearningV2TheoryV1 | null;
  lang: Lang;
  /** Раздел, открытый при показе (из эпизода — раздел текущей главы). */
  initialSection: string;
  /** Из эпизода — номер задания и всего. В экране классики нижней кнопки нет: к заданию возвращает «‹» в шапке. */
  returnTask?: Readonly<{ n: number; m: number }>;
  onClose: () => void;
}>;

/** Блок данных Learning V2 → блок движка классической теории (формы совпадают, копируем массивы из readonly). */
function toTheoryBlock(block: LearningV2TheoryBlockV1): TheoryBlock {
  switch (block.kind) {
    case "body":
    case "tip":
      return { kind: block.kind, text: block.text };
    case "formula":
      return { kind: "formula", formula: block.formula.map((part) => ({ text: part.text, accent: part.accent })) };
    case "examples":
      return { kind: "examples", examples: block.examples.map((example) => ({ ...example })) };
    case "fix":
      return { kind: "fix", fixes: block.fixes.map((fix) => ({ ...fix })) };
    case "drill":
      return { kind: "drill", drill: { ...block.drill } };
  }
}

/** Разделы для экрана: открыт раздел эпизода; без него — как в данных (обычно первые разделы). */
function toTheorySections(theory: LearningV2TheoryV1, initialSection: string): TheorySection[] {
  const hasInitial = theory.sections.some((section) => section.num === initialSection);
  return theory.sections.map((section) => ({
    num: section.num,
    title: section.title,
    exampleCount: section.blocks.reduce((sum, block) => sum + (block.kind === "examples" ? block.examples.length : 0), 0),
    defaultOpen: hasInitial ? section.num === initialSection : section.defaultOpen,
    blocks: section.blocks.map(toTheoryBlock),
  }));
}

export default function LearningV2TheorySheet({ visible, theory, lang, initialSection, returnTask, onClose }: Props) {
  const sections = useMemo(() => (theory ? toTheorySections(theory, initialSection) : []), [initialSection, theory]);

  useEffect(() => {
    if (!visible) return;
    console.log(`${LOG} open`, JSON.stringify({ lesson: theory?.lesson ?? null, lang, from: theory?.lang ?? null, section: initialSection, sections: sections.length, returnTask: returnTask ?? null })); // guard-ok: строка на открытие
    if (!theory) console.log(`${LOG} open_empty`, JSON.stringify({ reason: "theory=null", lang })); // guard-ok: ранний выход — показывать нечего
  }, [initialSection, lang, returnTask, sections.length, theory, visible]);

  const close = useCallback(() => {
    console.log(`${LOG} close`, JSON.stringify({ lesson: theory?.lesson ?? null })); // guard-ok: строка на закрытие
    onClose();
  }, [onClose, theory?.lesson]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={close}>
      {theory ? (
        <TheoryLessonView
          lessonId={theory.lesson}
          title={theory.title}
          sections={sections}
          onBack={close}
          scrollToSection={initialSection}
          reportDataId={`learning_v2_theory_${theory.lesson}_${theory.lang}`}
        />
      ) : null}
    </Modal>
  );
}
