// ════════════════════════════════════════════════════════════════════════════
// release_notes_copy.ts — разговорное окно «что нового» для build 118+.
//
// Старому пользователю нужно не техническое перечисление релиза, а короткое
// человеческое объяснение новых правил и вернувшихся разделов. Поэтому каждый
// пункт — самостоятельная разговорная глава: ясный факт, затем живая реплика.
// Тексты отделены от JSX, чтобы восемь локалей не раздували компонент.
// ════════════════════════════════════════════════════════════════════════════

import type Ionicons from '@expo/vector-icons/Ionicons';

export type ReleaseNotesLocale =
  | 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

type LocaleMap<T> = Record<ReleaseNotesLocale, T>;

export type ReleaseNoteItem = {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly body: string;
  readonly tone?: 'gold' | 'blue';
};

export type ReleaseNotesTexts = {
  readonly pill: string;
  readonly title: string;
  readonly subtitle: string;
  readonly items: readonly ReleaseNoteItem[];
  readonly footer: string;
  readonly cta: string;
  readonly close: string;
};

const RU: ReleaseNotesTexts = {
  pill: 'Что нового',
  title: 'Мы тут снова всё поменяли',
  subtitle: 'Спокойно: сейчас расскажем, что куда переехало и зачем.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Сначала — про энергию', body: 'Она больше не улетает за промахи. Теперь энергия списывается при запуске сессии. Вышел раньше — новый запуск снова попросит энергию. Всё честно и заранее.' },
    { icon: 'heart-outline', tone: 'blue', title: 'У тебя три попытки', body: 'Когда они закончатся, сессия тоже завершится. Хочешь продолжить — восстанови попытки за монеты.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'А монеты откуда?', body: 'Никаких тайных шахт. Проходи сессии и тренажёры — и скоро заметишь, как легко они копятся.' },
    { icon: 'person-outline', tone: 'blue', title: 'Мы освежили твой образ', body: 'Новые аватары и ауры уже в оформлении профиля. Загляни — вдруг там ждёт именно твоя.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '«Маршрут» собирает чемоданы', body: 'Им пользовались редко, а весил он много. Ещё немного поработает, потом попрощаемся — и приложение станет легче.' },
  ],
  footer: 'Вот теперь всё. Можно идти смотреть, что мы натворили.',
  cta: 'Пойти посмотреть',
  close: 'Закрыть обновление',
};

const UK: ReleaseNotesTexts = {
  pill: 'Що нового',
  title: 'Ми тут знову все змінили',
  subtitle: 'Спокійно: зараз розповімо, що куди переїхало й навіщо.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Спочатку — про енергію', body: 'Вона більше не зникає через промахи. Тепер енергія списується під час запуску сесії. Вийшов раніше — новий запуск знову попросить енергію. Усе чесно й заздалегідь.' },
    { icon: 'heart-outline', tone: 'blue', title: 'У тебе три спроби', body: 'Коли вони закінчаться, сесія теж завершиться. Хочеш продовжити — віднови спроби за монети.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'А звідки брати монети?', body: 'Жодних таємних шахт. Проходь сесії та тренажери — і незабаром помітиш, як легко вони накопичуються.' },
    { icon: 'person-outline', tone: 'blue', title: 'Ми освіжили твій образ', body: 'Нові аватари й аури вже в оформленні профілю. Зазирни — раптом там чекає саме твоя.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '«Маршрут» пакує валізи', body: 'Ним користувалися рідко, а важив він чимало. Ще трохи попрацює, потім попрощаємося — і застосунок стане легшим.' },
  ],
  footer: 'Ось тепер усе. Можна йти дивитися, що ми наробили.',
  cta: 'Піти подивитися',
  close: 'Закрити оновлення',
};

// зачем (координатор 12.10, подготовка к английскому интерфейсу): английский вариант окна «что нового» (при lang=en раньше показывался русский).
const EN: ReleaseNotesTexts = {
  pill: "What's new",
  title: 'We changed everything again',
  subtitle: 'Relax: here is what moved and why.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'First, about energy', body: 'It no longer vanishes when you miss. Energy is now spent when a session starts. If you leave early, the next start asks for energy again. Fair and upfront.' },
    { icon: 'heart-outline', tone: 'blue', title: 'You have three tries', body: 'When they run out, the session ends too. Want to keep going? Restore your tries with coins.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'And where do coins come from?', body: 'No secret mines. Finish sessions and drills — you will soon see how easily they add up.' },
    { icon: 'person-outline', tone: 'blue', title: 'We refreshed your look', body: 'New avatars and auras are already in your profile styling. Take a look — yours might be waiting.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '"Route" is packing its bags', body: 'Few people used it, and it weighed a lot. It works a little longer, then we say goodbye — and the app gets lighter.' },
  ],
  footer: 'That is everything. Go and see what we did.',
  cta: 'Go and see',
  close: 'Close update',
};

const ES: ReleaseNotesTexts = {
  pill: 'Qué hay de nuevo',
  title: 'Hemos vuelto a cambiarlo todo',
  subtitle: 'Tranquilo: te contamos qué se ha movido y por qué.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Primero, la energía', body: 'Ya no se gasta cuando fallas. Ahora se descuenta al iniciar una sesión. Si sales antes, el siguiente inicio volverá a pedir energía. Sin sorpresas.' },
    { icon: 'heart-outline', tone: 'blue', title: 'Tienes tres intentos', body: 'Cuando se acaben, la sesión también terminará. Si quieres seguir, recupera los intentos con runas.' },
    { icon: 'sparkles-outline', tone: 'gold', title: '¿Y las runas de dónde salen?', body: 'Nada de minas secretas. Completa sesiones y entrenamientos y pronto verás lo fácil que es reunirlas.' },
    { icon: 'person-outline', tone: 'blue', title: 'Hemos renovado tu estilo', body: 'Ya hay nuevos avatares y auras en la personalización del perfil. Asómate: quizá la tuya te esté esperando.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '«Ruta» hace las maletas', body: 'Se usaba poco y pesaba mucho. Seguirá un tiempo, después nos despediremos y la aplicación quedará más ligera.' },
  ],
  footer: 'Ahora sí, eso es todo. Ve a ver lo que hemos preparado.',
  cta: 'Ir a verlo',
  close: 'Cerrar la actualización',
};

const PT_BR: ReleaseNotesTexts = {
  pill: 'O que há de novo',
  title: 'A gente mudou tudo de novo',
  subtitle: 'Calma: vamos contar o que mudou de lugar e por quê.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Primeiro, a energia', body: 'Ela não some mais quando você erra. Agora a energia é descontada ao iniciar a sessão. Saiu antes? O próximo início vai pedir energia de novo. Sem surpresas.' },
    { icon: 'heart-outline', tone: 'blue', title: 'Você tem três tentativas', body: 'Quando elas acabarem, a sessão também termina. Quer continuar? Recupere as tentativas com runas.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'E de onde vêm as runas?', body: 'Nada de minas secretas. Complete sessões e treinos e logo você vai ver como é fácil juntar runas.' },
    { icon: 'person-outline', tone: 'blue', title: 'Renovamos o seu visual', body: 'Novos avatares e auras já estão na personalização do perfil. Dá uma olhada: talvez a sua esteja esperando.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: 'A «Rota» está de malas prontas', body: 'Pouca gente usava e ela pesava bastante. Vai funcionar por mais um tempo; depois nos despedimos e o app fica mais leve.' },
  ],
  footer: 'Agora sim, é tudo. Pode ir ver o que a gente aprontou.',
  cta: 'Ir conferir',
  close: 'Fechar a atualização',
};

const VI: ReleaseNotesTexts = {
  pill: 'Có gì mới',
  title: 'Tụi mình lại thay đổi mọi thứ',
  subtitle: 'Bình tĩnh nhé: giờ tụi mình kể xem thứ gì đã chuyển đi đâu và vì sao.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Trước tiên là năng lượng', body: 'Năng lượng không còn bị trừ khi bạn trả lời trượt. Giờ nó được trừ lúc bắt đầu phiên. Thoát sớm thì lần bắt đầu mới sẽ cần năng lượng lần nữa. Rõ ràng từ đầu.' },
    { icon: 'heart-outline', tone: 'blue', title: 'Bạn có ba lượt thử', body: 'Khi hết lượt, phiên cũng kết thúc. Muốn tiếp tục thì dùng rune để khôi phục lượt thử.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'Rune kiếm ở đâu?', body: 'Không có hầm mỏ bí mật nào cả. Hoàn thành phiên và bài luyện, bạn sẽ sớm thấy rune tích lại dễ thế nào.' },
    { icon: 'person-outline', tone: 'blue', title: 'Diện mạo của bạn đã mới hơn', body: 'Avatar và hào quang mới đã có trong phần trang trí hồ sơ. Ghé xem nhé, biết đâu món hợp với bạn đang chờ ở đó.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '«Lộ trình» đang xếp hành lý', body: 'Ít người dùng nhưng phần này lại khá nặng. Nó sẽ hoạt động thêm một thời gian rồi chia tay để ứng dụng nhẹ hơn.' },
  ],
  footer: 'Giờ thì hết thật rồi. Đi xem tụi mình đã làm gì nhé.',
  cta: 'Đi xem ngay',
  close: 'Đóng cập nhật',
};

const ID: ReleaseNotesTexts = {
  pill: 'Yang baru',
  title: 'Kami mengubah semuanya lagi',
  subtitle: 'Tenang, kami akan jelaskan apa yang pindah dan alasannya.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Pertama, soal energi', body: 'Energi tidak lagi habis karena jawaban meleset. Sekarang energi dipakai saat sesi dimulai. Keluar lebih awal? Mulai lagi akan memakai energi lagi. Jelas dari awal.' },
    { icon: 'heart-outline', tone: 'blue', title: 'Kamu punya tiga kesempatan', body: 'Saat kesempatan habis, sesi juga berakhir. Ingin lanjut? Pulihkan kesempatan dengan rune.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'Rune didapat dari mana?', body: 'Tidak ada tambang rahasia. Selesaikan sesi dan latihan, lalu kamu akan segera melihat betapa mudahnya rune terkumpul.' },
    { icon: 'person-outline', tone: 'blue', title: 'Gayamu kami segarkan', body: 'Avatar dan aura baru sudah ada di personalisasi profil. Coba lihat: mungkin yang cocok untukmu sudah menunggu.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '«Rute» sedang berkemas', body: 'Jarang dipakai, tetapi cukup membebani aplikasi. Rute masih berjalan sebentar, lalu kita berpisah agar aplikasi lebih ringan.' },
  ],
  footer: 'Nah, sekarang selesai. Ayo lihat apa yang sudah kami kerjakan.',
  cta: 'Lihat sekarang',
  close: 'Tutup pembaruan',
};

const TR: ReleaseNotesTexts = {
  pill: 'Neler yeni',
  title: 'Yine her şeyi değiştirdik',
  subtitle: 'Sakin: neyin nereye taşındığını ve nedenini şimdi anlatıyoruz.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Önce enerji meselesi', body: 'Enerji artık kaçırdığın cevaplarda uçup gitmiyor. Şimdi oturumu başlatırken harcanıyor. Erken çıkarsan yeni başlangıç tekrar enerji ister. Baştan açık ve net.' },
    { icon: 'heart-outline', tone: 'blue', title: 'Üç deneme hakkın var', body: 'Hakların bitince oturum da sona erer. Devam etmek istersen rünlerle haklarını yenileyebilirsin.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'Peki rünler nereden geliyor?', body: 'Gizli maden yok. Oturumları ve alıştırmaları tamamla; rünlerin ne kadar kolay biriktiğini yakında göreceksin.' },
    { icon: 'person-outline', tone: 'blue', title: 'Görünümünü yeniledik', body: 'Yeni avatarlar ve auralar profil görünümünde hazır. Bir göz at; belki sana göre olan çoktan bekliyordur.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '«Rota» bavullarını topluyor', body: 'Az kullanılıyordu ama uygulamada çok yer kaplıyordu. Bir süre daha çalışacak, sonra vedalaşacağız ve uygulama hafifleyecek.' },
  ],
  footer: 'İşte şimdi bitti. Neler yaptığımıza bakabilirsin.',
  cta: 'Gidip bak',
  close: 'Güncellemeyi kapat',
};

const PL: ReleaseNotesTexts = {
  pill: 'Co nowego',
  title: 'Znowu wszystko pozmienialiśmy',
  subtitle: 'Spokojnie: już mówimy, co się przeniosło i dlaczego.',
  items: [
    { icon: 'flash-outline', tone: 'gold', title: 'Najpierw energia', body: 'Energia nie znika już przez nietrafione odpowiedzi. Teraz pobieramy ją przy rozpoczęciu sesji. Wyjdziesz wcześniej — kolejne uruchomienie znów poprosi o energię. Wszystko jasne od początku.' },
    { icon: 'heart-outline', tone: 'blue', title: 'Masz trzy próby', body: 'Kiedy się skończą, sesja również dobiegnie końca. Chcesz grać dalej? Odnów próby za runy.' },
    { icon: 'sparkles-outline', tone: 'gold', title: 'A skąd brać runy?', body: 'Żadnych tajnych kopalni. Kończ sesje i treningi, a szybko zobaczysz, jak łatwo runy się zbierają.' },
    { icon: 'person-outline', tone: 'blue', title: 'Odświeżyliśmy twój wygląd', body: 'Nowe awatary i aury są już w personalizacji profilu. Zajrzyj tam — może twoja już czeka.' },
    { icon: 'swap-horizontal-outline', tone: 'blue', title: '„Trasa” pakuje walizki', body: 'Korzystało z niej niewiele osób, a zajmowała sporo miejsca. Jeszcze trochę popracuje, potem się pożegnamy i aplikacja będzie lżejsza.' },
  ],
  footer: 'Teraz to już wszystko. Możesz zobaczyć, co przygotowaliśmy.',
  cta: 'Idź zobaczyć',
  close: 'Zamknij aktualizację',
};

const RELEASE_NOTES_BY_LOCALE: LocaleMap<ReleaseNotesTexts> = {
  ru: RU,
  uk: UK,
  en: EN,
  es: ES,
  'pt-BR': PT_BR,
  vi: VI,
  id: ID,
  tr: TR,
  pl: PL,
};

export function pickReleaseNotesTexts(lang: string): ReleaseNotesTexts {
  return RELEASE_NOTES_BY_LOCALE[lang as ReleaseNotesLocale] ?? RU;
}
