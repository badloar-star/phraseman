import { redirectSystemPath } from '../app/+native-intent';

const redirect = (path: string) => redirectSystemPath({ path, initial: false });

// зачем (владелец 21.10, подарок Plus «Ссылкой»): knowlyapps.com/g/<КОД> обязана открыть экран
// промокода с подставленным кодом — подарок включается одной кнопкой, а не «маршрут не найден».
test('gift link opens promo code entry with the code', () => {
  expect(redirect('https://knowlyapps.com/g/WEB-ABCDEFGH23')).toBe('/promo_code_entry?code=WEB-ABCDEFGH23&source=gift_link');
});

test('gift link code is upper-cased and the query is dropped', () => {
  expect(redirect('/g/web-abcdefgh23?utm=tg')).toBe('/promo_code_entry?code=WEB-ABCDEFGH23&source=gift_link');
});

test('broken gift link falls back to the empty promo screen', () => {
  expect(redirect('https://knowlyapps.com/g/%%%')).toBe('/promo_code_entry');
  expect(redirect('https://knowlyapps.com/g/')).toBe('/promo_code_entry');
});

test('site paths that only start with g are not gift links', () => {
  expect(redirect('https://knowlyapps.com/guides/')).not.toContain('promo_code_entry');
});
