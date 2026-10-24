// ЗАМКИ ВЛАДЕЛЬЦА 22.10 по хабу урока (реестр docs/work/OWNER_LOCKS.md). Каждый тест падает, если правку владельца откатят; ослабить — только по новому слову владельца.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const S = 'components/learning-v2/season/';

describe('Замки владельца 22.10: хаб урока', () => {
  const face = read(`${S}SeasonCardFace.tsx`);
  const view = read(`${S}SeasonCourseView.tsx`);
  const course = read(`${S}SeasonCourse.tsx`);
  const expanded = read(`${S}SeasonExpandedCard.tsx`);

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «замочки справа а не слева» — плашка замка (и ✓/▶) с номером в правом верхнем углу карточки эпизода, одно место для всех
  it('плашка замка / ✓ / ▶ — справа сверху', () => {
    expect(face).toMatch(/mark: \{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',/);
    expect(face).not.toMatch(/mark: \{[^}]*alignSelf: 'flex-start'/);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «замочки справа а не слева» — замок только у закрытого ('locked'); 'open' (открыт экзаменом / входным тестом, 21.10 «ПРОСТО ОТКРЫТЫ») без замка и без галочки, в списке эпизодов не «lock»
  it("замок только у 'locked': 'open' — без замка и без галочки", () => {
    expect(face).toContain("const markIcon: IonName | null = state === 'locked' ? 'lock-closed' : state === 'done' ? 'checkmark' : state === 'current' ? 'play' : null;");
    expect(read(`${S}SeasonPickScreens.tsx`)).toContain("card.state === 'current' ? 'cur' : card.state === 'open' ? 'open' : 'lock'");
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «звёздочки даже если не пройдено — просто пустые» — три звезды на каждой карточке, у непройденных пустые (контур)
  it('три звезды на каждой карточке: ряд не зависит от числа, пустые — контур', () => {
    expect(face).toContain('const starsShown = stars !== \'pending\' && starTones !== undefined;');
    expect(face).toContain("{starTones ? [1, 2, 3].map((i) => <Ionicons key={i} name={i <= starsFilled ? 'star' : 'star-outline'}");
    expect(face).toContain('starTones.empty');
    expect(face).not.toContain("typeof stars === 'number' && starTones ?");
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот это убираем!» — на обложке урока нет строки-кикера «Урок N · …»
  it('на обложке нет кикера «Урок N · …»', () => {
    expect(view).not.toMatch(/styles\.kicker|arcTitle|const kicker\b/u);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «просто пусть вибрирует и замочек трясется! не надо открыть вот этот модал его не должно быть!» — тап по закрытому эпизоду: вибрация + тряска замка, модала нет (код удалён, не спрятан флагом)
  it('тап по закрытой карте: вибрация и тряска, раскрытая карта не открывается', () => {
    expect(course).toContain('hapticWarning');
    expect(course).toMatch(/if \(card && card\.state === 'locked'\) \{ shakeLocked\(index, 'carousel'\); return; \}/);
    expect(course).toMatch(/if \(card && card\.state === 'locked'\) \{ shakeLocked\(index, 'list'\); return; \}/);
    expect(course).toContain('onCardOpen={openCard}');
    expect(face).toContain('useSharedValue(0)');
    expect(face).toContain('withSequence(');
    expect(face).toContain('useReducedMotion');
  });
  // координатор 24.10: у закрытого экзамена та же плашка замка справа сверху, что у эпизода, и трясётся она; кубок — эмблема, не трясётся
  it('закрытый экзамен: плашка замка справа сверху трясётся, как у эпизода', () => {
    expect(face).toMatch(/\{state === 'locked' \? \(\s*<Animated\.View style=\{\[styles\.mark, styles\.examMark, lockShake\]\} testID="season-exam-lock"[^>]*>\s*<Ionicons name="lock-closed"/);
    expect(face).toContain("examMark: { position: 'absolute', top: 14, right: 14 },");
    expect(face).toContain('<View style={styles.seal} testID="season-exam-seal">');
  });
  // координатор 24.10: «Уменьшить движение» — без сдвига, короткая подсветка замка 1→0,6→1 за 240 мс (у эпизода и у экзамена один и тот же lockShake)
  it('при «Уменьшить движение» замок не трясётся, а подсвечивается', () => {
    expect(face).toContain('const reducedMotion = useReducedMotion();');
    expect(face).toContain("if (reducedMotion) { lockOpacity.value = withSequence(withTiming(0.6, { duration: 120 }), withTiming(1, { duration: 120 })); return; }");
    expect(face).toContain('const lockShake = useAnimatedStyle(() => ({ opacity: lockOpacity.value, transform: [{ translateX: lockX.value }] }));');
    expect(face.match(/lockShake\]/g)?.length).toBe(2);
    expect(view).toMatch(/<SeasonCardFace kind="exam"[\s\S]{0,300}shakeSeq=\{props\.lockShake && props\.lockShake\.index === index \? props\.lockShake\.seq : 0\}/);
  });
  it('в модале нет «закрытой» ветки: ни «просмотр», ни «Откроется после эпизода N», ни «К эпизоду N»', () => {
    expect(expanded).not.toMatch(/locked|lockLine|lock-closed/u);
    expect(course).not.toMatch(/seasonUnlockAfter|'preview'|'toEpisode'|'openByExam'|lockLine/u);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «убери эту иконку» — в шапке хаба урока нет книжки со счётчиком слов
  it('в шапке хаба урока нет кнопки словаря с бейджем и расчёта слов ради неё', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).not.toMatch(/learning-v2-map-dictionary-open|useLearningV2CourseUnlockedWordsV1|LearningV2LessonDictionaryOverlayV1|learningV2DictionaryWords/u);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «меньше шрифт и более компактно!» — размеры проверяет tests/season_hero_title_fit_contract.test.ts
  it('заголовок обложки берёт кегль из метрик (сторож размеров — season_hero_title_fit_contract)', () => {
    expect(view).toContain('seasonHeroTitleSize(props.lessonTitle)');
  });
});
