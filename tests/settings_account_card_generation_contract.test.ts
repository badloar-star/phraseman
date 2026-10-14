// зачем (координатор 14.10, 🔴1, журнал прогона №3): после входа событие auth_provider_linked приходит 2+ раз и поднимает поколение
// запроса карточки аккаунта (2→3→4). Идущий запрос поколения 2 переиспользовался, его ответ «google» отбрасывался как устаревший
// (applied=false gen=2/4), нового запроса не было — карточка Настроек застревала на «Войти / Не привязан». Сторож держит правило:
// запрос прошлого поколения не поглощает свежий.
import fs from 'fs';
import path from 'path';

const settings = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'settings.tsx'), 'utf8');

function refreshBody(): string {
  const start = settings.indexOf('const refreshLinkedAuth = useCallback(');
  expect(start).toBeGreaterThan(-1);
  return settings.slice(start, settings.indexOf('}, [settingsRuntimeActive]);', start));
}

describe('Settings account card: a stale in-flight read never swallows a fresh one', () => {
  it('remembers which generation the in-flight read belongs to', () => {
    expect(settings).toContain('const linkedAuthInFlightGenRef = useRef(-1);');
    expect(refreshBody()).toContain('linkedAuthInFlightGenRef.current = generation;');
  });

  it('reuses the in-flight read only when it belongs to the current generation', () => {
    const body = refreshBody();
    expect(body).toMatch(/if \(linkedAuthInFlightGenRef\.current === linkedAuthGenerationRef\.current\) return linkedAuthInFlightRef\.current;/);
    expect(body).not.toMatch(/if \(linkedAuthInFlightRef\.current\) return linkedAuthInFlightRef\.current;/);
  });

  it('logs when a stale read is superseded', () => {
    expect(refreshBody()).toContain('stale_inflight_superseded');
  });
});
