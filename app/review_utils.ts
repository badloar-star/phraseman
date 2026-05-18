import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang, PlannedInterfaceLang } from '../constants/i18n';

const KEY_LAST_PROMPTED = 'review_prompted_at';
const KEY_SESSIONS      = 'app_session_count';
const KEY_SHOW_COUNT    = 'review_show_count';
const KEY_RATED         = 'review_user_rated';
const COOLDOWN_DAYS     = 30;
const MIN_SESSIONS      = 5;
const MAX_SHOWS         = 3;

export type ReviewContext = 'general' | 'perfect_lesson' | 'arena_win';

export interface ReviewVariant {
  emoji: string;
  title: string;
  subtitle: string;
  btnYes: string;
  btnNo: string;
}

type Loc3 = { ru: string; uk: string; es: string } & Record<PlannedInterfaceLang, string>;

function pickLoc<T extends Loc3>(row: T, lang: Lang): string {
  if (lang === 'uk') return row.uk;
  if (lang === 'es') return row.es;
  return row.ru;
}

function localizeVariant(v: {
  emoji: string;
  title: Loc3;
  subtitle: Loc3;
  btnYes: Loc3;
  btnNo: Loc3;
}, lang: Lang): ReviewVariant {
  return {
    emoji: v.emoji,
    title: pickLoc(v.title, lang),
    subtitle: pickLoc(v.subtitle, lang),
    btnYes: pickLoc(v.btnYes, lang),
    btnNo: pickLoc(v.btnNo, lang),
  };
}

/** Контекстные варианты — ru / uk / es */
const CONTEXTUAL: Record<'perfect_lesson' | 'arena_win', {
  emoji: string;
  title: Loc3;
  subtitle: Loc3;
  btnYes: Loc3;
  btnNo: Loc3;
}> = {
  perfect_lesson: {
    emoji: '🎯',
    title: {
      ru: 'Ноль ошибок. Серьёзно?',
      uk: 'Нуль помилок. Серйозно?',
      es: '¿Cero errores? ¿En serio?',
      'pt-BR': 'Zero erros. Sério?',
      vi: 'Không lỗi nào. Thật sao?',
      id: 'Nol kesalahan. Serius?',
      tr: 'Sıfır hata. Ciddi misin?',
      pl: 'Zero błędów. Serio?',
    },
    subtitle: {
      ru: 'Ты только что прошёл урок идеально. Такие люди обычно и пишут лучшие отзывы. Совпадение?',
      uk: 'Ти щойно пройшов урок ідеально. Такі люди зазвичай пишуть найкращі відгуки. Випадковість?',
      es: 'Acabas de terminar la lección sin fallos: quienes logran eso suelen dejar las mejores reseñas. ¿Casualidad?',
      'pt-BR': 'Você acabou de concluir a lição sem erros. Gente assim costuma escrever as melhores avaliações. Coincidência?',
      vi: 'Bạn vừa hoàn thành bài học không lỗi nào. Những người như vậy thường viết đánh giá hay nhất. Trùng hợp sao?',
      id: 'Kamu baru saja menyelesaikan pelajaran tanpa salah. Orang seperti itu biasanya menulis ulasan terbaik. Kebetulan?',
      tr: 'Dersi az önce hatasız bitirdin. Böyle insanlar genelde en iyi yorumları yazar. Tesadüf mü?',
      pl: 'Właśnie ukończyłeś lekcję bez błędów. Tacy ludzie zwykle piszą najlepsze recenzje. Przypadek?',
    },
    btnYes: {
      ru: 'Написать отзыв',
      uk: 'Написати відгук',
      es: 'Escribir reseña',
      'pt-BR': 'Escrever avaliação',
      vi: 'Viết đánh giá',
      id: 'Tulis ulasan',
      tr: 'Yorum yaz',
      pl: 'Napisz recenzję',
    },
    btnNo: {
      ru: 'Случайно получилось',
      uk: 'Випадково вийшло',
      es: 'Fue sin querer',
      'pt-BR': 'Foi sem querer',
      vi: 'Chỉ là vô tình thôi',
      id: 'Tidak sengaja',
      tr: 'Yanlışlıkla oldu',
      pl: 'To był przypadek',
    },
  },
  arena_win: {
    emoji: '⚔️',
    title: {
      ru: 'Победитель! Теперь финальный босс',
      uk: 'Переможець! Тепер фінальний бос',
      es: '¡Victoria! El último desafío',
      'pt-BR': 'Vitória! Agora o chefe final',
      vi: 'Chiến thắng! Giờ là trùm cuối',
      id: 'Pemenang! Sekarang bos terakhir',
      tr: 'Kazandın! Şimdi son bölüm canavarı',
      pl: 'Zwycięzca! Teraz finałowy boss',
    },
    subtitle: {
      ru: '',
      uk: '',
      es: '',
      'pt-BR': '',
      vi: '',
      id: '',
      tr: '',
      pl: '',
    },
    btnYes: {
      ru: 'Победить!',
      uk: 'Перемогти!',
      es: '¡A por ello!',
      'pt-BR': 'Vencer!',
      vi: 'Chiến thôi!',
      id: 'Menang!',
      tr: 'Kazan!',
      pl: 'Wygrać!',
    },
    btnNo: {
      ru: 'Мне хватит одной победы',
      uk: 'Мені вистачить однієї перемоги',
      es: 'Con una victoria me basta',
      'pt-BR': 'Uma vitória já basta',
      vi: 'Một chiến thắng là đủ rồi',
      id: 'Satu kemenangan cukup',
      tr: 'Bir zafer bana yeter',
      pl: 'Jedno zwycięstwo mi wystarczy',
    },
  },
};

const GENERAL_VARIANTS: Array<{
  emoji: string;
  title: Loc3;
  subtitle: Loc3;
  btnYes: Loc3;
  btnNo: Loc3;
}> = [
  {
    emoji: '🗝️',
    title: {
      ru: 'Секретный уровень: Признание',
      uk: 'Секретний рівень: Визнання',
      es: 'Nivel secreto: reconocimiento',
      'pt-BR': 'Nível secreto: Reconhecimento',
      vi: 'Cấp bí mật: Công nhận',
      id: 'Level rahasia: Pengakuan',
      tr: 'Gizli seviye: Takdir',
      pl: 'Sekretny poziom: Uznanie',
    },
    subtitle: {
      ru: 'Мы тут поспорили, нравится тебе Phraseman или ты просто зашёл посмотреть на шрифты. Рассудишь нас?',
      uk: 'Ми сперечаємось: тобі подобається Phraseman чи ти просто зайшов подивитися на шрифти. Ти вирішиш?',
      es: 'Discutimos si de verdad te gusta Phraseman o si solo entraste a mirar la interfaz. ¿Nos das tu veredicto?',
      'pt-BR': 'A gente discutiu se você gosta mesmo do Phraseman ou só veio olhar as fontes. Decide por nós?',
      vi: 'Bọn mình đang tranh luận: bạn thật sự thích Phraseman hay chỉ vào xem phông chữ. Bạn phân xử nhé?',
      id: 'Kami sedang berdebat: kamu suka Phraseman atau cuma mampir melihat font. Bisa jadi juri?',
      tr: 'Phraseman gerçekten hoşuna mı gidiyor, yoksa sadece yazı tiplerine mi bakıyorsun diye tartışıyoruz. Bizi hakemler misin?',
      pl: 'Spieramy się, czy naprawdę lubisz Phraseman, czy tylko zaglądasz popatrzeć na fonty. Rozstrzygniesz?',
    },
    btnYes: {
      ru: 'Обожаю!',
      uk: 'Обожнюю!',
      es: '¡Me encanta!',
      'pt-BR': 'Adoro!',
      vi: 'Mình thích lắm!',
      id: 'Suka banget!',
      tr: 'Bayılıyorum!',
      pl: 'Uwielbiam!',
    },
    btnNo: {
      ru: 'Я просто смотрю',
      uk: 'Я просто дивлюся',
      es: 'Solo estoy mirando',
      'pt-BR': 'Só estou olhando',
      vi: 'Mình chỉ đang xem thôi',
      id: 'Cuma lihat-lihat',
      tr: 'Sadece bakıyorum',
      pl: 'Tylko się rozglądam',
    },
  },
  {
    emoji: '👋',
    title: {
      ru: 'Дай пять?',
      uk: 'Дай п\'ять?',
      es: '¿Chocamos?',
      'pt-BR': 'Toca aqui?',
      vi: 'Đập tay nhé?',
      id: 'Tos dulu?',
      tr: 'Çak bir beşlik?',
      pl: 'Przybij piątkę?',
    },
    subtitle: {
      ru: 'Пять звёзд, конечно. Нам будет дико приятно, а тебе — плюс к удаче в следующем уроке.',
      uk: 'П\'ять зірок, звісно. Нам буде дуже приємно, а тобі — плюс до удачі в наступному уроці.',
      es: 'Cinco estrellas, claro. Nos haría muchísima ilusión… y puede que te den suerte en la próxima lección.',
      'pt-BR': 'Cinco estrelas, claro. A gente vai ficar muito feliz, e você ganha um pouco mais de sorte na próxima lição.',
      vi: 'Năm sao, tất nhiên rồi. Bọn mình sẽ rất vui, còn bạn thì thêm chút may mắn cho bài học tiếp theo.',
      id: 'Lima bintang, tentu saja. Kami akan senang sekali, dan kamu dapat sedikit keberuntungan untuk pelajaran berikutnya.',
      tr: 'Beş yıldız tabii. Biz çok mutlu oluruz, sana da sonraki derste biraz şans eklenir.',
      pl: 'Pięć gwiazdek, oczywiście. Nam będzie bardzo miło, a tobie może dopisze szczęście w następnej lekcji.',
    },
    btnYes: {
      ru: 'Даю пять!',
      uk: 'Даю п\'ять!',
      es: '¡Ahí va!',
      'pt-BR': 'Toca aqui!',
      vi: 'Đập tay!',
      id: 'Tos!',
      tr: 'Çaktım!',
      pl: 'Przybijam!',
    },
    btnNo: {
      ru: 'Пока не готов(а)',
      uk: 'Поки не готов(а)',
      es: 'Aún no estoy listo/a',
      'pt-BR': 'Ainda não estou pronto/a',
      vi: 'Mình chưa sẵn sàng',
      id: 'Belum siap',
      tr: 'Henüz hazır değilim',
      pl: 'Jeszcze nie jestem gotowy/a',
    },
  },
  {
    emoji: '🚫',
    title: {
      ru: 'Не нажимай на эту кнопку!',
      uk: 'Не тисни на цю кнопку!',
      es: '¡No pulses este botón!',
      'pt-BR': 'Não toque neste botão!',
      vi: 'Đừng bấm nút này!',
      id: 'Jangan tekan tombol ini!',
      tr: 'Bu düğmeye basma!',
      pl: 'Nie naciskaj tego przycisku!',
    },
    subtitle: {
      ru: 'Ладно, шучу. Нажимай. Там можно поставить 5 звёзд и сделать одного разработчика абсолютно счастливым человеком.',
      uk: 'Гаразд, жартую. Тисни. Там можна поставити 5 зірок і зробити одного розробника щасливою людиною.',
      es: 'Broma: adelante. Ahí puedes darnos 5 estrellas y alegrarle el día a un desarrollador.',
      'pt-BR': 'Tá, brincadeira. Pode tocar. Lá dá para deixar 5 estrelas e tornar uma pessoa desenvolvedora absurdamente feliz.',
      vi: 'Đùa thôi. Bấm đi. Ở đó bạn có thể cho 5 sao và làm một lập trình viên cực kỳ hạnh phúc.',
      id: 'Oke, bercanda. Tekan saja. Di sana kamu bisa memberi 5 bintang dan membuat satu developer sangat bahagia.',
      tr: 'Tamam, şaka yaptım. Basabilirsin. Orada 5 yıldız verip bir geliştiriciyi aşırı mutlu edebilirsin.',
      pl: 'Dobra, żartuję. Naciśnij. Możesz tam dać 5 gwiazdek i uszczęśliwić jednego dewelopera.',
    },
    btnYes: {
      ru: 'Сделать счастливым',
      uk: 'Зробити щасливим',
      es: 'Hacer feliz a alguien',
      'pt-BR': 'Fazer alguém feliz',
      vi: 'Làm ai đó vui',
      id: 'Buat seseorang bahagia',
      tr: 'Birini mutlu et',
      pl: 'Uszczęśliw kogoś',
    },
      btnNo: {
      ru: 'Я люблю ломать правила',
      uk: 'Я люблю ламати правила',
      es: 'Me gusta romper las reglas',
      'pt-BR': 'Gosto de quebrar regras',
      vi: 'Mình thích phá luật',
      id: 'Aku suka melanggar aturan',
      tr: 'Kuralları bozmayı severim',
      pl: 'Lubię łamać zasady',
    },
  },
];

/** lang — язык интерфейса для всех текстов модалки. */
export const getReviewVariant = async (
  context: ReviewContext,
  lang: Lang = 'ru'
): Promise<ReviewVariant> => {
  if (context === 'perfect_lesson') return localizeVariant(CONTEXTUAL.perfect_lesson, lang);
  if (context === 'arena_win') {
    return localizeVariant(
      {
        emoji: CONTEXTUAL.arena_win.emoji,
        title: CONTEXTUAL.arena_win.title,
        subtitle: {
          ru: 'Ты только что выиграл матч. Поставь нам 5 звёзд в магазине приложения.',
          uk: 'Ти щойно виграв матч. Постав нам 5 зірок у магазині застосунку.',
          es: 'Acabas de ganar el duelo. Déjanos 5 estrellas en la tienda de la app.',
      'pt-BR': 'Você acabou de vencer um duelo. Deixe 5 estrelas para nós na loja do app.',
      vi: 'Bạn vừa thắng một trận. Hãy cho bọn mình 5 sao trong cửa hàng ứng dụng nhé.',
      id: 'Kamu baru saja menang duel. Beri kami 5 bintang di toko aplikasi.',
      tr: 'Az önce düelloyu kazandın. Uygulama mağazasında bize 5 yıldız bırak.',
      pl: 'Właśnie wygrałeś pojedynek. Daj nam 5 gwiazdek w sklepie z aplikacjami.',
        },
        btnYes: CONTEXTUAL.arena_win.btnYes,
        btnNo: CONTEXTUAL.arena_win.btnNo,
      },
      lang,
    );
  }
  const raw = await AsyncStorage.getItem(KEY_SHOW_COUNT).catch(() => null);
  const idx = (parseInt(raw || '0')) % GENERAL_VARIANTS.length;
  return localizeVariant(GENERAL_VARIANTS[idx], lang);
};

export const incrementSessionCount = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSIONS);
    const n = parseInt(raw || '0') + 1;
    await AsyncStorage.setItem(KEY_SESSIONS, String(n));
  } catch {}
};

export const canShowReview = async (): Promise<boolean> => {
  try {
    const [sessRaw, lastRaw, ratedRaw, showCountRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_SESSIONS),
      AsyncStorage.getItem(KEY_LAST_PROMPTED),
      AsyncStorage.getItem(KEY_RATED),
      AsyncStorage.getItem(KEY_SHOW_COUNT),
    ]);
    if (ratedRaw === '1') return false;
    const sessions = parseInt(sessRaw || '0');
    if (sessions < MIN_SESSIONS) return false;
    const showCount = parseInt(showCountRaw || '0');
    if (showCount >= MAX_SHOWS) return false;
    if (lastRaw) {
      const daysSince = (Date.now() - parseInt(lastRaw)) / (1000 * 60 * 60 * 24);
      if (daysSince < COOLDOWN_DAYS) return false;
    }
    return true;
  } catch { return false; }
};

/** Вызывать когда пользователь нажал "Да" — помечает как оценившего навсегда. */
export const markReviewRated = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.setItem(KEY_RATED, '1'),
      AsyncStorage.setItem(KEY_LAST_PROMPTED, String(Date.now())),
    ]);
  } catch {}
};

/** Вызывать когда показали диалог (независимо от ответа) — увеличивает счётчик показов. */
export const markReviewPrompted = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEY_SHOW_COUNT);
    const n = parseInt(raw || '0') + 1;
    await Promise.all([
      AsyncStorage.setItem(KEY_SHOW_COUNT, String(n)),
      AsyncStorage.setItem(KEY_LAST_PROMPTED, String(Date.now())),
    ]);
  } catch {}
};

export const requestNativeReview = async (): Promise<void> => {
  try {
    const StoreReview = require('expo-store-review') as {
      hasAction: () => Promise<boolean>;
      requestReview: () => Promise<void>;
    };
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    }
  } catch {}
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
