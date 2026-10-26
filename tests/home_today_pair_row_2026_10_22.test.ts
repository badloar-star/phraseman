// зачем (координатор 22.10; идея 1 «Серия вдвоём», данные 8 · МОМЕНТЫ; макет friends-full homeRow): первая строка «Сегодня» на Главной —
// «Серия вдвоём · <имя>» (тексты Переводчика pair_copy.ts), только за флагом FRIENDS_TOGETHER_UI_ENABLED и без чтений Firestore (хук
// use_home_friend_pair_row); строка в обеих ветках панели, тап — свежий обработчик из ref; Главная передаёт строку карточке.
import { pairHomeSub, pairHomeTitle } from '../app/friends_together/pair_copy';
import { readSource } from './helpers/read_source';

describe('«Сегодня» на Главной: строка «Серия вдвоём»', () => {
  it('панель: проп pairRow — первая строка над задачами в обеих ветках, тап зовёт свежий обработчик, мемо сравнивает данные строки', () => {
    const card = readSource('components/home/v2/HomeV2TodayCard.tsx');
    expect(card.split('testID="home-v2-today-pair"').length - 1).toBe(2);
    expect(card.split('onPress={() => latestRef.current.pairRow?.onPress()}').length - 1).toBe(2);
    const scene = card.slice(card.indexOf('if (scene && title !== null) {'), card.indexOf('<View testID="home-v2-today" style={[s.card'));
    expect(scene.indexOf('testID="home-v2-today-pair"')).toBeLessThan(scene.indexOf('{tasks.map((task, index) => {'));
    const list = card.slice(card.indexOf('<View style={s.list}>'));
    expect(list.indexOf('testID="home-v2-today-pair"')).toBeLessThan(list.indexOf('{tasks.map((task, index) => {'));
    expect(card).toContain('(a.pairRow?.friendUid ?? null) !== (b.pairRow?.friendUid ?? null)');
    expect(card).toContain("pairGap: { marginBottom: 10 },");
  });

  it('Главная зовёт готовый хук и передаёт строку карточке', () => {
    const home = readSource('app/(tabs)/home.tsx');
    expect(home).toContain('const homeFriendPairRow = useHomeFriendPairRow(todayTasks.tasks, (task) => go(task.route));');
    expect(home).toContain('pairRow={homeFriendPairRow}');
  });

  it('за флагом и без чтений Firestore: хук выключен флагом, данные — снимок «Вместе» на телефоне', () => {
    const hook = readSource('hooks/use_home_friend_pair_row.ts');
    expect(hook).toContain('const on = FRIENDS_TOGETHER_UI_ENABLED && enabled;');
    expect(hook).not.toMatch(/from ['"][^'"]*firestore|getDocs?\(|onSnapshot\(/); // код, не комментарий «ни чтений Firestore»
    // 26.10 (владелец через координатора): «Вместе» включён в 2.0.3; строку по-прежнему гасит удалённый ключ (`enabled` выше)
    expect(readSource('app/friends_together/together_config.ts')).toContain('export const FRIENDS_TOGETHER_UI_ENABLED = true;');
  });

  it('тексты — ключи Переводчика: «Серия вдвоём · Лидия» и «Занятие сделано · 3 дня подряд»', () => {
    expect(pairHomeTitle('ru', 'Лидия')).toBe('Серия вдвоём · Лидия');
    expect(pairHomeSub('ru', 3)).toBe('Занятие сделано · 3 дня подряд');
  });
});
