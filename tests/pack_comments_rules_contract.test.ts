/**
 * Контракт откликов: правила Firestore и клиентская модель обязаны совпадать.
 *
 * зачем именно сторож, а не комментарий: в этом же соц-слое списки уже расходились
 * между `firestore.rules` и клиентом, и каждое расхождение стоило круга разбора
 * (см. cloud_sync_rules_blocklist_mirror_contract.test.ts и историю
 * «прогресс не сохранялся»). Предел длины отклика и набор разрешённых полей
 * заданы в ДВУХ местах по необходимости — правило не умеет импортировать TS,
 * а клиент не читает rules. Здесь они сверяются механически.
 *
 * Поведение самих правил (кто может писать, закреплять, скрывать, удалять)
 * проверено на эмуляторе правил Firestore 2026-09-04, 15 сценариев:
 * писать может только добавивший набор себе · нельзя от чужого имени · текст
 * >200 отклоняется · нельзя создать сразу закреплённый · закрепляет и скрывает
 * только автор НАБОРА · реакцию ставит любой · текст не редактируется ·
 * удаляет только автор отклика · commentsCount меняется шагом ±1.
 * Отдельно проверено, что новые правила НЕ ломают синхронизацию прогресса.
 */
import { readFileSync as readFileSyncRaw } from 'fs';
import path from 'path';
import {
  COMMUNITY_PACK_COMMENTS_COUNT_FIELD,
  COMMUNITY_PACK_COMMENTS_SUBCOLLECTION,
  PACK_COMMENT_MAX_LENGTH,
} from '../app/community_packs/packComments';

// зачем: на Windows файлы лежат в CRLF, и сравнение многострочных фрагментов
// валилось бы по переводу строки, а не по сути (тот же приём, что в соседнем
// контракте правил).
const read = (p: string): string => String(readFileSyncRaw(p, 'utf8')).replace(/\r\n/g, '\n');
const rules = read(path.join(process.cwd(), 'firestore.rules'));

describe('отклики: правила и клиент не разошлись', () => {
  it('подколлекция названа одинаково в правилах и в коде', () => {
    expect(COMMUNITY_PACK_COMMENTS_SUBCOLLECTION).toBe('pack_comments');
    expect(rules).toContain(`match /${COMMUNITY_PACK_COMMENTS_SUBCOLLECTION}/{commentId}`);
  });

  it('счётчик разрешён к правке клиентом и назван так же, как в коде', () => {
    expect(COMMUNITY_PACK_COMMENTS_COUNT_FIELD).toBe('commentsCount');
    expect(rules).toContain(`'${COMMUNITY_PACK_COMMENTS_COUNT_FIELD}'`);
    // hasOnly перечисляет ровно три счётчика: чужие поля документа набора
    // клиенту по-прежнему закрыты (название, карточки, статус модерации).
    expect(rules).toContain(
      "hasOnly(['likesCount', 'addedCount', 'commentsCount'])",
    );
  });

  it('предел длины отклика в правилах равен пределу в модели', () => {
    // Правило не умеет импортировать TS, поэтому число продублировано. Если
    // кто-то поменяет одну сторону — сторож назовёт вторую.
    expect(PACK_COMMENT_MAX_LENGTH).toBe(200);
    expect(rules).toContain(`request.resource.data.text.size() <= ${PACK_COMMENT_MAX_LENGTH}`);
  });

  it('дельта счётчика откликов ограничена ±1 — накрутка пачкой невозможна', () => {
    expect(rules).toContain("communityPackCounterDelta('commentsCount') >= -1");
    expect(rules).toContain("communityPackCounterDelta('commentsCount') <= 1");
    expect(rules).toContain("request.resource.data.get('commentsCount', 0) >= 0");
  });

  it('писать может только добавивший набор себе — то же правило, что у лайка', () => {
    expect(rules).toContain('function packAddedByMe(packId)');
    expect(rules).toContain('/pack_adds/$(request.auth.uid))');
    expect(rules).toContain('allow create: if packAddedByMe(packId) && packCommentCreateShapeOk();');
  });

  it('отклик пишется только от своего имени', () => {
    expect(rules).toContain('request.resource.data.authorId == request.auth.uid');
  });

  it('нельзя создать сразу закреплённый отклик', () => {
    // Иначе любой писал бы себе «наверх» ветки в обход автора набора.
    expect(rules).toContain("request.resource.data.get('pinned', false) == false");
  });

  it('закрепление и скрытие — только автору НАБОРА', () => {
    expect(rules).toContain('function isPackAuthor(packId)');
    expect(rules).toMatch(/hasOnly\(\['pinned'\]\)\s*\n\s*&& isPackAuthor\(packId\)\)/);
    expect(rules).toMatch(/hasOnly\(\['hiddenByAuthor'\]\)\s*\n\s*&& isPackAuthor\(packId\)\)/);
  });

  it('удалить можно только СВОЙ отклик — чужой текст не стирает никто', () => {
    expect(rules).toContain(
      "allow delete: if request.auth != null && resource.data.authorId == request.auth.uid;",
    );
  });

  it('текст отклика не редактируется после публикации', () => {
    // Разрешённые к обновлению наборы полей перечислены явно, 'text' среди них нет:
    // правка задним числом ломает смысл жалоб и закреплений.
    const block = rules.slice(
      rules.indexOf('match /pack_comments/{commentId}'),
      rules.indexOf('match /pack_comments/{commentId}') + 2600,
    );
    const updateSection = block.slice(block.indexOf('allow update:'));
    expect(updateSection).not.toContain("'text'");
  });

  it('скрытый отклик виден только автору набора и написавшему', () => {
    expect(rules).toContain("resource.data.get('hiddenByAuthor', false) == false");
  });
});
