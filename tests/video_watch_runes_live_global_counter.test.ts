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

    // Базис читается ОДИН раз на сеанс и хранится в ref: без него прирост
    // некуда прибавлять, а через state колбэк замкнул бы устаревшее значение.
    expect(hook).toContain('runeBaselineBalanceRef');
    expect(hook).toContain('readUnifiedLevelSpinStars');

    // Дневной расход — тоже через ref. Через state потолок считался бы по
    // числу на момент открытия плеера и переставал бы двигаться.
    expect(hook).toContain('grantedTodayRef');

    // Базис обязан сбрасываться на выходе: иначе следующий сеанс положит
    // прирост поверх числа, которое сервер уже учёл в claim.
    expect(hook).toContain('runeBaselineBalanceRef.current = null');
  });

  it('прирост считается от базиса, а не прибавляется вслепую', () => {
    const grants = read('app/level_spin_star_grants.ts');
    const signature = grants.slice(
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance'),
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance') + 1_400,
    );

    // baseline + earned, а не «+= delta»: повторный кадр с тем же числом не
    // должен наращивать цифру. Идемпотентность вместо накопления.
    expect(signature).toContain('baselineBalance');
    expect(signature).toContain('earnedRunes');
    expect(signature).toContain('const target = baseline + earned;');
  });

  it('overlay НИКОГДА не понижает баланс — понижение только за сервером', () => {
    const grants = read('app/level_spin_star_grants.ts');
    const body = grants.slice(
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance'),
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance') + 1_400,
    );

    // зачем (сработал DATA-SAFETY-GUARD при написании починки, и он был прав):
    // безусловная запись `stars: target` стирала бы руны, пришедшие во время
    // просмотра из другого источника — награда за урок, покупка, ответ
    // сервера. Это прямая потеря валюты пользователя; в проекте уже было три
    // инцидента класса «клиент понизил баланс».
    expect(body).toContain('if (target <= currentStars) return {};');
    expect(body).toContain('currentStars');
  });

  it('смена аккаунта в процессе просмотра не переносит руны на чужой счёт', () => {
    const grants = read('app/level_spin_star_grants.ts');
    const body = grants.slice(
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance'),
      grants.indexOf('export function showVideoWatchRunesInGlobalBalance') + 1_400,
    );
    expect(body).toContain('isCurrentAccountGeneration');

    const hook = read('hooks/use_video_watch_energy_boost.ts');
    // Чтение базиса асинхронное: к моменту ответа аккаунт мог смениться.
    expect(hook).toContain('isCurrentAccountGeneration(token, stableId)');
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
