/**
 * HorizonMistakeReview — разбор ошибок на экране итога занятия.
 *
 * зачем (аудит 2026-09-21, одобрено владельцем): итог показывал «точность 72%»
 * и НИ СЛОВА о том, на чём человек споткнулся. Это учебное приложение —
 * разбор его суть, а не украшение.
 *
 * Три решения из макета (docs/v2/mockups/35-new-ui-approved.html, сцена 2):
 *
 * 1. МАКСИМУМ ТРИ строки. Ошибся в десяти → показать все = лента стыда,
 *    человек закроет экран и не вернётся. Три + счётчик всех честно и не давит.
 * 2. ВЗГЛЯД ЗАКАНЧИВАЕТСЯ НА ПРАВИЛЬНОМ: зачёркнутый ответ → верный.
 *    Уходишь с экрана, помня КАК НАДО, а не как ошибся.
 * 3. ОТВЕТА УЧЕНИКА МОЖЕТ НЕ БЫТЬ: у записей журнала до 21.09 поля `given`
 *    нет. Тогда показываем только правильный вариант — без пустой строки и
 *    без выдуманного «ты написал».
 *
 * Вид (владелец 2026-09-30, learning-v2.html `.errc`/`.er`): одна карточка стекла
 * «Споткнулся на N» + счётчик, строка = тип задания слева, зачёркнутый ответ → верный,
 * внизу контурная «Повторить ошибки» (ведёт в «Мои ошибки»).
 *
 * Данные локальные (память экрана / журнал ошибок на устройстве): 0 чтений Firestore.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { triLang, type Lang } from "../../../constants/i18n";
import { Lv2Cta, lv2CardStyle, useLv2Glass } from "../LearningV2Glass";
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { semanticInk } from '../../../constants/liquidGlassSemanticInk';

/** Сколько промахов показываем на экране итога. Больше — уже лента стыда. */
export const HORIZON_MISTAKE_REVIEW_LIMIT = 3;

export type HorizonMistakeReviewItem = Readonly<{
  id: string;
  /** Что ответил ученик. Нет у старых записей журнала — строка не рисуется. */
  given?: string | null;
  /** Как правильно. Без него строку показывать незачем. */
  correct: string;
  /** Тип задания слева строки (`.er .w` макета): «Собери фразу», «Точная грамматика». */
  label?: string | null;
  /** Короткое правило одной фразой: «он / она / оно → doesn't». */
  hint?: string | null;
}>;

type Props = Readonly<{
  items: readonly HorizonMistakeReviewItem[];
  /** Сколько ошибок всего — счётчик в шапке карточки. */
  totalCount: number;
  lang: Lang;
  onOpenItem?: (id: string) => void;
  /** «Повторить ошибки». Не передан — кнопки нет. */
  onOpenAll?: () => void;
}>;

function mistakeA11yLabel(lang: Lang, item: HorizonMistakeReviewItem): string {
  if (!item.given) return item.correct;
  const given = item.given;
  const correct = item.correct;
  return triLang(lang, {
    ru: `Было ${given}, правильно ${correct}`,
    uk: `Було ${given}, правильно ${correct}`,
    en: `You wrote ${given}, correct is ${correct}`,
    es: `Escribiste ${given}, lo correcto es ${correct}`,
    "pt-BR": `Você escreveu ${given}, o correto é ${correct}`,
    vi: `Bạn viết ${given}, đúng là ${correct}`,
    id: `Kamu menulis ${given}, yang benar ${correct}`,
    tr: `${given} yazdın, doğrusu ${correct}`,
    pl: `Napisałeś ${given}, poprawnie ${correct}`,
  });
}

export default function HorizonMistakeReview({
  items,
  totalCount,
  lang,
  onOpenItem,
  onOpenAll,
}: Props) {
  const sx = useScaledTextStyles(styles);
  const g = useLv2Glass();

  if (items.length === 0) return null;

  const shownTotal = Math.max(items.length, totalCount);
  const title = triLang(lang, {
    ru: shownTotal === 1 ? "Споткнулся на одной" : `Споткнулся на ${shownTotal}`,
    uk: shownTotal === 1 ? "Спіткнувся на одній" : `Спіткнувся на ${shownTotal}`,
    en: shownTotal === 1 ? "One slip" : `${shownTotal} slips`,
    es: shownTotal === 1 ? "Un tropiezo" : `${shownTotal} tropiezos`,
    "pt-BR": shownTotal === 1 ? "Um tropeço" : `${shownTotal} tropeços`,
    vi: `${shownTotal} chỗ vấp`,
    id: `${shownTotal} kesalahan`,
    tr: `${shownTotal} takılma`,
    pl: shownTotal === 1 ? "Jedno potknięcie" : `Potknięcia: ${shownTotal}`,
  });
  const retryLabel = triLang(lang, {
    ru: "Повторить ошибки", uk: "Повторити помилки", en: "Practise mistakes", es: "Repasar errores",
    "pt-BR": "Revisar erros", vi: "Ôn lại lỗi", id: "Ulangi kesalahan", tr: "Hataları tekrarla", pl: "Powtórz błędy",
  });

  return (
    <View testID="horizons-mistake-review" style={[sx.card, lv2CardStyle(g)]}>
      <View style={sx.head}>
        <Text style={[sx.title, { color: g.text }]}>{title}</Text>
        <Text style={[sx.count, { color: g.mutedText }]}>{shownTotal}</Text>
      </View>

      {items.map((item, index) => {
        const rowStyle = [
          sx.row,
          // guard-ok: тонкий разделитель строк `.er` макета, не рамка блока
          index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: g.line } : null,
        ];
        const body = (
          <>
            {item.label ? (
              <Text style={[sx.label, { color: g.secondary }]}>{item.label}</Text>
            ) : null}
            <View style={sx.pair}>
              {item.given ? (
                <>
                  <Text style={[sx.given, { color: semanticInk(g).badText, textDecorationColor: g.badEdge }]}>
                    {item.given}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={g.mutedText} />
                </>
              ) : null}
              <Text style={[sx.correct, { color: semanticInk(g).goodText }]}>{item.correct}</Text>
              {item.hint ? (
                <Text style={[sx.hint, { color: g.secondary }]}>{item.hint}</Text>
              ) : null}
            </View>
          </>
        );
        return onOpenItem ? (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={mistakeA11yLabel(lang, item)}
            onPress={() => onOpenItem(item.id)}
            style={({ pressed }) => [...rowStyle, { opacity: pressed ? 0.7 : 1 }]}
          >
            {body}
          </Pressable>
        ) : (
          <View key={item.id} accessible accessibilityLabel={mistakeA11yLabel(lang, item)} style={rowStyle}>
            {body}
          </View>
        );
      })}

      {onOpenAll ? (
        <Lv2Cta
          ghost
          testID="horizons-mistakes-retry"
          accessibilityLabel={retryLabel}
          onPress={onOpenAll}
          style={sx.retry}
          right={<Ionicons name="refresh" size={18} color={g.text} />}
        >
          {retryLabel}
        </Lv2Cta>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 14, paddingBottom: 14, paddingHorizontal: 16 },
  // зачем (learning-v2.html `.errc .h` space-between, `.n` --muted 600): число ошибок у правого края.
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 2 },
  title: { flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  count: { fontSize: 16, lineHeight: 21, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  label: { width: 110, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  pair: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 10,
    rowGap: 6,
  },
  given: { fontSize: 16, lineHeight: 21, textDecorationLine: "line-through" },
  // `.er .ok` 600.
  correct: { fontSize: 16, lineHeight: 21, fontWeight: "600" },
  hint: { width: "100%", fontSize: 13, lineHeight: 19, marginTop: 2 },
  retry: { minHeight: 44, borderRadius: 22, marginTop: 6 },
});
