import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Сторож решения владельца 2026-09-17: озвучка ПОСЛЕДНЕЙ фразы урока обязана
 * дозвучать целиком поверх экрана завершения (церемонии).
 *
 * Дефект, который он охраняет: `next()`/`skip()` глушили озвучку БЕЗУСЛОВНО, до
 * проверки «а есть ли следующая карточка». На последнем задании следующей нет —
 * управление уходит в `finish()` → церемония, и стоп срабатывал впустую, режа
 * фразу на середине.
 *
 * Почему проверка на ПОРЯДОК, а не на наличие строк: урок коммита 21d3d2501 —
 * сторож `audio_runtime_ownership_contract` проверял наличие строк и пропустил
 * все пять утечек аренды. Здесь важен именно порядок: стоп обязан стоять ПОСЛЕ
 * раннего выхода в finish(), иначе он выполняется на пути завершения.
 *
 * Сторож НЕ требует убрать стоп совсем: при переходе к следующей карточке стоп
 * обязателен (иначе эталон попадёт в микрофон следующего задания, а SFX
 * останутся заглушены). Владелец 2026-09-17 сознательно отклонил доигрывание
 * между фразами — см. docs/work/tasks/2026-09-17_audio_completion_not_cut.md.
 */

const SESSION_SCREEN = join(
  process.cwd(),
  'app',
  'learning-v2',
  'session',
  '[id].tsx',
);

/** Тело функции от её объявления до закрывающей строки `};` на том же уровне. */
function extractArrowFunctionBody(source: string, declaration: string): string {
  const start = source.indexOf(declaration);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = source.slice(start);
  // Функции next/skip объявлены на верхнем уровне компонента, поэтому их
  // закрывает строка ровно из двух пробелов отступа + `};`.
  const end = rest.indexOf('\n  };');
  expect(end).toBeGreaterThan(0);
  return rest.slice(0, end);
}

describe('озвучка последней фразы не обрывается экраном завершения', () => {
  const source = readFileSync(SESSION_SCREEN, 'utf8');

  for (const declaration of ['const next = () => {', 'const skip = () => {']) {
    const label = declaration.includes('next') ? 'next()' : 'skip()';

    describe(label, () => {
      const body = extractArrowFunctionBody(source, declaration);

      it('уходит в finish() РАНЬШЕ, чем глушит озвучку', () => {
        const finishIndex = body.indexOf('void finish()');
        const stopIndex = body.indexOf('stopAudioAttempt()');

        expect(finishIndex).toBeGreaterThanOrEqual(0);
        expect(stopIndex).toBeGreaterThanOrEqual(0);

        // Ядро инварианта: на пути завершения стоп недостижим.
        expect(finishIndex).toBeLessThan(stopIndex);
      });

      it('ранний выход в finish() возвращает управление, не проваливаясь в стоп', () => {
        const finishIndex = body.indexOf('void finish()');
        const afterFinish = body.slice(finishIndex);
        const returnIndex = afterFinish.indexOf('return;');
        const nextStopIndex = afterFinish.indexOf('stopAudioAttempt()');

        expect(returnIndex).toBeGreaterThanOrEqual(0);
        // Между finish() и следующим стопом обязан стоять return, иначе стоп
        // всё равно выполнится на пути завершения.
        expect(returnIndex).toBeLessThan(nextStopIndex);
      });

      it('сохраняет стоп для перехода к СЛЕДУЮЩЕЙ карточке', () => {
        // Доигрывание между фразами отклонено владельцем: микрофон следующего
        // задания, глушение SFX, предохранитель аренды 90с.
        const stopIndex = body.indexOf('stopAudioAttempt()');
        const advanceIndex = body.indexOf('setCardIndex(');

        expect(advanceIndex).toBeGreaterThanOrEqual(0);
        expect(stopIndex).toBeLessThan(advanceIndex);
      });
    });
  }

  it('церемония завершения не глушит озвучку своими средствами', () => {
    const ceremonyStart = source.indexOf('{showCompletionCeremony && (');
    expect(ceremonyStart).toBeGreaterThanOrEqual(0);

    const ceremonyBlock = source.slice(ceremonyStart);
    // Внутри разметки церемонии не должно появиться новых стопов озвучки:
    // обрыв разрешён только по нажатию кнопки (router.replace → unmount).
    expect(ceremonyBlock).not.toContain('stopAudioAttempt()');
    expect(ceremonyBlock).not.toContain('stopLocalAudioPlayback()');
  });

  it('аренда голоса по-прежнему освобождается по окончании клипа', () => {
    // Без этого пути отложенный стоп означал бы осиротевшую аренду — ровно тот
    // баг «озвучка пропала, лечит только перезапуск», что чинили 2026-09-15.
    expect(source).toContain('localAudioStatus.didJustFinish');
    expect(source).toMatch(/didJustFinish[\s\S]{0,200}spokenAudioClaimRef\.current\?\.release\(\)/);
  });

  it('уход с экрана по-прежнему снимает аренду (cleanup не потерян)', () => {
    expect(source).toMatch(/useEffect\(\(\) => \{\s*stopAudioAttempt\(\);\s*return stopAudioAttempt;/);
  });
});
