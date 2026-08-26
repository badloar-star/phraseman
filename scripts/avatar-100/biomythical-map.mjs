const POSES = {
  quadruped: {
    dark: 'grounded walking three-quarter pose facing left with all four paws visible',
    light: 'distinct seated or poised three-quarter pose facing right with all four paws visible',
  },
  marine: {
    dark: 'compact swimming three-quarter pose facing left with every fin and tail tip visible',
    light: 'distinct rising three-quarter pose facing right with every fin and tail tip visible',
  },
  bird: {
    dark: 'poised three-quarter pose facing left with two legs and both connected wings readable',
    light: 'distinct stepping or wing-lift three-quarter pose facing right with two legs and both wings readable',
  },
  serpent: {
    dark: 'raised three-quarter pose facing left with one simple open coil and exactly one visible tail tip',
    light: 'distinct raised three-quarter pose facing right with one S-coil and exactly one visible tail tip',
  },
  insect: {
    dark: 'grounded three-quarter pose facing left with the exact leg count and both wings readable',
    light: 'distinct raised three-quarter pose facing right with the exact leg count and both wings readable',
  },
  cephalopod: {
    dark: 'compact three-quarter pose facing left with every arm separated and readable',
    light: 'distinct rising three-quarter pose facing right with every arm separated and readable',
  },
  radial: {
    dark: 'slightly tilted three-quarter pose with every radial limb separated and readable',
    light: 'distinct opposite tilt with every radial limb separated and readable',
  },
  wingedQuadruped: {
    dark: 'grounded three-quarter pose facing left with four paws and two folded wings visible',
    light: 'distinct seated three-quarter pose facing right with four paws and two partly opened wings visible',
  },
};

function creature(id, price, name, labelRu, baseAnimal, anatomy, signature, poseSet, avoid) {
  const poses = POSES[poseSet];
  if (!poses) throw new Error(`Unknown pose set ${poseSet} for ${id}`);
  return Object.freeze({
    id,
    price,
    name,
    labelRu,
    baseAnimal,
    anatomy,
    signature,
    darkPose: poses.dark,
    lightPose: poses.light,
    avoid,
  });
}

export const BIOMYTHICAL_AVATARS = Object.freeze([
  creature(73, 70, 'Moss-Eared Pandafox', 'Дружелюбный исследователь', 'red-panda-like quadruped', 'exactly four legs, four paws, one head, two leaf-shaped ears, and one tail', 'leaf-shaped ears and one mossy tail fan grown from fur', 'quadruped', 'ordinary red panda, detached leaves, extra tail, wings'),
  creature(74, 70, 'Bubblefin Cloud Dolphin', 'Свободный говорящий', 'dolphin-like marine familiar', 'one streamlined body, two pectoral fins, one dorsal fin, and one complete fluked tail', 'soft air-sail fins grown continuously from the torso', 'marine', 'ordinary dolphin, floating bubbles, extra fin, split torso'),
  creature(75, 70, 'Prismtail Storybird', 'Выразительный рассказчик', 'compact storybird', 'exactly two legs, two connected wings, one head, and one tail fan', 'teal and coral glass-petal tail with no full-spectrum color', 'bird', 'ordinary peacock, rainbow, loose feathers, extra wing'),
  creature(76, 70, 'Petalplate Pangopup', 'Последовательный мастер', 'pangolin-like familiar', 'exactly four legs, four paws, one head, and one continuous tail', 'overlapping flower-petal scales grown from the hide', 'quadruped', 'ordinary pangolin, detached petals, extra tail, metal armor'),
  creature(77, 70, 'Velvet Orchid Lynxlet', 'Чуткий слушатель', 'small lynx-like quadruped', 'exactly four legs, four paws, one head, two ears, and one short tail', 'velvet orchid-petal ear mantles grown from cartilage', 'quadruped', 'standalone flower, ordinary lynx, extra ears, detached petals'),
  creature(78, 70, 'Lanternbelly Firemarten', 'Искра мотивации', 'marten-like familiar', 'exactly four legs, four paws, one head, and one long tail', 'embedded amber lantern spots beneath the chest fur', 'quadruped', 'ordinary marten, floating light, insect wings, extra tail'),
  creature(79, 70, 'Moonmane Wolfcat', 'Самостоятельный ученик', 'compact feline-canine quadruped', 'exactly four legs, four paws, one head, two ears, and one tail', 'single crescent-shaped moon mane grown from neck fur', 'quadruped', 'ordinary wolf, ordinary cat, detached crescent, extra tail'),
  creature(80, 70, 'Coralhorn Tide-Narwhal', 'Мягкий навигатор', 'rounded narwhal-like sea familiar', 'one body, two pectoral fins, one dorsal ridge, one fluked tail, and one short horn', 'short organic coral horn and soft petal fins', 'marine', 'ordinary narwhal, detached coral, extra horn, legs'),
  creature(81, 70, 'Emberpaw Tigerling', 'Смелый практик', 'playful tiger-like quadruped', 'exactly four legs, four paws, one head, two ears, and one tail', 'restrained ember rosettes embedded in fur', 'quadruped', 'ordinary tiger cub, open flame, floating sparks, extra tail'),
  creature(82, 70, 'Rune-Back Honeybadger', 'Надёжный партнёр', 'sturdy badger-like quadruped', 'exactly four legs, four paws, one head, and one tail', 'smooth stone-like dorsal runes embedded in hide', 'quadruped', 'ordinary badger, floating runes, armor, extra paw'),

  creature(83, 100, 'Glasswhisker Snowcat', 'Точный охотник за смыслом', 'snowcat-like quadruped', 'exactly four legs, four paws, one feline head, two ears, one tail, and paired whisker fins', 'transparent mineral whisker fins grown from the muzzle', 'quadruped', 'ordinary snow leopard, detached crystal, extra whiskers, extra tail'),
  creature(84, 100, 'Arrowcrest Sailfin', 'Быстрый прорыв', 'marlin-like marine hunter', 'one streamlined body, two pectoral fins, one arrow bill, one dorsal sail, and one complete tail', 'compact arrow-shaped dorsal sail grown from the spine', 'marine', 'ordinary marlin, weapon, detached sail, extra bill'),
  creature(85, 100, 'Silkhood Moon Serpent', 'Собранный стратег', 'single-bodied serpent', 'one snake head, one continuous body, one natural hood, one simple coil, and exactly one tail tip', 'soft woven-looking silk hood formed by cervical ribs', 'serpent', 'ordinary cobra, detached collar, forked body, second tail'),
  creature(86, 100, 'Sunfeather Echo Parrot', 'Яркий коммуникатор', 'parrot-like bird', 'exactly two legs, two connected wings, one beak, and one tail', 'embedded acoustic markings across sun-colored feathers', 'bird', 'ordinary macaw, floating sound rings, rainbow, extra wing'),
  creature(87, 100, 'Deepbell Orcafin', 'Глубокий слушатель', 'orca-like marine creature', 'one body, two broad pectoral fins, one dorsal fin, and one fluked tail', 'broad manta-like listening fins attached to the torso', 'marine', 'ordinary orca, detached fins, extra tail, scenery'),
  creature(88, 100, 'Branchcrest Forest Hart', 'Уверенный маршрут', 'deer-like quadruped', 'exactly four legs, four hooves, one head, one tail, and a paired skull-grown antler structure', 'living-wood antlers grown directly from the skull', 'quadruped', 'ordinary deer, crown, loose branches, extra antler'),
  creature(89, 100, 'Ribbon-Tail Lemurfox', 'Гибкий переключатель', 'lemur-like quadruped', 'exactly four legs, four paws, one head, and one continuous ribbon tail', 'one flexible ribbon-shaped tail with a clean enclosed silhouette', 'quadruped', 'ordinary lemur, white cutout triangle, looped tail, second tail'),
  creature(90, 100, 'Five-Ray Tidekeeper', 'Звезда прогресса', 'star-shaped marine animal', 'one face-free central body and exactly five articulated organic rays', 'five flexible shell-edged rays and an embedded central tide core', 'radial', 'ordinary starfish, face, extra ray, detached shell'),
  creature(91, 100, 'Coralwing Dawn Heron', 'Изящный ритм', 'heron-like bird', 'exactly two long legs, two connected wings, one beak, one neck, and one tail', 'coral-petal wing edges grown from the feather shafts', 'bird', 'pink long-legged wading bird, ordinary heron, detached coral, extra leg'),
  creature(92, 100, 'Quartz-Ear Shadow Lynx', 'Острый слух', 'lynx-like quadruped', 'exactly four legs, four paws, one head, two ears, and one short tail', 'quartz ear tufts grown directly from cartilage', 'quadruped', 'ordinary lynx, detached crystals, extra ear, armor'),

  creature(93, 150, 'Abyssal Lantern Manta', 'Свет в глубине', 'manta-like marine creature', 'one diamond body, two continuous wing fins, one cephalic lobe pair, and one tail', 'one embedded chest lantern visible through the hide', 'marine', 'ordinary manta, detached lamp, extra tail, underwater scenery'),
  creature(94, 150, 'Frostshell Muskox', 'Холодная выдержка', 'muskox-like quadruped', 'exactly four legs, four hooves, one head, two skull-grown horns, and one tail', 'organic frost-shell shoulder plates grown beneath the fur', 'quadruped', 'ordinary muskox, manufactured armor, ice scenery, extra horn'),
  creature(95, 150, 'Basalt-Tail Monitor', 'Несокрушимый прогресс', 'monitor-lizard-like quadruped', 'exactly four legs, four feet, one head, and one correct heavy tail', 'basalt dorsal scales and a single load-bearing stone-textured tail', 'quadruped', 'ordinary monitor lizard, broken tail, second tail, detached rock'),
  creature(96, 150, 'Leafveil Foxmoth', 'Тонкая интуиция', 'fox-like quadruped', 'exactly four legs, four paws, one head, two leaf-moth ear veils, and one tail', 'paired leaf-moth ear veils grown from the ears', 'quadruped', 'ordinary fox, detached leaves, full insect wings, extra tail'),
  creature(97, 150, 'Skycrest Roclet', 'Высокий полёт', 'raptor-like mythical bird', 'exactly two legs, two connected wings, one head, one beak, and one tail fan', 'high aerodynamic crest grown from skull feathers', 'bird', 'ordinary eagle, extra wing, loose feather, crown'),
  creature(98, 150, 'Moonbark Elkbeast', 'Сила спокойствия', 'elk-like quadruped', 'exactly four legs, four hooves, one head, paired skull-grown antlers, and one tail', 'calm bark-textured mane and moonlit antler grain', 'quadruped', 'ordinary elk, tree scenery, detached branch, extra leg'),
  creature(99, 150, 'Inkstripe Okaphi', 'Редкий почерк', 'okapi-like quadruped', 'exactly four legs, four hooves, one head, two ears, and one tail', 'calligraphic ink stripes embedded in hide', 'quadruped', 'ordinary okapi, written text, floating ink, extra stripe object'),
  creature(100, 150, 'Cloud-Ear Fennecrest', 'Лёгкость понимания', 'fennec-like quadruped', 'exactly four legs, four paws, one head, two large ear fins, and one tail', 'soft cloud-shaped ear fins grown from cartilage', 'quadruped', 'ordinary fennec, detached cloud, extra ear, wings'),
  creature(101, 150, 'Starglass Owlmoth', 'Ночная ясность', 'coherent owl-moth creature', 'exactly two legs, two connected moth wings, one owl-like head, and one compact body', 'starglass eyes and patterned moth wings connected to one torso', 'bird', 'ordinary owl, ordinary moth, extra wing, detached antenna'),
  creature(102, 150, 'Pearlshell Tidebeast', 'Скрытая жемчужина', 'compact hermit-like animal', 'one soft body, one single shell, two claws, six walking legs, two eyes, and no exposed extra pearl', 'luminous pearl chamber grown inside one translucent shell', 'insect', 'ordinary hermit crab, detached pearl, extra shell, wrong leg count'),

  creature(103, 300, 'Titan Reefshark', 'Легенда глубины', 'whale-shark-like marine beast', 'one massive body, two pectoral fins, two reef-grown dorsal fins, and one complete tail', 'broad living-reef dorsal fins integrated into hide', 'marine', 'ordinary whale shark, detached reef, extra fin, underwater scenery'),
  creature(104, 300, 'Solar-Mane Moonlion', 'Король уверенности', 'lion-like noble quadruped', 'exactly four legs, four paws, one feline head, one anatomical mane, and one tail', 'one mineral sun mane grown continuously from neck fur', 'quadruped', 'ordinary lion, crown, detached rays, extra tail'),
  creature(105, 300, 'Paradise Sailwing', 'Райская свобода', 'bird-of-paradise-like noble bird', 'exactly two legs, two connected sail wings, one head, one beak, and one tail fan', 'two large connected sail wings with a clean paradise pattern', 'bird', 'ordinary bird of paradise, loose feathers, extra wing, rainbow'),
  creature(106, 300, 'Golden River Mantaray', 'Золотой поток', 'manta-like noble marine beast', 'one body, two long connected ribbon fins, one cephalic lobe pair, and one tail', 'gold-veined ribbon fins grown continuously from the body', 'marine', 'ordinary manta, detached ribbon, extra tail, scenery'),
  creature(107, 300, 'Moonplume Snow Owlcat', 'Снежное озарение', 'coherent owl-feline winged quadruped', 'exactly four feline legs, four paws, two folded wings, one owl-feline head, and one tail', 'moon-white plumage mantle connected to a snowcat body', 'wingedQuadruped', 'ordinary owl, ordinary cat, extra wing, missing paw'),
  creature(108, 300, 'Silent Thorn Panther', 'Тихая решимость', 'panther-like noble quadruped', 'exactly four legs, four paws, one head, one tail, and one organic shoulder mantle', 'restrained thorn-fur mantle grown from shoulder hair', 'quadruped', 'ordinary panther, detached thorns, armor, extra tail'),
  creature(109, 300, 'Needlebeak Storm Kingfisher', 'Мгновенный фокус', 'kingfisher-like hunter bird', 'exactly two legs, two connected wings, one spear-shaped natural beak, and one tail', 'needle beak and storm-pattern feathers embedded in the body', 'bird', 'ordinary kingfisher, weapon, lightning bolt, extra wing'),
  creature(110, 300, 'Elder Rune Tortoise', 'Путь мудрости', 'tortoise-like noble beast', 'exactly four legs, four feet, one head, one single shell, and one tail', 'ancient runes embedded inside one coherent shell', 'quadruped', 'ordinary tortoise, second shell, floating runes, machinery'),
  creature(111, 300, 'Mirror-Ear Sandfox', 'Лисья находчивость', 'fox-like noble quadruped', 'exactly four legs, four paws, one head, two reflective ear fins, and one tail', 'paired reflective mineral ear fins grown from cartilage', 'quadruped', 'ordinary fox, second tail, detached mirror, extra ear'),
  creature(112, 300, 'Skyglass Crown Crane', 'Высшее равновесие', 'crane-like noble bird', 'exactly two long legs, two connected wings, one neck, one beak, and one tail', 'coherent skyglass feather wings and a skull-grown feather crest', 'bird', 'ordinary crane, crown object, extra leg, loose glass shard'),

  creature(113, 500, 'Voidglass Krakenling', 'Спектральный интеллект', 'octopus-derived mythic apex', 'one mantle head, two eyes, and exactly eight separately readable arms', 'voidglass skin with body-bound spectral intelligence channels', 'cephalopod', 'ordinary octopus, ninth arm, detached glass, rainbow'),
  creature(114, 500, 'Needleblade Orchid Mantis', 'Идеальная точность', 'mantis-derived mythic hunter', 'one insect body, exactly six legs including two raptorial forelegs, two connected wings, and one head', 'flower-grown natural armor and needle-shaped foreleg edges', 'insect', 'ordinary mantis, weapon object, wrong leg count, detached orchid'),
  creature(115, 500, 'Horizon Sailwing Raptor', 'Горизонт свободы', 'predatory sailwing bird', 'exactly two legs, two enormous connected wings, one raptor head, and one tail fan', 'horizon-sail flight feathers connected into two coherent wings', 'bird', 'ordinary eagle, extra wing, detached sail, scenery'),
  creature(116, 500, 'Coralflare Leviathan', 'Живое сияние', 'fish-derived mythic apex', 'one massive fish body, one jaw, paired pectoral fins, one dorsal fin, and one complete tail', 'body-bound coral light grown through deep scales', 'marine', 'ordinary fish, detached coral, extra jaw, rainbow'),
  creature(117, 500, 'Ivory Star-Peacock Beast', 'Аура величия', 'heavy mythical bird', 'exactly two legs, two connected wings, one head, and one coherent star-fan tail', 'ivory star-shaped tail fan with restrained gold and indigo', 'bird', 'ordinary peacock, rainbow, detached eye feathers, extra wing'),
  creature(118, 500, 'Frostmane Direcat', 'Северная воля', 'arctic feline mythic apex', 'exactly four powerful legs, four paws, one feline head, one frost-grown mane, and one tail', 'dense frost mane and body-bound ice ridges grown from fur', 'quadruped', 'ordinary wolf, ordinary cat, detached ice, extra tail'),
  creature(119, 500, 'Oracle Mothlion', 'Императорское видение', 'coherent moth-feline mythic predator', 'exactly four feline legs, four paws, two mantle wings, one feline head, two antennae, and one tail', 'oracle eye patterns embedded in two connected mantle wings', 'wingedQuadruped', 'ordinary lion, ordinary moth, extra wing, floating eye'),
  creature(120, 500, 'Tideglass Dragon-Slug', 'Совершенная адаптация', 'sea-slug-derived mythic apex', 'one continuous soft body, one head, paired sensory horns, paired body fins, and one tapering tail', 'defensive tideglass fins grown from one adaptive body', 'marine', 'ordinary sea slug, generic dragon, detached glass, legs'),
  creature(121, 500, 'Ancestral Fang Pangor', 'Древнее чутьё', 'ancient pangolin-sabertooth quadruped', 'exactly four legs, four paws, one mammalian head, two integrated saber teeth, plated back, and one tail', 'ancestral sensing plates and two skull-rooted saber teeth', 'quadruped', 'horn-nosed antelope, ordinary pangolin, ordinary tiger, extra fang'),
  creature(122, 500, 'Cometfin Razor Ray', 'Мифическая скорость', 'ray-derived mythic hunter', 'one flattened body, two connected wing fins, one head, and one complete tail', 'narrow body-bound comet fin with no detached trail', 'marine', 'ordinary ray, detached comet, extra tail, scenery'),

  creature(123, 1000, 'Cathedral Whale', 'Песня вершины', 'whale-derived primordial super-being', 'one colossal body, two pectoral fins, one dorsal ridge, one head, and one fluked tail', 'body-grown resonance ribs and one embedded white sound core', 'marine', 'ordinary whale, building, detached sound rings, rainbow'),
  creature(124, 1000, 'Solar Crown Behemoth', 'Абсолютная сила', 'unique four-legged primordial titan', 'exactly four load-bearing legs, four feet, one plated skull, one lion-like chest, and one heavy tail', 'skull-grown solar plates and body-bound white-gold energy seams', 'quadruped', 'ordinary tiger, ordinary lion, generic dragon, crown object'),
  creature(125, 1000, 'Voidfeather Sky Leviathan', 'Бесконечный полёт', 'albatross-derived primordial sky being', 'one long coherent body, exactly two immense connected wings, two legs, one head, and one tail fan', 'voidfeather wings with restrained body-bound starlight channels', 'bird', 'ordinary albatross, generic dragon, extra wing, detached stars'),
]);
