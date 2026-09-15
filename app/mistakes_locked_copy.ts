import { triLang, type Lang } from '../constants/i18n';
import { HOME_MISTAKES_UNLOCK_AT } from './home_mistakes_pulse_model';

/**
 * Текст закрытого раздела ошибок.
 *
 * зачем (владелец 2026-09-15): «пока там нет 10 ошибок, раздел нельзя открыть;
 * кнопка есть, но при нажатии небольшой текст с юмором — типа там пока так мало
 * ошибок, что даже нет смысла разбираться, попробуй ошибаться чаще».
 *
 * Тон: шутка должна читаться как шутка, иначе прозвучит как совет портить себе
 * учёбу. Поэтому «ошибайся чаще» идёт с явной оговоркой, что это не всерьёз.
 */

export type MistakesLockedCopy = Readonly<{
  title: string;
  body: string;
  action: string;
}>;

export function mistakesLockedCopy(lang: Lang, count: number): MistakesLockedCopy {
  const left = Math.max(0, HOME_MISTAKES_UNLOCK_AT - Math.max(0, Math.floor(count)));
  return triLang(lang, {
    ru: {
      title: 'Тут пока нечего разбирать',
      body: count < 1
        ? `Ошибок нет совсем. Разбор откроется, когда их наберётся ${HOME_MISTAKES_UNLOCK_AT} — так что пока просто занимайтесь.`
        : `Ошибок так мало, что разбирать нечего. Осталось набрать ещё ${left}. Можно, конечно, начать ошибаться почаще, но мы такого не советуем.`,
      action: 'Понятно',
    },
    uk: {
      title: 'Тут поки нема чого розбирати',
      body: count < 1
        ? `Помилок немає зовсім. Розбір відкриється, коли їх набереться ${HOME_MISTAKES_UNLOCK_AT} — тож поки просто займайтеся.`
        : `Помилок так мало, що розбирати нічого. Лишилося набрати ще ${left}. Можна, звісно, почати помилятися частіше, але ми такого не радимо.`,
      action: 'Зрозуміло',
    },
    en: {
      title: 'Nothing to work on yet',
      body: count < 1
        ? `You have no mistakes at all. Practice opens once there are ${HOME_MISTAKES_UNLOCK_AT} of them, so just keep studying.`
        : `There are so few mistakes that there is nothing to work on. ${left} more to go. You could start making them on purpose, but we would rather you did not.`,
      action: 'Got it',
    },
    es: {
      title: 'Aquí todavía no hay nada que repasar',
      body: count < 1
        ? `No tienes ningún error. El repaso se abre al llegar a ${HOME_MISTAKES_UNLOCK_AT}, así que sigue practicando.`
        : `Hay tan pocos errores que no hay nada que repasar. Faltan ${left}. Podrías empezar a fallar más a propósito, pero mejor no.`,
      action: 'Entendido',
    },
    'pt-BR': {
      title: 'Ainda não há o que revisar',
      body: count < 1
        ? `Você não tem nenhum erro. A revisão abre quando houver ${HOME_MISTAKES_UNLOCK_AT} deles, então siga estudando.`
        : `São tão poucos erros que não há o que revisar. Faltam ${left}. Dá para começar a errar de propósito, mas é melhor não.`,
      action: 'Entendi',
    },
    vi: {
      title: 'Chưa có gì để luyện',
      body: count < 1
        ? `Bạn chưa có lỗi nào. Phần luyện tập mở khi có ${HOME_MISTAKES_UNLOCK_AT} lỗi, nên cứ học tiếp nhé.`
        : `Lỗi ít quá, chưa có gì để luyện. Còn thiếu ${left}. Bạn có thể cố sai thêm, nhưng chúng tôi không khuyên vậy đâu.`,
      action: 'Đã hiểu',
    },
    id: {
      title: 'Belum ada yang perlu dibahas',
      body: count < 1
        ? `Kamu belum punya kesalahan sama sekali. Latihan terbuka setelah ada ${HOME_MISTAKES_UNLOCK_AT}, jadi lanjutkan belajar saja.`
        : `Kesalahannya terlalu sedikit untuk dibahas. Kurang ${left} lagi. Boleh saja mulai salah lebih sering, tapi kami tidak menyarankannya.`,
      action: 'Paham',
    },
    tr: {
      title: 'Burada henüz çalışacak bir şey yok',
      body: count < 1
        ? `Hiç hatan yok. Çalışma ${HOME_MISTAKES_UNLOCK_AT} hata birikince açılır, o yüzden çalışmaya devam.`
        : `Hata o kadar az ki çalışacak bir şey yok. ${left} tane daha lazım. İstersen bilerek hata yapabilirsin ama tavsiye etmeyiz.`,
      action: 'Anladım',
    },
    pl: {
      title: 'Nie ma tu jeszcze czego ćwiczyć',
      body: count < 1
        ? `Nie masz żadnych błędów. Powtórka otworzy się przy ${HOME_MISTAKES_UNLOCK_AT} błędach, więc po prostu ucz się dalej.`
        : `Błędów jest tak mało, że nie ma czego ćwiczyć. Brakuje jeszcze ${left}. Można zacząć mylić się częściej, ale raczej odradzamy.`,
      action: 'Jasne',
    },
  });
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
