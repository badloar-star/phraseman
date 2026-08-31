import path from 'node:path';

export const PHENOMENA_ART_VERSION = 'phenomena-v1';
export const PHENOMENA_ASSET_FOLDER = 'avatar-phenomena-v1';
export const PHENOMENA_WORKSPACE = path.join('.codex-tmp', 'avatar-phenomena-v1');
export const PHENOMENA_INKS = Object.freeze(['black', 'white']);

const tierDescriptions = Object.freeze({
  70: 'focused elemental energy with a clean, memorable silhouette',
  100: 'rare atmospheric energy with brighter spectral complexity',
  150: 'layered extreme-weather energy with refined depth and motion',
  300: 'dramatic celestial power with monumental structure and contrast',
  500: 'cosmic-scale energy with luxurious multilayered light and detail',
  1000: 'reality-bending cosmic grandeur with the highest intricacy and awe',
});

function phenomenon(id, price, name, labelRu, matteHex, conceptPrompt) {
  return Object.freeze({
    id,
    price,
    name,
    labelRu,
    matteHex,
    tierDescription: tierDescriptions[price],
    conceptPrompt,
  });
}

export const PHENOMENA_GENERATION_CATALOG = Object.freeze([
  phenomenon('custom-phen-01', 70, 'Spark Rain', 'Первая искра', '#00F56A', 'A dense upward-sweeping rain of incandescent amber sparks, gathered into one bold tapered energy mass with a hot central current and elegant ember trails.'),
  phenomenon('custom-phen-02', 70, 'Wind Spiral', 'Ветер перемен', '#FF00B8', 'A powerful spiral of compressed translucent wind ribbons and suspended silver particles, forming one broad vertical vortex without clouds resembling a creature.'),
  phenomenon('custom-phen-03', 70, 'Dawn Halo', 'Рассветная ясность', '#00D8FF', 'A monumental halo of first light made from layered warm rays and luminous atmospheric rings, shown as a close abstract phenomenon with no sun, horizon, or landscape.'),
  phenomenon('custom-phen-04', 100, 'Ball Lightning', 'Заряд мысли', '#FF00B8', 'A large unstable sphere of electric plasma with branching cobalt and violet discharges, dense internal turbulence, and a vertically stretched corona that remains purely abstract.'),
  phenomenon('custom-phen-05', 100, 'Moonbow', 'Лунный спектр', '#FF5A00', 'A thick cold spectral arc folded into a compact luminous wave, with opalescent refraction, moonlit mist filaments, and no moon, night sky, terrain, or scenic background.'),
  phenomenon('custom-phen-06', 100, 'Fire Rainbow', 'Небесный импульс', '#00F56A', 'A rare incandescent rainbow phenomenon built from stacked molten spectral bands and heat distortion, compressed into a tall energetic crown rather than a distant sky scene.'),
  phenomenon('custom-phen-07', 150, 'Aurora Vortex', 'Полярное вдохновение', '#FF4A00', 'A dense aurora folded into a towering vortex crown, with cyan, emerald, violet, and pearl curtains twisting around an abstract luminous core without eye-like symmetry.'),
  phenomenon('custom-phen-08', 150, 'Volcanic Lightning', 'Грозовая воля', '#00F56A', 'A massive rotating column of charcoal volcanic ash split by hot orange magma glow and sharp violet-white lightning, presented close and self-contained with no volcano landscape.'),
  phenomenon('custom-phen-09', 150, 'Diamond Dust', 'Алмазная тишина', '#FF00B8', 'A thick suspended mass of microscopic ice crystals and prismatic frost light, shaped as a faceted atmospheric cascade with brilliant caustics but no literal gemstone object.'),
  phenomenon('custom-phen-10', 300, 'Total Eclipse', 'Момент затмения', '#00F56A', 'A vast abstract total-eclipse disk and luxuriant asymmetric golden-white plasma corona, cropped close so the corona fills the frame with no stars, sky, landscape, or eye-like reading.'),
  phenomenon('custom-phen-11', 300, 'Supercell Core', 'Небесный натиск', '#FF00B8', 'The turbulent core of a colossal supercell rendered as stacked storm bands, electric pressure waves, and branching lightning around an irregular non-circular center that cannot resemble an eye.'),
  phenomenon('custom-phen-12', 300, 'Meteor Storm', 'Звёздный дождь', '#00E8C8', 'A dense directional torrent of incandescent meteor plasma trails and fragmented ionized wakes, merged into one sweeping vertical mass without visible rocks, planet, horizon, or space scene.'),
  phenomenon('custom-phen-13', 500, 'Crimson Nebula', 'Багровое рождение', '#00F56A', 'A luxurious crimson nebula condensing into layered luminous folds, pearl-hot stellar vapor, and deep burgundy void channels, abstract and close without stars arranged as a face.'),
  phenomenon('custom-phen-14', 500, 'Pulsar Crown', 'Ритм пульсара', '#FF00B8', 'An ultra-dense pulsar phenomenon with rhythmic polar light beams, concentric pressure ripples, and a grand cobalt-white energy crown, deliberately asymmetric and non-sentient.'),
  phenomenon('custom-phen-15', 500, 'Magnetar Flare', 'Магнитная буря', '#00F56A', 'A spectacular magnetar flare made from warped magnetic loops, blinding violet-white plasma ribbons, and compressed radiation arcs filling the frame without a literal machine or emblem.'),
  phenomenon('custom-phen-16', 1000, 'Reality Rift', 'За гранью', '#00F56A', 'A reality rift unfolding as interleaved planes of obsidian void, prismatic light, and impossible spatial refraction, monumental and intricate while avoiding doors, eyes, faces, or symbols.'),
  phenomenon('custom-phen-17', 1000, 'Heart of the Abyss', 'Сердце бездны', '#FF00B8', 'A supermassive black-hole phenomenon with a turbulent molten accretion torus, gravitational lensing ribbons, and vertical relativistic light distortion, cropped close with no surrounding space scene.'),
  phenomenon('custom-phen-18', 1000, 'Time Fracture', 'Вне времени', '#00F56A', 'Multiple incompatible temporal light layers shearing through one abstract convergence, with frozen shockwaves, luminous afterimages, and crystalline spacetime distortion but no clock or manufactured object.'),
]);

export function rawPathFor(id, ink) {
  return path.join(PHENOMENA_WORKSPACE, 'raw', id, ink, 'source.png');
}

export function promptPathFor(id, ink) {
  return path.join(PHENOMENA_WORKSPACE, 'raw', id, ink, 'prompt.json');
}

export function finalPathFor(id, ink) {
  return path.join('admin', 'v2', 'avatars', PHENOMENA_ASSET_FOLDER, `${id}-${ink}.webp`);
}

export function buildBlackPrompt(item) {
  return `Create a high-quality premium mobile-game avatar cutout of ${item.name}. ${item.conceptPrompt} Price-tier visual intensity: ${item.tierDescription}. A single non-sentient natural or cosmic phenomenon, no character and no creature. Stylized cinematic 3D illustration, extremely refined forms, crisp micro-detail, controlled volumetric glow, deep material contrast, elegant energy flow, readable silhouette at 64 px. Macro close-up, centered and vertically powerful, filling 90–100% of a tall standing-hex safe area, reaching the bottom V baseline and nearly touching the upper and side boundaries, with no empty lower area. No landscape, no horizon, no distant scene. Dark Yin polarity: obsidian, charcoal, deep indigo and restrained luminous accents appropriate to the phenomenon. Isolated on one perfectly flat solid ${item.matteHex} background that does not appear anywhere in the subject. No hexagon, frame, border, pedestal, badge, text, letters, logo, face, eyes, human, animal, bird, insect, marine life, monster, mascot, plant, building, vehicle, weapon or manufactured object. Square image, polished production concept art, clean edges suitable for precise background removal.`;
}

export function buildWhitePrompt(item) {
  return `Preserve the referenced ${item.name} phenomenon's exact identity, silhouette, energy flow, crop, scale, perspective, and placement. Convert only its visual polarity into a luminous Yang version: pearl white, pale gold, opalescent silver and restrained phenomenon-appropriate spectral accents. Keep the same premium stylized cinematic 3D quality and small-size readability. Keep the single perfectly flat solid ${item.matteHex} background. Do not add or remove components. No hexagon, frame, text, logo, face, eyes, character, human, animal, creature, plant, building, vehicle, weapon or manufactured object.`;
}
