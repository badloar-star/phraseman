// зачем (владелец 22.10, капсом): «СТРОГО ЗАПРЕЩАЮ, ЧТОБЫ НА ЛЮБОМ ЭКРАНЕ БЫЛА ЭТА ПОЛОСА ДРУГОГО ЦВЕТА!!! (СЕЙФ ЗОНА)» и
// «ВЕРХНЯЯ СЕЙФ-ЗОНА ВСЕГДА ЧАСТЬ ОБЩЕЙ КОМПОЗИЦИИ… КАКАЯ БЫ ТЕМА НИ БЫЛА, ОНА НЕ ОТЛИЧАЕТСЯ ПО ЦВЕТУ».
// Сторож держит устройство: под часами — тот же фон, что у экрана (градиент/сцена продолжаются до самого верха), а отступ
// безопасной зоны — только у содержимого. Сплошная «полоса высотой в зону часов» запрещена: один цвет никогда не совпадёт с
// градиентом (так было над «Сценой» Главной — бирюзовая полоса над оранжево-бирюзовым градиентом).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walk(dirRel: string): string[] {
  const abs = path.join(ROOT, dirRel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(rel);
    return /\.tsx$/.test(entry.name) ? [rel] : [];
  });
}

// Сплошная полоса над часами: высота = верхний inset и непрозрачная заливка в одном объекте стиля.
const SOLID_TOP_BAND = /\{[^{}]*\bheight:\s*[A-Za-z_$][\w$]*\.top\b[^{}]*\bbackgroundColor:[^{}]*\}|\{[^{}]*\bbackgroundColor:[^{}]*\bheight:\s*[A-Za-z_$][\w$]*\.top\b[^{}]*\}/;

// Только с причиной и владельцем; список может лишь сокращаться.
const KNOWN_BANDS: Readonly<Record<string, string>> = {
  'app/dev_spire_scene_preview.tsx': 'dev-вход «Сцены» Пика — переводится на полноэкранную страницу вместе со сценой Пика (её файлы в работе другой сессии)',
};

describe('верх экрана: зона часов — часть общего полотна', () => {
  it('нигде нет сплошной полосы высотой в зону часов', () => {
    const offenders = [...walk('app'), ...walk('components')]
      .filter((rel) => !KNOWN_BANDS[rel])
      .filter((rel) => SOLID_TOP_BAND.test(read(rel)));
    expect(offenders).toEqual([]);
  });

  it('список исключений не содержит файлов, где полосы уже нет', () => {
    const stale = Object.keys(KNOWN_BANDS).filter((rel) => !fs.existsSync(path.join(ROOT, rel)) || !SOLID_TOP_BAND.test(read(rel)));
    expect(stale).toEqual([]);
  });

  // зачем (обход модалок 22.10): ни одна модалка не задаёт statusBarTranslucent, и это верно только потому, что в режиме
  // «от края до края» RN 0.81 рисует окно модалки под часами принудительно (ReactModalHostView: field || isEdgeToEdgeFeatureFlagOn).
  // Выключат режим — затемнение всех модалок кончится под строкой статуса, и над ним встанет незатемнённая полоса.
  it('режим «от края до края» включён, строку статуса никто не красит', () => {
    expect(read('app.json')).toMatch(/"edgeToEdgeEnabled":\s*true/);
    // android/ генерируется prebuild из app.json и в git не хранится — сверяем, только если папка есть
    if (fs.existsSync(path.join(ROOT, 'android', 'gradle.properties'))) {
      expect(read('android/gradle.properties')).toMatch(/^edgeToEdgeEnabled=true$/m);
    }
    const painted = [...walk('app'), ...walk('components')].filter((rel) => {
      const source = read(rel);
      return /<StatusBar\b[^>]*backgroundColor=(?!"transparent")/.test(source) || /<StatusBar\b[^>]*translucent=\{false\}/.test(source);
    });
    expect(painted).toEqual([]);
  });

  it('оболочка вкладок не сдвигает всё разом: отступ под часы — у каждой страницы, полноэкранные страницы без него', () => {
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).not.toContain('style={{ flex: 1, paddingTop: insets.top }}');
    expect(layout).toContain('pageTopInset={insets.top} fullBleedPages={homeFullBleedPages}');
    // над Главной заплатки нет — сцена сама рисует фон от верха экрана
    expect(layout).not.toMatch(/<HomeSceneStatusStrip[^>]*visible=\{visualIdx === 0\}/);
    const slider = read('app/TabSlider.tsx');
    expect(slider).toContain('paddingTop: fullBleed ? 0 : pageTopInset');
    expect(slider).toContain('<TabTopBleedContext.Provider value={fullBleed ? pageTopInset : 0}>');
  });

  it('«Сцена» Главной рисует фон под часами, а шапку и содержимое отодвигает на зону часов', () => {
    const scene = read('components/home/v2/scene/HomeScene.tsx');
    expect(scene).toContain('const topInset = useTabTopBleedInset();');
    expect(scene).toContain('topInset={topInset}');
    expect(scene).toContain('paddingTop: HEADER_TOP + topInset');
    const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('style={[s.stage, topInset > 0 ? { paddingTop: topInset } : null]}');
    // градиент сцены — во весь блок, включая зону часов
    expect(stage).toContain('<LinearGradient colors={[tokens.sceneTop, tokens.sceneBottom]} start={{ x: 0.22, y: 0 }} end={{ x: 0.78, y: 1 }} style={StyleSheet.absoluteFill} />');
  });
});
