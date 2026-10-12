// зачем (владелец 11.10 «Шпиль только ru/uk», п.76 английский интерфейс, координатор 15.10): вкладка и ворота сети уже закрыты замком по языку интерфейса,
// а сам экран SpireHomeScreen язык не проверял — прямой маршрут /spire или смена языка на открытом экране показали бы английские подписи с русскими заданиями.
// Здесь одно чистое место решения для экрана: тот же список языков, что у замка вкладки (app/spire/spire_ui_lang_gate.ts), без второй копии.
import { spireUiLangDecision, type SpireUiLangDecision } from '../../app/spire/spire_ui_lang_gate';

export type SpireScreenLangLock = Readonly<{ locked: boolean; decision: SpireUiLangDecision }>;

/** Экран заперт, если язык интерфейса не ru/uk (или ещё неизвестен: лучше замок на кадр, чем чужой язык). */
export function spireScreenLangLock(lang: string | null | undefined): SpireScreenLangLock {
  const decision = spireUiLangDecision(lang);
  return { locked: !decision.allowed, decision };
}
