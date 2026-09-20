/**
 * Сторож публикации набора сообщества.
 *
 * История (важна, чтобы сторож снова не начал охранять ложь):
 *
 * 20.09.2026 владелец увидел в админке ТРИ одинаковые заявки «My phrases verbs»
 * (12:31, 12:44, 12:49). Был поставлен диагноз «клиент каждый раз шлёт новый
 * submissionKey» и написана функция sanitizeCloudPackId, отбрасывавшая значения
 * вида `create_*`. Аудит диагноз ОПРОВЕРГ:
 *
 *   1. publicationKey был стабилен: saveLocalAuthorPack хранит его через
 *      `existing?.publicationKey`, а публикация писала обратно ТО ЖЕ значение,
 *      которое прочитала. Серверная идемпотентность работала.
 *   2. Опубликованный набор создаётся сервером как
 *      community_packs.doc(submissionId) — то есть ПОД ID ЗАЯВКИ. При наличии
 *      submissionKey этот id всегда `create_<sha256>`. Значит id заявки и id
 *      набора — одно и то же значение по конструкции, и отбрасывать `create_*`
 *      означало выбрасывать ЗАКОННЫЙ идентификатор: автор терял возможность
 *      править свой опубликованный набор.
 *
 * Поэтому сторож охраняет ДВА инварианта и НЕ закрепляет версию про ключ:
 *   — cloudPackId сохраняется, а не «санируется» по форме строки;
 *   — каждый ранний выход и каждый catch называет причину (правило владельца
 *     «сперва логи»: немой выход = «нажал, ничего не произошло, в логе пусто»).
 *
 * Настоящая причина трёх заявок НЕ НАЙДЕНА и ищется по логам [UGC-PUBLISH]
 * с телефона владельца. Гадать запрещено.
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

const client = read('app', 'community_packs', 'publishLocalPack.ts');
const publishFn = client.slice(
  client.indexOf('export async function publishLocalAuthorPack('),
  client.indexOf('/** Withdraw public visibility'),
);

describe('идентификатор набора не теряется', () => {
  it('фрагмент публикации найден (иначе сторож охраняет пустоту)', () => {
    expect(publishFn.length).toBeGreaterThan(400);
  });

  it('возвращённый сервером id сохраняется в cloudPackId', () => {
    // Прежнее поведение, ошибочно принятое за баг и откаченное обратно.
    // Без него автор не сможет править свой опубликованный набор.
    expect(publishFn).toContain('result.submissionId');
    expect(publishFn).toMatch(/cloudPackId:\s*nextCloudPackId/u);
  });

  it('id НЕ фильтруется по форме строки', () => {
    // sanitizeCloudPackId отбрасывала `create_*` — а это законный id набора.
    expect(client).not.toContain('sanitizeCloudPackId');
    expect(publishFn).not.toMatch(/startsWith\('create_'\)/u);
  });

  it('уже известный id набора уходит как updatePackId', () => {
    expect(publishFn).toMatch(/updatePackId:\s*cloudPackId/u);
  });

  it('ключ идемпотентности читается и возвращается без изменения', () => {
    // Стабильный ключ — то, что позволяет серверу склеить повторную отправку
    // в ту же заявку. Пересоздание ключа допустимо ТОЛЬКО при отзыве публикации.
    expect(publishFn).toContain('local.publicationKey ?? local.id');
    expect(publishFn).toMatch(/publicationKey:\s*submissionKey/u);
    expect(publishFn).not.toMatch(/publicationKey:[^,\n]*Date\.now\(\)/u);
  });
});

describe('ни одного немого выхода', () => {
  it('каждый ранний return называет причину', () => {
    for (const marker of [
      'exit:cloud_disabled',
      'exit:not_found',
      'exit:invalid',
      'exit:account_changed',
    ]) {
      expect(publishFn).toContain(marker);
    }
  });

  it('отказ валидации печатает КОНКРЕТНУЮ причину, а не факт отказа', () => {
    // validateCommunityPackPayload возвращает код: card_count, title_or_desc,
    // study_target_gate… Голое «invalid» не даёт понять, что чинить.
    expect(publishFn).toContain('invalidReason');
    expect(publishFn).toMatch(/reason:\s*String\(invalidReason\)/u);
  });

  it('проглоченные ошибки чтения и личности пишут причину', () => {
    // Запрет немого catch: пустой список выглядел бы как «набора нет»,
    // хотя на деле упало чтение хранилища.
    expect(publishFn).toContain('load:failed');
    expect(publishFn).toContain('identity:failed');
    expect(publishFn).not.toMatch(/catch\(\(\)\s*=>\s*\[\]\)/u);
    expect(publishFn).not.toMatch(/catch\(\(\)\s*=>\s*null\)/u);
  });

  it('отказ отправки логируется в релизе, а не только в __DEV__', () => {
    const catchBlock = publishFn.slice(publishFn.indexOf('} catch'));
    expect(catchBlock).toContain('logPublish(');
    expect(catchBlock).not.toContain('__DEV__');
    expect(catchBlock).toMatch(/code/u);
    expect(catchBlock).toMatch(/message/u);
  });

  it('три выхода по смене аккаунта различимы между собой', () => {
    // Иначе в логе три неразличимых 'error' и непонятно, какой сработал.
    expect(publishFn).toContain("at: 'after getCanonicalUserId'");
    expect(publishFn).toContain("at: 'after signInAnonymously'");
    expect(publishFn).toContain("at: 'after submit returned'");
  });

  it('трассировка печатает значения, а не голые булевы', () => {
    expect(client).toContain('[UGC-PUBLISH]');
    expect(publishFn).toMatch(/authorStableId:\s*authorStableId\s*\?\?\s*null/u);
    expect(publishFn).not.toContain('hasAuthorId: Boolean(');
  });
});

describe('серверная модель идентификаторов (основание для клиента)', () => {
  const server = read('functions', 'src', 'community_packs.ts');

  it('опубликованный набор создаётся ПОД ID ЗАЯВКИ', () => {
    // Ровно этот факт делает фильтрацию по `create_` невозможной.
    // Если строка изменится — клиентскую модель надо пересматривать.
    expect(server).toContain('db.collection(COMMUNITY_PACKS).doc(submissionId)');
  });

  it('id заявки детерминирован по submissionKey', () => {
    expect(server).toContain('const deterministicId = submissionKey');
    expect(server).toContain('create_${createHash(');
  });

  it('повторная отправка того же ключа обновляет заявку, а не создаёт вторую', () => {
    const createBranch = server.slice(server.indexOf('const deterministicId = submissionKey'));
    // Гибко к форматированию: важен факт update той же заявки, а не её создание.
    expect(createBranch).toMatch(/tx\.update\(subRef,\s*\{[^}]*status:\s*'pending'[^}]*payload[^}]*\}/u);
  });

  it('сервер сам умеет вернуть id опубликованного набора по ключу', () => {
    // Подстраховка на случай пустого cloudPackId на телефоне.
    expect(server).toContain('prior.data()?.publishedPackId');
  });
});
