import fs from 'fs';
import path from 'path';

// зачем (перенацелено 30.09): визитка 2.0 — плавающая карточка по макету
// profile-card-pro.html. Экран клуба удалён вместе с лигами (D54/D78), поэтому
// проверка «стрик из клуба» снята; явная кнопка «Закрыть» и «Назад» остаются.
describe('PlayerProfileModal close affordance', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'PlayerProfileModal.tsx'),
    'utf8',
  );

  it('has an explicit close button on the card, not only backdrop or swipe', () => {
    expect(source).toContain('testID="player-profile-close"');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('onClose: () => void;');
  });

  it('closes an open sheet first on the system back gesture', () => {
    expect(source).toContain('onRequestClose={handleHardwareBack}');
    expect(source).toContain('if (backInterceptRef.current?.()) return;');
  });
});
