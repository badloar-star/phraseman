import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/mistake_practice_session.tsx', import.meta.url), 'utf8');

test('mistake practice keeps real answer flows while structural surfaces use Liquid Glass', () => {
  // 30.09 (2.0): стекло непрозрачное (память владельца «стекло 2.0 = непрозрачное»),
  // экраны ошибок переведены на useLv2Glass + g.opaque* (efe19ae9d); полупрозрачный glassFill снят.
  assert.match(source, /useLv2Glass\(\)/);
  // 04.10 (макет «Панель»): поверхности рисует общий набор components/mistakes-panel (PracticeKit/PanelKit), а не цвета экрана.
  assert.match(source, /components\/mistakes-panel\/PracticeKit/);
  assert.match(source, /<Tray /);
  assert.match(source, /onPress=\{\(\) => void submitVerdict\(/);
  assert.match(source, /<DiffValue /);
  assert.match(source, /<MistakeSessionFinale/);
});

test('mistake practice frame protects both system safe areas', () => {
  // зачем (f58f8afa5, Сверка mistakes-panel-010/017): RN SafeAreaView на Android не даёт отступа — шапка с ✕ уходила
  // под строку состояния. Обе зоны защищены отступами проекта useStableSafeAreaInsets (Performance Bible).
  assert.match(source, /const insets = useStableSafeAreaInsets\(\);/);
  assert.match(source, /<View style=\{\[styles\.screen, \{ paddingTop: insets\.top, paddingBottom: insets\.bottom \}\]\}>/);
  // нижняя часть защищена «стаканом» с отступом под жест (Tray считает insets.bottom сам), а контент прокрутки оставляет под ним место
  assert.match(source, /paddingBottom: 340/);
});
