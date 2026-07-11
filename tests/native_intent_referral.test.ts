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

test('redirectSystemPath keeps duel links routed to arena join', () => {
  expect(redirect('https://badloar-star.github.io/phraseman/duel/ROOM42')).toBe('/arena_join?roomId=ROOM42');
});

test('redirectSystemPath normalizes custom-scheme phrase links', () => {
  expect(redirect('phraseman://phrase/hello-world?play=1')).toBe('/home?openPhrase=hello-world&play=1');
});

test('redirectSystemPath handles triple-slash custom-scheme duel links', () => {
  expect(redirect('phraseman:///duel/ROOM42')).toBe('/arena_join?roomId=ROOM42');
});

test('redirectSystemPath handles authority-form custom-scheme duel links', () => {
  expect(redirect('phraseman://duel/ROOM42')).toBe('/arena_join?roomId=ROOM42');
});
