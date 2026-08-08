import { triLang, type Lang } from '../constants/i18n';
import type { LevelExamFormat } from './level_exam_types';

type Args = {
  passed: boolean;
  neededForPass: number;
  energyCost: number;
};

export type LevelExamResultCopy = {
  title: string;
  scoreLabel: string;
  skillsLabel: string;
  weakLessonsLabel: string;
  rewardEarned: string;
  rewardPending: string;
  rewardAlreadyClaimed: string;
  retryCoach: string;
  primaryAction: string;
  reviewAction: string;
  formatLabels: Record<LevelExamFormat, string>;
};

export function getLevelExamResultCopy(lang: Lang, { passed, neededForPass, energyCost }: Args): LevelExamResultCopy {
  return {
    title: passed
      ? triLang(lang, {
        ru: 'Экзамен сдан', uk: 'Іспит складено', es: 'Examen aprobado', 'pt-BR': 'Exame concluído',
        vi: 'Đã vượt qua bài thi', id: 'Ujian lulus', tr: 'Sınavı geçtin', pl: 'Egzamin zaliczony',
      })
      : triLang(lang, {
        ru: `Нужно ещё ${neededForPass} правильных ответа`, uk: `Потрібно ще ${neededForPass} правильні відповіді`,
        es: `Te faltan ${neededForPass} respuestas correctas`, 'pt-BR': `Faltam ${neededForPass} respostas corretas`,
        vi: `Cần thêm ${neededForPass} câu đúng`, id: `Butuh ${neededForPass} jawaban benar lagi`,
        tr: `${neededForPass} doğru cevap daha gerekiyor`, pl: `Potrzebujesz jeszcze ${neededForPass} poprawnych odpowiedzi`,
      }),
    scoreLabel: triLang(lang, {
      ru: 'Результат', uk: 'Результат', es: 'Resultado', 'pt-BR': 'Resultado',
      vi: 'Kết quả', id: 'Hasil', tr: 'Sonuç', pl: 'Wynik',
    }),
    skillsLabel: triLang(lang, {
      ru: 'Навыки', uk: 'Навички', es: 'Habilidades', 'pt-BR': 'Habilidades',
      vi: 'Kỹ năng', id: 'Keterampilan', tr: 'Beceriler', pl: 'Umiejętności',
    }),
    weakLessonsLabel: triLang(lang, {
      ru: 'Что повторить', uk: 'Що повторити', es: 'Qué repasar', 'pt-BR': 'O que revisar',
      vi: 'Nội dung cần ôn', id: 'Yang perlu diulang', tr: 'Tekrar edilecekler', pl: 'Co powtórzyć',
    }),
    rewardEarned: triLang(lang, {
      ru: '+1 спин за первое успешное прохождение', uk: '+1 спін за перше успішне проходження',
      es: '+1 giro por aprobar por primera vez', 'pt-BR': '+1 giro pela primeira aprovação',
      vi: '+1 lượt quay cho lần vượt qua đầu tiên', id: '+1 spin untuk kelulusan pertama',
      tr: 'İlk başarılı tamamlamaya +1 çevirme', pl: '+1 obrót za pierwsze zaliczenie',
    }),
    rewardPending: triLang(lang, {
      ru: 'Спин будет начислен после синхронизации', uk: 'Спін буде нараховано після синхронізації',
      es: 'El giro se añadirá después de sincronizar', 'pt-BR': 'O giro será adicionado após a sincronização',
      vi: 'Lượt quay sẽ được thêm sau khi đồng bộ', id: 'Spin akan ditambahkan setelah sinkronisasi',
      tr: 'Çevirme senkronizasyondan sonra eklenecek', pl: 'Obrót zostanie dodany po synchronizacji',
    }),
    rewardAlreadyClaimed: triLang(lang, {
      ru: 'Награда за этот уровень уже получена', uk: 'Нагороду за цей рівень уже отримано',
      es: 'Ya recibiste la recompensa de este nivel', 'pt-BR': 'A recompensa deste nível já foi recebida',
      vi: 'Bạn đã nhận thưởng của cấp độ này', id: 'Hadiah level ini sudah diterima',
      tr: 'Bu seviyenin ödülü zaten alındı', pl: 'Nagroda za ten poziom została już odebrana',
    }),
    retryCoach: triLang(lang, {
      ru: 'Повтори слабые темы — следующая попытка будет увереннее.',
      uk: 'Повтори слабкі теми — наступна спроба буде впевненішою.',
      es: 'Repasa los temas débiles y vuelve con más confianza.',
      'pt-BR': 'Revise os pontos fracos e tente de novo com mais confiança.',
      vi: 'Ôn lại các chủ đề yếu để tự tin hơn ở lần sau.',
      id: 'Ulangi topik yang lemah agar percobaan berikutnya lebih mantap.',
      tr: 'Zayıf konuları tekrarla; sonraki denemen daha güçlü olacak.',
      pl: 'Powtórz słabsze tematy — kolejna próba będzie pewniejsza.',
    }),
    primaryAction: passed
      ? triLang(lang, {
        ru: 'Продолжить обучение', uk: 'Продовжити навчання', es: 'Continuar aprendiendo', 'pt-BR': 'Continuar aprendendo',
        vi: 'Tiếp tục học', id: 'Lanjut belajar', tr: 'Öğrenmeye devam et', pl: 'Kontynuuj naukę',
      })
      : triLang(lang, {
        ru: `Повторить экзамен −${energyCost} ⚡`, uk: `Повторити іспит −${energyCost} ⚡`,
        es: `Repetir examen −${energyCost} ⚡`, 'pt-BR': `Refazer exame −${energyCost} ⚡`,
        vi: `Thi lại −${energyCost} ⚡`, id: `Ulangi ujian −${energyCost} ⚡`,
        tr: `Sınavı tekrarla −${energyCost} ⚡`, pl: `Powtórz egzamin −${energyCost} ⚡`,
      }),
    reviewAction: triLang(lang, {
      ru: 'Разобрать результат', uk: 'Розібрати результат', es: 'Revisar resultado', 'pt-BR': 'Revisar resultado',
      vi: 'Xem lại kết quả', id: 'Tinjau hasil', tr: 'Sonucu incele', pl: 'Przejrzyj wynik',
    }),
    formatLabels: {
      guess_phrase: triLang(lang, { ru: 'Ситуации', uk: 'Ситуації', es: 'Situaciones', 'pt-BR': 'Situações', vi: 'Tình huống', id: 'Situasi', tr: 'Durumlar', pl: 'Sytuacje' }),
      fill_gap: triLang(lang, { ru: 'Пропуски', uk: 'Пропуски', es: 'Huecos', 'pt-BR': 'Lacunas', vi: 'Điền từ', id: 'Kata hilang', tr: 'Boşluklar', pl: 'Luki' }),
      find_oddity: triLang(lang, { ru: 'Ошибки', uk: 'Помилки', es: 'Errores', 'pt-BR': 'Erros', vi: 'Lỗi', id: 'Kesalahan', tr: 'Hatalar', pl: 'Błędy' }),
      translate_build: triLang(lang, { ru: 'Сборка фраз', uk: 'Складання фраз', es: 'Frases', 'pt-BR': 'Frases', vi: 'Ghép câu', id: 'Susun frasa', tr: 'Cümle kurma', pl: 'Zdania' }),
      speed_match: triLang(lang, { ru: 'Быстрые пары', uk: 'Швидкі пари', es: 'Pares', 'pt-BR': 'Pares', vi: 'Ghép cặp', id: 'Pasangan', tr: 'Eşleştirme', pl: 'Pary' }),
    },
  };
}
