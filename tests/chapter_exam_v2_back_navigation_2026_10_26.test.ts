// зачем (аудит «назад» 26.10, требование владельца): в экзамене главы v2 системное «назад» Android и свайп iOS ведут туда же, куда кнопка
// на экране: «Разбор ошибок» и «Повтори темы» с итога → к итогу, иначе — закрыть экзамен. Явное закрытие жест не перехватывает; Android-«назад»
// слушается только в фокусе (из эпизода повтора не закрывает экзамен). Экран целиком jest не грузит — сторож по исходнику.
import fs from 'node:fs';
import path from 'node:path';

const run = fs.readFileSync(path.join(__dirname, '..', 'components/learning-v2/exam_v2/ChapterExamV2Run.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('экзамен главы v2: «назад» ведёт туда, откуда пришёл', () => {
  it('цель «назад» считается из фазы: разбор / повтор с итога → итог', () => {
    expect(run).toContain("const backToResult = phase === 'mistakes' || (phase === 'review' && attempt !== null && outcome !== null);");
  });

  it('Android: в фокусе, к итогу или закрыть (как крестик), событие поглощено', () => {
    expect(run).toMatch(/useFocusEffect\(useCallback\(\(\) => \{\s*const sub = BackHandler\.addEventListener\('hardwareBackPress'/);
    expect(run).toMatch(/if \(backToResultRef\.current\) \{[\s\S]{0,200}setPhase\('result'\);\s*return true;\s*\}\s*close\('hardware_back'\);\s*return true;/);
  });

  it('iOS-свайп: перехват только для «к итогу», явное закрытие проходит', () => {
    expect(run).toContain("if (closingRef.current || !backToResultRef.current) return;");
    expect(run).toMatch(/event\.preventDefault\(\);[\s\S]{0,160}setPhase\('result'\);/);
    expect(run).toMatch(/closingRef\.current = true;\s*safeRouterBack\(router, '\/learning-v2\/course' as never\);/);
  });

  it('кнопки на экране совпадают с жестами: «К итогу» в разборе и в повторе', () => {
    expect(run).toContain("onBack={() => setPhase('result')} />");
    expect(run).toContain("onBack={() => (attempt && outcome ? setPhase('result') : close('review_back'))}");
  });
});
