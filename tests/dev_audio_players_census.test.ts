// зачем (координатор 18.10): [AUDIO-PLAYERS] — dev-перепись нативных плееров для диагноза роста Native Heap.
// Сторож держит: счётчик живых верен, повторный release не считается дважды, исходный release вызывается,
// перепись не бросает и в релизе не подключается (require только под __DEV__).
import fs from "node:fs";
import path from "node:path";

import {
  audioPlayerOwnerFromStack,
  installAudioPlayersCensus,
} from "../app/dev_audio_players_census";

describe("[AUDIO-PLAYERS] перепись плееров", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("create/release со счётчиком живых, повторный release не считается", () => {
    const released: object[] = [];
    class FakePlayer { release(): void { released.push(this); } }
    const audioModule = { AudioPlayer: FakePlayer as unknown as { new (...a: unknown[]): object; prototype: { release?: () => void } } };
    const lines: string[] = [];
    expect(installAudioPlayersCensus(audioModule, (line) => lines.push(line))).toBeNull();
    // пробный плеер самопроверки создаётся и освобождается без записи в счётчик
    expect(released).toHaveLength(1);
    expect(lines).toEqual([]);
    released.length = 0;

    const a = new audioModule.AudioPlayer() as FakePlayer;
    const b = new audioModule.AudioPlayer() as FakePlayer;
    expect(a).toBeInstanceOf(FakePlayer);
    expect(lines.filter((l) => l.includes(" create "))).toHaveLength(2);
    expect(lines.at(-1)).toMatch(/live=2$/u);

    a.release();
    a.release();
    expect(released).toEqual([a, a]);
    expect(lines.some((l) => /release owner=.* live=1$/u.test(l))).toBe(true);
    expect(lines.some((l) => l.includes("release_again"))).toBe(true);

    b.release();
    jest.advanceTimersByTime(60_000);
    const summary = lines.find((l) => l.includes(" summary "));
    expect(summary).toBeDefined();
    expect(JSON.parse(summary!.split(" summary ")[1]!)).toMatchObject({ live: 0, created: 2, released: 2, peakLive: 2 });
  });

  test("плеер, созданный до переписи, не уводит счётчик в минус", () => {
    class FakePlayer { release(): void {} }
    const early = new FakePlayer();
    const audioModule = { AudioPlayer: FakePlayer as unknown as { new (...a: unknown[]): object; prototype: { release?: () => void } } };
    const lines: string[] = [];
    installAudioPlayersCensus(audioModule, (line) => lines.push(line));
    early.release();
    expect(lines).toEqual(["[AUDIO-PLAYERS] release_untracked live=0"]);
  });

  test("без класса плеера — отказ с причиной, без исключения", () => {
    expect(installAudioPlayersCensus({} as never, () => undefined)).toBe("audio_player_class_missing");
  });

  test("владелец — имена функций стека вне expo-audio", () => {
    const stack = ["Error: census", "    at construct (x)", "    at createAudioPlayer (x)", "    at playClip (x)", "    at onPress (x)", "    at other (x)"].join("\n");
    expect(audioPlayerOwnerFromStack(stack)).toBe("playClip<onPress");
    expect(audioPlayerOwnerFromStack(undefined)).toBe("unknown");
  });

  test("в релизе не подключается: require только под __DEV__, импорт в index.js до expo-router/entry", () => {
    const root = path.join(__dirname, "..");
    const boot = fs.readFileSync(path.join(root, "app/dev_audio_players_census_boot.ts"), "utf8");
    const gate = "if (__DEV__ && process.env.EXPO_PUBLIC_STORE_RELEASE !== '1') {";
    expect(boot.indexOf(gate)).toBeGreaterThanOrEqual(0);
    expect(boot.indexOf(gate)).toBeLessThan(boot.indexOf("require('./dev_audio_players_census')"));
    // модуль переписи и expo-audio тянутся только require внутри ворот, без верхнеуровневого import
    expect(boot).not.toMatch(/^import /mu);
    const index = fs.readFileSync(path.join(root, "index.js"), "utf8");
    const at = index.indexOf("import './app/dev_audio_players_census_boot';");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(index.indexOf("import 'expo-router/entry';"));
  });
});
