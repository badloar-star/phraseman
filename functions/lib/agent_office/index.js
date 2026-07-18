"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentOfficeTelegramWebhook = exports.AGENT_OFFICE_TELEGRAM_ENABLED = exports.AGENT_OFFICE_TELEGRAM_CONFIG = exports.agentOfficeSetKillSwitch = exports.agentOfficeListTasks = exports.agentOfficeListRecommendations = exports.agentOfficeListCases = exports.agentOfficeListAuditEvents = exports.agentOfficeGetControl = exports.agentOfficeGetCase = exports.agentOfficeDecideRecommendation = void 0;
var callables_1 = require("./callables");
Object.defineProperty(exports, "agentOfficeDecideRecommendation", { enumerable: true, get: function () { return callables_1.agentOfficeDecideRecommendation; } });
Object.defineProperty(exports, "agentOfficeGetCase", { enumerable: true, get: function () { return callables_1.agentOfficeGetCase; } });
Object.defineProperty(exports, "agentOfficeGetControl", { enumerable: true, get: function () { return callables_1.agentOfficeGetControl; } });
Object.defineProperty(exports, "agentOfficeListAuditEvents", { enumerable: true, get: function () { return callables_1.agentOfficeListAuditEvents; } });
Object.defineProperty(exports, "agentOfficeListCases", { enumerable: true, get: function () { return callables_1.agentOfficeListCases; } });
Object.defineProperty(exports, "agentOfficeListRecommendations", { enumerable: true, get: function () { return callables_1.agentOfficeListRecommendations; } });
Object.defineProperty(exports, "agentOfficeListTasks", { enumerable: true, get: function () { return callables_1.agentOfficeListTasks; } });
Object.defineProperty(exports, "agentOfficeSetKillSwitch", { enumerable: true, get: function () { return callables_1.agentOfficeSetKillSwitch; } });
var telegram_webhook_1 = require("./telegram_webhook");
Object.defineProperty(exports, "AGENT_OFFICE_TELEGRAM_CONFIG", { enumerable: true, get: function () { return telegram_webhook_1.AGENT_OFFICE_TELEGRAM_CONFIG; } });
Object.defineProperty(exports, "AGENT_OFFICE_TELEGRAM_ENABLED", { enumerable: true, get: function () { return telegram_webhook_1.AGENT_OFFICE_TELEGRAM_ENABLED; } });
Object.defineProperty(exports, "agentOfficeTelegramWebhook", { enumerable: true, get: function () { return telegram_webhook_1.agentOfficeTelegramWebhook; } });
//# sourceMappingURL=index.js.map