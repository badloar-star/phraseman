import { triLang, type Lang } from '../constants/i18n';
import { pluralWord } from '../constants/plural';
import type { LevelExamFormat } from './level_exam_types';

type Args = {
  passed: boolean;
  neededForPass: number;
  energyCost: number;
  unlimitedEnergy: boolean;
};

export type LevelExamResultCopy = {
  title: string;
  scoreLabel: string;
  skillsLabel: string;
  weakLessonsLabel: string;
  rewardEarned: string;
  retryCoach: string;
  primaryAction: string;
  formatLabels: Record<LevelExamFormat, string>;
};

export function getLevelExamResultCopy(
  lang: Lang,
  { passed, neededForPass, energyCost, unlimitedEnergy }: Args,
): LevelExamResultCopy {
  return {
    title: passed
      ? triLang(lang, {
        ru: 'Экзамен сдан', uk: 'Іспит складено', en: 'Exam passed', es: 'Examen aprobado', 'pt-BR': 'Exame concluído',
        vi: 'Đã vượt qua bài thi', id: 'Ujian lulus', tr: 'Sınavı geçtin', pl: 'Egzamin zaliczony',
      })
      : triLang(lang, {
        // зачем (аудит текстов 11.11): «ещё 1 правильных ответа» / «ещё 5 правильных ответа» — слово склоняем по числу
        ru: `Нужно ещё ${neededForPass} ${pluralWord('ru', neededForPass, { one: 'правильный ответ', few: 'правильных ответа', many: 'правильных ответов' })}`,
        uk: `Потрібно ще ${neededForPass} ${pluralWord('uk', neededForPass, { one: 'правильна відповідь', few: 'правильні відповіді', many: 'правильних відповідей' })}`,
        en: `You need ${neededForPass} more correct answers`,
        es: `Te faltan ${neededForPass} respuestas correctas`, 'pt-BR': `Faltam ${neededForPass} respostas corretas`,
        vi: `Cần thêm ${neededForPass} câu đúng`, id: `Butuh ${neededForPass} jawaban benar lagi`,
        tr: `${neededForPass} doğru cevap daha gerekiyor`, pl: `Potrzebujesz jeszcze ${neededForPass} poprawnych odpowiedzi`,
      }),
    scoreLabel: triLang(lang, {
      ru: 'Результат', uk: 'Результат', en: 'Result', es: 'Resultado', 'pt-BR': 'Resultado',
      vi: 'Kết quả', id: 'Hasil', tr: 'Sonuç', pl: 'Wynik',
    }),
    skillsLabel: triLang(lang, {
      ru: 'Навыки', uk: 'Навички', en: 'Skills', es: 'Habilidades', 'pt-BR': 'Habilidades',
      vi: 'Kỹ năng', id: 'Keterampilan', tr: 'Beceriler', pl: 'Umiejętności',
    }),
    weakLessonsLabel: triLang(lang, {
      ru: 'Что повторить', uk: 'Що повторити', en: 'What to review', es: 'Qué repasar', 'pt-BR': 'O que revisar',
      vi: 'Nội dung cần ôn', id: 'Yang perlu diulang', tr: 'Tekrar edilecekler', pl: 'Co powtórzyć',
    }),
    // зачем (PM-046, владелец): спин убран как награда экзамена; rewardPending/
    // rewardAlreadyClaimed существовали только для спин-состояний и удалены
    // вместе с ним — единственный текст на успехе теперь общий, без валюты.
    rewardEarned: triLang(lang, {
      ru: 'Уровень подтверждён — так держать!', uk: 'Рівень підтверджено — так тримати!',
      en: 'Level confirmed — keep it up!',
      es: '¡Nivel confirmado, sigue así!', 'pt-BR': 'Nível confirmado, continue assim!',
      vi: 'Đã xác nhận cấp độ — tiếp tục phát huy!', id: 'Level terkonfirmasi — pertahankan!',
      tr: 'Seviye onaylandı — böyle devam!', pl: 'Poziom potwierdzony — tak trzymaj!',
    }),
    retryCoach: triLang(lang, {
      ru: 'Повтори слабые темы — следующая попытка будет увереннее.',
      uk: 'Повтори слабкі теми — наступна спроба буде впевненішою.',
      en: 'Review the weak topics — your next attempt will be more confident.',
      es: 'Repasa los temas débiles y vuelve con más confianza.',
      'pt-BR': 'Revise os pontos fracos e tente de novo com mais confiança.',
      vi: 'Ôn lại các chủ đề yếu để tự tin hơn ở lần sau.',
      id: 'Ulangi topik yang lemah agar percobaan berikutnya lebih mantap.',
      tr: 'Zayıf konuları tekrarla; sonraki denemen daha güçlü olacak.',
      pl: 'Powtórz słabsze tematy — kolejna próba będzie pewniejsza.',
    }),
    primaryAction: passed
      ? triLang(lang, {
        ru: 'Продолжить обучение', uk: 'Продовжити навчання', en: 'Continue learning', es: 'Continuar aprendiendo', 'pt-BR': 'Continuar aprendendo',
        vi: 'Tiếp tục học', id: 'Lanjut belajar', tr: 'Öğrenmeye devam et', pl: 'Kontynuuj naukę',
      })
      : unlimitedEnergy
        ? triLang(lang, {
          ru: 'Повторить экзамен', uk: 'Повторити іспит', en: 'Retry exam', es: 'Repetir examen', 'pt-BR': 'Refazer exame',
          vi: 'Thi lại', id: 'Ulangi ujian', tr: 'Sınavı tekrarla', pl: 'Powtórz egzamin',
        })
        : triLang(lang, {
          ru: `Повторить экзамен −${energyCost} ⚡`, uk: `Повторити іспит −${energyCost} ⚡`,
          en: `Retry exam −${energyCost} ⚡`,
          es: `Repetir examen −${energyCost} ⚡`, 'pt-BR': `Refazer exame −${energyCost} ⚡`,
          vi: `Thi lại −${energyCost} ⚡`, id: `Ulangi ujian −${energyCost} ⚡`,
          tr: `Sınavı tekrarla −${energyCost} ⚡`, pl: `Powtórz egzamin −${energyCost} ⚡`,
        }),
    formatLabels: {
      guess_phrase: triLang(lang, { ru: 'Ситуации', uk: 'Ситуації', en: 'Situations', es: 'Situaciones', 'pt-BR': 'Situações', vi: 'Tình huống', id: 'Situasi', tr: 'Durumlar', pl: 'Sytuacje' }),
      fill_gap: triLang(lang, { ru: 'Пропуски', uk: 'Пропуски', en: 'Gaps', es: 'Huecos', 'pt-BR': 'Lacunas', vi: 'Điền từ', id: 'Kata hilang', tr: 'Boşluklar', pl: 'Luki' }),
      find_oddity: triLang(lang, { ru: 'Ошибки', uk: 'Помилки', en: 'Mistakes', es: 'Errores', 'pt-BR': 'Erros', vi: 'Lỗi', id: 'Kesalahan', tr: 'Hatalar', pl: 'Błędy' }),
      translate_build: triLang(lang, { ru: 'Сборка фраз', uk: 'Складання висловів', en: 'Build phrases', es: 'Frases', 'pt-BR': 'Frases', vi: 'Ghép câu', id: 'Susun frasa', tr: 'Cümle kurma', pl: 'Zdania' }),
      speed_match: triLang(lang, { ru: 'Быстрые пары', uk: 'Швидкі пари', en: 'Speed match', es: 'Pares', 'pt-BR': 'Pares', vi: 'Ghép cặp', id: 'Pasangan', tr: 'Eşleştirme', pl: 'Pary' }),
      // зачем (владелец 11.11.2026): двенадцать новых механик экзамена — короткие названия навыков для итога
      context_choice: triLang(lang, { ru: 'Точный перевод', uk: 'Точний переклад', en: 'Exact translation', es: 'Traducción exacta', 'pt-BR': 'Tradução exata', vi: 'Dịch chính xác', id: 'Terjemahan tepat', tr: 'Tam çeviri', pl: 'Dokładne tłumaczenie' }),
      dialogue_order: triLang(lang, { ru: 'Порядок фраз', uk: 'Порядок фраз', en: 'Phrase order', es: 'Orden de frases', 'pt-BR': 'Ordem das frases', vi: 'Thứ tự câu', id: 'Urutan frasa', tr: 'Cümle sırası', pl: 'Kolejność zdań' }),
      word_repair: triLang(lang, { ru: 'Исправление', uk: 'Виправлення', en: 'Corrections', es: 'Correcciones', 'pt-BR': 'Correções', vi: 'Sửa lỗi', id: 'Perbaikan', tr: 'Düzeltme', pl: 'Poprawki' }),
      multi_select: triLang(lang, { ru: 'Два ответа', uk: 'Дві відповіді', en: 'Two answers', es: 'Dos respuestas', 'pt-BR': 'Duas respostas', vi: 'Hai đáp án', id: 'Dua jawaban', tr: 'İki cevap', pl: 'Dwie odpowiedzi' }),
      linked_gaps: triLang(lang, { ru: 'Два пропуска', uk: 'Два пропуски', en: 'Two gaps', es: 'Dos huecos', 'pt-BR': 'Duas lacunas', vi: 'Hai chỗ trống', id: 'Dua rumpang', tr: 'İki boşluk', pl: 'Dwie luki' }),
      typed_word: triLang(lang, { ru: 'Слово по памяти', uk: 'Слово з пам’яті', en: 'Word from memory', es: 'Palabra de memoria', 'pt-BR': 'Palavra de memória', vi: 'Nhớ từ', id: 'Kata dari ingatan', tr: 'Ezberden kelime', pl: 'Słowo z pamięci' }),
      classify_function: triLang(lang, { ru: 'Группы', uk: 'Групи', en: 'Groups', es: 'Grupos', 'pt-BR': 'Grupos', vi: 'Phân nhóm', id: 'Kelompok', tr: 'Gruplar', pl: 'Grupy' }),
      reply_pairs: triLang(lang, { ru: 'Перевод и фраза', uk: 'Переклад і фраза', en: 'Translation and phrase', es: 'Traducción y frase', 'pt-BR': 'Tradução e frase', vi: 'Bản dịch và câu', id: 'Terjemahan dan frasa', tr: 'Çeviri ve ifade', pl: 'Tłumaczenie i zdanie' }),
      sentence_build_noise: triLang(lang, { ru: 'Сборка с лишним', uk: 'Складання із зайвим', en: 'Build with extras', es: 'Frases con sobras', 'pt-BR': 'Frases com sobras', vi: 'Ghép câu có từ thừa', id: 'Susun dengan kata lebih', tr: 'Fazlalıklı kurma', pl: 'Układanie z nadmiarem' }),
      remove_intruder: triLang(lang, { ru: 'Лишнее слово', uk: 'Зайве слово', en: 'Extra word', es: 'Palabra de más', 'pt-BR': 'Palavra a mais', vi: 'Từ thừa', id: 'Kata berlebih', tr: 'Fazla kelime', pl: 'Zbędne słowo' }),
      sentence_transform: triLang(lang, { ru: 'Перевод целиком', uk: 'Переклад повністю', en: 'Full translation', es: 'Traducción completa', 'pt-BR': 'Tradução completa', vi: 'Dịch cả câu', id: 'Terjemahan penuh', tr: 'Tam cümle çevirisi', pl: 'Pełne tłumaczenie' }),
      evidence_choice: triLang(lang, { ru: 'Поиск в тексте', uk: 'Пошук у тексті', en: 'Find in text', es: 'Buscar en el texto', 'pt-BR': 'Buscar no texto', vi: 'Tìm trong đoạn văn', id: 'Cari dalam teks', tr: 'Metinde bulma', pl: 'Szukanie w tekście' }),
    },
  };
}
