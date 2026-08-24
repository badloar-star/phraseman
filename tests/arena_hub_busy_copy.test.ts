import { arenaHubSpinBusyHint } from '../modules/arena/hub_accessibility_copy';

describe('Arena hub busy accessibility copy', () => {
  it.each([
    ['ru', 'Крутим спин…'],
    ['uk', 'Крутимо спін…'],
    ['es', 'Girando…'],
    ['pt-BR', 'Girando…'],
    ['vi', 'Đang quay…'],
    ['id', 'Sedang memutar…'],
    ['tr', 'Çevriliyor…'],
    ['pl', 'Losowanie…'],
  ] as const)('uses a truthful non-loading hint for %s', (lang, expected) => {
    const value = arenaHubSpinBusyHint(lang);
    expect(value).toBe(expected);
    expect(value.toLocaleLowerCase()).not.toMatch(/загруз|завантаж|cargando|carregando|tải|memuat|yüklen|ładow/);
  });
});
