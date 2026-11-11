import { redirectSystemPath } from '../app/+native-intent';

const redirect = (path: string) => redirectSystemPath({ path, initial: true });

test('redirectSystemPath routes custom-scheme invite links to home', () => {
  expect(redirect('phraseman://invite?ref=ABC123')).toBe('/home?ref=ABC123');
});

test('redirectSystemPath routes https invite links to home', () => {
  expect(redirect('https://badloar-star.github.io/phraseman/invite?ref=ABCL23')).toBe('/home?ref=ABCL23');
});

test('redirectSystemPath routes knowlyapps invite links to home', () => {
  expect(redirect('https://knowlyapps.com/phraseman/invite?ref=ABCL23')).toBe('/home?ref=ABCL23');
});

// зачем: Арена/квизы сняты, роут /arena_join удалён. Старые ссылки-дуэли из уже
// установленных приложений и мессенджеров продолжают приходить — они ОБЯЗАНЫ вести
// на безопасный существующий экран, а не в несуществующий роут (иначе белый экран).
// Проверяем все три формы URL, как их отдают разные клиенты.
test('redirectSystemPath lands retired duel links on a safe screen', () => {
  expect(redirect('https://badloar-star.github.io/phraseman/duel/ROOM42')).toBe('/home');
});

// зачем: D83 — клиентская Арена удалена целиком. Любая старая ссылка Арены
// (корень, приглашение в дуэль, призрачная дуэль, прямые /arena_* экраны)
// обязана открыть Главную, а не мёртвый маршрут.
test('redirectSystemPath sends every retired Arena link to home (D83)', () => {
  const inviteId = 'Pz3FMGqvfVjwMSax_0L9Xg';
  const ghostToken = `${'a'.repeat(64)}.5Jp7tYQ8zW2nL4aK9mVx`;
  for (const url of [
    'phraseman://arena',
    'https://knowlyapps.com/arena',
    'phraseman://arena_join/ROOM42',
    `phraseman://arena/invite/${inviteId}?studyTarget=fr`,
    `https://knowlyapps.com/arena/invite/${inviteId}?studyTarget=de`,
    `phraseman://arena/invite/${inviteId}`,
    `phraseman://arena/ghost/${ghostToken}`,
    'phraseman://arena/ghost/short',
    `phraseman://arena_invite?inviteId=${inviteId}`,
    'phraseman://arena_match',
  ]) {
    expect(redirect(url)).toBe('/home');
  }
});

test('redirectSystemPath normalizes custom-scheme phrase links', () => {
  expect(redirect('phraseman://phrase/hello-world?play=1')).toBe('/home?openPhrase=hello-world&play=1');
});

test('redirectSystemPath handles triple-slash custom-scheme duel links', () => {
  expect(redirect('phraseman:///duel/ROOM42')).toBe('/home');
});

test('redirectSystemPath handles authority-form custom-scheme duel links', () => {
  expect(redirect('phraseman://duel/ROOM42')).toBe('/home');
});

test('redirectSystemPath приводит ссылки на вкладки к виду группы (tabs)', () => {
  expect(redirect('phraseman://video')).toBe('/(tabs)/video');
  expect(redirect('phraseman://community?section=spire')).toBe('/(tabs)/community?section=spire');
  expect(redirect('/settings')).toBe('/(tabs)/settings');
  expect(redirect('phraseman://friends')).toBe('/(tabs)/friends');
});
