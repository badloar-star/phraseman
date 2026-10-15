// зачем (Ревизор по R09, 🟡; просьба Моментов 15.10): занятие V2 готовится до 12 с — карточка «Продолжить» не молчит. Приглушение 0.72 (как primaryBusy итога занятия) и busy для скринридера;
// геометрия не меняется (не скелет). Только для V2-продолжения: у старого урока запуска-подготовки нет.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('карточка «Продолжить»: вид «готовим», пока занятие V2 готовится', () => {
  it('Главная берёт состояние запуска из useHomeContinueV2Launching и отдаёт карточке только для V2', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('useHomeContinueV2Launching');
    expect(home).toContain('const continueV2Launching = useHomeContinueV2Launching();');
    expect(home).toContain('busy={continueV2 !== null && continueV2Launching}');
  });

  it('карточка: приглушение 0.72 и accessibilityState.busy, размеры не трогаются', () => {
    const card = read('components/home/v2/HomeV2ContinueCard.tsx');
    expect(card).toContain('busy?: boolean;');
    expect(card).toContain('accessibilityState={{ busy: pending || busy }}');
    expect(card).toContain('style={[s.card, glass, busy ? s.cardBusy : null]}');
    expect(card).toContain('cardBusy: { opacity: 0.72 },');
    expect(card).not.toMatch(/cardBusy: \{[^}]*(height|width|padding|margin)/);
  });
});
