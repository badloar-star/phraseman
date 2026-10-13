import type Ionicons from '@expo/vector-icons/Ionicons';

type Locale = 'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

export type ReleaseNotesV2Item = Readonly<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}>;

export type ReleaseNotesV2Texts = Readonly<{
  eyebrow: string;
  title: string;
  hero: string;
  items: readonly [ReleaseNotesV2Item, ReleaseNotesV2Item, ReleaseNotesV2Item];
  // Строка про Пик: есть только у ru/uk и показывается окном лишь при включённом рубильнике (isSpireTabEnabled).
  peak?: ReleaseNotesV2Item;
  cta: string;
  close: string;
}>;

// зачем (координатор 06:50, §CORE-0168): окно «Что нового» не обещает того, чего нет в стор-сборке — Шпиль скрыт
// рубильником spire_tab_enabled, поэтому заголовок про новый дизайн и темы; заглушка «legacy reward» заменена фразой.
// Сторож: tests/release_notes_v2_store_surface_guard.test.mjs.
const TEXTS: Readonly<Record<Locale, ReleaseNotesV2Texts>> = {
  ru: {
    eyebrow: 'Что нового · 2.0', title: 'Новый PhraseMan', hero: 'Новый дизайн и темы',
    items: [
      { icon: 'layers-outline', title: 'Карточки из видео', body: 'Фразы из роликов — одной кнопкой в свои наборы' },
      { icon: 'flash-outline', title: 'Энергия проще', body: 'Пять делений, одно занятие — одно деление' },
      { icon: 'checkmark-outline', title: 'Только монеты', body: 'Опыт ушёл, награда одна — монеты' },
    ],
    // зачем (координатор 13.10, №34): Пик упоминаем ТОЛЬКО когда он виден человеку — флаг + интерфейс ru/uk; к обновлению из стора (~20.10) флаг уже включён.
    peak: { icon: 'trophy-outline', title: 'Пик', body: 'Недельная башня: поднимайся по этажам вместе с соперниками' },
    cta: 'Понятно', close: 'Закрыть окно «Что нового»',
  },
  uk: {
    eyebrow: 'Що нового · 2.0', title: 'Новий PhraseMan', hero: 'Новий дизайн і теми',
    items: [
      { icon: 'layers-outline', title: 'Картки з відео', body: 'Вислови з роликів — одним натисканням у свої набори' },
      { icon: 'flash-outline', title: 'Енергія простіша', body: 'П’ять поділок, одне заняття — одна поділка' },
      { icon: 'checkmark-outline', title: 'Лише монети', body: 'Досвід пішов, нагорода одна — монети' },
    ],
    peak: { icon: 'trophy-outline', title: 'Пік', body: 'Тижнева вежа: піднімайся поверхами разом із суперниками' },
    cta: 'Зрозуміло', close: 'Закрити вікно «Що нового»',
  },
  en: {
    eyebrow: 'What’s new · 2.0', title: 'A new PhraseMan', hero: 'A new look and themes',
    items: [
      { icon: 'layers-outline', title: 'Cards from videos', body: 'Save phrases from videos to your packs with one tap' },
      { icon: 'flash-outline', title: 'Simpler energy', body: 'Five units; one session uses one unit' },
      { icon: 'checkmark-outline', title: 'Coins only', body: 'Experience points are gone; coins are your reward' },
    ],
    cta: 'Got it', close: 'Close What’s new',
  },
  es: {
    eyebrow: 'Novedades · 2.0', title: 'El nuevo PhraseMan', hero: 'Nuevo diseño y temas',
    items: [
      { icon: 'layers-outline', title: 'Tarjetas de vídeos', body: 'Guarda frases de vídeos en tus colecciones con un toque' },
      { icon: 'flash-outline', title: 'Energía más sencilla', body: 'Cinco unidades; una sesión consume una' },
      { icon: 'checkmark-outline', title: 'Solo monedas', body: 'La experiencia desaparece: recibes monedas' },
    ],
    cta: 'Entendido', close: 'Cerrar Novedades',
  },
  'pt-BR': {
    eyebrow: 'Novidades · 2.0', title: 'O novo PhraseMan', hero: 'Novo visual e temas',
    items: [
      { icon: 'layers-outline', title: 'Cartões dos vídeos', body: 'Salve frases dos vídeos nos seus pacotes com um toque' },
      { icon: 'flash-outline', title: 'Energia mais simples', body: 'Cinco unidades; uma sessão consome uma' },
      { icon: 'checkmark-outline', title: 'Só moedas', body: 'A experiência saiu: as recompensas são moedas' },
    ],
    cta: 'Entendi', close: 'Fechar Novidades',
  },
  vi: {
    eyebrow: 'Có gì mới · 2.0', title: 'PhraseMan mới', hero: 'Giao diện và chủ đề mới',
    items: [
      { icon: 'layers-outline', title: 'Thẻ từ video', body: 'Lưu cụm từ trong video vào bộ thẻ chỉ bằng một chạm' },
      { icon: 'flash-outline', title: 'Năng lượng đơn giản hơn', body: 'Năm vạch; một buổi học dùng một vạch' },
      { icon: 'checkmark-outline', title: 'Chỉ còn xu', body: 'Không còn điểm kinh nghiệm; phần thưởng là xu' },
    ],
    cta: 'Đã hiểu', close: 'Đóng Có gì mới',
  },
  id: {
    eyebrow: 'Yang baru · 2.0', title: 'PhraseMan baru', hero: 'Tampilan dan tema baru',
    items: [
      { icon: 'layers-outline', title: 'Kartu dari video', body: 'Simpan frasa dari video ke paketmu dengan satu ketukan' },
      { icon: 'flash-outline', title: 'Energi lebih sederhana', body: 'Lima unit; satu sesi memakai satu unit' },
      { icon: 'checkmark-outline', title: 'Hanya koin', body: 'Poin pengalaman dihapus; hadiahmu kini koin' },
    ],
    cta: 'Mengerti', close: 'Tutup Yang baru',
  },
  tr: {
    eyebrow: 'Yenilikler · 2.0', title: 'Yeni PhraseMan', hero: 'Yeni tasarım ve temalar',
    items: [
      { icon: 'layers-outline', title: 'Videolardan kartlar', body: 'Videolardaki ifadeleri tek dokunuşla paketlerine ekle' },
      { icon: 'flash-outline', title: 'Daha basit enerji', body: 'Beş birim; bir oturum bir birim harcar' },
      { icon: 'checkmark-outline', title: 'Yalnızca madeni para', body: 'Deneyim puanı kalktı; ödülün madeni para' },
    ],
    cta: 'Anladım', close: 'Yenilikleri kapat',
  },
  pl: {
    eyebrow: 'Co nowego · 2.0', title: 'Nowy PhraseMan', hero: 'Nowy wygląd i motywy',
    items: [
      { icon: 'layers-outline', title: 'Fiszki z filmów', body: 'Zapisuj zwroty z filmów w swoich zestawach jednym dotknięciem' },
      { icon: 'flash-outline', title: 'Prostsza energia', body: 'Pięć jednostek; jedna sesja zużywa jedną' },
      { icon: 'checkmark-outline', title: 'Tylko monety', body: 'Punkty doświadczenia odchodzą; nagrodą są monety' },
    ],
    cta: 'Rozumiem', close: 'Zamknij Co nowego',
  },
};

export function pickReleaseNotesV2Texts(lang: string): ReleaseNotesV2Texts {
  return TEXTS[lang as Locale] ?? TEXTS.ru;
}
