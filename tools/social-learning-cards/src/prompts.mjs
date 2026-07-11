function assertCard(card) {
  if (!card || typeof card !== 'object' || !Array.isArray(card.items)) {
    throw new Error('invalid_card');
  }
}

function gridLabel(grid) {
  if (grid === '3x3') return 'EXACT 3x3 GRID with nine equal cells';
  if (grid === '2x3') return 'EXACT 2x3 GRID with six equal cells';
  throw new Error('invalid_grid');
}

function commonDirection(card) {
  return [
    `Visual style: ${card.visualStyle}.`,
    'Audience: adult audience aged 20-50; clear and approachable, never childish.',
    'Use a clean white or very light background and consistent lighting, scale, palette, and character design.',
    'NO TEXT, NO LETTERS, NO NUMBERS, NO LABELS, NO LOGOS, NO WATERMARKS.',
    'Keep every subject fully inside its cell with generous breathing room.',
  ].join('\n');
}

export function buildAtlasPrompt(card) {
  assertCard(card);
  const cells = card.items.map(
    (item, index) => `${index + 1}. [${item.id}] ${item.visualBrief}`,
  );
  return [
    'Create one production-ready illustration atlas for an English-learning social card.',
    gridLabel(card.grid),
    commonDirection(card),
    'The repeated human subject must be the same woman in every applicable cell: identical face, hair, age, and clothing.',
    'Each cell must communicate one meaning instantly without relying on text.',
    'Cell contract, read left-to-right and top-to-bottom:',
    ...cells,
  ].join('\n');
}

export function buildReplacementPrompt(card, itemId) {
  assertCard(card);
  const item = card.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error('unknown_item');
  return [
    'Create one replacement illustration for a single atlas cell.',
    `[${item.id}] ${item.visualBrief}`,
    commonDirection(card),
    'Match the same woman, visual style, camera distance, lighting, palette, and white background used by the existing atlas.',
    'Return one isolated cell illustration only.',
  ].join('\n');
}
