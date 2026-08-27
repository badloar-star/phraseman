import type { ImageSourcePropType } from 'react-native';
import type { Lang } from './i18n';
import { CUSTOM_AVATAR_ASSET_BASE_URL } from './custom_avatar_asset_host';
import { AVATAR100_CATALOG, AVATAR100_CATALOG_IDS } from './avatar100_assets';
export { CUSTOM_AVATAR_OWNED_KEY } from './customization_storage_keys';

// зачем: жемчуг больше не фармится (SHARD_REWARDS обнулён в app/shards_system.ts) —
// каждая цена стала прямым ценником в евро. По витрине стора 210+30 жемчужин = €3.99,
// т.е. ~€0,017 за жемчужину. Старые 35/10 давали €0,60 за ВЕЧНЫЙ аватар — дешевле
// разового 30-минутного буста лиги (€0,34–0,77), что ломало иерархию ценности.
// Новая шкала: расходники €0,05–0,85 → вечная косметика €1,5–2 → карточка профиля €3–41.
export const CUSTOM_AVATAR_BUY_COST = 90;
/** Рестайл держим ~25–30% от цены аватара: смена стиля дешевле новой вещи. */
export const CUSTOM_AVATAR_RESTYLE_COST = 25;

// Custom-avatar artwork is hosted with the admin static target instead of being
// embedded in every mobile binary. React Native downloads only the image that
// is actually rendered and keeps the platform image cache for later frames.
// зачем: сама константа переехала в custom_avatar_asset_host.ts, чтобы каталог
// Avatar100 брал адрес хоста без кольцевого импорта. Реэкспорт сохранён —
// на это имя завязаны внешние модули и сторож custom_avatar_asset_alignment.
export { CUSTOM_AVATAR_ASSET_BASE_URL } from './custom_avatar_asset_host';

function remoteCustomAvatarAsset(index: string, ink: CustomAvatarLogoColor): ImageSourcePropType {
  return { uri: `${CUSTOM_AVATAR_ASSET_BASE_URL}/custom-idea-${index}-${ink}.webp` };
}

export type CustomAvatarGradient = {
  id: string;
  name: string;
  colors: readonly [string, string, string];
};

export type CustomAvatarLogoColor = 'black' | 'white';

export const LEGACY_SHOWCASE_ART_VERSION = 'showcase-v1' as const;
export const AVATAR100_ART_VERSION = 'avatar100-v1' as const;
export type CustomAvatarArtVersion = typeof LEGACY_SHOWCASE_ART_VERSION | typeof AVATAR100_ART_VERSION;

export type CustomAvatarPriceTier =
  | 'starter'
  | 'expressive'
  | 'premium'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'apex';

export type CustomAvatarDef = {
  id: string;
  name: string;
  labels?: Partial<Record<Lang, string>>;
  price?: number;
  tier?: CustomAvatarPriceTier;
  collection?: 'showcase-v1' | 'avatar100-v1';
  image?: ImageSourcePropType;
  imageBlack?: ImageSourcePropType;
  imageWhite?: ImageSourcePropType;
};

type CustomAvatarLocalizedLabel = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
  // зачем: Lang расширили до en (English UI locale), но эти ~99 литералов
  // не переводили на английский — en остаётся опциональным, и оба геттера
  // (customAvatarNameForLang/customAvatarGradientNameForLang) уже падают
  // назад на defaultName/ru, если ключа нет. Без этого TS7053 индексация
  // label?.[lang] не собиралась бы для en.
  en?: string;
};

const CUSTOM_AVATAR_LABELS: Record<string, CustomAvatarLocalizedLabel> = {
  'custom-gen-01': { ru: 'Оракул в капюшоне', uk: 'Оракул у капюшоні', es: 'Oráculo encapuchado', 'pt-BR': 'Oráculo encapuzado', vi: 'Nhà tiên tri áo choàng', id: 'Orakel Berkerudung', tr: 'Kapüşonlu Kahin', pl: 'Zakapturzona wyrocznia' },
  'custom-gen-02': { ru: 'Древний философ', uk: 'Давній філософ', es: 'Filósofo antiguo', 'pt-BR': 'Filósofo antigo', vi: 'Triết gia cổ đại', id: 'Filsuf Kuno', tr: 'Antik Filozof', pl: 'Starożytny filozof' },
  'custom-gen-03': { ru: 'Ученый в маске', uk: 'Учений у масці', es: 'Erudito enmascarado', 'pt-BR': 'Erudito mascarado', vi: 'Học giả đeo mặt nạ', id: 'Cendekiawan Bertopeng', tr: 'Maskeli Bilgin', pl: 'Uczony w masce' },
  'custom-gen-04': { ru: 'Коронованный наставник', uk: 'Коронований наставник', es: 'Mentor coronado', 'pt-BR': 'Mentor coroado', vi: 'Người hướng dẫn đội vương miện', id: 'Mentor Bermahkota', tr: 'Taçlı Mentor', pl: 'Ukoronowany mentor' },
  'custom-gen-05': { ru: 'Бронированный страж', uk: 'Броньований вартовий', es: 'Guardián blindado', 'pt-BR': 'Guardião blindado', vi: 'Hộ vệ giáp bạc', id: 'Penjaga Berzirah', tr: 'Zırhlı Muhafız', pl: 'Opancerzony strażnik' },
  'custom-gen-06': { ru: 'Юный маг', uk: 'Юний маг', es: 'Mago joven', 'pt-BR': 'Jovem mago', vi: 'Pháp sư trẻ', id: 'Penyihir Muda', tr: 'Genç Büyücü', pl: 'Młody mag' },
  'custom-gen-07': { ru: 'Ясный оратор', uk: 'Ясний оратор', es: 'Orador claro', 'pt-BR': 'Orador claro', vi: 'Diễn giả rõ ràng', id: 'Orator Jelas', tr: 'Açık Sözlü Hatip', pl: 'Jasny mówca' },
  'custom-gen-08': { ru: 'Библиотечный мудрец', uk: 'Бібліотечний мудрець', es: 'Sabio bibliotecario', 'pt-BR': 'Sábio bibliotecário', vi: 'Hiền giả thư viện', id: 'Resi Pustaka', tr: 'Kütüphane Bilgesi', pl: 'Biblioteczny mędrzec' },
  'custom-gen-09': { ru: 'Звездная жрица', uk: 'Зоряна жриця', es: 'Sacerdotisa estelar', 'pt-BR': 'Sacerdotisa estelar', vi: 'Nữ tư tế sao', id: 'Pendeta Bintang', tr: 'Yıldız Rahibesi', pl: 'Gwiezdna kapłanka' },
  'custom-gen-10': { ru: 'Астральный рыцарь', uk: 'Астральний лицар', es: 'Caballero astral', 'pt-BR': 'Cavaleiro astral', vi: 'Hiệp sĩ tinh tú', id: 'Ksatria Astral', tr: 'Astral Şövalye', pl: 'Astralny rycerz' },
  'custom-gen-11': { ru: 'Мудрая сова', uk: 'Мудра сова', es: 'Búho sabio', 'pt-BR': 'Coruja sábia', vi: 'Cú khôn ngoan', id: 'Burung Hantu Bijak', tr: 'Bilge Baykuş', pl: 'Mądra sowa' },
  'custom-gen-12': { ru: 'Благородный волк', uk: 'Шляхетний вовк', es: 'Lobo noble', 'pt-BR': 'Lobo nobre', vi: 'Sói cao quý', id: 'Serigala Mulia', tr: 'Asil Kurt', pl: 'Szlachetny wilk' },
  'custom-gen-13': { ru: 'Хитрая лиса', uk: 'Хитра лисиця', es: 'Zorro astuto', 'pt-BR': 'Raposa astuta', vi: 'Cáo tinh anh', id: 'Rubah Cerdik', tr: 'Zeki Tilki', pl: 'Sprytny lis' },
  'custom-gen-14': { ru: 'Царственный олень', uk: 'Царственний олень', es: 'Ciervo regio', 'pt-BR': 'Cervo régio', vi: 'Hươu vương giả', id: 'Rusa Agung', tr: 'Görkemli Geyik', pl: 'Dostojny jeleń' },
  'custom-gen-15': { ru: 'Лев-ученый', uk: 'Лев-учений', es: 'León erudito', 'pt-BR': 'Leão erudito', vi: 'Sư tử học giả', id: 'Singa Cendekia', tr: 'Bilgin Aslan', pl: 'Uczony lew' },
  'custom-gen-16': { ru: 'Ворон-писец', uk: 'Ворон-писар', es: 'Cuervo escriba', 'pt-BR': 'Corvo escriba', vi: 'Quạ ký lục', id: 'Gagak Juru Tulis', tr: 'Katip Kuzgun', pl: 'Kruk skryba' },
  'custom-gen-17': { ru: 'Кристальная кошка', uk: 'Кришталева кішка', es: 'Gato de cristal', 'pt-BR': 'Gato cristalino', vi: 'Mèo pha lê', id: 'Kucing Kristal', tr: 'Kristal Kedi', pl: 'Kryształowy kot' },
  'custom-gen-18': { ru: 'Ученый медведь', uk: 'Учений ведмідь', es: 'Oso erudito', 'pt-BR': 'Urso erudito', vi: 'Gấu học giả', id: 'Beruang Cendekia', tr: 'Bilgin Ayı', pl: 'Uczony niedźwiedź' },
  'custom-gen-19': { ru: 'Кристальный конь', uk: 'Кришталевий кінь', es: 'Caballo de cristal', 'pt-BR': 'Cavalo cristalino', vi: 'Ngựa pha lê', id: 'Kuda Kristal', tr: 'Kristal At', pl: 'Kryształowy koń' },
  'custom-gen-20': { ru: 'Кристальный дельфин', uk: 'Кришталевий дельфін', es: 'Delfín de cristal', 'pt-BR': 'Golfinho cristalino', vi: 'Cá heo pha lê', id: 'Lumba-Lumba Kristal', tr: 'Kristal Yunus', pl: 'Kryształowy delfin' },
  'custom-gen-21': { ru: 'Королевская корона', uk: 'Королівська корона', es: 'Corona real', 'pt-BR': 'Coroa real', vi: 'Vương miện hoàng gia', id: 'Mahkota Kerajaan', tr: 'Kraliyet Tacı', pl: 'Królewska korona' },
  'custom-gen-22': { ru: 'Кристальный скипетр', uk: 'Кришталевий скіпетр', es: 'Cetro de cristal', 'pt-BR': 'Cetro cristalino', vi: 'Vương trượng pha lê', id: 'Tongkat Kristal', tr: 'Kristal Asa', pl: 'Kryształowe berło' },
  'custom-gen-23': { ru: 'Держава властителя', uk: 'Держава володаря', es: 'Orbe soberano', 'pt-BR': 'Orbe soberano', vi: 'Quả cầu vương quyền', id: 'Bola Kedaulatan', tr: 'Egemenlik Küresi', pl: 'Królewskie jabłko' },
  'custom-gen-24': { ru: 'Гербовый щит', uk: 'Гербовий щит', es: 'Escudo heráldico', 'pt-BR': 'Escudo heráldico', vi: 'Khiên huy hiệu', id: 'Perisai Heraldik', tr: 'Hanedan Kalkanı', pl: 'Tarcza heraldyczna' },
  'custom-gen-25': { ru: 'Тронный знак', uk: 'Тронний знак', es: 'Emblema del trono', 'pt-BR': 'Emblema do trono', vi: 'Huy hiệu ngai vàng', id: 'Lambang Takhta', tr: 'Taht Arması', pl: 'Znak tronu' },
  'custom-gen-26': { ru: 'Королевская диадема', uk: 'Королівська діадема', es: 'Diadema real', 'pt-BR': 'Diadema real', vi: 'Vương miện diadem', id: 'Diadem Kerajaan', tr: 'Kraliyet Diademi', pl: 'Królewski diadem' },
  'custom-gen-27': { ru: 'Королевский кубок', uk: 'Королівський кубок', es: 'Cáliz real', 'pt-BR': 'Cálice real', vi: 'Cúp hoàng gia', id: 'Piala Kerajaan', tr: 'Kraliyet Kadehi', pl: 'Królewski kielich' },
  'custom-gen-28': { ru: 'Коронованный ключ', uk: 'Коронований ключ', es: 'Llave coronada', 'pt-BR': 'Chave coroada', vi: 'Chìa khóa vương miện', id: 'Kunci Bermahkota', tr: 'Taçlı Anahtar', pl: 'Koronowany klucz' },
  'custom-gen-29': { ru: 'Лавровая медаль', uk: 'Лаврова медаль', es: 'Medalla de laurel', 'pt-BR': 'Medalha de louro', vi: 'Huy chương nguyệt quế', id: 'Medali Laurel', tr: 'Defne Madalyası', pl: 'Medal laurowy' },
  'custom-gen-30': { ru: 'Имперская печать солнца', uk: 'Імперська печать сонця', es: 'Sello solar imperial', 'pt-BR': 'Selo solar imperial', vi: 'Ấn mặt trời hoàng đế', id: 'Segel Matahari Kekaisaran', tr: 'İmparatorluk Güneş Mührü', pl: 'Cesarska pieczęć słońca' },
  'custom-01': { ru: 'Летописец', uk: 'Літописець', es: 'Cronista', 'pt-BR': 'Cronista', vi: 'Người ghi chép', id: 'Kronikus', tr: 'Vakayinameci', pl: 'Kronikarz' },
  'custom-02': { ru: 'Переводчик', uk: 'Перекладач', es: 'Traductor', 'pt-BR': 'Tradutor', vi: 'Dịch giả', id: 'Penerjemah', tr: 'Çevirmen', pl: 'Tłumacz' },
  'custom-03': { ru: 'Кодекс', uk: 'Кодекс', es: 'Códice', 'pt-BR': 'Códice', vi: 'Bộ kinh', id: 'Kodeks', tr: 'Kodeks', pl: 'Kodeks' },
  'custom-04': { ru: 'Муза знаний', uk: 'Муза знань', es: 'Musa del saber', 'pt-BR': 'Musa do saber', vi: 'Nàng thơ tri thức', id: 'Musa Pengetahuan', tr: 'Bilgi Perisi', pl: 'Muza wiedzy' },
  'custom-05': { ru: 'Атлас', uk: 'Атлас', es: 'Atlas', 'pt-BR': 'Atlas', vi: 'Atlas', id: 'Atlas', tr: 'Atlas', pl: 'Atlas' },
  'custom-06': { ru: 'Алфавит', uk: 'Алфавіт', es: 'Alfabeto', 'pt-BR': 'Alfabeto', vi: 'Bảng chữ cái', id: 'Alfabet', tr: 'Alfabe', pl: 'Alfabet' },
  'custom-07': { ru: 'Архивариус', uk: 'Архіваріус', es: 'Archivista', 'pt-BR': 'Arquivista', vi: 'Người lưu trữ', id: 'Arsiparis', tr: 'Arşivci', pl: 'Archiwista' },
  'custom-08': { ru: 'Свиток', uk: 'Сувій', es: 'Pergamino', 'pt-BR': 'Pergaminho', vi: 'Cuộn giấy', id: 'Gulungan', tr: 'Parşömen', pl: 'Zwój' },
  'custom-09': { ru: 'Философ', uk: 'Філософ', es: 'Filósofo', 'pt-BR': 'Filósofo', vi: 'Triết gia', id: 'Filsuf', tr: 'Filozof', pl: 'Filozof' },
  'custom-10': { ru: 'Афина', uk: 'Афіна', es: 'Atenea', 'pt-BR': 'Atena', vi: 'Athena', id: 'Athena', tr: 'Athena', pl: 'Atena' },
  'custom-11': { ru: 'Библиотека', uk: 'Бібліотека', es: 'Biblioteca', 'pt-BR': 'Biblioteca', vi: 'Thư viện', id: 'Perpustakaan', tr: 'Kütüphane', pl: 'Biblioteka' },
  'custom-12': { ru: 'Черная библиотека', uk: 'Чорна бібліотека', es: 'Biblioteca negra', 'pt-BR': 'Biblioteca negra', vi: 'Thư viện đen', id: 'Perpustakaan Hitam', tr: 'Kara Kütüphane', pl: 'Czarna biblioteka' },
  'custom-13': { ru: 'Исследователь', uk: 'Дослідник', es: 'Investigador', 'pt-BR': 'Investigador', vi: 'Nhà nghiên cứu', id: 'Penyelidik', tr: 'Araştırmacı', pl: 'Badacz' },
  'custom-14': { ru: 'Перо закона', uk: 'Перо закону', es: 'Pluma de ley', 'pt-BR': 'Pena da lei', vi: 'Bút lông luật pháp', id: 'Bulu Pena Hukum', tr: 'Hukuk Tüy Kalemi', pl: 'Pióro prawa' },
  'custom-15': { ru: 'Оракул', uk: 'Оракул', es: 'Oráculo', 'pt-BR': 'Oráculo', vi: 'Nhà tiên tri', id: 'Orakel', tr: 'Kahin', pl: 'Wyrocznia' },
  'custom-16': { ru: 'Голос', uk: 'Голос', es: 'Voz', 'pt-BR': 'Voz', vi: 'Giọng nói', id: 'Suara', tr: 'Ses', pl: 'Głos' },
  'custom-17': { ru: 'Сенатор', uk: 'Сенатор', es: 'Senador', 'pt-BR': 'Senador', vi: 'Thượng nghị sĩ', id: 'Senator', tr: 'Senatör', pl: 'Senator' },
  'custom-18': { ru: 'Аудиомаг', uk: 'Аудіомаг', es: 'Audiomago', 'pt-BR': 'Mago do áudio', vi: 'Pháp sư âm thanh', id: 'Penyihir Audio', tr: 'Ses Büyücüsü', pl: 'Audiomag' },
  'custom-19': { ru: 'Выпускник', uk: 'Випускник', es: 'Graduado', 'pt-BR': 'Graduado', vi: 'Sinh viên tốt nghiệp', id: 'Lulusan', tr: 'Mezun', pl: 'Absolwent' },
  'custom-20': { ru: 'Детектив', uk: 'Детектив', es: 'Detective', 'pt-BR': 'Detetive', vi: 'Thám tử', id: 'Detektif', tr: 'Dedektif', pl: 'Detektyw' },
  'custom-21': { ru: 'Тайная книга', uk: 'Таємна книга', es: 'Libro secreto', 'pt-BR': 'Livro secreto', vi: 'Cuốn sách bí mật', id: 'Buku Rahasia', tr: 'Gizli Kitap', pl: 'Tajna księga' },
  'custom-22': { ru: 'Академия', uk: 'Академія', es: 'Academia', 'pt-BR': 'Academia', vi: 'Học viện', id: 'Akademi', tr: 'Akademi', pl: 'Akademia' },
  'custom-23': { ru: 'Провидица', uk: 'Провидиця', es: 'Vidente', 'pt-BR': 'Vidente', vi: 'Nhà tiên kiến', id: 'Peramal', tr: 'Görücü', pl: 'Wieszczka' },
  'custom-24': { ru: 'Мудрец', uk: 'Мудрець', es: 'Sabio', 'pt-BR': 'Sábio', vi: 'Nhà hiền triết', id: 'Orang Bijak', tr: 'Bilge', pl: 'Mędrzec' },
  'custom-25': { ru: 'Верховный мудрец', uk: 'Верховний мудрець', es: 'Gran sabio', 'pt-BR': 'Grande sábio', vi: 'Đại hiền triết', id: 'Maha Bijak', tr: 'Yüce Bilge', pl: 'Wielki mędrzec' },
  'custom-26': { ru: 'Юный маг', uk: 'Юний маг', es: 'Joven mago', 'pt-BR': 'Jovem mago', vi: 'Pháp sư trẻ', id: 'Penyihir Muda', tr: 'Genç Büyücü', pl: 'Młody mag' },
  'custom-27': { ru: 'Писательница', uk: 'Письменниця', es: 'Escritora', 'pt-BR': 'Escritora', vi: 'Nữ nhà văn', id: 'Penulis', tr: 'Yazar', pl: 'Pisarka' },
  'custom-28': { ru: 'Ученая', uk: 'Вчена', es: 'Erudita', 'pt-BR': 'Erudita', vi: 'Nữ học giả', id: 'Cendekiawan', tr: 'Bilgin', pl: 'Uczona' },
  'custom-29': { ru: 'Патриций', uk: 'Патрицій', es: 'Patricio', 'pt-BR': 'Patrício', vi: 'Quý tộc', id: 'Patricius', tr: 'Patrisyen', pl: 'Patrycjusz' },
  'custom-30': { ru: 'Оратор', uk: 'Оратор', es: 'Orador', 'pt-BR': 'Orador', vi: 'Diễn giả', id: 'Orator', tr: 'Hatip', pl: 'Mówca' },
  'custom-31': { ru: 'Магистр', uk: 'Магістр', es: 'Magíster', 'pt-BR': 'Magíster', vi: 'Bậc thầy', id: 'Magister', tr: 'Magister', pl: 'Magister' },
  'custom-32': { ru: 'Жрица слов', uk: 'Жриця слів', es: 'Sacerdotisa', 'pt-BR': 'Sacerdotisa das palavras', vi: 'Nữ tư tế ngôn từ', id: 'Pendeta Wanita Kata', tr: 'Kelime Rahibesi', pl: 'Kapłanka słów' },
  'custom-33': { ru: 'Хранительница', uk: 'Хранителька', es: 'Guardiana', 'pt-BR': 'Guardiana', vi: 'Nữ hộ vệ', id: 'Penjaga', tr: 'Koruyucu', pl: 'Strażniczka' },
  'custom-34': { ru: 'Читательница', uk: 'Читачка', es: 'Lectora', 'pt-BR': 'Leitora', vi: 'Nữ độc giả', id: 'Pembaca', tr: 'Okur', pl: 'Czytelniczka' },
  'custom-35': { ru: 'Ученица звезд', uk: 'Учениця зірок', es: 'Alumna estelar', 'pt-BR': 'Aluna estelar', vi: 'Nữ học viên ngôi sao', id: 'Murid Bintang', tr: 'Yıldız Öğrenci', pl: 'Gwiezdna uczennica' },
  'custom-gen-31': { ru: 'Мягкий наставник', uk: 'М’який наставник', es: 'Tutor sereno', 'pt-BR': 'Tutor sereno', vi: 'Gia sư dịu dàng', id: 'Tutor Lembut', tr: 'Sakin Mentor', pl: 'Łagodny mentor' },
  'custom-gen-32': { ru: 'Учёный в очках', uk: 'Учений в окулярах', es: 'Erudito amable', 'pt-BR': 'Erudito gentil', vi: 'Học giả hiền hòa', id: 'Cendekia Ramah', tr: 'Nazik Bilgin', pl: 'Łagodny uczony' },
  'custom-gen-33': { ru: 'Спокойная маска', uk: 'Спокійна маска', es: 'Máscara serena', 'pt-BR': 'Máscara serena', vi: 'Mặt nạ điềm tĩnh', id: 'Topeng Tenang', tr: 'Sakin Maske', pl: 'Spokojna maska' },
  'custom-gen-34': { ru: 'Ясный наставник', uk: 'Ясний наставник', es: 'Mentor claro', 'pt-BR': 'Mentor claro', vi: 'Người dẫn rõ ràng', id: 'Mentor Jelas', tr: 'Açık Mentor', pl: 'Jasny mentor' },
  'custom-gen-35': { ru: 'Серебряная маска', uk: 'Срібна маска', es: 'Máscara plateada', 'pt-BR': 'Máscara prateada', vi: 'Mặt nạ bạc', id: 'Topeng Perak', tr: 'Gümüş Maske', pl: 'Srebrna maska' },
  'custom-gen-36': { ru: 'Внимательная наставница', uk: 'Уважна наставниця', es: 'Mentora atenta', 'pt-BR': 'Mentora atenta', vi: 'Cố vấn chăm chú', id: 'Mentor Penuh Perhatian', tr: 'Dikkatli Mentor', pl: 'Uważna mentorka' },
  'custom-gen-37': { ru: 'Наставник фраз', uk: 'Наставник фраз', es: 'Mentor de frases', 'pt-BR': 'Mentor de frases', vi: 'Cố vấn cụm từ', id: 'Mentor Frasa', tr: 'Cümle Mentoru', pl: 'Mentor fraz' },
  'custom-gen-38': { ru: 'Добрый профессор', uk: 'Добрий професор', es: 'Profesor amable', 'pt-BR': 'Professor gentil', vi: 'Giáo sư hiền hậu', id: 'Profesor Ramah', tr: 'Nazik Profesör', pl: 'Dobry profesor' },
  'custom-gen-39': { ru: 'Маска практики', uk: 'Маска практики', es: 'Máscara de práctica', 'pt-BR': 'Máscara de prática', vi: 'Mặt nạ luyện tập', id: 'Topeng Latihan', tr: 'Pratik Maskesi', pl: 'Maska ćwiczeń' },
  'custom-gen-40': { ru: 'Мудрец диалога', uk: 'Мудрець діалогу', es: 'Sabio del diálogo', 'pt-BR': 'Sábio do diálogo', vi: 'Hiền giả đối thoại', id: 'Resi Dialog', tr: 'Diyalog Bilgesi', pl: 'Mędrzec dialogu' },
  'custom-gen-41': { ru: 'Магический дневник', uk: 'Магічний щоденник', es: 'Cuaderno mágico', 'pt-BR': 'Caderno mágico', vi: 'Sổ tay ma thuật', id: 'Buku Ajaib', tr: 'Büyülü Defter', pl: 'Magiczny notes' },
  'custom-gen-42': { ru: 'Огонь практики', uk: 'Вогонь практики', es: 'Llama de práctica', 'pt-BR': 'Chama de prática', vi: 'Ngọn lửa luyện tập', id: 'Api Latihan', tr: 'Pratik Alevi', pl: 'Płomień ćwiczeń' },
  'custom-gen-43': { ru: 'Ледяной фокус', uk: 'Крижаний фокус', es: 'Cristal de enfoque', 'pt-BR': 'Cristal de foco', vi: 'Pha lê tập trung', id: 'Kristal Fokus', tr: 'Odak Kristali', pl: 'Kryształ skupienia' },
  'custom-gen-44': { ru: 'Лист знания', uk: 'Лист знань', es: 'Hoja de saber', 'pt-BR': 'Folha do saber', vi: 'Lá tri thức', id: 'Daun Ilmu', tr: 'Bilgi Yaprağı', pl: 'Liść wiedzy' },
  'custom-gen-45': { ru: 'Солнечная медаль', uk: 'Сонячна медаль', es: 'Medalla solar', 'pt-BR': 'Medalha solar', vi: 'Huy chương mặt trời', id: 'Medali Surya', tr: 'Güneş Madalyası', pl: 'Słoneczny medal' },
  'custom-gen-46': { ru: 'Лунная капля', uk: 'Місячна крапля', es: 'Gota lunar', 'pt-BR': 'Gota lunar', vi: 'Giọt trăng', id: 'Tetes Bulan', tr: 'Ay Damlası', pl: 'Księżycowa kropla' },
  'custom-gen-47': { ru: 'Штормовой орб', uk: 'Штормова сфера', es: 'Orbe tormenta', 'pt-BR': 'Orbe de tempestade', vi: 'Quả cầu bão', id: 'Orb Badai', tr: 'Fırtına Küresi', pl: 'Burzowa kula' },
  'custom-gen-48': { ru: 'Водная жемчужина', uk: 'Водяна перлина', es: 'Perla de agua', 'pt-BR': 'Pérola d’água', vi: 'Ngọc nước', id: 'Mutiara Air', tr: 'Su İncisi', pl: 'Wodna perła' },
  'custom-gen-49': { ru: 'Кристальный кубок', uk: 'Кришталевий кубок', es: 'Copa cristalina', 'pt-BR': 'Taça cristalina', vi: 'Cúp pha lê', id: 'Piala Kristal', tr: 'Kristal Kupa', pl: 'Kryształowy puchar' },
  'custom-gen-50': { ru: 'Коралловый самоцвет', uk: 'Кораловий самоцвіт', es: 'Gema coral', 'pt-BR': 'Gema coral', vi: 'Đá quý san hô', id: 'Permata Koral', tr: 'Mercan Mücevheri', pl: 'Koralowy klejnot' },
  'custom-gen-51': { ru: 'Семя роста', uk: 'Насіння росту', es: 'Semilla de progreso', 'pt-BR': 'Semente de progresso', vi: 'Hạt giống tiến bộ', id: 'Benih Kemajuan', tr: 'Gelişim Tohumu', pl: 'Ziarno postępu' },
  'custom-gen-52': { ru: 'Звёздный значок', uk: 'Зоряний значок', es: 'Insignia estelar', 'pt-BR': 'Insígnia estelar', vi: 'Huy hiệu ngôi sao', id: 'Lencana Bintang', tr: 'Yıldız Rozeti', pl: 'Gwiezdna odznaka' },
  'custom-gen-53': { ru: 'Кристальные часы', uk: 'Кришталевий годинник', es: 'Reloj cristalino', 'pt-BR': 'Ampulheta cristalina', vi: 'Đồng hồ pha lê', id: 'Jam Kristal', tr: 'Kristal Kum Saati', pl: 'Kryształowa klepsydra' },
  'custom-gen-54': { ru: 'Перо сияния', uk: 'Перо сяйва', es: 'Pluma radiante', 'pt-BR': 'Pena radiante', vi: 'Lông vũ rạng sáng', id: 'Bulu Bercahaya', tr: 'Işıltılı Tüy', pl: 'Promienne pióro' },
  'custom-gen-55': { ru: 'Фонарь учёбы', uk: 'Ліхтар навчання', es: 'Farol de estudio', 'pt-BR': 'Lanterna de estudo', vi: 'Đèn học tập', id: 'Lentera Belajar', tr: 'Çalışma Feneri', pl: 'Latarnia nauki' },
  'custom-gen-56': { ru: 'Колокол голоса', uk: 'Дзвін голосу', es: 'Campana de voz', 'pt-BR': 'Sino da voz', vi: 'Chuông giọng nói', id: 'Lonceng Suara', tr: 'Ses Çanı', pl: 'Dzwon głosu' },
  'custom-gen-57': { ru: 'Жемчужная спираль', uk: 'Перлова спіраль', es: 'Espiral perlada', 'pt-BR': 'Espiral perolada', vi: 'Vòng xoắn ngọc trai', id: 'Spiral Mutiara', tr: 'İnci Sarmalı', pl: 'Perłowa spirala' },
  'custom-gen-58': { ru: 'Жемчужины жара', uk: 'Перлини жару', es: 'Perlas de brasa', 'pt-BR': 'Pérolas de brasa', vi: 'Ngọc trai than hồng', id: 'Mutiara Bara', tr: 'Kor İncisi', pl: 'Perły żaru' },
  'custom-gen-59': { ru: 'Флакон чернил', uk: 'Флакон чорнила', es: 'Frasco de tinta', 'pt-BR': 'Frasco de tinta', vi: 'Lọ mực', id: 'Botol Tinta', tr: 'Mürekkep Şişesi', pl: 'Flakon atramentu' },
  'custom-gen-60': { ru: 'Серебряный ключ', uk: 'Срібний ключ', es: 'Llave plateada', 'pt-BR': 'Chave prateada', vi: 'Chìa khóa bạc', id: 'Kunci Perak', tr: 'Gümüş Anahtar', pl: 'Srebrny klucz' },
  'custom-gen-61': { ru: 'Кристальный цветок', uk: 'Кришталевий цвіт', es: 'Flor cristalina', 'pt-BR': 'Flor cristalina', vi: 'Hoa pha lê', id: 'Bunga Kristal', tr: 'Kristal Çiçek', pl: 'Kryształowy kwiat' },
  'custom-gen-62': { ru: 'Щит самоцвета', uk: 'Щит самоцвіту', es: 'Escudo gema', 'pt-BR': 'Escudo gema', vi: 'Khiên đá quý', id: 'Perisai Permata', tr: 'Mücevher Kalkanı', pl: 'Tarcza klejnotu' },
};

type ShowcaseAvatarLocale = Exclude<Lang, 'ru'>;

// The showcase has authored names in every shipping locale. Keeping the rows in
// numeric order makes missing translations visible and keeps the 63-item set compact.
const SHOWCASE_AVATAR_TRANSLATIONS: Record<ShowcaseAvatarLocale, readonly string[]> = {
  uk: [
    'Затишний новачок', 'Швидкий запам’ятовувач', 'Спокійний учень', 'Вірний практик', 'Запасливий повторювач', 'Яскравий співрозмовник', 'Тихий дослідник', 'Легкий імпровізатор', 'Спритний адаптер', 'Обережний старт',
    'Дружній дослідник', 'Вільний мовець', 'Виразний оповідач', 'Послідовний майстер', 'Чуйний слухач', 'Іскра мотивації', 'Самостійний учень', 'М’який навігатор', 'Сміливий практик', 'Надійний партнер',
    'Точний мисливець за сенсом', 'Швидкий прорив', 'Зібраний стратег', 'Яскравий комунікатор', 'Глибокий слухач', 'Впевнений маршрут', 'Гнучкий перемикач', 'Зірка прогресу', 'Витончений ритм', 'Гострий слух',
    'Світло в глибині', 'Холодна витримка', 'Незламний прогрес', 'Тонка інтуїція', 'Високий політ', 'Сила спокою', 'Рідкісний почерк', 'Легкість розуміння', 'Нічна ясність', 'Прихована перлина',
    'Легенда глибини', 'Король упевненості', 'Райська свобода', 'Золотий потік', 'Сніжне осяяння', 'Тиха рішучість', 'Миттєвий фокус', 'Шлях мудрості', 'Лисяча винахідливість', 'Вища рівновага',
    'Спектральний інтелект', 'Ідеальна точність', 'Горизонт свободи', 'Живе сяйво', 'Аура величі', 'Північна воля', 'Імператорське бачення', 'Досконала адаптація', 'Давнє чуття', 'Міфічна швидкість',
    'Пісня вершини', 'Абсолютна сила', 'Нескінченний політ',
  ],
  // зачем: en добавлен в Lang (English UI locale) — витрина требует запись на
  // каждый Lang кроме ru. Порядок и интенсивность нарастания скопированы с uk/es
  // построчно (авторские английские эпитеты, не дословный перевод).
  en: [
    'Cozy Beginner', 'Quick Memorizer', 'Calm Student', 'Faithful Practicer', 'Prepared Reviewer', 'Bright Conversationalist', 'Quiet Explorer', 'Light Improviser', 'Nimble Adapter', 'Careful Starter',
    'Friendly Explorer', 'Free Speaker', 'Expressive Storyteller', 'Consistent Master', 'Attentive Listener', 'Spark of Motivation', 'Independent Learner', 'Gentle Navigator', 'Bold Practicer', 'Reliable Partner',
    'Precise Meaning Hunter', 'Swift Breakthrough', 'Focused Strategist', 'Bright Communicator', 'Deep Listener', 'Confident Route', 'Flexible Switcher', 'Star of Progress', 'Elegant Rhythm', 'Sharp Ear',
    'Light in the Deep', 'Cold Endurance', 'Unbreakable Progress', 'Subtle Intuition', 'High Flight', 'Power of Calm', 'Rare Signature', 'Effortless Understanding', 'Night Clarity', 'Hidden Pearl',
    'Legend of Depth', 'King of Confidence', 'Heavenly Freedom', 'Golden Stream', 'Snowbound Insight', 'Silent Resolve', 'Instant Focus', 'Path of Wisdom', 'Fox’s Cunning', 'Supreme Balance',
    'Spectral Intellect', 'Flawless Precision', 'Horizon of Freedom', 'Living Radiance', 'Aura of Greatness', 'Northern Will', 'Imperial Vision', 'Perfect Adaptation', 'Ancient Instinct', 'Mythic Speed',
    'Song of the Summit', 'Absolute Power', 'Infinite Flight',
  ],
  es: [
    'Principiante acogedor', 'Memoria veloz', 'Estudiante sereno', 'Practicante fiel', 'Repasador previsor', 'Conversador brillante', 'Explorador silencioso', 'Improvisador ligero', 'Adaptador ágil', 'Comienzo cauteloso',
    'Explorador amistoso', 'Hablante libre', 'Narrador expresivo', 'Maestro constante', 'Oyente sensible', 'Chispa de motivación', 'Estudiante independiente', 'Navegante amable', 'Practicante valiente', 'Compañero fiable',
    'Cazador preciso de sentidos', 'Avance veloz', 'Estratega concentrado', 'Comunicador brillante', 'Oyente profundo', 'Ruta segura', 'Cambio flexible', 'Estrella del progreso', 'Ritmo elegante', 'Oído agudo',
    'Luz en las profundidades', 'Resistencia polar', 'Progreso inquebrantable', 'Intuición sutil', 'Vuelo elevado', 'Fuerza serena', 'Sello singular', 'Facilidad de comprensión', 'Claridad nocturna', 'Perla oculta',
    'Leyenda de las profundidades', 'Rey de la confianza', 'Libertad paradisíaca', 'Corriente dorada', 'Revelación nevada', 'Determinación silenciosa', 'Enfoque instantáneo', 'Camino de sabiduría', 'Ingenio del zorro', 'Equilibrio supremo',
    'Inteligencia espectral', 'Precisión perfecta', 'Horizonte de libertad', 'Resplandor vivo', 'Aura de grandeza', 'Voluntad del norte', 'Visión imperial', 'Adaptación perfecta', 'Instinto ancestral', 'Velocidad mítica',
    'Canción de la cumbre', 'Fuerza absoluta', 'Vuelo infinito',
  ],
  'pt-BR': [
    'Iniciante acolhedor', 'Memória veloz', 'Estudante sereno', 'Praticante fiel', 'Revisor previdente', 'Conversador brilhante', 'Explorador silencioso', 'Improvisador leve', 'Adaptador ágil', 'Começo cauteloso',
    'Explorador amigável', 'Falante livre', 'Narrador expressivo', 'Mestre constante', 'Ouvinte sensível', 'Faísca de motivação', 'Estudante independente', 'Navegador gentil', 'Praticante valente', 'Parceiro confiável',
    'Caçador preciso de sentidos', 'Avanço veloz', 'Estrategista focado', 'Comunicador brilhante', 'Ouvinte profundo', 'Rota confiante', 'Mudança flexível', 'Estrela do progresso', 'Ritmo elegante', 'Ouvido aguçado',
    'Luz nas profundezas', 'Resistência polar', 'Progresso inabalável', 'Intuição sutil', 'Voo elevado', 'Força serena', 'Marca singular', 'Facilidade de compreensão', 'Clareza noturna', 'Pérola oculta',
    'Lenda das profundezas', 'Rei da confiança', 'Liberdade paradisíaca', 'Corrente dourada', 'Revelação nevada', 'Determinação silenciosa', 'Foco instantâneo', 'Caminho da sabedoria', 'Engenho da raposa', 'Equilíbrio supremo',
    'Inteligência espectral', 'Precisão perfeita', 'Horizonte de liberdade', 'Brilho vivo', 'Aura de grandeza', 'Vontade do norte', 'Visão imperial', 'Adaptação perfeita', 'Instinto ancestral', 'Velocidade mítica',
    'Canção do ápice', 'Força absoluta', 'Voo infinito',
  ],
  vi: [
    'Tân binh ấm áp', 'Trí nhớ nhanh nhạy', 'Học viên điềm tĩnh', 'Người luyện tập trung thành', 'Người ôn tập chu đáo', 'Người trò chuyện rực rỡ', 'Nhà khám phá thầm lặng', 'Người ứng biến nhẹ nhàng', 'Người thích nghi linh hoạt', 'Khởi đầu thận trọng',
    'Nhà khám phá thân thiện', 'Người nói tự do', 'Người kể chuyện biểu cảm', 'Bậc thầy kiên định', 'Người lắng nghe tinh tế', 'Tia lửa động lực', 'Học viên độc lập', 'Người dẫn đường dịu dàng', 'Người luyện tập dũng cảm', 'Bạn đồng hành đáng tin',
    'Thợ săn ý nghĩa chính xác', 'Bứt phá thần tốc', 'Nhà chiến lược tập trung', 'Người giao tiếp rực rỡ', 'Người lắng nghe sâu sắc', 'Lộ trình tự tin', 'Chuyển đổi linh hoạt', 'Ngôi sao tiến bộ', 'Nhịp điệu thanh lịch', 'Thính giác sắc bén',
    'Ánh sáng vực sâu', 'Sức bền vùng cực', 'Tiến bộ bất khuất', 'Trực giác tinh tế', 'Chuyến bay vút cao', 'Sức mạnh điềm tĩnh', 'Dấu ấn hiếm có', 'Thấu hiểu nhẹ nhàng', 'Sự sáng rõ ban đêm', 'Viên ngọc ẩn giấu',
    'Huyền thoại vực sâu', 'Vua của tự tin', 'Tự do thiên đường', 'Dòng chảy hoàng kim', 'Linh cảm tuyết trắng', 'Quyết tâm thầm lặng', 'Tập trung tức thì', 'Con đường trí tuệ', 'Trí khéo của cáo', 'Cân bằng tối thượng',
    'Trí tuệ quang phổ', 'Độ chính xác hoàn hảo', 'Chân trời tự do', 'Ánh sáng sống động', 'Hào quang vĩ đại', 'Ý chí phương bắc', 'Tầm nhìn đế vương', 'Thích nghi hoàn hảo', 'Bản năng cổ xưa', 'Tốc độ thần thoại',
    'Khúc ca đỉnh cao', 'Sức mạnh tuyệt đối', 'Chuyến bay vô tận',
  ],
  id: [
    'Pemula yang nyaman', 'Pengingat cepat', 'Pelajar tenang', 'Praktisi setia', 'Pengulang yang siap', 'Teman bicara cerah', 'Penjelajah sunyi', 'Improvisator ringan', 'Pengadaptasi lincah', 'Awal yang hati-hati',
    'Penjelajah ramah', 'Pembicara bebas', 'Pencerita ekspresif', 'Master konsisten', 'Pendengar peka', 'Percikan motivasi', 'Pelajar mandiri', 'Navigator lembut', 'Praktisi berani', 'Mitra tepercaya',
    'Pemburu makna yang tepat', 'Terobosan cepat', 'Strategis terfokus', 'Komunikator cerah', 'Pendengar mendalam', 'Jalur percaya diri', 'Pengalih fleksibel', 'Bintang kemajuan', 'Irama anggun', 'Pendengaran tajam',
    'Cahaya di kedalaman', 'Ketahanan kutub', 'Kemajuan tak tergoyahkan', 'Intuisi halus', 'Terbang tinggi', 'Kekuatan tenang', 'Jejak langka', 'Pemahaman mudah', 'Kejernihan malam', 'Mutiara tersembunyi',
    'Legenda kedalaman', 'Raja kepercayaan diri', 'Kebebasan surga', 'Arus emas', 'Ilham salju', 'Tekad sunyi', 'Fokus seketika', 'Jalan kebijaksanaan', 'Kecerdikan rubah', 'Keseimbangan tertinggi',
    'Kecerdasan spektral', 'Ketepatan sempurna', 'Cakrawala kebebasan', 'Kilau hidup', 'Aura keagungan', 'Tekad utara', 'Visi kekaisaran', 'Adaptasi sempurna', 'Naluri purba', 'Kecepatan mitis',
    'Nyanyian puncak', 'Kekuatan mutlak', 'Terbang tanpa batas',
  ],
  tr: [
    'Sıcakkanlı acemi', 'Hızlı ezberci', 'Sakin öğrenci', 'Sadık pratikçi', 'Hazırlıklı tekrar ustası', 'Parlak sohbetçi', 'Sessiz kâşif', 'Hafif doğaçlamacı', 'Çevik uyumcu', 'Temkinli başlangıç',
    'Dost canlısı kâşif', 'Özgür konuşmacı', 'Etkileyici anlatıcı', 'Tutarlı usta', 'Duyarlı dinleyici', 'Motivasyon kıvılcımı', 'Bağımsız öğrenci', 'Nazik rehber', 'Cesur pratikçi', 'Güvenilir ortak',
    'Anlamın keskin avcısı', 'Hızlı atılım', 'Odaklı stratejist', 'Parlak iletişimci', 'Derin dinleyici', 'Kendinden emin rota', 'Esnek geçiş', 'İlerleme yıldızı', 'Zarif ritim', 'Keskin işitme',
    'Derinlikteki ışık', 'Kutup dayanıklılığı', 'Sarsılmaz ilerleme', 'İnce sezgi', 'Yüksek uçuş', 'Sakin gücü', 'Nadir imza', 'Kolay kavrayış', 'Gece berraklığı', 'Gizli inci',
    'Derinlik efsanesi', 'Özgüven kralı', 'Cennet özgürlüğü', 'Altın akış', 'Karlı ilham', 'Sessiz kararlılık', 'Anlık odak', 'Bilgelik yolu', 'Tilki yaratıcılığı', 'Yüce denge',
    'Spektral zekâ', 'Kusursuz hassasiyet', 'Özgürlük ufku', 'Canlı ışıltı', 'Görkem aurası', 'Kuzey iradesi', 'İmparatorluk vizyonu', 'Kusursuz uyum', 'Kadim sezgi', 'Mitik hız',
    'Zirvenin şarkısı', 'Mutlak güç', 'Sonsuz uçuş',
  ],
  pl: [
    'Przytulny nowicjusz', 'Szybka pamięć', 'Spokojny uczeń', 'Wierny praktyk', 'Zapobiegliwy powtarzający', 'Barwny rozmówca', 'Cichy odkrywca', 'Lekki improwizator', 'Zwinny adaptator', 'Ostrożny start',
    'Przyjazny odkrywca', 'Swobodny mówca', 'Wyrazisty narrator', 'Konsekwentny mistrz', 'Wrażliwy słuchacz', 'Iskra motywacji', 'Samodzielny uczeń', 'Łagodny nawigator', 'Odważny praktyk', 'Niezawodny partner',
    'Precyzyjny łowca znaczeń', 'Szybki przełom', 'Skupiony strateg', 'Barwny komunikator', 'Uważny słuchacz', 'Pewna droga', 'Elastyczna zmiana', 'Gwiazda postępu', 'Elegancki rytm', 'Wyostrzony słuch',
    'Światło w głębinach', 'Polarna wytrwałość', 'Niezłomny postęp', 'Subtelna intuicja', 'Wysoki lot', 'Siła spokoju', 'Rzadki styl', 'Łatwość rozumienia', 'Nocna jasność', 'Ukryta perła',
    'Legenda głębin', 'Król pewności siebie', 'Rajska wolność', 'Złoty nurt', 'Śnieżne olśnienie', 'Cicha determinacja', 'Natychmiastowe skupienie', 'Droga mądrości', 'Lisia pomysłowość', 'Najwyższa równowaga',
    'Spektralna inteligencja', 'Idealna precyzja', 'Horyzont wolności', 'Żywy blask', 'Aura wielkości', 'Północna wola', 'Cesarska wizja', 'Doskonała adaptacja', 'Pradawny instynkt', 'Mityczna prędkość',
    'Pieśń szczytu', 'Absolutna siła', 'Nieskończony lot',
  ],
};

function showcaseAvatarLabels(avatar: CustomAvatarDef): CustomAvatarLocalizedLabel {
  const numericId = Number(avatar.id.replace('custom-gen-', ''));
  const offset = numericId - 63;
  return {
    ru: avatar.labels?.ru ?? avatar.name,
    uk: SHOWCASE_AVATAR_TRANSLATIONS.uk[offset] ?? avatar.name,
    // зачем: SHOWCASE_AVATAR_TRANSLATIONS.en уже содержит 63 английских
    // эпитета — без этой строки они были бы мёртвым кодом, и showcase-аватары
    // молча падали бы на RU для английского интерфейса.
    en: SHOWCASE_AVATAR_TRANSLATIONS.en[offset] ?? avatar.name,
    es: SHOWCASE_AVATAR_TRANSLATIONS.es[offset] ?? avatar.name,
    'pt-BR': SHOWCASE_AVATAR_TRANSLATIONS['pt-BR'][offset] ?? avatar.name,
    vi: SHOWCASE_AVATAR_TRANSLATIONS.vi[offset] ?? avatar.name,
    id: SHOWCASE_AVATAR_TRANSLATIONS.id[offset] ?? avatar.name,
    tr: SHOWCASE_AVATAR_TRANSLATIONS.tr[offset] ?? avatar.name,
    pl: SHOWCASE_AVATAR_TRANSLATIONS.pl[offset] ?? avatar.name,
  };
}

const CUSTOM_AVATAR_GRADIENT_LABELS: Record<string, CustomAvatarLocalizedLabel> = {
  aurora: { ru: 'Графит', uk: 'Графіт', es: 'Grafito', 'pt-BR': 'Grafite', vi: 'Than chì', id: 'Grafit', tr: 'Grafit', pl: 'Grafit' },
  ember: { ru: 'Скетч', uk: 'Скетч', es: 'Sketch', 'pt-BR': 'Esboço', vi: 'Phác thảo', id: 'Sketsa', tr: 'Eskiz', pl: 'Szkic' },
  cosmic: { ru: 'Форест', uk: 'Форест', es: 'Forest', 'pt-BR': 'Floresta', vi: 'Rừng', id: 'Hutan', tr: 'Orman', pl: 'Las' },
  forest: { ru: 'Неон', uk: 'Неон', es: 'Neón', 'pt-BR': 'Neon', vi: 'Neon', id: 'Neon', tr: 'Neon', pl: 'Neon' },
  citrine: { ru: 'Корал', uk: 'Корал', es: 'Coral', 'pt-BR': 'Coral', vi: 'San hô', id: 'Koral', tr: 'Mercan', pl: 'Koral' },
  royal: { ru: 'Золото', uk: 'Золото', es: 'Oro', 'pt-BR': 'Ouro', vi: 'Vàng', id: 'Emas', tr: 'Altın', pl: 'Złoto' },
  ruby: { ru: 'Корал-голд', uk: 'Корал-голд', es: 'Coral oro', 'pt-BR': 'Coral dourado', vi: 'San hô vàng', id: 'Koral Emas', tr: 'Mercan Altın', pl: 'Koralowe złoto' },
  magma: { ru: 'Форест-голд', uk: 'Форест-голд', es: 'Forest oro', 'pt-BR': 'Floresta dourada', vi: 'Rừng vàng', id: 'Hutan Emas', tr: 'Orman Altın', pl: 'Leśne złoto' },
  noirgold: { ru: 'Черное золото', uk: 'Чорне золото', es: 'Oro negro', 'pt-BR': 'Ouro negro', vi: 'Vàng đen', id: 'Emas Hitam', tr: 'Siyah Altın', pl: 'Czarne złoto' },
  sakura: { ru: 'Скетч-корал', uk: 'Скетч-корал', es: 'Sketch coral', 'pt-BR': 'Esboço coral', vi: 'Phác thảo san hô', id: 'Sketsa Koral', tr: 'Mercan Eskiz', pl: 'Koralowy szkic' },
};

// зачем: прежние подложки были почти чёрными до середины (яркость 20–35), а цвет
// показывался лишь узкой полосой у нижней кромки — портрет тонул в темноте, и
// владелец назвал такие фоны грязными. Замер по 106 портретам дал две группы:
// тёмные существа ~47 яркости, светлые ~175. Новая палитра держит среднюю
// яркость подложки в коридоре 95–137, ровно МЕЖДУ ними, поэтому на одном и том
// же фоне читаются оба варианта. Цвет ведёт с самого верхнего стопа, а не
// появляется под конец.
// зачем: прежние подложки были серо-бежевые и почти чёрные до середины — цвет
// показывался узкой полосой у нижней кромки, портрет тонул, владелец назвал их
// унылыми. Новая палитра — фантастические сцены (сияние, туманность, магма,
// бездна), каждая с явным сдвигом ОТТЕНКА сверху вниз, а не просто осветлением.
//
// Жёсткое ограничение читаемости: замер по 106 портретам дал две группы —
// тёмные существа ~47 яркости, светлые ~175. Средняя яркость каждой подложки
// удерживается в коридоре 90–210, ровно МЕЖДУ ними, поэтому на одном фоне видны
// оба варианта. Верхний стоп не темнее 20: цвет ведёт с самого верха.
// Сторож: tests/avatar100_renderer_geometry.test.ts.
export const CUSTOM_AVATAR_GRADIENTS: CustomAvatarGradient[] = [
  { id: 'aurora', name: 'Aurora', colors: ['#0B3B6F', '#1E7A8C', '#7CF5C4'] },
  { id: 'ember', name: 'Nebula', colors: ['#3A1C71', '#8E2DE2', '#F0A9FF'] },
  { id: 'cosmic', name: 'Magma', colors: ['#4A0E20', '#C42B5F', '#FFB347'] },
  { id: 'forest', name: 'Abyss', colors: ['#052A4E', '#0E7C8C', '#7BF3D0'] },
  { id: 'citrine', name: 'Dune', colors: ['#6D1B4B', '#E0575B', '#FFC857'] },
  { id: 'royal', name: 'Verdant', colors: ['#07301F', '#1B8A5A', '#9BE86B'] },
  { id: 'ruby', name: 'Cobalt', colors: ['#101C4E', '#2E5BFF', '#8FD8FF'] },
  { id: 'magma', name: 'Amethyst', colors: ['#2A1060', '#7B2CBF', '#FFA8E4'] },
  { id: 'noirgold', name: 'Molten Gold', colors: ['#3B1F04', '#C8791A', '#FFE066'] },
  { id: 'sakura', name: 'Rose Nebula', colors: ['#4A0E38', '#D6336C', '#FFAFCF'] },
];

const CUSTOM_AVATAR_DEFINITIONS: CustomAvatarDef[] = [
  {
    id: 'custom-gen-01',
    name: 'Hooded Oracle',
    imageBlack: remoteCustomAvatarAsset('01', 'black'),
    imageWhite: remoteCustomAvatarAsset('01', 'white'),
  },
  {
    id: 'custom-gen-02',
    name: 'Ancient Philosopher',
    imageBlack: remoteCustomAvatarAsset('02', 'black'),
    imageWhite: remoteCustomAvatarAsset('02', 'white'),
  },
  {
    id: 'custom-gen-03',
    name: 'Masked Scholar',
    imageBlack: remoteCustomAvatarAsset('03', 'black'),
    imageWhite: remoteCustomAvatarAsset('03', 'white'),
  },
  {
    id: 'custom-gen-04',
    name: 'Crowned Mentor',
    imageBlack: remoteCustomAvatarAsset('04', 'black'),
    imageWhite: remoteCustomAvatarAsset('04', 'white'),
  },
  {
    id: 'custom-gen-05',
    name: 'Armored Guardian',
    imageBlack: remoteCustomAvatarAsset('05', 'black'),
    imageWhite: remoteCustomAvatarAsset('05', 'white'),
  },
  {
    id: 'custom-gen-06',
    name: 'Young Mage',
    imageBlack: remoteCustomAvatarAsset('06', 'black'),
    imageWhite: remoteCustomAvatarAsset('06', 'white'),
  },
  {
    id: 'custom-gen-07',
    name: 'Clear Orator',
    imageBlack: remoteCustomAvatarAsset('07', 'black'),
    imageWhite: remoteCustomAvatarAsset('07', 'white'),
  },
  {
    id: 'custom-gen-08',
    name: 'Librarian Sage',
    imageBlack: remoteCustomAvatarAsset('08', 'black'),
    imageWhite: remoteCustomAvatarAsset('08', 'white'),
  },
  {
    id: 'custom-gen-09',
    name: 'Star Priestess',
    imageBlack: remoteCustomAvatarAsset('09', 'black'),
    imageWhite: remoteCustomAvatarAsset('09', 'white'),
  },
  {
    id: 'custom-gen-10',
    name: 'Astral Knight',
    imageBlack: remoteCustomAvatarAsset('10', 'black'),
    imageWhite: remoteCustomAvatarAsset('10', 'white'),
  },
  {
    id: 'custom-gen-11',
    name: 'Wise Owl',
    imageBlack: remoteCustomAvatarAsset('11', 'black'),
    imageWhite: remoteCustomAvatarAsset('11', 'white'),
  },
  {
    id: 'custom-gen-12',
    name: 'Noble Wolf',
    imageBlack: remoteCustomAvatarAsset('12', 'black'),
    imageWhite: remoteCustomAvatarAsset('12', 'white'),
  },
  {
    id: 'custom-gen-13',
    name: 'Clever Fox',
    imageBlack: remoteCustomAvatarAsset('13', 'black'),
    imageWhite: remoteCustomAvatarAsset('13', 'white'),
  },
  {
    id: 'custom-gen-14',
    name: 'Regal Stag',
    imageBlack: remoteCustomAvatarAsset('14', 'black'),
    imageWhite: remoteCustomAvatarAsset('14', 'white'),
  },
  {
    id: 'custom-gen-15',
    name: 'Lion Scholar',
    imageBlack: remoteCustomAvatarAsset('15', 'black'),
    imageWhite: remoteCustomAvatarAsset('15', 'white'),
  },
  {
    id: 'custom-gen-16',
    name: 'Raven Scribe',
    imageBlack: remoteCustomAvatarAsset('16', 'black'),
    imageWhite: remoteCustomAvatarAsset('16', 'white'),
  },
  {
    id: 'custom-gen-17',
    name: 'Crystal Cat',
    imageBlack: remoteCustomAvatarAsset('17', 'black'),
    imageWhite: remoteCustomAvatarAsset('17', 'white'),
  },
  {
    id: 'custom-gen-18',
    name: 'Scholar Bear',
    imageBlack: remoteCustomAvatarAsset('18', 'black'),
    imageWhite: remoteCustomAvatarAsset('18', 'white'),
  },
  {
    id: 'custom-gen-19',
    name: 'Crystal Horse',
    imageBlack: remoteCustomAvatarAsset('19', 'black'),
    imageWhite: remoteCustomAvatarAsset('19', 'white'),
  },
  {
    id: 'custom-gen-20',
    name: 'Crystal Dolphin',
    imageBlack: remoteCustomAvatarAsset('20', 'black'),
    imageWhite: remoteCustomAvatarAsset('20', 'white'),
  },
  {
    id: 'custom-gen-21',
    name: 'Royal Crown Sigil',
    imageBlack: remoteCustomAvatarAsset('21', 'black'),
    imageWhite: remoteCustomAvatarAsset('21', 'white'),
  },
  {
    id: 'custom-gen-22',
    name: 'Crystal Scepter',
    imageBlack: remoteCustomAvatarAsset('22', 'black'),
    imageWhite: remoteCustomAvatarAsset('22', 'white'),
  },
  {
    id: 'custom-gen-23',
    name: 'Sovereign Orb',
    imageBlack: remoteCustomAvatarAsset('23', 'black'),
    imageWhite: remoteCustomAvatarAsset('23', 'white'),
  },
  {
    id: 'custom-gen-24',
    name: 'Heraldic Shield',
    imageBlack: remoteCustomAvatarAsset('24', 'black'),
    imageWhite: remoteCustomAvatarAsset('24', 'white'),
  },
  {
    id: 'custom-gen-25',
    name: 'Throne Crest',
    imageBlack: remoteCustomAvatarAsset('25', 'black'),
    imageWhite: remoteCustomAvatarAsset('25', 'white'),
  },
  {
    id: 'custom-gen-26',
    name: 'Royal Diadem',
    imageBlack: remoteCustomAvatarAsset('26', 'black'),
    imageWhite: remoteCustomAvatarAsset('26', 'white'),
  },
  {
    id: 'custom-gen-27',
    name: 'Royal Chalice',
    imageBlack: remoteCustomAvatarAsset('27', 'black'),
    imageWhite: remoteCustomAvatarAsset('27', 'white'),
  },
  {
    id: 'custom-gen-28',
    name: 'Crowned Key',
    imageBlack: remoteCustomAvatarAsset('28', 'black'),
    imageWhite: remoteCustomAvatarAsset('28', 'white'),
  },
  {
    id: 'custom-gen-29',
    name: 'Laurel Medal',
    imageBlack: remoteCustomAvatarAsset('29', 'black'),
    imageWhite: remoteCustomAvatarAsset('29', 'white'),
  },
  {
    id: 'custom-gen-30',
    name: 'Imperial Sun Seal',
    imageBlack: remoteCustomAvatarAsset('30', 'black'),
    imageWhite: remoteCustomAvatarAsset('30', 'white'),
  },
  {
    id: 'custom-gen-31',
    name: 'Soft Hooded Tutor',
    imageBlack: remoteCustomAvatarAsset('31', 'black'),
    imageWhite: remoteCustomAvatarAsset('31', 'white'),
  },
  {
    id: 'custom-gen-32',
    name: 'Gentle Scholar Visage',
    imageBlack: remoteCustomAvatarAsset('32', 'black'),
    imageWhite: remoteCustomAvatarAsset('32', 'white'),
  },
  {
    id: 'custom-gen-33',
    name: 'Calm Study Mask',
    imageBlack: remoteCustomAvatarAsset('33', 'black'),
    imageWhite: remoteCustomAvatarAsset('33', 'white'),
  },
  {
    id: 'custom-gen-34',
    name: 'Clear Voice Mentor',
    imageBlack: remoteCustomAvatarAsset('34', 'black'),
    imageWhite: remoteCustomAvatarAsset('34', 'white'),
  },
  {
    id: 'custom-gen-35',
    name: 'Silver Focus Mask',
    imageBlack: remoteCustomAvatarAsset('35', 'black'),
    imageWhite: remoteCustomAvatarAsset('35', 'white'),
  },
  {
    id: 'custom-gen-36',
    name: 'Crowned Listener',
    imageBlack: remoteCustomAvatarAsset('36', 'black'),
    imageWhite: remoteCustomAvatarAsset('36', 'white'),
  },
  {
    id: 'custom-gen-37',
    name: 'Kindly Phrase Mentor',
    imageBlack: remoteCustomAvatarAsset('37', 'black'),
    imageWhite: remoteCustomAvatarAsset('37', 'white'),
  },
  {
    id: 'custom-gen-38',
    name: 'Gentle Professor',
    imageBlack: remoteCustomAvatarAsset('38', 'black'),
    imageWhite: remoteCustomAvatarAsset('38', 'white'),
  },
  {
    id: 'custom-gen-39',
    name: 'Quiet Practice Mask',
    imageBlack: remoteCustomAvatarAsset('39', 'black'),
    imageWhite: remoteCustomAvatarAsset('39', 'white'),
  },
  {
    id: 'custom-gen-40',
    name: 'Dialogue Sage',
    imageBlack: remoteCustomAvatarAsset('40', 'black'),
    imageWhite: remoteCustomAvatarAsset('40', 'white'),
  },
  {
    id: 'custom-gen-41',
    name: 'Magic Notebook',
    imageBlack: remoteCustomAvatarAsset('41', 'black'),
    imageWhite: remoteCustomAvatarAsset('41', 'white'),
  },
  {
    id: 'custom-gen-42',
    name: 'Practice Flame',
    imageBlack: remoteCustomAvatarAsset('42', 'black'),
    imageWhite: remoteCustomAvatarAsset('42', 'white'),
  },
  {
    id: 'custom-gen-43',
    name: 'Ice Focus Shard',
    imageBlack: remoteCustomAvatarAsset('43', 'black'),
    imageWhite: remoteCustomAvatarAsset('43', 'white'),
  },
  {
    id: 'custom-gen-44',
    name: 'Knowledge Leaf',
    imageBlack: remoteCustomAvatarAsset('44', 'black'),
    imageWhite: remoteCustomAvatarAsset('44', 'white'),
  },
  {
    id: 'custom-gen-45',
    name: 'Sun Medal',
    imageBlack: remoteCustomAvatarAsset('45', 'black'),
    imageWhite: remoteCustomAvatarAsset('45', 'white'),
  },
  {
    id: 'custom-gen-46',
    name: 'Moon Drop',
    imageBlack: remoteCustomAvatarAsset('46', 'black'),
    imageWhite: remoteCustomAvatarAsset('46', 'white'),
  },
  {
    id: 'custom-gen-47',
    name: 'Storm Orb',
    imageBlack: remoteCustomAvatarAsset('47', 'black'),
    imageWhite: remoteCustomAvatarAsset('47', 'white'),
  },
  {
    id: 'custom-gen-48',
    name: 'Water Pearl',
    imageBlack: remoteCustomAvatarAsset('48', 'black'),
    imageWhite: remoteCustomAvatarAsset('48', 'white'),
  },
  {
    id: 'custom-gen-49',
    name: 'Crystal Cup',
    imageBlack: remoteCustomAvatarAsset('49', 'black'),
    imageWhite: remoteCustomAvatarAsset('49', 'white'),
  },
  {
    id: 'custom-gen-50',
    name: 'Coral Gem',
    imageBlack: remoteCustomAvatarAsset('50', 'black'),
    imageWhite: remoteCustomAvatarAsset('50', 'white'),
  },
  {
    id: 'custom-gen-51',
    name: 'Growth Seed',
    imageBlack: remoteCustomAvatarAsset('51', 'black'),
    imageWhite: remoteCustomAvatarAsset('51', 'white'),
  },
  {
    id: 'custom-gen-52',
    name: 'Star Pin Badge',
    imageBlack: remoteCustomAvatarAsset('52', 'black'),
    imageWhite: remoteCustomAvatarAsset('52', 'white'),
  },
  {
    id: 'custom-gen-53',
    name: 'Crystal Hourglass',
    imageBlack: remoteCustomAvatarAsset('53', 'black'),
    imageWhite: remoteCustomAvatarAsset('53', 'white'),
  },
  {
    id: 'custom-gen-54',
    name: 'Aurora Feather Charm',
    imageBlack: remoteCustomAvatarAsset('54', 'black'),
    imageWhite: remoteCustomAvatarAsset('54', 'white'),
  },
  {
    id: 'custom-gen-55',
    name: 'Rune Lantern',
    imageBlack: remoteCustomAvatarAsset('55', 'black'),
    imageWhite: remoteCustomAvatarAsset('55', 'white'),
  },
  {
    id: 'custom-gen-56',
    name: 'Sapphire Bell',
    imageBlack: remoteCustomAvatarAsset('56', 'black'),
    imageWhite: remoteCustomAvatarAsset('56', 'white'),
  },
  {
    id: 'custom-gen-57',
    name: 'Pearl Spiral',
    imageBlack: remoteCustomAvatarAsset('57', 'black'),
    imageWhite: remoteCustomAvatarAsset('57', 'white'),
  },
  {
    id: 'custom-gen-58',
    name: 'Ember Coin Stack',
    imageBlack: remoteCustomAvatarAsset('58', 'black'),
    imageWhite: remoteCustomAvatarAsset('58', 'white'),
  },
  {
    id: 'custom-gen-59',
    name: 'Mystic Ink Bottle',
    imageBlack: remoteCustomAvatarAsset('59', 'black'),
    imageWhite: remoteCustomAvatarAsset('59', 'white'),
  },
  {
    id: 'custom-gen-60',
    name: 'Silver Key Relic',
    imageBlack: remoteCustomAvatarAsset('60', 'black'),
    imageWhite: remoteCustomAvatarAsset('60', 'white'),
  },
  {
    id: 'custom-gen-61',
    name: 'Crystal Flower',
    imageBlack: remoteCustomAvatarAsset('61', 'black'),
    imageWhite: remoteCustomAvatarAsset('61', 'white'),
  },
  {
    id: 'custom-gen-62',
    name: 'Gem Shield',
    imageBlack: remoteCustomAvatarAsset('62', 'black'),
    imageWhite: remoteCustomAvatarAsset('62', 'white'),
  },
  { id: 'custom-gen-63', name: 'Cozy Hedgehog', labels: { ru: 'Уютный новичок' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('63', 'black'), imageWhite: remoteCustomAvatarAsset('63', 'white') },
  { id: 'custom-gen-64', name: 'Quick Rabbit', labels: { ru: 'Быстрый запоминатель' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('64', 'black'), imageWhite: remoteCustomAvatarAsset('64', 'white') },
  { id: 'custom-gen-65', name: 'Calm Seal', labels: { ru: 'Спокойный ученик' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('65', 'black'), imageWhite: remoteCustomAvatarAsset('65', 'white') },
  { id: 'custom-gen-66', name: 'Loyal Penguin', labels: { ru: 'Верный практик' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('66', 'black'), imageWhite: remoteCustomAvatarAsset('66', 'white') },
  { id: 'custom-gen-67', name: 'Saving Squirrel', labels: { ru: 'Запасливый повторитель' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('67', 'black'), imageWhite: remoteCustomAvatarAsset('67', 'white') },
  { id: 'custom-gen-68', name: 'Bright Toucan', labels: { ru: 'Яркий собеседник' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('68', 'black'), imageWhite: remoteCustomAvatarAsset('68', 'white') },
  { id: 'custom-gen-69', name: 'Quiet Mole', labels: { ru: 'Тихий исследователь' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('69', 'black'), imageWhite: remoteCustomAvatarAsset('69', 'white') },
  { id: 'custom-gen-70', name: 'Light Butterfly', labels: { ru: 'Лёгкий импровизатор' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('70', 'black'), imageWhite: remoteCustomAvatarAsset('70', 'white') },
  { id: 'custom-gen-71', name: 'Agile Raccoon', labels: { ru: 'Ловкий адаптер' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('71', 'black'), imageWhite: remoteCustomAvatarAsset('71', 'white') },
  { id: 'custom-gen-72', name: 'Careful Roe Deer', labels: { ru: 'Осторожный старт' }, price: 50, tier: 'starter', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('72', 'black'), imageWhite: remoteCustomAvatarAsset('72', 'white') },
  { id: 'custom-gen-73', name: 'Friendly Red Panda', labels: { ru: 'Дружелюбный исследователь' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('73', 'black'), imageWhite: remoteCustomAvatarAsset('73', 'white') },
  { id: 'custom-gen-74', name: 'Free Dolphin', labels: { ru: 'Свободный говорящий' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('74', 'black'), imageWhite: remoteCustomAvatarAsset('74', 'white') },
  { id: 'custom-gen-75', name: 'Expressive Peacock', labels: { ru: 'Выразительный рассказчик' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('75', 'black'), imageWhite: remoteCustomAvatarAsset('75', 'white') },
  { id: 'custom-gen-76', name: 'Steady Pangolin', labels: { ru: 'Последовательный мастер' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('76', 'black'), imageWhite: remoteCustomAvatarAsset('76', 'white') },
  { id: 'custom-gen-77', name: 'Sensitive Orchid', labels: { ru: 'Чуткий слушатель' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('77', 'black'), imageWhite: remoteCustomAvatarAsset('77', 'white') },
  { id: 'custom-gen-78', name: 'Motivating Firefly', labels: { ru: 'Искра мотивации' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('78', 'black'), imageWhite: remoteCustomAvatarAsset('78', 'white') },
  { id: 'custom-gen-79', name: 'Independent Wolf', labels: { ru: 'Самостоятельный ученик' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('79', 'black'), imageWhite: remoteCustomAvatarAsset('79', 'white') },
  { id: 'custom-gen-80', name: 'Gentle Narwhal', labels: { ru: 'Мягкий навигатор' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('80', 'black'), imageWhite: remoteCustomAvatarAsset('80', 'white') },
  { id: 'custom-gen-81', name: 'Brave Tiger Cub', labels: { ru: 'Смелый практик' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('81', 'black'), imageWhite: remoteCustomAvatarAsset('81', 'white') },
  { id: 'custom-gen-82', name: 'Reliable Badger', labels: { ru: 'Надёжный партнёр' }, price: 70, tier: 'expressive', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('82', 'black'), imageWhite: remoteCustomAvatarAsset('82', 'white') },
  { id: 'custom-gen-83', name: 'Precise Snow Leopard', labels: { ru: 'Точный охотник за смыслом' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('83', 'black'), imageWhite: remoteCustomAvatarAsset('83', 'white') },
  { id: 'custom-gen-84', name: 'Breakthrough Marlin', labels: { ru: 'Быстрый прорыв' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('84', 'black'), imageWhite: remoteCustomAvatarAsset('84', 'white') },
  { id: 'custom-gen-85', name: 'Focused Cobra', labels: { ru: 'Собранный стратег' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('85', 'black'), imageWhite: remoteCustomAvatarAsset('85', 'white') },
  { id: 'custom-gen-86', name: 'Vivid Macaw', labels: { ru: 'Яркий коммуникатор' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('86', 'black'), imageWhite: remoteCustomAvatarAsset('86', 'white') },
  { id: 'custom-gen-87', name: 'Deep Orca', labels: { ru: 'Глубокий слушатель' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('87', 'black'), imageWhite: remoteCustomAvatarAsset('87', 'white') },
  { id: 'custom-gen-88', name: 'Confident Stag', labels: { ru: 'Уверенный маршрут' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('88', 'black'), imageWhite: remoteCustomAvatarAsset('88', 'white') },
  { id: 'custom-gen-89', name: 'Flexible Lemur', labels: { ru: 'Гибкий переключатель' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('89', 'black'), imageWhite: remoteCustomAvatarAsset('89', 'white') },
  { id: 'custom-gen-90', name: 'Progress Starfish', labels: { ru: 'Звезда прогресса' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('90', 'black'), imageWhite: remoteCustomAvatarAsset('90', 'white') },
  { id: 'custom-gen-91', name: 'Graceful Flamingo', labels: { ru: 'Изящный ритм' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('91', 'black'), imageWhite: remoteCustomAvatarAsset('91', 'white') },
  { id: 'custom-gen-92', name: 'Sharp Lynx', labels: { ru: 'Острый слух' }, price: 100, tier: 'premium', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('92', 'black'), imageWhite: remoteCustomAvatarAsset('92', 'white') },
  { id: 'custom-gen-93', name: 'Light In Depth', labels: { ru: 'Свет в глубине' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('93', 'black'), imageWhite: remoteCustomAvatarAsset('93', 'white') },
  { id: 'custom-gen-94', name: 'Polar Endurance', labels: { ru: 'Холодная выдержка' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('94', 'black'), imageWhite: remoteCustomAvatarAsset('94', 'white') },
  { id: 'custom-gen-95', name: 'Unyielding Komodo', labels: { ru: 'Несокрушимый прогресс' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('95', 'black'), imageWhite: remoteCustomAvatarAsset('95', 'white') },
  { id: 'custom-gen-96', name: 'Leafy Intuition', labels: { ru: 'Тонкая интуиция' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('96', 'black'), imageWhite: remoteCustomAvatarAsset('96', 'white') },
  { id: 'custom-gen-97', name: 'High Flight Eagle', labels: { ru: 'Высокий полёт' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('97', 'black'), imageWhite: remoteCustomAvatarAsset('97', 'white') },
  { id: 'custom-gen-98', name: 'Calm Strength Moose', labels: { ru: 'Сила спокойствия' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('98', 'black'), imageWhite: remoteCustomAvatarAsset('98', 'white') },
  { id: 'custom-gen-99', name: 'Rare Okapi', labels: { ru: 'Редкий почерк' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('99', 'black'), imageWhite: remoteCustomAvatarAsset('99', 'white') },
  { id: 'custom-gen-100', name: 'Understanding Fennec', labels: { ru: 'Лёгкость понимания' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('100', 'black'), imageWhite: remoteCustomAvatarAsset('100', 'white') },
  { id: 'custom-gen-101', name: 'Night Clarity Moth', labels: { ru: 'Ночная ясность' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('101', 'black'), imageWhite: remoteCustomAvatarAsset('101', 'white') },
  { id: 'custom-gen-102', name: 'Hidden Pearl Clam', labels: { ru: 'Скрытая жемчужина' }, price: 150, tier: 'epic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('102', 'black'), imageWhite: remoteCustomAvatarAsset('102', 'white') },
  { id: 'custom-gen-103', name: 'Legendary Whale Shark', labels: { ru: 'Легенда глубины' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('103', 'black'), imageWhite: remoteCustomAvatarAsset('103', 'white') },
  { id: 'custom-gen-104', name: 'White Lion Confidence', labels: { ru: 'Король уверенности' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('104', 'black'), imageWhite: remoteCustomAvatarAsset('104', 'white') },
  { id: 'custom-gen-105', name: 'Paradise Freedom', labels: { ru: 'Райская свобода' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('105', 'black'), imageWhite: remoteCustomAvatarAsset('105', 'white') },
  { id: 'custom-gen-106', name: 'Golden Manta Flow', labels: { ru: 'Золотой поток' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('106', 'black'), imageWhite: remoteCustomAvatarAsset('106', 'white') },
  { id: 'custom-gen-107', name: 'Snow Owl Insight', labels: { ru: 'Снежное озарение' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('107', 'black'), imageWhite: remoteCustomAvatarAsset('107', 'white') },
  { id: 'custom-gen-108', name: 'Panther Resolve', labels: { ru: 'Тихая решимость' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('108', 'black'), imageWhite: remoteCustomAvatarAsset('108', 'white') },
  { id: 'custom-gen-109', name: 'Kingfisher Focus', labels: { ru: 'Мгновенный фокус' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('109', 'black'), imageWhite: remoteCustomAvatarAsset('109', 'white') },
  { id: 'custom-gen-110', name: 'Turtle Wisdom', labels: { ru: 'Путь мудрости' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('110', 'black'), imageWhite: remoteCustomAvatarAsset('110', 'white') },
  { id: 'custom-gen-111', name: 'Fox Ingenuity', labels: { ru: 'Лисья находчивость' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('111', 'black'), imageWhite: remoteCustomAvatarAsset('111', 'white') },
  { id: 'custom-gen-112', name: 'Crane Balance', labels: { ru: 'Высшее равновесие' }, price: 300, tier: 'legendary', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('112', 'black'), imageWhite: remoteCustomAvatarAsset('112', 'white') },
  { id: 'custom-gen-113', name: 'Spectral Glass Octopus', labels: { ru: 'Спектральный интеллект' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('113', 'black'), imageWhite: remoteCustomAvatarAsset('113', 'white') },
  { id: 'custom-gen-114', name: 'Orchid Mantis Precision', labels: { ru: 'Идеальная точность' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('114', 'black'), imageWhite: remoteCustomAvatarAsset('114', 'white') },
  { id: 'custom-gen-115', name: 'Quetzal Horizon', labels: { ru: 'Горизонт свободы' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('115', 'black'), imageWhite: remoteCustomAvatarAsset('115', 'white') },
  { id: 'custom-gen-116', name: 'Mandarin Fish Radiance', labels: { ru: 'Живое сияние' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('116', 'black'), imageWhite: remoteCustomAvatarAsset('116', 'white') },
  { id: 'custom-gen-117', name: 'Albino Peacock Aura', labels: { ru: 'Аура величия' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('117', 'black'), imageWhite: remoteCustomAvatarAsset('117', 'white') },
  { id: 'custom-gen-118', name: 'Arctic Wolf Command', labels: { ru: 'Северная воля' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('118', 'black'), imageWhite: remoteCustomAvatarAsset('118', 'white') },
  { id: 'custom-gen-119', name: 'Emperor Moth Vision', labels: { ru: 'Императорское видение' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('119', 'black'), imageWhite: remoteCustomAvatarAsset('119', 'white') },
  { id: 'custom-gen-120', name: 'Blue Dragon Adaptation', labels: { ru: 'Совершенная адаптация' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('120', 'black'), imageWhite: remoteCustomAvatarAsset('120', 'white') },
  { id: 'custom-gen-121', name: 'Saiga Legacy', labels: { ru: 'Древнее чутьё' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('121', 'black'), imageWhite: remoteCustomAvatarAsset('121', 'white') },
  { id: 'custom-gen-122', name: 'Sailfish Velocity', labels: { ru: 'Мифическая скорость' }, price: 500, tier: 'mythic', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('122', 'black'), imageWhite: remoteCustomAvatarAsset('122', 'white') },
  { id: 'custom-gen-123', name: 'Apex Humpback Song', labels: { ru: 'Песня вершины' }, price: 1000, tier: 'apex', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('123', 'black'), imageWhite: remoteCustomAvatarAsset('123', 'white') },
  { id: 'custom-gen-124', name: 'Apex Bengal Tiger', labels: { ru: 'Абсолютная сила' }, price: 1000, tier: 'apex', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('124', 'black'), imageWhite: remoteCustomAvatarAsset('124', 'white') },
  { id: 'custom-gen-125', name: 'Apex Albatross Flight', labels: { ru: 'Бесконечный полёт' }, price: 1000, tier: 'apex', collection: 'showcase-v1', imageBlack: remoteCustomAvatarAsset('125', 'black'), imageWhite: remoteCustomAvatarAsset('125', 'white') },
  { id: 'custom-gen-126', name: 'Imperial Ruby Night Chimera', labels: { ru: 'Императорская химера' }, price: 3000, tier: 'apex', collection: 'avatar100-v1', imageBlack: AVATAR100_CATALOG['custom-gen-126'].black, imageWhite: AVATAR100_CATALOG['custom-gen-126'].white },
  { id: 'custom-01', name: 'Chronicler', imageBlack: remoteCustomAvatarAsset('01', 'black'), imageWhite: remoteCustomAvatarAsset('01', 'white') },
  { id: 'custom-02', name: 'Translator', imageBlack: remoteCustomAvatarAsset('02', 'black'), imageWhite: remoteCustomAvatarAsset('02', 'white') },
  { id: 'custom-03', name: 'Codex', imageBlack: remoteCustomAvatarAsset('03', 'black'), imageWhite: remoteCustomAvatarAsset('03', 'white') },
  { id: 'custom-04', name: 'Muse of Knowledge', imageBlack: remoteCustomAvatarAsset('04', 'black'), imageWhite: remoteCustomAvatarAsset('04', 'white') },
  { id: 'custom-05', name: 'Atlas', imageBlack: remoteCustomAvatarAsset('05', 'black'), imageWhite: remoteCustomAvatarAsset('05', 'white') },
  { id: 'custom-06', name: 'Alphabet', imageBlack: remoteCustomAvatarAsset('06', 'black'), imageWhite: remoteCustomAvatarAsset('06', 'white') },
  { id: 'custom-07', name: 'Archivist', imageBlack: remoteCustomAvatarAsset('07', 'black'), imageWhite: remoteCustomAvatarAsset('07', 'white') },
  { id: 'custom-08', name: 'Scroll', imageBlack: remoteCustomAvatarAsset('08', 'black'), imageWhite: remoteCustomAvatarAsset('08', 'white') },
  { id: 'custom-09', name: 'Philosopher', imageBlack: remoteCustomAvatarAsset('09', 'black'), imageWhite: remoteCustomAvatarAsset('09', 'white') },
  { id: 'custom-10', name: 'Athena', imageBlack: remoteCustomAvatarAsset('10', 'black'), imageWhite: remoteCustomAvatarAsset('10', 'white') },
  { id: 'custom-11', name: 'Library', imageBlack: remoteCustomAvatarAsset('11', 'black'), imageWhite: remoteCustomAvatarAsset('11', 'white') },
  { id: 'custom-12', name: 'Black Library', imageBlack: remoteCustomAvatarAsset('12', 'black'), imageWhite: remoteCustomAvatarAsset('12', 'white') },
  { id: 'custom-13', name: 'Investigator', imageBlack: remoteCustomAvatarAsset('13', 'black'), imageWhite: remoteCustomAvatarAsset('13', 'white') },
  { id: 'custom-14', name: 'Law Quill', imageBlack: remoteCustomAvatarAsset('14', 'black'), imageWhite: remoteCustomAvatarAsset('14', 'white') },
  { id: 'custom-15', name: 'Oracle', imageBlack: remoteCustomAvatarAsset('15', 'black'), imageWhite: remoteCustomAvatarAsset('15', 'white') },
  { id: 'custom-16', name: 'Voice', imageBlack: remoteCustomAvatarAsset('16', 'black'), imageWhite: remoteCustomAvatarAsset('16', 'white') },
  { id: 'custom-17', name: 'Senator', imageBlack: remoteCustomAvatarAsset('17', 'black'), imageWhite: remoteCustomAvatarAsset('17', 'white') },
  { id: 'custom-18', name: 'Audiomage', imageBlack: remoteCustomAvatarAsset('18', 'black'), imageWhite: remoteCustomAvatarAsset('18', 'white') },
  { id: 'custom-19', name: 'Graduate', imageBlack: remoteCustomAvatarAsset('19', 'black'), imageWhite: remoteCustomAvatarAsset('19', 'white') },
  { id: 'custom-20', name: 'Detective', imageBlack: remoteCustomAvatarAsset('20', 'black'), imageWhite: remoteCustomAvatarAsset('20', 'white') },
  { id: 'custom-21', name: 'Secret Book', imageBlack: remoteCustomAvatarAsset('21', 'black'), imageWhite: remoteCustomAvatarAsset('21', 'white') },
  { id: 'custom-22', name: 'Academy', imageBlack: remoteCustomAvatarAsset('22', 'black'), imageWhite: remoteCustomAvatarAsset('22', 'white') },
  { id: 'custom-23', name: 'Seer', imageBlack: remoteCustomAvatarAsset('23', 'black'), imageWhite: remoteCustomAvatarAsset('23', 'white') },
  { id: 'custom-24', name: 'Sage', imageBlack: remoteCustomAvatarAsset('24', 'black'), imageWhite: remoteCustomAvatarAsset('24', 'white') },
  { id: 'custom-25', name: 'Grand Sage', imageBlack: remoteCustomAvatarAsset('25', 'black'), imageWhite: remoteCustomAvatarAsset('25', 'white') },
  { id: 'custom-26', name: 'Young Mage', imageBlack: remoteCustomAvatarAsset('26', 'black'), imageWhite: remoteCustomAvatarAsset('26', 'white') },
  { id: 'custom-27', name: 'Writer', imageBlack: remoteCustomAvatarAsset('27', 'black'), imageWhite: remoteCustomAvatarAsset('27', 'white') },
  { id: 'custom-28', name: 'Scholar', imageBlack: remoteCustomAvatarAsset('28', 'black'), imageWhite: remoteCustomAvatarAsset('28', 'white') },
  { id: 'custom-29', name: 'Patrician', imageBlack: remoteCustomAvatarAsset('29', 'black'), imageWhite: remoteCustomAvatarAsset('29', 'white') },
  { id: 'custom-30', name: 'Orator', imageBlack: remoteCustomAvatarAsset('30', 'black'), imageWhite: remoteCustomAvatarAsset('30', 'white') },
  { id: 'custom-31', name: 'Magister', imageBlack: remoteCustomAvatarAsset('31', 'black'), imageWhite: remoteCustomAvatarAsset('31', 'white') },
  { id: 'custom-32', name: 'Word Priestess', imageBlack: remoteCustomAvatarAsset('32', 'black'), imageWhite: remoteCustomAvatarAsset('32', 'white') },
  { id: 'custom-33', name: 'Guardian', imageBlack: remoteCustomAvatarAsset('33', 'black'), imageWhite: remoteCustomAvatarAsset('33', 'white') },
  { id: 'custom-34', name: 'Reader', imageBlack: remoteCustomAvatarAsset('34', 'black'), imageWhite: remoteCustomAvatarAsset('34', 'white') },
  { id: 'custom-35', name: 'Star Student', imageBlack: remoteCustomAvatarAsset('35', 'black'), imageWhite: remoteCustomAvatarAsset('35', 'white') },
];

const AVATAR100_ID_SET = new Set(AVATAR100_CATALOG_IDS);

function avatar100Labels(name: string, labelRu: string): Partial<Record<Lang, string>> {
  return {
    ru: labelRu,
    uk: name,
    es: name,
    'pt-BR': name,
    vi: name,
    id: name,
    tr: name,
    pl: name,
  };
}

export const CUSTOM_AVATARS: CustomAvatarDef[] = CUSTOM_AVATAR_DEFINITIONS.map((avatar) => {
  const active = AVATAR100_CATALOG[avatar.id];
  if (active) {
    return {
      ...avatar,
      name: active.name,
      labels: avatar100Labels(active.name, active.labelRu),
      price: active.price,
      collection: 'avatar100-v1',
      imageBlack: active.black,
      imageWhite: active.white,
    };
  }
  return avatar.collection === 'showcase-v1'
    ? { ...avatar, labels: showcaseAvatarLabels(avatar) }
    : avatar;
});

export function isCustomAvatarGiftOnly(id: string): boolean {
  return /^custom-gen-(0[1-9]|1[0-9]|20|3[1-9]|40)$/.test(id);
}

export function getCustomAvatarGiftWeight(id: string): number {
  return /^custom-gen-(3[1-9]|40)$/.test(id) ? 0.35 : 1;
}

export function isCustomAvatarShardShop(id: string): boolean {
  return AVATAR100_ID_SET.has(id);
}

/** Prior public-sale rows remain parseable/wearable for owners, never sellable again. */
export function isRetiredCustomAvatarSale(id: string): boolean {
  const match = /^custom-gen-(\d+)$/.exec(id);
  if (!match) return false;
  const numericId = Number(match[1]);
  return (numericId >= 41 && numericId <= 72) || numericId === 90;
}

export function getCustomAvatarPurchaseCost(avatarOrId: CustomAvatarDef | string): number {
  const avatar = typeof avatarOrId === 'string'
    ? CUSTOM_AVATARS.find((candidate) => candidate.id === avatarOrId)
    : avatarOrId;
  return avatar?.price ?? CUSTOM_AVATAR_BUY_COST;
}

export const CUSTOM_AVATAR_GIFT_POOL: CustomAvatarDef[] = CUSTOM_AVATARS.filter((avatar) =>
  /^custom-gen-(?:0[1-9]|[1-3]\d|40)$/.test(avatar.id),
);

export const CUSTOM_AVATAR_GIFT_ONLY: CustomAvatarDef[] = CUSTOM_AVATAR_GIFT_POOL.filter((avatar) =>
  isCustomAvatarGiftOnly(avatar.id),
);

export const CUSTOM_AVATAR_SHOP: CustomAvatarDef[] = CUSTOM_AVATARS.filter((avatar) =>
  isCustomAvatarShardShop(avatar.id),
);

export type CustomAvatarValue = {
  avatarId: string;
  gradientId: string;
  logoColor: CustomAvatarLogoColor;
  artVersion?: CustomAvatarArtVersion;
};

function isLegacyAvatar100Overlap(id: string): boolean {
  const match = /^custom-gen-(\d+)$/.exec(id);
  if (!match) return false;
  const numericId = Number(match[1]);
  return numericId >= 73 && numericId <= 125;
}

function normalizeCustomAvatarArtVersion(value?: string | null): CustomAvatarArtVersion | undefined {
  if (value === AVATAR100_ART_VERSION) return AVATAR100_ART_VERSION;
  if (value === LEGACY_SHOWCASE_ART_VERSION) return LEGACY_SHOWCASE_ART_VERSION;
  return undefined;
}

export function inferStoredCustomAvatarArtVersion(
  avatarId: string,
  explicitVersion?: string | null,
): CustomAvatarArtVersion | undefined {
  return normalizeCustomAvatarArtVersion(explicitVersion)
    ?? (isLegacyAvatar100Overlap(avatarId) ? LEGACY_SHOWCASE_ART_VERSION : undefined);
}

export function makeCustomAvatarValue(
  avatarId: string,
  gradientId: string,
  logoColor: CustomAvatarLogoColor = 'black',
  artVersion?: CustomAvatarArtVersion,
): string {
  const base = `custom:${avatarId}:${gradientId}:${logoColor}`;
  return artVersion ? `${base}:${artVersion}` : base;
}

export function parseCustomAvatarValue(value?: string | null): CustomAvatarValue | null {
  if (!value) return null;
  const parts = String(value).split(':');
  if ((parts.length !== 3 && parts.length !== 4 && parts.length !== 5) || parts[0] !== 'custom') return null;
  const avatarId = parts[1];
  const gradientId = parts[2];
  const logoColor = parts[3] === 'white' ? 'white' : 'black';
  if (!getCustomAvatarById(avatarId)) return null;
  return {
    avatarId,
    gradientId: getCustomAvatarGradientById(gradientId)?.id ?? CUSTOM_AVATAR_GRADIENTS[0].id,
    logoColor,
    artVersion: inferStoredCustomAvatarArtVersion(avatarId, parts[4]),
  };
}

export function isCustomAvatarValue(value?: string | null): boolean {
  return parseCustomAvatarValue(value) !== null;
}

export function getCustomAvatarById(id: string): CustomAvatarDef | undefined {
  return CUSTOM_AVATARS.find((avatar) => avatar.id === id);
}

export function getCustomAvatarArtSource(
  avatarId: string,
  logoColor: CustomAvatarLogoColor,
  artVersion?: CustomAvatarArtVersion,
): ImageSourcePropType | undefined {
  // зачем: старый арт 73–125 УЖЕ лежит на хостинге по обычному пути и никуда не
  // делся — новый Avatar100 положен в отдельную папку avatar100-v1 и его не
  // затирает. Поэтому прежний покупатель получает ровно свою историческую
  // картинку без единого лишнего файла на хостинге (владелец, 2026-08-27).
  if (artVersion === LEGACY_SHOWCASE_ART_VERSION && isLegacyAvatar100Overlap(avatarId)) {
    const numericId = avatarId.slice('custom-gen-'.length);
    return {
      uri: `${CUSTOM_AVATAR_ASSET_BASE_URL}/custom-idea-${numericId}-${logoColor}.webp`,
    };
  }
  const avatar = getCustomAvatarById(avatarId);
  return logoColor === 'white' ? avatar?.imageWhite : avatar?.imageBlack;
}

export type CustomAvatarOwnedStyle = Readonly<{
  gradientId: string;
  logoColor: CustomAvatarLogoColor;
  artVersion?: CustomAvatarArtVersion;
}>;

export function parseCustomAvatarOwnedStyle(
  avatarId: string,
  value?: string | null,
): CustomAvatarOwnedStyle | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const [versionPrefix, styleValue] = raw.includes('|') ? raw.split('|', 2) : [undefined, raw];
  const [gradientId, logoColor] = styleValue.split(':');
  if (!gradientId) return null;
  return {
    gradientId: getCustomAvatarGradientById(gradientId)?.id ?? CUSTOM_AVATAR_GRADIENTS[0].id,
    logoColor: logoColor === 'white' ? 'white' : 'black',
    artVersion: inferStoredCustomAvatarArtVersion(avatarId, versionPrefix),
  };
}

export function encodeCustomAvatarOwnedStyle(value: CustomAvatarValue): string {
  const style = `${value.gradientId}:${value.logoColor}`;
  return value.artVersion ? `${value.artVersion}|${style}` : style;
}

export function getCustomAvatarGradientById(id: string): CustomAvatarGradient | undefined {
  return CUSTOM_AVATAR_GRADIENTS.find((gradient) => gradient.id === id);
}

export function customAvatarNameForLang(avatar: CustomAvatarDef | string | undefined | null, lang: Lang): string {
  const id = typeof avatar === 'string' ? avatar : avatar?.id;
  const defaultName = typeof avatar === 'string' ? avatar : avatar?.name;
  const label = id ? CUSTOM_AVATAR_LABELS[id] : undefined;
  const localized = (typeof avatar === 'string' ? undefined : avatar?.labels?.[lang]) ?? label?.[lang];
  if (localized) return localized;
  return defaultName || label?.ru || '';
}

export function customAvatarGradientNameForLang(
  gradient: CustomAvatarGradient | string | undefined | null,
  lang: Lang,
): string {
  const id = typeof gradient === 'string' ? gradient : gradient?.id;
  const defaultName = typeof gradient === 'string' ? gradient : gradient?.name;
  const label = id ? CUSTOM_AVATAR_GRADIENT_LABELS[id] : undefined;
  const localized = label?.[lang];
  if (localized) return localized;
  return defaultName || label?.ru || '';
}

export function customAvatarGiftLabelForLang(
  avatar: CustomAvatarDef,
  gradient: CustomAvatarGradient,
  lang: Lang,
): string {
  return `${customAvatarNameForLang(avatar, lang)} - ${customAvatarGradientNameForLang(gradient, lang)}`;
}
