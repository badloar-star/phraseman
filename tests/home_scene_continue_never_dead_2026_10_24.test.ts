// зачем (координатор 24.10, Р3): «Продолжить» на «Сцене» Главной никогда не мёртвая — продолжать нечего и «Уроков» для языка нет →
// герой «newbie» с первым доступным разделом («Диалоги», иначе «Карточки»); каждая ветка в журнале [HOME-CONTINUE] scene_target.
import { homeSceneContinueTarget } from '../components/home/v2/scene/home_scene_continue_target';
import { readSource } from './helpers/read_source';

const base = { nothingToContinue: true, resolved: true, learnVisible: false, dialogsVisible: true, cardsVisible: true } as const;

describe('«Сцена» Главной: «Продолжить» никогда не мёртвая', () => {
  it('выбор ветки', () => {
    expect(homeSceneContinueTarget({ ...base, nothingToContinue: false })).toEqual({ section: null, reason: 'has_continue' });
    expect(homeSceneContinueTarget({ ...base, resolved: false })).toEqual({ section: null, reason: 'pending' });
    expect(homeSceneContinueTarget({ ...base, learnVisible: true })).toEqual({ section: null, reason: 'start_lesson_1' });
    expect(homeSceneContinueTarget(base)).toEqual({ section: 'dialogs', reason: 'section_dialogs' });
    expect(homeSceneContinueTarget({ ...base, dialogsVisible: false })).toEqual({ section: 'cards', reason: 'section_cards' });
    expect(homeSceneContinueTarget({ ...base, dialogsVisible: false, cardsVisible: false })).toEqual({ section: null, reason: 'no_section_for_target' });
  });

  it('Главная: раздел становится местом «Сцены» — герой «newbie», название раздела, кнопка ведёт туда же, куда плитка; ветка в журнале', () => {
    const home = readSource('app/(tabs)/home.tsx');
    expect(home).toContain('const homeSceneTarget = homeSceneContinueTarget({');
    expect(home).toContain('const homeSceneOnPlace = continuePlace !== null || continueStart || homeSceneSection !== null;');
    expect(home).toContain("hasProgress={continueChoice.kind === 'none' && continueResolved ? false : continueResolved ? true : null}");
    // зачем (жалоба владельца 25.10): обработчик выбирается по той же цели, что и надпись (homeSceneCtaTarget) — порядок прежний:
    // раздел → место/«начать» → продолжение курса; таблицу цель → надпись → обработчик держит home_scene_cta_target_table
    expect(home).toContain("const homeSceneOnContinue = homeSceneCta === 'section' ? openHomeSceneSection");
    expect(home).toContain("homeSceneCta === 'place' || homeSceneCta === 'start' ? openHomeContinuePlace");
    expect(home).toContain('onContinue={homeSceneOnContinue}');
    expect(home).toContain("console.log('[HOME-CONTINUE] scene_target'");
  });
});
