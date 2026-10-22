// зачем (координатор 22.10): три мелких помощника Learning V2 для ЯДРА и 8 · МОМЕНТЫ —
// событие «занятие засчитано», id документа inbox и запуск занятия по номерам урока/занятия.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const sync = read('app/learning_v2_required_session_completion_sync.ts');
const server = read('functions/src/learning_v2/required_session_completion_callable.ts');
const events = read('app/events.ts');
const route = read('app/learning_v2_home_continue_route.ts');

describe('learning_v2_session_credited', () => {
  it('объявлено в карте событий с тремя полями', () => {
    expect(events).toContain('learning_v2_session_credited: { sessionId: string; mutationId: string; awardedAtMs: number };');
  });

  it('уходит только после того, как принятие сервера легло на диск', () => {
    const persistAt = sync.indexOf('return withLocalAccountLock(() => persistTransportBridge(');
    const emitAt = sync.indexOf("emitAppEvent('learning_v2_session_credited', credited);");
    expect(persistAt).toBeGreaterThan(-1);
    expect(emitAt).toBeGreaterThan(persistAt);
    // данные берутся из принятого ответа сервера в этом же проходе: серверный mutationId и id занятия из конверта
    expect(sync).toContain('sessionId: payload.canonicalSessionId,');
    const acceptedAt = sync.indexOf("server.kind !== 'accepted'");
    const recordAt = sync.indexOf('creditedSessions.set(item.mutationId, Object.freeze({');
    expect(recordAt).toBeGreaterThan(acceptedAt);
    expect(sync).toContain("console.warn('[V2-SESSION-CREDITED] skip'");
  });
});

describe('requiredSessionCompletionInboxDocumentIdV1', () => {
  it('формула совпадает с серверной inboxDocumentId', () => {
    const body = (src: string, startMarker: string) => {
      const at = src.indexOf(startMarker);
      expect(at).toBeGreaterThan(-1);
      return src.slice(at, src.indexOf('})}`', at));
    };
    const serverBody = body(server, 'const inboxDocumentId = ');
    const clientBody = body(sync, 'export function requiredSessionCompletionInboxDocumentIdV1(');
    for (const part of ['`rsciv1_${hashCanonicalBody({', 'learning-v2-required-session-completion-inbox-key.v1', 'progressAccountScopeHash:', 'mutationId:']) {
      expect(serverBody).toContain(part);
      expect(clientBody).toContain(part);
    }
    // одна и та же общая функция хэша у клиента и сервера
    expect(sync).toContain("from '../modules/learning-v2/policies/decision_registry';");
    expect(server).toContain('from "../../../modules/learning-v2/policies/decision_registry";');
  });
});

describe('launchLearningV2SessionByOrdinalsV1', () => {
  it('идёт общим путём «Продолжить» и честно отказывает невыпущенному и неверному', () => {
    const at = route.indexOf('export async function launchLearningV2SessionByOrdinalsV1(');
    expect(at).toBeGreaterThan(-1);
    const fn = route.slice(at, route.indexOf('export function resetHomeContinueV2LaunchForTests', at));
    expect(fn).toContain('if (LEARNING_V2_HIDDEN) {');
    expect(fn).toContain('isLearningV2SessionReleasedV1(lessonOrdinal, sessionOrdinal)');
    expect(fn).toContain('learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal)');
    expect(fn.match(/ctx\.push\('\/learning-v2\/course'\)/g)).toHaveLength(2);
    expect(fn).toContain('await launchHomeContinueV2({');
    expect(fn).toContain("runKind: input.repeat ? 'repeat' : 'initial',");
  });
});
