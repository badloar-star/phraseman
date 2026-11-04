// learning_v2_report_filter.ts — заморозка Learning V2 (владелец 04.11): ошибки и жалобы из V2 не уходят владельцу в Telegram.
//
// зачем: Telegram-алерты строятся из документов app_errors и error_reports (functions/src/admin_alerts.ts). Пока серверный фильтр не выложен,
// источник learning_v2 отсекается на клиенте: logAppError не пишет app_errors (Crashlytics остаётся), submitErrorReport не отправляет жалобу.
// Признаки источника: экран жалобы learning_v2_*, id данных lv2:…, контекст/feature ошибки learning_v2…/lv2….
const V2_SOURCE = /^(learning[_-]v2|lv2)([:._-]|$)/i;

export function isLearningV2ReportSource(parts: Readonly<{ screen?: unknown; dataId?: unknown; context?: unknown; feature?: unknown }>): boolean {
  return [parts.screen, parts.dataId, parts.context, parts.feature].some(
    (value) => typeof value === 'string' && V2_SOURCE.test(value.trim()),
  );
}

export default function __RouteShim() { return null; }
