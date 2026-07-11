import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MANUAL_FLAGS = [
  'semanticMatch',
  'noRandomText',
  'noAnatomyOrObjectDefects',
  'noCrop',
  'correctCopy',
  'secondSlideVisualApproved',
  'ctaReadable',
  'slideOrderCorrect',
];
const MUTABLE_STATUSES = new Set(['idea', 'copy_ready', 'waiting_dalle', 'images_ready', 'review', 'ready']);
const REQUIRED_ORDER = ['learning', 'install'];

async function readJson(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return null; }
}

async function imageCheck(id, filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const passed = metadata.width === 1080 && metadata.height === 1080
      && metadata.format === 'jpeg' && metadata.space === 'srgb' && metadata.channels === 3;
    return { id, passed, detail: passed ? '1080x1080 JPEG sRGB' : JSON.stringify(metadata) };
  } catch {
    return { id, passed: false, detail: 'missing_or_unreadable' };
  }
}

export async function validateMachinePackage({ card, revisionDir }) {
  const learningPath = path.join(revisionDir, card.images.learning.fileName);
  const installPath = path.join(revisionDir, card.images.install.fileName);
  const installLayout = await readJson(path.join(revisionDir, 'slide_02_install.layout.json'));
  const checks = [
    await imageCheck('learning_output', learningPath),
    await imageCheck('install_output', installPath),
    {
      id: 'second_slide_visual',
      passed: Boolean(installLayout?.hero?.used && installLayout?.hero?.path
        && await fs.access(installLayout.hero.path).then(() => true, () => false)),
    },
    {
      id: 'cta_copy',
      passed: installLayout?.cta?.button === 'Начать бесплатно'
        && installLayout?.cta?.footer === 'Без регистрации • первый урок через 30 секунд'
        && installLayout?.cta?.url === 'https://knowlyapps.com/',
    },
    {
      id: 'cta_contrast',
      passed: installLayout?.cta?.buttonBackground === '#B7FF3C'
        && installLayout?.cta?.buttonTextColor === '#07110A',
    },
  ];
  const state = validateExportState(card);
  checks.push({ id: 'export_state', passed: state.passed, detail: state.errors.join(',') });
  return { schemaVersion: 1, passed: checks.every((check) => check.passed), checks };
}

export function validateManualQa(value, card = null) {
  const errors = [];
  if (value?.schemaVersion !== 1) errors.push('invalid_schema_version');
  for (const flag of MANUAL_FLAGS) if (value?.[flag] !== true) errors.push(`missing_or_false:${flag}`);
  if (!value?.reviewedBy?.trim()) errors.push('missing_reviewer');
  if (!value?.reviewedAt || Number.isNaN(Date.parse(value.reviewedAt))) errors.push('invalid_reviewed_at');
  if (card) {
    const reviews = Array.isArray(value?.cellReviews) ? value.cellReviews : [];
    for (const item of card.items) {
      const review = reviews.find((candidate) => candidate.itemId === item.id);
      if (!review) {
        errors.push(`missing_cell_review:${item.id}`);
        continue;
      }
      for (const gate of ['semanticMatch', 'anatomyClean', 'objectsClean', 'backgroundClean', 'noCrop', 'approved']) {
        if (review[gate] !== true) errors.push(`cell_review_failed:${item.id}:${gate}`);
      }
    }
  }
  return { passed: errors.length === 0, errors };
}

export function validateExportState(card) {
  const errors = [];
  if (!MUTABLE_STATUSES.has(card.status)) errors.push(`immutable_status:${card.status}`);
  for (const [platform, surface] of Object.entries(card.surfaces ?? {})) {
    if (!surface.enabled || platform === 'youtube') continue;
    if (JSON.stringify(surface.slideOrder) !== JSON.stringify(REQUIRED_ORDER)) {
      errors.push(`invalid_slide_order:${platform}`);
    }
  }
  if (card.surfaces?.youtube?.enabled
    && JSON.stringify(card.surfaces.youtube.slideOrder) !== JSON.stringify(['learning'])) {
    errors.push('invalid_slide_order:youtube');
  }
  return { passed: errors.length === 0, errors };
}

export function assertExportable({ machineReport, manualQa, card = null }) {
  const manualReport = validateManualQa(manualQa, card);
  if (!machineReport?.passed) throw new Error('machine_qa_failed');
  if (!manualReport.passed) throw new Error(`manual_qa_failed:${manualReport.errors.join(',')}`);
  return { machineReport, manualReport };
}
