/**
 * Тексты плашки «Наборы от пользователей» в разделе Сообщество: 5 вариантов × 9 языков (Переводчик, docs/work/community_notices_9lang.md, коммит 22283708a).
 * зачем (макет утверждён владельцем 04.11): честное предупреждение с юмором; вариант выбирается номером ISO-недели mod 5 (community_notice.ts).
 */
import type { Lang } from '../constants/i18n';

export const COMMUNITY_NOTICE_TEXTS: ReadonlyArray<Readonly<Record<Lang, string>>> = [
  {
    ru: "Наборы от пользователей. Если выглядит странно — так и есть.",
    uk: "Набори від користувачів. Якщо виглядає дивно, так і є.",
    en: "Made by users. If it looks odd, it is.",
    es: "Sets de usuarios. Si parece raro, lo es.",
    'pt-BR': "Conjuntos de usuários. Se parecer estranho, é.",
    vi: "Bộ thẻ do người dùng tạo. Lạ là đúng đấy.",
    id: "Set buatan pengguna. Kalau aneh, ya memang begitu.",
    tr: "Kullanıcı setleri. Garip duruyorsa, öyledir.",
    pl: "Zestawy od użytkowników. Jeśli dziwne, to pewnie tak bywa.",
  },
  {
    ru: "Наборы сообщества: бесплатно, от души и без гарантий.",
    uk: "Набори спільноти: безкоштовно, від щирого серця і без гарантій.",
    en: "Community sets: free, made with love, no guarantees.",
    es: "Sets de la comunidad: gratis, con cariño y sin garantías.",
    'pt-BR': "Conjuntos da comunidade: de graça, com carinho e sem garantias.",
    vi: "Bộ thẻ cộng đồng: miễn phí, làm bằng cả tấm lòng, không đảm bảo gì cả.",
    id: "Set komunitas: gratis, dibuat dengan sepenuh hati, tanpa jaminan.",
    tr: "Topluluk setleri: ücretsiz, içtenlikle hazırlanmış, garantisiz.",
    pl: "Zestawy społeczności: za darmo, od serca i bez gwarancji.",
  },
  {
    ru: "Наборы от пользователей. Не проверяли, но уважаем смелость.",
    uk: "Набори від користувачів. Не перевіряли, але поважаємо сміливість.",
    en: "Made by users. Not checked, but we respect the nerve.",
    es: "Sets de usuarios. Sin revisar, pero respetamos el valor.",
    'pt-BR': "Conjuntos de usuários. Não revisamos, mas respeitamos a coragem.",
    vi: "Bộ thẻ người dùng làm. Chưa kiểm tra, nhưng nể sự dũng cảm.",
    id: "Set dari pengguna. Belum dicek, tapi salut untuk keberaniannya.",
    tr: "Kullanıcı setleri. Kontrol etmedik, cesaretlerine saygımız var.",
    pl: "Zestawy od użytkowników. Nie sprawdzaliśmy, ale szanujemy odwagę.",
  },
  {
    ru: "Наборы пользовательские. Опечатка — ваше новое слово.",
    uk: "Набори користувацькі. Друкарська помилка — ваше нове слово.",
    en: "User-made sets. A typo is your new word.",
    es: "Sets de usuarios. Una errata: tu nueva palabra.",
    'pt-BR': "Conjuntos de usuários. Um erro de digitação: sua nova palavra.",
    vi: "Bộ thẻ người dùng tạo. Lỗi chính tả cũng có thể là từ mới.",
    id: "Set buatan pengguna. Salah ketik bisa jadi kata barumu.",
    tr: "Kullanıcı setleri. Yazım hatası, yeni kelimen olabilir.",
    pl: "Zestawy użytkowników. Literówka to twoje nowe słowo.",
  },
  {
    ru: "Эти наборы мы даже не открывали. Честно.",
    uk: "Ці набори ми навіть не відкривали. Чесно.",
    en: "We haven’t even opened these sets. Honestly.",
    es: "Ni siquiera hemos abierto estos sets. En serio.",
    'pt-BR': "Nem abrimos esses conjuntos. Sério.",
    vi: "Chúng tôi còn chưa mở mấy bộ này. Thật đấy.",
    id: "Kami bahkan belum membuka set ini. Jujur saja.",
    tr: "Bu setleri açmadık bile. Dürüst olmak gerekirse.",
    pl: "Tych zestawów nawet nie otworzyliśmy. Serio.",
  },
];
