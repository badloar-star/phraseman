import type { Lang } from '../../constants/i18n';

export type QuizShareLang = 'ru' | 'uk' | 'es';

export type RankInfo = {
  icon: string;
  labelRU: string;
  labelUK: string;
  labelES: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
  color: string;
};

function pickRandom(values: string[]): string {
  return values[Math.floor(Math.random() * values.length)];
}

/** Язык шаринг-текста квиза по языку интерфейса */
export function quizShareMessageLang(lang: Lang): QuizShareLang {
  if (lang === 'uk') return 'uk';
  if (lang === 'es') return 'es';
  return 'ru';
}

export function getQuizRankInfo(pct: number, neutralColor: string, mutedColor: string): RankInfo {
  if (pct === 100) {
    return {
      icon: '🏆',
      labelRU: pickRandom(['Безупречно!', 'Идеально!', 'Гений!', 'Просто огонь! 🔥', 'Легенда!']),
      labelUK: pickRandom(['Бездоганно!', 'Ідеально!', 'Геній!', 'Просто вогонь! 🔥', 'Легенда!']),
      labelES: pickRandom([
        '¡Impecable!',
        '¡Perfecto!',
        '¡Genial!',
        '¡Qué nivel! 🔥',
        '¡Leyenda!',
      ]),
      labelPtBr: pickRandom(['Impecável!', 'Perfeito!', 'Genial!', 'Que nível! 🔥', 'Lenda!']),
      labelVi: pickRandom(['Hoàn hảo!', 'Tuyệt đối!', 'Thiên tài!', 'Quá đỉnh! 🔥', 'Huyền thoại!']),
      labelId: pickRandom(['Sempurna!', 'Luar biasa!', 'Hebat!', 'Keren banget! 🔥', 'Legenda!']),
      labelTr: pickRandom(['Kusursuz!', 'Mükemmel!', 'Dahi!', 'Seviye bu! 🔥', 'Efsane!']),
      labelPl: pickRandom(['Bezbłędnie!', 'Idealnie!', 'Geniusz!', 'Ale poziom! 🔥', 'Legenda!']),
      color: '#D4A017',
    };
  }
  if (pct >= 90) {
    return {
      icon: '🥇',
      labelRU: pickRandom(['Отлично!', 'Великолепно!', 'Ты машина!', 'Так держать!', 'Мощно!']),
      labelUK: pickRandom(['Відмінно!', 'Чудово!', 'Ти машина!', 'Так тримати!', 'Потужно!']),
      labelES: pickRandom([
        '¡Excelente!',
        '¡Magnífico!',
        '¡Eres una máquina!',
        '¡Así se hace!',
        '¡Impresionante!',
      ]),
      labelPtBr: pickRandom(['Excelente!', 'Magnífico!', 'Você é uma máquina!', 'Continue assim!', 'Muito forte!']),
      labelVi: pickRandom(['Xuất sắc!', 'Tuyệt vời!', 'Bạn quá chiến!', 'Cứ thế nhé!', 'Mạnh lắm!']),
      labelId: pickRandom(['Luar biasa!', 'Hebat!', 'Kamu mesin!', 'Pertahankan!', 'Mantap!']),
      labelTr: pickRandom(['Harika!', 'Muhteşem!', 'Makine gibisin!', 'Böyle devam!', 'Çok güçlü!']),
      labelPl: pickRandom(['Świetnie!', 'Znakomicie!', 'Jesteś maszyną!', 'Tak trzymaj!', 'Mocno!']),
      color: '#D4A017',
    };
  }
  if (pct >= 70) {
    return {
      icon: '🥈',
      labelRU: pickRandom(['Хорошо!', 'Неплохо!', 'Молодец!', 'Растешь!', 'Продолжай!']),
      labelUK: pickRandom(['Добре!', 'Непогано!', 'Молодець!', 'Зростаєш!', 'Продовжуй!']),
      labelES: pickRandom([
        '¡Bien!',
        '¡No está mal!',
        '¡Buen trabajo!',
        '¡Vas mejorando!',
        '¡Sigue así!',
      ]),
      labelPtBr: pickRandom(['Bom!', 'Nada mal!', 'Mandou bem!', 'Você está evoluindo!', 'Continue!']),
      labelVi: pickRandom(['Tốt!', 'Không tệ!', 'Làm tốt lắm!', 'Bạn đang tiến bộ!', 'Tiếp tục nhé!']),
      labelId: pickRandom(['Bagus!', 'Lumayan!', 'Kerja bagus!', 'Kamu berkembang!', 'Teruskan!']),
      labelTr: pickRandom(['İyi!', 'Fena değil!', 'Aferin!', 'Gelişiyorsun!', 'Devam et!']),
      labelPl: pickRandom(['Dobrze!', 'Nieźle!', 'Dobra robota!', 'Robisz postępy!', 'Kontynuuj!']),
      color: neutralColor,
    };
  }
  if (pct >= 50) {
    return {
      icon: '🥉',
      labelRU: pickRandom(['Неплохо', 'Можно лучше!', 'Еще немного!', 'Почти!']),
      labelUK: pickRandom(['Непогано', 'Можна краще!', 'Ще трохи!', 'Майже!']),
      labelES: pickRandom([
        'No está mal',
        '¡Se puede mejorar!',
        '¡Un poco más!',
        '¡Casi!',
        '¡Tú puedes!',
      ]),
      labelPtBr: pickRandom(['Nada mal', 'Dá para melhorar!', 'Mais um pouco!', 'Quase!']),
      labelVi: pickRandom(['Không tệ', 'Có thể tốt hơn!', 'Thêm chút nữa!', 'Gần rồi!']),
      labelId: pickRandom(['Lumayan', 'Bisa lebih baik!', 'Sedikit lagi!', 'Hampir!']),
      labelTr: pickRandom(['Fena değil', 'Daha iyi olabilir!', 'Biraz daha!', 'Neredeyse!']),
      labelPl: pickRandom(['Nieźle', 'Może być lepiej!', 'Jeszcze trochę!', 'Prawie!']),
      color: neutralColor,
    };
  }
  return {
    icon: '📚',
    labelRU: pickRandom(['Практикуйся!', 'Не сдавайся!', 'Повтори и попробуй снова!', 'Учимся!']),
    labelUK: pickRandom(['Тренуйся!', 'Не здавайся!', 'Повтори і спробуй знову!', 'Навчаємось!']),
    labelES: pickRandom([
      '¡Sigue practicando!',
      '¡No te rindas!',
      '¡Repasa e inténtalo de nuevo!',
      '¡A estudiar!',
    ]),
    labelPtBr: pickRandom(['Pratique mais!', 'Não desista!', 'Revise e tente de novo!', 'Vamos aprender!']),
    labelVi: pickRandom(['Luyện thêm nhé!', 'Đừng bỏ cuộc!', 'Ôn lại rồi thử lại!', 'Cùng học tiếp!']),
    labelId: pickRandom(['Terus berlatih!', 'Jangan menyerah!', 'Ulangi dan coba lagi!', 'Ayo belajar!']),
    labelTr: pickRandom(['Pratik yap!', 'Pes etme!', 'Tekrar et ve yeniden dene!', 'Öğreniyoruz!']),
    labelPl: pickRandom(['Ćwicz dalej!', 'Nie poddawaj się!', 'Powtórz i spróbuj ponownie!', 'Uczymy się!']),
    color: mutedColor,
  };
}

/** Same tiers as getQuizRankInfo, fixed copy for text sharing. */
export function getQuizShareRank(
  pct: number,
  neutralColor: string,
  mutedColor: string,
  lang: QuizShareLang
): { icon: string; label: string; color: string } {
  if (pct === 100) {
    const label =
      lang === 'uk' ? 'Бездоганно!' : lang === 'es' ? '¡Impecable!' : 'Безупречно!';
    return { icon: '🏆', label, color: '#D4A017' };
  }
  if (pct >= 90) {
    const label =
      lang === 'uk' ? 'Відмінно!' : lang === 'es' ? '¡Excelente!' : 'Отлично!';
    return { icon: '🥇', label, color: '#D4A017' };
  }
  if (pct >= 70) {
    const label =
      lang === 'uk' ? 'Добре!' : lang === 'es' ? '¡Bien!' : 'Хорошо!';
    return { icon: '🥈', label, color: neutralColor };
  }
  if (pct >= 50) {
    const label =
      lang === 'uk' ? 'Непогано' : lang === 'es' ? 'No está mal' : 'Неплохо';
    return { icon: '🥉', label, color: neutralColor };
  }
  const label =
    lang === 'uk' ? 'Тренуйся!' : lang === 'es' ? '¡Sigue practicando!' : 'Практикуйся!';
  return { icon: '📚', label, color: mutedColor };
}

export function buildQuizShareMessage(
  lang: QuizShareLang,
  right: number,
  total: number,
  pct: number,
  rankIcon: string,
  storeUrl: string
): string {
  const variantsRu = [
    `Мой мозг официально прокачан на ${pct}%! Прошёл вызов в Phraseman (${right}/${total}). Шекспир бы мной гордился. 🎩`,
    `${right} из ${total} правильных ответов! В Phraseman я просто машина. Кто рискнет побить мой рекорд? 🤖💥`,
    `Почти идеально! ${pct}% правильных в вызове Phraseman. Английский сам себя не выучит, а я — учу! ⚡️`,
    `Вызов в Phraseman пройден на ${pct}%! Мой английский прогрессирует быстрее, чем я успеваю это осознать. 🚀`,
    `${right} из ${total}. Математика говорит, что я молодец, а Phraseman подтверждает! 📊🔥`,
    `Мои нейроны только что устроили вечеринку! 🎉 Результат вызова в Phraseman — ${pct}%.`,
    `Мой IQ только что вырос на глазах! 🧠 Прошёл вызов в Phraseman на ${pct}%. Кто-нибудь, дайте мне корону! 👑`,
    `Вызов уничтожен! ${right}/${total} правильных в Phraseman. 🤖 Я просто машина!`,
    `${pct}% успеха в вызове Phraseman! 🎯 Мой английский передаёт всем привет.`,
    `Прошёл вызов в Phraseman — ${right}/${total} (${pct}%) ${rankIcon}`,
  ];
  const variantsUk = [
    `Мій мозок офіційно прокачаний на ${pct}%! Пройшов квіз у Phraseman (${right}/${total}). Шекспір би мною пишався. 🎩`,
    `${right} із ${total} правильних відповідей! У Phraseman я просто машина. Хто ризикне побити мій рекорд? 🤖💥`,
    `Майже ідеально! ${pct}% правильних у квізі Phraseman. Англійська сама себе не вивчить, а я - вчу! ⚡️`,
    `Квіз у Phraseman пройдено на ${pct}%! Моя англійська прогресує швидше, ніж я встигаю це усвідомити. 🚀`,
    `${right} із ${total}. Математика каже, що я молодець, а Phraseman підтверджує! 📊🔥`,
    `Мої нейрони щойно влаштували вечірку! 🎉 Результат квізу у Phraseman - ${pct}%.`,
    `Мій IQ щойно виріс на очах! 🧠 Пройшов квіз у Phraseman на ${pct}%. Хто-небудь, дайте мені корону! 👑`,
    `Квіз знищено! ${right}/${total} правильних у Phraseman. 🤖 Я просто машина з перекладу текстів!`,
    `${pct}% успіху у квізі Phraseman! 🎯 Моя англійська передає всім привіт.`,
    `Пройшов квіз у Phraseman - ${right}/${total} (${pct}%) ${rankIcon}`,
  ];
  const variantsEs = [
    `¡${pct}% en Phraseman (${right}/${total})! Hasta Shakespeare estaría orgulloso de mí. 🎩`,
    `¡${right} de ${total} correctas! En Phraseman voy imbatible. ¿Quién se atreve a superarme? 🤖💥`,
    `¡Casi perfecto! ${pct}% de aciertos en el cuestionario de Phraseman. El inglés no se aprende solo: sigo practicando. ⚡️`,
    `Cuestionario de Phraseman al ${pct}%: mi inglés avanza más rápido de lo que creo. 🚀`,
    `${right} de ${total}. Las cuentas cuadran: voy bien y Phraseman lo confirma. 📊🔥`,
    `¡Fiesta en las neuronas! 🎉 Resultado en Phraseman: ${pct}%.`,
    `¡Subidón de IQ! Cuestionario de Phraseman al ${pct}%. ¡Dame la corona! 👑`,
    `¡Cuestionario completado! ${right}/${total} en Phraseman. 🤖`,
    `¡${pct}% en Phraseman! 🎯 Mi inglés va ganando terreno.`,
    `Cuestionario de Phraseman: ${right}/${total} (${pct}%) ${rankIcon}`,
  ];
  const pool =
    lang === 'uk' ? variantsUk : lang === 'es' ? variantsEs : variantsRu;
  return `${pickRandom(pool)}\n${storeUrl}`;
}

/* expo-router route shim: keeps utility module from warning as route */
export default function __RouteShim() {
  return null;
}
