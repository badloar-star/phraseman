import * as fs from "fs";
import * as path from "path";

/*
 * Пакет 8D — воспроизведение без телефона и без эмулятора: та же обёртка, что ставит
 * Firebase Emulator на модуль firebase-admin (firebase-tools 15.15.0,
 * lib/emulator/functionsEmulatorRuntime.js, class Proxied + initializeFirebaseAdminStubs:
 * `.when("firestore", (target) => Proxied.getOriginal(target, "firestore"))`).
 * Копия логики ниже — дословная по смыслу; если firebase-tools установлен глобально,
 * последний тест сверяет копию с его исходником.
 */

class Proxied<T extends object> {
  static getOriginal(target: Record<string, unknown>, key: string): unknown {
    const value = target[key];
    if (value === undefined) return undefined;
    if (Proxied.isConstructor(value) || typeof value !== "function") return value;
    return (value as (...args: unknown[]) => unknown).bind(target);
  }

  static isConstructor(obj: unknown): boolean {
    const proto = (obj as { prototype?: { constructor?: { name?: string } } }).prototype;
    return !!proto && !!proto.constructor?.name;
  }

  readonly proxy: T;
  private readonly rewrites: Record<string, (target: Record<string, unknown>, key: string) => unknown> = {};

  constructor(original: T) {
    this.proxy = new Proxy(original, {
      get: (target, key) => {
        const name = key.toString();
        if (this.rewrites[name]) return this.rewrites[name](target as Record<string, unknown>, name);
        return Proxied.getOriginal(target as Record<string, unknown>, name);
      },
    });
  }

  when(key: string, value: (target: Record<string, unknown>, key: string) => unknown): this {
    this.rewrites[key] = value;
    return this;
  }
}

function emulatorStub(realAdmin: object): Record<string, unknown> {
  return new Proxied(realAdmin)
    .when("firestore", (target) => Proxied.getOriginal(target, "firestore"))
    .proxy as Record<string, unknown>;
}

function freshAdmin(): Record<string, unknown> {
  let admin: Record<string, unknown> = {};
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    admin = require("firebase-admin");
  });
  return admin;
}

describe("8D — эмулятор: статики admin.firestore", () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, "log").mockImplementation(() => undefined); });
  afterEach(() => log.mockRestore());

  it("воспроизведение: под обёрткой эмулятора FieldValue/Timestamp пропадают (стрелочная функция + bind)", () => {
    const real = freshAdmin();
    expect(typeof (real.firestore as Record<string, unknown>).FieldValue).toBe("function");
    const stubbed = emulatorStub(real);
    expect((stubbed.firestore as Record<string, unknown>).FieldValue).toBeUndefined();
    expect((stubbed.firestore as Record<string, unknown>).Timestamp).toBeUndefined();
  });

  it("починка в эмуляторе: статики снова на месте, вызов делегирует исходной функции", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { repairFirestoreNamespaceStatics } = require("./emulator_admin_namespace_fix");
    const real = freshAdmin();
    const stubbed = emulatorStub(real);
    expect(repairFirestoreNamespaceStatics(stubbed, { FUNCTIONS_EMULATOR: "true" })).toBe(true);
    const firestore = stubbed.firestore as Record<string, unknown> & ((app?: unknown) => unknown);
    expect(typeof firestore.FieldValue).toBe("function");
    expect(typeof (firestore.FieldValue as { serverTimestamp: () => unknown }).serverTimestamp()).toBe("object");
    expect(typeof (firestore.Timestamp as { now: () => unknown }).now()).toBe("object");
    expect(firestore.FieldPath).toBe((real.firestore as Record<string, unknown>).FieldPath);
    // повторно — ничего не делает (статики уже есть)
    expect(repairFirestoreNamespaceStatics(stubbed, { FUNCTIONS_EMULATOR: "true" })).toBe(false);
  });

  it("вне эмулятора и при живых статиках — ничего не меняет", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { repairFirestoreNamespaceStatics } = require("./emulator_admin_namespace_fix");
    const real = freshAdmin();
    const before = Object.getOwnPropertyDescriptor(real, "firestore");
    expect(repairFirestoreNamespaceStatics(emulatorStub(real), {})).toBe(false);
    expect(repairFirestoreNamespaceStatics(real, { FUNCTIONS_EMULATOR: "true" })).toBe(false);
    expect(Object.getOwnPropertyDescriptor(real, "firestore")).toEqual(before);
  });

  it("index.ts импортирует починку первой строкой кода", () => {
    const index = fs.readFileSync(path.join(__dirname, "index.ts"), "utf8");
    const firstImport = index.split(/\r?\n/).find((line) => /^import |^export .* from /.test(line));
    expect(firstImport).toBe('import "./emulator_admin_namespace_fix";');
  });

  it("копия логики Proxied совпадает с установленным firebase-tools (если он есть)", () => {
    const candidates = [
      process.env.APPDATA ? path.join(process.env.APPDATA, "npm", "node_modules", "firebase-tools", "lib", "emulator", "functionsEmulatorRuntime.js") : "",
    ].filter((file) => file !== "" && fs.existsSync(file));
    if (candidates.length === 0) return;
    const source = fs.readFileSync(candidates[0], "utf8");
    expect(source).toContain('else if (Proxied.isConstructor(value) || typeof value !== "function") {');
    expect(source).toContain("return value.bind(target);");
    expect(source).toContain("return !!obj.prototype && !!obj.prototype.constructor.name;");
    expect(source).toContain('return Proxied.getOriginal(target, "firestore");');
  });
});
