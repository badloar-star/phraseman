import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useStableSafeAreaInsets } from "../../../app/stable_safe_area_metrics";
import { triLang, type Lang } from "../../../constants/i18n";
import { runeAmount } from "../../../constants/runes";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import FeedbackRatingCard from "../../FeedbackRatingCard";
import ResultsSequence from "../../feedback/ResultsSequence";
import RuneBalanceChip from "../../RuneBalanceChip";
import { useTheme } from "../../ThemeContext";

export type HorizonResultFacts = Readonly<{
  runes: number;
  /** XP confirmed by the canonical registerXP receipt for this run. */
  xp?: number;
  total: number;
  firstTry: number;
  elapsedMs: number;
  credit?: "credited" | "existing" | "practice";
}>;

type Props = Readonly<{
  lesson: number;
  sessionOrdinal?: number;
  sessionId?: string;
  kind: "session" | "chapter" | "lesson" | "final";
  stars: 0 | 1 | 2 | 3;
  facts: HorizonResultFacts;
  lang: Lang;
  reducedMotion: boolean;
  rewardsSettled: boolean;
  preview?: boolean;
  nextLessonAvailable?: boolean;
  onContinue: () => void;
}>;

function copyFor(lang: Lang) {
  return {
    header: triLang(lang, {
      ru: "Итоги сессии", uk: "Підсумки сесії", en: "Session results", es: "Resultados de la sesión",
      "pt-BR": "Resultado da sessão", vi: "Kết quả buổi học", id: "Hasil sesi", tr: "Oturum sonucu", pl: "Wynik sesji",
    }),
    sessionComplete: triLang(lang, {
      ru: "СЕССИЯ ЗАВЕРШЕНА", uk: "СЕСІЮ ЗАВЕРШЕНО", en: "SESSION COMPLETE", es: "SESIÓN COMPLETADA",
      "pt-BR": "SESSÃO CONCLUÍDA", vi: "ĐÃ XONG BUỔI HỌC", id: "SESI SELESAI", tr: "OTURUM TAMAMLANDI", pl: "SESJA UKOŃCZONA",
    }),
    chapterComplete: triLang(lang, {
      ru: "ГЛАВА ЗАВЕРШЕНА", uk: "РОЗДІЛ ЗАВЕРШЕНО", en: "CHAPTER COMPLETE", es: "CAPÍTULO COMPLETADO",
      "pt-BR": "CAPÍTULO CONCLUÍDO", vi: "ĐÃ XONG CHƯƠNG", id: "BAB SELESAI", tr: "BÖLÜM TAMAMLANDI", pl: "ROZDZIAŁ UKOŃCZONY",
    }),
    lessonComplete: triLang(lang, {
      ru: "УРОК ЗАВЕРШЁН", uk: "УРОК ЗАВЕРШЕНО", en: "LESSON COMPLETE", es: "LECCIÓN COMPLETADA",
      "pt-BR": "LIÇÃO CONCLUÍDA", vi: "ĐÃ XONG BÀI HỌC", id: "PELAJARAN SELESAI", tr: "DERS TAMAMLANDI", pl: "LEKCJA UKOŃCZONA",
    }),
    courseCompleteEyebrow: triLang(lang, {
      ru: "КУРС ЗАВЕРШЁН", uk: "КУРС ЗАВЕРШЕНО", en: "COURSE COMPLETE", es: "CURSO COMPLETADO",
      "pt-BR": "CURSO CONCLUÍDO", vi: "ĐÃ HOÀN THÀNH KHÓA HỌC", id: "KURSUS SELESAI", tr: "KURS TAMAMLANDI", pl: "KURS UKOŃCZONY",
    }),
    title: triLang(lang, {
      ru: "Отличная работа", uk: "Чудова робота", en: "Great work", es: "Gran trabajo",
      "pt-BR": "Ótimo trabalho", vi: "Làm tốt lắm", id: "Kerja bagus", tr: "Harika iş", pl: "Świetna robota",
    }),
    nextSession: triLang(lang, {
      ru: "Следующая сессия уже открыта", uk: "Наступну сесію вже відкрито", en: "The next session is now open", es: "La siguiente sesión ya está disponible",
      "pt-BR": "A próxima sessão já está aberta", vi: "Buổi tiếp theo đã mở", id: "Sesi berikutnya sudah terbuka", tr: "Sonraki oturum açıldı", pl: "Następna sesja jest już dostępna",
    }),
    nextChapter: triLang(lang, {
      ru: "Следующая глава уже открыта", uk: "Наступний розділ уже відкрито", en: "The next chapter is now open", es: "El siguiente capítulo ya está disponible",
      "pt-BR": "O próximo capítulo já está aberto", vi: "Chương tiếp theo đã mở", id: "Bab berikutnya sudah terbuka", tr: "Sonraki bölüm açıldı", pl: "Następny rozdział jest już dostępny",
    }),
    nextLesson: triLang(lang, {
      ru: "Следующий урок уже открыт", uk: "Наступний урок уже відкрито", en: "The next lesson is now open", es: "La siguiente lección ya está disponible",
      "pt-BR": "A próxima lição já está aberta", vi: "Bài tiếp theo đã mở", id: "Pelajaran berikutnya sudah terbuka", tr: "Sonraki ders açıldı", pl: "Następna lekcja jest już dostępna",
    }),
    nextLessonInProgress: triLang(lang, {
      ru: "Следующий урок ещё в работе", uk: "Наступний урок ще в роботі", en: "The next lesson is still in progress", es: "La siguiente lección aún está en preparación",
      "pt-BR": "A próxima lição ainda está em preparação", vi: "Bài tiếp theo vẫn đang được hoàn thiện", id: "Pelajaran berikutnya masih disiapkan", tr: "Sonraki ders hâlâ hazırlanıyor", pl: "Następna lekcja jest jeszcze przygotowywana",
    }),
    courseComplete: triLang(lang, {
      ru: "Курс завершён", uk: "Курс завершено", en: "Course complete", es: "Curso completado",
      "pt-BR": "Curso concluído", vi: "Đã hoàn thành khóa học", id: "Kursus selesai", tr: "Kurs tamamlandı", pl: "Kurs ukończony",
    }),
    noNewCredit: triLang(lang, {
      ru: "Результат сохранён · повторного начисления нет", uk: "Результат збережено · повторного нарахування немає", en: "Result saved · no duplicate reward", es: "Resultado guardado · sin recompensa duplicada",
      "pt-BR": "Resultado salvo · sem recompensa duplicada", vi: "Đã lưu kết quả · không thưởng trùng", id: "Hasil tersimpan · tanpa hadiah ganda", tr: "Sonuç kaydedildi · tekrar ödül yok", pl: "Wynik zapisany · bez podwójnej nagrody",
    }),
    preview: triLang(lang, {
      ru: "Предпросмотр · без начисления", uk: "Попередній перегляд · без нарахування", en: "Preview · no reward", es: "Vista previa · sin recompensa",
      "pt-BR": "Prévia · sem recompensa", vi: "Xem trước · không thưởng", id: "Pratinjau · tanpa hadiah", tr: "Ön izleme · ödül yok", pl: "Podgląd · bez nagrody",
    }),
    session: triLang(lang, {
      ru: "СЕССИЯ", uk: "СЕСІЯ", en: "SESSION", es: "SESIÓN", "pt-BR": "SESSÃO",
      vi: "BUỔI", id: "SESI", tr: "OTURUM", pl: "SESJA",
    }),
    xp: "XP",
    runes: triLang(lang, {
      ru: "РУНЫ", uk: "РУНИ", en: "RUNES", es: "RUNAS", "pt-BR": "RUNAS",
      vi: "RUNE", id: "RUNE", tr: "RÜNLER", pl: "RUNY",
    }),
    accuracy: triLang(lang, {
      ru: "с первой попытки", uk: "з першої спроби", en: "first try", es: "al primer intento",
      "pt-BR": "na primeira tentativa", vi: "đúng lần đầu", id: "percobaan pertama", tr: "ilk denemede", pl: "za pierwszym razem",
    }),
    time: triLang(lang, {
      ru: "время", uk: "час", en: "time", es: "tiempo", "pt-BR": "tempo",
      vi: "thời gian", id: "waktu", tr: "süre", pl: "czas",
    }),
    tasks: triLang(lang, {
      ru: "заданий", uk: "завдань", en: "activities", es: "actividades", "pt-BR": "atividades",
      vi: "hoạt động", id: "aktivitas", tr: "etkinlik", pl: "zadań",
    }),
    feedbackKicker: triLang(lang, {
      ru: "ВАШЕ ВПЕЧАТЛЕНИЕ", uk: "ВАШЕ ВРАЖЕННЯ", en: "YOUR FEEDBACK", es: "TU OPINIÓN",
      "pt-BR": "SUA OPINIÃO", vi: "PHẢN HỒI CỦA BẠN", id: "PENDAPAT ANDA", tr: "GÖRÜŞÜNÜZ", pl: "TWOJA OPINIA",
    }),
    feedbackTitle: triLang(lang, {
      ru: "Всё было понятно?", uk: "Усе було зрозуміло?", en: "Did everything make sense?", es: "¿Se entendió todo?",
      "pt-BR": "Deu para entender tudo?", vi: "Mọi thứ có dễ hiểu không?", id: "Semuanya jelas?", tr: "Her şey anlaşıldı mı?", pl: "Wszystko było jasne?",
    }),
    placeholder: triLang(lang, {
      ru: "Где застрял? Что объяснить иначе?", uk: "Де застряг? Що пояснити інакше?", en: "Where did you get stuck? What should we explain better?", es: "¿Dónde te atascaste? ¿Qué explicar mejor?",
      "pt-BR": "Onde travou? O que explicar melhor?", vi: "Bạn mắc ở đâu? Cần giải thích lại điều gì?", id: "Di mana kamu tersendat? Apa yang perlu dijelaskan ulang?", tr: "Nerede takıldın? Ne daha iyi anlatılmalı?", pl: "Gdzie utknąłeś? Co wyjaśnić inaczej?",
    }),
    send: triLang(lang, {
      ru: "Отправить", uk: "Надіслати", en: "Send", es: "Enviar", "pt-BR": "Enviar",
      vi: "Gửi", id: "Kirim", tr: "Gönder", pl: "Wyślij",
    }),
    thanks: triLang(lang, {
      ru: "Спасибо! Отзыв отправлен", uk: "Дякуємо! Відгук надіслано", en: "Thanks! Feedback sent", es: "¡Gracias! Comentario enviado",
      "pt-BR": "Obrigado! Comentário enviado", vi: "Cảm ơn! Đã gửi phản hồi", id: "Terima kasih! Masukan terkirim", tr: "Teşekkürler! Geri bildirim gönderildi", pl: "Dziękujemy! Opinia wysłana",
    }),
    rating: triLang(lang, {
      ru: "Оценка", uk: "Оцінка", en: "Rating", es: "Valoración", "pt-BR": "Avaliação",
      vi: "Đánh giá", id: "Penilaian", tr: "Puan", pl: "Ocena",
    }),
    continue: triLang(lang, {
      ru: "Продолжить", uk: "Продовжити", en: "Continue", es: "Continuar", "pt-BR": "Continuar",
      vi: "Tiếp tục", id: "Lanjutkan", tr: "Devam et", pl: "Kontynuuj",
    }),
    showResult: triLang(lang, {
      ru: "Показать весь итог", uk: "Показати весь підсумок", en: "Show full result", es: "Mostrar el resultado completo",
      "pt-BR": "Mostrar o resultado completo", vi: "Hiện toàn bộ kết quả", id: "Tampilkan hasil lengkap", tr: "Tüm sonucu göster", pl: "Pokaż pełny wynik",
    }),
    close: triLang(lang, {
      ru: "Закрыть", uk: "Закрити", en: "Close", es: "Cerrar", "pt-BR": "Fechar",
      vi: "Đóng", id: "Tutup", tr: "Kapat", pl: "Zamknij",
    }),
  };
}

export default function HorizonSessionResult({
  lesson,
  sessionOrdinal = 1,
  sessionId,
  kind,
  stars,
  facts,
  lang,
  reducedMotion,
  rewardsSettled,
  preview = false,
  nextLessonAvailable = true,
  onContinue,
}: Props) {
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  const active = useRuntimeActive();
  const c = useMemo(() => copyFor(lang), [lang]);
  const chapter = Math.max(1, Math.ceil(sessionOrdinal / 8));
  const minutes = Math.floor(Math.max(0, facts.elapsedMs) / 60000);
  const seconds = Math.floor(Math.max(0, facts.elapsedMs) / 1000) % 60;
  const accuracy = facts.total > 0
    ? Math.round((Math.max(0, facts.firstTry) / facts.total) * 100)
    : 0;
  const creditedRunes = !preview && facts.credit === "credited"
    ? Math.max(0, Math.round(facts.runes))
    : 0;
  const xp = Math.max(0, Math.round(facts.xp ?? 0));
  const subtitle = preview
    ? c.preview
    : facts.credit === "existing"
      ? c.noNewCredit
      : kind === "final"
        ? c.courseComplete
        : kind === "lesson"
          ? nextLessonAvailable ? c.nextLesson : c.nextLessonInProgress
        : kind === "chapter"
          ? c.nextChapter
          : c.nextSession;
  const feedbackEntityId = sessionId?.trim() || `learning-v2:${lesson}:${sessionOrdinal}`;
  const completionEyebrow = kind === "final"
    ? c.courseCompleteEyebrow
    : `${kind === "lesson" ? c.lessonComplete : kind === "chapter" ? c.chapterComplete : c.sessionComplete} · ${
      kind === "lesson" ? lesson : kind === "chapter" ? chapter : sessionOrdinal
    }`;

  return (
    <View
      testID="learning-v2-horizon-result"
      style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Pressable
          testID="learning-v2-completion-close"
          accessibilityRole="button"
          accessibilityLabel={c.close}
          hitSlop={8}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: t.bgCard, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="close" size={22} color={t.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>
          {c.header}
        </Text>
        <View style={styles.balanceSlot}>
          <RuneBalanceChip
            testID="learning-v2-completion-header-runes"
            color={t.textPrimary}
            size={22}
            active={active}
          />
        </View>
      </View>

      <ResultsSequence
        layoutVariant="learning-v2-orbit"
        animateLateRewards
        reducedMotion={reducedMotion}
        bottomInset={insets.bottom}
        rewardsSettled={rewardsSettled}
        stars={stars}
        showStars
        xp={xp}
        runes={creditedRunes > 0 ? creditedRunes : undefined}
        xpLabel={c.xp}
        runesLabel={c.runes}
        runesAccessibilityLabel={runeAmount(lang, creditedRunes)}
        eyebrow={completionEyebrow}
        title={c.title}
        subtitle={subtitle}
        summaryMetrics={[
          { value: `${accuracy}%`, label: c.accuracy },
          { value: `${minutes}:${String(seconds).padStart(2, "0")}`, label: c.time },
          { value: String(Math.max(0, facts.total)), label: c.tasks },
        ]}
        badge={(
          <View
            accessible
            accessibilityLabel={`${c.session} ${sessionOrdinal}`}
            style={[styles.badge, { backgroundColor: t.accent, shadowColor: t.accent }]}
          >
            <View style={[styles.badgeHalo, { backgroundColor: t.bgCard }]} />
            <Ionicons name="trophy" size={42} color={t.correctText} />
            <Text style={[styles.badgeLabel, { color: t.correctText }]}>{c.session}</Text>
            <Text style={[styles.badgeNumber, { color: t.correctText }]}>{sessionOrdinal}</Text>
          </View>
        )}
        feedbackSlot={!preview ? (
          <View style={[styles.feedbackShell, { backgroundColor: t.bgSurface2 }]}>
            <Text style={[styles.feedbackKicker, { color: t.accent }]}>{c.feedbackKicker}</Text>
            <FeedbackRatingCard
              kind="learning_v2"
              entityId={feedbackEntityId}
              entityLabel={`Learning V2 · ${lesson}.${sessionOrdinal}`}
              lang={lang}
              title={c.feedbackTitle}
              placeholder={c.placeholder}
              sendLabel={c.send}
              thanksLabel={c.thanks}
              ratingA11yLabel={c.rating}
              testID="learning-v2-completion-feedback"
              presentation="compact-stars"
            />
          </View>
        ) : undefined}
        ctaPrimaryLabel={c.continue}
        skipAnimationA11yLabel={c.showResult}
        ctaPrimaryTestID="horizons-result-continue"
        onCtaPrimary={onContinue}
        intensity={reducedMotion ? "quiet" : kind === "final" ? "major" : "milestone"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  balanceSlot: { minWidth: 64, alignItems: "flex-end" },
  badge: {
    width: 82,
    height: 82,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 11 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  badgeHalo: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 22,
    opacity: 0.1,
  },
  badgeLabel: { marginTop: 1, fontSize: 7, lineHeight: 9, fontWeight: "900", letterSpacing: 1 },
  badgeNumber: { fontSize: 12, lineHeight: 14, fontWeight: "900" },
  feedbackShell: { borderRadius: 22, padding: 4 },
  feedbackKicker: {
    paddingTop: 5,
    paddingBottom: 2,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textAlign: "center",
  },
});
