// Сторож экрана «Уроки с МАКСом».
//
// зачем (владелец 2026-08-31): раздел проверен на Android-эмуляторе, и живая
// проверка нашла дефекты, которых не видел ни один тест. Каждый из них молчит:
// экран открывается, ошибок нет, а человек читает технические id вместо
// названий. Этот сторож фиксирует найденное, чтобы оно не вернулось.

import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('экран раздела «Уроки с МАКСом»', () => {
  const screen = read(path.join('app', 'max_lessons.tsx'));
  const registry = read(path.join('components', 'appArtBackdropRegistry.ts'));

  it('названия уроков не заперты за согласием на обработку голоса', () => {
    // Найдено на эмуляторе: витрина показывала a1_daily_routine вместо «Мой
    // день», потому что заголовки ждали согласия на ГОЛОС. Список уроков
    // голоса не содержит — гейт здесь не нужен и ломает первое впечатление.
    const titlesBlock = screen.slice(
      screen.indexOf('bootMaxCatalogTitles(lang)'),
      screen.indexOf('Догрузка звёзд'),
    );
    expect(titlesBlock).toContain('fetchMaxCatalogTitles');
    expect(titlesBlock).not.toContain('isAiVoiceConsentGranted');
  });

  it('звёзды прогресса, наоборот, согласия требуют — это личные данные ученика', () => {
    const starsBlock = screen.slice(screen.indexOf('Догрузка звёзд'));
    expect(starsBlock).toContain('isAiVoiceConsentGranted');
  });

  it('подпись под счётчиком не дублирует сам счётчик', () => {
    // Было «0 из 78 уроков пройдено» прямо под «0 / 78» — пустой шум.
    expect(screen).toContain('lessonsDone');
    expect(screen).not.toMatch(/из \$\{b\} уроков пройдено/u);
  });

  it('последний чип фильтра не липнет к краю экрана', () => {
    const chipsRow = screen.slice(screen.indexOf('Фильтр по темам'), screen.indexOf('renderItem'));
    expect(chipsRow).toContain('paddingRight');
  });

  it('маршрут раздела зарегистрирован в реестре фонов', () => {
    // Без записи каждый заход писал предупреждение, а сторож
    // assertAppArtBackdropRoute на таком маршруте бросает ошибку.
    expect(registry).toContain('max_lessons:');
  });

  it('список виртуализирован: 78 строк не рендерятся разом', () => {
    expect(screen).toContain('FlatList');
    expect(screen).toContain('initialNumToRender');
  });

  it('первый кадр не ждёт сеть и не показывает спиннер', () => {
    expect(screen).toContain('peekMaxTutorPreview');
    expect(screen).toContain('peekMaxCatalogTitles');
    expect(screen).not.toContain('ActivityIndicator');
  });

  it('соблюдены запреты владельца по дизайну', () => {
    expect(screen).not.toContain('borderWidth');
    expect(screen).not.toContain('borderColor');
    expect(screen).not.toContain('adjustsFontSizeToFit');
  });

  it('каждый ранний выход и каждый catch объясняют причину', () => {
    // Правило проекта «сперва логи»: немой catch запрещён.
    expect(screen).not.toMatch(/catch\s*\{\s*\}/u);
    expect(screen).toContain('[MAX-LESSONS]');
  });
});
