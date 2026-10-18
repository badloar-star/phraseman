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
    expect(src).toMatch(/testID=\{`fc-my-packs-pack-delete-\$\{actionsFor\.id\}`\} icon=\{actionsOwn \? 'trash-outline' : 'remove-circle-outline'\} title=\{actionsOwn \? copy\.del : triLang\(lang, /);
    expect(src).toContain('danger onPress={runAction(onDelete)}');
  });

  it('cards-v2-025: наборы демо-каталога несут три слова превью (в образце три чипа в ряд)', () => {
    const demo = read('app/dev_state_cards_demo.ts');
    expect(demo).toContain("['Family', 'Лидия', 20, 'A1', 4, ['Mother', 'Afford', 'Borrow']]");
    expect(demo).toContain('previewWords: [...words],');
  });

  it('dialogs-gap-010 / dialogs-gap-003: экран-гейт стоит сверху (макет .gate margin-top 150), а не по центру; замок Plus заливной', () => {
    const kit = read('components/dialogs/glass/DialogueGlassKit.tsx');
    // 194 (= 150 + шапка 44) считал шапку «назад» дважды — она отдельный блок над телом; замер dialogs-033: значок на 296 dp при 246 в образце → верно 150 (b807e552d, tests/dialogs_gate_top_offset_contract)
    expect(kit).toContain("gateBody: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 150,");
    expect(read('app/dialogue_v2_freeform.tsx')).toContain('icon="lock-closed" //');
  });

  it('dialogs-gap-012: на потолке Plus поле ввода приглушено и закрыто', () => {
    const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');
    // перепин 18.10 (координатор, К1): пока ждём ответ ИИ, поле ввода доступно (sending его больше не закрывает); потолок Plus по-прежнему закрывает.
    expect(screen).toContain('editable={!voiceBusy && !inputLocked}');
    expect(screen).toContain('inputLocked && { opacity: 0.55 }');
    expect(screen).toContain('!turnError && !inputLocked;');
    expect(read('app/dialogue_v2_session.tsx')).toContain("inputLocked={failureReason === 'plus_daily_cap'}");
  });

  it('dialogs-001/003/005/006: хаб Free получает пилюлю «30/30» — dquota=30 пишет зеркало (reset стирал его); cards-070 нажимает «Создать набор»', () => {
    const steps = read('scripts/dev_links_r1_steps.py');
    expect(steps).toContain("add('dialogs-001', [], 'plus=off&dquota=30', DLG,");
    expect(steps).toContain("add('dialogs-006', [WORLD], 'plus=off&dquota=30', DLG,");
    // зачем (Авторизация 13.10): dc9b10b85 добавил fail=publish_error — тап «Создать набор» без подмены публикации мог дойти до сети (сторож Ядра 69a4230ba)
    expect(steps).toContain("add('cards-070', ['tap:#ugc-pack-save'], EMPTY_PLUS + '&fail=publish_error', CREATE,");
  });

  it('cards-034 / cards-section-010: затемнение шторки тянется вверх до статус-бара (PanelSheet меряет верх родителя в окне)', () => {
    const sheet = read('components/mistakes-panel/PanelSheet.tsx');
    expect(sheet).toContain('const [scrimExtend, setScrimExtend] = useState(0);');
    expect(sheet).toContain('rootRef.current?.measureInWindow((_x, y) => {');
    expect(sheet).toContain('top: -scrimExtend');
    expect(sheet).toContain('[PANEL-SHEET] scrim');
  });

  it('cards-gap-020: для «Добавлено» берётся плитка ниже по списку (первая — дубль в наборе «Работа»)', () => {
    expect(read('scripts/dev_links_r1_steps.py')).toContain("add('cards-gap-020', ['scroll:down', 'scroll:down', 'scroll:down', 'scroll:down', 'tap:#fc-gallery-tile-*@3', TO_PACK, PACK_WORK], DEMO, SAVED,");
  });
});
