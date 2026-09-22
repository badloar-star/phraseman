/**
 * Сторож последнего кадра стрима диалога.
 *
 * Инцидент 2026-09-22 (владелец: «сначала ответ приходит, а через секунду вот
 * это», «и реплики не считаются»): человек читал ответ собеседника, а через
 * секунду получал «Не удалось отправить сообщение», и счётчик реплик не
 * двигался. В логах Firebase при этом НИ ОДНОГО провала — все вызовы
 * `stream ok`, кадр `done` отправлен, квота списана. Ломалось только на
 * клиенте: кадр `done` — последнее, что пишет сервер, сразу за ним идёт
 * `res.end()`, и если завершающий `\n\n` не доехал отдельным пакетом, разбор
 * молча пропускал ГОТОВЫЙ кадр.
 *
 * Тест закрывает оба звена:
 *  1) поток закрыт → последний кадр читается даже без `\n\n`;
 *  2) кадр `done` потерян совсем → ход НЕ выбрасывается, ответ восстанавливается
 *     из напечатанного, а квота помечается «неизвестно» (-1), чтобы экран не
 *     затёр счётчик выдуманным значением.
 *
 * Сработал — чинить клиент, а не ослаблять проверку.
 */

const SOURCE = require('fs').readFileSync(
  require('path').join(__dirname, '..', 'app', 'ai_dialog_stream_client.ts'),
  'utf8',
) as string;

describe('стрим диалога: последний кадр не теряется', () => {
  it('разбор умеет дочитывать хвост после закрытия потока', () => {
    // drainFrames обязана принимать признак «поток закрыт».
    expect(SOURCE).toMatch(/function drainFrames\([^)]*final/);
    // И onload обязан звать разбор именно в финальном режиме.
    expect(SOURCE).toMatch(/handleChunk\(true\)/);
    // onprogress — наоборот, НЕ финальный: хвост ждёт следующего пакета.
    expect(SOURCE).toMatch(/handleChunk\(false\)/);
  });

  it('потерянный done не выбрасывает уже прочитанный ответ', () => {
    // Накопленный текст дельт обязан сохраняться как запасной ответ.
    expect(SOURCE).toContain('streamedText');
    // И resolve со спасённым текстом должен существовать — не только reject.
    expect(SOURCE).toMatch(/assistantMessage:\s*recovered/);
  });

  it('спасённый ход помечает квоту как неизвестную, а не выдумывает её', () => {
    expect(SOURCE).toMatch(/remainingQuota:\s*-1/);
    // Ключевая защита: парсер квоты обязан ОТВЕРГАТЬ такую метку, иначе экран
    // показал бы -1 как остаток реплик и записал бы его в зеркало пользователя.
    const quota = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'app', 'ai_dialog_daily_quota.ts'),
      'utf8',
    ) as string;
    expect(quota).toMatch(/remainingQuota\s*<\s*0/);
    expect(quota).toMatch(/resetAtMs\s*<=\s*0/);
    expect(quota).toMatch(/quotaVersion\s*<\s*1/);
  });

  it('спасённый ход не сбрасывает игровое состояние', () => {
    const screen = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'app', 'ai_dialog_session.tsx'),
      'utf8',
    ) as string;
    // Без turnState и с меткой -1 применение хода обязано выходить раньше:
    // parseTurnState(null) вернул бы дефолт и сбросил настроение собеседника.
    expect(screen).toMatch(/res\.turnState == null && res\.remainingQuota === -1/);
  });
});
