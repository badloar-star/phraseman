import fs from 'node:fs';
import path from 'node:path';

describe('friends chest human UI contract', () => {
  const modal = fs.readFileSync(path.join(process.cwd(), 'components/friends_together/FriendsChestModal.tsx'), 'utf8');
  const card = fs.readFileSync(path.join(process.cwd(), 'components/friends_together/FriendsChestCard.tsx'), 'utf8');
  const friends = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/friends.tsx'), 'utf8');

  it('uses the shared celebratory bottom sheet and only the approved primary copy', () => {
    expect(modal).toContain('HybridSheetShell');
    // зачем: владелец 2026-08-24 снял заголовок «Общее пламя зажжено» — героем
    // модалки стал сам ассет пламени, а подпись называет повод награды.
    expect(modal).toContain("L('Награда за неделю вместе', 'Нагорода за тиждень разом', 'Recompensa por la semana juntos', 'Recompensa pela semana juntos', 'Phần thưởng cho tuần cùng nhau', 'Hadiah untuk sepekan bersama', 'Birlikte geçen hafta ödülü', 'Nagroda za tydzień razem')");
    expect(modal).not.toContain('Общее пламя зажжено');
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
  it('shows the shared flame asset as the hero and never the generic cube icon', () => {
    // зачем: у общего пламени есть свой ассет по теме и стадии — тот же, что
    // дышит на карточке. Кубик Ionicons был заглушкой и вернуться не должен.
    expect(modal).toContain('resolveFriendsSharedFlameAsset');
    expect(modal).toContain('friends-chest-modal-flame');
    expect(modal).not.toContain('name="cube"');
  });

  it('calls the runes currency by its name and never "жемчужины"', () => {
    // зачем: поле `stars` — это РУНЫ (constants/runes.ts, переименование 23.08).
    // Жемчужины (осколки 💎) — другая валюта, и сундук её не выдаёт вовсе.
    expect(modal).toContain('runeWord');
    // Ищем именно ЛОКАЛИЗОВАННУЮ строку валюты (L('жемчужин', …)), а не любое
    // вхождение слова: в шапке файла оно стоит осознанно — объясняет, почему
    // подпись была неверной. Запрет на комментарий стёр бы это объяснение.
    expect(modal).not.toMatch(/L\(\s*'жемчужин'/);
    expect(modal).not.toMatch(/\$\{L\(\s*'жемчужин'/);
  });

  it('renders the direct xp and full-energy rewards granted by the chest', () => {
    expect(modal).toContain('xpGranted');
    expect(modal).toContain('energyRefilled');
    expect(modal).toContain("L('Полная энергия'");
  });

  it('splits rewards into two levels so the top tier is not one long dotted list', () => {
    // зачем: на тире III наград шесть; одной строкой они читались бы списком.
    // Числовое (руны, опыт) — крупно, работающее (энергия/буст/щит/аура) — тише.
    expect(modal).toContain('primaryRewards');
    expect(modal).toContain('bonusRewards');
    expect(modal).toContain('friends-chest-reward-bonus');
    // Приглушённый уровень берёт СУЩЕСТВУЮЩИЙ токен темы: textSecondary в
    // палитре нет, и опечатка сделала бы строку невидимой на всех темах.
    expect(modal).toContain('t.textMuted');
    expect(modal).not.toContain('t.textSecondary');
  });
});
