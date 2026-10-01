import * as admin from "firebase-admin";

/*
 * Account V2, Пакет 8D (TG-76E9E526A78B) — эмулятор функций: `admin.firestore.FieldValue`
 * и `admin.firestore.Timestamp` были `undefined` (accountDeleteEnqueue, authEnsureStableLink…).
 *
 * Причина (доказано, не версия node): Firebase Emulator (firebase-tools 15.15,
 * lib/emulator/functionsEmulatorRuntime.js → initializeFirebaseAdminStubs) подменяет модуль
 * `firebase-admin` прокси-объектом. Прокси на чтение `admin.firestore` возвращает
 * `Proxied.getOriginal(target, "firestore")`: функцию, у которой нет `prototype`, он считает
 * «не конструктором» и отдаёт `value.bind(target)`. В firebase-admin 13 `admin.firestore` —
 * стрелочная функция со статиками (FieldValue, Timestamp, FieldPath…), а у привязанной копии
 * (`bind`) статиков нет. В проде прокси нет — всё работает; node 22 vs 24 ни при чём.
 *
 * Починка (только в эмуляторе, только если статики пропали): кладём на сам модуль собственное
 * свойство `firestore` — обычную функцию (есть `prototype` → прокси отдаёт её как есть) с теми
 * же статиками, вызов которой делегирует исходной. Поведение функций не меняется; в проде код
 * не делает ничего (нет FUNCTIONS_EMULATOR, статики на месте). Модуль импортируется ПЕРВЫМ в
 * index.ts — до модулей, которые могут читать статики при загрузке.
 */

type Namespace = Record<string, unknown>;
type FirestoreFn = ((app?: unknown) => unknown) & Record<string, unknown>;

/** Чистая часть (тестируется без эмулятора): вернуть true, если починка применена. */
export function repairFirestoreNamespaceStatics(adminModule: Namespace, env: NodeJS.ProcessEnv): boolean {
  if (env.FUNCTIONS_EMULATOR !== "true") return false;
  const current = adminModule.firestore as FirestoreFn | undefined;
  if (typeof current !== "function" || current.FieldValue !== undefined) return false;
  // Исходная функция со статиками — через геттер прототипа (прокси эмулятора его не трогает).
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(adminModule) ?? {}, "firestore");
  const original = (descriptor?.get?.call(adminModule) ?? null) as FirestoreFn | null;
  if (original === null || original.FieldValue === undefined) {
    console.warn("[EMULATOR-ADMIN] firestore_statics_missing original_unavailable");
    return false;
  }
  // Обычная функция (не стрелочная): у неё есть prototype — прокси эмулятора не делает bind.
  const firestore = function firestore(app?: unknown): unknown {
    return original(app);
  } as unknown as FirestoreFn;
  for (const key of Object.keys(original)) firestore[key] = original[key];
  Object.defineProperty(adminModule, "firestore", { value: firestore, configurable: true, writable: true, enumerable: false });
  console.log("[EMULATOR-ADMIN] firestore_statics_repaired");
  return true;
}

repairFirestoreNamespaceStatics(admin as unknown as Namespace, process.env);
