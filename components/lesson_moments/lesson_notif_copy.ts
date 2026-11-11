// ═══════════════════════════════════════════════════════════════════════════
// lesson_notif_copy.ts — надписи уведомлений итога урока: медаль, открытие экзамена уровня и экзамена Lingman, «Поделиться».
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»; макет
// docs/design/v2-app/stories-lesson-notifs.html — «Да, в приложение»): эти уведомления теперь приходят кадром истории, и кадр
// обязан говорить ТЕМИ ЖЕ словами. Раньше строки жили внутри уведомления (app/lesson_complete.tsx) — вынесены сюда без
// изменения текста, уведомление и кадр читают одно место. Новая строка одна — «Уровень A1» над заголовком кадра экзамена.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';

/** Ступень медали, которую объявляет уведомление (без «нет медали»). */
export type LessonMedalStep = 'bronze' | 'silver' | 'gold';

/** «Золотая медаль!» */
export function lessonMedalTitle(tier: LessonMedalStep, lang: Lang): string {
  if (tier === 'bronze') return triLang(lang, { ru: 'Бронзовая медаль!', en: 'Bronze medal!', uk: 'Бронзова медаль!', es: '¡Medalla de bronce!', 'pt-BR': 'Medalha de bronze!', vi: 'Huy chương đồng!', id: 'Medali perunggu!', tr: 'Bronz madalya!', pl: 'Brązowy medal!' });
  if (tier === 'silver') return triLang(lang, { ru: 'Серебряная медаль!', en: 'Silver medal!', uk: 'Срібна медаль!', es: '¡Medalla de plata!', 'pt-BR': 'Medalha de prata!', vi: 'Huy chương bạc!', id: 'Medali perak!', tr: 'Gümüş madalya!', pl: 'Srebrny medal!' });
  return triLang(lang, { ru: 'Золотая медаль!', en: 'Gold medal!', uk: 'Золота медаль!', es: '¡Medalla de oro!', 'pt-BR': 'Medalha de ouro!', vi: 'Huy chương vàng!', id: 'Medali emas!', tr: 'Altın madalya!', pl: 'Złoty medal!' });
}

/** Подпись под медалью. */
export function lessonMedalSub(lang: Lang): string {
  return triLang(lang, {
    // зачем (VOICE.md): без «Продолжай учиться» и без зашитого «английский» (язык изучения бывает любой)
    ru: 'Урок позади! Следующий уже стучится',
    en: 'Lesson done! The next one is already knocking',
    uk: 'Урок позаду! Наступний уже стукає',
    es: '¡Lección superada! La siguiente ya está tocando la puerta',
    'pt-BR': 'Lição feita! A próxima já está batendo na porta',
    vi: 'Xong bài rồi! Bài tiếp theo đang gõ cửa',
    id: 'Pelajaran beres! Yang berikutnya sudah mengetuk',
    tr: 'Ders bitti! Sıradaki kapıyı çalıyor bile',
    pl: 'Lekcja za tobą! Następna już puka',
  });
}

/** «Экзамен уровня открыт» */
export function levelExamOpenTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Экзамен уровня открыт', en: 'Level exam unlocked', uk: 'Іспит рівня відкрито', es: 'Examen de nivel abierto',
    'pt-BR': 'Exame de nível liberado', vi: 'Đã mở bài thi cấp độ', id: 'Ujian level terbuka', tr: 'Seviye sınavı açıldı', pl: 'Egzamin poziomu otwarty',
  });
}

/** «Экзамен Lingman открыт» */
export function lingmanExamOpenTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Экзамен Lingman открыт', en: 'Lingman exam unlocked', uk: 'Іспит Lingman відкрито', es: 'Examen Lingman abierto',
    'pt-BR': 'Exame Lingman liberado', vi: 'Đã mở bài thi Lingman', id: 'Ujian Lingman terbuka', tr: 'Lingman sınavı açıldı', pl: 'Egzamin Lingman otwarty',
  });
}

/** Подпись под заголовком обоих экзаменов. */
export function examOpenSub(lang: Lang): string {
  return triLang(lang, {
    // зачем (VOICE.md): «новый срез знаний на твоём пути» — канцелярит
    ru: 'Проверим, что осело в голове?', en: "Let's see what stuck?", uk: 'Перевіримо, що осіло в голові?',
    es: '¿Vemos qué se te quedó?', 'pt-BR': 'Vamos ver o que ficou na cabeça?', vi: 'Xem điều gì đã đọng lại nhé?',
    id: 'Yuk cek apa yang nyangkut?', tr: 'Bakalım aklında ne kalmış?', pl: 'Sprawdzimy, co zostało w głowie?',
  });
}

/** «Поделиться» */
export function celebrationShareLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Поделиться', en: 'Share', uk: 'Поділитися', es: 'Compartir', 'pt-BR': 'Compartilhar', vi: 'Chia sẻ', id: 'Bagikan', tr: 'Paylaş', pl: 'Udostępnij' });
}

/** «Уровень A1» — строка над заголовком кадра экзамена уровня (макет stories-lesson-notifs). Переводы кроме RU носителем не проверены. */
export function cefrLevelLine(level: string, lang: Lang): string {
  return triLang(lang, {
    ru: `Уровень ${level}`, en: `Level ${level}`, uk: `Рівень ${level}`, es: `Nivel ${level}`,
    'pt-BR': `Nível ${level}`, vi: `Cấp độ ${level}`, id: `Level ${level}`, tr: `Seviye ${level}`, pl: `Poziom ${level}`,
  });
}
