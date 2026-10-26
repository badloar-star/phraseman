// зачем (Темы, гейт safe-area 26.10): классическое окно удаления — прозрачный Modal без statusBarTranslucent давал на Android
// светлую полосу сверху. Затемнение — под строкой состояния, окно — в безопасной зоне (устойчивые insets).
import { readSource } from './helpers/read_source';

it('окно удаления: statusBarTranslucent у классического Modal, отступы от useStableSafeAreaInsets', () => {
  const src = readSource('components/DeleteAccountConfirmModal.tsx');
  expect(src).toContain('<Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={handleSystemBack}>');
  expect(src).toContain('const insets = useStableSafeAreaInsets();');
  expect(src).toContain('style={[styles.classicModalViewport, { paddingTop: insets.top, paddingBottom: insets.bottom }]}');
  expect(src).not.toContain('useSafeAreaInsets()');
});
