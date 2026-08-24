export {
  AVATAR_AURA_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  USER_AVATAR_AURA_KEY,
} from './customization_storage_keys';
// зачем: см. CUSTOM_AVATAR_BUY_COST — жемчуг только покупается, цена = ценник в евро.
// Аура дороже аватара (120 против 90): она заметнее в бою/профиле и её носят реже.
export const AVATAR_AURA_BUY_COST = 120;
export const NO_AVATAR_AURA_ID = 'none';
export const PLUS_AVATAR_AURA_ID = 'aura-plus';
export const PRO_AVATAR_AURA_ID = 'aura-pro';
export const LEGACY_PREMIUM_AVATAR_AURA_ID = 'aura-premium';
export const LEGACY_VIP_AVATAR_AURA_ID = 'aura-vip';
/** Compatibility aliases: paid and admin-granted Plus now share one catalog/render ID. */
export const PREMIUM_AVATAR_AURA_ID = PLUS_AVATAR_AURA_ID;
export const VIP_AVATAR_AURA_ID = PLUS_AVATAR_AURA_ID;
/** Аура «Нимб» — синее дышащее свечение. Выдаётся только вручную из админки бета-тестерам. */
export const BETA_NIMBUS_AURA_ID = 'aura-nimbus';
export const SEASON_AVATAR_AURA_IDS = [
  'aura-season-1-stage-1',
  'aura-season-1-stage-2',
  'aura-season-1-stage-3',
  'aura-season-1-stage-4',
  'aura-season-1-secret',
] as const;

export type AvatarAuraEffect =
  | 'flame'
  | 'storm'
  | 'starvortex'
  | 'voidamethyst'
  | 'lava'
  | 'typhoon'
  | 'gravity'
  | 'plasma'
  | 'ether'
  | 'absolute'
  | 'nimbus';

export type AvatarAuraDef = {
  id: string;
  nameRu: string;
  nameUk: string;
  nameEs: string;
  namePtBr: string;
  nameVi: string;
  nameId: string;
  nameTr: string;
  namePl: string;
  color: string;
  color2?: string;
  color3?: string;
  softColor: string;
  premiumOnly?: boolean;
  vipOnly?: boolean;
  proOnly?: boolean;
  material?: 'halo' | 'satin';
  unlockLevel?: number;
  /**
   * Аура выдаётся ТОЛЬКО как награда (вручную из админки, как «Нимб») и не продаётся
   * за осколки. На экране выбора показывается без цены, тап не ведёт к покупке.
   */
  rewardOnly?: boolean;
  /** Снята с продажи, но остаётся доступна прежним владельцам. */
  retiredFromShop?: boolean;
  effect?: AvatarAuraEffect;
  /** Immutable approved art-set slug used by the static three-layer renderer. */
  designId?: string;
  /** Motion recipe family for the approved layered art. */
  motion?: 'calm' | 'nature' | 'tech' | 'mystic' | 'energy' | 'playful' | 'luxury' | 'dark' | 'plus' | 'pro';
};

type ApprovedAuraInput = Readonly<{
  id: string;
  designId: string;
  names: Readonly<Pick<AvatarAuraDef,
    'nameRu' | 'nameUk' | 'nameEs' | 'namePtBr' | 'nameVi' | 'nameId' | 'nameTr' | 'namePl'>>;
  motion: NonNullable<AvatarAuraDef['motion']>;
  palette: readonly [string, string, string];
  premiumOnly?: boolean;
  proOnly?: boolean;
  material?: AvatarAuraDef['material'];
}>;

function approvedAura(input: ApprovedAuraInput): AvatarAuraDef {
  const [color, color2, color3] = input.palette;
  return {
    id: input.id,
    designId: input.designId,
    motion: input.motion,
    ...input.names,
    color,
    color2,
    color3,
    softColor: `${color}38`,
    ...(input.premiumOnly ? { premiumOnly: true } : {}),
    ...(input.proOnly ? { proOnly: true } : {}),
    ...(input.material ? { material: input.material } : {}),
  };
}

export const APPROVED_AVATAR_AURAS: AvatarAuraDef[] = [
  approvedAura({ id: PLUS_AVATAR_AURA_ID, designId: 'solar-sovereign', names: { nameRu: 'Солнечный Владыка', nameUk: 'Сонячний Володар', nameEs: 'Soberano Solar', namePtBr: 'Soberano Solar', nameVi: 'Chúa Tể Mặt Trời', nameId: 'Penguasa Surya', nameTr: 'Güneş Hükümdarı', namePl: 'Słoneczny Władca' }, motion: 'plus', palette: ['#FFFFFF', '#FCD34D', '#B45309'], premiumOnly: true }),
  approvedAura({ id: PRO_AVATAR_AURA_ID, designId: 'reality-breaker', names: { nameRu: 'Разрушитель реальности', nameUk: 'Руйнівник реальності', nameEs: 'Quebrador de Realidad', namePtBr: 'Quebrador da Realidade', nameVi: 'Kẻ Phá Vỡ Thực Tại', nameId: 'Penghancur Realitas', nameTr: 'Gerçeklik Kırıcı', namePl: 'Niszczyciel Rzeczywistości' }, motion: 'pro', palette: ['#E0F2FE', '#2563EB', '#7C3AED'], premiumOnly: true, proOnly: true, material: 'satin' }),
  approvedAura({ id: 'aura-aurora', designId: 'quiet-orbit', names: { nameRu: 'Тихая орбита', nameUk: 'Тиха орбіта', nameEs: 'Órbita Serena', namePtBr: 'Órbita Serena', nameVi: 'Quỹ Đạo Tĩnh Lặng', nameId: 'Orbit Tenang', nameTr: 'Sessiz Yörünge', namePl: 'Cicha Orbita' }, motion: 'calm', palette: ['#FFFFFF', '#C4B5FD', '#93C5FD'] }),
  approvedAura({ id: 'aura-ember', designId: 'ember-claw', names: { nameRu: 'Искристый коготь', nameUk: 'Жаркий кіготь', nameEs: 'Garra de Brasa', namePtBr: 'Garra de Brasa', nameVi: 'Móng Vuốt Than Hồng', nameId: 'Cakar Bara', nameTr: 'Kor Pençesi', namePl: 'Szpon Żaru' }, motion: 'energy', palette: ['#FDBA74', '#F97316', '#DC2626'] }),
  approvedAura({ id: 'aura-mint', designId: 'moss-current', names: { nameRu: 'Мшистый поток', nameUk: 'Моховий потік', nameEs: 'Corriente de Musgo', namePtBr: 'Corrente de Musgo', nameVi: 'Dòng Rêu', nameId: 'Arus Lumut', nameTr: 'Yosun Akıntısı', namePl: 'Mechowy Nurt' }, motion: 'nature', palette: ['#D9F99D', '#4ADE80', '#166534'] }),
  approvedAura({ id: 'aura-violet', designId: 'quantum-grid', names: { nameRu: 'Квантовая сеть', nameUk: 'Квантова мережа', nameEs: 'Red Cuántica', namePtBr: 'Rede Quântica', nameVi: 'Lưới Lượng Tử', nameId: 'Jaringan Kuantum', nameTr: 'Kuantum Ağı', namePl: 'Sieć Kwantowa' }, motion: 'tech', palette: ['#C4B5FD', '#8B5CF6', '#38BDF8'] }),
  approvedAura({ id: 'aura-coral', designId: 'coral-bloom', names: { nameRu: 'Коралловое цветение', nameUk: 'Кораловий цвіт', nameEs: 'Flor de Coral', namePtBr: 'Flor de Coral', nameVi: 'Hoa San Hô', nameId: 'Mekar Karang', nameTr: 'Mercan Çiçeği', namePl: 'Koralowy Rozkwit' }, motion: 'nature', palette: ['#FED7AA', '#FB7185', '#F97316'] }),
  approvedAura({ id: 'aura-prism', designId: 'candy-comet', names: { nameRu: 'Конфетная комета', nameUk: 'Цукеркова комета', nameEs: 'Cometa de Caramelo', namePtBr: 'Cometa de Doce', nameVi: 'Sao Chổi Kẹo', nameId: 'Komet Permen', nameTr: 'Şeker Kuyrukluyıldızı', namePl: 'Cukierkowa Kometa' }, motion: 'playful', palette: ['#F9A8D4', '#A78BFA', '#67E8F9'] }),
  approvedAura({ id: 'aura-lagoon', designId: 'soft-tide', names: { nameRu: 'Мягкий прилив', nameUk: 'М’який приплив', nameEs: 'Marea Suave', namePtBr: 'Maré Suave', nameVi: 'Thủy Triều Êm', nameId: 'Pasang Lembut', nameTr: 'Yumuşak Gelgit', namePl: 'Łagodny Przypływ' }, motion: 'calm', palette: ['#BAE6FD', '#67E8F9', '#60A5FA'] }),
  approvedAura({ id: 'aura-sunset', designId: 'nebula-gate', names: { nameRu: 'Врата туманности', nameUk: 'Брама туманності', nameEs: 'Puerta de la Nebulosa', namePtBr: 'Portal da Nebulosa', nameVi: 'Cổng Tinh Vân', nameId: 'Gerbang Nebula', nameTr: 'Bulutsu Kapısı', namePl: 'Brama Mgławicy' }, motion: 'mystic', palette: ['#60A5FA', '#8B5CF6', '#EC4899'] }),
  approvedAura({ id: 'aura-still-halo', designId: 'still-halo', names: { nameRu: 'Тихий нимб', nameUk: 'Тихий німб', nameEs: 'Halo Sereno', namePtBr: 'Halo Sereno', nameVi: 'Hào Quang Tĩnh', nameId: 'Halo Hening', nameTr: 'Durgun Hâle', namePl: 'Cicha Aureola' }, motion: 'calm', palette: ['#F8FAFC', '#CBD5E1', '#7DD3FC'] }),
  approvedAura({ id: 'aura-moonline', designId: 'moonline', names: { nameRu: 'Лунная линия', nameUk: 'Місячна лінія', nameEs: 'Línea Lunar', namePtBr: 'Linha Lunar', nameVi: 'Vệt Trăng', nameId: 'Garis Bulan', nameTr: 'Ay Çizgisi', namePl: 'Księżycowa Linia' }, motion: 'calm', palette: ['#F1F5F9', '#94A3B8', '#818CF8'] }),
  approvedAura({ id: 'aura-pearl-breath', designId: 'pearl-breath', names: { nameRu: 'Жемчужное дыхание', nameUk: 'Перлинний подих', nameEs: 'Aliento de Perla', namePtBr: 'Sopro de Pérola', nameVi: 'Hơi Thở Ngọc Trai', nameId: 'Napas Mutiara', nameTr: 'İnci Nefesi', namePl: 'Perłowy Oddech' }, motion: 'calm', palette: ['#FFF7ED', '#E2E8F0', '#A5F3FC'] }),
  approvedAura({ id: 'aura-frost-petal', designId: 'frost-petal', names: { nameRu: 'Ледяной лепесток', nameUk: 'Крижана пелюстка', nameEs: 'Pétalo Helado', namePtBr: 'Pétala de Gelo', nameVi: 'Cánh Hoa Băng', nameId: 'Kelopak Embun Beku', nameTr: 'Ayaz Taç Yaprağı', namePl: 'Lodowy Płatek' }, motion: 'nature', palette: ['#ECFEFF', '#7DD3FC', '#A5B4FC'] }),
  approvedAura({ id: 'aura-storm-vine', designId: 'storm-vine', names: { nameRu: 'Грозовая лоза', nameUk: 'Грозова лоза', nameEs: 'Enredadera Tormentosa', namePtBr: 'Vinha da Tempestade', nameVi: 'Dây Leo Bão Tố', nameId: 'Sulur Badai', nameTr: 'Fırtına Sarmaşığı', namePl: 'Burzowe Pnącze' }, motion: 'nature', palette: ['#86EFAC', '#22D3EE', '#2563EB'] }),
  approvedAura({ id: 'aura-sunflower-pulse', designId: 'sunflower-pulse', names: { nameRu: 'Пульс подсолнуха', nameUk: 'Пульс соняшника', nameEs: 'Pulso de Girasol', namePtBr: 'Pulso de Girassol', nameVi: 'Nhịp Hướng Dương', nameId: 'Denyut Bunga Matahari', nameTr: 'Ayçiçeği Nabzı', namePl: 'Puls Słonecznika' }, motion: 'nature', palette: ['#FEF08A', '#F59E0B', '#65A30D'] }),
  approvedAura({ id: 'aura-neon-circuit', designId: 'neon-circuit', names: { nameRu: 'Неоновая цепь', nameUk: 'Неоновий контур', nameEs: 'Circuito de Neón', namePtBr: 'Circuito de Néon', nameVi: 'Mạch Neon', nameId: 'Sirkuit Neon', nameTr: 'Neon Devresi', namePl: 'Neonowy Obwód' }, motion: 'tech', palette: ['#22D3EE', '#3B82F6', '#A855F7'] }),
  approvedAura({ id: 'aura-data-ring', designId: 'data-ring', names: { nameRu: 'Кольцо данных', nameUk: 'Кільце даних', nameEs: 'Anillo de Datos', namePtBr: 'Anel de Dados', nameVi: 'Vòng Dữ Liệu', nameId: 'Cincin Data', nameTr: 'Veri Halkası', namePl: 'Pierścień Danych' }, motion: 'tech', palette: ['#93C5FD', '#06B6D4', '#1D4ED8'] }),
  approvedAura({ id: 'aura-plasma-gear', designId: 'plasma-gear', names: { nameRu: 'Плазменная шестерня', nameUk: 'Плазмова шестерня', nameEs: 'Engranaje de Plasma', namePtBr: 'Engrenagem de Plasma', nameVi: 'Bánh Răng Plasma', nameId: 'Roda Gigi Plasma', nameTr: 'Plazma Dişlisi', namePl: 'Plazmowe Koło' }, motion: 'tech', palette: ['#67E8F9', '#2563EB', '#F472B6'] }),
  approvedAura({ id: 'aura-holo-scan', designId: 'holo-scan', names: { nameRu: 'Голо-скан', nameUk: 'Голо-скан', nameEs: 'Escaneo Holográfico', namePtBr: 'Varredura Holográfica', nameVi: 'Quét Ảnh Ba Chiều', nameId: 'Pindai Holografik', nameTr: 'Holografik Tarama', namePl: 'Skan Holograficzny' }, motion: 'tech', palette: ['#A5F3FC', '#2DD4BF', '#818CF8'] }),
  approvedAura({ id: 'aura-lunar-sigil', designId: 'lunar-sigil', names: { nameRu: 'Лунный сигил', nameUk: 'Місячний сигіл', nameEs: 'Sigilo Lunar', namePtBr: 'Sigilo Lunar', nameVi: 'Ấn Nguyệt', nameId: 'Segel Bulan', nameTr: 'Ay Mührü', namePl: 'Księżycowy Sigil' }, motion: 'mystic', palette: ['#E9D5FF', '#818CF8', '#312E81'] }),
  approvedAura({ id: 'aura-solar-eclipse', designId: 'solar-eclipse', names: { nameRu: 'Солнечное затмение', nameUk: 'Сонячне затемнення', nameEs: 'Eclipse Solar', namePtBr: 'Eclipse Solar', nameVi: 'Nhật Thực', nameId: 'Gerhana Matahari', nameTr: 'Güneş Tutulması', namePl: 'Zaćmienie Słońca' }, motion: 'mystic', palette: ['#FEF3C7', '#F59E0B', '#451A03'] }),
  approvedAura({ id: 'aura-star-choir', designId: 'star-choir', names: { nameRu: 'Звёздный хор', nameUk: 'Зоряний хор', nameEs: 'Coro Estelar', namePtBr: 'Coro Estelar', nameVi: 'Hợp Xướng Sao', nameId: 'Paduan Suara Bintang', nameTr: 'Yıldız Korosu', namePl: 'Gwiezdny Chór' }, motion: 'mystic', palette: ['#FFFFFF', '#A5B4FC', '#F0ABFC'] }),
  approvedAura({ id: 'aura-astral-eyes', designId: 'astral-eyes', names: { nameRu: 'Астральные глаза', nameUk: 'Астральні очі', nameEs: 'Ojos Astrales', namePtBr: 'Olhos Astrais', nameVi: 'Đôi Mắt Tinh Tú', nameId: 'Mata Astral', nameTr: 'Astral Gözler', namePl: 'Astralne Oczy' }, motion: 'mystic', palette: ['#C4B5FD', '#22D3EE', '#6366F1'] }),
  approvedAura({ id: 'aura-magma-rift', designId: 'magma-rift', names: { nameRu: 'Магмовый разлом', nameUk: 'Магмовий розлом', nameEs: 'Falla de Magma', namePtBr: 'Fenda de Magma', nameVi: 'Khe Nứt Dung Nham', nameId: 'Retakan Magma', nameTr: 'Magma Yarığı', namePl: 'Magmowa Szczelina' }, motion: 'energy', palette: ['#FDE68A', '#EF4444', '#7F1D1D'] }),
  approvedAura({ id: 'aura-thunder-fang', designId: 'thunder-fang', names: { nameRu: 'Громовой клык', nameUk: 'Громове ікло', nameEs: 'Colmillo del Trueno', namePtBr: 'Presa do Trovão', nameVi: 'Nanh Sấm', nameId: 'Taring Petir', nameTr: 'Gök Gürültüsü Dişi', namePl: 'Piorunowy Kieł' }, motion: 'energy', palette: ['#E0F2FE', '#38BDF8', '#4F46E5'] }),
  approvedAura({ id: 'aura-inferno-crown', designId: 'inferno-crown', names: { nameRu: 'Адская корона', nameUk: 'Пекельна корона', nameEs: 'Corona Infernal', namePtBr: 'Coroa Infernal', nameVi: 'Vương Miện Hỏa Ngục', nameId: 'Mahkota Inferno', nameTr: 'Cehennem Tacı', namePl: 'Piekielna Korona' }, motion: 'energy', palette: ['#FEF08A', '#FB923C', '#BE123C'] }),
  approvedAura({ id: 'aura-acid-surge', designId: 'acid-surge', names: { nameRu: 'Кислотный всплеск', nameUk: 'Кислотний сплеск', nameEs: 'Oleada Ácida', namePtBr: 'Onda Ácida', nameVi: 'Trào Axit', nameId: 'Gelombang Asam', nameTr: 'Asit Dalgası', namePl: 'Kwasowa Fala' }, motion: 'energy', palette: ['#D9F99D', '#84CC16', '#0F766E'] }),
  approvedAura({ id: 'aura-bubble-pop', designId: 'bubble-pop', names: { nameRu: 'Взрыв пузырьков', nameUk: 'Вибух бульбашок', nameEs: 'Estallido de Burbujas', namePtBr: 'Explosão de Bolhas', nameVi: 'Bong Bóng Nổ', nameId: 'Letupan Gelembung', nameTr: 'Baloncuk Patlaması', namePl: 'Pękające Bańki' }, motion: 'playful', palette: ['#BAE6FD', '#F0ABFC', '#FDE68A'] }),
  approvedAura({ id: 'aura-pixel-party', designId: 'pixel-party', names: { nameRu: 'Пиксельная вечеринка', nameUk: 'Піксельна вечірка', nameEs: 'Fiesta de Píxeles', namePtBr: 'Festa de Pixels', nameVi: 'Tiệc Pixel', nameId: 'Pesta Piksel', nameTr: 'Piksel Partisi', namePl: 'Pikselowa Impreza' }, motion: 'playful', palette: ['#22D3EE', '#F472B6', '#FACC15'] }),
  approvedAura({ id: 'aura-rainbow-loop', designId: 'rainbow-loop', names: { nameRu: 'Радужная петля', nameUk: 'Веселкова петля', nameEs: 'Bucle Arcoíris', namePtBr: 'Laço Arco-Íris', nameVi: 'Vòng Cầu Vồng', nameId: 'Lingkar Pelangi', nameTr: 'Gökkuşağı Döngüsü', namePl: 'Tęczowa Pętla' }, motion: 'playful', palette: ['#FB7185', '#FACC15', '#22D3EE'] }),
  approvedAura({ id: 'aura-gilded-laurel', designId: 'gilded-laurel', names: { nameRu: 'Позолоченный лавр', nameUk: 'Позолочений лавр', nameEs: 'Laurel Dorado', namePtBr: 'Louro Dourado', nameVi: 'Vòng Nguyệt Quế Mạ Vàng', nameId: 'Laurel Berlapis Emas', nameTr: 'Yaldızlı Defne', namePl: 'Złocony Laur' }, motion: 'luxury', palette: ['#FFF7CC', '#D4AF37', '#92400E'] }),
  approvedAura({ id: 'aura-diamond-orbit', designId: 'diamond-orbit', names: { nameRu: 'Алмазная орбита', nameUk: 'Діамантова орбіта', nameEs: 'Órbita de Diamante', namePtBr: 'Órbita de Diamante', nameVi: 'Quỹ Đạo Kim Cương', nameId: 'Orbit Berlian', nameTr: 'Elmas Yörüngesi', namePl: 'Diamentowa Orbita' }, motion: 'luxury', palette: ['#FFFFFF', '#BAE6FD', '#A5B4FC'] }),
  approvedAura({ id: 'aura-velvet-gold', designId: 'velvet-gold', names: { nameRu: 'Бархатное золото', nameUk: 'Оксамитове золото', nameEs: 'Oro de Terciopelo', namePtBr: 'Ouro de Veludo', nameVi: 'Vàng Nhung', nameId: 'Emas Beludru', nameTr: 'Kadife Altın', namePl: 'Aksamitne Złoto' }, motion: 'luxury', palette: ['#FDE68A', '#9F1239', '#4C0519'] }),
  approvedAura({ id: 'aura-regal-wings', designId: 'regal-wings', names: { nameRu: 'Королевские крылья', nameUk: 'Королівські крила', nameEs: 'Alas Reales', namePtBr: 'Asas Reais', nameVi: 'Đôi Cánh Hoàng Gia', nameId: 'Sayap Kerajaan', nameTr: 'Kraliyet Kanatları', namePl: 'Królewskie Skrzydła' }, motion: 'luxury', palette: ['#FFFBEB', '#F59E0B', '#A16207'] }),
  approvedAura({ id: 'aura-void-thorn', designId: 'void-thorn', names: { nameRu: 'Шип пустоты', nameUk: 'Шип порожнечі', nameEs: 'Espina del Vacío', namePtBr: 'Espinho do Vazio', nameVi: 'Gai Hư Không', nameId: 'Duri Kekosongan', nameTr: 'Boşluk Dikeni', namePl: 'Cierń Pustki' }, motion: 'dark', palette: ['#A78BFA', '#4C1D95', '#09090B'] }),
  approvedAura({ id: 'aura-blood-moon', designId: 'blood-moon', names: { nameRu: 'Кровавая луна', nameUk: 'Кривавий місяць', nameEs: 'Luna de Sangre', namePtBr: 'Lua de Sangue', nameVi: 'Trăng Máu', nameId: 'Bulan Darah', nameTr: 'Kanlı Ay', namePl: 'Krwawy Księżyc' }, motion: 'dark', palette: ['#FCA5A5', '#B91C1C', '#1C1917'] }),
  approvedAura({ id: 'aura-obsidian-smoke', designId: 'obsidian-smoke', names: { nameRu: 'Обсидиановый дым', nameUk: 'Обсидіановий дим', nameEs: 'Humo de Obsidiana', namePtBr: 'Fumaça de Obsidiana', nameVi: 'Khói Hắc Diện Thạch', nameId: 'Asap Obsidian', nameTr: 'Obsidyen Dumanı', namePl: 'Obsydianowy Dym' }, motion: 'dark', palette: ['#E2E8F0', '#475569', '#020617'] }),
  approvedAura({ id: 'aura-phantom-chain', designId: 'phantom-chain', names: { nameRu: 'Призрачная цепь', nameUk: 'Примарний ланцюг', nameEs: 'Cadena Fantasma', namePtBr: 'Corrente Fantasma', nameVi: 'Xích Ma', nameId: 'Rantai Hantu', nameTr: 'Hayalet Zinciri', namePl: 'Widmowy Łańcuch' }, motion: 'dark', palette: ['#D8B4FE', '#6D28D9', '#111827'] }),
];

export const AVATAR_AURAS: AvatarAuraDef[] = [
  ...APPROVED_AVATAR_AURAS,
  { id: BETA_NIMBUS_AURA_ID, nameRu: 'Нимб', nameUk: 'Німб', nameEs: 'Nimbo', namePtBr: 'Nimbo', nameVi: 'Hào quang', nameId: 'Nimbus', nameTr: 'Hâle', namePl: 'Nimb', color: '#38BDF8', color2: '#7DD3FC', color3: '#E0F2FE', softColor: 'rgba(56,189,248,0.30)', rewardOnly: true, effect: 'nimbus' },
  { id: SEASON_AVATAR_AURA_IDS[0], nameRu: 'Пульс I', nameUk: 'Пульс I', nameEs: 'Pulso I', namePtBr: 'Pulso I', nameVi: 'Nhịp I', nameId: 'Denyut I', nameTr: 'Nabız I', namePl: 'Puls I', color: '#22D3EE', color2: '#67E8F9', color3: '#0EA5E9', softColor: 'rgba(34,211,238,0.24)', rewardOnly: true },
  { id: SEASON_AVATAR_AURA_IDS[1], nameRu: 'Поток II', nameUk: 'Потік II', nameEs: 'Flujo II', namePtBr: 'Fluxo II', nameVi: 'Dòng chảy II', nameId: 'Arus II', nameTr: 'Akış II', namePl: 'Przepływ II', color: '#6366F1', color2: '#22D3EE', color3: '#4338CA', softColor: 'rgba(99,102,241,0.24)', rewardOnly: true },
  { id: SEASON_AVATAR_AURA_IDS[2], nameRu: 'Спектр III', nameUk: 'Спектр III', nameEs: 'Espectro III', namePtBr: 'Espectro III', nameVi: 'Quang phổ III', nameId: 'Spektrum III', nameTr: 'Spektrum III', namePl: 'Spektrum III', color: '#8B5CF6', color2: '#22D3EE', color3: '#6D28D9', softColor: 'rgba(139,92,246,0.24)', rewardOnly: true },
  { id: SEASON_AVATAR_AURA_IDS[3], nameRu: 'Импульс IV', nameUk: 'Імпульс IV', nameEs: 'Impulso IV', namePtBr: 'Impulso IV', nameVi: 'Xung lực IV', nameId: 'Impuls IV', nameTr: 'İtki IV', namePl: 'Impuls IV', color: '#D946EF', color2: '#22D3EE', color3: '#7C3AED', softColor: 'rgba(217,70,239,0.24)', rewardOnly: true },
  { id: SEASON_AVATAR_AURA_IDS[4], nameRu: 'Секретная', nameUk: 'Секретна', nameEs: 'Secreta', namePtBr: 'Secreta', nameVi: 'Bí mật', nameId: 'Rahasia', nameTr: 'Gizli', namePl: 'Sekretna', color: '#C026D3', color2: '#F0ABFC', color3: '#7E22CE', softColor: 'rgba(192,38,211,0.26)', rewardOnly: true },
];

const LEGACY_AURA_ID_ALIASES: Readonly<Record<string, string>> = {
  [LEGACY_PREMIUM_AVATAR_AURA_ID]: PLUS_AVATAR_AURA_ID,
  [LEGACY_VIP_AVATAR_AURA_ID]: PLUS_AVATAR_AURA_ID,
};

export function getAvatarAuraById(id?: string | null): AvatarAuraDef | undefined {
  if (!id) return undefined;
  const canonicalId = LEGACY_AURA_ID_ALIASES[id] ?? id;
  return AVATAR_AURAS.find(aura => aura.id === canonicalId);
}

export function normalizeAvatarAuraId(id?: string | null): string | undefined {
  const trimmed = typeof id === 'string' ? id.trim() : '';
  if (!trimmed) return undefined;
  if (trimmed === NO_AVATAR_AURA_ID) return NO_AVATAR_AURA_ID;
  return getAvatarAuraById(trimmed)?.id;
}

export function isPremiumAvatarAura(id?: string | null): boolean {
  return normalizeAvatarAuraId(id) === PLUS_AVATAR_AURA_ID;
}

export function isVipAvatarAura(id?: string | null): boolean {
  return normalizeAvatarAuraId(id) === PLUS_AVATAR_AURA_ID;
}

/** true, если аура только наградная (сезон/пропуск Арены) и не продаётся за осколки. */
export function isRewardOnlyAvatarAura(id?: string | null): boolean {
  return getAvatarAuraById(id)?.rewardOnly === true;
}

export function isAvatarAuraUnlockedByLevel(aura: AvatarAuraDef, level: number): boolean {
  return aura.unlockLevel !== undefined && level >= aura.unlockLevel;
}

export function getEffectiveAvatarAuraId(
  id?: string | null,
  isPremium?: boolean,
  isVip?: boolean,
  isPro?: boolean,
): string | undefined {
  const aura = normalizeAvatarAuraId(id);
  if (aura === NO_AVATAR_AURA_ID) return undefined;
  if (aura === PLUS_AVATAR_AURA_ID) return isPremium || isVip ? PLUS_AVATAR_AURA_ID : undefined;
  // Older/public profile contracts carry only isPremium. An explicitly stored Pro
  // selection is therefore renderable for premium profiles, while local callers
  // pass isPro=false to keep selection eligibility lifetime-only.
  if (aura === PRO_AVATAR_AURA_ID) return (isPro ?? isPremium) ? PRO_AVATAR_AURA_ID : undefined;
  if (aura) return aura;
  if (isPro) return PRO_AVATAR_AURA_ID;
  return isPremium || isVip ? PLUS_AVATAR_AURA_ID : undefined;
}
