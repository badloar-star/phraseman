import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import SkeletonBlock from '../SkeletonShimmer';
import { triLang, type Lang } from '../../constants/i18n';
import { buildMistakeAnswerDiff, type MistakeDiffSegment } from '../../app/mistake_answer_diff';
import { useTheme } from '../ThemeContext';

/**
 * Панель вердикта раздела ошибок (макет промаха А, утверждён 2026-09-14).
 *
 * Что изменилось против старой панели: свой ответ и верный стоят РЯДОМ с
 * подсветкой расхождения, объяснение разбирает именно этот ответ, а под ним
 * цепочка дней до «исправлено» — правило проекции (3 верных дня в 2 режимах)
 * перестаёт быть невидимым.
 *
 * Владелец 2026-09-14: без персонажа и без пометки «ИИ» на экране.
 */

export type MistakeVerdictChain = Readonly<{
  /** Верных «самостоятельных» дней уже засчитано (0..3). */
  days: number;
  /**
   * Сколько РАЗНЫХ режимов уже зачтено.
   * зачем (аудит 2026-09-15): без этого поля панель не могла сказать правду —
   * писала «ещё один день в другом режиме» и когда нужно было два дня, и когда
   * второй режим уже был. Правило: 3 дня И 2 разных режима (projection.ts).
   */
  modes: number;
  /** Этот ответ добавил новый день в цепочку. */
  gainedToday: boolean;
  /** Ошибка закрыта навсегда. */
  corrected: boolean;
}>;

type Props = {
  lang: Lang;
  correct: boolean;
  /** Что ответил человек (для неверного ответа). */
  userAnswer: string;
  /** Верный ответ. */
  correctAnswer: string;
  /** Готовое объяснение или null, пока грузится. */
  explanation: string | null;
  /** true — объяснение ещё в пути, показываем скелетон вместо пустоты. */
  explanationLoading: boolean;
  chain: MistakeVerdictChain | null;
  stopForToday: boolean;
  onExplainSimpler?: () => void;
};

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { right: 'Верно', rightFree: 'Верно, и без подсказок', missing: 'Не хватило одного слова', order: 'Слова верные, порядок — нет', wrong: 'Нужно поправить', mine: 'ТЫ', correctLabel: 'ВЕРНО', why: 'Почему так', simpler: 'Объяснить проще', day: 'День', fixed: 'Исправлено', oneMoreTwoDays: "Нужны ещё два верных дня — и ошибка уйдёт навсегда.", oneMoreOtherMode: "Ещё один верный день в другом режиме — и ошибка уйдёт навсегда.", oneMoreAnyMode: "Ещё один верный день — и ошибка уйдёт навсегда.", done: 'Эта ошибка исправлена навсегда.', stop: 'Повторим эту фразу завтра: три попытки подряд утомляют, а не учат.', thinking: 'Разбираю твой ответ' },
  uk: { right: 'Правильно', rightFree: 'Правильно, і без підказок', missing: 'Забракло одного слова', order: 'Слова правильні, порядок — ні', wrong: 'Потрібно виправити', mine: 'ТИ', correctLabel: 'ПРАВИЛЬНО', why: 'Чому так', simpler: 'Пояснити простіше', day: 'День', fixed: 'Виправлено', oneMoreTwoDays: "Потрібні ще два правильні дні — і помилка зникне назавжди.", oneMoreOtherMode: "Ще один правильний день в іншому режимі — і помилка зникне назавжди.", oneMoreAnyMode: "Ще один правильний день — і помилка зникне назавжди.", done: 'Цю помилку виправлено назавжди.', stop: 'Повторимо цю фразу завтра: три спроби поспіль втомлюють, а не вчать.', thinking: 'Розбираю твою відповідь' },
  en: { right: 'Correct', rightFree: 'Correct, with no hints', missing: 'One word was missing', order: 'Right words, wrong order', wrong: 'Needs fixing', mine: 'YOU', correctLabel: 'CORRECT', why: 'Why', simpler: 'Explain more simply', day: 'Day', fixed: 'Fixed', oneMoreTwoDays: "Two more correct days and this mistake is gone for good.", oneMoreOtherMode: "One more correct day in a different mode and this mistake is gone for good.", oneMoreAnyMode: "One more correct day and this mistake is gone for good.", done: 'This mistake is fixed for good.', stop: "We'll come back to this phrase tomorrow: three tries in a row tire you out rather than teach.", thinking: 'Looking at your answer' },
  es: { right: 'Correcto', rightFree: 'Correcto, y sin pistas', missing: 'Faltó una palabra', order: 'Palabras correctas, orden no', wrong: 'Hay que corregirlo', mine: 'TÚ', correctLabel: 'CORRECTO', why: 'Por qué', simpler: 'Explicar más simple', day: 'Día', fixed: 'Corregido', oneMoreTwoDays: "Faltan dos días correctos y este error desaparece para siempre.", oneMoreOtherMode: "Un día correcto más en otro modo y este error desaparece para siempre.", oneMoreAnyMode: "Un día correcto más y este error desaparece para siempre.", done: 'Este error está corregido para siempre.', stop: 'Volveremos a esta frase mañana: tres intentos seguidos cansan, no enseñan.', thinking: 'Analizando tu respuesta' },
  'pt-BR': { right: 'Correto', rightFree: 'Correto, e sem dicas', missing: 'Faltou uma palavra', order: 'Palavras certas, ordem errada', wrong: 'Precisa corrigir', mine: 'VOCÊ', correctLabel: 'CORRETO', why: 'Por que', simpler: 'Explicar mais simples', day: 'Dia', fixed: 'Corrigido', oneMoreTwoDays: 'Faltam dois dias corretos e este erro some para sempre.', oneMoreOtherMode: 'Mais um dia correto em outro modo e este erro some para sempre.', oneMoreAnyMode: 'Mais um dia correto e este erro some para sempre.', done: 'Este erro está corrigido para sempre.', stop: 'Voltamos a esta frase amanhã: três tentativas seguidas cansam, não ensinam.', thinking: 'Analisando sua resposta' },
  vi: { right: 'Đúng', rightFree: 'Đúng, không cần gợi ý', missing: 'Thiếu một từ', order: 'Đúng từ, sai trật tự', wrong: 'Cần sửa lại', mine: 'BẠN', correctLabel: 'ĐÚNG', why: 'Vì sao', simpler: 'Giải thích đơn giản hơn', day: 'Ngày', fixed: 'Đã sửa', oneMoreTwoDays: "Cần thêm hai ngày đúng nữa là lỗi này biến mất hẳn.", oneMoreOtherMode: "Thêm một ngày đúng ở chế độ khác là lỗi này biến mất hẳn.", oneMoreAnyMode: "Thêm một ngày đúng nữa là lỗi này biến mất hẳn.", done: 'Lỗi này đã được sửa hẳn.', stop: 'Ta sẽ quay lại câu này vào ngày mai: ba lần liên tiếp làm mệt chứ không giúp học.', thinking: 'Đang xem câu trả lời của bạn' },
  id: { right: 'Benar', rightFree: 'Benar, tanpa petunjuk', missing: 'Kurang satu kata', order: 'Kata benar, urutan salah', wrong: 'Perlu diperbaiki', mine: 'KAMU', correctLabel: 'BENAR', why: 'Kenapa', simpler: 'Jelaskan lebih sederhana', day: 'Hari', fixed: 'Diperbaiki', oneMoreTwoDays: "Butuh dua hari benar lagi dan kesalahan ini hilang selamanya.", oneMoreOtherMode: "Satu hari benar lagi di mode lain dan kesalahan ini hilang selamanya.", oneMoreAnyMode: "Satu hari benar lagi dan kesalahan ini hilang selamanya.", done: 'Kesalahan ini sudah diperbaiki selamanya.', stop: 'Kita ulang frasa ini besok: tiga kali berturut-turut melelahkan, bukan mengajarkan.', thinking: 'Melihat jawabanmu' },
  tr: { right: 'Doğru', rightFree: 'Doğru, hem de ipucusuz', missing: 'Bir kelime eksikti', order: 'Kelimeler doğru, sıra yanlış', wrong: 'Düzeltmek gerek', mine: 'SEN', correctLabel: 'DOĞRU', why: 'Neden', simpler: 'Daha basit anlat', day: 'Gün', fixed: 'Düzeltildi', oneMoreTwoDays: "İki doğru gün daha ve bu hata tamamen gider.", oneMoreOtherMode: "Başka bir modda bir doğru gün daha ve bu hata tamamen gider.", oneMoreAnyMode: "Bir doğru gün daha ve bu hata tamamen gider.", done: 'Bu hata kalıcı olarak düzeltildi.', stop: 'Bu ifadeye yarın döneriz: üst üste üç deneme öğretmez, yorar.', thinking: 'Cevabına bakıyorum' },
  pl: { right: 'Dobrze', rightFree: 'Dobrze, i bez podpowiedzi', missing: 'Zabrakło jednego słowa', order: 'Słowa dobre, kolejność nie', wrong: 'Trzeba poprawić', mine: 'TY', correctLabel: 'POPRAWNIE', why: 'Dlaczego', simpler: 'Wyjaśnij prościej', day: 'Dzień', fixed: 'Poprawione', oneMoreTwoDays: "Jeszcze dwa dobre dni i ten błąd zniknie na zawsze.", oneMoreOtherMode: "Jeszcze jeden dobry dzień w innym trybie i ten błąd zniknie na zawsze.", oneMoreAnyMode: "Jeszcze jeden dobry dzień i ten błąd zniknie na zawsze.", done: 'Ten błąd jest poprawiony na zawsze.', stop: 'Wrócimy do tej frazy jutro: trzy próby pod rząd męczą, a nie uczą.', thinking: 'Analizuję twoją odpowiedź' },
});

function DiffLine({ label, segments, muted }: Readonly<{ label: string; segments: readonly MistakeDiffSegment[]; muted: boolean }>) {
  const { theme: t, f } = useTheme();
  return (
    <View style={styles.diffLine}>
      <Text style={[styles.diffLabel, { color: t.textMuted, fontSize: f.caption }]}>{label}</Text>
      <View style={styles.diffWords}>
        {segments.map((segment, index) => {
          if (segment.tone === 'gap') {
            // Плашка на месте пропущенного слова: видно, где именно дырка.
            return <View key={`gap-${index}`} style={[styles.gap, { backgroundColor: t.wrongBg }]} />;
          }
          const highlight = segment.tone === 'wrong' || segment.tone === 'right';
          return (
            <Text
              key={`${segment.text}-${index}`}
              style={[
                styles.diffWord,
                { fontSize: f.body, color: highlight ? (segment.tone === 'wrong' ? t.wrong : t.accent) : muted ? t.textMuted : t.textPrimary },
                segment.tone === 'right' ? { backgroundColor: t.accentBg } : null,
              ]}
            >
              {segment.text}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function MistakeVerdictPanel({
  lang, correct, userAnswer, correctAnswer, explanation, explanationLoading, chain, stopForToday, onExplainSimpler,
}: Props) {
  const { theme: t, f } = useTheme();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const diff = useMemo(
    () => (correct ? null : buildMistakeAnswerDiff({ userAnswer, correctAnswer })),
    [correct, correctAnswer, userAnswer],
  );

  const heading = correct
    ? copy.rightFree
    : diff?.kind === 'missing' && diff.missingWords.length === 1
      ? copy.missing
      : diff?.kind === 'order'
        ? copy.order
        : copy.wrong;

  return (
    <View
      testID="mistake-verdict-panel"
      style={[styles.panel, { backgroundColor: correct ? t.correctBg : t.wrongBg }]}
    >
      <View style={styles.headingRow}>
        <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={26} color={correct ? t.correct : t.wrong} />
        <Text style={[styles.heading, { color: correct ? t.correct : t.wrong, fontSize: f.body }]}>{heading}</Text>
      </View>

      {!correct && diff ? (
        <View style={styles.diff}>
          <DiffLine label={copy.mine} segments={diff.mine} muted />
          <DiffLine label={copy.correctLabel} segments={diff.correct} muted={false} />
        </View>
      ) : null}

      {!correct ? (
        <View style={[styles.why, { backgroundColor: t.bgCard }]}>
          <View style={styles.whyHead}>
            <Ionicons name="bulb-outline" size={18} color={t.accent} />
            <Text style={[styles.whyTitle, { color: t.textPrimary, fontSize: f.sub }]}>{copy.why}</Text>
          </View>
          {explanation ? (
            <Text testID="mistake-verdict-explanation" style={[styles.whyBody, { color: t.textPrimary, fontSize: f.body }]}>{explanation}</Text>
          ) : explanationLoading ? (
            <View style={styles.whySkeleton}>
              <SkeletonBlock width="92%" height={14} borderRadius={7} />
              <SkeletonBlock width="78%" height={14} borderRadius={7} />
              <Text style={[styles.whyWait, { color: t.textMuted, fontSize: f.caption }]}>{copy.thinking}</Text>
            </View>
          ) : null}
          {explanation && onExplainSimpler ? (
            <Pressable
              testID="mistake-verdict-simpler"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onExplainSimpler}
              style={({ pressed }) => [styles.simpler, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.82 : 1 }]}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{copy.simpler}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Цепочка дней: правило «3 верных дня в 2 режимах» становится видимым. */}
      {chain ? (
        <View style={styles.chain}>
          <View style={styles.chainSteps}>
            {[0, 1, 2].map((index) => {
              const filled = index < chain.days;
              const gaining = chain.gainedToday && index === chain.days - 1;
              return (
                <View
                  key={`chain-${index}`}
                  style={[
                    styles.chainStep,
                    { backgroundColor: filled ? (gaining ? t.gold : t.accent) : t.bgSurface2 },
                  ]}
                />
              );
            })}
          </View>
          <Text style={[styles.chainText, { color: t.textPrimary, fontSize: f.sub }]}>
            {chain.corrected
              ? copy.done
              // Правило: 3 дня И 2 разных режима. Говорим ровно то, чего не хватает.
              : chain.days <= 1
                ? copy.oneMoreTwoDays
                : chain.modes < 2
                  ? copy.oneMoreOtherMode
                  : copy.oneMoreAnyMode}
          </Text>
        </View>
      ) : null}

      {stopForToday ? (
        <Text style={[styles.stop, { color: t.textMuted, fontSize: f.sub }]}>{copy.stop}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 22, padding: 18, gap: 14 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heading: { fontWeight: '800', flexShrink: 1 },
  diff: { gap: 10 },
  diffLine: { gap: 5 },
  diffLabel: { fontWeight: '900', letterSpacing: 0.6 },
  diffWords: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  diffWord: { fontWeight: '800', paddingHorizontal: 3, borderRadius: 7, lineHeight: 26 },
  gap: { width: 30, height: 14, borderRadius: 7 },
  why: { borderRadius: 18, padding: 14, gap: 10 },
  whyHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whyTitle: { fontWeight: '900' },
  whyBody: { fontWeight: '600', lineHeight: 23 },
  whySkeleton: { gap: 8 },
  whyWait: { fontWeight: '700', marginTop: 2 },
  simpler: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 14, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chain: { gap: 8 },
  chainSteps: { flexDirection: 'row', gap: 6 },
  chainStep: { flex: 1, height: 10, borderRadius: 5 },
  chainText: { fontWeight: '700', lineHeight: 21 },
  stop: { fontWeight: '700', lineHeight: 21 },
});

export default memo(MistakeVerdictPanel);
