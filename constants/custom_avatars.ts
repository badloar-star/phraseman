import type { ImageSourcePropType } from 'react-native';
import type { Lang } from './i18n';

export const CUSTOM_AVATAR_BUY_COST = 50;
export const CUSTOM_AVATAR_RESTYLE_COST = 10;
export const CUSTOM_AVATAR_OWNED_KEY = 'custom_avatar_owned_v1';

export type CustomAvatarGradient = {
  id: string;
  name: string;
  colors: readonly [string, string, string];
};

export type CustomAvatarLogoColor = 'black' | 'white';

export type CustomAvatarDef = {
  id: string;
  name: string;
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
  'custom-gen-58': { ru: 'Монеты жара', uk: 'Монети жару', es: 'Monedas de brasa', 'pt-BR': 'Moedas de brasa', vi: 'Đồng xu than hồng', id: 'Koin Bara', tr: 'Kor Para', pl: 'Monety żaru' },
  'custom-gen-59': { ru: 'Флакон чернил', uk: 'Флакон чорнила', es: 'Frasco de tinta', 'pt-BR': 'Frasco de tinta', vi: 'Lọ mực', id: 'Botol Tinta', tr: 'Mürekkep Şişesi', pl: 'Flakon atramentu' },
  'custom-gen-60': { ru: 'Серебряный ключ', uk: 'Срібний ключ', es: 'Llave plateada', 'pt-BR': 'Chave prateada', vi: 'Chìa khóa bạc', id: 'Kunci Perak', tr: 'Gümüş Anahtar', pl: 'Srebrny klucz' },
  'custom-gen-61': { ru: 'Кристальный цветок', uk: 'Кришталевий цвіт', es: 'Flor cristalina', 'pt-BR': 'Flor cristalina', vi: 'Hoa pha lê', id: 'Bunga Kristal', tr: 'Kristal Çiçek', pl: 'Kryształowy kwiat' },
  'custom-gen-62': { ru: 'Щит самоцвета', uk: 'Щит самоцвіту', es: 'Escudo gema', 'pt-BR': 'Escudo gema', vi: 'Khiên đá quý', id: 'Perisai Permata', tr: 'Mücevher Kalkanı', pl: 'Tarcza klejnotu' },
};

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

export const CUSTOM_AVATAR_GRADIENTS: CustomAvatarGradient[] = [
  { id: 'aurora', name: 'Graphite', colors: ['#111827', '#1F2937', '#9CA3AF'] },
  { id: 'ember', name: 'Sketch', colors: ['#F3ECDC', '#DED4C0', '#343842'] },
  { id: 'cosmic', name: 'Forest', colors: ['#07100A', '#253630', '#47C870'] },
  { id: 'forest', name: 'Neon', colors: ['#0D0D0D', '#343434', '#C8FF00'] },
  { id: 'citrine', name: 'Coral', colors: ['#1C1113', '#3A2A2E', '#FF6464'] },
  { id: 'royal', name: 'Gold', colors: ['#050504', '#18140D', '#D7AD56'] },
  { id: 'ruby', name: 'Coral Gold', colors: ['#2D2024', '#FF6464', '#FFD060'] },
  { id: 'magma', name: 'Forest Gold', colors: ['#07100A', '#47C870', '#FFC800'] },
  { id: 'noirgold', name: 'Noir Gold', colors: ['#050504', '#18140D', '#F1CC72'] },
  { id: 'sakura', name: 'Sketch Coral', colors: ['#FFFDF6', '#DED4C0', '#FF6464'] },
];

export const CUSTOM_AVATARS: CustomAvatarDef[] = [
  {
    id: 'custom-gen-01',
    name: 'Hooded Oracle',
    imageBlack: require('../assets/images/avatars/custom-idea-01-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-01-white.webp'),
  },
  {
    id: 'custom-gen-02',
    name: 'Ancient Philosopher',
    imageBlack: require('../assets/images/avatars/custom-idea-02-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-02-white.webp'),
  },
  {
    id: 'custom-gen-03',
    name: 'Masked Scholar',
    imageBlack: require('../assets/images/avatars/custom-idea-03-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-03-white.webp'),
  },
  {
    id: 'custom-gen-04',
    name: 'Crowned Mentor',
    imageBlack: require('../assets/images/avatars/custom-idea-04-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-04-white.webp'),
  },
  {
    id: 'custom-gen-05',
    name: 'Armored Guardian',
    imageBlack: require('../assets/images/avatars/custom-idea-05-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-05-white.webp'),
  },
  {
    id: 'custom-gen-06',
    name: 'Young Mage',
    imageBlack: require('../assets/images/avatars/custom-idea-06-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-06-white.webp'),
  },
  {
    id: 'custom-gen-07',
    name: 'Clear Orator',
    imageBlack: require('../assets/images/avatars/custom-idea-07-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-07-white.webp'),
  },
  {
    id: 'custom-gen-08',
    name: 'Librarian Sage',
    imageBlack: require('../assets/images/avatars/custom-idea-08-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-08-white.webp'),
  },
  {
    id: 'custom-gen-09',
    name: 'Star Priestess',
    imageBlack: require('../assets/images/avatars/custom-idea-09-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-09-white.webp'),
  },
  {
    id: 'custom-gen-10',
    name: 'Astral Knight',
    imageBlack: require('../assets/images/avatars/custom-idea-10-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-10-white.webp'),
  },
  {
    id: 'custom-gen-11',
    name: 'Wise Owl',
    imageBlack: require('../assets/images/avatars/custom-idea-11-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-11-white.webp'),
  },
  {
    id: 'custom-gen-12',
    name: 'Noble Wolf',
    imageBlack: require('../assets/images/avatars/custom-idea-12-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-12-white.webp'),
  },
  {
    id: 'custom-gen-13',
    name: 'Clever Fox',
    imageBlack: require('../assets/images/avatars/custom-idea-13-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-13-white.webp'),
  },
  {
    id: 'custom-gen-14',
    name: 'Regal Stag',
    imageBlack: require('../assets/images/avatars/custom-idea-14-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-14-white.webp'),
  },
  {
    id: 'custom-gen-15',
    name: 'Lion Scholar',
    imageBlack: require('../assets/images/avatars/custom-idea-15-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-15-white.webp'),
  },
  {
    id: 'custom-gen-16',
    name: 'Raven Scribe',
    imageBlack: require('../assets/images/avatars/custom-idea-16-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-16-white.webp'),
  },
  {
    id: 'custom-gen-17',
    name: 'Crystal Cat',
    imageBlack: require('../assets/images/avatars/custom-idea-17-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-17-white.webp'),
  },
  {
    id: 'custom-gen-18',
    name: 'Scholar Bear',
    imageBlack: require('../assets/images/avatars/custom-idea-18-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-18-white.webp'),
  },
  {
    id: 'custom-gen-19',
    name: 'Crystal Horse',
    imageBlack: require('../assets/images/avatars/custom-idea-19-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-19-white.webp'),
  },
  {
    id: 'custom-gen-20',
    name: 'Crystal Dolphin',
    imageBlack: require('../assets/images/avatars/custom-idea-20-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-20-white.webp'),
  },
  {
    id: 'custom-gen-21',
    name: 'Royal Crown Sigil',
    imageBlack: require('../assets/images/avatars/custom-idea-21-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-21-white.webp'),
  },
  {
    id: 'custom-gen-22',
    name: 'Crystal Scepter',
    imageBlack: require('../assets/images/avatars/custom-idea-22-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-22-white.webp'),
  },
  {
    id: 'custom-gen-23',
    name: 'Sovereign Orb',
    imageBlack: require('../assets/images/avatars/custom-idea-23-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-23-white.webp'),
  },
  {
    id: 'custom-gen-24',
    name: 'Heraldic Shield',
    imageBlack: require('../assets/images/avatars/custom-idea-24-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-24-white.webp'),
  },
  {
    id: 'custom-gen-25',
    name: 'Throne Crest',
    imageBlack: require('../assets/images/avatars/custom-idea-25-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-25-white.webp'),
  },
  {
    id: 'custom-gen-26',
    name: 'Royal Diadem',
    imageBlack: require('../assets/images/avatars/custom-idea-26-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-26-white.webp'),
  },
  {
    id: 'custom-gen-27',
    name: 'Royal Chalice',
    imageBlack: require('../assets/images/avatars/custom-idea-27-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-27-white.webp'),
  },
  {
    id: 'custom-gen-28',
    name: 'Crowned Key',
    imageBlack: require('../assets/images/avatars/custom-idea-28-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-28-white.webp'),
  },
  {
    id: 'custom-gen-29',
    name: 'Laurel Medal',
    imageBlack: require('../assets/images/avatars/custom-idea-29-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-29-white.webp'),
  },
  {
    id: 'custom-gen-30',
    name: 'Imperial Sun Seal',
    imageBlack: require('../assets/images/avatars/custom-idea-30-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-30-white.webp'),
  },
  {
    id: 'custom-gen-31',
    name: 'Soft Hooded Tutor',
    imageBlack: require('../assets/images/avatars/custom-idea-31-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-31-white.webp'),
  },
  {
    id: 'custom-gen-32',
    name: 'Gentle Scholar Visage',
    imageBlack: require('../assets/images/avatars/custom-idea-32-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-32-white.webp'),
  },
  {
    id: 'custom-gen-33',
    name: 'Calm Study Mask',
    imageBlack: require('../assets/images/avatars/custom-idea-33-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-33-white.webp'),
  },
  {
    id: 'custom-gen-34',
    name: 'Clear Voice Mentor',
    imageBlack: require('../assets/images/avatars/custom-idea-34-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-34-white.webp'),
  },
  {
    id: 'custom-gen-35',
    name: 'Silver Focus Mask',
    imageBlack: require('../assets/images/avatars/custom-idea-35-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-35-white.webp'),
  },
  {
    id: 'custom-gen-36',
    name: 'Crowned Listener',
    imageBlack: require('../assets/images/avatars/custom-idea-36-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-36-white.webp'),
  },
  {
    id: 'custom-gen-37',
    name: 'Kindly Phrase Mentor',
    imageBlack: require('../assets/images/avatars/custom-idea-37-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-37-white.webp'),
  },
  {
    id: 'custom-gen-38',
    name: 'Gentle Professor',
    imageBlack: require('../assets/images/avatars/custom-idea-38-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-38-white.webp'),
  },
  {
    id: 'custom-gen-39',
    name: 'Quiet Practice Mask',
    imageBlack: require('../assets/images/avatars/custom-idea-39-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-39-white.webp'),
  },
  {
    id: 'custom-gen-40',
    name: 'Dialogue Sage',
    imageBlack: require('../assets/images/avatars/custom-idea-40-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-40-white.webp'),
  },
  {
    id: 'custom-gen-41',
    name: 'Magic Notebook',
    imageBlack: require('../assets/images/avatars/custom-idea-41-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-41-white.webp'),
  },
  {
    id: 'custom-gen-42',
    name: 'Practice Flame',
    imageBlack: require('../assets/images/avatars/custom-idea-42-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-42-white.webp'),
  },
  {
    id: 'custom-gen-43',
    name: 'Ice Focus Shard',
    imageBlack: require('../assets/images/avatars/custom-idea-43-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-43-white.webp'),
  },
  {
    id: 'custom-gen-44',
    name: 'Knowledge Leaf',
    imageBlack: require('../assets/images/avatars/custom-idea-44-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-44-white.webp'),
  },
  {
    id: 'custom-gen-45',
    name: 'Sun Medal',
    imageBlack: require('../assets/images/avatars/custom-idea-45-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-45-white.webp'),
  },
  {
    id: 'custom-gen-46',
    name: 'Moon Drop',
    imageBlack: require('../assets/images/avatars/custom-idea-46-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-46-white.webp'),
  },
  {
    id: 'custom-gen-47',
    name: 'Storm Orb',
    imageBlack: require('../assets/images/avatars/custom-idea-47-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-47-white.webp'),
  },
  {
    id: 'custom-gen-48',
    name: 'Water Pearl',
    imageBlack: require('../assets/images/avatars/custom-idea-48-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-48-white.webp'),
  },
  {
    id: 'custom-gen-49',
    name: 'Crystal Cup',
    imageBlack: require('../assets/images/avatars/custom-idea-49-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-49-white.webp'),
  },
  {
    id: 'custom-gen-50',
    name: 'Coral Gem',
    imageBlack: require('../assets/images/avatars/custom-idea-50-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-50-white.webp'),
  },
  {
    id: 'custom-gen-51',
    name: 'Growth Seed',
    imageBlack: require('../assets/images/avatars/custom-idea-51-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-51-white.webp'),
  },
  {
    id: 'custom-gen-52',
    name: 'Star Pin Badge',
    imageBlack: require('../assets/images/avatars/custom-idea-52-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-52-white.webp'),
  },
  {
    id: 'custom-gen-53',
    name: 'Crystal Hourglass',
    imageBlack: require('../assets/images/avatars/custom-idea-53-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-53-white.webp'),
  },
  {
    id: 'custom-gen-54',
    name: 'Aurora Feather Charm',
    imageBlack: require('../assets/images/avatars/custom-idea-54-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-54-white.webp'),
  },
  {
    id: 'custom-gen-55',
    name: 'Rune Lantern',
    imageBlack: require('../assets/images/avatars/custom-idea-55-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-55-white.webp'),
  },
  {
    id: 'custom-gen-56',
    name: 'Sapphire Bell',
    imageBlack: require('../assets/images/avatars/custom-idea-56-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-56-white.webp'),
  },
  {
    id: 'custom-gen-57',
    name: 'Pearl Spiral',
    imageBlack: require('../assets/images/avatars/custom-idea-57-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-57-white.webp'),
  },
  {
    id: 'custom-gen-58',
    name: 'Ember Coin Stack',
    imageBlack: require('../assets/images/avatars/custom-idea-58-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-58-white.webp'),
  },
  {
    id: 'custom-gen-59',
    name: 'Mystic Ink Bottle',
    imageBlack: require('../assets/images/avatars/custom-idea-59-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-59-white.webp'),
  },
  {
    id: 'custom-gen-60',
    name: 'Silver Key Relic',
    imageBlack: require('../assets/images/avatars/custom-idea-60-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-60-white.webp'),
  },
  {
    id: 'custom-gen-61',
    name: 'Crystal Flower',
    imageBlack: require('../assets/images/avatars/custom-idea-61-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-61-white.webp'),
  },
  {
    id: 'custom-gen-62',
    name: 'Gem Shield',
    imageBlack: require('../assets/images/avatars/custom-idea-62-black.webp'),
    imageWhite: require('../assets/images/avatars/custom-idea-62-white.webp'),
  },
  { id: 'custom-01', name: 'Chronicler', image: require('../assets/images/avatars/custom-01-logo.webp') },
  { id: 'custom-02', name: 'Translator', image: require('../assets/images/avatars/custom-02-logo.webp') },
  { id: 'custom-03', name: 'Codex', image: require('../assets/images/avatars/custom-03-logo.webp') },
  { id: 'custom-04', name: 'Muse of Knowledge', image: require('../assets/images/avatars/custom-04-logo.webp') },
  { id: 'custom-05', name: 'Atlas', image: require('../assets/images/avatars/custom-05-logo.webp') },
  { id: 'custom-06', name: 'Alphabet', image: require('../assets/images/avatars/custom-06-logo.webp') },
  { id: 'custom-07', name: 'Archivist', image: require('../assets/images/avatars/custom-07-logo.webp') },
  { id: 'custom-08', name: 'Scroll', image: require('../assets/images/avatars/custom-08-logo.webp') },
  { id: 'custom-09', name: 'Philosopher', image: require('../assets/images/avatars/custom-09-logo.webp') },
  { id: 'custom-10', name: 'Athena', image: require('../assets/images/avatars/custom-10-logo.webp') },
  { id: 'custom-11', name: 'Library', image: require('../assets/images/avatars/custom-11-logo.webp') },
  { id: 'custom-12', name: 'Black Library', image: require('../assets/images/avatars/custom-12-logo.webp') },
  { id: 'custom-13', name: 'Investigator', image: require('../assets/images/avatars/custom-13-logo.webp') },
  { id: 'custom-14', name: 'Law Quill', image: require('../assets/images/avatars/custom-14-logo.webp') },
  { id: 'custom-15', name: 'Oracle', image: require('../assets/images/avatars/custom-15-logo.webp') },
  { id: 'custom-16', name: 'Voice', image: require('../assets/images/avatars/custom-16-logo.webp') },
  { id: 'custom-17', name: 'Senator', image: require('../assets/images/avatars/custom-17-logo.webp') },
  { id: 'custom-18', name: 'Audiomage', image: require('../assets/images/avatars/custom-18-logo.webp') },
  { id: 'custom-19', name: 'Graduate', image: require('../assets/images/avatars/custom-19-logo.webp') },
  { id: 'custom-20', name: 'Detective', image: require('../assets/images/avatars/custom-20-logo.webp') },
  { id: 'custom-21', name: 'Secret Book', image: require('../assets/images/avatars/custom-21-logo.webp') },
  { id: 'custom-22', name: 'Academy', image: require('../assets/images/avatars/custom-22-logo.webp') },
  { id: 'custom-23', name: 'Seer', image: require('../assets/images/avatars/custom-23-logo.webp') },
  { id: 'custom-24', name: 'Sage', image: require('../assets/images/avatars/custom-24-logo.webp') },
  { id: 'custom-25', name: 'Grand Sage', image: require('../assets/images/avatars/custom-25-logo.webp') },
  { id: 'custom-26', name: 'Young Mage', image: require('../assets/images/avatars/custom-26-logo.webp') },
  { id: 'custom-27', name: 'Writer', image: require('../assets/images/avatars/custom-27-logo.webp') },
  { id: 'custom-28', name: 'Scholar', image: require('../assets/images/avatars/custom-28-logo.webp') },
  { id: 'custom-29', name: 'Patrician', image: require('../assets/images/avatars/custom-29-logo.webp') },
  { id: 'custom-30', name: 'Orator', image: require('../assets/images/avatars/custom-30-logo.webp') },
  { id: 'custom-31', name: 'Magister', image: require('../assets/images/avatars/custom-31-logo.webp') },
  { id: 'custom-32', name: 'Word Priestess', image: require('../assets/images/avatars/custom-32-logo.webp') },
  { id: 'custom-33', name: 'Guardian', image: require('../assets/images/avatars/custom-33-logo.webp') },
  { id: 'custom-34', name: 'Reader', image: require('../assets/images/avatars/custom-34-logo.webp') },
  { id: 'custom-35', name: 'Star Student', image: require('../assets/images/avatars/custom-35-logo.webp') },
];

export function isCustomAvatarGiftOnly(id: string): boolean {
  return /^custom-gen-(0[1-9]|1[0-9]|20|3[1-9]|40)$/.test(id);
}

export function getCustomAvatarGiftWeight(id: string): number {
  return /^custom-gen-(3[1-9]|40)$/.test(id) ? 0.35 : 1;
}

export function isCustomAvatarShardShop(id: string): boolean {
  return /^custom-gen-(4[1-9]|5[0-9]|6[0-2])$/.test(id);
}

export const CUSTOM_AVATAR_GIFT_POOL: CustomAvatarDef[] = CUSTOM_AVATARS.filter((avatar) =>
  avatar.id.startsWith('custom-gen-') && !isCustomAvatarShardShop(avatar.id),
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
};

export function makeCustomAvatarValue(
  avatarId: string,
  gradientId: string,
  logoColor: CustomAvatarLogoColor = 'black',
): string {
  return `custom:${avatarId}:${gradientId}:${logoColor}`;
}

export function parseCustomAvatarValue(value?: string | null): CustomAvatarValue | null {
  if (!value) return null;
  const parts = String(value).split(':');
  if ((parts.length !== 3 && parts.length !== 4) || parts[0] !== 'custom') return null;
  const avatarId = parts[1];
  const gradientId = parts[2];
  const logoColor = parts[3] === 'white' ? 'white' : 'black';
  if (!getCustomAvatarById(avatarId)) return null;
  return {
    avatarId,
    gradientId: getCustomAvatarGradientById(gradientId)?.id ?? CUSTOM_AVATAR_GRADIENTS[0].id,
    logoColor,
  };
}

export function isCustomAvatarValue(value?: string | null): boolean {
  return parseCustomAvatarValue(value) !== null;
}

export function getCustomAvatarById(id: string): CustomAvatarDef | undefined {
  return CUSTOM_AVATARS.find((avatar) => avatar.id === id);
}

export function getCustomAvatarGradientById(id: string): CustomAvatarGradient | undefined {
  return CUSTOM_AVATAR_GRADIENTS.find((gradient) => gradient.id === id);
}

export function customAvatarNameForLang(avatar: CustomAvatarDef | string | undefined | null, lang: Lang): string {
  const id = typeof avatar === 'string' ? avatar : avatar?.id;
  const defaultName = typeof avatar === 'string' ? avatar : avatar?.name;
  const label = id ? CUSTOM_AVATAR_LABELS[id] : undefined;
  const localized = label?.[lang];
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
