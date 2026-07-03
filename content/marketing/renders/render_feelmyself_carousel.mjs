import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceImage = "C:/Users/badlo/.codex/generated_images/019f22a3-f208-7ea2-86e6-fbf9e070e9ac/ig_09c6d307afeb1d1f016a465628bb488191aed34ea10ca15c1c.png";
const outDir = path.join(root, "content/marketing/renders/2026-07-02_carousel_feelmyself");
const bgDir = path.join(outDir, "backgrounds");
const slideDir = path.join(outDir, "slides");

const W = 1080;
const H = 1350;
const gold = "#e8c566";
const cream = "#f4f1ea";
const muted = "#a4a5ae";
const red = "#f25656";
const black = "#0a0a0e";

const slides = [
  {
    kicker: "1/10",
    title: "Не говори\nI FEEL MYSELF",
    body: "Русский мозг переводит\n«чувствую себя» дословно.\nА английский так не работает.",
    gold: ["I FEEL MYSELF"],
    note: "ошибка: слово в слово",
  },
  {
    kicker: "2/10",
    title: "В чём ловушка",
    body: "«Myself» не нужен просто потому,\nчто по-русски есть «себя».\nВ английском фраза собирается иначе.",
    note: "не каждое «себя» = myself",
  },
  {
    kicker: "3/10",
    title: "Хочешь сказать:\n«мне хорошо»",
    body: "Говори проще:",
    phrase: "I feel good",
    translation: "ай фил гуд · я хорошо себя чувствую",
  },
  {
    kicker: "4/10",
    title: "Более спокойно",
    body: "Когда всё нормально,\nбез восторга и драмы:",
    phrase: "I feel fine",
    translation: "ай фил файн · всё нормально",
  },
  {
    kicker: "5/10",
    title: "После болезни\nили стресса",
    body: "Когда ты наконец\nпришёл в себя:",
    phrase: "I feel like myself again",
    translation: "ай фил лайк майселф эгейн",
  },
  {
    kicker: "6/10",
    title: "А когда можно\nfeel yourself?",
    body: "Чаще встречается отрицание.\nТо есть: «я сам не свой».",
    phrase: "I don't feel myself",
    translation: "ай доунт фил майселф",
  },
  {
    kicker: "7/10",
    title: "Не надо так",
    body: "I feel myself good\nI feel myself bad\nI feel myself tired",
    danger: true,
    note: "звучит не как живой английский",
  },
  {
    kicker: "8/10",
    title: "Надёжная схема",
    body: "I feel + adjective\n\nI feel good\nI feel tired\nI feel better",
    gold: ["I feel + adjective", "I feel good", "I feel tired", "I feel better"],
  },
  {
    kicker: "9/10",
    title: "Сохрани шпаргалку",
    body: "I feel good — мне хорошо\nI feel fine — всё нормально\nI feel better — мне лучше\nI feel like myself again — я пришёл в себя",
    compact: true,
  },
  {
    kicker: "10/10",
    title: "Это одна ошибка.\nВ приложении их тысячи.",
    body: "Phraseman подбирает план\nпод твою цель и показывает,\nкак говорить живыми фразами.",
    cta: "Подбери план за 2 минуты\nссылка в профиле",
  },
];

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function tspanLines(text, x, y, size, fill, weight = 700, lineGap = 1.08) {
  return String(text)
    .split("\n")
    .map((line, index) => {
      const dy = index === 0 ? 0 : size * lineGap;
      return `<tspan x="${x}" dy="${index === 0 ? 0 : dy}" fill="${fill}" font-size="${size}" font-weight="${weight}">${esc(line)}</tspan>`;
    })
    .join("");
}

function overlaySvg(slide) {
  const titleSize = slide.title.length > 34 ? 72 : 82;
  const bodySize = slide.compact ? 48 : 56;
  const titleY = slide.title.includes("\n") ? 300 : 335;
  const bodyY = slide.phrase ? 610 : 565;
  const phraseY = slide.phrase?.length > 19 ? 820 : 790;
  const phraseSize = slide.phrase?.length > 19 ? 58 : 78;
  const dangerFill = slide.danger ? red : cream;

  return `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${black}" stop-opacity="0.82"/>
        <stop offset="0.48" stop-color="${black}" stop-opacity="0.58"/>
        <stop offset="1" stop-color="${black}" stop-opacity="0.88"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#f7de8b"/>
        <stop offset="1" stop-color="#c2902e"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    <rect x="64" y="66" width="148" height="54" rx="27" fill="${gold}" opacity="0.95"/>
    <text x="138" y="103" text-anchor="middle" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="${black}">${slide.kicker}</text>
    <text x="1015" y="101" text-anchor="end" font-family="Arial, sans-serif" font-size="31" font-weight="700" fill="${gold}">PHRASEMAN</text>
    <text x="74" y="${titleY}" font-family="Arial, sans-serif">${tspanLines(slide.title, 74, titleY, titleSize, slide.danger ? red : cream, 800, 1.04)}</text>
    <text x="76" y="${bodyY}" font-family="Arial, sans-serif">${tspanLines(slide.body, 76, bodyY, bodySize, dangerFill, slide.danger ? 800 : 500, 1.18)}</text>
    ${slide.phrase ? `<text x="76" y="${phraseY}" font-family="Arial, sans-serif" font-size="${phraseSize}" font-weight="800" fill="url(#gold)">${esc(slide.phrase)}</text>` : ""}
    ${slide.translation ? `<text x="78" y="${phraseY + 82}" font-family="Arial, sans-serif" font-size="38" font-weight="500" fill="${muted}">${esc(slide.translation)}</text>` : ""}
    ${slide.note ? `<text x="76" y="1132" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="${gold}">${esc(slide.note)}</text>` : ""}
    ${slide.cta ? `<rect x="64" y="1078" width="952" height="172" rx="34" fill="url(#gold)"/><text x="540" y="1148" text-anchor="middle" font-family="Arial, sans-serif">${tspanLines(slide.cta, 540, 1148, 44, black, 800, 1.15)}</text>` : ""}
    <rect x="64" y="1264" width="952" height="6" rx="3" fill="${cream}" opacity="0.18"/>
    <rect x="64" y="1264" width="${Math.round(952 * (Number(slide.kicker.split('/')[0]) / 10))}" height="6" rx="3" fill="${gold}"/>
  </svg>`;
}

async function main() {
  await fs.mkdir(bgDir, { recursive: true });
  await fs.mkdir(slideDir, { recursive: true });
  await fs.copyFile(sourceImage, path.join(outDir, "dalle_contact_sheet.png"));

  const meta = await sharp(sourceImage).metadata();
  const cols = 5;
  const rows = 2;
  const panelW = Math.floor(meta.width / cols);
  const panelH = Math.floor(meta.height / rows);

  for (let index = 0; index < slides.length; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const bgPath = path.join(bgDir, `bg_${String(index + 1).padStart(2, "0")}.png`);
    const slidePath = path.join(slideDir, `slide_${String(index + 1).padStart(2, "0")}.png`);

    await sharp(sourceImage)
      .extract({
        left: col * panelW,
        top: row * panelH,
        width: col === cols - 1 ? meta.width - col * panelW : panelW,
        height: row === rows - 1 ? meta.height - row * panelH : panelH,
      })
      .resize(W, H, { fit: "cover" })
      .blur(0.3)
      .modulate({ saturation: 0.82, brightness: 0.72 })
      .png()
      .toFile(bgPath);

    await sharp(bgPath)
      .composite([{ input: Buffer.from(overlaySvg(slides[index])), top: 0, left: 0 }])
      .png({ compressionLevel: 9 })
      .toFile(slidePath);
  }

  const thumbs = await Promise.all(
    slides.map((_, index) =>
      sharp(path.join(slideDir, `slide_${String(index + 1).padStart(2, "0")}.png`))
        .resize(324, 405)
        .toBuffer()
    )
  );

  await sharp({
    create: {
      width: 324 * 5,
      height: 405 * 2,
      channels: 3,
      background: black,
    },
  })
    .composite(thumbs.map((input, index) => ({ input, left: (index % 5) * 324, top: Math.floor(index / 5) * 405 })))
    .jpeg({ quality: 86 })
    .toFile(path.join(outDir, "contact_sheet.jpg"));

  await fs.writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify(
      {
        sourceImage,
        copiedSource: path.join(outDir, "dalle_contact_sheet.png"),
        slideDir,
        count: slides.length,
        size: `${W}x${H}`,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
