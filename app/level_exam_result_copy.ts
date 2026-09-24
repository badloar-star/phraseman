import { triLang, type Lang } from '../constants/i18n';
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
        ru: `Нужно ещё ${neededForPass} правильных ответа`, uk: `Потрібно ще ${neededForPass} правильні відповіді`,
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
      translate_build: triLang(lang, { ru: 'Сборка фраз', uk: 'Складання фраз', en: 'Build phrases', es: 'Frases', 'pt-BR': 'Frases', vi: 'Ghép câu', id: 'Susun frasa', tr: 'Cümle kurma', pl: 'Zdania' }),
      speed_match: triLang(lang, { ru: 'Быстрые пары', uk: 'Швидкі пари', en: 'Speed match', es: 'Pares', 'pt-BR': 'Pares', vi: 'Ghép cặp', id: 'Pasangan', tr: 'Eşleştirme', pl: 'Pary' }),
    },
  };
}
