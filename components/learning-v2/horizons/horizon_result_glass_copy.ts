// зачем (владелец 2026-09-30, learning-v2.html → блок «Итог занятия»): тексты единого экрана
// завершения Learning V2 в стиле Liquid Glass — «Занятие пройдено / Глава закрыта / Урок
// завершён», карточка «верно · ошибок · точность», «Что вы теперь умеете». Вынесены отдельно,
// чтобы экран итога не разрастался переводами на девять языков.
import { triLang, type Lang } from "../../../constants/i18n";

export type HorizonResultGlassCopy = Readonly<{
  sessionDone: string;
  chapterDone: string;
  lessonDone: string;
  courseDone: string;
  lessonLabel: (lesson: number) => string;
  sessionOf: (ordinal: number, total: number) => string;
  sessionShort: (ordinal: number) => string;
  chapterCheck: (chapter: number) => string;
  nextOpen: string;
  resultSaved: string;
  previewNoCredit: string;
  nextLessonOpen: string;
  nextLessonWip: string;
  toLesson: (lesson: number) => string;
  toMap: string;
  correct: string;
  wrong: string;
  accuracy: string;
  continue: string;
  close: string;
  retryMistakes: string;
  feedbackTitle: string;
  feedbackPlaceholder: string;
  feedbackSend: string;
  feedbackThanks: string;
  feedbackRating: string;
}>;

export function horizonResultGlassCopy(lang: Lang): HorizonResultGlassCopy {
  const lessonWord = triLang(lang, {
    ru: "Урок", uk: "Урок", en: "Lesson", es: "Lección", "pt-BR": "Lição",
    vi: "Bài", id: "Pelajaran", tr: "Ders", pl: "Lekcja",
  });
  const sessionWord = triLang(lang, {
    ru: "Эпизод", uk: "Епізод", en: "Episode", es: "Episodio", "pt-BR": "Episódio",
    vi: "Tập", id: "Episode", tr: "Bölüm", pl: "Odcinek",
  });
  const ofWord = triLang(lang, {
    ru: "из", uk: "з", en: "of", es: "de", "pt-BR": "de", vi: "/", id: "dari", tr: "/", pl: "z",
  });
  const chapterWord = triLang(lang, {
    ru: "Глава", uk: "Розділ", en: "Chapter", es: "Capítulo", "pt-BR": "Capítulo",
    vi: "Chương", id: "Bab", tr: "Ünite", pl: "Rozdział",
  });
  const checkWord = triLang(lang, {
    ru: "Проверка", uk: "Перевірка", en: "Check", es: "Repaso", "pt-BR": "Revisão",
    vi: "Kiểm tra", id: "Ujian", tr: "Kontrol", pl: "Sprawdzian",
  });
  return {
    sessionDone: triLang(lang, {
      ru: "Эпизод пройден", uk: "Епізод пройдено", en: "Episode complete", es: "Episodio completado",
      "pt-BR": "Episódio concluído", vi: "Đã xong tập", id: "Episode selesai", tr: "Bölüm tamamlandı", pl: "Odcinek ukończony",
    }),
    chapterDone: triLang(lang, {
      ru: "Глава закрыта", uk: "Розділ закрито", en: "Chapter complete", es: "Capítulo cerrado",
      "pt-BR": "Capítulo concluído", vi: "Đã xong chương", id: "Bab selesai", tr: "Ünite tamamlandı", pl: "Rozdział zamknięty",
    }),
    lessonDone: triLang(lang, {
      ru: "Урок завершён", uk: "Урок завершено", en: "Lesson complete", es: "Lección completada",
      "pt-BR": "Lição concluída", vi: "Đã xong bài học", id: "Pelajaran selesai", tr: "Ders tamamlandı", pl: "Lekcja ukończona",
    }),
    courseDone: triLang(lang, {
      ru: "Курс завершён", uk: "Курс завершено", en: "Course complete", es: "Curso completado",
      "pt-BR": "Curso concluído", vi: "Đã hoàn thành khóa học", id: "Kursus selesai", tr: "Kurs tamamlandı", pl: "Kurs ukończony",
    }),
    lessonLabel: (lesson) => `${lessonWord} ${lesson}`,
    sessionOf: (ordinal, total) => `${sessionWord} ${ordinal} ${ofWord} ${total}`,
    sessionShort: (ordinal) => `${sessionWord} ${ordinal}`,
    chapterCheck: (chapter) => `${chapterWord} ${chapter} · ${checkWord}`,
    nextOpen: triLang(lang, {
      ru: "Следующее открыто", uk: "Наступне відкрито", en: "Next one is open", es: "La siguiente está abierta",
      "pt-BR": "A próxima está aberta", vi: "Buổi tiếp theo đã mở", id: "Berikutnya terbuka", tr: "Sıradaki açıldı", pl: "Następna otwarta",
    }),
    resultSaved: triLang(lang, {
      ru: "Результат сохранён", uk: "Результат збережено", en: "Result saved", es: "Resultado guardado",
      "pt-BR": "Resultado salvo", vi: "Đã lưu kết quả", id: "Hasil tersimpan", tr: "Sonuç kaydedildi", pl: "Wynik zapisany",
    }),
    previewNoCredit: triLang(lang, {
      ru: "Предпросмотр · без начисления", uk: "Попередній перегляд · без нарахування", en: "Preview · no reward", es: "Vista previa · sin recompensa",
      "pt-BR": "Prévia · sem recompensa", vi: "Xem trước · không thưởng", id: "Pratinjau · tanpa hadiah", tr: "Ön izleme · ödül yok", pl: "Podgląd · bez nagrody",
    }),
    nextLessonOpen: triLang(lang, {
      ru: "Следующий урок уже открыт", uk: "Наступний урок уже відкрито", en: "The next lesson is now open", es: "La siguiente lección ya está disponible",
      "pt-BR": "A próxima lição já está aberta", vi: "Bài tiếp theo đã mở", id: "Pelajaran berikutnya sudah terbuka", tr: "Sonraki ders açıldı", pl: "Następna lekcja jest już dostępna",
    }),
    nextLessonWip: triLang(lang, {
      ru: "Следующий урок ещё в работе", uk: "Наступний урок ще в роботі", en: "The next lesson is still in progress", es: "La siguiente lección aún está en preparación",
      "pt-BR": "A próxima lição ainda está em preparação", vi: "Bài tiếp theo vẫn đang được hoàn thiện", id: "Pelajaran berikutnya masih disiapkan", tr: "Sonraki ders hâlâ hazırlanıyor", pl: "Następna lekcja jest jeszcze przygotowywana",
    }),
    toLesson: (lesson) => triLang(lang, {
      ru: `К уроку ${lesson}`, uk: `До уроку ${lesson}`, en: `To lesson ${lesson}`, es: `A la lección ${lesson}`,
      "pt-BR": `Para a lição ${lesson}`, vi: `Tới bài ${lesson}`, id: `Ke pelajaran ${lesson}`, tr: `${lesson}. derse`, pl: `Do lekcji ${lesson}`,
    }),
    toMap: triLang(lang, {
      ru: "На карту", uk: "На карту", en: "Back to map", es: "Al mapa", "pt-BR": "Para o mapa",
      vi: "Về bản đồ", id: "Ke peta", tr: "Haritaya", pl: "Do mapy",
    }),
    correct: triLang(lang, {
      ru: "верно", uk: "правильно", en: "correct", es: "correctas", "pt-BR": "certas",
      vi: "đúng", id: "benar", tr: "doğru", pl: "dobrze",
    }),
    wrong: triLang(lang, {
      ru: "ошибок", uk: "помилок", en: "mistakes", es: "errores", "pt-BR": "erros",
      vi: "lỗi", id: "salah", tr: "hata", pl: "błędów",
    }),
    accuracy: triLang(lang, {
      ru: "точность", uk: "точність", en: "accuracy", es: "precisión", "pt-BR": "precisão",
      vi: "độ chính xác", id: "akurasi", tr: "doğruluk", pl: "dokładność",
    }),
    continue: triLang(lang, {
      ru: "Продолжить", uk: "Продовжити", en: "Continue", es: "Continuar", "pt-BR": "Continuar",
      vi: "Tiếp tục", id: "Lanjutkan", tr: "Devam et", pl: "Kontynuuj",
    }),
    close: triLang(lang, {
      ru: "Закрыть", uk: "Закрити", en: "Close", es: "Cerrar", "pt-BR": "Fechar",
      vi: "Đóng", id: "Tutup", tr: "Kapat", pl: "Zamknij",
    }),
    retryMistakes: triLang(lang, {
      ru: "Повторить ошибки", uk: "Повторити помилки", en: "Practise mistakes", es: "Repasar errores",
      "pt-BR": "Revisar erros", vi: "Ôn lại lỗi", id: "Ulangi kesalahan", tr: "Hataları tekrarla", pl: "Powtórz błędy",
    }),
    feedbackTitle: triLang(lang, {
      ru: "Всё было понятно?", uk: "Усе було зрозуміло?", en: "Did everything make sense?", es: "¿Se entendió todo?",
      "pt-BR": "Deu para entender tudo?", vi: "Mọi thứ có dễ hiểu không?", id: "Semuanya jelas?", tr: "Her şey anlaşıldı mı?", pl: "Wszystko było jasne?",
    }),
    feedbackPlaceholder: triLang(lang, {
      ru: "Где застрял? Что объяснить иначе?", uk: "Де застряг? Що пояснити інакше?", en: "Where did you get stuck? What should we explain better?", es: "¿Dónde te atascaste? ¿Qué explicar mejor?",
      "pt-BR": "Onde travou? O que explicar melhor?", vi: "Bạn mắc ở đâu? Cần giải thích lại điều gì?", id: "Di mana kamu tersendat? Apa yang perlu dijelaskan ulang?", tr: "Nerede takıldın? Ne daha iyi anlatılmalı?", pl: "Gdzie utknąłeś? Co wyjaśnić inaczej?",
    }),
    feedbackSend: triLang(lang, {
      ru: "Отправить", uk: "Надіслати", en: "Send", es: "Enviar", "pt-BR": "Enviar",
      vi: "Gửi", id: "Kirim", tr: "Gönder", pl: "Wyślij",
    }),
    feedbackThanks: triLang(lang, {
      ru: "Спасибо! Отзыв отправлен", uk: "Дякуємо! Відгук надіслано", en: "Thanks! Feedback sent", es: "¡Gracias! Comentario enviado",
      "pt-BR": "Obrigado! Comentário enviado", vi: "Cảm ơn! Đã gửi phản hồi", id: "Terima kasih! Masukan terkirim", tr: "Teşekkürler! Geri bildirim gönderildi", pl: "Dziękujemy! Opinia wysłana",
    }),
    feedbackRating: triLang(lang, {
      ru: "Оценка", uk: "Оцінка", en: "Rating", es: "Valoración", "pt-BR": "Avaliação",
      vi: "Đánh giá", id: "Penilaian", tr: "Puan", pl: "Ocena",
    }),
  };
}
