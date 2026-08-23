import { triLang, type Lang } from '../constants/i18n';

/**
 * Тексты проверочного занятия главы.
 *
 * зачем (спека SB-14, макет 26, владелец 22.08): чекпоинт получает собственный
 * голос. Ключевое правило — никакого «провалено» и никакого снятия
 * заработанного: слабое место называется приглашением повторить.
 *
 * Отдельный файл, а не расширение learning_v2_session_copy: тот описывает ход
 * обычного занятия и уже перегружен; смешивать два голоса в одном месте
 * означает потом искать чекпоинт-строки среди трёхсот строк практики.
 */

export interface LearningV2CheckpointCopy {
  readonly entryTitle: (chapter: number) => string;
  readonly entryBody: string;
  readonly finalTitle: string;
  readonly finalBody: string;
  readonly start: string;
  readonly noHints: string;
  readonly progress: (current: number, total: number) => string;
  readonly outcomeTitle: string;
  readonly confirmed: string;
  readonly review: string;
  readonly done: string;
}

export function learningV2CheckpointCopy(lang: Lang): LearningV2CheckpointCopy {
  return {
    entryTitle: (chapter: number) =>
      `${triLang(lang, {
        ru: 'Глава',
        uk: 'Розділ',
        es: 'Capítulo',
        'pt-BR': 'Capítulo',
        vi: 'Chương',
        id: 'Bab',
        tr: 'Bölüm',
        pl: 'Rozdział',
      })} ${chapter} — ${triLang(lang, {
        ru: 'проверка',
        uk: 'перевірка',
        es: 'repaso',
        'pt-BR': 'revisão',
        vi: 'kiểm tra',
        id: 'cek',
        tr: 'kontrol',
        pl: 'sprawdzian',
      })}`,
    entryBody: triLang(lang, {
      ru: 'Проверим, что закрепилось. Подсказок не будет — разбор в конце.',
      uk: 'Перевіримо, що закріпилося. Підказок не буде — розбір наприкінці.',
      es: 'Veamos qué se ha asentado. Sin pistas: el repaso viene al final.',
      'pt-BR': 'Vamos ver o que ficou. Sem dicas: a revisão vem no final.',
      vi: 'Xem những gì đã vững. Không có gợi ý — phần giải thích ở cuối.',
      id: 'Kita lihat apa yang sudah melekat. Tanpa petunjuk — ulasan di akhir.',
      tr: 'Neyin oturduğuna bakalım. İpucu yok — değerlendirme sonda.',
      pl: 'Sprawdźmy, co się utrwaliło. Bez podpowiedzi — omówienie na końcu.',
    }),
    finalTitle: triLang(lang, {
      ru: 'Итоговый экзамен',
      uk: 'Підсумковий іспит',
      es: 'Examen final',
      'pt-BR': 'Prova final',
      vi: 'Bài thi cuối',
      id: 'Ujian akhir',
      tr: 'Final sınavı',
      pl: 'Egzamin końcowy',
    }),
    finalBody: triLang(lang, {
      ru: 'Весь материал урока. Спокойно, времени сколько нужно.',
      uk: 'Увесь матеріал уроку. Спокійно, часу скільки треба.',
      es: 'Todo el material de la lección. Con calma, sin prisa.',
      'pt-BR': 'Todo o conteúdo da lição. Com calma, sem pressa.',
      vi: 'Toàn bộ bài học. Cứ bình tĩnh, không giới hạn thời gian.',
      id: 'Seluruh materi pelajaran. Santai, tanpa batas waktu.',
      tr: 'Dersin tüm içeriği. Sakin ol, süre sınırı yok.',
      pl: 'Cały materiał lekcji. Spokojnie, bez limitu czasu.',
    }),
    start: triLang(lang, {
      ru: 'Начать проверку',
      uk: 'Почати перевірку',
      es: 'Empezar el repaso',
      'pt-BR': 'Começar a revisão',
      vi: 'Bắt đầu kiểm tra',
      id: 'Mulai cek',
      tr: 'Kontrole başla',
      pl: 'Zacznij sprawdzian',
    }),
    noHints: triLang(lang, {
      ru: 'Подсказки выключены',
      uk: 'Підказки вимкнені',
      es: 'Pistas desactivadas',
      'pt-BR': 'Dicas desativadas',
      vi: 'Đã tắt gợi ý',
      id: 'Petunjuk dimatikan',
      tr: 'İpuçları kapalı',
      pl: 'Podpowiedzi wyłączone',
    }),
    progress: (current: number, total: number) =>
      `${triLang(lang, {
        ru: 'Задание',
        uk: 'Завдання',
        es: 'Tarea',
        'pt-BR': 'Tarefa',
        vi: 'Câu',
        id: 'Soal',
        tr: 'Görev',
        pl: 'Zadanie',
      })} ${current} ${triLang(lang, {
        ru: 'из',
        uk: 'з',
        es: 'de',
        'pt-BR': 'de',
        vi: 'trên',
        id: 'dari',
        tr: '/',
        pl: 'z',
      })} ${total}`,
    outcomeTitle: triLang(lang, {
      ru: 'Что вы теперь умеете',
      uk: 'Що ви тепер умієте',
      es: 'Lo que ya sabes hacer',
      'pt-BR': 'O que você já sabe fazer',
      vi: 'Những gì bạn đã làm được',
      id: 'Yang sekarang kamu bisa',
      tr: 'Artık neler yapabiliyorsunuz',
      pl: 'Co już potrafisz',
    }),
    confirmed: triLang(lang, {
      ru: 'Закрепилось',
      uk: 'Закріпилося',
      es: 'Asentado',
      'pt-BR': 'Consolidado',
      vi: 'Đã vững',
      id: 'Sudah melekat',
      tr: 'Oturdu',
      pl: 'Utrwalone',
    }),
    review: triLang(lang, {
      ru: 'Стоит повторить',
      uk: 'Варто повторити',
      es: 'Conviene repasar',
      'pt-BR': 'Vale revisar',
      vi: 'Nên ôn lại',
      id: 'Sebaiknya diulang',
      tr: 'Tekrar etmeye değer',
      pl: 'Warto powtórzyć',
    }),
    done: triLang(lang, {
      ru: 'Глава закрыта',
      uk: 'Розділ закрито',
      es: 'Capítulo cerrado',
      'pt-BR': 'Capítulo concluído',
      vi: 'Đã xong chương',
      id: 'Bab selesai',
      tr: 'Bölüm kapandı',
      pl: 'Rozdział zamknięty',
    }),
  };
}
