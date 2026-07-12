import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { assertExportable, validateExportState } from './validate.mjs';
import { resolveInside, revisionKey } from './paths.mjs';

async function sha256File(filePath) {
  return crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
}

function trackingUrl(card, source, medium) {
  const query = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: card.campaign,
    utm_content: card.contentId,
  });
  return `https://knowlyapps.com/?${query}`;
}

export async function packageRevision({ card, revisionDir, exportRoot, machineReport, manualQa }) {
  const state = validateExportState(card);
  if (!state.passed) throw new Error(`export_state_failed:${state.errors.join(',')}`);
  const { manualReport } = assertExportable({ machineReport, manualQa, card });
  const packageDir = resolveInside(exportRoot, revisionKey(card.contentId, card.revision));
  await fs.mkdir(path.dirname(packageDir), { recursive: true });
  await fs.mkdir(packageDir, { recursive: false }).catch((error) => {
    if (error.code === 'EEXIST') throw new Error('immutable_revision_exists');
    throw error;
  });

  const assets = {};
  for (const [kind, image] of Object.entries(card.images)) {
    const source = path.join(revisionDir, image.fileName);
    const target = path.join(packageDir, image.fileName);
    await fs.copyFile(source, target);
    assets[kind] = {
      fileName: image.fileName,
      sha256: await sha256File(target),
      storagePath: `social-learning-cards/${card.contentId}/revision_${String(card.revision).padStart(3, '0')}/${image.fileName}`,
    };
  }

  const platforms = {
    instagram: { format: 'carousel', slideOrder: ['learning', 'install'], url: trackingUrl(card, 'instagram', 'carousel') },
    tiktok: { format: 'photo_mode', slideOrder: ['learning', 'install'], url: trackingUrl(card, 'tiktok', 'photo_mode') },
    facebook: { format: 'multi_photo', slideOrder: ['learning', 'install'], url: trackingUrl(card, 'facebook', 'multi_photo') },
    youtube: {
      format: 'community_image', slideOrder: ['learning'], url: trackingUrl(card, 'youtube', 'community'),
      fallback: 'Publish slide 1 as Community image; put the attributed link in the post description or pinned comment.',
    },
  };
  await fs.writeFile(path.join(packageDir, 'captions.json'), `${JSON.stringify({ schemaVersion: 1, platforms }, null, 2)}\n`);
  const qualityReport = { schemaVersion: 1, passed: true, machine: machineReport, manual: { ...manualQa, ...manualReport } };
  const qualityText = JSON.stringify(qualityReport, null, 2) + '\n';
  await fs.writeFile(path.join(packageDir, 'quality-report.json'), qualityText);
  const manifest = {
    schemaVersion: 1, contentId: card.contentId, revision: card.revision, campaign: card.campaign,
    assets, quality: { passed: true, reportSha256: crypto.createHash('sha256').update(qualityText).digest('hex') },
  };
  const manifestPath = path.join(packageDir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(packageDir, 'README.txt'), 'Publish slides in the order defined in captions.json. Do not overwrite this revision.\n');
  return { packageDir, manifestPath };
}
