import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { validateCardManifest } from './schema.mjs';

async function sha256File(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function gridShape(grid) {
  if (grid === '3x3') return { columns: 3, rows: 3 };
  if (grid === '2x3') return { columns: 2, rows: 3 };
  throw new Error('invalid_grid');
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function importAtlas({ card, atlasPath, revisionDir }) {
  const validation = validateCardManifest(card);
  if (!validation.ok) throw new Error(`invalid_manifest:${validation.errors.join(',')}`);

  const metadata = await sharp(atlasPath).metadata();
  if (!metadata.width || !metadata.height) throw new Error('atlas_dimensions_missing');
  const { columns, rows } = gridShape(card.grid);
  if (metadata.width % columns !== 0 || metadata.height % rows !== 0) {
    throw new Error('atlas_dimensions_not_divisible');
  }
  const cellWidth = metadata.width / columns;
  const cellHeight = metadata.height / rows;
  if (cellWidth < 256 || cellHeight < 256) throw new Error('atlas_cells_too_small');

  const cellsDir = path.join(revisionDir, 'dalle', 'cells');
  await fs.mkdir(cellsDir, { recursive: true });
  const cells = [];
  for (let index = 0; index < card.items.length; index += 1) {
    const item = card.items[index];
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    const outputPath = path.join(cellsDir, `${item.id}.png`);
    await sharp(atlasPath)
      .extract({ left, top, width: cellWidth, height: cellHeight })
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
      .png()
      .toFile(outputPath);
    const outputMetadata = await sharp(outputPath).metadata();
    if (outputMetadata.width !== cellWidth || outputMetadata.height !== cellHeight) {
      throw new Error(`cell_verification_failed:${item.id}`);
    }
    cells.push({
      itemId: item.id,
      path: outputPath,
      sha256: await sha256File(outputPath),
      width: outputMetadata.width,
      height: outputMetadata.height,
    });
  }

  const checkpointPath = path.join(revisionDir, 'checkpoint.json');
  await writeJson(checkpointPath, {
    schemaVersion: 1,
    contentId: card.contentId,
    revision: card.revision,
    stage: 'atlas_imported',
    atlasPath,
    atlasSha256: await sha256File(atlasPath),
    cells,
    verifiedAt: new Date().toISOString(),
  });
  return { cells, checkpointPath };
}
