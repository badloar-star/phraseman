// зачем (координатор 25.10, за флагом экзамена): «Начать экзамен» / «Открыть экзаменом главы» — один защитник двойного тапа и проверка
// энергии до перехода (окно «Нужна энергия»); на странице вкладки низ контента Сезона не уходит под таб-бар.
import { readSource } from './helpers/read_source';

describe('экзамен главы: двойной тап, энергия, отступ под таб-бар', () => {
  const wire = readSource('components/learning-v2/season/SeasonCourseConnected.tsx');
  it('оба обработчика начинаются с защитника и проверки энергии', () => {
    const start = wire.slice(wire.indexOf('const onStartExam = useCallback('), wire.indexOf('const onOpenByExam = useCallback('));
    const open = wire.slice(wire.indexOf('const onOpenByExam = useCallback('));
    for (const [body, from] of [[start, 'exam_card'], [open, 'open_by_exam']] as const) {
      expect(body.indexOf("if (seasonTapTooSoon(examTapRef, 'exam')) return;")).toBeGreaterThan(-1);
      expect(body.indexOf(`if (examEnergyBlocked('${from}')) return;`)).toBeGreaterThan(body.indexOf("seasonTapTooSoon(examTapRef, 'exam')"));
      expect(body.indexOf(`if (examEnergyBlocked('${from}')) return;`)).toBeLessThan(body.indexOf('router.push(href as never);'));
    }
    expect(wire).toContain("const verdict = examFree ? 'free' : predictStartRefusal('level_exam');");
    expect(wire).toContain('<NoEnergyModal variant="course" activity="level_exam" visible={examNoEnergy} onClose={() => setExamNoEnergy(false)} />');
  });
  it('низ контента Сезона на странице вкладки — не меньше отступа таб-бара', () => {
    const view = readSource('components/learning-v2/season/SeasonCourseView.tsx');
    expect(view).toContain('const contentBottomPad = isTabPage ? Math.max(props.bottomPadding, tabBottomPad) : props.bottomPadding;');
    expect(view).toContain('contentContainerStyle={{ paddingBottom: contentBottomPad }}');
  });
});
