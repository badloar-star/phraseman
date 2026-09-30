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
 *    человек закроет экран и не вернётся. Три + «и ещё N» честно и не давит.
 * 2. ВЗГЛЯД ЗАКАНЧИВАЕТСЯ НА ПРАВИЛЬНОМ: зачёркнутый ответ сверху мелким,
 *    верный снизу крупным. Уходишь с экрана, помня КАК НАДО, а не как ошибся.
 * 3. ОТВЕТА УЧЕНИКА МОЖЕТ НЕ БЫТЬ: у записей журнала до 21.09 поля `given`
 *    нет. Тогда показываем только правильный вариант — без пустой строки и
 *    без выдуманного «ты написал».
 *
 * Данные локальные (журнал ошибок на устройстве): 0 чтений Firestore.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { triLang, type Lang } from "../../../constants/i18n";
import { lv2CardStyle, useLv2Glass } from "../LearningV2Glass";

/** Сколько промахов показываем на экране итога. Больше — уже лента стыда. */
export const HORIZON_MISTAKE_REVIEW_LIMIT = 3;

export type HorizonMistakeReviewItem = Readonly<{
  id: string;
  /** Что ответил ученик. Нет у старых записей журнала — строка не рисуется. */
  given?: string | null;
  /** Как правильно. Без него строку показывать незачем. */
  correct: string;
  /** Короткое правило одной фразой: «он / она / оно → doesn't». */
  hint?: string | null;
}>;

type Props = Readonly<{
  items: readonly HorizonMistakeReviewItem[];
  /** Сколько ошибок всего — чтобы честно сказать «и ещё N». */
  totalCount: number;
  lang: Lang;
  onOpenItem?: (id: string) => void;
  onOpenAll?: () => void;
}>;

export default function HorizonMistakeReview({
  items,
  totalCount,
  lang,
  onOpenItem,
  onOpenAll,
}: Props) {
  // зачем (learning-v2.html, `.errc`): разбор ошибок — карточка стекла; ошибочный ответ красным и
  // зачёркнут, верный — зелёным, как в строках `.er` макета.
  const g = useLv2Glass();

  if (items.length === 0) return null;

  const restCount = Math.max(0, totalCount - items.length);

  const title = triLang(lang, {
    ru: items.length === 1 ? "Споткнулся на одной" : `Споткнулся на ${items.length}`,
    uk: items.length === 1 ? "Спіткнувся на одній" : `Спіткнувся на ${items.length}`,
    en: items.length === 1 ? "One slip" : `${items.length} slips`,
    es: items.length === 1 ? "Un tropiezo" : `${items.length} tropiezos`,
    "pt-BR": items.length === 1 ? "Um tropeço" : `${items.length} tropeços`,
    vi: `${items.length} chỗ vấp`,
    id: `${items.length} kesalahan`,
    tr: `${items.length} takılma`,
    pl: items.length === 1 ? "Jedno potknięcie" : `Potknięcia: ${items.length}`,
  });

  const restLabel = triLang(lang, {
    ru: `и ещё ${restCount} — в «Моих ошибках»`,
    uk: `і ще ${restCount} — у «Моїх помилках»`,
    en: `and ${restCount} more — in My mistakes`,
    es: `y ${restCount} más — en Mis errores`,
    "pt-BR": `e mais ${restCount} — em Meus erros`,
    vi: `và ${restCount} lỗi nữa — trong Lỗi của tôi`,
    id: `dan ${restCount} lagi — di Kesalahanku`,
    tr: `ve ${restCount} tane daha — Hatalarım'da`,
    pl: `i jeszcze ${restCount} — w „Moich błędach”`,
  });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: g.text }]}>{title}</Text>

      {items.map((item) => {
        const interactive = !!onOpenItem;
        const Row = interactive ? Pressable : View;
        return (
          <Row
            key={item.id}
            {...(interactive
              ? {
                  accessibilityRole: "button" as const,
                  accessibilityLabel: item.given
                    ? triLang(lang, {
                        ru: `Было ${item.given}, правильно ${item.correct}`,
                        uk: `Було ${item.given}, правильно ${item.correct}`,
                        en: `You wrote ${item.given}, correct is ${item.correct}`,
                        es: `Escribiste ${item.given}, lo correcto es ${item.correct}`,
                        "pt-BR": `Você escreveu ${item.given}, o correto é ${item.correct}`,
                        vi: `Bạn viết ${item.given}, đúng là ${item.correct}`,
                        id: `Kamu menulis ${item.given}, yang benar ${item.correct}`,
                        tr: `${item.given} yazdın, doğrusu ${item.correct}`,
                        pl: `Napisałeś ${item.given}, poprawnie ${item.correct}`,
                      })
                    : item.correct,
                  onPress: () => onOpenItem(item.id),
                  style: ({ pressed }: { pressed: boolean }) => [
                    styles.row,
                    lv2CardStyle(g),
                    { transform: [{ scale: pressed ? 0.985 : 1 }] },
                  ],
                }
              : { style: [styles.row, lv2CardStyle(g)] })}
          >
            {/* Грань слева — маркер ОДНОЙ стороной, а не обводка блока
                (запрет владельца на контейнеры с обводкой соблюдён). */}
            <View style={styles.body}>
              {item.given ? (
                <Text style={[styles.given, { color: g.bad }]}>
                  {item.given}
                </Text>
              ) : null}
              <Text style={[styles.correct, { color: g.good }]}>
                {item.correct}
              </Text>
              {item.hint ? (
                <Text style={[styles.hint, { color: g.secondary }]}>
                  {item.hint}
                </Text>
              ) : null}
            </View>
            {interactive ? (
              <Ionicons name="chevron-forward" size={18} color={g.mutedText} style={styles.chevron} />
            ) : null}
          </Row>
        );
      })}

      {restCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={restLabel}
          hitSlop={8}
          onPress={onOpenAll}
          style={({ pressed }) => [styles.rest, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.restText, { color: g.secondary }]}>{restLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
  },
  body: { flex: 1, minWidth: 0, paddingHorizontal: 16, paddingVertical: 14 },
  // Зачёркнутый ответ мельче: взгляд идёт вниз и заканчивается на ПРАВИЛЬНОМ варианте.
  given: { fontSize: 15, lineHeight: 20, fontWeight: "400", textDecorationLine: "line-through" },
  correct: { fontSize: 16, lineHeight: 22, fontWeight: "600", marginTop: 3 },
  hint: { fontSize: 14, lineHeight: 20, fontWeight: "400", marginTop: 6 },
  chevron: { alignSelf: "center", marginRight: 13 },
  rest: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  restText: { fontSize: 15, lineHeight: 20, fontWeight: "600", textAlign: "center" },
});
