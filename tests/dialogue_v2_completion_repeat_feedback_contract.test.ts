import fs from 'node:fs';
import path from 'node:path';

// зачем (Сверка 15.10, координатор; [DIALOG-REPEAT]): «Повторить» итога диалога нажимался без видимой реакции — быстрый отказ снимал
// «занято» за миллисекунды, а после первого отказа текст «Не получилось» уже стоял. «Ещё раз» молча выходил без сцены и не защищался
// от двойного тапа. Сторож держит: минимальная «занятость», хаптик на отказ, журнал каждой ветки, никаких немых выходов.
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('dialogue result: «Повторить» and «Ещё раз» always answer the tap', () => {
  it('retry keeps the busy look for at least RETRY_MIN_BUSY_MS and buzzes on a repeated failure', () => {
    expect(src).toMatch(/const RETRY_MIN_BUSY_MS = \d{3,4};/);
    const effect = src.slice(src.indexOf('const holdMs = Math.max(0, RETRY_MIN_BUSY_MS - elapsedMs);'), src.indexOf('}, [retrying, state.kind]);'));
    expect(effect).toContain('setTimeout(');
    expect(effect).toContain('if (failed) void hapticWarning();');
    expect(effect).toContain('return () => clearTimeout(timer);');
    expect(effect).toContain('[DIALOG-REPEAT] retry result');
  });

  // Ревизор 2.89 (💸): при сбое ИИ-провайдера «Повторить» не шлёт запросы без конца — после 3 отказов подряд минута паузы
  it('three failed retries in a row pause the button for a minute; a success resets the streak', () => {
    expect(src).toContain('const RETRY_FAIL_STREAK_LIMIT = 3;');
    expect(src).toContain('const RETRY_PAUSE_MS = 60_000;');
    expect(src).toContain('retryFailStreakRef.current = failed ? retryFailStreakRef.current + 1 : 0;');
    expect(src).toMatch(/if \(failed && retryFailStreakRef\.current >= RETRY_FAIL_STREAK_LIMIT\) \{[\s\S]{0,300}?setRetryPaused\(true\);/);
    expect(src).toContain('busy={retrying || retryPaused}');
    expect(src).toContain('retryPaused ? labels.retryPaused');
  });

  it('retry tap is logged and the already-retrying exit says why', () => {
    const retry = src.slice(src.indexOf('const retryCompletion = useCallback('), src.indexOf('}, [retryFailed, retrying, runCompletion, sessionId, state.kind]);'));
    expect(retry).toContain('[DIALOG-REPEAT] retry tap');
    expect(retry).toContain('[DIALOG-REPEAT] retry skip reason=already_retrying');
    expect(retry).toContain('void hapticTap();');
  });

  it('no dialogue data in the route: one «To dialogues» button instead of a useless «Retry»', () => {
    expect(src).toMatch(/setInvalidRoute\(true\);\s*setState\(\{ kind: 'unavailable' \}\);/);
    const card = src.slice(src.indexOf('{invalidRoute ? ('), src.indexOf(') : knownZeroTurns ? ('));
    expect(card).toContain('label={labels.toDialogs}');
    expect(card).toContain("[DIALOG-SUMMARY] invalid_route_data → to_list");
    expect(card).toContain('close();');
    expect(card).not.toContain('retryCompletion');
    const line = src.slice(src.indexOf('toDialogs: triLang(lang, {'), src.indexOf('}),', src.indexOf('toDialogs: triLang(lang, {')));
    for (const key of [' ru: ', ' uk: ', ' en: ', ' es: ', " 'pt-BR': ", ' vi: ', ' id: ', ' tr: ', ' pl: ']) {
      expect(line).toContain(key);
    }
  });

  it('«Ещё раз»: no silent return — no scene goes back to the list, double tap is locked, the route is logged', () => {
    const again = src.slice(src.indexOf('const again = () => {'), src.indexOf("router.replace({ pathname: '/dialogue_v2_briefing'"));
    expect(again).toContain('[DIALOG-REPEAT] again tap');
    expect(again).toMatch(/if \(!scenarioId\) \{[\s\S]*?reason=no_scenario_id[\s\S]*?close\(\);\s*return;/);
    expect(again).toMatch(/if \(!navOnce\(`dialogue_v2_completion:again:\$\{scenarioId\}`\)\) \{[\s\S]*?reason=double_tap/);
    expect(again).toContain('[DIALOG-REPEAT] again → /dialogue_v2_briefing (replace)');
    expect(again).toContain('markNextNavigationAsReplace();');
  });
});
