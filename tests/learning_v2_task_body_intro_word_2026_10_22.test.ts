// зачем (владелец 22.10 через координатора, колонка «Предлагаем» learning-v2-tasks-review.html, реестр №23): «Новое слово» — перевод сразу на карточке, без «переверни»; интро — ситуация, «Скажи так», «почему».
// Контракт исходников (раскладку на экране мерит Сверка).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('«Новое слово» и интро', () => {
  const nw = code(read('components/learning-v2/LearningV2NewWordEncounterOverlay.tsx'));
  const intro = code(read('app/learning_v2_session_intro.tsx'));

  it('новое слово: перевод сразу на карточке («/hɪə/ · здесь»), подсказки «переверни» и авто-переворота нет; «Понятно» на 9 языках', () => {
    // владелец 22.10: на карточке — слово и ТОЛЬКО перевод (без транскрипции и примера)
    expect(nw).toContain('transcription: exactTranslation,');
    expect(nw).not.toContain('.join(" · ")');
    expect(nw).not.toContain('learningV2NewWordFlipHintV1(locale)');
    expect(nw).not.toContain('controller.arm()');
    const copy = read('app/learning_v2_new_word_encounter_copy.ts');
    for (const word of ['Понятно', 'Зрозуміло', 'Entendido', 'Got it', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem']) expect(copy).toContain(`continue: "${word}"`);
  });

  it('интро: ситуация, «Скажи так» с разбором по словам и одна строка «почему»; нет фразы — прежняя карточка', () => {
    // зачем (Сверка 22.10, 🔴): текст для разбора — из строк экрана (адаптер новых занятий кладёт текст в lines, а не в textRU)
    expect(intro).toContain('const sayBody = lines.map(lineText).join(" ").trim();');
    expect(intro).toContain('learningV2IntroSayPartsForPageV1({ pageId: screen.screenId ?? "", body: sayBody, interfaceLocale: lang })');
    expect(intro).toContain('"[V2-INTRO-PARTS]"');
    expect(intro).toContain('<LearningV2SayCard');
    expect(intro).toContain('kicker={learningV2TaskBodyCopy(lang, "sayThis")}');
    expect(intro).toContain('chips={sayParts.parts}');
    expect(intro).toContain('<IntroWhy text={sayParts.why} color={g.secondary} />');
    expect(intro).toContain('sx.knowledgeFlow, lv2CardStyle(g)');
  });
});
