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

test('redirectSystemPath normalizes custom-scheme phrase links', () => {
  expect(redirect('phraseman://phrase/hello-world?play=1')).toBe('/home?openPhrase=hello-world&play=1');
});

test('redirectSystemPath sends personal-deck widget cards to their exact collection', () => {
  expect(redirect('phraseman://deck/saved/saved-42')).toBe('/flashcards_collection?cat=saved&widgetCard=saved-42');
  expect(redirect('phraseman://deck/created/custom_42')).toBe('/flashcards_collection?cat=custom&widgetCard=custom_42');
});

test('redirectSystemPath handles triple-slash custom-scheme duel links', () => {
  expect(redirect('phraseman:///duel/ROOM42')).toBe('/home');
});

test('redirectSystemPath handles authority-form custom-scheme duel links', () => {
  expect(redirect('phraseman://duel/ROOM42')).toBe('/home');
});
