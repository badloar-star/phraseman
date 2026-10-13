// зачем (Макеты d7cf7113d, образцы под замком; координатор 13.10): контракт по строкам файлов для правок Диалогов и журнала превью карточки.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Диалоги: значки и пилюля энергии (dialogs-003/004/007/008)', () => {
  it('«Дела» — document-text (в образце заливной документ `docF`), а не портфель', () => {
    const src = read('components/dialogs/DialogueV2CatalogueSection.tsx');
    expect(src).toContain("if (worldId === 'work') return 'document-text';");
    expect(src).not.toContain("'briefcase'");
  });
  it('молния пилюли заливная только у экранов Диалогов (solidBolt); Learning V2 и уроки не тронуты', () => {
    const bar = read('components/EnergyBar.tsx');
    expect(bar).toContain('solidBolt?: boolean;');
    expect(bar).toMatch(/<EnergyIcon\n\s+filled\n\s+solid=\{solidBolt\}/);
    expect(read('components/dialogs/DialogueV2BriefingScreen.tsx')).toContain('{showEnergy ? <EnergyBar glass solidBolt /> : null}');
    expect(read('components/dialogs/DialogueV2SessionScreen.tsx')).toContain('{showEnergy ? <EnergyBar glass solidBolt /> : null}');
    expect(read('app/ai_dialog_home.tsx')).toContain('<EnergyBar size={30} glass solidBolt />');
    expect(read('app/learning_v2_direct_session_player_v1.tsx')).not.toContain('solidBolt');
  });
  it('брифинг: за экраном статичные пятна темы (V2Backdrop), как у хаба Карточек', () => {
    const src = read('components/dialogs/DialogueV2BriefingScreen.tsx');
    expect(src).toContain("import V2Backdrop from '../v2/V2Backdrop';");
    expect(src).toMatch(/testID="dialogue-v2-briefing-screen">\n(?:\s*\{\/\*[^\n]*\*\/\}\n)?\s*<V2Backdrop \/>/);
  });
});

describe('cards-062: журнал превью новой карточки (сперва логи)', () => {
  it('одна строка [CARD-PREVIEW] на смену фокуса и стороны превью: метки, откуда они, что набрано', () => {
    const src = read('app/flashcards_card_editor.tsx');
    expect(src).toContain("DebugLogger.info('[CARD-PREVIEW]'");
    expect(src).toContain('лицо=EN(зашито в FlipCard)');
    expect(src).toContain('}, [focusedField, previewBack, lang, studyTarget]);');
  });
});
