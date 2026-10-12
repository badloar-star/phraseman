// зачем (аудит Optimistic UI Диалогов, 12.10; docs/phraseman-2.0/R1_DIALOGS_OPTIMISTIC_UI.md): реплика, отправленная до готовности серверной сессии, не должна зависать.
// Раньше очередь = `sending=true`, а эффект отправки требовал `!sending` — ход не уходил никогда. Плюс: недоступный старт показывает «Повторить», «Итоги»/Plus защищены от двойного тапа,
// повтор своей записи не глотает ошибки.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Диалоги: очередь хода, повтор, двойной тап', () => {
  const src = read('app/dialogue_v2_session.tsx');

  it('очередь хода — отдельный ref-флаг, эффект отправки не зависит от `sending`', () => {
    expect(src).toContain('const queuedTurnRef = useRef(false);');
    const flush = src.slice(src.indexOf('const pending = pendingTurnRef.current;\n    if (!serverSession || !pending) return;'), src.indexOf('}, [serverSession]);'));
    expect(flush).toContain('if (!queuedTurnRef.current) {');
    expect(flush).toContain('queuedTurnRef.current = false;');
    expect(flush).toContain('void runPendingTurn(pending);');
    // старое условие, из-за которого очередь не уходила, не вернулось
    expect(src).not.toContain('if (!serverSession || !pending || sending) return;');
    // постановка в очередь выставляет флаг
    const queueBranch = src.slice(src.indexOf("turn:send → queued until session ready"));
    expect(queueBranch.slice(0, 400)).toContain('queuedTurnRef.current = true;');
  });

  it('старт сессии не удался: ход в очереди → панель ошибки; «Повторить» без сессии ставит очередь и перезапускает старт', () => {
    expect(src).toContain("if (serverSessionState !== 'unavailable' || !queuedTurnRef.current) return;");
    expect(src).toContain('[DIALOGUE-V2] turn:queued → session start unavailable, showing error');
    expect(src).toContain('[DIALOGUE-V2] turn:send → session start unavailable, error panel at once');
    const retry = src.slice(src.indexOf('const retry = () => {'), src.indexOf('const openSummary'));
    expect(retry).toContain('if (pending && !serverSession && !sending && !turnStartingRef.current) {');
    expect(retry).toContain('queuedTurnRef.current = true;');
    expect(retry).toContain("if (serverSessionState === 'unavailable') setStartAttempt(0);");
  });

  it('«Итоги» и «Plus» открываются через защищённую навигацию', () => {
    expect(src).toContain("import { useGuardedNav } from '../hooks/use-guarded-nav';");
    expect(src).toContain('const nav = useGuardedNav();');
    expect(src).toContain('nav.replace(route as never);');
    expect(src).toContain('nav.push(route as never);');
    expect(src).toContain('const openPlus = () => nav.push({');
    expect(src).not.toMatch(/router\.(push|replace)\(route\)/);
  });

  it('повтор своей записи: ошибки плеера пишут причину, немых catch нет', () => {
    const voice = read('hooks/use_dialogue_v2_voice_message.ts');
    expect(voice).toContain('[DIALOGUE-V2] voice:replay → createAudioPlayer failed');
    expect(voice).toContain('[DIALOGUE-V2] voice:replay → play failed');
    expect(voice).not.toMatch(/catch \{/);
  });
});
