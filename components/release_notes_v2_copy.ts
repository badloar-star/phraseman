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
  cta: string;
  close: string;
}>;

const TEXTS: Readonly<Record<Locale, ReleaseNotesV2Texts>> = {
  ru: {
    eyebrow: 'Что нового · 2.0', title: 'Новый PhraseMan', hero: 'Шпиль вместо лиги',
    items: [
      { icon: 'layers-outline', title: 'Карточки из видео', body: 'Фразы из роликов — одной кнопкой в свои наборы' },
      { icon: 'flash-outline', title: 'Энергия проще', body: 'Пять делений, одно занятие — одно деление' },
      { icon: 'checkmark-outline', title: 'Только монеты', body: 'Опыт ушёл, награда одна — монеты' },
    ],
    cta: 'Понятно', close: 'Закрыть окно «Что нового»',
  },
  uk: {
    eyebrow: 'Що нового · 2.0', title: 'Новий PhraseMan', hero: 'Шпиль і новий прогрес',
    items: [
      { icon: 'layers-outline', title: 'Картки з відео', body: 'Фрази з роликів — одним натисканням у свої набори' },
      { icon: 'flash-outline', title: 'Енергія простіша', body: 'П’ять поділок, одне заняття — одна поділка' },
      { icon: 'checkmark-outline', title: 'Лише монети', body: 'Досвід пішов, нагорода одна — монети' },
    ],
    cta: 'Зрозуміло', close: 'Закрити вікно «Що нового»',
  },
  en: {
    eyebrow: 'What’s new · 2.0', title: 'A new PhraseMan', hero: 'The Spire and new progress',
    items: [
      { icon: 'layers-outline', title: 'Cards from videos', body: 'Save phrases from videos to your packs with one tap' },
      { icon: 'flash-outline', title: 'Simpler energy', body: 'Five units; one session uses one unit' },
      { icon: 'checkmark-outline', title: 'Coins only', body: 'legacy reward is gone. Coins are your rewards' },
    ],
    cta: 'Got it', close: 'Close What’s new',
  },
  es: {
    eyebrow: 'Novedades · 2.0', title: 'El nuevo PhraseMan', hero: 'La Aguja y un nuevo progreso',
    items: [
      { icon: 'layers-outline', title: 'Tarjetas de vídeos', body: 'Guarda frases de vídeos en tus colecciones con un toque' },
      { icon: 'flash-outline', title: 'Energía más sencilla', body: 'Cinco unidades; una sesión consume una' },
      { icon: 'checkmark-outline', title: 'Solo monedas', body: 'La experiencia desaparece: recibes monedas' },
    ],
    cta: 'Entendido', close: 'Cerrar Novedades',
  },
  'pt-BR': {
    eyebrow: 'Novidades · 2.0', title: 'O novo PhraseMan', hero: 'A Torre e um novo progresso',
    items: [
      { icon: 'layers-outline', title: 'Cartões dos vídeos', body: 'Salve frases dos vídeos nos seus pacotes com um toque' },
      { icon: 'flash-outline', title: 'Energia mais simples', body: 'Cinco unidades; uma sessão consome uma' },
      { icon: 'checkmark-outline', title: 'Só moedas', body: 'A experiência saiu: as recompensas são moedas' },
    ],
    cta: 'Entendi', close: 'Fechar Novidades',
  },
  vi: {
    eyebrow: 'Có gì mới · 2.0', title: 'PhraseMan mới', hero: 'Tháp thay thế bảng xếp hạng',
    items: [
      { icon: 'layers-outline', title: 'Thẻ từ video', body: 'Lưu cụm từ trong video vào bộ thẻ chỉ bằng một chạm' },
      { icon: 'flash-outline', title: 'Năng lượng đơn giản hơn', body: 'Năm vạch; một buổi học dùng một vạch' },
      { icon: 'checkmark-outline', title: 'Chỉ còn xu', body: 'Không còn legacy reward; phần thưởng là xu' },
    ],
    cta: 'Đã hiểu', close: 'Đóng Có gì mới',
  },
  id: {
    eyebrow: 'Yang baru · 2.0', title: 'PhraseMan baru', hero: 'Menara dan progres baru',
    items: [
      { icon: 'layers-outline', title: 'Kartu dari video', body: 'Simpan frasa dari video ke paketmu dengan satu ketukan' },
      { icon: 'flash-outline', title: 'Energi lebih sederhana', body: 'Lima unit; satu sesi memakai satu unit' },
      { icon: 'checkmark-outline', title: 'Hanya koin', body: 'legacy reward telah dihapus; hadiahmu kini koin' },
    ],
    cta: 'Mengerti', close: 'Tutup Yang baru',
  },
  tr: {
    eyebrow: 'Yenilikler · 2.0', title: 'Yeni PhraseMan', hero: 'Kule liglerin yerini aldı',
    items: [
      { icon: 'layers-outline', title: 'Videolardan kartlar', body: 'Videolardaki ifadeleri tek dokunuşla paketlerine ekle' },
      { icon: 'flash-outline', title: 'Daha basit enerji', body: 'Beş birim; bir oturum bir birim harcar' },
      { icon: 'checkmark-outline', title: 'Yalnızca madeni para', body: 'legacy reward kalktı; ödülün madeni para' },
    ],
    cta: 'Anladım', close: 'Yenilikleri kapat',
  },
  pl: {
    eyebrow: 'Co nowego · 2.0', title: 'Nowy PhraseMan', hero: 'Iglica zamiast lig',
    items: [
      { icon: 'layers-outline', title: 'Fiszki z filmów', body: 'Zapisuj zwroty z filmów w swoich zestawach jednym dotknięciem' },
      { icon: 'flash-outline', title: 'Prostsza energia', body: 'Pięć jednostek; jedna sesja zużywa jedną' },
      { icon: 'checkmark-outline', title: 'Tylko monety', body: 'legacy reward odchodzi; nagrodą są monety' },
    ],
    cta: 'Rozumiem', close: 'Zamknij Co nowego',
  },
};

export function pickReleaseNotesV2Texts(lang: string): ReleaseNotesV2Texts {
  return TEXTS[lang as Locale] ?? TEXTS.ru;
}
