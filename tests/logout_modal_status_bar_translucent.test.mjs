// зачем (Темы через координатора 26.10, гейт safe-area): окно «Выйти» — прозрачный Modal; без statusBarTranslucent на Android
// сверху светлая полоса. Флаг безопасен: окно по центру, полей ввода нет. Отступы прокрутки — от устойчивых insets, чтобы
// карточка на низком экране / крупном шрифте не уезжала под строку состояния.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/account/AccountLogoutFlow.tsx', import.meta.url), 'utf8');

test('logout modal draws its dim under the Android status bar', () => {
  const modal = source.slice(source.indexOf('<Modal'), source.indexOf('>', source.indexOf('onRequestClose')));
  assert.match(modal, /\btransparent\b/);
  assert.match(modal, /\bstatusBarTranslucent\b/);
});

test('scroll padding keeps the card inside the safe area', () => {
  assert.match(source, /import \{ useStableSafeAreaInsets \} from '\.\.\/\.\.\/app\/stable_safe_area_metrics';/);
  assert.match(source, /const insets = useStableSafeAreaInsets\(\);/);
  assert.match(source, /paddingTop: 20 \+ insets\.top, paddingBottom: 20 \+ insets\.bottom/);
  assert.doesNotMatch(source, /TextInput|KeyboardAvoidingView/, 'no input fields: the flag does not shift a keyboard form');
});
