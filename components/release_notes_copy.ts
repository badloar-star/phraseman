// ════════════════════════════════════════════════════════════════════════════
// release_notes_copy.ts — тексты окна «что нового» для релиза 1.6.0 (build 104+).
//
// зачем: владелец попросил отдельное окно для СТАРЫХ пользователей — тех, кто
// помнит приложение до билда 103. За релиз переименовалась валюта («осколки» →
// «жемчужины») и раздел («Арена» → «Турнир»), исчез экран «Друзья», а тренажёр
// и вход в турнир стали бесплатными. Без объяснения старый пользователь решит,
// что у него отобрали валюту и разделы. Тон — тёплая самоирония: шутим над
// собой, никогда над пользователем.
//
// зачем отдельный файл: в компоненте 8 локалей × 6 блоков превращают JSX в
// нечитаемую простыню. Здесь — только данные, там — только вёрстка.
// ════════════════════════════════════════════════════════════════════════════

import type Ionicons from '@expo/vector-icons/Ionicons';

export type ReleaseNotesLocale =
  | 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

type LocaleMap<T> = Record<ReleaseNotesLocale, T>;

/** Один пункт списка изменений: заголовок-факт + строка-объяснение с юмором. */
export type ReleaseNoteItem = {
  /** Ionicons glyph. Иконка несёт смысл пункта, а не украшает. */
  readonly icon: keyof typeof Ionicons.glyphMap;
  /** Факт. Читается сам по себе, без шутки. */
  readonly title: string;
  /** Объяснение «почему так». Здесь живёт юмор — но факт уже сказан выше. */
  readonly body: string;
  /**
   * true — пункт про деньги/потери (валюта, платность). Такие подсвечиваем:
   * именно из-за них старый пользователь пугается, что у него что-то отняли.
   */
  readonly reassuring?: boolean;
};

type ReleaseNotesTexts = {
  readonly pill: string;
  readonly title: string;
  readonly subtitle: string;
  readonly items: readonly ReleaseNoteItem[];
  readonly footer: string;
  readonly cta: string;
  readonly close: string;
};

// ── ru ──────────────────────────────────────────────────────────────────────
const RU: ReleaseNotesTexts = {
  pill: 'Что изменилось',
  title: 'Мы тут немного передвинули мебель',
  subtitle: 'Пока вас не было, кое-что переехало и переименовалось. Рассказываем, куда и зачем.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Осколки стали жемчужинами',
      body: 'Просто новое имя: было 1000 осколков — стало 1000 жемчужин. Один к одному, без обменников и мелкого шрифта.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'Арена теперь называется Турнир',
      body: 'Мы сами путались, где арена, а где лига. Оказалось, проще переименовать раздел, чем каждый раз объяснять.',
    },
    {
      icon: 'ticket-outline',
      title: 'Вход в турнир — бесплатный',
      body: 'Раньше он стоил жемчужины. Мы посчитали и решили, что брать плату за желание посоревноваться — так себе идея.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Моя практика» открыта полностью',
      body: 'Дневной лимит тренировок снят, премиум для тренажёра больше не нужен. Занимайтесь сколько хочется.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: 'Отдельный экран «Друзья» уехал',
      body: 'Всё живое из него — соревнования и приглашения — теперь в Турнире и приглашениях. Отдельная вкладка просто пылилась.',
    },
    {
      icon: 'flash-outline',
      title: 'Лига и турниры открываются сразу',
      body: 'Раньше подиум мог думать секунд десять. Мы починили — теперь экраны открываются с данными, а не с пустотой.',
    },
  ],
  footer: 'Ещё мы поправили десятки мелочей, которые вы, надеемся, никогда не замечали.',
  cta: 'Понятно, идём дальше',
  close: 'Закрыть',
};

// ── uk ──────────────────────────────────────────────────────────────────────
const UK: ReleaseNotesTexts = {
  pill: 'Що змінилося',
  title: 'Ми трохи переставили меблі',
  subtitle: 'Поки вас не було, дещо переїхало та перейменувалося. Розповідаємо, куди і навіщо.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Уламки стали перлинами',
      body: 'Просто нове ім’я: було 1000 уламків — стало 1000 перлин. Один до одного, без обмінників і дрібного шрифту.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'Арена тепер зветься Турнір',
      body: 'Ми самі плуталися, де арена, а де ліга. Виявилося, простіше перейменувати розділ, ніж щоразу пояснювати.',
    },
    {
      icon: 'ticket-outline',
      title: 'Вхід у турнір — безкоштовний',
      body: 'Раніше він коштував перлини. Ми порахували й вирішили, що брати плату за бажання позмагатися — так собі ідея.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Моя практика» відкрита повністю',
      body: 'Денний ліміт тренувань знято, преміум для тренажера більше не потрібен. Займайтеся скільки хочеться.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: 'Окремий екран «Друзі» поїхав',
      body: 'Усе живе з нього — змагання та запрошення — тепер у Турнірі та запрошеннях. Окрема вкладка просто припадала пилом.',
    },
    {
      icon: 'flash-outline',
      title: 'Ліга й турніри відкриваються одразу',
      body: 'Раніше подіум міг думати секунд десять. Ми полагодили — тепер екрани відкриваються з даними, а не з порожнечею.',
    },
  ],
  footer: 'Ще ми виправили десятки дрібниць, яких ви, сподіваємось, ніколи не помічали.',
  cta: 'Зрозуміло, йдемо далі',
  close: 'Закрити',
};

// ── es ──────────────────────────────────────────────────────────────────────
const ES: ReleaseNotesTexts = {
  pill: 'Qué ha cambiado',
  title: 'Hemos movido un poco los muebles',
  subtitle: 'Mientras no estabas, algunas cosas cambiaron de sitio y de nombre. Te contamos cuáles y por qué.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Los fragmentos ahora son perlas',
      body: 'Solo es un nombre nuevo: tenías 1000 fragmentos y ahora tienes 1000 perlas. Uno a uno, sin cambios ni letra pequeña.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'La Arena ahora se llama Torneo',
      body: 'Nosotros mismos confundíamos la arena con la liga. Resultó más fácil cambiarle el nombre que explicarlo cada vez.',
    },
    {
      icon: 'ticket-outline',
      title: 'Entrar al torneo es gratis',
      body: 'Antes costaba perlas. Echamos cuentas y decidimos que cobrar por querer competir no era una gran idea.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Mi práctica» está abierta del todo',
      body: 'Sin límite diario de sesiones y sin premium para el entrenador. Practica todo lo que quieras.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: 'La pantalla «Amigos» se ha ido',
      body: 'Lo que de verdad usabas — competir e invitar — está ahora en Torneo y en las invitaciones. Esa pestaña solo cogía polvo.',
    },
    {
      icon: 'flash-outline',
      title: 'La liga y los torneos abren al instante',
      body: 'Antes el podio podía pensárselo diez segundos. Ya está arreglado: las pantallas abren con datos, no en blanco.',
    },
  ],
  footer: 'También corregimos decenas de detalles que, esperamos, nunca llegaste a notar.',
  cta: 'Entendido, seguimos',
  close: 'Cerrar',
};

// ── pt-BR ───────────────────────────────────────────────────────────────────
const PT_BR: ReleaseNotesTexts = {
  pill: 'O que mudou',
  title: 'Mudamos os móveis de lugar',
  subtitle: 'Enquanto você não estava, algumas coisas mudaram de lugar e de nome. Contamos quais e por quê.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Fragmentos agora são pérolas',
      body: 'É só um nome novo: você tinha 1000 fragmentos e agora tem 1000 pérolas. Um por um, sem troca e sem letra miúda.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'A Arena agora se chama Torneio',
      body: 'Nós mesmos confundíamos arena com liga. Foi mais fácil renomear a seção do que explicar toda vez.',
    },
    {
      icon: 'ticket-outline',
      title: 'Entrar no torneio é grátis',
      body: 'Antes custava pérolas. Fizemos as contas e concluímos que cobrar pela vontade de competir não era boa ideia.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Minha prática» está totalmente liberada',
      body: 'Sem limite diário de sessões e sem premium para o treinador. Pratique o quanto quiser.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: 'A tela «Amigos» foi embora',
      body: 'O que você realmente usava — competir e convidar — está agora no Torneio e nos convites. Aquela aba só juntava poeira.',
    },
    {
      icon: 'flash-outline',
      title: 'Liga e torneios abrem na hora',
      body: 'Antes o pódio pensava uns dez segundos. Já foi corrigido: as telas abrem com dados, não vazias.',
    },
  ],
  footer: 'Também ajustamos dezenas de detalhes que, esperamos, você nunca chegou a notar.',
  cta: 'Entendi, vamos lá',
  close: 'Fechar',
};

// ── vi ──────────────────────────────────────────────────────────────────────
const VI: ReleaseNotesTexts = {
  pill: 'Có gì thay đổi',
  title: 'Chúng tôi đã kê lại đồ đạc một chút',
  subtitle: 'Trong lúc bạn vắng mặt, vài thứ đã đổi chỗ và đổi tên. Đây là những gì đã thay đổi và vì sao.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Mảnh ghép nay là ngọc trai',
      body: 'Chỉ là tên gọi mới: bạn có 1000 mảnh ghép thì nay có 1000 ngọc trai. Đổi một đổi một, không quy đổi, không chữ nhỏ.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'Đấu trường nay gọi là Giải đấu',
      body: 'Chính chúng tôi cũng nhầm giữa đấu trường và giải hạng. Đổi tên hoá ra dễ hơn là giải thích mỗi lần.',
    },
    {
      icon: 'ticket-outline',
      title: 'Vào giải đấu miễn phí',
      body: 'Trước đây tốn ngọc trai. Tính đi tính lại, thu phí cho việc muốn thi đấu nghe không ổn lắm.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Luyện tập của tôi» mở hoàn toàn',
      body: 'Bỏ giới hạn số buổi mỗi ngày, không cần bản premium cho phần luyện tập. Tập bao nhiêu tuỳ bạn.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: 'Màn hình «Bạn bè» đã rời đi',
      body: 'Những gì bạn thật sự dùng — thi đấu và mời bạn — nay nằm trong Giải đấu và phần lời mời. Thẻ riêng kia chỉ nằm không.',
    },
    {
      icon: 'flash-outline',
      title: 'Giải hạng và giải đấu mở ngay lập tức',
      body: 'Trước đây bục vinh danh có thể nghĩ mất mười giây. Đã sửa: màn hình mở ra là có dữ liệu, không còn trống trơn.',
    },
  ],
  footer: 'Chúng tôi cũng sửa hàng chục chi tiết nhỏ mà hy vọng bạn chưa từng phải để ý.',
  cta: 'Đã hiểu, tiếp tục',
  close: 'Đóng',
};

// ── id ──────────────────────────────────────────────────────────────────────
const ID: ReleaseNotesTexts = {
  pill: 'Apa yang berubah',
  title: 'Kami menggeser sedikit perabotnya',
  subtitle: 'Selagi kamu pergi, beberapa hal pindah tempat dan ganti nama. Ini daftarnya dan alasannya.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Serpihan kini jadi mutiara',
      body: 'Hanya nama baru: punya 1000 serpihan berarti kini punya 1000 mutiara. Satu banding satu, tanpa penukaran dan tanpa tulisan kecil.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'Arena sekarang bernama Turnamen',
      body: 'Kami sendiri tertukar antara arena dan liga. Ternyata lebih mudah mengganti namanya daripada menjelaskan tiap kali.',
    },
    {
      icon: 'ticket-outline',
      title: 'Masuk turnamen gratis',
      body: 'Dulu perlu mutiara. Setelah dihitung, menarik bayaran karena ingin bertanding rasanya kurang masuk akal.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Latihanku» terbuka sepenuhnya',
      body: 'Batas sesi harian dihapus dan premium tidak lagi diperlukan untuk latihan. Berlatihlah sepuasnya.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: 'Layar «Teman» sudah pergi',
      body: 'Yang benar-benar kamu pakai — bertanding dan mengundang — kini ada di Turnamen dan undangan. Tab itu hanya berdebu.',
    },
    {
      icon: 'flash-outline',
      title: 'Liga dan turnamen langsung terbuka',
      body: 'Dulu podium bisa berpikir sepuluh detik. Sudah diperbaiki: layar terbuka dengan data, bukan kosong.',
    },
  ],
  footer: 'Kami juga membereskan puluhan detail kecil yang semoga tidak pernah kamu sadari.',
  cta: 'Mengerti, lanjut',
  close: 'Tutup',
};

// ── tr ──────────────────────────────────────────────────────────────────────
const TR: ReleaseNotesTexts = {
  pill: 'Neler değişti',
  title: 'Mobilyaları biraz kaydırdık',
  subtitle: 'Siz yokken bazı şeyler yer ve isim değiştirdi. Nereye ve neden, anlatıyoruz.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Parçalar artık inci',
      body: 'Sadece yeni bir isim: 1000 parçanız vardıysa artık 1000 inciniz var. Bire bir, takas yok, küçük punto yok.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'Arena artık Turnuva',
      body: 'Arenayla ligi biz bile karıştırıyorduk. Bölümün adını değiştirmek her seferinde açıklamaktan kolay çıktı.',
    },
    {
      icon: 'ticket-outline',
      title: 'Turnuvaya giriş ücretsiz',
      body: 'Eskiden inci gerekiyordu. Hesapladık ve yarışmak istemenin bedeli olmaması gerektiğine karar verdik.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Pratiğim» tamamen açık',
      body: 'Günlük oturum sınırı kalktı, alıştırma için premium gerekmiyor. İstediğiniz kadar çalışın.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: '«Arkadaşlar» ekranı gitti',
      body: 'Gerçekten kullandığınız her şey — yarışmak ve davet etmek — artık Turnuva ve davetlerde. O sekme sadece tozlanıyordu.',
    },
    {
      icon: 'flash-outline',
      title: 'Lig ve turnuvalar anında açılıyor',
      body: 'Eskiden kürsü on saniye düşünebiliyordu. Düzeltildi: ekranlar boş değil, veriyle açılıyor.',
    },
  ],
  footer: 'Ayrıca umarız hiç fark etmediğiniz onlarca küçük ayrıntıyı düzelttik.',
  cta: 'Anladım, devam',
  close: 'Kapat',
};

// ── pl ──────────────────────────────────────────────────────────────────────
const PL: ReleaseNotesTexts = {
  pill: 'Co się zmieniło',
  title: 'Trochę poprzestawialiśmy meble',
  subtitle: 'Gdy was nie było, kilka rzeczy zmieniło miejsce i nazwę. Mówimy, co i dlaczego.',
  items: [
    {
      icon: 'diamond-outline',
      title: 'Okruchy zmieniły się w perły',
      body: 'To tylko nowa nazwa: było 1000 okruchów, jest 1000 pereł. Jeden do jednego, bez wymiany i bez drobnego druku.',
      reassuring: true,
    },
    {
      icon: 'trophy-outline',
      title: 'Arena nazywa się teraz Turniej',
      body: 'Sami myliliśmy arenę z ligą. Okazało się, że łatwiej zmienić nazwę sekcji, niż tłumaczyć za każdym razem.',
    },
    {
      icon: 'ticket-outline',
      title: 'Wejście do turnieju jest darmowe',
      body: 'Wcześniej kosztowało perły. Policzyliśmy i uznaliśmy, że pobieranie opłaty za chęć rywalizacji to słaby pomysł.',
      reassuring: true,
    },
    {
      icon: 'barbell-outline',
      title: '«Moja praktyka» otwarta w całości',
      body: 'Dzienny limit sesji zniknął, premium do trenażera nie jest już potrzebne. Ćwiczcie, ile chcecie.',
      reassuring: true,
    },
    {
      icon: 'people-outline',
      title: 'Osobny ekran «Znajomi» odjechał',
      body: 'To, czego naprawdę używaliście — rywalizacja i zaproszenia — jest teraz w Turnieju i zaproszeniach. Tamta zakładka tylko się kurzyła.',
    },
    {
      icon: 'flash-outline',
      title: 'Liga i turnieje otwierają się od razu',
      body: 'Wcześniej podium potrafiło myśleć dziesięć sekund. Naprawione: ekrany otwierają się z danymi, nie z pustką.',
    },
  ],
  footer: 'Poprawiliśmy też dziesiątki drobiazgów, których — mamy nadzieję — nigdy nie zauważyliście.',
  cta: 'Jasne, idziemy dalej',
  close: 'Zamknij',
};

const RELEASE_NOTES_BY_LOCALE: LocaleMap<ReleaseNotesTexts> = {
  ru: RU,
  uk: UK,
  es: ES,
  'pt-BR': PT_BR,
  vi: VI,
  id: ID,
  tr: TR,
  pl: PL,
};

/** Тексты окна для языка интерфейса. Неизвестный язык → русский. */
export function pickReleaseNotesTexts(lang: string): ReleaseNotesTexts {
  return RELEASE_NOTES_BY_LOCALE[lang as ReleaseNotesLocale] ?? RU;
}
