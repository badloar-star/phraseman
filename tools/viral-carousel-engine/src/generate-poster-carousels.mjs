import fs from "fs";
import path from "path";
import sharp from "sharp";

const WIDTH = 1080;
const HEIGHT = 1350;
const BATCH = "poster_skill_3_2026-06-12";
const CTA = "Скачивай бесплатно по ссылке в шапке профиля.";

function escXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function measureText(text, size) {
  let units = 0;
  for (const ch of text) {
    if (ch === " ") units += 0.34;
    else if (".,:;!?()[]{}'\"-–—".includes(ch)) units += 0.28;
    else if (/[A-ZА-ЯЁ]/.test(ch)) units += 0.68;
    else if (/[A-Za-z]/.test(ch)) units += 0.55;
    else if (/[0-9]/.test(ch)) units += 0.56;
    else units += 0.62;
  }
  return units * size;
}

function wrapParagraph(paragraph, size, maxWidth) {
  const words = paragraph.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapText(text, size, maxWidth) {
  return String(text).split("\n").flatMap((paragraph) => wrapParagraph(paragraph, size, maxWidth));
}

function fitText(text, maxWidth, maxHeight, startSize, minSize, lineHeight) {
  for (let size = startSize; size >= minSize; size -= 1) {
    const lines = wrapText(text, size, maxWidth);
    const height = lines.length * size * lineHeight;
    if (height <= maxHeight && lines.every((line) => measureText(line, size) <= maxWidth + 4)) {
      return { size, lines, height };
    }
  }
  const lines = wrapText(text, minSize, maxWidth);
  return { size: minSize, lines, height: lines.length * minSize * lineHeight };
}

function tspans(lines, x, size, lineHeight) {
  return lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${escXml(line)}</tspan>`)
    .join("");
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const palettes = {
  aurora: {
    name: "aurora-lime-cobalt",
    bg: "#081018",
    bg2: "#101a2b",
    text: "#f8fff6",
    muted: "#c8d6d2",
    accent: "#d9f056",
    accent2: "#22d3ee",
    accent3: "#7c3aed",
    card: "#ffffff",
    cardText: "#07100d",
  },
  editorial: {
    name: "warm-editorial-emerald-coral",
    bg: "#f4eadc",
    bg2: "#fff9ef",
    text: "#14100c",
    muted: "#50463d",
    accent: "#0f9f6e",
    accent2: "#ff6b4a",
    accent3: "#243b6b",
    card: "#101211",
    cardText: "#f7f2e9",
  },
  voltage: {
    name: "electric-blue-orange",
    bg: "#071126",
    bg2: "#132b5f",
    text: "#f8fbff",
    muted: "#c8d5ee",
    accent: "#ff8a00",
    accent2: "#3b82f6",
    accent3: "#facc15",
    card: "#f8fbff",
    cardText: "#071126",
  },
};

function gradientDefs(palette) {
  return `
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg}"/>
      <stop offset="100%" stop-color="${palette.bg2}"/>
    </linearGradient>
    <radialGradient id="orbGrad" cx="34%" cy="28%" r="74%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="38%" stop-color="${palette.accent}" stop-opacity="0.96"/>
      <stop offset="72%" stop-color="${palette.accent2}" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="${palette.bg}" stop-opacity="0.98"/>
    </radialGradient>
    <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="36%" stop-color="${palette.accent2}"/>
      <stop offset="62%" stop-color="${palette.accent}"/>
      <stop offset="100%" stop-color="#080808"/>
    </linearGradient>
    <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="#000000" flood-opacity="0.42"/>
    </filter>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="34" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M 54 0 L 0 0 0 54" fill="none" stroke="${palette.text}" stroke-opacity="0.06" stroke-width="2"/>
    </pattern>`;
}

function objectSvg(type, palette, x = 650, y = 560, scale = 1) {
  const s = scale;
  const common = `filter="url(#softShadow)" transform="translate(${x} ${y}) scale(${s})"`;
  if (type === "orb") {
    return `<g ${common}>
      <circle cx="110" cy="130" r="178" fill="url(#orbGrad)"/>
      <ellipse cx="40" cy="18" rx="92" ry="34" fill="#ffffff" opacity="0.42" transform="rotate(-28)"/>
      <circle cx="180" cy="64" r="34" fill="${palette.accent3}" opacity="0.72"/>
      <path d="M-70,165 C40,250 190,246 310,150" fill="none" stroke="${palette.text}" stroke-opacity="0.24" stroke-width="24" stroke-linecap="round"/>
    </g>`;
  }
  if (type === "cube") {
    return `<g ${common}>
      <path d="M40 60 L206 0 L360 92 L190 164 Z" fill="${palette.accent}" opacity="0.95"/>
      <path d="M190 164 L360 92 L360 292 L190 380 Z" fill="${palette.accent2}" opacity="0.9"/>
      <path d="M40 60 L190 164 L190 380 L40 260 Z" fill="${palette.card}" opacity="0.9"/>
      <path d="M40 60 L206 0 L360 92 L190 164 Z M190 164 L190 380 M190 164 L360 92" fill="none" stroke="${palette.text}" stroke-opacity="0.38" stroke-width="8"/>
      <circle cx="282" cy="205" r="48" fill="${palette.accent3}" opacity="0.85"/>
    </g>`;
  }
  if (type === "phone") {
    return `<g ${common}>
      <rect x="20" y="0" width="250" height="430" rx="46" fill="url(#metalGrad)" stroke="${palette.text}" stroke-opacity="0.28" stroke-width="8"/>
      <rect x="48" y="54" width="194" height="292" rx="26" fill="${palette.bg}" opacity="0.78"/>
      <circle cx="146" cy="386" r="20" fill="${palette.card}" opacity="0.8"/>
      <path d="M78 120 H214 M78 178 H184 M78 236 H222" stroke="${palette.accent}" stroke-width="16" stroke-linecap="round"/>
      <circle cx="218" cy="78" r="34" fill="${palette.accent2}" filter="url(#glow)"/>
    </g>`;
  }
  if (type === "chat") {
    return `<g ${common}>
      <path d="M30 50 Q30 0 84 0 H332 Q386 0 386 54 V210 Q386 264 332 264 H154 L66 346 L86 264 H84 Q30 264 30 210 Z" fill="${palette.card}" opacity="0.96"/>
      <path d="M94 88 H306 M94 142 H274 M94 196 H326" stroke="${palette.cardText}" stroke-width="20" stroke-linecap="round" opacity="0.9"/>
      <circle cx="344" cy="16" r="44" fill="${palette.accent}" filter="url(#glow)"/>
    </g>`;
  }
  if (type === "clock") {
    return `<g ${common}>
      <circle cx="190" cy="190" r="170" fill="url(#metalGrad)"/>
      <circle cx="190" cy="190" r="126" fill="${palette.card}" opacity="0.96"/>
      <path d="M190 108 V194 L262 242" stroke="${palette.cardText}" stroke-width="18" stroke-linecap="round" fill="none"/>
      <circle cx="190" cy="190" r="14" fill="${palette.accent}"/>
      <path d="M70 52 L20 2 M310 52 L360 2" stroke="${palette.accent2}" stroke-width="24" stroke-linecap="round"/>
    </g>`;
  }
  if (type === "rocket") {
    return `<g ${common}>
      <path d="M214 0 C330 76 336 224 228 340 L116 228 C-2 120 90 16 214 0Z" fill="url(#metalGrad)"/>
      <circle cx="204" cy="124" r="52" fill="${palette.bg}" stroke="${palette.text}" stroke-opacity="0.42" stroke-width="10"/>
      <path d="M106 242 L30 340 L158 300 Z" fill="${palette.accent2}"/>
      <path d="M242 264 L212 416 L324 304 Z" fill="${palette.accent3}"/>
      <path d="M82 324 C60 390 22 432 -44 462 C-6 388 20 346 82 324Z" fill="${palette.accent}" filter="url(#glow)"/>
    </g>`;
  }
  return `<g ${common}><circle cx="160" cy="160" r="160" fill="url(#orbGrad)"/></g>`;
}

function renderSlide(carousel, slide, index) {
  const palette = carousel.palette;
  const dark = palette.bg.startsWith("#0");
  const safeX = 76;
  const safeTop = 114;
  const textWidth = slide.fullWidth ? 860 : 610;
  const titleFit = fitText(slide.title, textWidth, 430, slide.big ? 90 : 76, 44, 0.98);
  const bodyFit = fitText(slide.body, textWidth, 310, 38, 24, 1.27);
  const titleY = safeTop + titleFit.size;
  const bodyY = safeTop + titleFit.height + 72 + bodyFit.size;
  const label = slide.label || carousel.styleMode.toUpperCase();
  const object = objectSvg(slide.object, palette, slide.objectX ?? 628, slide.objectY ?? 645, slide.objectScale ?? 1);
  const bgTexture = dark
    ? `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/><circle cx="980" cy="132" r="310" fill="${palette.accent}" opacity="0.14" filter="url(#glow)"/>`
    : `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)" opacity="0.75"/><circle cx="1020" cy="1180" r="380" fill="${palette.accent2}" opacity="0.12" filter="url(#glow)"/>`;
  const prompt = buildPrompt(carousel, slide, index);

  return {
    prompt,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>${gradientDefs(palette)}</defs>
  ${bgTexture}
  ${object}
  <rect x="52" y="76" width="${textWidth + 52}" height="760" rx="38" fill="${dark ? "#000000" : "#ffffff"}" opacity="${dark ? "0.10" : "0.20"}"/>
  <text x="${safeX}" y="86" fill="${palette.accent}" font-family="Arial Narrow, Impact, Arial, sans-serif" font-size="28" font-weight="900" letter-spacing="4">${escXml(label)}</text>
  <text x="${safeX}" y="${titleY}" fill="${palette.text}" font-family="Arial Narrow, Impact, Arial, sans-serif" font-size="${titleFit.size}" font-weight="900" letter-spacing="0">
    ${tspans(titleFit.lines, safeX, titleFit.size, 0.98)}
  </text>
  <text x="${safeX}" y="${bodyY}" fill="${palette.muted}" font-family="Segoe UI, Arial, sans-serif" font-size="${bodyFit.size}" font-weight="600" letter-spacing="0">
    ${tspans(bodyFit.lines, safeX, bodyFit.size, 1.27)}
  </text>
  <rect x="76" y="1192" width="330" height="54" rx="27" fill="${palette.accent}" opacity="0.92"/>
  <text x="104" y="1228" fill="${dark ? "#07100d" : "#ffffff"}" font-family="Arial Narrow, Impact, Arial, sans-serif" font-size="28" font-weight="900" letter-spacing="1">Phraseman</text>
  <path d="M886 1208 H1002 M962 1170 L1002 1208 L962 1246" stroke="${palette.text}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.78"/>
</svg>`,
  };
}

function buildPrompt(carousel, slide, index) {
  return [
    `[CRITICAL INSTRUCTION - TEXT SAFE ZONES] 1080x1350 vertical Instagram carousel poster. Keep all readable text inside a 76px left/right safe zone and 76px top/bottom safe zone. Text must be horizontal, crisp, and readable.`,
    `[STYLE MODE] ${carousel.styleMode}. Palette: ${carousel.palette.name}; background ${carousel.palette.bg}/${carousel.palette.bg2}; accent ${carousel.palette.accent}, ${carousel.palette.accent2}, ${carousel.palette.accent3}. Do not copy a black-white-red reference literally; use this palette.`,
    `[TYPOGRAPHY] Condensed heavy poster typography, bold editorial hierarchy, high contrast, no tiny decorative labels except one short category label.`,
    `[HERO VISUAL] Large premium pseudo-3D ${slide.object} object, glossy material, cinematic shadows, positioned so it does not cover headline.`,
    `[SLIDE CONTENT] Title: "${slide.title.replaceAll("\n", " ")}" Body: "${slide.body.replaceAll("\n", " ")}"`,
    `[BRAND RULE] Product name is exactly Phraseman. No logo needed. No slide counters. No footer slogans.`,
    `[OUTPUT] Slide ${index + 1} of a cohesive carousel, poster-quality, suitable for Russian-speaking English learners.`,
  ].join("\n\n");
}

const carousels = [
  {
    id: "001",
    slug: "english-freeze-poster",
    title: "Английский исчезает в разговоре",
    styleMode: "Emergence",
    palette: palettes.aurora,
    slides: [
      { label: "REAL ENGLISH", title: "Английский есть.\nОтвета нет.", body: "Ты всё понял, но рот не запускается. Это не тупость. Это отсутствие готового первого хода.", object: "orb", big: true },
      { label: "PAIN", title: "Ты не забываешь слова.\nТы ищешь вход.", body: "В разговоре нужен не словарь, а фраза-мост: короткая, живая, уже готовая.", object: "cube" },
      { label: "RUSSIAN BRAIN", title: "Перевод с русского\nсъедает секунды", body: "Пока мозг собирает идеальную грамматику, собеседник уже ждёт реакцию.", object: "clock" },
      { label: "FIRST MOVE", title: "Начинай не с ответа,\nа с паузы", body: "That's a good question.\nLet me think for a second.\nWhat I mean is...", object: "chat" },
      { label: "PRACTICE", title: "Фразы надо\nпроговаривать", body: "Пассивный английский узнаёт. Активный английский достаёт фразу в нужную секунду.", object: "phone" },
      { label: "SHIFT", title: "Тренируй момент,\nа не правило", body: "Правило помогает после разговора. Фраза помогает внутри разговора.", object: "rocket" },
      { label: "SAVE THIS", title: "Твой минимум\nна любой вопрос", body: "Let me check.\nI’m not sure yet.\nCould you explain that?\nI’d say...", object: "cube" },
      { label: "APP", title: "Нужны готовые\nпервые ходы", body: `Phraseman — мобильное приложение с живыми фразами, озвучкой и короткой практикой. ${CTA}`, object: "orb" },
    ],
  },
  {
    id: "002",
    slug: "sounds-rude-poster",
    title: "Русская прямота в английском",
    styleMode: "Fever Dream Editorial",
    palette: palettes.editorial,
    slides: [
      { label: "TONE CHECK", title: "Ты хотел попросить.\nА звучишь как босс.", body: "На английском прямой перевод часто меняет тон сильнее, чем ты думаешь.", object: "chat", big: true },
      { label: "BAD SIGNAL", title: "Send me the file,\nplease.", body: "Слово please не всегда спасает, если сама конструкция звучит как приказ.", object: "cube" },
      { label: "BETTER", title: "Could you send me\nthe file?", body: "Мягкость часто живёт в could / would / chance, а не в одном please.", object: "phone" },
      { label: "NO PANIC", title: "I don’t understand you\nзвучит холодно", body: "Лучше: Sorry, I didn’t quite catch that. Ты говоришь о себе, а не обвиняешь человека.", object: "orb" },
      { label: "REFUSAL", title: "I can’t come\nможно мягче", body: "I'm afraid I can't make it today. Так отказ звучит взрослым, а не резким.", object: "clock" },
      { label: "RULE", title: "Не переводи просьбу.\nВыбирай тон.", body: "Русский смысл тот же. Английская упаковка другая.", object: "rocket" },
      { label: "MINI KIT", title: "3 мягких старта", body: "Could you...\nWould it be possible...\nIs there any chance...", object: "chat" },
      { label: "APP", title: "Чтобы просьба\nне звучала приказом", body: `Phraseman — мобильное приложение с живыми формулами, русскими объяснениями и аудио. ${CTA}`, object: "cube" },
    ],
  },
  {
    id: "003",
    slug: "hearing-native-poster",
    title: "Если не понял английский на слух",
    styleMode: "Video Game Emergency Kit",
    palette: palettes.voltage,
    slides: [
      { label: "EMERGENCY KIT", title: "Не понял английский\nна слух?", body: "Не говори только What? Держи фразы, которые спасают разговор без паники.", object: "clock", big: true },
      { label: "BUTTON 1", title: "Sorry,\nI didn’t catch that.", body: "Самая безопасная фраза, когда звук пролетел мимо.", object: "chat" },
      { label: "BUTTON 2", title: "Could you say it\na bit slower?", body: "Ты не просишь человека быть проще. Ты просишь темп.", object: "phone" },
      { label: "BUTTON 3", title: "What do you mean\nby that?", body: "Когда слова понятны, но смысл фразы всё равно мутный.", object: "orb" },
      { label: "BUTTON 4", title: "Could you write\nit down?", body: "Переводи хаос из звука в текст. Так мозгу легче собрать смысл.", object: "cube" },
      { label: "BUTTON 5", title: "So, you mean...?", body: "Проверяй смысл вслух. Это звучит уверенно, даже если ты не всё понял.", object: "rocket" },
      { label: "COMBO", title: "Не понял?\nСобери цепочку.", body: "I didn’t catch that.\nCould you say it slower?\nSo, you mean...?", object: "chat" },
      { label: "APP", title: "Слух тренируется\nфразами", body: `Phraseman — мобильное приложение с озвучкой живых фраз, повторением и понятными объяснениями. ${CTA}`, object: "phone" },
    ],
  },
];

function validate(carousel) {
  const errors = [];
  if (carousel.slides.length < 7 || carousel.slides.length > 10) errors.push(`${carousel.slug}: slide count must be 7-10`);
  const first = `${carousel.slides[0].title} ${carousel.slides[0].body}`;
  if (!/английск|English/i.test(first)) errors.push(`${carousel.slug}: first slide must mention English`);
  const last = `${carousel.slides.at(-1).title} ${carousel.slides.at(-1).body}`;
  if (!last.includes("Phraseman") || !last.includes("мобильное приложение") || !last.endsWith(CTA)) {
    errors.push(`${carousel.slug}: final slide missing required Phraseman CTA`);
  }
  return errors;
}

async function render() {
  const root = path.resolve("output", BATCH);
  fs.mkdirSync(root, { recursive: true });
  const manifest = [];

  for (const carousel of carousels) {
    const errors = validate(carousel);
    if (errors.length) throw new Error(errors.join("\n"));
    const dir = path.join(root, `post_${carousel.id}_${carousel.slug}`);
    fs.mkdirSync(dir, { recursive: true });
    const prompts = {
      metadata: {
        carousel_id: carousel.id,
        slug: carousel.slug,
        title: carousel.title,
        renderer: "local-svg-sharp-pseudo-3d",
        style_mode: carousel.styleMode,
        palette: carousel.palette.name,
        size: `${WIDTH}x${HEIGHT}`,
        critical_rules: [
          "Do not copy the sample palettes literally.",
          "Use text-safe zones.",
          "Keep all text horizontal and readable.",
          "Use a 3D object or hero visual on every slide.",
          "Product name must be exactly Phraseman.",
        ],
      },
      slides: [],
    };

    for (let i = 0; i < carousel.slides.length; i += 1) {
      const rendered = renderSlide(carousel, carousel.slides[i], i);
      const filename = `slide_${String(i + 1).padStart(2, "0")}.png`;
      const promptFilename = `slide_${String(i + 1).padStart(2, "0")}.prompt.json`;
      await sharp(Buffer.from(rendered.svg)).png({ compressionLevel: 9 }).toFile(path.join(dir, filename));
      const promptRecord = {
        slide: i + 1,
        file: filename,
        title: carousel.slides[i].title,
        body: carousel.slides[i].body,
        hero_object: carousel.slides[i].object,
        text_safe_zone_px: 76,
        renderer: "local-svg-sharp-pseudo-3d",
        palette: carousel.palette.name,
        style_mode: carousel.styleMode,
        prompt: rendered.prompt,
      };
      fs.writeFileSync(path.join(dir, promptFilename), JSON.stringify(promptRecord, null, 2), "utf8");
      prompts.slides.push(promptRecord);
    }

    fs.writeFileSync(path.join(dir, "prompts.json"), JSON.stringify(prompts, null, 2), "utf8");
    fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(carousel, null, 2), "utf8");
    fs.writeFileSync(path.join(dir, "caption.txt"), `${carousel.title}\n\n${carousel.slides.at(-1).body}`, "utf8");
    manifest.push({
      id: carousel.id,
      slug: carousel.slug,
      slides: carousel.slides.length,
      style_mode: carousel.styleMode,
      palette: carousel.palette.name,
      dir: path.relative(root, dir).replaceAll("\\", "/"),
    });
  }

  fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Generated ${carousels.length} poster carousels`);
  console.log(`Output: ${root}`);
}

render().catch((error) => {
  console.error(error);
  process.exit(1);
});
