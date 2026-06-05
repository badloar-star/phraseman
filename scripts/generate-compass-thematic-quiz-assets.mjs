import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'assets', 'images', 'quizzes');
const CARD_DIR = path.join(OUT_ROOT, 'theme_cards');
const LOGO_DIR = path.join(OUT_ROOT, 'theme_logos');
const CARD_W = 640;
const CARD_H = 236;
const LOGO_SIZE = 260;

const CATEGORIES = {
  'kitchen-and-cooking': {
    label: 'Kitchen',
    object: 'chef_hat',
    accent: '#F4B978',
    accent2: '#FFE6B5',
    copper: '#B4774E',
    dev: false,
  },
  'home-and-rooms': {
    label: 'Home',
    object: 'house',
    accent: '#FFE6B5',
    accent2: '#F2C48D',
    copper: '#A66B47',
    dev: false,
  },
  'at-the-doctor': {
    label: 'Doctor',
    object: 'medical_case',
    accent: '#F6CF98',
    accent2: '#FFF1C8',
    copper: '#B4774E',
    dev: true,
  },
  'body-and-health': {
    label: 'Health',
    object: 'heart_badge',
    accent: '#FFD7A0',
    accent2: '#FFF0C6',
    copper: '#C07A58',
    dev: true,
  },
  'shopping-and-money': {
    label: 'Shop',
    object: 'coin_tag',
    accent: '#F2C48D',
    accent2: '#FFE6B5',
    copper: '#A66B47',
    dev: true,
  },
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[char]));
}

function objectSvg(kind, id, x = 0, y = 0, scale = 1) {
  const a = esc(id.accent);
  const b = esc(id.accent2);
  const c = esc(id.copper);
  const dark = '#181819';
  const transform = `translate(${x} ${y}) scale(${scale})`;

  if (kind === 'chef_hat') {
    return `
      <g transform="${transform}">
        <ellipse cx="98" cy="154" rx="86" ry="28" fill="#050506" opacity=".36"/>
        <path d="M54 118c-26-17-18-56 16-57 8-33 52-38 68-8 34-17 73 11 59 46 26 8 33 44 5 61H61c-20-5-25-29-7-42z" fill="url(#cream)" stroke="${c}" stroke-width="5"/>
        <path d="M69 126h119v45c0 17-13 27-31 27H99c-18 0-30-10-30-27z" fill="url(#warm)" stroke="${c}" stroke-width="5"/>
        <path d="M103 131c16 16 25 24 25 24s20-32 43-54" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M79 72c14 18 15 40 8 58M139 56c14 24 9 51-2 76M184 89c-14 11-22 25-24 43" fill="none" stroke="#FFF4D8" stroke-width="6" opacity=".58" stroke-linecap="round"/>
      </g>`;
  }

  if (kind === 'house') {
    return `
      <g transform="${transform}">
        <ellipse cx="104" cy="166" rx="84" ry="26" fill="#050506" opacity=".34"/>
        <path d="M38 112l68-61 70 61v67c0 14-11 25-25 25H63c-14 0-25-11-25-25z" fill="url(#cream)" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M22 118l84-78 87 78" fill="none" stroke="${b}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 118l84-78 87 78" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="89" y="132" width="36" height="72" rx="10" fill="${dark}" stroke="${c}" stroke-width="5"/>
        <rect x="136" y="126" width="34" height="34" rx="8" fill="#FFF1C8" stroke="${c}" stroke-width="5"/>
        <path d="M61 117h26M146 92h24" stroke="#FFFFFF" opacity=".65" stroke-width="6" stroke-linecap="round"/>
      </g>`;
  }

  if (kind === 'medical_case') {
    return `
      <g transform="${transform}">
        <ellipse cx="108" cy="165" rx="88" ry="27" fill="#050506" opacity=".36"/>
        <rect x="39" y="77" width="138" height="112" rx="24" fill="url(#cream)" stroke="${c}" stroke-width="5"/>
        <path d="M79 78V64c0-13 10-24 24-24h11c14 0 24 11 24 24v14" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
        <path d="M109 104v59M80 134h59" stroke="${c}" stroke-width="17" stroke-linecap="round"/>
        <path d="M57 97h99M57 175h98" stroke="#FFFFFF" opacity=".48" stroke-width="6" stroke-linecap="round"/>
      </g>`;
  }

  if (kind === 'heart_badge') {
    return `
      <g transform="${transform}">
        <ellipse cx="108" cy="166" rx="83" ry="26" fill="#050506" opacity=".34"/>
        <path d="M108 190C50 148 32 114 49 82c14-26 48-24 59-2 12-22 46-24 60 2 17 32-1 66-60 108z" fill="url(#cream)" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M108 103v48M84 127h48" stroke="${c}" stroke-width="14" stroke-linecap="round"/>
        <path d="M69 82c19-13 42-4 49 20" stroke="#FFFFFF" opacity=".55" stroke-width="7" stroke-linecap="round"/>
        <circle cx="163" cy="62" r="14" fill="${a}" stroke="${c}" stroke-width="4"/>
      </g>`;
  }

  return `
    <g transform="${transform}">
      <ellipse cx="108" cy="166" rx="88" ry="27" fill="#050506" opacity=".35"/>
      <path d="M52 79h101c15 0 27 12 27 27v60c0 15-12 27-27 27H52c-15 0-27-12-27-27v-60c0-15 12-27 27-27z" fill="url(#cream)" stroke="${c}" stroke-width="5"/>
      <path d="M139 80l43 45-43 45" fill="url(#warm)" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="136" cy="125" r="12" fill="#191919" opacity=".9"/>
      <circle cx="73" cy="137" r="35" fill="url(#coin)" stroke="${c}" stroke-width="5"/>
      <path d="M61 127c12-13 32-9 35 7 2 14-11 26-30 17" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <path d="M55 98h70" stroke="#FFFFFF" opacity=".48" stroke-width="6" stroke-linecap="round"/>
    </g>`;
}

function svgShell(width, height, body, defsExtra = '') {
  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#343233"/>
      <stop offset=".58" stop-color="#1B1B1C"/>
      <stop offset="1" stop-color="#090909"/>
    </linearGradient>
    <linearGradient id="recess" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#252426"/>
      <stop offset="1" stop-color="#101011"/>
    </linearGradient>
    <linearGradient id="cream" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF6D8"/>
      <stop offset=".48" stop-color="#F4B978"/>
      <stop offset="1" stop-color="#A66B47"/>
    </linearGradient>
    <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE6B5"/>
      <stop offset="1" stop-color="#B4774E"/>
    </linearGradient>
    <linearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF2BD"/>
      <stop offset=".55" stop-color="#F2C48D"/>
      <stop offset="1" stop-color="#B4774E"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-30%" width="150%" height="170%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000000" flood-opacity=".42"/>
    </filter>
    ${defsExtra}
  </defs>
  ${body}
</svg>`);
}

function cardSvg(slug, spec) {
  const object = objectSvg(spec.object, spec, 386, 6, 1.02);
  const body = `
    <rect width="${CARD_W}" height="${CARD_H}" rx="30" fill="url(#bg)"/>
    <rect x="18" y="18" width="604" height="200" rx="22" fill="url(#recess)" stroke="rgba(255,230,181,.24)" stroke-width="1"/>
    <rect x="30" y="32" width="316" height="172" rx="18" fill="#121213" opacity=".82"/>
    <path d="M43 43h288" stroke="rgba(255,255,255,.10)" stroke-width="2" stroke-linecap="round"/>
    <path d="M44 197h284" stroke="rgba(0,0,0,.65)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="484" cy="111" r="116" fill="${esc(spec.accent)}" opacity=".08"/>
    <circle cx="558" cy="24" r="72" fill="${esc(spec.accent2)}" opacity=".10"/>
    <g opacity=".9">
      <path d="M56 76h112M56 104h174M56 132h132" stroke="rgba(255,230,181,.14)" stroke-width="9" stroke-linecap="round"/>
      <rect x="56" y="158" width="150" height="20" rx="10" fill="${esc(spec.accent)}" opacity=".20"/>
    </g>
    <g filter="url(#softShadow)">${object}</g>
    <path d="M18 48c72-26 137-28 214-9" stroke="rgba(255,246,216,.13)" stroke-width="4" stroke-linecap="round"/>
    <path d="M533 45l12-17 12 17 17 12-17 12-12 17-12-17-17-12z" fill="${esc(spec.accent2)}" opacity=".8"/>
    <circle cx="590" cy="178" r="6" fill="${esc(spec.copper)}" opacity=".85"/>
  `;
  return svgShell(CARD_W, CARD_H, body);
}

function logoSvg(slug, spec) {
  const object = objectSvg(spec.object, spec, 29, 25, 0.86);
  const devMark = spec.dev
    ? `<g>
        <rect x="154" y="20" width="74" height="32" rx="10" fill="#1B1815" stroke="${esc(spec.accent)}" stroke-width="2"/>
        <text x="191" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" fill="${esc(spec.accent2)}">DEV</text>
      </g>`
    : '';
  const body = `
    <rect width="${LOGO_SIZE}" height="${LOGO_SIZE}" fill="none"/>
    <circle cx="130" cy="133" r="94" fill="#101011" opacity=".92"/>
    <circle cx="130" cy="133" r="84" fill="url(#recess)" stroke="rgba(255,230,181,.24)" stroke-width="2"/>
    <path d="M65 77c38-28 94-30 133-3" stroke="rgba(255,246,216,.14)" stroke-width="6" stroke-linecap="round"/>
    <g filter="url(#softShadow)">${object}</g>
    <circle cx="55" cy="190" r="7" fill="${esc(spec.copper)}" opacity=".8"/>
    <path d="M203 70l8-12 9 12 12 8-12 9-9 12-8-12-12-9z" fill="${esc(spec.accent2)}" opacity=".82"/>
    ${devMark}
  `;
  return svgShell(LOGO_SIZE, LOGO_SIZE, body);
}

async function writeAsset(buffer, outPath, options) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(buffer)
    .webp({ quality: 92, alphaQuality: 95 })
    .toFile(outPath);
  const meta = await sharp(outPath).metadata();
  if (meta.width !== options.width || meta.height !== options.height) {
    throw new Error(`${outPath} wrote ${meta.width}x${meta.height}, expected ${options.width}x${options.height}`);
  }
}

for (const [slug, spec] of Object.entries(CATEGORIES)) {
  const cardOut = path.join(CARD_DIR, `quiz-theme-${slug}-compass-premium.webp`);
  const logoOut = path.join(LOGO_DIR, `quiz-theme-${slug}-compass-premium.webp`);
  await writeAsset(cardSvg(slug, spec), cardOut, { width: CARD_W, height: CARD_H });
  await writeAsset(logoSvg(slug, spec), logoOut, { width: LOGO_SIZE, height: LOGO_SIZE });
  console.log(`wrote ${path.relative(ROOT, cardOut)}`);
  console.log(`wrote ${path.relative(ROOT, logoOut)}`);
}
