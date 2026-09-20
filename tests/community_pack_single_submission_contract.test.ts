/**
 * Сторож: повторное «Сделать публичным» обновляет ОДНУ заявку, а не плодит дубли.
 *
 * Инцидент владельца 20.09.2026: в админке («Наборы сообщества» → «Заявки»)
 * висели ТРИ одинаковые заявки «My phrases verbs» — 12:31, 12:44 и 12:49.
 * Три нажатия кнопки публикации дали три документа в community_pack_submissions.
 *
 * Корень был на клиенте, в publishLocalPack.ts, и состоял из двух звеньев:
 *   1. в поле cloudPackId (по контракту — id документа community_packs)
 *      записывался возвращённый submissionId, то есть id документа ДРУГОЙ
 *      коллекции, community_pack_submissions. Сервер такого набора не находил,
 *      сбрасывал updatePackId и уходил в ветку создания;
 *   2. ключ идемпотентности publicationKey перезаписывался после каждой
 *      отправки, поэтому серверная защита «один submissionKey — одна заявка»
 *      не срабатывала: ключ каждый раз был новым.
 *
 * Обычные тесты этого класса НЕ ловят: сервер корректен и изолированно зелёный,
 * ломал контракт вызывающий. Поэтому сторожим именно клиентскую сторону.
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

describe('публикация набора не создаёт дубли заявок', () => {
  const client = read('app', 'community_packs', 'publishLocalPack.ts');
  const publishFn = client.slice(
    client.indexOf('export async function publishLocalAuthorPack('),
    client.indexOf('/** Withdraw public visibility'),
  );

  it('фрагмент публикации найден (иначе сторож охраняет пустоту)', () => {
    expect(publishFn.length).toBeGreaterThan(200);
  });

  it('id заявки НИКОГДА не записывается в cloudPackId', () => {
    // Ровно та строка, что породила инцидент:
    //   cloudPackId: local.cloudPackId ?? result.submissionId
    expect(publishFn).not.toMatch(/cloudPackId:[^,;\n]*result\.submissionId/u);
    expect(publishFn).not.toMatch(/cloudPackId:[^,;\n]*submissionId/u);
  });

  it('сохраняется только просанированный id опубликованного набора', () => {
    expect(publishFn).toContain('sanitizeCloudPackId(local.cloudPackId, local.id)');
    // В updateLocalPackPublication уходит проверенная переменная, не сырое поле.
    expect(publishFn).toMatch(/updateLocalPackPublication\([\s\S]*?cloudPackId,[\s\S]*?\)/u);
  });

  it('ключ идемпотентности берётся из сохранённого publicationKey', () => {
    // Он обязан пережить повторные нажатия — иначе серверная склейка заявок
    // по submissionKey не работает.
    expect(publishFn).toContain('local.publicationKey ?? local.id');
    expect(publishFn).toContain('submissionKey,');
    expect(publishFn).toContain('replacePending: true');
  });

  it('publicationKey не пересоздаётся при отправке', () => {
    // Новый ключ на каждой отправке = новая заявка на сервере. Обновление
    // ключа допустимо ТОЛЬКО при отзыве публикации (withdrawLocalAuthorPack).
    expect(publishFn).not.toMatch(/publicationKey:\s*`/u);
    expect(publishFn).not.toMatch(/publicationKey:[^,\n]*Date\.now\(\)/u);
  });

  it('отказ публикации пишет причину в лог навсегда, а не только в __DEV__', () => {
    const catchBlock = publishFn.slice(publishFn.indexOf('} catch'));
    // Префикс [UGC-PUBLISH] живёт в хелпере logPublish — здесь сторожим сам
    // вызов трассировки, а не литерал строки.
    expect(catchBlock).toContain('logPublish(');
    expect(catchBlock).not.toContain('__DEV__');
    // Немой catch запрещён: причина обязана попасть в лог.
    expect(catchBlock).toMatch(/code|message/u);
  });

  it('трассировка показывает ключ, режим и оба значения id', () => {
    expect(client).toContain('[UGC-PUBLISH]');
    expect(publishFn).toContain('logPublish(');
    expect(publishFn).toContain('submissionKey');
    expect(publishFn).toContain('cloudPackIdStored');
    expect(publishFn).toContain('cloudPackIdUsed');
    expect(publishFn).toContain('mode');
  });
});

describe('самолечение телефонов с битым cloudPackId', () => {
  const client = read('app', 'community_packs', 'publishLocalPack.ts');

  it('sanitizeCloudPackId экспортируется и отбрасывает id заявок', () => {
    expect(client).toContain('export function sanitizeCloudPackId');
    // Детерминированный id заявки: `create_<sha256>` (см. community_packs.ts).
    expect(client).toContain("value.startsWith('create_')");
    // Локальный id набора — тоже не идентификатор опубликованного набора.
    expect(client).toContain('LOCAL_AUTHOR_PACK_ID_PREFIX');
  });

  it('константа префикса импортируется, а не вписана строкой', () => {
    expect(client).toMatch(/import\s*\{[^}]*LOCAL_AUTHOR_PACK_ID_PREFIX[^}]*\}\s*from\s*'\.\/localAuthorPacks'/u);
  });
});

describe('серверная защита от дублей осталась на месте', () => {
  const server = read('functions', 'src', 'community_packs.ts');

  it('заявка создаётся с детерминированным id по submissionKey', () => {
    expect(server).toContain('const deterministicId = submissionKey');
    expect(server).toContain('create_${createHash(');
  });

  it('повторная отправка того же ключа обновляет заявку, а не создаёт вторую', () => {
    const createBranch = server.slice(server.indexOf('const deterministicId = submissionKey'));
    // tx.create упал бы на существующем документе — поэтому ветка «existing»
    // обязана обновлять payload, а не создавать.
    expect(createBranch).toContain('tx.update(subRef, { status: \'pending\', payload, payloadHash, submittedAt: now });');
  });
});
