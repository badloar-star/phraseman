// зачем (координатор 14.10, подключение звуков V2): флаг выключен — старый путь без изменений; включён — события SoundDirector, звуки карточек и моменты идут в V2;
// запуск после первого кадра Главной ничего не грузит при выключенном флаге; микро-вариация скорости безопасно отключается там, где платформа её не применяет; dev-ссылка включает звуки на эмуляторе.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../modules/sound_v2/sound_bank', () => ({
  ...jest.requireActual('../modules/sound_v2/sound_bank'),
  playEvent: jest.fn(),
  prewarmSoundV2: jest.fn(),
}));

import { SOUND_V2_CATALOG } from '../modules/sound_v2/catalog';
import { SoundBank, playEvent, prewarmSoundV2, type SoundBankDeps, type SoundV2Player } from '../modules/sound_v2/sound_bank';
import { setSoundV2FlagForTests } from '../modules/sound_v2/sound_v2_flag';
import { DIRECTOR_TO_V2, FC_TO_V2, tryPlayV2Event, tryPlayV2ForDirector, tryPlayV2ForFc } from '../modules/sound_v2/legacy_bridge';
import { SOUND_V2_BOOT_EVENTS, bootSoundV2 } from '../modules/sound_v2/sound_v2_boot';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const playMock = playEvent as jest.Mock;
const prewarmMock = prewarmSoundV2 as jest.Mock;

beforeEach(() => {
  playMock.mockReset();
  prewarmMock.mockReset();
  setSoundV2FlagForTests(null);
});
afterAll(() => setSoundV2FlagForTests(null));

describe('мост старых звуков к V2', () => {
  it('карты ссылаются только на события каталога V2', () => {
    for (const plan of [...Object.values(DIRECTOR_TO_V2), ...Object.values(FC_TO_V2)]) expect(SOUND_V2_CATALOG[plan.event]).toBeDefined();
  });

  it('флаг выключен: мост возвращает false и V2 не вызывается ни для одного входа', () => {
    setSoundV2FlagForTests(false);
    expect(tryPlayV2ForDirector('pm.ui.tap_primary')).toBe(false);
    expect(tryPlayV2ForFc('correct')).toBe(false);
    expect(tryPlayV2Event('league_up', 'x')).toBe(false);
    expect(playMock).not.toHaveBeenCalled();
  });

  it('флаг включён: события SoundDirector и звуки карточек играют V2; верный ответ двигает серию, неверный — нет', () => {
    setSoundV2FlagForTests(true);
    playMock.mockReturnValue({ event: 'x', played: true });
    expect(tryPlayV2ForDirector('pm.complete.session')).toBe(true);
    expect(playMock).toHaveBeenLastCalledWith('lesson_done', undefined);
    expect(tryPlayV2ForDirector('pm.reward.small')).toBe(true);
    expect(playMock).toHaveBeenLastCalledWith('coin', { advance: true });
    expect(tryPlayV2ForFc('correct')).toBe(true);
    expect(playMock).toHaveBeenLastCalledWith('correct', { advance: true });
    expect(tryPlayV2ForFc('incorrect')).toBe(true);
    expect(playMock).toHaveBeenLastCalledWith('wrong', undefined);
  });

  it('события без пары в V2 остаются старыми (флип, тики, сундук, арена)', () => {
    setSoundV2FlagForTests(true);
    for (const id of ['pm.cards.flip', 'pm.arena.result_win', 'pm.reward.chest_open', 'pm.exam.begin']) expect(tryPlayV2ForDirector(id)).toBe(false);
    for (const name of ['flip', 'tick', 'star', 'chest_open', 'riser']) expect(tryPlayV2ForFc(name)).toBe(false);
    expect(playMock).not.toHaveBeenCalled();
  });

  it('V2 не сыграл по причине платформы — подхватывает старый звук (false); звуки выключены / запись — тишина (true)', () => {
    setSoundV2FlagForTests(true);
    playMock.mockReturnValueOnce({ event: 'tap', played: false, reason: 'player_unavailable' });
    expect(tryPlayV2ForDirector('pm.ui.tap_primary')).toBe(false);
    playMock.mockReturnValueOnce({ event: 'tap', played: false, reason: 'effects_disabled' });
    expect(tryPlayV2ForDirector('pm.ui.tap_primary')).toBe(true);
    playMock.mockReturnValueOnce({ event: 'tap', played: false, reason: 'quiet_recording' });
    expect(tryPlayV2ForDirector('pm.ui.tap_primary')).toBe(true);
    playMock.mockImplementationOnce(() => { throw new Error('boom'); });
    expect(tryPlayV2ForFc('correct')).toBe(false); // исключение не вылетает наружу
  });

  it('точки подключения: SoundDirector.execute и playSfx зовут мост до старого плеера; моменты Пика и «С возвращением» — через tryPlayV2Event', () => {
    const director = read('modules/audio/sound_director.ts');
    expect(director.indexOf('tryPlayV2ForDirector(decision.eventId)')).toBeGreaterThan(-1);
    expect(director.indexOf('tryPlayV2ForDirector(decision.eventId)')).toBeLessThan(director.indexOf('const started = this.backend.play('));
    const sfx = read('app/flashcards/SoundService.ts');
    expect(sfx.indexOf('tryPlayV2ForFc(name)')).toBeGreaterThan(sfx.indexOf('if (!isFcSfxEnabled()) return;'));
    expect(sfx.indexOf('tryPlayV2ForFc(name)')).toBeLessThan(sfx.indexOf('const p = getPlayer(name);'));
    expect(read('components/spire/moments/moments_sound.ts')).toContain('tryPlayV2Event(v2, event)');
    expect(read('components/moments/WelcomeBackMoment.tsx')).toContain('tryPlayV2Event(v2, event)');
  });
});

describe('запуск после первого кадра Главной', () => {
  it('флаг выключен: ни одного прогрева плееров, строка в журнале с замером', async () => {
    setSoundV2FlagForTests(false);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await bootSoundV2();
    expect(result.enabled).toBe(false);
    expect(prewarmMock).not.toHaveBeenCalled();
    expect(log.mock.calls.some((c) => String(c[0]).includes('[SOUND-V2] prime ms=') && String(c[0]).includes('flag=off'))).toBe(true);
    log.mockRestore();
  });

  it('флаг включён: прогрев частых событий поставлен в очередь, файлов ≈ сумма вариантов', async () => {
    setSoundV2FlagForTests(true);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await bootSoundV2();
    expect(result.enabled).toBe(true);
    expect(prewarmMock).toHaveBeenCalledWith(SOUND_V2_BOOT_EVENTS);
    expect(result.files).toBe(SOUND_V2_BOOT_EVENTS.reduce((n, e) => n + SOUND_V2_CATALOG[e].variants.length, 0));
    expect(log.mock.calls.some((c) => String(c[0]).includes('flag=on'))).toBe(true);
    log.mockRestore();
  });

  it('корень зовёт запуск только после первого кадра Главной (runAfterHomeFirstFrame) и лениво', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain("runAfterHomeFirstFrame('sound_v2_boot', () => import('../modules/sound_v2/sound_v2_boot')");
    expect(layout).not.toMatch(/^import .*sound_v2_boot/m);
  });

  it('dev-ссылка dev_state включает и выключает звуки V2 (soundv2=on|off)', () => {
    const fixtures = read('app/dev_state_fixtures.ts');
    expect(fixtures).toContain("request.soundv2 = pick('soundv2', ['on', 'off'] as const);");
    expect(fixtures).toContain("setSoundV2DevOverride(request.soundv2 === 'on')");
  });
});

describe('микро-вариация скорости на платформах без поддержки', () => {
  function makeBank(opts: { stuck?: boolean; throws?: boolean; supported?: boolean }) {
    const rateCalls: number[] = [];
    const warns: string[] = [];
    const deps: SoundBankDeps = {
      createPlayer: () => {
        const player = {
          volume: 1,
          shouldCorrectPitch: true,
          playbackRate: 1,
          play() {},
          pause() {},
          seekTo() {},
          setPlaybackRate(rate: number) {
            rateCalls.push(rate);
            if (opts.throws) throw new Error('not supported on this device');
            if (!opts.stuck) player.playbackRate = rate;
          },
          release() {},
          addListener() { return { remove() {} }; },
        };
        return player as unknown as SoundV2Player;
      },
      isFlagEnabled: () => true,
      isEffectsEnabled: () => true,
      isQuiet: () => false,
      rng: () => 0.9,
      now: () => 1_000,
      setTimer: () => 0,
      clearTimer: () => undefined,
      log: () => undefined,
      warn: (m) => warns.push(m),
      isRateSupported: opts.supported === false ? () => false : undefined,
    };
    return { bank: new SoundBank(deps), rateCalls, warns };
  }

  it('плеер остаётся на скорости 1,0 трижды подряд — микро-вариация отключается ОДИН раз с причиной, дальше скорость не трогаем', () => {
    const h = makeBank({ stuck: true });
    for (let i = 0; i < 6; i += 1) h.bank.playEvent('tap');
    expect(h.warns.filter((w) => w.includes('микро-вариация скорости отключена'))).toHaveLength(1);
    expect(h.rateCalls.length).toBe(3);
  });

  it('платформа не поддерживает смену скорости — ни одного вызова, одно предупреждение', () => {
    const h = makeBank({ supported: false });
    for (let i = 0; i < 4; i += 1) h.bank.playEvent('tap');
    expect(h.rateCalls).toHaveLength(0);
    expect(h.warns.filter((w) => w.includes('Android < 6'))).toHaveLength(1);
  });

  it('setPlaybackRate бросает исключение — звук всё равно играет, предупреждение одно, исключение не вылетает', () => {
    const h = makeBank({ throws: true });
    const results = Array.from({ length: 4 }, () => h.bank.playEvent('tap'));
    expect(results.every((r) => r.played)).toBe(true);
    expect(h.rateCalls).toHaveLength(1);
    expect(h.warns.filter((w) => w.includes('микро-вариация скорости отключена'))).toHaveLength(1);
  });

  it('скорость применяется нормально — микро-вариация работает, предупреждений нет', () => {
    const h = makeBank({});
    for (let i = 0; i < 5; i += 1) h.bank.playEvent('tap');
    expect(h.rateCalls).toHaveLength(5);
    expect(h.warns).toHaveLength(0);
    expect(h.rateCalls.every((r) => Math.abs(r - 1) <= 0.0015 + 1e-9)).toBe(true);
  });
});
