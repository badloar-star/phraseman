/**
 * Забавные тексты-заглушки для случаев, когда ИИ недоступен. Три источника:
 *  1) глобальный рубильник (remote flag `ai_global_disable`, см. app/remote_flags.ts);
 *  2) глобальный бюджет ИИ иссяк (кончились токены у сервиса на всех сразу);
 *  3) любая другая ошибка ИИ (таймаут / сеть / сбой сервера).
 * Плюс личный дневной лимит юзера — забавный текст + кнопка Plus.
 *
 * Два слоя поведения (задаются вызывающим кодом, не здесь):
 *  • РУЧНЫЕ вызовы ИИ (юзер сам нажал «объясни» / зашёл в диалог) → показываем
 *    забавную плашку/экран-заглушку из этого модуля.
 *  • ФОНОВЫЕ/АВТО вызовы → тихо ничего не показываем (эти строки не используются).
 *
 *
 * Тон — конкретные абсурдные сценки (таракан размером с чемодан, шеф уронил словарь
 * глаголов в суп, голубь потерял письмо), а НЕ «ИИ устал». На каждую ситуацию —
 * несколько вариантов, из которых при показе выбирается случайный.
 *
 * Все строки — на 8 языках приложения через triLang (единый контракт локализации).
 */
import { triLang } from '../constants/i18n';
import { isAiGloballyDisabled } from './remote_flags';

/** Категория диалоговой ситуации (зеркало DialogScenarioCategory). */
export type AiOfflineDialogCategory = 'everyday' | 'travel' | 'social';

/** Короткая плашка-тост для ручного ИИ-действия. */
export interface AiOfflineToast {
  title: string;
  message: string;
}

/** Полноэкранная заглушка на входе в диалог/миссию. */
export interface AiOfflineScreen {
  title: string;
  message: string;
}

/** Строки одного текста на всех 8 языках приложения (контракт triLang). */
type MultiLangText = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

/** Пара «заголовок + сообщение» на всех языках (до локализации). */
type MultiLangPair = {
  title: MultiLangText;
  message: MultiLangText;
};

/**
 * Случайный индекс варианта. Отдельная функция — чтобы при желании подменить в
 * тестах и чтобы точка «недетерминизма» была одна.
 */
function pickIndex(count: number): number {
  if (count <= 1) return 0;
  return Math.floor(Math.random() * count);
}

/** Локализует случайный вариант из набора пар. */
function localizeRandom(lang: string, variants: readonly MultiLangPair[]): AiOfflineToast {
  const L = lang as Parameters<typeof triLang>[0];
  const chosen = variants[pickIndex(variants.length)] ?? variants[0];
  return {
    title: triLang(L, chosen.title),
    message: triLang(L, chosen.message),
  };
}

/** Единая точка: выключен ли ИИ прямо сейчас (реэкспорт для удобства импорта). */
export function aiOffline(): boolean {
  return isAiGloballyDisabled();
}

/** Код ошибки, который сервер бросает при активном рубильнике (см. functions). */
export const AI_OFFLINE_ERROR_CODE = 'ai_globally_disabled';

/**
 * Распознаёт серверный отказ по рубильнику ИИ (fallback, если клиентский гейт
 * не сработал — напр. флаг переключили между проверкой и вызовом).
 */
export function isAiOfflineError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return message.includes(AI_OFFLINE_ERROR_CODE);
}

/** Ошибка, которую клиентские ИИ-обёртки бросают, когда рубильник активен. */
export class AiOfflineError extends Error {
  constructor() {
    super(AI_OFFLINE_ERROR_CODE);
    this.name = 'AiOfflineError';
  }
}

/**
 * Код серверной ошибки при исчерпании ГЛОБАЛЬНОГО дневного бюджета ИИ (кончились
 * токены сервиса на всех сразу) — см. functions/src/explain/explain_budget.ts,
 * `enforceGlobalBudget()` бросает HttpsError('resource-exhausted', 'explain_global_budget').
 * Это НЕ личный лимит юзера ('explain_free_daily_limit') и НЕ рубильник.
 */
export const AI_GLOBAL_BUDGET_ERROR_CODE = 'explain_global_budget';

/** Распознаёт исчерпание глобального бюджета ИИ (на всех пользователей сразу). */
export function isAiGlobalBudgetError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return message.includes(AI_GLOBAL_BUDGET_ERROR_CODE);
}

/**
 * Плашки по фичам. Ключ — короткий id ручного ИИ-действия. Каждый вызов ИИ
 * подставляет свой ключ; текст «Компас отдыхает» под конкретную ситуацию.
 */
export type AiOfflineToastKey =
  | 'explain' // объясни фразу / ошибку / вариант / викторину
  | 'compass_voice' // комментарий дня
  | 'speaking'; // голосовая практика и проверка произношения

const EXPLAIN_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Компас прилёг подремать',
      en: 'Compass took a nap',
      uk: 'Компас приліг подрімати',
      es: 'Compass se echó una siesta',
      'pt-BR': 'Compass tirou uma soneca',
      vi: 'Compass đang chợp mắt',
      id: 'Compass lagi tidur siang',
      tr: 'Compass kestirmeye yattı',
      pl: 'Compass uciął sobie drzemkę',
    },
    message: {
      ru: 'Уснул под пальмой. Разбор будет позже 🌴',
      en: 'Dozed off under a palm tree. The breakdown will come later 🌴',
      uk: 'Заснув під пальмою. Розбір буде пізніше 🌴',
      es: 'Se durmió bajo una palmera. El análisis vendrá luego 🌴',
      'pt-BR': 'Dormiu embaixo de uma palmeira. A análise vem depois 🌴',
      vi: 'Ngủ dưới gốc dừa. Phân tích sẽ có sau 🌴',
      id: 'Ketiduran di bawah pohon palem. Analisis nanti aja 🌴',
      tr: 'Palmiyenin altında uyudu. Çözüm sonra gelecek 🌴',
      pl: 'Zasnął pod palmą. Analiza będzie później 🌴',
    },
  },
  {
    title: {
      ru: 'Словарь захлопнулся',
      en: 'The dictionary slammed shut',
      uk: 'Словник захлопнувся',
      es: 'El diccionario se cerró de golpe',
      'pt-BR': 'O dicionário fechou de vez',
      vi: 'Cuốn từ điển sập lại',
      id: 'Kamusnya menutup sendiri',
      tr: 'Sözlük çat diye kapandı',
      pl: 'Słownik zatrzasnął się',
    },
    message: {
      ru: 'Ветер перелистнул все страницы и захлопнул словарь на нужном слове. Открываем обратно — загляни позже 📖',
      en: 'The wind flipped through every page and shut the dictionary right on the word we needed. Opening it back up — check in later 📖',
      uk: 'Вітер перегорнув усі сторінки й захлопнув словник на потрібному слові. Відкриваємо назад — зазирни пізніше 📖',
      es: 'El viento pasó todas las páginas y cerró el diccionario justo en la palabra clave. Lo abrimos de nuevo — vuelve luego 📖',
      'pt-BR': 'O vento virou todas as páginas e fechou o dicionário bem na palavra certa. Vamos reabrir — volte depois 📖',
      vi: 'Gió lật hết trang rồi đóng sập cuốn từ điển ngay chỗ từ cần tìm. Đang mở lại — quay lại sau 📖',
      id: 'Angin membalik semua halaman dan menutup kamus tepat di kata yang dicari. Kami buka lagi — cek nanti 📖',
      tr: 'Rüzgâr bütün sayfaları çevirdi ve sözlüğü tam o kelimede kapattı. Yeniden açıyoruz — sonra bak 📖',
      pl: 'Wiatr przewrócił wszystkie strony i zatrzasnął słownik na właściwym słowie. Otwieramy z powrotem — zajrzyj później 📖',
    },
  },
  {
    title: {
      ru: 'Очки укатились под диван',
      en: 'The glasses rolled under the sofa',
      uk: 'Окуляри закотилися під диван',
      es: 'Las gafas rodaron bajo el sofá',
      'pt-BR': 'Os óculos rolaram pra baixo do sofá',
      vi: 'Cặp kính lăn xuống gầm ghế',
      id: 'Kacamatanya menggelinding ke bawah sofa',
      tr: 'Gözlük koltuğun altına yuvarlandı',
      pl: 'Okulary wtoczyły się pod kanapę',
    },
    message: {
      ru: 'Компас снял очки протереть, а они — шмыг под диван. Без них ни строчки не разберёт. Позже вернёмся 👓',
      en: 'Compass took off his glasses to clean them, and they scooted under the sofa. Can’t read a line without them. Back later 👓',
      uk: 'Компас зняв окуляри протерти, а вони — шмиг під диван. Без них ні рядка не розбере. Пізніше повернемось 👓',
      es: 'Compass se quitó las gafas para limpiarlas y se escurrieron bajo el sofá. Sin ellas no lee ni una línea. Volvemos luego 👓',
      'pt-BR': 'Compass tirou os óculos pra limpar e eles escaparam pra baixo do sofá. Sem eles não lê uma linha. Voltamos depois 👓',
      vi: 'Compass tháo kính ra lau thì nó tuột xuống gầm ghế. Không có kính thì đọc chẳng nổi dòng nào. Lát nữa quay lại 👓',
      id: 'Compass melepas kacamata buat dibersihkan, eh malah nyelonong ke bawah sofa. Tanpa itu satu baris pun tak terbaca. Balik nanti 👓',
      tr: 'Compass gözlüğünü silmek için çıkardı, gözlük koltuğun altına kaçtı. Onsuz tek satır okuyamaz. Sonra döneriz 👓',
      pl: 'Compass zdjął okulary, żeby je przetrzeć, a te — hyc pod kanapę. Bez nich nie odczyta ani linijki. Wrócimy później 👓',
    },
  },
];

const COMPASS_VOICE_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Компас медитирует',
      en: 'Compass is meditating',
      uk: 'Компас медитує',
      es: 'Compass está meditando',
      'pt-BR': 'Compass está meditando',
      vi: 'Compass đang thiền',
      id: 'Compass sedang meditasi',
      tr: 'Compass meditasyon yapıyor',
      pl: 'Compass medytuje',
    },
    message: {
      ru: 'Обещал вернуться просветлённым. Загляни позже 🧘',
      en: 'Promised to come back enlightened. Check in later 🧘',
      uk: 'Обіцяв повернутися просвітленим. Зазирни пізніше 🧘',
      es: 'Prometió volver iluminado. Vuelve más tarde 🧘',
      'pt-BR': 'Prometeu voltar iluminado. Volte mais tarde 🧘',
      vi: 'Hứa sẽ trở lại giác ngộ. Quay lại sau nhé 🧘',
      id: 'Janji kembali dengan pencerahan. Cek lagi nanti 🧘',
      tr: 'Aydınlanmış dönmeye söz verdi. Sonra bak 🧘',
      pl: 'Obiecał wrócić oświecony. Zajrzyj później 🧘',
    },
  },
  {
    title: {
      ru: 'Компас ушёл встречать рассвет',
      en: 'Compass went off to watch the sunrise',
      uk: 'Компас пішов зустрічати світанок',
      es: 'Compass fue a ver el amanecer',
      'pt-BR': 'Compass foi ver o nascer do sol',
      vi: 'Compass đi ngắm bình minh',
      id: 'Compass pergi menyambut fajar',
      tr: 'Compass gün doğumunu karşılamaya gitti',
      pl: 'Compass poszedł powitać świt',
    },
    message: {
      ru: 'Сказал, что мысль дня приходит только на восходе. Вернётся с новой — заходи позже 🌄',
      en: 'Said the thought of the day only shows up at dawn. He’ll be back with a new one — check in later 🌄',
      uk: 'Сказав, що думка дня приходить лише на сході. Повернеться з новою — заходь пізніше 🌄',
      es: 'Dice que el pensamiento del día solo llega al amanecer. Volverá con uno nuevo — pásate luego 🌄',
      'pt-BR': 'Disse que o pensamento do dia só vem ao amanhecer. Volta com um novo — apareça depois 🌄',
      vi: 'Bảo rằng suy nghĩ của ngày chỉ đến lúc bình minh. Sẽ về với ý mới — ghé lại sau 🌄',
      id: 'Katanya renungan hari ini cuma datang saat fajar. Bakal balik bawa yang baru — mampir nanti 🌄',
      tr: 'Günün fikri sadece gün doğumunda gelirmiş dedi. Yenisiyle döner — sonra uğra 🌄',
      pl: 'Mówi, że myśl dnia przychodzi tylko o świcie. Wróci z nową — wpadnij później 🌄',
    },
  },
  {
    title: {
      ru: 'Микрофон занят сверчком',
      en: 'A cricket took over the microphone',
      uk: 'Мікрофон зайнятий цвіркуном',
      es: 'Un grillo ocupó el micrófono',
      'pt-BR': 'Um grilo ocupou o microfone',
      vi: 'Con dế chiếm mất micro',
      id: 'Mikrofonnya dipakai jangkrik',
      tr: 'Mikrofonu bir cırcır böceği tuttu',
      pl: 'Mikrofon zajął świerszcz',
    },
    message: {
      ru: 'Пока Компас отходил, в микрофон залез сверчок и завёл свою песню. Выселяем — комментарий чуть позже 🦗',
      en: 'While Compass stepped away, a cricket climbed into the mic and started singing. Evicting it now — the comment’s coming a bit later 🦗',
      uk: 'Поки Компас відходив, у мікрофон заліз цвіркун і завів свою пісню. Виселяємо — коментар трохи пізніше 🦗',
      es: 'Mientras Compass se alejaba, un grillo se metió en el micrófono y empezó su canción. Lo desalojamos — el comentario llega luego 🦗',
      'pt-BR': 'Enquanto Compass se afastava, um grilo entrou no microfone e começou a cantar. Tô tirando ele — o comentário vem já já 🦗',
      vi: 'Lúc Compass bước ra, một con dế chui vào micro và cất tiếng gáy. Đang đuổi nó ra — lời bình lát nữa có 🦗',
      id: 'Waktu Compass pergi sebentar, seekor jangkrik masuk ke mikrofon dan mulai bernyanyi. Lagi diusir — komentarnya nanti 🦗',
      tr: 'Compass uzaklaşmışken mikrofona bir cırcır böceği girip şarkısına başladı. Çıkarıyoruz — yorum birazdan 🦗',
      pl: 'Gdy Compass odszedł, do mikrofonu wlazł świerszcz i zaczął swoją pieśń. Wykwaterowujemy — komentarz za chwilę 🦗',
    },
  },
];

const SPEAKING_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Микрофон на техобслуживании',
      en: 'Microphone under maintenance',
      uk: 'Мікрофон на техобслуговуванні',
      es: 'Micrófono en mantenimiento',
      'pt-BR': 'Microfone em manutenção',
      vi: 'Micro đang bảo trì',
      id: 'Mikrofon lagi diservis',
      tr: 'Mikrofon bakımda',
      pl: 'Mikrofon w serwisie',
    },
    message: {
      ru: 'Звукач убежал за кофе. Вернёмся в эфир позже 🎤',
      uk: 'Звукач побіг по каву. Повернемось в ефір пізніше 🎤',
      es: 'El técnico fue por café. Volvemos al aire luego 🎤',
      'pt-BR': 'O técnico foi buscar café. Voltamos ao ar depois 🎤',
      vi: 'Kỹ thuật viên đi lấy cà phê. Lên sóng lại sau 🎤',
      id: 'Teknisi ambil kopi dulu. Balik siaran nanti 🎤',
      tr: 'Ses teknisyeni kahveye gitti. Sonra yayındayız 🎤',
      pl: 'Realizator poszedł po kawę. Wracamy na antenę później 🎤',
    },
  },
  {
    title: {
      ru: 'В студии отключили пульт',
      uk: 'У студії вимкнули пульт',
      es: 'La consola de la cabina se apagó',
      'pt-BR': 'A mesa de som do estúdio desligou',
      vi: 'Bàn điều khiển phòng thu bị tắt',
      id: 'Panel kontrol studio mati',
      tr: 'Stüdyodaki mikser kapandı',
      pl: 'W studiu wyłączyła się konsoleta',
    },
    message: {
      ru: 'Уборщица задела кнопку шваброй — весь пульт перезагружается. Скоро снова в эфир 🎚️',
      uk: 'Прибиральниця зачепила кнопку шваброю — весь пульт перезавантажується. Скоро знову в ефірі 🎚️',
      es: 'La señora de la limpieza rozó un botón con la fregona y toda la consola se reinicia. Volvemos al aire pronto 🎚️',
      'pt-BR': 'A faxineira encostou o esfregão num botão e a mesa toda reiniciou. Já já voltamos ao ar 🎚️',
      vi: 'Cô lao công quẹt cây lau nhà trúng nút, cả bàn điều khiển khởi động lại. Sắp lên sóng lại rồi 🎚️',
      id: 'Petugas kebersihan menyenggol tombol pakai pel — seluruh panel restart. Sebentar lagi siaran lagi 🎚️',
      tr: 'Temizlikçi paspasla düğmeye çarptı, bütün mikser yeniden başlıyor. Birazdan yine yayındayız 🎚️',
      pl: 'Sprzątaczka zahaczyła mopem o przycisk — cała konsoleta się restartuje. Zaraz wracamy na antenę 🎚️',
    },
  },
  {
    title: {
      ru: 'Наушники запутались в узел',
      uk: 'Навушники заплуталися у вузол',
      es: 'Los auriculares se hicieron un nudo',
      'pt-BR': 'Os fones viraram um nó',
      vi: 'Tai nghe rối thành một cục',
      id: 'Headphone-nya kusut jadi simpul',
      tr: 'Kulaklık düğüm oldu',
      pl: 'Słuchawki zaplątały się w węzeł',
    },
    message: {
      ru: 'Пока их распутывают, эфира не будет. Загляни чуть позже — уже почти 🎧',
      uk: 'Поки їх розплутують, ефіру не буде. Зазирни трохи пізніше — уже майже 🎧',
      es: 'Hasta que los desenreden no hay emisión. Vuelve en un ratito — ya casi 🎧',
      'pt-BR': 'Enquanto desembaraçam, não tem transmissão. Volte daqui a pouco — já quase 🎧',
      vi: 'Chưa gỡ xong thì chưa lên sóng được. Ghé lại chút nữa — sắp xong rồi 🎧',
      id: 'Selama masih diurai, belum bisa siaran. Mampir sebentar lagi — hampir kelar 🎧',
      tr: 'Onlar çözülene kadar yayın yok. Birazdan uğra — neredeyse bitti 🎧',
      pl: 'Dopóki ich nie rozplączą, nie ma emisji. Zajrzyj za chwilę — już prawie 🎧',
    },
  },
];

export function aiOfflineToast(lang: string, key: AiOfflineToastKey): AiOfflineToast {
  switch (key) {
    case 'compass_voice':
      return localizeRandom(lang, COMPASS_VOICE_VARIANTS);
    case 'speaking':
      return localizeRandom(lang, SPEAKING_VARIANTS);
    case 'explain':
    default:
      return localizeRandom(lang, EXPLAIN_VARIANTS);
  }
}

const EVERYDAY_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Закрыто на карантин',
      uk: 'Закрито на карантин',
      es: 'Cerrado por cuarentena',
      'pt-BR': 'Fechado por quarentena',
      vi: 'Đóng cửa để cách ly',
      id: 'Tutup karena karantina',
      tr: 'Karantina nedeniyle kapalı',
      pl: 'Zamknięte na kwarantannę',
    },
    message: {
      ru: 'Шеф-повар уронил в суп весь словарь неправильных глаголов. Кухня отмывается. Загляни позже 🍲',
      uk: 'Шеф-кухар упустив у суп увесь словник неправильних дієслів. Кухня відмивається. Зазирни пізніше 🍲',
      es: 'El chef dejó caer el diccionario entero de verbos irregulares en la sopa. Limpiando la cocina. Vuelve luego 🍲',
      'pt-BR': 'O chef deixou cair o dicionário inteiro de verbos irregulares na sopa. Limpando a cozinha. Volte depois 🍲',
      vi: 'Đầu bếp làm rơi cả cuốn từ điển động từ bất quy tắc vào nồi súp. Đang dọn bếp. Quay lại sau 🍲',
      id: 'Koki menjatuhkan seluruh kamus kata kerja tak beraturan ke dalam sup. Dapur lagi dibersihkan. Balik nanti 🍲',
      tr: 'Şef bütün düzensiz fiiller sözlüğünü çorbaya düşürdü. Mutfak temizleniyor. Sonra uğra 🍲',
      pl: 'Szef kuchni wrzucił do zupy cały słownik czasowników nieregularnych. Kuchnia się czyści. Zajrzyj później 🍲',
    },
  },
  {
    title: {
      ru: 'Переучёт',
      uk: 'Переоблік',
      es: 'Inventario',
      'pt-BR': 'Balanço',
      vi: 'Đang kiểm kê',
      id: 'Sedang stok opname',
      tr: 'Sayım var',
      pl: 'Inwentaryzacja',
    },
    message: {
      ru: 'Продавец пересчитывает банки и сбился на трёхсотой. Начал сначала. Зайди позже, когда досчитает 🥫',
      uk: 'Продавець перераховує банки й збився на трьохсотій. Почав спочатку. Зайди пізніше, коли дорахує 🥫',
      es: 'El vendedor cuenta las latas y se perdió en la número trescientos. Empezó de nuevo. Vuelve cuando termine 🥫',
      'pt-BR': 'O vendedor conta as latas e se perdeu na de número trezentos. Começou de novo. Volte quando terminar 🥫',
      vi: 'Người bán đếm các hộp và lộn ở hộp thứ ba trăm. Đếm lại từ đầu. Ghé lại khi đếm xong nhé 🥫',
      id: 'Penjaga toko menghitung kaleng dan salah di kaleng ke-tiga ratus. Mulai dari awal lagi. Balik pas selesai ya 🥫',
      tr: 'Satıcı konserveleri sayarken üç yüzüncüde şaşırdı. Baştan başladı. Bitince gel 🥫',
      pl: 'Sprzedawca liczy puszki i pomylił się na trzechsetnej. Zaczął od nowa. Wróć, gdy doliczy 🥫',
    },
  },
  {
    title: {
      ru: 'Свет погас во всём квартале',
      uk: 'Світло згасло в усьому кварталі',
      es: 'Se fue la luz en toda la manzana',
      'pt-BR': 'A luz caiu no quarteirão inteiro',
      vi: 'Cả khu phố mất điện',
      id: 'Listrik padam se-blok',
      tr: 'Bütün mahallede elektrik kesildi',
      pl: 'Zgasło światło w całej dzielnicy',
    },
    message: {
      ru: 'Кассир пробивает чек на ощупь и путает сдачу. Ждём электрика — загляни позже 🕯️',
      uk: 'Касир пробиває чек навпомацки й плутає решту. Чекаємо електрика — зазирни пізніше 🕯️',
      es: 'El cajero cobra a tientas y confunde el cambio. Esperamos al electricista — vuelve luego 🕯️',
      'pt-BR': 'O caixa passa a compra no escuro e erra o troco. Esperando o eletricista — volte depois 🕯️',
      vi: 'Thu ngân bấm máy trong bóng tối và trả nhầm tiền thối. Đang chờ thợ điện — quay lại sau 🕯️',
      id: 'Kasir menghitung dalam gelap dan salah kembalian. Nunggu tukang listrik — balik nanti 🕯️',
      tr: 'Kasiyer karanlıkta fiş kesip para üstünü şaşırıyor. Elektrikçiyi bekliyoruz — sonra uğra 🕯️',
      pl: 'Kasjer nabija paragon po omacku i myli resztę. Czekamy na elektryka — zajrzyj później 🕯️',
    },
  },
];

const TRAVEL_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Рейс задержан',
      uk: 'Рейс затримано',
      es: 'Vuelo retrasado',
      'pt-BR': 'Voo atrasado',
      vi: 'Chuyến bay bị hoãn',
      id: 'Penerbangan ditunda',
      tr: 'Uçuş ertelendi',
      pl: 'Lot opóźniony',
    },
    message: {
      ru: 'В терминале нашли таракана размером с чемодан. Всё закрыли на карантин. Возвращайся позже 🪳✈️',
      uk: 'У терміналі знайшли таргана завбільшки з валізу. Усе закрили на карантин. Повертайся пізніше 🪳✈️',
      es: 'Encontraron una cucaracha del tamaño de una maleta en la terminal. Todo en cuarentena. Vuelve luego 🪳✈️',
      'pt-BR': 'Acharam uma barata do tamanho de uma mala no terminal. Tudo em quarentena. Volte depois 🪳✈️',
      vi: 'Người ta tìm thấy một con gián to bằng vali trong nhà ga. Tất cả bị cách ly. Quay lại sau nhé 🪳✈️',
      id: 'Ada kecoak sebesar koper ditemukan di terminal. Semua dikarantina. Balik lagi nanti 🪳✈️',
      tr: 'Terminalde valiz büyüklüğünde bir hamamböceği bulundu. Her yer karantinada. Sonra gel 🪳✈️',
      pl: 'W terminalu znaleziono karalucha wielkości walizki. Wszystko na kwarantannie. Wróć później 🪳✈️',
    },
  },
  {
    title: {
      ru: 'Багаж уехал без хозяина',
      uk: 'Багаж поїхав без господаря',
      es: 'El equipaje se fue sin su dueño',
      'pt-BR': 'A bagagem foi embora sem o dono',
      vi: 'Hành lý đi mất không có chủ',
      id: 'Bagasinya pergi tanpa pemiliknya',
      tr: 'Bagaj sahibi olmadan gitti',
      pl: 'Bagaż odjechał bez właściciela',
    },
    message: {
      ru: 'Лента с чемоданами разогналась и укатила в соседний город. Ловим — вернись чуть позже 🧳',
      uk: 'Стрічка з валізами розігналася й покотила в сусіднє місто. Ловимо — повернись трохи пізніше 🧳',
      es: 'La cinta de maletas se aceleró y se fue a la ciudad vecina. La perseguimos — vuelve en un rato 🧳',
      'pt-BR': 'A esteira de malas acelerou e foi parar na cidade vizinha. Estamos atrás dela — volte daqui a pouco 🧳',
      vi: 'Băng chuyền hành lý tăng tốc rồi chạy sang thành phố bên cạnh. Đang đuổi theo — lát nữa quay lại 🧳',
      id: 'Ban berjalan koper ngebut dan meluncur ke kota sebelah. Lagi dikejar — balik sebentar lagi 🧳',
      tr: 'Bavul bandı hızlanıp yan şehre kaçtı. Peşindeyiz — birazdan dön 🧳',
      pl: 'Taśma z walizkami rozpędziła się i pojechała do sąsiedniego miasta. Gonimy — wróć za chwilę 🧳',
    },
  },
  {
    title: {
      ru: 'Табло сошло с ума',
      uk: 'Табло здуріло',
      es: 'El panel se volvió loco',
      'pt-BR': 'O painel enlouqueceu',
      vi: 'Bảng thông báo phát điên',
      id: 'Papan jadwal jadi kacau',
      tr: 'Uçuş ekranı çıldırdı',
      pl: 'Tablica oszalała',
    },
    message: {
      ru: 'Показывает рейс на Луну в 25:61. Техники стучат по нему кулаком. Загляни позже 🛫',
      uk: 'Показує рейс на Місяць о 25:61. Техніки гупають по ньому кулаком. Зазирни пізніше 🛫',
      es: 'Muestra un vuelo a la Luna a las 25:61. Los técnicos le dan puñetazos. Vuelve luego 🛫',
      'pt-BR': 'Mostra um voo pra Lua às 25:61. Os técnicos batem nele com o punho. Volte depois 🛫',
      vi: 'Nó báo chuyến bay lên Mặt Trăng lúc 25:61. Kỹ thuật viên đang đấm cho nó tỉnh. Quay lại sau 🛫',
      id: 'Menampilkan penerbangan ke Bulan jam 25:61. Teknisi menggebuknya. Balik nanti 🛫',
      tr: 'Saat 25:61’de Ay’a uçuş gösteriyor. Teknisyenler yumrukla vuruyor. Sonra uğra 🛫',
      pl: 'Pokazuje lot na Księżyc o 25:61. Technicy walą w nią pięścią. Zajrzyj później 🛫',
    },
  },
];

const SOCIAL_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Все разошлись',
      uk: 'Усі розійшлися',
      es: 'Todos se fueron',
      'pt-BR': 'Todos foram embora',
      vi: 'Mọi người đã về hết',
      id: 'Semua sudah bubar',
      tr: 'Herkes dağıldı',
      pl: 'Wszyscy się rozeszli',
    },
    message: {
      ru: 'Вечеринка переехала на крышу, а лестницу унесли. Собеседник машет тебе оттуда. Загляни позже 🎈',
      uk: 'Вечірка переїхала на дах, а драбину забрали. Співрозмовник махає тобі звідти. Зазирни пізніше 🎈',
      es: 'La fiesta se mudó al tejado y se llevaron la escalera. Tu interlocutor te saluda desde arriba. Vuelve luego 🎈',
      'pt-BR': 'A festa subiu pro telhado e levaram a escada. Seu interlocutor acena lá de cima. Volte depois 🎈',
      vi: 'Bữa tiệc chuyển lên mái nhà và cầu thang bị mang đi. Người đối thoại vẫy tay từ trên đó. Quay lại sau 🎈',
      id: 'Pestanya pindah ke atap dan tangganya dibawa pergi. Lawan bicaramu melambai dari atas. Balik nanti 🎈',
      tr: 'Parti çatıya taşındı ve merdiveni götürdüler. Karşındaki oradan el sallıyor. Sonra uğra 🎈',
      pl: 'Impreza przeniosła się na dach, a drabinę zabrano. Rozmówca macha do ciebie z góry. Zajrzyj później 🎈',
    },
  },
  {
    title: {
      ru: 'Диджей поставил не ту пластинку',
      uk: 'Діджей поставив не ту платівку',
      es: 'El DJ puso el disco equivocado',
      'pt-BR': 'O DJ colocou o disco errado',
      vi: 'DJ bật nhầm đĩa',
      id: 'DJ-nya salah pasang piringan',
      tr: 'DJ yanlış plağı koydu',
      pl: 'DJ puścił nie tę płytę',
    },
    message: {
      ru: 'Вместо музыки — урок испанского на скорости 2х. Все замерли. Меняем пластинку — вернись позже 💿',
      uk: 'Замість музики — урок іспанської на швидкості 2х. Усі завмерли. Міняємо платівку — повернись пізніше 💿',
      es: 'En vez de música suena una clase de español a velocidad 2x. Todos se quedaron helados. Cambiamos el disco — vuelve luego 💿',
      'pt-BR': 'Em vez de música, uma aula de espanhol em velocidade 2x. Todo mundo congelou. Trocando o disco — volte depois 💿',
      vi: 'Thay vì nhạc lại là bài học tiếng Tây Ban Nha tua 2x. Cả phòng đứng hình. Đang đổi đĩa — quay lại sau 💿',
      id: 'Bukannya musik, malah pelajaran bahasa Spanyol kecepatan 2x. Semua mematung. Lagi ganti piringan — balik nanti 💿',
      tr: 'Müzik yerine 2x hızda İspanyolca dersi çalıyor. Herkes dondu kaldı. Plağı değiştiriyoruz — sonra dön 💿',
      pl: 'Zamiast muzyki leci lekcja hiszpańskiego na prędkości 2x. Wszyscy zamarli. Zmieniamy płytę — wróć później 💿',
    },
  },
  {
    title: {
      ru: 'Именинник задул свечи вместе со светом',
      uk: 'Іменинник задув свічки разом зі світлом',
      es: 'El del cumpleaños sopló las velas y la luz',
      'pt-BR': 'O aniversariante soprou as velas e a luz junto',
      vi: 'Người tổ chức sinh nhật thổi tắt luôn cả đèn',
      id: 'Yang ulang tahun meniup lilin sekalian lampunya',
      tr: 'Doğum günü sahibi mumları ışıkla birlikte üfledi',
      pl: 'Solenizant zdmuchnął świeczki razem ze światłem',
    },
    message: {
      ru: 'Стало темно, гости ищут торт на ощупь. Включаем свет — загляни чуть позже 🎂',
      uk: 'Стало темно, гості шукають торт навпомацки. Вмикаємо світло — зазирни трохи пізніше 🎂',
      es: 'Se hizo de noche y los invitados buscan la tarta a tientas. Encendemos la luz — vuelve en un rato 🎂',
      'pt-BR': 'Ficou tudo escuro e os convidados procuram o bolo às cegas. Acendendo a luz — volte daqui a pouco 🎂',
      vi: 'Tối om, khách mò mẫm tìm bánh kem. Đang bật đèn lại — lát nữa quay lại 🎂',
      id: 'Jadi gelap, para tamu meraba-raba nyari kue. Lagi nyalain lampu — balik sebentar lagi 🎂',
      tr: 'Ortalık karardı, misafirler pastayı el yordamıyla arıyor. Işığı açıyoruz — birazdan uğra 🎂',
      pl: 'Zrobiło się ciemno, goście szukają tortu po omacku. Włączamy światło — zajrzyj za chwilę 🎂',
    },
  },
];

const BROKEN_ROBOT_WAITER_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Робот перезагружается',
      uk: 'Робот перезавантажується',
      es: 'El robot se reinicia',
      'pt-BR': 'O robô está reiniciando',
      vi: 'Robot đang khởi động lại',
      id: 'Robot sedang restart',
      tr: 'Robot yeniden başlıyor',
      pl: 'Robot się restartuje',
    },
    message: {
      ru: 'Официант-робот завис на фразе «Would you like fries with that» и ушёл в цикл. Перезагрузка… 🤖',
      uk: 'Офіціант-робот завис на фразі «Would you like fries with that» і пішов у цикл. Перезавантаження… 🤖',
      es: 'El camarero robot se colgó en «Would you like fries with that» y entró en bucle. Reiniciando… 🤖',
      'pt-BR': 'O garçom robô travou em «Would you like fries with that» e entrou em loop. Reiniciando… 🤖',
      vi: 'Robot phục vụ bị kẹt ở câu «Would you like fries with that» và lặp vô tận. Đang khởi động lại… 🤖',
      id: 'Pelayan robot macet di «Would you like fries with that» dan masuk loop. Restart… 🤖',
      tr: 'Robot garson «Would you like fries with that» cümlesinde takıldı ve döngüye girdi. Yeniden başlatılıyor… 🤖',
      pl: 'Robot kelner zaciął się na «Would you like fries with that» i wpadł w pętlę. Restart… 🤖',
    },
  },
  {
    title: {
      ru: 'Робот раздаёт всем солонки',
      uk: 'Робот роздає всім сільнички',
      es: 'El robot reparte saleros a todos',
      'pt-BR': 'O robô distribui saleiros pra todo mundo',
      vi: 'Robot phát lọ muối cho tất cả mọi người',
      id: 'Robot membagikan tempat garam ke semua orang',
      tr: 'Robot herkese tuzluk dağıtıyor',
      pl: 'Robot rozdaje wszystkim solniczki',
    },
    message: {
      ru: 'Заклинило на команде «принести соль» — уже принёс сорок. Разгружаем. Загляни позже 🧂',
      uk: 'Заклинило на команді «принести сіль» — уже приніс сорок. Розвантажуємо. Зазирни пізніше 🧂',
      es: 'Se atascó en la orden «traer sal» y ya trajo cuarenta. Descargando. Vuelve luego 🧂',
      'pt-BR': 'Travou no comando «trazer sal» e já trouxe quarenta. Descarregando. Volte depois 🧂',
      vi: 'Kẹt ở lệnh «mang muối tới» — đã mang bốn mươi lọ. Đang dọn bớt. Quay lại sau 🧂',
      id: 'Nyangkut di perintah «ambil garam» — sudah bawa empat puluh. Lagi diberesin. Balik nanti 🧂',
      tr: '«Tuz getir» komutunda takıldı — kırk tane getirdi bile. Boşaltıyoruz. Sonra uğra 🧂',
      pl: 'Zaciął się na komendzie «przynieś sól» — przyniósł już czterdzieści. Rozładowujemy. Zajrzyj później 🧂',
    },
  },
  {
    title: {
      ru: 'Робот танцует вместо обслуживания',
      uk: 'Робот танцює замість обслуговування',
      es: 'El robot baila en vez de atender',
      'pt-BR': 'O robô dança em vez de atender',
      vi: 'Robot nhảy múa thay vì phục vụ',
      id: 'Robot menari alih-alih melayani',
      tr: 'Robot servis yerine dans ediyor',
      pl: 'Robot tańczy zamiast obsługiwać',
    },
    message: {
      ru: 'Перепутал алгоритм заказа с алгоритмом танца и теперь диско у столика. Выключаем музыку — вернись позже 🕺',
      uk: 'Переплутав алгоритм замовлення з алгоритмом танцю й тепер диско біля столика. Вимикаємо музику — повернись пізніше 🕺',
      es: 'Confundió el algoritmo del pedido con el del baile y ahora hay disco junto a la mesa. Apagamos la música — vuelve luego 🕺',
      'pt-BR': 'Confundiu o algoritmo do pedido com o da dança e agora é disco na mesa. Desligando a música — volte depois 🕺',
      vi: 'Nhầm thuật toán nhận đơn với thuật toán nhảy, giờ thành sàn disco cạnh bàn. Đang tắt nhạc — quay lại sau 🕺',
      id: 'Ketuker algoritma pesanan sama algoritma dansa, sekarang malah disko di meja. Lagi matiin musik — balik nanti 🕺',
      tr: 'Sipariş algoritmasını dans algoritmasıyla karıştırdı, şimdi masanın yanında disko var. Müziği kapatıyoruz — sonra dön 🕺',
      pl: 'Pomylił algorytm zamówienia z algorytmem tańca i teraz przy stoliku jest disco. Wyłączamy muzykę — wróć później 🕺',
    },
  },
];

/**
 * Полноэкранная заглушка для диалога/миссии — не пускаем внутрь. Выбор по
 * категории ситуации + спец-кейс «сломанный робот-официант». На каждую —
 * несколько вариантов, показывается случайный.
 */
export function aiOfflineDialogScreen(
  lang: string,
  category: AiOfflineDialogCategory,
  scenarioId?: string,
): AiOfflineScreen {
  if (scenarioId === 'broken_robot_waiter') {
    return localizeRandom(lang, BROKEN_ROBOT_WAITER_VARIANTS);
  }
  if (category === 'travel') {
    return localizeRandom(lang, TRAVEL_VARIANTS);
  }
  if (category === 'social') {
    return localizeRandom(lang, SOCIAL_VARIANTS);
  }
  // everyday (кафе / магазин / аптека / доставка / врач)
  return localizeRandom(lang, EVERYDAY_VARIANTS);
}

const PERSONAL_LIMIT_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Учитель устал',
      uk: 'Вчитель втомився',
      es: 'El profesor se cansó',
      'pt-BR': 'O professor se cansou',
      vi: 'Giáo viên đã mệt',
      id: 'Gurunya kelelahan',
      tr: 'Öğretmen yoruldu',
      pl: 'Nauczyciel jest zmęczony',
    },
    message: {
      ru: 'Ты сегодня разобрал столько ошибок, что учитель уснул прямо на стуле. Отдохнёт до завтра — а с Plus у тебя личный учитель без выходных 🛌',
      uk: 'Ти сьогодні розібрав стільки помилок, що вчитель заснув прямо на стільці. Відпочине до завтра — а з Plus у тебе особистий вчитель без вихідних 🛌',
      es: 'Hoy analizaste tantos errores que el profesor se durmió en la silla. Descansará hasta mañana — con Plus tienes un profesor personal sin días libres 🛌',
      'pt-BR': 'Você analisou tantos erros hoje que o professor pegou no sono na cadeira. Vai descansar até amanhã — com Plus você tem um professor particular sem folga 🛌',
      vi: 'Hôm nay bạn đã sửa nhiều lỗi đến mức giáo viên ngủ gật ngay trên ghế. Nghỉ tới mai — còn với Plus bạn có gia sư riêng không nghỉ ngày nào 🛌',
      id: 'Hari ini kamu membahas begitu banyak kesalahan sampai gurunya ketiduran di kursi. Istirahat sampai besok — dengan Plus kamu punya guru pribadi tanpa libur 🛌',
      tr: 'Bugün o kadar çok hata inceledin ki öğretmen sandalyede uyuyakaldı. Yarına kadar dinlenecek — Plus ile tatil yapmayan kişisel bir öğretmenin olur 🛌',
      pl: 'Dziś przeanalizowałeś tyle błędów, że nauczyciel zasnął na krześle. Odpocznie do jutra — a z Plus masz osobistego nauczyciela bez wolnego 🛌',
    },
  },
  {
    title: {
      ru: 'Словарь захлопнулся',
      uk: 'Словник захлопнувся',
      es: 'El diccionario se cerró de golpe',
      'pt-BR': 'O dicionário se fechou de vez',
      vi: 'Cuốn từ điển đã khép lại',
      id: 'Kamusnya tertutup sendiri',
      tr: 'Sözlük kapandı',
      pl: 'Słownik się zatrzasnął',
    },
    message: {
      ru: 'Ты пролистал словарь так быстро, что он захлопнулся сам. Откроется завтра — а с Plus он всегда под рукой 📖',
      uk: 'Ти пролистав словник так швидко, що він захлопнувся сам. Відкриється завтра — а з Plus він завжди під рукою 📖',
      es: 'Hojeaste el diccionario tan rápido que se cerró solo. Se abrirá mañana — con Plus siempre lo tienes a mano 📖',
      'pt-BR': 'Você folheou o dicionário tão rápido que ele se fechou sozinho. Abre amanhã — com Plus ele está sempre à mão 📖',
      vi: 'Bạn lật từ điển nhanh đến mức nó tự khép lại. Mai sẽ mở lại — còn với Plus nó luôn sẵn sàng trong tay 📖',
      id: 'Kamu membolak-balik kamus begitu cepat sampai tertutup sendiri. Akan terbuka lagi besok — dengan Plus selalu ada di tanganmu 📖',
      tr: 'Sözlüğü o kadar hızlı çevirdin ki kendiliğinden kapandı. Yarın tekrar açılır — Plus ile her zaman elinin altında olur 📖',
      pl: 'Przekartkowałeś słownik tak szybko, że sam się zatrzasnął. Otworzy się jutro — a z Plus zawsze masz go pod ręką 📖',
    },
  },
  {
    title: {
      ru: 'Мел закончился',
      uk: 'Крейда закінчилась',
      es: 'Se acabó la tiza',
      'pt-BR': 'O giz acabou',
      vi: 'Phấn đã hết',
      id: 'Kapur tulisnya habis',
      tr: 'Tebeşir bitti',
      pl: 'Kreda się skończyła',
    },
    message: {
      ru: 'Сегодняшний урок стёр всю доску подчистую — мела больше нет. Новый привезут завтра, а с Plus доска бесконечная ✏️',
      uk: 'Сьогоднішній урок витер усю дошку дочиста — крейди більше немає. Нову привезуть завтра, а з Plus дошка нескінченна ✏️',
      es: 'La lección de hoy gastó toda la tiza en la pizarra. Mañana traen más — con Plus la pizarra es infinita ✏️',
      'pt-BR': 'A aula de hoje usou todo o giz na lousa. Chega mais amanhã — com Plus a lousa é infinita ✏️',
      vi: 'Bài học hôm nay đã dùng hết phấn trên bảng. Mai sẽ có phấn mới — còn với Plus thì bảng viết là vô tận ✏️',
      id: 'Pelajaran hari ini menghabiskan semua kapur di papan tulis. Besok datang lagi — dengan Plus papan tulisnya tak terbatas ✏️',
      tr: 'Bugünkü ders tahtadaki tüm tebeşiri bitirdi. Yarın yenisi gelir — Plus ile tahta sınırsız olur ✏️',
      pl: 'Dzisiejsza lekcja zużyła całą kredę na tablicy. Nowa przyjedzie jutro, a z Plus tablica jest nieskończona ✏️',
    },
  },
];

const GLOBAL_BUDGET_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Свет мигнул на весь квартал',
      uk: 'Світло блимнуло на весь квартал',
      es: 'La luz parpadeó en toda la manzana',
      'pt-BR': 'A luz piscou no quarteirão inteiro',
      vi: 'Cả khu phố chớp điện',
      id: 'Listrik berkedip se-blok',
      tr: 'Bütün mahallede ışıklar titredi',
      pl: 'Światło mrugnęło na całą dzielnicę',
    },
    message: {
      ru: 'Разборы попросили все разом — пробки повышибало. Электрик уже лезет на столб ⚡',
      uk: 'Розбори попросили всі разом — пробки повибивало. Електрик уже лізе на стовп ⚡',
      es: 'Todos pidieron análisis a la vez y saltaron los fusibles. El electricista ya sube al poste ⚡',
      'pt-BR': 'Todo mundo pediu análise ao mesmo tempo e os fusíveis pularam. O eletricista já tá subindo no poste ⚡',
      vi: 'Mọi người cùng lúc yêu cầu phân tích làm nhảy cầu chì. Thợ điện đang trèo lên cột rồi ⚡',
      id: 'Semua minta analisis barengan sampai sekringnya jeglek. Tukang listrik sudah manjat tiang ⚡',
      tr: 'Herkes aynı anda inceleme istedi, sigortalar attı. Elektrikçi çoktan direğe tırmanıyor ⚡',
      pl: 'Wszyscy naraz poprosili o analizy i wybiły korki. Elektryk już wchodzi na słup ⚡',
    },
  },
  {
    title: {
      ru: 'В кофейне кончилось молоко',
      uk: 'У кав’ярні скінчилося молоко',
      es: 'Se acabó la leche en la cafetería',
      'pt-BR': 'Acabou o leite na cafeteria',
      vi: 'Quán cà phê hết sữa',
      id: 'Kedai kopi kehabisan susu',
      tr: 'Kafede süt bitti',
      pl: 'W kawiarni skończyło się mleko',
    },
    message: {
      ru: 'Народу набежало столько, что бариста развёл руками. Побежал за упаковкой — заходи позже 🥛',
      uk: 'Народу набігло стільки, що бариста розвів руками. Побіг по упаковку — заходь пізніше 🥛',
      es: 'Vino tanta gente que el barista se quedó sin nada. Salió corriendo por más — pásate luego 🥛',
      'pt-BR': 'Veio tanta gente que o barista abriu os braços. Saiu correndo atrás de mais — apareça depois 🥛',
      vi: 'Đông khách đến mức pha chế phải bó tay. Chạy đi mua thêm rồi — ghé lại sau 🥛',
      id: 'Yang datang banyak banget sampai barista angkat tangan. Lari beli lagi — mampir nanti 🥛',
      tr: 'O kadar çok kişi geldi ki barista pes etti. Bir paket almaya koştu — sonra uğra 🥛',
      pl: 'Przyszło tylu ludzi, że barista rozłożył ręce. Poleciał po nowe — wpadnij później 🥛',
    },
  },
  {
    title: {
      ru: 'Мост развели в час пик',
      uk: 'Міст розвели в годину пік',
      es: 'Levantaron el puente en hora punta',
      'pt-BR': 'Levantaram a ponte na hora do rush',
      vi: 'Cầu được nâng vào giờ cao điểm',
      id: 'Jembatannya diangkat pas jam sibuk',
      tr: 'Köprü yoğun saatte açıldı',
      pl: 'Most rozsunięto w godzinach szczytu',
    },
    message: {
      ru: 'Все ринулись за разбором и застряли по разным берегам. Ждём, пока мост сведут обратно 🌉',
      uk: 'Усі кинулися за розбором і застрягли на різних берегах. Чекаємо, поки міст зведуть назад 🌉',
      es: 'Todos corrieron por su análisis y quedaron atrapados en orillas distintas. Esperamos a que bajen el puente 🌉',
      'pt-BR': 'Todo mundo correu atrás da análise e ficou preso em margens diferentes. Esperando abaixarem a ponte 🌉',
      vi: 'Ai cũng lao đi lấy bài phân tích rồi kẹt lại hai bên bờ. Đang chờ hạ cầu xuống 🌉',
      id: 'Semua berebut analisis dan terjebak di sisi berbeda. Nunggu jembatannya diturunkan lagi 🌉',
      tr: 'Herkes inceleme için koştu ve iki ayrı kıyıda kaldı. Köprünün inmesini bekliyoruz 🌉',
      pl: 'Wszyscy rzucili się po analizę i utknęli na różnych brzegach. Czekamy, aż most z powrotem zsuną 🌉',
    },
  },
];

const AI_ERROR_VARIANTS: readonly MultiLangPair[] = [
  {
    title: {
      ru: 'Голубь потерял письмо',
      uk: 'Голуб загубив листа',
      es: 'La paloma perdió la carta',
      'pt-BR': 'O pombo perdeu a carta',
      vi: 'Bồ câu làm mất thư',
      id: 'Merpatinya kehilangan surat',
      tr: 'Güvercin mektubu kaybetti',
      pl: 'Gołąb zgubił list',
    },
    message: {
      ru: 'Ответ отправили голубиной почтой, а он свернул не туда и клюёт крошки на площади. Жми ещё раз 🕊️',
      uk: 'Відповідь надіслали голубиною поштою, а він звернув не туди й клює крихти на площі. Тисни ще раз 🕊️',
      es: 'Mandamos la respuesta por paloma mensajera, pero se desvió y anda picoteando migas en la plaza. Dale otra vez 🕊️',
      'pt-BR': 'Mandamos a resposta por pombo-correio, mas ele virou errado e tá bicando migalhas na praça. Toque de novo 🕊️',
      vi: 'Câu trả lời gửi qua bồ câu đưa thư, mà nó rẽ nhầm và đang mổ vụn bánh ngoài quảng trường. Bấm lại lần nữa 🕊️',
      id: 'Jawabannya dikirim lewat merpati pos, tapi dia salah belok dan lagi mematuk remah di alun-alun. Tekan lagi 🕊️',
      tr: 'Cevabı posta güverciniyle yolladık ama yanlış saptı, meydanda kırıntı gagalıyor. Tekrar bas 🕊️',
      pl: 'Odpowiedź wysłaliśmy pocztą gołębią, ale skręcił nie tam i dziobie okruchy na rynku. Kliknij jeszcze raz 🕊️',
    },
  },
  {
    title: {
      ru: 'Посылку унесло не на тот этаж',
      uk: 'Посилку віднесло не на той поверх',
      es: 'El paquete se fue al piso equivocado',
      'pt-BR': 'A encomenda foi pro andar errado',
      vi: 'Bưu kiện bị đưa nhầm tầng',
      id: 'Paketnya nyasar ke lantai yang salah',
      tr: 'Paket yanlış kata gitti',
      pl: 'Paczka trafiła na nie to piętro',
    },
    message: {
      ru: 'Курьер постучал в соседнюю дверь и застрял там за чаем. Вызови ещё раз 📦',
      uk: 'Кур’єр постукав у сусідні двері й застряг там за чаєм. Виклич ще раз 📦',
      es: 'El repartidor tocó la puerta de al lado y se quedó ahí tomando té. Vuelve a llamarlo 📦',
      'pt-BR': 'O entregador bateu na porta do lado e ficou por lá tomando chá. Chame de novo 📦',
      vi: 'Người giao hàng gõ nhầm cửa bên cạnh rồi ở lại đó uống trà. Gọi lại lần nữa 📦',
      id: 'Kurirnya ngetuk pintu sebelah dan malah nongkrong minum teh di situ. Panggil lagi 📦',
      tr: 'Kurye yan kapıyı çaldı ve orada çaya takıldı. Yeniden çağır 📦',
      pl: 'Kurier zapukał do sąsiednich drzwi i utknął tam na herbacie. Zawołaj jeszcze raz 📦',
    },
  },
  {
    title: {
      ru: 'Ответ смыло в трубу',
      uk: 'Відповідь змило в трубу',
      es: 'La respuesta se fue por el tubo',
      'pt-BR': 'A resposta foi sugada pelo cano',
      vi: 'Câu trả lời bị hút vào ống',
      id: 'Jawabannya tersedot ke pipa',
      tr: 'Cevap boruya kaçtı',
      pl: 'Odpowiedź wessało do rury',
    },
    message: {
      ru: 'Написали на бумажке, положили в пневмопочту, а трубу засосало не туда. Отправь запрос ещё раз 💨',
      uk: 'Написали на папірці, поклали в пневмопошту, а трубу засмоктало не туди. Надішли запит ще раз 💨',
      es: 'La escribimos en un papel, la metimos en el tubo neumático y lo aspiró hacia otro lado. Envía la petición otra vez 💨',
      'pt-BR': 'Escrevemos num papel, colocamos no tubo pneumático e ele sugou pro lado errado. Envie o pedido de novo 💨',
      vi: 'Viết ra giấy, bỏ vào ống khí nén, rồi ống hút đi nhầm chỗ. Gửi yêu cầu lại lần nữa 💨',
      id: 'Ditulis di kertas, dimasukkan ke pipa pneumatik, eh tersedot ke arah yang salah. Kirim permintaan lagi 💨',
      tr: 'Bir kâğıda yazdık, pnömatik boruya koyduk ama boru yanlış yöne çekti. İsteği tekrar gönder 💨',
      pl: 'Napisaliśmy na kartce, włożyliśmy do poczty pneumatycznej, a rura wessała nie tam. Wyślij zapytanie jeszcze raz 💨',
    },
  },
  {
    title: {
      ru: 'Эхо вернулось без ответа',
      uk: 'Луна повернулася без відповіді',
      es: 'El eco volvió sin respuesta',
      'pt-BR': 'O eco voltou sem resposta',
      vi: 'Tiếng vọng trở về mà không có câu trả lời',
      id: 'Gemanya balik tanpa jawaban',
      tr: 'Yankı cevapsız döndü',
      pl: 'Echo wróciło bez odpowiedzi',
    },
    message: {
      ru: 'Прокричали вопрос в горы, а обратно прилетело только «…ответ… ответ…». Попробуй ещё разок 🏔️',
      uk: 'Прокричали питання в гори, а назад прилетіло тільки «…відповідь… відповідь…». Спробуй ще разок 🏔️',
      es: 'Gritamos la pregunta a las montañas y solo volvió «…respuesta… respuesta…». Inténtalo otra vez 🏔️',
      'pt-BR': 'Gritamos a pergunta pras montanhas e só voltou «…resposta… resposta…». Tente mais uma vez 🏔️',
      vi: 'Hét câu hỏi vào núi, chỉ có «…câu trả lời… câu trả lời…» vọng về. Thử lại lần nữa nhé 🏔️',
      id: 'Kami teriakkan pertanyaannya ke gunung, yang balik cuma «…jawaban… jawaban…». Coba sekali lagi 🏔️',
      tr: 'Soruyu dağlara haykırdık ama geri sadece «…cevap… cevap…» geldi. Bir daha dene 🏔️',
      pl: 'Krzyknęliśmy pytanie w góry, a wróciło tylko «…odpowiedź… odpowiedź…». Spróbuj jeszcze raz 🏔️',
    },
  },
];

/**
 * Личный дневной лимит юзера исчерпан. Забавный текст — вызывающий код рисует
 * его вместе с кнопкой Plus (это точка конверсии, апсел сохраняем).
 */
export function aiPersonalLimitToast(lang: string): AiOfflineToast {
  return localizeRandom(lang, PERSONAL_LIMIT_VARIANTS);
}

/** Глобальный бюджет ИИ иссяк (кончились токены сервиса на всех сразу). */
export function aiGlobalBudgetToast(lang: string): AiOfflineToast {
  return localizeRandom(lang, GLOBAL_BUDGET_VARIANTS);
}

/** Любая другая ошибка ИИ (таймаут / сеть / сбой сервера). */
export function aiErrorToast(lang: string): AiOfflineToast {
  return localizeRandom(lang, AI_ERROR_VARIANTS);
}
