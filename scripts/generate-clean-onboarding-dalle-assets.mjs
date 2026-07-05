import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { requireCodexOpenAiTtsOnly } from './openai-dev-guard.mjs';

const root = process.cwd();
const outputDir = path.join(root, 'assets', 'images', 'flow_clean_202607');
const manifestPath = path.join(outputDir, 'manifest.json');

function readDotEnv(file) {
  return fs.readFile(file, 'utf8')
    .then((text) => {
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        const [, key, raw] = match;
        if (process.env[key]) continue;
        process.env[key] = raw.replace(/^['"]|['"]$/g, '');
      }
    })
    .catch(() => {});
}

const style = [
  'Phraseman onboarding icon, friendly premium mobile app illustration',
  'liquid glass object, soft midnight-to-lavender highlights, rounded shapes',
  'no text, no letters, no logo, no mascot, transparent background',
  'centered composition, readable at 48px, polished app-store quality',
].join(', ');

const assets = [
  ['source_tiktok.png', 'music-note shaped short video tile with playful motion streaks'],
  ['source_store.png', 'app store bag and tiny app cards on liquid glass'],
  ['source_social.png', 'social story frame with camera sparkle and chat bubble'],
  ['source_youtube.png', 'video play tile with short-form vertical clips'],
  ['source_google.png', 'search lens over small phrase cards'],
  ['source_friends.png', 'two friendly chat bubbles recommending an app'],
  ['source_other.png', 'three-dot discovery bubble with small compass spark'],
  ['language_en.png', 'English learning icon with London book, speech bubbles, tiny flag colors'],
  ['language_fr.png', 'French learning icon with Paris cafe book, croissant, speech bubbles'],
  ['level_a0.png', 'single glowing step bar starting from zero'],
  ['level_a1.png', 'two simple vocabulary blocks building upward'],
  ['level_a2.png', 'small conversation bridge between two bubbles'],
  ['level_b1.png', 'confident speaking bars with a phrase card'],
  ['level_b2.png', 'detailed discussion wave with precise sparkle marks'],
  ['goal_series.png', 'movie subtitle card turning into sound waves'],
  ['goal_everyday.png', 'everyday chat bubbles for quick replies'],
  ['goal_travel.png', 'suitcase, ticket and cafe cup for travel phrases'],
  ['goal_words.png', 'stack of practical phrase cubes'],
  ['goal_mind.png', 'calm study notebook with gentle focus glow'],
  ['minutes_5.png', 'tiny five-minute timer with leaf'],
  ['minutes_10.png', 'ten-minute balanced timer with two phrase cards'],
  ['minutes_15.png', 'fifteen-minute lightning timer with practice cards'],
  ['minutes_20.png', 'twenty-minute focused rocket timer with route line'],
  ['intro_compass.png', 'friendly compass made of phrase cards and glass highlights'],
  ['mini_aha.png', 'spoken phrase card with sound button and answer chips'],
  ['notifications.png', 'notification bell with small habit calendar'],
  ['trial_reminder.png', 'trial reminder bell with calendar day marker'],
  ['plan_result.png', 'personal learning route map with checkpoints'],
  ['start_plus.png', 'premium route unlocked with glowing map'],
  ['start_free.png', 'simple starter route with first lesson card'],
  ['benefit_plan.png', 'daily route checklist with map pin'],
  ['benefit_speech.png', 'sound wave and speaking bubble'],
  ['benefit_repeat.png', 'repeat loop around phrase cards'],
  ['benefit_flow.png', 'open path without stop gates'],
  ['paywall_yearly.png', 'yearly plan calendar with highlighted route'],
  ['paywall_monthly.png', 'monthly plan calendar page with flexible switch'],
  ['paywall_lifetime.png', 'forever access key over phrase map'],
];

function promptFor(description) {
  return `${style}. Subject: ${description}.`;
}

async function generateOne(apiKey, filename, prompt) {
  const body = {
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    quality: 'low',
    background: 'transparent',
    output_format: 'png',
  };
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`image_api_${response.status}: ${text.slice(0, 400)}`);
  }
  const json = await response.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`image_api_no_b64:${filename}`);
  const raw = Buffer.from(b64, 'base64');
  const out = path.join(outputDir, filename);
  await sharp(raw)
    .resize(512, 512, { fit: 'contain' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
}

async function localFallback(filename, label) {
  const svg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#E3ECFF"/>
        <stop offset="0.48" stop-color="#7B8CFF"/>
        <stop offset="1" stop-color="#C95CFF"/>
      </linearGradient>
      <filter id="s"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#7B8CFF" flood-opacity=".28"/></filter>
    </defs>
    <rect width="512" height="512" fill="none"/>
    <path filter="url(#s)" d="M112 156c34-58 104-78 166-56 49 17 88 13 119 50 41 49 27 128-24 171-47 39-78 93-155 82-74-10-132-61-136-132-2-38 11-82 30-115Z" fill="url(#g)" opacity=".92"/>
    <circle cx="180" cy="184" r="24" fill="#fff" opacity=".78"/>
    <circle cx="331" cy="318" r="34" fill="#fff" opacity=".34"/>
    <text x="256" y="276" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#07111F">${label}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(outputDir, filename));
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await readDotEnv(path.join(root, '.env.local'));
  const apiKey = process.env.OPENAI_API_KEY;
  const force = process.argv.includes('--force');
  const allowFallback = process.argv.includes('--fallback');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : assets.length;
  if (apiKey && !allowFallback) {
    requireCodexOpenAiTtsOnly({
      action: 'Clean onboarding OpenAI image asset generation',
      endpoint: 'images/generations',
    });
  }
  if (!apiKey && !allowFallback) throw new Error('OPENAI_API_KEY is missing');

  const manifest = [];
  let generated = 0;
  for (const [filename, description] of assets.slice(0, limit)) {
    const out = path.join(outputDir, filename);
    const exists = await fs.stat(out).then(() => true).catch(() => false);
    if (exists && !force) {
      manifest.push({ filename, status: 'kept' });
      continue;
    }
    const prompt = promptFor(description);
    try {
      if (!apiKey) throw new Error('missing_api_key');
      await generateOne(apiKey, filename, prompt);
      manifest.push({ filename, status: 'generated', prompt });
    } catch (err) {
      if (!allowFallback) throw err;
      const label = filename.replace(/\.png$/, '').split('_').slice(-1)[0].toUpperCase().slice(0, 3);
      await localFallback(filename, label);
      manifest.push({ filename, status: 'fallback', error: String(err).slice(0, 220), prompt });
    }
    generated += 1;
    process.stdout.write(`asset ${generated}/${Math.min(limit, assets.length)} ${filename}\n`);
  }
  await fs.writeFile(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: apiKey ? 'gpt-image-1' : 'local-fallback',
    count: manifest.length,
    assets: manifest,
  }, null, 2));
  process.stdout.write(`done ${manifest.length} assets -> ${outputDir}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
