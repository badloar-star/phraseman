"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWALLOWED_ERROR_PREFIX = void 0;
exports.reportSwallowedServer = reportSwallowedServer;
exports.swallowed = swallowed;
// PM-229 (A1): серверный аналог клиентского swallowError — обработчик для
// `.catch(swallowed('модуль:операция', null))`, который НЕ глотает молча.
//
// зачем: правило владельца «запрет немого catch {}» — целые механизмы умирали
// месяцами из-за пустого catch. Здесь поведение прежнее (значение-заглушка, путь
// продолжается), но причина остаётся в Cloud Logging по единому префиксу
// [PM-229], и ошибку видно в метрике/поиске логов.
//
// Firebase-экономия: это одна строка в логе на сбой, без записи в Firestore;
// текст ошибки ограничен 300 знаками, чтобы не раздувать объём логов.
const logger = __importStar(require("firebase-functions/logger"));
exports.SWALLOWED_ERROR_PREFIX = '[PM-229]';
const MAX_MESSAGE_CHARS = 300;
function describe(error) {
    if (error && typeof error === 'object') {
        const e = error;
        return {
            code: typeof e.code === 'string' || typeof e.code === 'number' ? String(e.code).slice(0, 64) : 'unknown',
            message: String(e.message ?? error).slice(0, MAX_MESSAGE_CHARS),
        };
    }
    return { code: 'unknown', message: String(error).slice(0, MAX_MESSAGE_CHARS) };
}
/** Логирует причину и возвращает заглушку; сам логгер никогда не бросает. */
function reportSwallowedServer(tag, error) {
    try {
        const { code, message } = describe(error);
        logger.warn(`${exports.SWALLOWED_ERROR_PREFIX} swallowed ${tag}`, { tag, code, message });
    }
    catch (loggerError) {
        // Логгер сам упал — писать некуда; не пробрасываем, чтобы не сорвать основной путь.
        // eslint-disable-next-line no-console
        console.warn(`${exports.SWALLOWED_ERROR_PREFIX} logger_failed ${tag}`, String(loggerError).slice(0, 120));
    }
}
/** Готовый обработчик: `.catch(swallowed('account_delete:read_user', null))`. */
function swallowed(tag, fallback) {
    return (error) => {
        reportSwallowedServer(tag, error);
        return fallback;
    };
}
//# sourceMappingURL=swallowed_error.js.map