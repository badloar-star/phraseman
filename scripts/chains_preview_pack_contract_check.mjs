#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MOJIBAKE_RE = /(\?{4,}|\uFFFD|Ð|Ñ|Ã)/u;
const FALSE_CLAIM_RE = /(5\s*минут|за\s*5\s*минут|25\s*фраз)/iu;
const REQUIRED_REFERENCE_SOURCE_DIR = path.resolve('C:\\Users\\badlo\\OneDrive\\Desktop\\preview examples');
const REQUIRED_PREVIEW_BANK_DIR = path.resolve('C:\\Users\\badlo\\OneDrive\\Desktop\\банк превью');
const REQUIRED_DESIGN_FORMULA = 'premium_metaphor_v1';
const REQUIRED_LINK_RE = /(apps\.apple\.com\/app\/id6764800879|play\.google\.com\/store\/apps\/details\?id=app\.phraseman|knowlyapps\.com)/i;
const ENGLISH_SIGNAL_RE = /(английск|english|язык|фраз|реч|слух|перевод)/iu;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = value;
  }
  if (!args['ready-dir']) {
    throw new Error('Usage: node scripts/chains_preview_pack_contract_check.mjs --ready-dir <READY_YOUTUBE_PACK> [--report <path>] [--allow-reused-images]');
  }
  return args;
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function requireFile(readyDir, relative, errors) {
  const file = path.join(readyDir, relative);
  if (!fs.existsSync(file)) {
    errors.push({ type: 'missing_required_file', file });
  }
  return file;
}

function checkTextFile(file, errors, options = {}) {
  if (!fs.existsSync(file)) return;
  const text = readText(file);
  if (!text.trim()) errors.push({ type: 'empty_text_file', file });
  if (MOJIBAKE_RE.test(text)) errors.push({ type: 'mojibake_or_replacement_text', file });
  if (!options.allowFalseClaims && FALSE_CLAIM_RE.test(text)) {
    errors.push({ type: 'false_or_low_value_thumbnail_claim', file });
  }
}

function checkDescriptionFile(file, errors) {
  if (!fs.existsSync(file)) return;
  checkTextFile(file, errors);
  const text = readText(file);
  if (!REQUIRED_LINK_RE.test(text)) {
    errors.push({ type: 'description_missing_phraseman_links', file });
  }
  if (!/(вы|ваш|вам|тебя|твой)/iu.test(text)) {
    errors.push({ type: 'description_missing_viewer_address', file });
  }
  if (!/(метод|цепоч|повтор|слуш|перевод|смысл)/iu.test(text)) {
    errors.push({ type: 'description_missing_method_explanation', file });
  }
}

async function checkImage(file, errors) {
  try {
    const meta = await sharp(file).metadata();
    if (meta.width !== 1280 || meta.height !== 720) {
      errors.push({ type: 'thumbnail_wrong_size', file, width: meta.width, height: meta.height });
    }
  } catch (error) {
    errors.push({ type: 'thumbnail_unreadable', file, message: error.message });
  }
}

function checkReadyManifest(readyDir, errors) {
  const manifestFile = path.join(readyDir, 'READY_PACKAGE_MANIFEST.json');
  if (!fs.existsSync(manifestFile)) return;
  try {
    const manifest = JSON.parse(readText(manifestFile));
    if (manifest.ready_folder && path.resolve(String(manifest.ready_folder)) !== readyDir) {
      errors.push({ type: 'manifest_ready_folder_mismatch', expected: readyDir, actual: manifest.ready_folder });
    }
  } catch (error) {
    errors.push({ type: 'manifest_json_parse_error', file: manifestFile, message: error.message });
  }
}

function checkFreshManifest(readyDir, imageCount, errors, options) {
  const manifestFile = path.join(readyDir, 'fresh_generation_manifest.json');
  if (!fs.existsSync(manifestFile)) return;
  try {
    const manifest = JSON.parse(readText(manifestFile));
    if (!options.allowReusedImages) {
      if (manifest.fresh_generation !== true) {
        errors.push({ type: 'fresh_generation_not_declared', file: manifestFile });
      }
        if (!String(manifest.generation_mode || '').trim()) {
          errors.push({ type: 'missing_generation_mode', file: manifestFile });
        }
        if (manifest.generator !== 'codex_dalle') {
          errors.push({
            type: 'new_style_pack_must_use_codex_dalle',
            file: manifestFile,
            actual: manifest.generator ?? null,
          });
        }
        if (manifest.design_formula !== REQUIRED_DESIGN_FORMULA) {
          errors.push({
            type: 'wrong_design_formula',
            file: manifestFile,
            expected: REQUIRED_DESIGN_FORMULA,
            actual: manifest.design_formula ?? null,
          });
        }
        if (path.resolve(String(manifest.reference_source_dir || '')) !== REQUIRED_REFERENCE_SOURCE_DIR) {
          errors.push({
            type: 'wrong_reference_source_dir',
            file: manifestFile,
            expected: REQUIRED_REFERENCE_SOURCE_DIR,
            actual: manifest.reference_source_dir ?? null,
          });
        }
        if (path.resolve(String(manifest.preview_bank_dir || '')) !== REQUIRED_PREVIEW_BANK_DIR) {
          errors.push({
            type: 'wrong_preview_bank_dir',
            file: manifestFile,
            expected: REQUIRED_PREVIEW_BANK_DIR,
            actual: manifest.preview_bank_dir ?? null,
          });
        }
        if (/svg|pil|canvas|local/i.test(String(manifest.generation_mode || ''))) {
          errors.push({
            type: 'local_rendered_thumbnail_pack_not_allowed_for_new_styles',
            file: manifestFile,
            generation_mode: manifest.generation_mode,
          });
        }
        if (!Array.isArray(manifest.style_families) || manifest.style_families.length < 3) {
        errors.push({
          type: 'too_few_style_families',
          file: manifestFile,
          count: Array.isArray(manifest.style_families) ? manifest.style_families.length : 0,
          minimum: 3,
        });
      }
      if (Number(manifest.source_image_reuse_count || 0) !== 0) {
        errors.push({
          type: 'previous_image_reuse_for_new_style_pack',
          file: manifestFile,
          source_image_reuse_count: manifest.source_image_reuse_count,
        });
      }
    }
    if (!Array.isArray(manifest.items) || manifest.items.length !== imageCount) {
      errors.push({
        type: 'fresh_manifest_item_count_mismatch',
        file: manifestFile,
        expected: imageCount,
        actual: Array.isArray(manifest.items) ? manifest.items.length : 0,
      });
    }
  } catch (error) {
    errors.push({ type: 'fresh_manifest_json_parse_error', file: manifestFile, message: error.message });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const readyDir = path.resolve(String(args['ready-dir']));
  const reportPath = args.report ? path.resolve(String(args.report)) : null;
  const errors = [];

  if (!fs.existsSync(readyDir)) {
    errors.push({ type: 'missing_ready_dir', readyDir });
  }

  const imageDir = path.join(readyDir, 'youtube_ready_1280x720');
  if (!fs.existsSync(imageDir)) {
    errors.push({ type: 'missing_youtube_ready_1280x720', imageDir });
  }

  const requiredTextFiles = [
    'ALL_THUMBNAIL_TITLES.txt',
    'description.txt',
    'pinned_comment.txt',
    'tags.txt',
    'thumbnail_manifest.json',
    'READY_PACKAGE_MANIFEST.json',
    'fresh_generation_manifest.json',
    'thumbnail_gate_report.md',
    'ALL_VIDEO_DESCRIPTIONS.txt',
  ];
  for (const relative of requiredTextFiles) {
    checkTextFile(requireFile(readyDir, relative, errors), errors);
  }

  requireFile(readyDir, 'contact_sheet.jpg', errors);

  let images = [];
  if (fs.existsSync(imageDir)) {
    images = fs.readdirSync(imageDir)
      .filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name))
      .map((name) => path.join(imageDir, name))
      .sort();
  }
  if (images.length < 6) {
    errors.push({ type: 'too_few_final_thumbnails', count: images.length, minimum: 6 });
  }

  for (const image of images) {
    await checkImage(image, errors);
    const titlesFile = image.replace(/\.(jpg|jpeg|png|webp)$/i, '.titles.txt');
    if (!fs.existsSync(titlesFile)) {
      errors.push({ type: 'missing_titles_sidecar', image, titlesFile });
      continue;
    }
    const titleText = readText(titlesFile);
    const titleLines = titleText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (titleLines.length < 6) {
      errors.push({ type: 'too_few_titles', titlesFile, count: titleLines.length, minimum: 6 });
    }
    if (titleLines.some((line) => !ENGLISH_SIGNAL_RE.test(line))) {
      errors.push({ type: 'title_missing_english_language_signal', titlesFile });
    }
    checkTextFile(titlesFile, errors);
    const descriptionFile = image.replace(/\.(jpg|jpeg|png|webp)$/i, '.description.txt');
    if (!fs.existsSync(descriptionFile)) {
      errors.push({ type: 'missing_description_sidecar', image, descriptionFile });
    } else {
      checkDescriptionFile(descriptionFile, errors);
    }
  }

  checkDescriptionFile(path.join(readyDir, 'description.txt'), errors);
  checkDescriptionFile(path.join(readyDir, 'ALL_VIDEO_DESCRIPTIONS.txt'), errors);

  checkReadyManifest(readyDir, errors);
  checkFreshManifest(readyDir, images.length, errors, { allowReusedImages: Boolean(args['allow-reused-images']) });

  const report = {
    status: errors.length ? 'failed' : 'ready',
    readyDir,
    finalThumbnailCount: images.length,
    errorCount: errors.length,
    errors,
  };
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
