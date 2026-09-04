/**
 * Сторож: правка СВОЕГО набора не наказывает автора.
 *
 * Владелец 2026-09-04 (репорт #7ea8 «чи можна зробити картки мною створені і ще
 * не опубліковані доступними для редагування»): решение — свои наборы правятся
 * из «Моих наборов», а повторная модерация не должна отбирать витрину.
 *
 * Класс бага, который сторожим: отправка правки снимала старую, УЖЕ ОДОБРЕННУЮ
 * версию из семантического реестра ещё до проверки. Автор за одну опечатку
 * терял место в выдаче на всё время модерации. Обычные тесты этого не ловят:
 * они проверяют статусы, а не момент снятия.
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

describe('правка своего набора не снимает его с витрины', () => {
  const server = read('functions', 'src', 'community_packs.ts');

  it('отправка правки НЕ снимает старую версию из реестра', () => {
    const submit = server.slice(
      server.indexOf('if (updatePackId) {'),
      server.indexOf('const deterministicId'),
    );
    expect(submit.length).toBeGreaterThan(0);
    // Снятие = вызов с next === null. В ветке отправки его быть не должно.
    expect(submit).not.toMatch(/syncFlashcardRegistryPackMutation\([^)]*,\s*null\s*\)/u);
  });

  it('одобрение правки заменяет старую версию новой, а не добавляет вторую', () => {
    const approve = server.slice(server.indexOf('if (editTarget) {'));
    // previous !== null: иначе карточки прежней версии осели бы в индексе дублей
    // навсегда — раньше их снимали при отправке, теперь этого шага нет.
    expect(approve).toContain('Array.isArray(existing.cards) ? existing.cards : []');
  });

  it('отказ не восстанавливает реестр: восстанавливать нечего', () => {
    // Обе «неодобряющие» ветки: reject и request_changes — до одобрения,
    // которое начинается с чтения набора-цели правки.
    const reject = server.slice(
      server.indexOf("if (action === 'reject') {"),
      server.indexOf('const editTarget = String(d.editTargetPackId'),
    );
    // Двойная запись тех же карточек — прямое следствие «восстановления» того,
    // что никто не снимал.
    expect(reject).not.toMatch(/await syncFlashcardRegistryPackMutation\(/u);
  });

  it('свой набор редактируется прямо из «Моих наборов»', () => {
    // Раньше кнопка жила только в каталоге сообщества и требовала
    // isCommunityUgc — то есть уже опубликованный набор. Черновик править
    // было негде, о чём и был репорт.
    const screen = read('app', 'flashcards_my_packs.tsx');
    expect(screen).toContain('community_pack_create');
    expect(screen).toContain('fc-my-packs-pack-edit-');
    // Только «Созданные мной»: в «Добавленных» лежат чужие наборы.
    expect(screen).toContain("key === 'created'");
  });
});
