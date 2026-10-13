// зачем (владелец 12.10, cards-027, затем п.83 «кнопка языка отфильтровывает наборы карточек по языкам»): на настройке тренировки Карточек справа сверху — чип языка наборов.
// Наборов одного языка → чип только показывает язык (без стрелки). Наборы нескольких языков → чип становится кнопкой фильтра с меню (PackLanguagePicker без «Без языка», число наборов в пунктах).
// Тренировка идёт на языке выбранных наборов (маршрут несёт ?target), studyTarget приложения не меняется. План: docs/phraseman-2.0/R1_FC_LANG_FILTER.md.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('cards-027 / п.83: чип языка на настройке тренировки', () => {
  const view = read('app/flashcards/TrainingSetupV2.tsx');
  const screen = read('app/flashcards_training_setup.tsx');
  const picker = read('app/flashcards/PackLanguagePicker.tsx');
  const others = read('app/flashcards/use_other_language_decks.ts');

  it('экран передаёт код ВЫБРАННОГО языка наборов (EN/ES/FR/DE/IT), а не язык приложения', () => {
    expect(screen).toContain('languageLabel={langChip(viewLang)}');
    expect(screen).toContain("const langChip = (code: string): string => code.split('-')[0].toUpperCase();");
    expect(screen).toContain('const viewLang: LearningLanguageTarget = pickedLang ?? studyTarget;');
  });

  it('один язык: чипа нет вовсе (вердикты Макетов 7c831a193: в образце cards-v2 индикатора языка нет), у языков — только кнопка фильтра', () => {
    expect(view).not.toContain(') : languageLabel ? (');
    expect(view).not.toMatch(/accessibilityRole="text"[\s\S]{0,200}fc-training-setup-language-chip|fc-training-setup-language-chip"[\s\S]{0,120}accessibilityRole="text"/);
    // единственный чип — кнопка внутри ветки «несколько языков»
    expect(view.split('testID="fc-training-setup-language-chip"').length - 1).toBe(1);
    expect(view).toContain('{languageLabel && languageSwitchable && onLanguageChange ? (');
  });

  it('несколько языков: чип — кнопка с шевроном, меню — общий PackLanguagePicker только с языками, где есть наборы, и числом наборов', () => {
    const start = view.indexOf('<PackLanguagePicker');
    expect(start).toBeGreaterThan(-1);
    const block = view.slice(start, view.indexOf('testID="fc-training-setup-monthly-limit"', start));
    expect(block).toContain('languages={languageCodes}');
    expect(block).toContain('counts={languageCounts}');
    expect(block).toContain('onChange={onLanguageChange}');
    expect(block).not.toContain('allowNone');
    expect(block).toContain('accessibilityRole="button"');
    expect(block).toContain('accessibilityState={{ expanded: visible }}');
    expect(block).toContain('name="chevron-down"');
    // пилюля в позиции справа сверху — прежний вид чипа
    expect(block).toContain('backgroundColor: visible ? g.selected : g.opaqueControl');
    expect(block).toContain('boxShadow: nestedBoxShadow(g)');
  });

  it('цвета из токенов, длинный код не сжимается: нет adjustsFontSizeToFit, numberOfLines и обводок у чипа', () => {
    const start = view.indexOf('{languageLabel && languageSwitchable && onLanguageChange ? (');
    const chip = view.slice(start, view.indexOf('testID="fc-training-setup-monthly-limit"', start));
    expect(chip).toContain('color: g.text');
    expect(chip).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(chip).not.toContain('adjustsFontSizeToFit');
    expect(chip).not.toContain('numberOfLines');
    expect(chip).not.toContain('borderWidth');
  });

  it('подпись для озвучки есть на 9 языках («Язык тренировки: EN»)', () => {
    for (const text of ['Язык тренировки', 'Мова тренування', 'Practice language', 'Idioma de práctica', 'Idioma da prática', 'Ngôn ngữ luyện tập', 'Bahasa latihan', 'Pratik dili', 'Język ćwiczeń']) {
      expect(view).toContain(`language: '${text}'`);
    }
    expect(view).toContain('accessibilityLabel={`${copy.language}: ${languageLabel}`}');
  });

  it('правый ряд переносится при нехватке места, а не режет и не сжимает чипы', () => {
    expect(view).toContain("topRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, flexShrink: 1 }");
  });

  it('PackLanguagePicker: новые параметры необязательны — прежние вызовы не меняются; число наборов серым справа; своя кнопка через renderTrigger', () => {
    expect(picker).toContain('languages?: readonly PackLanguage[];');
    expect(picker).toContain('counts?: Readonly<Partial<Record<PackLanguage, number>>>;');
    expect(picker).toContain('renderTrigger?: (open: () => void, visible: boolean) => React.ReactNode;');
    expect(picker).toContain('const options: readonly PackLanguage[] = languages ?? (allowNone ? PACK_LANGUAGE_CHOICES : PACK_LANGUAGES);');
    expect(picker).toContain('{renderTrigger ? renderTrigger(open, visible) : <Pressable');
    expect(picker).toContain('styles.optionCount, { color: g.secondary }');
  });
});

describe('п.83: фильтр наборов по языку — экран настройки', () => {
  const screen = read('app/flashcards_training_setup.tsx');
  const others = read('app/flashcards/use_other_language_decks.ts');

  it('выбор языка живёт только в состоянии экрана (не в профиле и не в хранилище), studyTarget приложения не пишется', () => {
    expect(screen).toContain('const [pickedLang, setPickedLang] = useState<LearningLanguageTarget | null>(null);');
    expect(screen).not.toMatch(/setStudyTarget|persistStudyTarget|STUDY_TARGET_STORAGE_KEY/);
  });

  it('смена языка мгновенна: список и отметки меняются в тот же тап из памяти, с журналом [FC-LANG-FILTER] select', () => {
    const start = screen.indexOf('const selectLanguage = useCallback');
    const body = screen.slice(start, screen.indexOf('}, [studyTarget]);', start));
    expect(body).toContain('isFlashcardsReadyLanguage(code)');
    expect(body).toContain("formatLangFilterLog('select'");
    expect(body).toContain('setSelectedDeckIds(nextSelection);');
    expect(body).toContain('setPickedLang(code === studyTarget ? null : code);');
    expect(body).not.toMatch(/await |loadFcDeckOptions/);
  });

  it('смена языка сбрасывает выбор наборов: отметки только среди видимых наборов нового языка', () => {
    expect(screen).toContain('reconcileSelectedDeckIds(selectionMemoryRef.current[code] ?? [], visibleIds)');
  });

  it('запуск: маршрут несёт язык наборов только если он не язык приложения; пресет чужого языка не пишется', () => {
    expect(screen).toContain('const routeTarget = trainingTargetRouteParam(viewLang, studyTarget);');
    expect(screen).toContain('{ sec: secId, dir: dirId, target: routeTarget }');
    expect(screen).toContain('if (viewLang === studyTarget) {\n      void setLastPreset(');
    expect(screen).toContain("formatLangFilterLog('preset_skipped'");
    expect(screen).toContain("formatLangFilterLog('start'");
  });

  it('направление «EN → RU» в «Напиши» считается по языку наборов', () => {
    expect(screen).toContain('`${langChip(viewLang)} → ${langChip(lang)}`');
    expect(screen).toContain('`${langChip(lang)} → ${langChip(viewLang)}`');
  });

  it('старт зависит от готовности списка ВЫБРАННОГО языка; на чужом языке статус экрана — статус его списка', () => {
    expect(screen).toContain("const listReady = viewLang === studyTarget ? loadState === 'ready' : viewDecks !== null;");
    expect(screen).toContain("const canStart = listReady\n    && quotaAllowsStart");
    expect(screen).toContain("(viewDecks === null ? 'loading' : viewDecks.length === 0 ? 'empty' : 'ready')");
  });

  it('фоновая загрузка отметок языка приложения не затирает отметки на чужом языке', () => {
    expect(screen).toContain('if (viewLangRef.current !== studyTarget) {');
    expect(screen).toContain("formatLangFilterLog('app_list_loaded_while_filtered'");
  });

  it('списки других языков: только с устройства (localOnly, 0 чтений Firestore), лениво после анимаций, по одному языку; ошибка пишется в журнал', () => {
    expect(others).toContain('{ localOnly: true }');
    expect(others).toContain('InteractionManager.runAfterInteractions');
    expect(others).toContain('peekFcDeckOptionsLocal(mode, lang, code)');
    expect(others).toContain("formatLangFilterLog('list_failed'");
    // сетевых модулей хук не импортирует (слово «Firestore» в комментарии — не в счёт)
    expect(others).not.toMatch(/from '[^']*(firebase|firestore|community_packs)[^']*'/i);
    expect(others).not.toContain('fetchCommunityPackCards');
  });
});
