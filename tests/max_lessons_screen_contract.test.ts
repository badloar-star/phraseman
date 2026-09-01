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

  it('в шапке нет заголовка, зато есть минуты, покупка и статистика', () => {
    // Владелец 2026-09-01: «убери текст Уроки с МАКСом». Заголовок занимал
    // лучшее место и не нёс информации — человек знает, куда вошёл. Вместо
    // него главное число экрана (остаток минут) и два действия.
    expect(screen).not.toMatch(/title: triLang/u);
    expect(screen).toContain('minutesLeft');
    expect(screen).toContain('max-lessons-buy-minutes');
    expect(screen).toContain('max-lessons-stats');
  });

  it('урок открывает ЗВОНОК, а не экран подготовки', () => {
    // Владелец: «при открытии любого урока должен начинаться звонок сразу».
    // Деньги в безопасности: сервер считает секунды от активации
    // (voiceSessionClockStartMs), а не от соединения.
    const open = screen.slice(screen.indexOf('const openLesson'), screen.indexOf('const c = useMemo'));
    expect(open).toContain("pathname: '/max_call_session'");
    expect(open).not.toContain('max_call_prestart');
  });

  it('рекомендованный урок греется заранее, и только он один', () => {
    // Заготовка держит серверный резерв минут: греть весь экран значило бы
    // занимать несколько резервов и упереться в voice_session_active.
    expect(screen).toContain('beginPremint');
    const warm = screen.slice(screen.indexOf('const warmedRef'));
    const warmBlock = warm.slice(0, warm.indexOf('}, [lang, recommendedId, studyTarget]);'));
    expect(warmBlock).toContain('recommendedId');
    expect(warmBlock).toContain('isAiVoiceConsentGranted');
    // Греем ровно один урок: цикла по каталогу здесь быть не должно.
    expect(warmBlock).not.toMatch(/MAX_LESSON_CATALOG\.forEach|for \(const lesson of MAX_LESSON_CATALOG/u);
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

  it('у списка есть высота и нет removeClippedSubviews', () => {
    // Найдено владельцем 2026-09-01: раздел открывался с шапкой и пустотой.
    // Две причины, обе невидимы в тестах и на эмуляторе:
    //   • без flex:1 FlatList внутри SafeAreaView схлопывается в ноль высоты;
    //   • removeClippedSubviews на Android выбрасывает строки из дерева.
    const list = screen.slice(screen.indexOf('<FlatList'), screen.indexOf('renderItem'));
    expect(list).toContain('style={{ flex: 1 }}');
    // Ищем свойство, а не упоминание: объяснение «почему убрали» в комментарии
    // должно остаться, иначе следующий разработчик вернёт ловушку.
    expect(list).not.toMatch(/^\s*removeClippedSubviews\s*$/mu);
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
