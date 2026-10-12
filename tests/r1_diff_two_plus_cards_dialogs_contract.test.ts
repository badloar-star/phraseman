// зачем (R1_DIFF_ONE_FIX, раздел «два и более кодовых пункта», cards* и dialogs*, 12.10): сторож правок Дизайна, чтобы их не откатили «заодно».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('R1_DIFF_ONE_FIX: cards* и dialogs* (два и более пункта)', () => {
  it('cards-005: верх залипающей полосы с ползунком плотный (FF), сквозь неё не просвечивают карточки', () => {
    const bar = read('components/cards-grid/ZoomBar.tsx');
    expect(bar).toContain("colors={[withAlpha(bg, 'FF'), withAlpha(bg, 'FF'), withAlpha(bg, '00')]}");
    expect(bar).not.toContain("withAlpha(bg, 'F0')");
  });

  it('cards-section-010: «Удалить набор» в шторке «Мои наборы» красный (danger)', () => {
    const src = read('app/flashcards/MyPacksV2.tsx');
    expect(src).toMatch(/testID=\{`fc-my-packs-pack-delete-\$\{actionsFor\.id\}`\} icon="trash-outline" title=\{copy\.del\} danger /);
  });

  it('cards-v2-025: наборы демо-каталога несут три слова превью (в образце три чипа в ряд)', () => {
    const demo = read('app/dev_state_cards_demo.ts');
    expect(demo).toContain("['Family', 'Лидия', 20, 'A1', 4, ['Mother', 'Afford', 'Borrow']]");
    expect(demo).toContain('previewWords: [...words],');
  });

  it('dialogs-gap-010 / dialogs-gap-003: экран-гейт стоит сверху (макет .gate margin-top 150), а не по центру; замок Plus заливной', () => {
    const kit = read('components/dialogs/glass/DialogueGlassKit.tsx');
    expect(kit).toContain("gateBody: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 194,");
    expect(read('app/dialogue_v2_freeform.tsx')).toContain('icon="lock-closed" //');
  });

  it('dialogs-gap-012: на потолке Plus поле ввода приглушено и закрыто', () => {
    const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(screen).toContain('editable={!sending && !voiceBusy && !inputLocked}');
    expect(screen).toContain('inputLocked && { opacity: 0.55 }');
    expect(screen).toContain('!turnError && !inputLocked;');
    expect(read('app/dialogue_v2_session.tsx')).toContain("inputLocked={failureReason === 'plus_daily_cap'}");
  });

  it('dialogs-001/003/005/006: хаб Free получает пилюлю «30/30» — dquota=30 пишет зеркало (reset стирал его); cards-070 нажимает «Создать набор»', () => {
    const steps = read('scripts/dev_links_r1_steps.py');
    expect(steps).toContain("add('dialogs-001', [], 'plus=off&dquota=30', DLG,");
    expect(steps).toContain("add('dialogs-006', [WORLD], 'plus=off&dquota=30', DLG,");
    expect(steps).toContain("add('cards-070', ['tap:#ugc-pack-save'], EMPTY_PLUS, CREATE,");
  });
});
