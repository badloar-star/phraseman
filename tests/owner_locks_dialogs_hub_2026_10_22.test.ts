// ЗАМКИ ВЛАДЕЛЬЦА 22.10 по хабу Диалогов (макет dialogs-hub-v4.html, кнопка «Да, переносить»; реестр docs/work/OWNER_LOCKS.md). Каждый тест падает, если правку откатят; ослабить — только по новому слову владельца.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Замки владельца 22.10: хаб Диалогов', () => {
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «Да, переносить» — решение (а): сцена Диалогов включается ВСЕМ, в том числе в сторе
  it('(а) сцена включена всем, флаг не зависит от dev / стор-сборки', () => {
    const flags = read('components/dialogs/scene/dialogs_scene_flags.ts');
    expect(flags).toMatch(/DIALOGS_SCENE_V2_ENABLED: boolean = true;/);
    expect(flags).not.toMatch(/ENABLE_DEV_TOOLS|IS_STORE_RELEASE/);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «если Plus юзер то убрать Plus иконку» / «без пилюль энергии и лимита» — решение (б)
  it('(б) у Plus нет значка Plus на «Свободном разговоре» и нет пилюли остатка; у Free значок Plus и замок', () => {
    const tools = read('components/dialogs/DialogueV2PlusTools.tsx');
    expect(tools).toMatch(/\{!hasPremiumAccess \? \(\n\s+<View style=\{styles\.right\}>/);
    expect(tools).toContain('name="chevron-forward"');
    const copy = read('components/dialogs/scene/dialogs_scene_copy.ts');
    expect(copy).toContain("const quota = input.plus || input.quotaRemaining === null ? null : { label: `${input.quotaRemaining}/${input.quotaTotal}` };");
    expect(read('components/dialogs/scene/DialogsSceneStage.tsx')).not.toMatch(/copy\.quota\.unlimited|'infinite'/);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «УБРАТЬ ВОТ ТАКИЕ КНОПКИ [чипы тем в две строки] — ЭТО НЕУДОБНО» — решение (в): переключатель вместо чипов
  it('(в) чипов тем нет: на хабе плитки, на экране темы переключатель-таблетка', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'components/dialogs/scene/DialogsSceneCatalogue.tsx'))).toBe(false);
    const container = read('components/dialogs/DialogueV2CatalogueContainer.tsx');
    expect(container).toContain('<DialogsHubThemes');
    expect(container).not.toContain('DialogsSceneCatalogue');
    const sw = read('components/dialogs/hub/DialogsHubWorldSwitch.tsx');
    expect(sw).toContain('testID="dialogs-hub-world-switch"');
    expect(sw).toContain("dialogsSceneText(lang, 'allWorlds')");
    expect(read('components/dialogs/hub/DialogueV2ThemeScreen.tsx')).toContain('<DialogsHubWorldSwitch');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «Да, переносить» — решение (г): тема открывается ОТДЕЛЬНЫМ экраном со ScreenBackButton (мир не раскрывается секцией на хабе)
  it('(г) тема — отдельный экран /dialogue_v2_theme со ScreenBackButton; плитки тем и «Все диалоги» ведут на него', () => {
    const screen = read('components/dialogs/hub/DialogueV2ThemeScreen.tsx');
    expect(screen).toContain('<ScreenBackButton screen="dialogs_theme" fallback="/ai_dialog_home" />');
    expect(screen).toContain('<ScreenBackSlot />');
    const container = read('components/dialogs/DialogueV2CatalogueContainer.tsx');
    expect(container).toContain("pathname: '/dialogue_v2_theme'");
    expect(container).toContain("const openAllThemes = useCallback(() => openTheme('all'), [openTheme]);");
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «выбор компактнее и красивее» + «Ранг пиши дословно: монета ранга + Откроется на ранге N»
  it('компактные строки темы; ранг дословно — монета ранга + «Откроется на ранге N»', () => {
    const screen = read('components/dialogs/hub/DialogueV2ThemeScreen.tsx');
    expect(screen).toMatch(/row: \{ minHeight: 58, borderRadius: 18,/);
    expect(screen).toContain('coinRankRowForDisplay(item.rankRequired).source');
    expect(read('components/dialogs/DialogueV2CatalogueContainer.tsx')).toContain('Откроется на ранге\\u00A0${rank}');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «Нижнее затухание списка на экране темы Диалогов — добавь, оно было в макете» (координатор, макет dialogs-hub-v4 `.dv-fade`)
  it('на экране темы под списком нижнее затухание (слой без нажатий)', () => {
    const screen = read('components/dialogs/hub/DialogueV2ThemeScreen.tsx');
    expect(screen).toContain('testID="dialogs-theme-fade"');
    expect(screen).toContain('pointerEvents="none" colors={[`${g.bg}00`, g.bg]}');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «КНОПКА НАЗАД ВООБЩЕ ВЕЗДЕ ДОЛЖНА БЫТЬ В ОДНОМ И ТОМ ЖЕ МЕСТЕ» — хаб Диалогов: общая ScreenBackButton со сценой под ней (sceneTop)
  it('на хабе «назад» — общая ScreenBackButton, круг по яркости сцены (sceneTop), в сцене только место под неё', () => {
    const home = read('app/ai_dialog_home.tsx');
    expect(home).toMatch(/<ScreenBackButton screen="ai_dialog_home" fallback="\/\(tabs\)\/home" testID="ai-dialog-home-back" accessibilityLabel=\{backLabel\} sceneTop=\{sceneTheme\.colors\.top\} \/>/);
    expect(home).not.toContain('V2IconButton');
    expect(read('components/dialogs/scene/DialogsSceneHub.tsx')).toContain('topStart={<ScreenBackSlot />}');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: словарь ВСЕГО курса — ВНУТРИ плитки «Слова» (переключатель «Этот урок / Весь курс»), новой кнопки в шапке нет; замена слова 21.09
  it('«Слова»: переключатель «Этот урок / Весь курс»; слова курса читаются только при открытии «Весь курс»', () => {
    const words = read('app/learning_v2_lesson_words.tsx');
    expect(words).toContain('testID="learning-v2-words-scope-switch"');
    expect(words).toContain("useState<WordsScope>('lesson')");
    expect(words).toContain("wordsScope === 'course' ? { targetLanguage: String(studyTarget), lessonOrdinals: COURSE_LESSON_ORDINALS } : null");
    expect(words).toContain('useLearningV2CourseUnlockedWordsV1(courseScope,');
    expect(read('app/(tabs)/lessons.tsx')).not.toMatch(/useLearningV2CourseUnlockedWordsV1|learning-v2-map-dictionary-open/);
  });
});
