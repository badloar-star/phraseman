// Руны за просмотр видео обязаны капать В ПРОЦЕССЕ просмотра и двигать
// ГЛОБАЛЬНЫЙ счётчик, а не только бейдж поверх плеера.
//
// зачем этот сторож (владелец 2026-09-21, дословно: «во время просмотра видео
// нету начисления рун, начисление должно происходить сразу во время просмотра
// и оно должно прям сразу изменять счетчик везде во всех местах»): до починки
// руны падали на счёт ТОЛЬКО при паузе/закрытии — сервер начислял их в ветке
// `claim`, а `progress` лишь копил время. Локальный бейдж двигался, но
// глобального баланса не касался вообще, поэтому на Главной цифра стояла весь
// просмотр.
//
// Обычные тесты рун этот класс бага НЕ ловят: они проверяют арифметику выдачи
// (`grantableVideoWatchRunes`) и серверный контракт сессии, а «показали ли
// человеку прирост» не проверяет никто.

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('руны за видео: глобальный счётчик живой во время просмотра', () => {
  it('хук плеера двигает глобальный баланс, а не только свой бейдж', () => {
    const hook = read('hooks/use_video_watch_energy_boost.ts');

    // Прирост обязан уходить в общий счётчик рун, иначе «везде» снова
    // превратится в «только в плеере».
    expect(hook).toContain('showVideoWatchRunesInGlobalBalance');

    // Сколько уже показано — в ref: через state колбэк замкнул бы устаревшее
    // значение и прирост считался бы от числа на момент открытия плеера.
    expect(hook).toContain('runesShownInGlobalRef');

    // Дневной расход — тоже через ref, по той же причине.
    expect(hook).toContain('grantedTodayRef');

    // Счёт показанного обнуляется на выходе: дальше авторитетен ответ сервера.
    expect(hook).toContain('runesShownInGlobalRef.current = 0');
  });

  it('в снапшот уходит ПРИРОСТ, а не абсолютная цель', () => {
    const grants = read('app/level_spin_star_grants.ts');
    const body = grants.slice(
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance'),
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance') + 2_200,
    );

    // зачем инкремент (замерено симуляцией 2026-09-21): при абсолютной цели
    // `baseline + earned` ОДНОЙ чужой награды во время просмотра (руны за
    // урок, покупка) хватало, чтобы счётчик замер до конца ролика — цель
    // оказывалась ниже уже видимого числа, и защита от понижения честно
    // отбрасывала патч. Человек досматривал минуты и не видел прироста.
    expect(body).toContain('alreadyShownRunes');
    expect(body).toContain('earnedRunes');
    expect(body).toContain('const delta = earned - alreadyShown;');
    expect(body).toContain('stars: currentStars + delta');

    // Абсолютной записи быть не должно: именно она стирала чужие руны.
    // Ищем именно КОД (строка без ведущего `//`), а не упоминание в
    // комментарии — там она названа как раз в объяснении, почему так нельзя.
    const codeLines = body
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'));
    expect(codeLines.join('\n')).not.toContain('stars: target');
  });

  it('повторный кадр с тем же числом не наращивает счётчик', () => {
    const grants = read('app/level_spin_star_grants.ts');
    const body = grants.slice(
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance'),
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance') + 2_200,
    );
    // delta <= 0 -> выходим, ничего не трогая. Идемпотентность.
    expect(body).toContain('if (delta <= 0) return alreadyShown;');

    // Вызывающий ОБЯЗАН сохранять возвращённое значение, иначе следующий кадр
    // посчитает тот же прирост заново и цифра поедет вверх.
    const hook = read('hooks/use_video_watch_energy_boost.ts');
    expect(hook).toContain('runesShownInGlobalRef.current = showVideoWatchRunesInGlobalBalance');
  });

  it('смена аккаунта в процессе просмотра не переносит руны на чужой счёт', () => {
    const grants = read('app/level_spin_star_grants.ts');
    const body = grants.slice(
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance'),
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance') + 1_400,
    );
    // Показ рун чужому аккаунту — прямая порча чужого баланса, поэтому
    // проверка поколения стоит ДО патча снапшота.
    expect(body).toContain('isCurrentAccountGeneration');
  });

  it('множитель Супервоскресенья применяется РОВНО один раз', () => {
    const hook = read('hooks/use_video_watch_energy_boost.ts');
    const grants = read('app/level_spin_star_grants.ts');
    const overlayBody = grants.slice(
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance'),
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance') + 1_400,
    );

    // Хук умножает перед показом; сама запись в снапшот умножать НЕ должна,
    // иначе в Супервоскресенье человек увидел бы вчетверо больше, чем начислит
    // сервер, и цифра прыгнула бы вниз после claim.
    expect(hook).toContain('applySuperSundayRuneMultiplier');
    expect(overlayBody).not.toContain('applySuperSundayRuneMultiplier');
  });

  it('дневной потолок соблюдается и в показе, а не только на сервере', () => {
    const hook = read('hooks/use_video_watch_energy_boost.ts');
    // Показать больше, чем сервер способен начислить, — значит соврать:
    // после claim цифра поехала бы вниз.
    expect(hook).toContain('VIDEO_WATCH_RUNES_DAILY_CAP - grantedTodayRef.current');
  });
});

describe('трассировка рун за видео остаётся навсегда', () => {
  it('логи ранних выходов и catch не спрятаны под __DEV__', () => {
    const hook = read('hooks/use_video_watch_energy_boost.ts');
    const client = read('app/video_watch_runes_client.ts');

    // зачем (владелец 2026-08-29, «сперва логи, потом починка»): три прежних
    // лога этой ветки стояли под __DEV__ и в прод-сборку не попадали —
    // «руны не капают» не оставляло ни строчки, и диагноз пришлось бы гадать.
    expect(hook).toContain('function runeTrace');
    expect(client).toContain('[VIDEO-RUNES] client:');

    // Причина отказа старта обязана попадать в журнал: это первое звено
    // цепочки (класс бага stable_identity_unavailable).
    expect(hook).toContain('session_start_skipped');
    expect(hook).toContain('session_start_failed');

    // Потеря всего сеанса и выброшенный отрезок просмотра — самые дорогие
    // молчаливые отказы, они обязаны быть видны.
    expect(hook).toContain('cleanup_without_session');
    expect(client).toContain('droppedPendingProgress');
  });
});
