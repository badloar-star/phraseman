import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from './theme';

export type LeagueGuardianAsset = {
  id: number;
  fileName: string;
  source: ImageSourcePropType;
  dallePrompt: string;
};

export type LeagueGuardianThemeAsset = {
  themeMode: ThemeMode;
  leagueId: number;
  fileName: string;
  source: ImageSourcePropType;
  dallePrompt: string;
};

export type LeagueGuardianConcept = {
  leagueId: number;
  code: string;
  title: string;
  severity: string;
  prompt: string;
};

const basePrompt =
  'Vertical 2:3 dark neon character art in the exact style of the provided reference: ' +
  'a seated wise armored cyber-samurai guardian, cross-legged meditation pose, hands resting on the hilt of a vertical katana, ' +
  'glowing circular neon halo behind the head, dark almost black background, ornamental leaves and branches around the edges, ' +
  'dramatic high contrast rim lighting, deep shadows, glossy detailed armor, elegant robe folds. ' +
  'No text, no logo, no UI, no shield, no standing pose, no bright fantasy card border.';

export const LEAGUE_GUARDIAN_THEME_PROMPTS: Record<ThemeMode, string> = {
  dark:
    'Theme colors: deep forest black background, emerald green #47C870, aqua neon #2EE8C4, muted bronze/copper only as tiny metal details. Green leaves and emerald halo.',
  neon:
    'Theme colors: near-black background, acid lime #C8FF00, yellow-green #D7FF38, deep black armor shadows, tiny neutral steel highlights only. No purple, no pink, no magenta, no violet, no blue-cyan foliage. Acid-lime neon halo and lime foliage edges.',
  gold:
    'Theme colors: piano black background, antique gold #D4A017, champagne #F2C48D, dark bronze shadows. Premium black-gold robe details and golden halo.',
  coral:
    'Theme colors: almost black wine background, coral red #FF6464, deep magenta #C0006A, blue-black armor shadows. Red neon halo and crimson ornamental leaves like the reference.',
  minimalLight:
    'Theme colors: graphite ink #343842, warm paper beige #F3ECDC, muted navy #33466F, old bronze #76531F. Keep the image dark and cinematic, but clothing accents should feel paper-and-graphite themed.',
  minimalDark:
    'Theme colors: charcoal black #121212, steel blue #6EA8FF, soft gray #D1D5DB, black armor. Blue neon halo, sparse cool leaves, minimal modern mood.',
  compass:
    'Theme colors: deep black #020304, champagne #F2C48D, copper #B4774E, warm ivory highlights. Compass-like warm halo, restrained luxury bronze details.',
};

export const LEAGUE_GUARDIAN_CONCEPTS: LeagueGuardianConcept[] = [
  {
    leagueId: 0,
    code: 'copper',
    title: 'Guardian of the Start',
    severity: 'beginner mentor, calm and approachable',
    prompt: 'Copper League Guardian of the Start, a patient first mentor, compact armor, small crest, disciplined but welcoming presence.',
  },
  {
    leagueId: 1,
    code: 'bronze',
    title: 'Master of Habit',
    severity: 'steady drill mentor',
    prompt: 'Bronze League Master of Habit, broader shoulders, ritual prayer beads, habit flame crest, repeated practice symbols carved into armor, calm unbreakable discipline.',
  },
  {
    leagueId: 2,
    code: 'silver',
    title: 'Seeker of Meaning',
    severity: 'quiet explorer sage',
    prompt: 'Silver League Seeker of Meaning, slimmer reflective mask, crescent compass crest, star-map ornaments, traveler cloak, searching wisdom and focused curiosity.',
  },
  {
    leagueId: 3,
    code: 'gold',
    title: 'Practice Forger',
    severity: 'serious craftsman warrior',
    prompt: 'Gold League Practice Forger, heavy forged shoulder plates, hammer-like sword handle, ember runes, artisan discipline, stronger and more grounded than lower leagues.',
  },
  {
    leagueId: 4,
    code: 'platinum',
    title: 'Rules Architect',
    severity: 'strict strategist',
    prompt: 'Platinum League Rules Architect, angular ceremonial armor, geometric crown, thin rule-grid engravings, symmetrical pose, severe tactical intelligence.',
  },
  {
    leagueId: 5,
    code: 'emerald',
    title: 'Memory Sage',
    severity: 'ancient archive sage',
    prompt: 'Emerald League Memory Sage, layered scholar robes over armor, book-and-leaf crest, memory tablets and old script patterns, ancient calm authority.',
  },
  {
    leagueId: 6,
    code: 'sapphire',
    title: 'Blue Mentor',
    severity: 'cold elite mentor',
    prompt: 'Sapphire League Blue Mentor, sharp sapphire mask, crystalline horns, ice-blue robe accents, precise composed posture, elite language master.',
  },
  {
    leagueId: 7,
    code: 'ruby',
    title: 'Fire Warden',
    severity: 'dangerous disciplined guardian',
    prompt: 'Ruby League Fire Warden, flame-shaped helmet, ember cracks in black armor, restrained fire aura, intense eyes, dangerous but controlled discipline.',
  },
  {
    leagueId: 8,
    code: 'diamond',
    title: 'Clarity Magister',
    severity: 'high master of focus',
    prompt: 'Diamond League Clarity Magister, faceted diamond crown, luminous clear armor edges, mirror-like mask, absolute focus and clean authority.',
  },
  {
    leagueId: 9,
    code: 'black_diamond',
    title: 'Shadow Thinker',
    severity: 'elite shadow philosopher',
    prompt: 'Black Diamond League Shadow Thinker, almost invisible black armor, ember-thin outlines, shadow crown, darker forest, unsettling silent intelligence.',
  },
  {
    leagueId: 10,
    code: 'ether',
    title: 'Ether Master',
    severity: 'transcendent cosmic master',
    prompt: 'Ether League Ether Master, floating ring fragments around the halo, astral robe layers, planet-like ornaments, otherworldly calm and legendary mastery.',
  },
  {
    leagueId: 11,
    code: 'supreme',
    title: 'Supreme Teacher',
    severity: 'final ancient authority',
    prompt: 'Supreme League Supreme Teacher, monumental ancient master, crown-like halo, royal layered armor, minimal movement, overwhelming calm authority at the top of all leagues.',
  },
];

export const LEAGUE_GUARDIAN_ASSETS: LeagueGuardianAsset[] = [
  {
    id: 0,
    fileName: 'copper_guardian_concept.png',
    source: require('../assets/images/league_guardians/copper_guardian_concept.png'),
    dallePrompt: `${basePrompt} Copper League, Guardian of the Start, copper-bronze armor, emerald neon accents, shield motif, luminous vertical staff, dark green background.`,
  },
  {
    id: 1,
    fileName: 'bronze_guardian_concept.png',
    source: require('../assets/images/league_guardians/bronze_guardian_concept.png'),
    dallePrompt: `${basePrompt} Bronze League, Master of Habit, warm bronze armor, living green flame crest, disciplined mentor energy, dark forest green and bronze palette.`,
  },
  {
    id: 2,
    fileName: 'silver_guardian_concept.png',
    source: require('../assets/images/league_guardians/silver_guardian_concept.png'),
    dallePrompt: `${basePrompt} Silver League, Seeker of Meaning, polished silver-blue armor, compass and star navigation motifs, cool cyan glow, night-sky background.`,
  },
  {
    id: 3,
    fileName: 'gold_guardian_concept.png',
    source: require('../assets/images/league_guardians/gold_guardian_concept.png'),
    dallePrompt: `${basePrompt} Gold League, Practice Forger, gold armor with green accents, hammer-forged wisdom motif, radiant warm halo, disciplined craftsman mentor.`,
  },
  {
    id: 4,
    fileName: 'platinum_guardian_concept.png',
    source: require('../assets/images/league_guardians/platinum_guardian_concept.png'),
    dallePrompt: `${basePrompt} Platinum League, Rules Architect, platinum and pale blue armor, geometric chart symbols, elegant strategist silhouette, restrained premium light.`,
  },
  {
    id: 5,
    fileName: 'emerald_guardian_concept.png',
    source: require('../assets/images/league_guardians/emerald_guardian_concept.png'),
    dallePrompt: `${basePrompt} Emerald League, Memory Sage, emerald robe, bronze book crown, ancient library aura, deep green magical particles, wise calm teacher.`,
  },
  {
    id: 6,
    fileName: 'sapphire_guardian_concept.png',
    source: require('../assets/images/league_guardians/sapphire_guardian_concept.png'),
    dallePrompt: `${basePrompt} Sapphire League, Blue Mentor, sapphire blue armor, cyan diamond crest, deep blue cosmic background, calm authoritative guide.`,
  },
  {
    id: 7,
    fileName: 'ruby_guardian_concept.png',
    source: require('../assets/images/league_guardians/ruby_guardian_concept.png'),
    dallePrompt: `${basePrompt} Ruby League, Fire Warden, ruby and magenta armor, controlled flame crown, intense crimson halo, passionate but wise guardian.`,
  },
  {
    id: 8,
    fileName: 'diamond_guardian_concept.png',
    source: require('../assets/images/league_guardians/diamond_guardian_concept.png'),
    dallePrompt: `${basePrompt} Diamond League, Clarity Magister, icy diamond armor, white-blue luminous halo, scholar crown, crystalline clarity and focus.`,
  },
  {
    id: 9,
    fileName: 'black_diamond_guardian_concept.png',
    source: require('../assets/images/league_guardians/black_diamond_guardian_concept.png'),
    dallePrompt: `${basePrompt} Black Diamond League, Shadow Thinker, black armor with orange ember edges, dark elite aura, star spark crest, mysterious wisdom.`,
  },
  {
    id: 10,
    fileName: 'ether_guardian_concept.png',
    source: require('../assets/images/league_guardians/ether_guardian_concept.png'),
    dallePrompt: `${basePrompt} Ether League, Ether Master, violet and gold robe, floating planet ring crest, cosmic atmosphere, transcendent mentor presence.`,
  },
  {
    id: 11,
    fileName: 'supreme_guardian_concept.png',
    source: require('../assets/images/league_guardians/supreme_guardian_concept.png'),
    dallePrompt: `${basePrompt} Supreme League, Supreme Teacher, white and gold legendary armor, trophy crown, radiant golden halo, final master mentor.`,
  },
];

export const LEAGUE_GUARDIAN_IMAGES: Record<number, ImageSourcePropType> =
  LEAGUE_GUARDIAN_ASSETS.reduce<Record<number, ImageSourcePropType>>((acc, asset) => {
    acc[asset.id] = asset.source;
    return acc;
  }, {});

export const LEAGUE_GUARDIAN_THEME_ASSETS: LeagueGuardianThemeAsset[] = [
  {
    themeMode: 'dark',
    leagueId: 0,
    fileName: 'dark/copper_guardian.png',
    source: require('../assets/images/league_guardians/dark/copper_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.dark} Copper League Guardian of the Start, wisdom and discipline mood.`,
  },
  {
    themeMode: 'coral',
    leagueId: 0,
    fileName: 'coral/copper_guardian.png',
    source: require('../assets/images/league_guardians/coral/copper_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.coral} Copper League Guardian of the Start, wisdom and discipline mood.`,
  },
  {
    themeMode: 'neon',
    leagueId: 0,
    fileName: 'neon/copper_guardian.png',
    source: require('../assets/images/league_guardians/neon/copper_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.neon} Copper League Guardian of the Start, wisdom and discipline mood.`,
  },
  {
    themeMode: 'compass',
    leagueId: 0,
    fileName: 'compass/copper_guardian.png',
    source: require('../assets/images/league_guardians/compass/copper_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.compass} Copper League Guardian of the Start, wisdom and discipline mood.`,
  },
  {
    themeMode: 'compass',
    leagueId: 1,
    fileName: 'compass/bronze_guardian.png',
    source: require('../assets/images/league_guardians/compass/bronze_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.compass} Bronze League Master of Habit, broader shoulders, ritual prayer beads, habit flame crest, repeated practice symbols carved into armor, calm unbreakable discipline.`,
  },
  {
    themeMode: 'compass',
    leagueId: 2,
    fileName: 'compass/silver_guardian.png',
    source: require('../assets/images/league_guardians/compass/silver_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.compass} Silver League Seeker of Meaning, slimmer reflective mask, crescent compass crest, star-map ornaments, traveler cloak, searching wisdom and focused curiosity.`,
  },
  {
    themeMode: 'gold',
    leagueId: 0,
    fileName: 'gold/copper_guardian.png',
    source: require('../assets/images/league_guardians/gold/copper_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.gold} Copper League Guardian of the Start, wisdom and discipline mood.`,
  },
  {
    themeMode: 'minimalDark',
    leagueId: 0,
    fileName: 'minimalDark/copper_guardian.png',
    source: require('../assets/images/league_guardians/minimalDark/copper_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.minimalDark} Copper League Guardian of the Start, wisdom and discipline mood.`,
  },
  {
    themeMode: 'minimalLight',
    leagueId: 0,
    fileName: 'minimalLight/copper_guardian.png',
    source: require('../assets/images/league_guardians/minimalLight/copper_guardian.png'),
    dallePrompt: `${basePrompt} ${LEAGUE_GUARDIAN_THEME_PROMPTS.minimalLight} Copper League Guardian of the Start, wisdom and discipline mood.`,
  },
];

export const LEAGUE_GUARDIAN_IMAGES_BY_THEME: Partial<Record<ThemeMode, Record<number, ImageSourcePropType>>> =
  LEAGUE_GUARDIAN_THEME_ASSETS.reduce<Partial<Record<ThemeMode, Record<number, ImageSourcePropType>>>>((acc, asset) => {
    acc[asset.themeMode] = acc[asset.themeMode] ?? {};
    acc[asset.themeMode]![asset.leagueId] = asset.source;
    return acc;
  }, {});

export function getLeagueGuardianImage(leagueId: number, themeMode: ThemeMode): ImageSourcePropType | undefined {
  return LEAGUE_GUARDIAN_IMAGES_BY_THEME[themeMode]?.[leagueId] ?? LEAGUE_GUARDIAN_IMAGES[leagueId];
}
