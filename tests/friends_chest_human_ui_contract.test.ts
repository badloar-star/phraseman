import fs from 'node:fs';
import path from 'node:path';

describe('friends chest human UI contract', () => {
  const modal = fs.readFileSync(path.join(process.cwd(), 'components/friends_together/FriendsChestModal.tsx'), 'utf8');
  const card = fs.readFileSync(path.join(process.cwd(), 'components/friends_together/FriendsChestCard.tsx'), 'utf8');
  const friends = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/friends.tsx'), 'utf8');

  it('uses the shared celebratory bottom sheet and only the approved primary copy', () => {
    expect(modal).toContain('HybridSheetShell');
    expect(modal).toContain("L('Общее пламя зажжено', 'Спільне полум’я запалено', 'Llama compartida encendida', 'Chama compartilhada acesa', 'Ngọn lửa chung đã bừng sáng', 'Api bersama telah menyala', 'Ortak alev parlıyor', 'Wspólny płomień rozpalony')");
    expect(modal).toContain("'Забрать'");
    expect(modal).not.toContain('<Modal');
    expect(modal).not.toContain('×2 опыта');
    expect(modal).not.toContain('щит цепи');
  });

  it('shows the DEV collected state and never calls the real claim callable for a DEV scenario', () => {
    expect(card).toContain('Собрано · DEV');
    expect(friends).toContain('openDevChestScenario');
    expect(friends).toMatch(/if \(ENABLE_DEV_TOOLS && devBotsState\.chestScenarioTier > 0\)[\s\S]*?return;[\s\S]*?claimWeeklyChest/);
  });

  it('names the shared flame and its claim action in every supported locale', () => {
    expect(card).toContain("L('Общее пламя', 'Спільне полум’я', 'Llama compartida', 'Chama compartilhada', 'Ngọn lửa chung', 'Api bersama', 'Ortak alev', 'Wspólny płomień')");
    expect(card).toContain("L('Собрать искры', 'Зібрати іскри', 'Recoger chispas', 'Coletar faíscas', 'Thu thập tia lửa', 'Kumpulkan percikan', 'Kıvılcımları topla', 'Zbierz iskry')");
  });

  it('uses localized flame stages and spark-based ready and collected states', () => {
    expect(card).toContain("L('Искры собраны', 'Іскри зібрано', 'Chispas recogidas', 'Faíscas coletadas', 'Đã thu thập tia lửa', 'Percikan terkumpul', 'Kıvılcımlar toplandı', 'Iskry zebrane')");
    expect(card).toContain("L('Искры готовы', 'Іскри готові', 'Chispas listas', 'Faíscas prontas', 'Tia lửa đã sẵn sàng', 'Percikan siap', 'Kıvılcımlar hazır', 'Iskry gotowe')");
    expect(card).toContain("L('Общее пламя', 'Спільне полум’я', 'Llama compartida', 'Chama compartilhada', 'Ngọn lửa chung', 'Api bersama', 'Ortak alev', 'Wspólny płomień')");
    expect(card).toContain("L('Пламя', 'Полум’я', 'Llama', 'Chama', 'Ngọn lửa', 'Api', 'Alev', 'Płomień')");
    expect(card).toContain("L('Искра', 'Іскра', 'Chispa', 'Faísca', 'Tia lửa', 'Percikan', 'Kıvılcım', 'Iskra')");
  });

  it('removes every localized chest-opening title from the result modal', () => {
    for (const obsoleteTitle of [
      'Сундук открыт',
      'Скриню відкрито',
      'Cofre abierto',
      'Baú aberto',
      'Đã mở rương',
      'Peti terbuka',
      'Sandık açıldı',
      'Skrzynia otwarta',
    ]) {
      expect(modal).not.toContain(obsoleteTitle);
    }
  });

  it('does not expose weekly-chest copy and keeps the lime claim text dark', () => {
    for (const obsoleteCopy of [
      'Сундук недели',
      'Скриня тижня',
      'Cofre semanal',
      'Baú semanal',
      'Rương tuần',
      'Peti mingguan',
      'Haftalık sandık',
      'Skrzynia tygodnia',
    ]) {
      expect(card).not.toContain(obsoleteCopy);
    }
    expect(card).toContain("color: t.correctText ?? '#0B0B0E'");
    expect(modal).toContain('color: t.correctText');
  });
});
