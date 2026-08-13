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
exports.GROWTH_DAILY_SOURCE = exports.GROWTH_DAILY_SCHEMA_VERSION = exports.GROWTH_DAILY_COLLECTION = void 0;
exports.utcDayKey = utcDayKey;
exports.utcDayStartMs = utcDayStartMs;
exports.buildGrowthDailyAggregateWrite = buildGrowthDailyAggregateWrite;
exports.writeFirstAuthLinkGrowthAggregate = writeFirstAuthLinkGrowthAggregate;
const admin = __importStar(require("firebase-admin"));
exports.GROWTH_DAILY_COLLECTION = 'jarvis_growth_daily';
exports.GROWTH_DAILY_SCHEMA_VERSION = 1;
exports.GROWTH_DAILY_SOURCE = 'authEnsureStableLink:first_auth_link';
function utcDayKey(nowMs) {
    if (!Number.isFinite(nowMs))
        throw new Error('growth_daily_invalid_time');
    return new Date(nowMs).toISOString().slice(0, 10);
}
function utcDayStartMs(nowMs) {
    return Date.parse(`${utcDayKey(nowMs)}T00:00:00.000Z`);
}
function buildGrowthDailyAggregateWrite(nowMs, transforms) {
    return Object.freeze({
        dayKey: utcDayKey(nowMs),
        schemaVersion: exports.GROWTH_DAILY_SCHEMA_VERSION,
        newUsers: transforms.increment(1),
        lastObservedAtMs: nowMs,
        source: exports.GROWTH_DAILY_SOURCE,
    });
}
/**
 * Adds aggregate writes to the same transaction that creates the first auth_link.
 * auth_links/{authUid} is the idempotency marker; callers must invoke this only
 * when the transaction read proved that auth link absent.
 */
function writeFirstAuthLinkGrowthAggregate(db, transaction, nowMs) {
    const dailyRef = db.collection(exports.GROWTH_DAILY_COLLECTION).doc(utcDayKey(nowMs));
    transaction.set(dailyRef, buildGrowthDailyAggregateWrite(nowMs, admin.firestore.FieldValue), { merge: true });
}
